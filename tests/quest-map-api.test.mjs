// 서버·지도 SDK 없이 홈의 실제 데이터 연결과 상세 조회 캐시를 검증합니다.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import { QueryClient, QueryObserver } from '@tanstack/react-query'
import axios from 'axios'
import ts from 'typescript'
import { z } from 'zod'

const element = (type, props) => ({ type, props })

function loadSource(path, dependencies = {}, globals = {}) {
  const source = ts.transpileModule(
    readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } },
  ).outputText
  const module = { exports: {} }
  runInNewContext(source, {
    ...globals,
    module,
    exports: module.exports,
    require: (id) => {
      if (id === 'react/jsx-runtime') return { jsx: element, jsxs: element }
      if (Object.hasOwn(dependencies, id)) return dependencies[id]
      if (id.startsWith('./components/')) return { __esModule: true, default: id.split('/').at(-1).replace(/\.tsx$/, '') }
      throw new Error(`Unexpected dependency: ${id}`)
    },
  })
  return module.exports
}

const queryErrorUtils = loadSource('features/quests/pages/home/utils/getQuestQueryError.ts', {
  axios: { __esModule: true, default: axios },
  zod: { z },
})

const distanceUtils = loadSource('features/quests/pages/home/utils/getDistanceMeters.ts')

// 상세·사진 컴포넌트의 Effect 정리와 이벤트 후 재렌더링을 서버 없이 확인합니다.
function componentFixture(path, dependencies, globals = {}, select = module => module.default) {
  const states = [], setters = [], refs = [], effects = []
  let stateIndex = 0, refIndex = 0, effectIndex = 0, pending = [], mounted = true
  const Component = select(loadSource(path, {
    ...dependencies,
    react: {
      useCallback: (fn) => fn,
      useRef: (initial) => {
        const index = refIndex++
        return refs[index] ??= { current: initial }
      },
      useState: (initial) => {
        const index = stateIndex++
        if (!(index in states)) states[index] = initial
        setters[index] ??= (next) => { if (mounted) states[index] = typeof next === 'function' ? next(states[index]) : next }
        return [states[index], setters[index]]
      },
      useEffect: (run, deps) => {
        const index = effectIndex++
        if (!effects[index] || deps.some((value, i) => !Object.is(value, effects[index].deps[i]))) {
          pending.push(() => {
            effects[index]?.cleanup?.()
            effects[index] = { deps, cleanup: run() }
          })
        }
      },
    },
  }, globals))
  return {
    refs,
    render(props) {
      stateIndex = 0; refIndex = 0; effectIndex = 0; pending = []
      const tree = Component(props)
      for (const run of pending) run()
      return tree
    },
    unmount() { mounted = false; for (const effect of effects) effect.cleanup?.() },
  }
}

function findNode(tree, type, matches = () => true) {
  if (!tree || typeof tree !== 'object') return null
  if (tree.type === type && matches(tree.props)) return tree
  for (const child of [tree.props?.children].flat()) {
    const result = findNode(child, type, matches)
    if (result) return result
  }
  return null
}

function textOf(tree) {
  if (typeof tree === 'string' || typeof tree === 'number') return String(tree)
  if (!tree || typeof tree !== 'object') return ''
  return [tree?.props?.children].flat().map((child) => textOf(child)).join('')
}

// 실제 표시 컴포넌트도 평가해 Fragment 안의 파일 입력까지 확인합니다.
function renderComponents(tree) {
  if (Array.isArray(tree)) return tree.map(renderComponents)
  if (!tree || typeof tree !== 'object' || !tree.props) return tree
  if (typeof tree.type === 'function') return renderComponents(tree.type(tree.props))
  return { ...tree, props: { ...tree.props, children: renderComponents(tree.props.children) } }
}

function verificationClock() {
  const timers = new Map()
  let now = 0, timerId = 0
  return {
    setTimeout(run, delay) { const id = ++timerId; timers.set(id, { run, at: now + delay }); return id },
    clearTimeout(id) { timers.delete(id) },
    advance(ms) {
      now += ms
      for (const [id, timer] of [...timers]) {
        if (timer.at <= now) { timers.delete(id); timer.run() }
      }
    },
    get pending() { return timers.size },
  }
}

const position = { lat: 35.8714, lng: 128.6014, accuracy: 10, timestamp: 1000 }
const quests = [
  { questId: 701, questTitle: 'Nearby', questType: 'GENERAL', difficulty: 1, placeName: 'Cafe', lat: 35.8714, lng: 128.6014, distance: 0, isMine: false },
  { questId: 702, questTitle: 'Farther', questType: 'IMAGE', difficulty: 3, placeName: 'Park', lat: 35.88, lng: 128.61, distance: 1200, isMine: false },
]

function homeFixture() {
  const states = []
  const memos = []
  const effects = [], microtasks = []
  let cursor = 0, memoCursor = 0, effectCursor = 0, tree
  const fixture = {
    location: { pathname: '/', search: '', hash: '', state: null },
    navigation: null,
    navigations: [],
    position,
    query: { data: undefined, isPending: true, isError: false },
    nearestInputs: [],
    refetchCalls: [],
    nearestQuery: {},
    locationRequests: 0,
    isLocating: false,
    locationError: null,
    requestLocation: async () => { fixture.locationRequests++; return fixture.position },
  }
  const onNearbyNavigationChange = (navigation) => { fixture.navigation = navigation }
  const navigate = (to, options) => {
    fixture.navigations.push({ to, options })
    fixture.location = { ...fixture.location, ...to, state: options.state }
  }
  const page = loadSource('features/quests/pages/home/QuestMapPage.tsx', {
    'react-router': {
      useLocation: () => fixture.location,
      useNavigate: () => navigate,
      useOutletContext: () => ({ onNearbyNavigationChange }),
    },
    react: {
      useCallback: (callback) => callback,
      useEffect: (run, deps) => {
        const index = effectCursor++
        if (!effects[index] || deps.some((value, i) => !Object.is(value, effects[index].deps[i]))) {
          effects[index]?.cleanup?.()
          effects[index] = { deps, run, cleanup: run() }
        }
      },
      useMemo: (factory, deps) => {
        const index = memoCursor++
        if (!memos[index] || deps.some((value, i) => !Object.is(value, memos[index].deps[i]))) {
          memos[index] = { deps, value: factory() }
        }
        return memos[index].value
      },
      useState: (initial) => {
        const index = cursor++
        if (!(index in states)) states[index] = initial
        return [states[index], (next) => { states[index] = next }]
      },
    },
    '@/features/quests/hooks/useGeolocation': { useGeolocation: () => ({
      position: fixture.position,
      isLocating: fixture.isLocating,
      error: fixture.locationError,
      requestLocation: fixture.requestLocation,
    }) },
    '@/features/quests/hooks/useNearbyQuests': { useNearbyQuests: () => ({
      isFetching: false,
      refetch: (options) => { fixture.refetchCalls.push({ target: 'nearby', options }); return Promise.resolve() },
      ...fixture.query,
    }) },
    '@/features/quests/hooks/useRegionName': { useRegionName: () => 'Daegu' },
    '@/features/quests/hooks/useNearestQuest': {
      useNearestQuest: (nearby, coordinates) => {
        fixture.nearestInputs.push({ quests: nearby, position: coordinates })
        const candidate = nearby?.[0]
        return {
          data: !coordinates || nearby === undefined ? undefined : candidate ? { ...candidate, myStatus: 'NONE' } : null,
          isPending: nearby === undefined,
          isError: false,
          isFetching: false,
          refetch: (options) => { fixture.refetchCalls.push({ target: 'nearest', options }); return Promise.resolve() },
          ...fixture.nearestQuery,
        }
      },
    },
    './utils/getDistanceMeters': distanceUtils,
    './utils/getQuestQueryError': queryErrorUtils,
  }, { queueMicrotask: (callback) => microtasks.push(callback) })
  return Object.assign(fixture, {
    render() { cursor = 0; memoCursor = 0; effectCursor = 0; tree = page.default(); return tree },
    node(type) { return findNode(tree, type) },
    openList() {
      fixture.location = { ...fixture.location, state: { openQuestList: true } }
      this.render()
      this.flushMicrotasks()
    },
    flushMicrotasks() { while (microtasks.length) microtasks.shift()() },
    strictReplay() {
      for (const effect of effects) effect.cleanup?.()
      for (const effect of effects) effect.cleanup = effect.run()
    },
    unmount() { for (const effect of effects) effect.cleanup?.() },
  })
}

test('홈 진입 시 자동 위치 조회를 한 번 실행하고 StrictMode·일반 재렌더링은 중복하지 않는다', () => {
  const f = homeFixture()
  f.position = null
  f.render()
  f.strictReplay()
  f.flushMicrotasks()
  assert.equal(f.locationRequests, 1)
  f.position = position
  f.query = { data: quests, isPending: false, isError: false }
  f.render()
  f.flushMicrotasks()
  assert.equal(f.locationRequests, 1)
  f.node('CurrentLocationButton').props.onClick()
  assert.equal(f.locationRequests, 2)
})

test('자동 위치 조회를 시작하기 전에 홈을 떠나면 예약된 요청을 실행하지 않는다', () => {
  const f = homeFixture()
  f.render()
  f.unmount()
  f.flushMicrotasks()
  assert.equal(f.locationRequests, 0)
})

test('위치 조회 실패 시 안내와 수동 재시도를 유지하고 자동으로 반복 요청하지 않는다', () => {
  const f = homeFixture()
  f.position = null
  f.render()
  f.flushMicrotasks()
  f.locationError = { code: 'PERMISSION_DENIED', message: '위치 권한을 허용해주세요.' }
  assert.match(textOf(f.render()), /위치 권한을 허용/)
  f.flushMicrotasks()
  assert.equal(f.locationRequests, 1)
  findNode(f.render(), 'button', props => props['aria-label'] === '현재 위치를 확인하고 가까운 퀘스트 보기').props.onClick()
  assert.equal(f.locationRequests, 2)
  f.isLocating = true
  f.render()
  assert.equal(f.node('CurrentLocationButton').props.isLocating, true)
})

test('좌표·정확도 디버그 표시는 없애고 지도에 전달하는 위치 정보는 유지한다', () => {
  const f = homeFixture()
  const tree = f.render()
  assert.equal(f.node('output'), null)
  assert.doesNotMatch(textOf(tree), /위도:|경도:|정확도 범위:/)
  assert.equal(f.node('QuestMap').props.position, position)
  assert.equal(f.node('QuestMap').props.position.accuracy, 10)
  assert.equal(f.node('QuestDetailDrawer').props.position, position)
})

test('공통 직선거리는 미터 단위이며 동일 좌표·대칭·날짜변경선·대척점에서 안정적으로 계산한다', () => {
  const { getDistanceMeters } = distanceUtils
  assert.equal(getDistanceMeters(position, position), 0)
  const a = { lat: 0, lng: 0 }, b = { lat: 0, lng: 1 }
  assert.ok(Math.abs(getDistanceMeters(a, b) - 111_195) < 1)
  assert.equal(getDistanceMeters(a, b), getDistanceMeters(b, a))
  assert.ok(getDistanceMeters({ lat: 0, lng: 179.9999 }, { lat: 0, lng: -179.9999 }) < 23)
  const opposite = getDistanceMeters(a, { lat: 0, lng: 180 })
  assert.ok(Number.isFinite(opposite) && opposite > 20_000_000 && opposite < 20_020_000)
})

test('확장 사진이 실제 표시될 때만 상단 UI를 숨기고 닫기·접기·다른 퀘스트 선택 시 복원한다', () => {
  const f = homeFixture()
  f.query = { data: quests, isPending: false, isError: false }
  f.render()
  f.node('QuestMap').props.onQuestSelect(701)
  f.render()
  const photo = { questId: 701, photoUrl: 'https://example.com/701.jpg', placeName: 'Cafe' }
  f.node('QuestDetailDrawer').props.onExpandedPhotoChange(photo)
  f.node('QuestDetailDrawer').props.onPositionChange(200)
  f.render()
  assert.ok(f.node('HomeHeader'))
  const layer = f.node('QuestDetailMapPhoto')
  assert.equal(layer.props.top, 200)
  layer.props.onVisibilityChange(photo)
  f.render()
  assert.equal(f.node('HomeHeader'), null)
  assert.ok(f.node('QuestMap'))
  f.node('QuestDetailDrawer').props.onExpandedPhotoChange(null)
  f.render()
  assert.ok(f.node('HomeHeader'))
  assert.equal(f.node('QuestDetailMapPhoto'), null)

  f.node('QuestDetailDrawer').props.onExpandedPhotoChange(photo)
  f.render()
  f.node('QuestDetailMapPhoto').props.onVisibilityChange(photo)
  f.node('QuestMap').props.onQuestSelect(702)
  f.render()
  assert.ok(f.node('HomeHeader'))
  assert.equal(f.node('QuestDetailMapPhoto'), null)
  // 이전 사진의 늦은 이벤트가 와도 새로 선택한 퀘스트의 상단 UI는 숨기지 않습니다.
  layer.props.onVisibilityChange(photo)
  f.render()
  assert.ok(f.node('HomeHeader'))
  f.node('QuestDetailDrawer').props.onClose()
  f.render()
  assert.ok(f.node('HomeHeader'))
  assert.equal(f.node('QuestDetailMapPhoto'), null)
})

test('지도 사진은 로드 성공 후 표시하고 실패·잘못된 URL·해제 시 지도와 상단 UI를 복원한다', () => {
  let visible = null
  const onVisibilityChange = (photo) => { visible = photo }
  const photo = { questId: 701, photoUrl: 'https://example.com/701.jpg', placeName: 'Cafe' }
  const props = { photo, top: 200, onVisibilityChange }
  const f = componentFixture('features/quests/pages/home/components/QuestDetailMapPhoto.tsx', {})
  let tree = f.render(props)
  assert.equal(tree.props['aria-hidden'], true)
  assert.equal(visible, null)
  const image = findNode(tree, 'img')
  image.props.onLoad()
  tree = f.render(props)
  assert.equal(tree.props['aria-hidden'], false)
  assert.equal(visible, photo)
  assert.equal(tree.props.style.height, 'calc(200px + 2rem)')
  tree = f.render({ ...props, top: 240 })
  assert.equal(tree.props.style.height, 'calc(240px + 2rem)')
  image.props.onError()
  tree = f.render(props)
  assert.equal(tree.props['aria-hidden'], true)
  assert.equal(visible, null)
  assert.equal(f.render({ ...props, photo: { ...photo, photoUrl: 'javascript:alert(1)' } }), null)
  assert.equal(visible, null)
  assert.equal(f.render({ ...props, top: null }), null)
  f.unmount()
  image.props.onLoad()
  assert.equal(visible, null)
})

test('위치 미확인·조회 중·실패·성공 0개를 구분하고 mock 마커로 대체하지 않는다', () => {
  const f = homeFixture()
  f.position = null
  f.render()
  assert.match(textOf(f.render()), /위치를 확인하고 가까운 퀘스트/)
  assert.equal(f.node('QuestMap').props.quests.length, 0)
  assert.equal(f.navigation.count, null)
  f.position = position
  assert.match(textOf(f.render()), /불러오는 중/)
  assert.equal(f.navigation.isLoading, true)
  f.query = { data: undefined, isPending: false, isError: true }
  f.render()
  assert.match(f.node('QuestQueryErrorNotice').props.info.message, /불러오지 못/)
  assert.equal(f.navigation.count, null)
  f.query = { data: [], isPending: false, isError: false }
  assert.match(textOf(f.render()), /주변에 새로 수행할 퀘스트가 없어요/)
  f.node('QuestMap').props.onVisibleQuestsChange([])
  f.render()
  assert.equal(f.navigation.count, 0)
  assert.notEqual(f.navigation.count, null)
  f.openList()
  f.render()
  assert.equal(f.node('QuestListDrawer').props.open, true)
  assert.equal(f.node('QuestListDrawer').props.quests.length, 0)
})

test('서버 목록으로 마커·추천 바·목록을 연결하고 모두 같은 ID의 상세를 연다', () => {
  const f = homeFixture()
  f.query = { data: quests, isPending: false, isError: false }
  f.render()
  assert.deepEqual(f.node('QuestMap').props.quests, quests)
  assert.deepEqual(f.nearestInputs.at(-1).quests, quests)
  assert.equal(f.nearestInputs.at(-1).position, position)
  f.node('QuestMap').props.onVisibleQuestsChange([quests[1]])
  f.render()
  assert.equal(f.navigation.count, 1)
  f.openList()
  f.render()
  assert.equal(f.node('QuestListDrawer').props.quests[0], quests[1])
  f.node('QuestListDrawer').props.onSelect(702)
  f.render()
  assert.equal(f.node('QuestListDrawer').props.open, false)
  assert.equal(f.node('QuestDetailDrawer').props.questId, 702)
  f.node('QuestDetailDrawer').props.onClose()
  f.render()
  f.node('NearestQuestBar').props.onSelect(701)
  f.render()
  assert.equal(f.node('QuestDetailDrawer').props.questId, 701)
  f.node('QuestMap').props.onQuestSelect(702)
  f.render()
  assert.equal(f.node('QuestDetailDrawer').props.questId, 702)
})

test('본인 퀘스트를 마커·개수·목록·추천 후보에서 함께 제외하고 API 배열을 보존한다', () => {
  const f = homeFixture()
  const mine = { ...quests[0], questId: 700, isMine: true }
  const other = { ...quests[0], lat: 35.8724, distance: 100 }
  const response = [mine, other, quests[1]]
  f.query = { data: response, isPending: false, isError: false }
  f.render()
  const displayed = f.node('QuestMap').props.quests
  assert.deepEqual(displayed.map((quest) => quest.questId), [701, 702])
  assert.deepEqual(f.nearestInputs.at(-1).quests, displayed)
  assert.equal(f.node('NearestQuestBar').props.quest.questId, 701)
  f.node('QuestMap').props.onVisibleQuestsChange(displayed)
  f.render()
  assert.equal(f.node('QuestMap').props.quests, displayed)
  assert.equal(f.navigation.count, 2)
  f.openList()
  f.render()
  assert.deepEqual(Array.from(f.node('QuestListDrawer').props.quests, (quest) => quest.questId), [701, 702])
  assert.equal(f.query.data, response)
  assert.equal(response.length, 3)
  assert.equal(response[0], mine)
})

test('주변에 본인 퀘스트만 있으면 성공 0개와 수행할 퀘스트 없음 안내를 표시한다', () => {
  const f = homeFixture()
  f.query = { data: quests.map((quest) => ({ ...quest, isMine: true })), isPending: false, isError: false }
  assert.match(textOf(f.render()), /주변에 새로 수행할 퀘스트가 없어요/)
  assert.equal(f.node('QuestMap').props.quests.length, 0)
  assert.equal(f.nearestInputs.at(-1).quests.length, 0)
  assert.equal(f.node('NearestQuestBar'), null)
  f.node('QuestMap').props.onVisibleQuestsChange([])
  f.render()
  assert.notEqual(f.navigation.count, null)
  assert.equal(f.navigation.count, 0)
})

test('내 위치 점은 18px 이미지의 중심을 좌표에 맞추고 위치 변경 시 기존 마커를 재사용한다', () => {
  const refs = [], effects = [], markers = [], images = []
  let refCursor = 0, effectCursor = 0
  const maps = {
    LatLng: class { constructor(lat, lng) { Object.assign(this, { lat, lng }) } },
    Size: class { constructor(width, height) { Object.assign(this, { width, height }) } },
    Point: class { constructor(x, y) { Object.assign(this, { x, y }) } },
    MarkerImage: class {
      constructor(source, size, options) { Object.assign(this, { source, size, options }); images.push(this) }
    },
    Marker: class {
      constructor(options) { this.options = options; markers.push(this) }
      setMap(map) { this.options.map = map }
      setPosition(position) { this.options.position = position }
    },
  }
  const { default: UserMarker } = loadSource('features/quests/pages/home/components/UserLocationMarker.tsx', {
    react: {
      useRef: (initial) => {
        const index = refCursor++
        return refs[index] ??= { current: initial }
      },
      useEffect: (run, deps) => {
        const index = effectCursor++
        if (!effects[index] || deps.some((value, i) => !Object.is(value, effects[index].deps[i]))) {
          effects[index]?.cleanup?.()
          effects[index] = { deps, cleanup: run() }
        }
      },
    },
  }, { window: { kakao: { maps } } })
  const map = {}
  const render = (position) => { refCursor = 0; effectCursor = 0; UserMarker({ map, position }) }
  render(null)
  assert.equal(markers.length, 0)
  render(position)
  assert.equal(markers.length, 1)
  assert.equal(images[0].size.width, 18)
  assert.equal(images[0].size.height, 18)
  assert.equal(images[0].options.offset.x, 9)
  assert.equal(images[0].options.offset.y, 9)
  assert.match(decodeURIComponent(images[0].source), /fill="#4285F4"/)
  assert.equal(markers[0].options.image, images[0])
  render({ ...position, lat: 35.88 })
  assert.equal(markers.length, 1)
  assert.equal(images.length, 1)
  assert.equal(markers[0].options.position.lat, 35.88)
  for (const effect of effects) effect.cleanup?.()
  assert.equal(markers[0].options.map, null)
})

test('목록 응답 교체 후 이전 범위 계산값으로 개수나 목록을 열지 않는다', () => {
  const f = homeFixture()
  f.query = { data: quests, isPending: false, isError: false }
  f.render()
  const oldCallback = f.node('QuestMap').props.onVisibleQuestsChange
  oldCallback(quests)
  f.render()
  assert.equal(f.navigation.count, 2)
  const updated = [{ ...quests[0], questId: 801 }]
  f.query = { data: updated, isPending: false, isError: false }
  f.render()
  oldCallback(quests)
  f.render()
  assert.equal(f.navigation.count, null)
  assert.equal(f.navigation.isLoading, true)
  f.openList()
  f.render()
  assert.equal(f.node('QuestListDrawer').props.open, false)
  f.node('QuestMap').props.onVisibleQuestsChange(updated)
  f.render()
  assert.equal(f.navigation.count, 1)
})

test('추천 결과의 ID로 상세를 열고 추천 변경·위치 갱신에도 클릭한 ID를 유지한다', () => {
  const f = homeFixture()
  f.query = { data: quests, isPending: false, isError: false }
  f.nearestQuery = { data: { ...quests[1], myStatus: 'FAILED' }, isPending: false }
  f.render()
  const bar = f.node('NearestQuestBar')
  assert.equal(bar.props.quest.questId, 702)
  assert.ok(Math.abs(bar.props.distance - distanceUtils.getDistanceMeters(position, quests[1])) < 1)
  bar.props.onSelect(702)
  f.render()
  assert.equal(f.node('QuestDetailDrawer').props.questId, 702)
  assert.equal(f.node('NearestQuestBar'), null)
  f.nearestQuery.data = { ...quests[0], myStatus: 'NONE' }
  f.position = { ...position, lat: 35.88 }
  f.render()
  assert.equal(f.node('QuestDetailDrawer').props.questId, 702)
  f.node('QuestDetailDrawer').props.onClose()
  f.render()
  assert.equal(f.node('NearestQuestBar').props.quest.questId, 701)
})

test('상단 바는 사진·진행 상태 없이 상세 제목·거리·심볼을 표시하고 선택 ID를 전달한다', () => {
  const { default: Bar } = loadSource('features/quests/pages/home/components/NearestQuestBar.tsx')
  const selected = []
  const quest = { ...quests[0], questTitle: '길어도 전체 제목을 읽을 수 있는 퀘스트', photoUrl: 'https://example.com/unused.jpg' }
  for (const [distance, expected] of [[180.4, '180m'], [1250, '1.3km']]) {
    const tree = Bar({ quest, distance, onSelect: id => selected.push(id) })
    assert.match(textOf(tree), /가장 가까운 퀘스트/)
    assert.ok(textOf(tree).includes(expected))
    assert.ok(tree.props['aria-label'].includes(quest.questTitle))
    assert.equal(tree.props.title, quest.questTitle)
    assert.equal(findNode(tree, 'img'), null)
    assert.equal(findNode(tree, 'svg').props['aria-hidden'], 'true')
    assert.doesNotMatch(textOf(tree), /수행 중|이어서 하기/)
    tree.props.onClick()
  }
  assert.deepEqual(selected, [701, 701])
})

test('미완료 후보 확인 중·모두 완료·첫 상세 조회 실패를 구분하고 재시도를 연결한다', () => {
  const f = homeFixture()
  f.query = { data: quests, isPending: false, isError: false }
  f.nearestQuery = { data: undefined, isPending: true }
  assert.match(textOf(f.render()), /가까운 미완료 퀘스트를 확인하는 중/)
  assert.equal(f.node('NearestQuestBar'), null)
  assert.doesNotMatch(textOf(f.render()), /새로 수행할 퀘스트가 없어요/)
  f.nearestQuery = { data: null, isPending: false }
  assert.match(textOf(f.render()), /주변에 새로 수행할 퀘스트가 없어요/)
  assert.equal(f.node('QuestMap').props.quests.length, 2)
  f.nearestQuery = { data: undefined, isPending: false, isError: true, error: httpError(503) }
  f.render()
  assert.equal(f.node('NearestQuestBar'), null)
  f.node('QuestQueryErrorNotice').props.onRetry()
  assert.equal(f.refetchCalls[0].target, 'nearest')
  assert.equal(f.refetchCalls[0].options.cancelRefetch, false)
  for (const status of [401, 403, 404]) {
    f.nearestQuery = { data: quests[0], isPending: false, isError: true, error: httpError(status) }
    f.render()
    assert.equal(f.node('NearestQuestBar'), null)
    assert.equal(f.node('QuestQueryErrorNotice').props.info.keepPreviousData, false)
  }
})

test('목록을 열면 상단 추천을 숨기고 닫으면 복원한다', () => {
  const f = homeFixture()
  f.query = { data: quests, isPending: false, isError: false }
  f.render()
  assert.ok(f.node('NearestQuestBar'))
  f.node('QuestMap').props.onVisibleQuestsChange(quests)
  f.render()
  f.openList()
  f.render()
  assert.equal(f.node('NearestQuestBar'), null)
  assert.equal(f.node('QuestListDrawer').props.open, true)
  f.node('QuestListDrawer').props.onClose()
  f.render()
  assert.ok(f.node('NearestQuestBar'))
})

test('navbar 목록 요청은 지도 계산을 기다리고 한 번만 열며 닫은 후 갱신해도 다시 열지 않는다', () => {
  const f = homeFixture()
  f.location.state = { openQuestList: true, preserved: 'value' }
  f.render()
  f.flushMicrotasks()
  assert.equal(f.node('QuestListDrawer').props.open, false)
  assert.equal(f.navigation.count, null)
  f.query = { data: quests, isPending: false, isError: false }
  f.render()
  f.node('QuestMap').props.onVisibleQuestsChange(quests)
  f.render()
  f.strictReplay()
  f.flushMicrotasks()
  f.render()
  assert.equal(f.node('QuestListDrawer').props.open, true)
  assert.equal(f.navigations.length, 1)
  assert.equal(f.location.state.openQuestList, false)
  assert.equal(f.location.state.preserved, 'value')
  assert.equal(f.navigations[0].options.replace, true)
  f.node('QuestListDrawer').props.onClose()
  f.query = { data: [...quests], isPending: false, isError: false }
  f.render()
  f.node('QuestMap').props.onVisibleQuestsChange(quests)
  f.render()
  f.flushMicrotasks()
  f.render()
  assert.equal(f.node('QuestListDrawer').props.open, false)
  // 같은 홈 화면에서 다시 눌러도 새 요청으로 처리합니다.
  f.openList()
  f.render()
  assert.equal(f.node('QuestListDrawer').props.open, true)
  assert.equal(f.navigations.length, 2)
  f.unmount()
  assert.equal(f.navigation, null)
})

test('목록 준비 중 상세를 선택하면 늦은 목록 준비가 선택 ID를 덮어쓰지 않는다', () => {
  const f = homeFixture()
  f.openList()
  f.node('QuestMap').props.onQuestSelect(702)
  f.query = { data: quests, isPending: false, isError: false }
  f.render()
  f.node('QuestMap').props.onVisibleQuestsChange(quests)
  f.render()
  f.flushMicrotasks()
  f.render()
  assert.equal(f.node('QuestListDrawer').props.open, false)
  assert.equal(f.node('QuestDetailDrawer').props.questId, 702)
  assert.equal(f.location.state.openQuestList, false)
})

test('GPS·목록 조회 실패로 소비한 메뉴 요청은 수동 재시도 성공 시 자동으로 다시 열리지 않는다', () => {
  for (const gps of [true, false]) {
    const f = homeFixture()
    if (gps) {
      f.position = null
      f.locationError = { message: '위치 권한을 허용해주세요.' }
    } else {
      f.query = { data: undefined, isError: true, isPending: false }
    }
    f.openList()
    assert.equal(f.location.state.openQuestList, false)
    f.position = position
    f.locationError = null
    f.query = { data: quests, isPending: false, isError: false }
    f.render()
    f.node('QuestMap').props.onVisibleQuestsChange(quests)
    f.render()
    f.flushMicrotasks()
    f.render()
    assert.equal(f.node('QuestListDrawer').props.open, false)
  }
})

test('열린 목록은 지도 이동에도 스냅샷을 유지하고 다음 메뉴 클릭에서 최신 범위를 사용한다', () => {
  const f = homeFixture()
  f.query = { data: quests, isPending: false, isError: false }
  f.render()
  f.node('QuestMap').props.onVisibleQuestsChange(quests)
  f.render()
  f.openList()
  f.render()
  f.node('QuestMap').props.onVisibleQuestsChange([quests[1]])
  f.render()
  assert.equal(f.navigation.count, 1)
  assert.equal(f.node('QuestListDrawer').props.quests.length, 2)
  f.openList()
  f.render()
  assert.equal(f.node('QuestListDrawer').props.quests.length, 1)
  assert.equal(f.node('QuestListDrawer').props.quests[0].questId, 702)
})

test('주변 navbar는 상태·상세 조회 없이 홈에 목록 열기를 요청하고 미확인 개수를 0으로 표시하지 않는다', () => {
  const { default: Nav } = loadSource('features/quests/components/NearbyQuestNavItem.tsx', {
    'react-router': { Link: 'Link' },
    'lucide-react': { MapPin: 'MapPin' },
  })
  for (const count of [null, 0, 12]) {
    const tree = Nav({ count, isLoading: count === null })
    assert.equal(tree.type, 'Link')
    assert.equal(tree.props.to, '/')
    assert.equal(tree.props.state.openQuestList, true)
    assert.equal(tree.props['aria-busy'], count === null)
    assert.doesNotMatch(textOf(tree), /수행 인증/)
    if (count === null) assert.doesNotMatch(textOf(tree), /0개/)
    else assert.ok(textOf(tree).includes(`${count}개`))
  }
})

test('공통 레이아웃은 홈에서 전달한 개수만 navbar에 연결하고 다른 화면에서는 숨긴다', () => {
  let pathname = '/', navigation = null
  const { RootLayout } = loadSource('app/layouts/RootLayout.tsx', {
    react: { useState: () => [navigation, next => { navigation = next }] },
    'react-router': {
      Outlet: 'Outlet', useLocation: () => ({ pathname }), useSearchParams: () => [new URLSearchParams()],
    },
    '@/shared/components/WireUI': { Bottom: 'Bottom' },
  })
  let tree = RootLayout()
  findNode(tree, 'Outlet').props.context.onNearbyNavigationChange({ count: 12, isLoading: false })
  tree = RootLayout()
  assert.equal(findNode(tree, 'Bottom').props.nearbyNavigation.count, 12)
  pathname = '/me'
  assert.equal(findNode(RootLayout(), 'Bottom').props.nearbyNavigation, null)
})

test('상세 인증 버튼은 선택 ID로 바로 이동하고 본인·완료 퀘스트는 함수에서도 차단한다', () => {
  const navigations = []
  const { default: Start } = loadSource('features/quests/pages/home/components/QuestStartButton.tsx', {
    'react-router': { useNavigate: () => path => navigations.push(path) },
    '@/shared/components/ui/button': { Button: 'Button' },
    '../utils/getQuestVerifyPath': loadSource('features/quests/pages/home/utils/getQuestVerifyPath.ts'),
  })
  for (const myStatus of ['NONE', 'FAILED', 'PASSED']) {
    for (const isMine of [false, true]) {
      const tree = Start({ quest: { ...quests[0], myStatus, isMine } })
      const button = findNode(tree, 'Button')
      const before = navigations.length
      assert.equal(button.props.disabled, isMine || myStatus === 'PASSED')
      assert.equal(textOf(button), '수행 인증하기')
      button.props.onClick()
      assert.equal(navigations.length - before, button.props.disabled ? 0 : 1)
    }
  }
  assert.deepEqual(navigations, ['/quests/701/verify?type=general', '/quests/701/verify?type=general'])
})

test('인증은 URL ID만 사용하고 성공 시 추천·상세·목록·인증 캐시를 함께 갱신한다', async () => {
  for (const status of ['PASSED', 'FAILED']) {
    const client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } })
    const keys = [
      ['quests', 'detail', 1, 701], ['quests', 'nearest', 1], ['quests', 'nearby', 1],
      ['verification-quest', '701', 'token'], ['quest-greetings', '701'], ['my-submissions'],
    ]
    keys.forEach(key => client.setQueryData(key, {}))
    client.setQueryData(['unrelated'], {})
    let params = { questId: '701' }, calls = 0, finishSubmission
    const submissionResponse = new Promise(resolve => { finishSubmission = resolve })
    const revokedPhotos = []
    const clock = verificationClock()
    const navigate = () => {}
    const dependencies = {
      'react-router': { useParams: () => params, useNavigate: () => navigate, Link: 'Link' },
      'motion/react': { useReducedMotion: () => true, motion: { div: 'motion.div' } },
      axios: { isAxiosError: axios.isAxiosError },
      'lucide-react': { Check: 'Check', ChevronLeft: 'ChevronLeft', ChevronsLeftRight: 'ChevronsLeftRight', Mail: 'Mail', MapPin: 'MapPin', Plus: 'Plus', X: 'X' },
      '@/shared/components/WireUI': { Back: 'Back', SlideButton: 'SlideButton' },
      '@/shared/components/ui/button': { Button: 'Button' },
      '@/shared/components/SwipeSheet': { SwipeSheet: 'SwipeSheet' },
      './verification.css': {},
      '@tanstack/react-query': {
        useQueryClient: () => client,
        useQuery: () => ({ data: { ...quests[0], myStatus: 'NONE', photoUrl: null, author: { nickname: '작성자' } }, isPending: false, isError: false }),
      },
      './home/utils/getNearestQuest': distanceUtils,
      '@/features/quests/hooks/useGeolocation': { useGeolocation: () => ({ requestLocation: async () => position }) },
      '@/features/quests/api/verification': {
        isQuestId: id => /^\d+$/.test(id), getAccessToken: () => 'token', similarityPercent: () => null,
        createSubmissionForm: (type, note, location, photo) => {
          assert.equal(type, 'GENERAL')
          assert.equal(note, '안부를 남겨요')
          assert.equal(location, position)
          assert.equal(photo?.name ?? null, status === 'FAILED' ? 'verification.jpg' : null)
          return {}
        },
        submitVerification: async id => { calls++; assert.equal(id, '701'); return submissionResponse },
        verificationError: cause => String(cause),
      },
      '@/features/quests/lib/questPhoto': { decodeQuestPhoto: async () => 'blob:verification' },
      '@/shared/components/RemotePhoto': { RemotePhoto: 'RemotePhoto' },
    }
    // 분리한 화면도 실제로 렌더링해 부모의 상태·이벤트 연결을 함께 확인합니다.
    dependencies['./PhotoScanner'] = loadSource('features/quests/pages/verification/PhotoScanner.tsx')
    for (const name of ['VerificationForm', 'VerificationProgress', 'GreetingDelivery', 'VerificationNotice']) {
      dependencies[`./verification/${name}`] = loadSource(`features/quests/pages/verification/${name}.tsx`, dependencies)
    }
    const f = componentFixture('features/quests/pages/QuestVerifyPage.tsx', dependencies,
      { AbortController, window: clock, URL: { revokeObjectURL: url => revokedPhotos.push(url) } }, module => {
        assert.equal(module.default().props.questId, '701')
        params = { questId: 'invalid' }
        assert.equal(module.default().props.questId, '')
        params = { questId: '701' }
        return module.default().type
      })
    const renderScreen = () => renderComponents(f.render({ questId: '701' }))
    try {
      let tree = renderScreen()
      findNode(tree, 'textarea').props.onChange({ target: { value: '안부를 남겨요' } })
      tree = renderScreen()
      if (status === 'FAILED') {
        await findNode(tree, 'input', props => props.type === 'file').props.onChange({
          target: { files: [{ name: 'verification.jpg' }] }, currentTarget: { value: 'verification.jpg' },
        })
        tree = renderScreen()
      }
      findNode(tree, 'Button').props.onClick()
      findNode(tree, 'Button').props.onClick()
      await new Promise(resolve => setImmediate(resolve))
      assert.equal(calls, 1)
      assert.match(textOf(renderScreen()), /안부를 전송하고 있어요/)
      finishSubmission({ verifyStatus: status })
      await new Promise(resolve => setImmediate(resolve))
      for (const key of keys) assert.equal(client.getQueryState(key).isInvalidated, status === 'PASSED')
      assert.equal(client.getQueryState(['unrelated']).isInvalidated, false)
      const resultScreen = renderScreen()
      assert.match(textOf(resultScreen), status === 'PASSED' ? /인증 완료/ : /인증 미완료/)
      if (status === 'FAILED') {
        findNode(resultScreen, 'Button').props.onClick()
        const retryScreen = renderScreen()
        assert.equal(findNode(retryScreen, 'textarea').props.value, '안부를 남겨요')
        assert.ok(findNode(retryScreen, 'img', props => props.src === 'blob:verification'))
      }
    } finally {
      f.unmount()
      client.clear()
    }
    assert.equal(revokedPhotos.length, status === 'FAILED' ? 1 : 0)
  }
})

test('고정 인증 폼은 일반 사진 선택·이미지 사진 필수·비교 조작과 입력 콜백을 유지한다', () => {
  const { default: Form } = loadSource('features/quests/pages/verification/VerificationForm.tsx', {
    'lucide-react': { ChevronsLeftRight: 'ChevronsLeftRight', Mail: 'Mail', MapPin: 'MapPin', Plus: 'Plus' },
    '@/shared/components/WireUI': { Back: 'Back' },
    '@/shared/components/ui/button': { Button: 'Button' },
    './verification.css': {},
  })
  let selected = 0, submitted = 0, note = '', mix = 50
  const props = {
    quest: { ...quests[0], photoUrl: null, myStatus: 'NONE', author: { nickname: '작성자' }, questDescription: '안부를 전해주세요' },
    step: 'capture', photo: '', hasPhoto: false, note: '안부', mix,
    sending: false, error: '', measuredDistance: null,
    onNoteChange: value => { note = value },
    onMixChange: value => { mix = value },
    onPickPhoto: () => { selected++ },
    onSubmit: () => { submitted++ },
    children: element('input', { type: 'file' }),
  }
  let tree = Form(props)
  assert.equal(findNode(tree, 'SwipeSheet'), null)
  assert.equal(findNode(tree, 'Button').props.disabled, false)
  findNode(tree, 'Button').props.onClick()
  findNode(tree, 'button', item => item.className === 'qv-pick-photo').props.onClick()
  findNode(tree, 'textarea').props.onChange({ target: { value: '지금도 그대로예요' } })
  assert.equal(submitted, 1)
  assert.equal(selected, 1)
  assert.equal(note, '지금도 그대로예요')
  const imageQuest = { ...props.quest, questType: 'IMAGE', photoUrl: 'past.jpg' }
  assert.equal(findNode(Form({ ...props, quest: imageQuest }), 'Button').props.disabled, true)
  assert.match(textOf(findNode(Form({ ...props, quest: imageQuest }), 'Button')), /사진을 골라주세요/)
  for (const blocked of [{ note: ' ' }, { sending: true }, { quest: { ...props.quest, isMine: true } }, { quest: { ...props.quest, myStatus: 'PASSED' } }]) {
    assert.equal(findNode(Form({ ...props, ...blocked }), 'Button').props.disabled, true)
  }
  tree = Form({ ...props, quest: imageQuest, step: 'compare', photo: 'now.jpg', hasPhoto: true })
  assert.equal(findNode(tree, 'Button').props.disabled, false)
  const comparison = findNode(tree, 'input', item => item.type === 'range')
  comparison.props.onChange({ target: { value: '75' } })
  assert.equal(mix, 75)
  const compared = Form({ ...props, quest: imageQuest, step: 'compare', photo: 'now.jpg', hasPhoto: true, mix })
  assert.equal(findNode(compared, 'img', item => item.src === 'now.jpg').props.style.clipPath, 'inset(0 0 0 75%)')
})

function verificationFlowFixture(options = {}) {
  const quest = {
    ...quests[0], questType: options.questType ?? 'IMAGE', myStatus: 'NONE',
    photoUrl: options.photoUrl === undefined ? 'past.jpg' : options.photoUrl,
    author: { nickname: '작성자' }, questDescription: '안부를 전해주세요',
  }
  const posts = [], reads = [], invalidations = [], revoked = [], navigations = []
  const clock = verificationClock()
  const navigate = (to, options) => navigations.push({ to, options })
  let picks = 0
  const dependencies = {
    'react-router': { useParams: () => ({ questId: '701' }), useNavigate: () => navigate, Link: 'Link' },
    'motion/react': { useReducedMotion: () => options.reducedMotion ?? false, motion: { g: 'motion.g' } },
    axios: { isAxiosError: axios.isAxiosError },
    'lucide-react': { Check: 'Check', ChevronLeft: 'ChevronLeft', ChevronsLeftRight: 'ChevronsLeftRight', Mail: 'Mail', MapPin: 'MapPin', Plus: 'Plus', X: 'X' },
    '@/shared/components/WireUI': { Back: 'Back' },
    '@/shared/components/ui/button': { Button: 'Button' },
    '@/shared/components/SwipeSheet': { SwipeSheet: 'SwipeSheet' },
    '@/shared/components/RemotePhoto': { RemotePhoto: 'RemotePhoto' },
    './verification.css': {},
    '@tanstack/react-query': {
      useQueryClient: () => ({ invalidateQueries: ({ queryKey }) => { invalidations.push(queryKey); return Promise.resolve() } }),
      useQuery: () => ({ data: quest, isPending: false, isError: false }),
    },
    './home/utils/getNearestQuest': distanceUtils,
    '@/features/quests/hooks/useGeolocation': { useGeolocation: () => ({
      error: options.locationError,
      requestLocation: options.locate ?? (async () => position),
    }) },
    '@/features/quests/api/verification': {
      isQuestId: () => true, getAccessToken: () => 'token',
      similarityPercent: value => value == null ? null : Math.round(value * 100),
      createSubmissionForm: (type, note, coordinates, photo) => ({ type, note, coordinates, photo }),
      submitVerification: async (id, body, signal) => {
        posts.push({ id, body, signal })
        return options.submit ? options.submit() : { verifyStatus: 'PASSED', similarity: 0.84, message: '안부가 전달됐어요' }
      },
      getVerificationQuest: async (id, signal) => {
        reads.push({ id, signal })
        return { ...quest, myStatus: options.readStatus?.() ?? 'NONE' }
      },
      verificationError: () => '잠시 후 다시 확인해 주세요.',
    },
    '@/features/quests/lib/questPhoto': { decodeQuestPhoto: async () => 'blob:selected-photo' },
  }
  dependencies['./PhotoScanner'] = loadSource('features/quests/pages/verification/PhotoScanner.tsx')
  for (const name of ['VerificationForm', 'VerificationProgress', 'GreetingDelivery', 'VerificationNotice']) {
    dependencies[`./verification/${name}`] = loadSource(`features/quests/pages/verification/${name}.tsx`, dependencies)
  }
  const f = componentFixture('features/quests/pages/QuestVerifyPage.tsx', dependencies,
    { AbortController, window: clock, URL: { revokeObjectURL: value => revoked.push(value) } }, module => module.default().type)
  const render = () => {
    const tree = renderComponents(f.render({ questId: '701' }))
    findNode(tree, 'input', item => item.type === 'file').props.ref.current = { click: () => { picks++ } }
    return tree
  }
  return {
    posts, reads, invalidations, revoked, navigations, render,
    advance: ms => clock.advance(ms),
    get pendingTimers() { return clock.pending },
    unmount: () => f.unmount(),
    get picks() { return picks },
    async prepare(withPhoto = quest.questType === 'IMAGE') {
      findNode(render(), 'textarea').props.onChange({ target: { value: '지금도 그대로예요' } })
      if (withPhoto) await findNode(render(), 'input', item => item.type === 'file').props.onChange({
        target: { files: [{ name: 'selected.jpg' }] }, currentTarget: { value: 'selected.jpg' },
      })
    },
    start: () => findNode(render(), 'Button').props.onClick(),
    returnToForm: () => findNode(render(), 'button', item => item['aria-label'] === '인증 화면으로 돌아가기').props.onClick(),
  }
}

const flushVerification = () => new Promise(resolve => setImmediate(resolve))

test('인증 위치 조회가 완료된 뒤에만 사진 검증을 시작하고 FAILED이면 점수 없이 사진을 재선택한다', async () => {
  let finishLocation, finishSubmission
  const locationPromise = new Promise(resolve => { finishLocation = resolve })
  const submissionPromise = new Promise(resolve => { finishSubmission = resolve })
  const f = verificationFlowFixture({ locate: () => locationPromise, submit: () => submissionPromise })
  try {
    await f.prepare()
    f.start()
    assert.match(textOf(f.render()), /현재 위치를 확인하고 있어요/)
    assert.doesNotMatch(textOf(f.render()), /AI 검증 중/)
    assert.equal(f.posts.length, 0)
    f.advance(5000)
    assert.match(textOf(f.render()), /현재 위치를 확인하고 있어요/)
    finishLocation(position)
    await flushVerification()
    assert.match(textOf(f.render()), /같은 자리인지비교하고 있어요/)
    assert.ok(findNode(f.render(), 'div', item => item.className === 'qv-scanner'))
    assert.equal(f.posts.length, 1)
    finishSubmission({ verifyStatus: 'FAILED', similarity: 0.99, message: '유사도 99%' })
    await flushVerification()
    f.advance(2999)
    assert.match(textOf(f.render()), /AI 검증 중/)
    f.advance(1)
    await flushVerification()
    assert.match(textOf(f.render()), /인증 미완료/)
    assert.equal(findNode(f.render(), 'div', item => item.className === 'qv-scanner'), null)
    assert.doesNotMatch(textOf(f.render()), /99|%/)
    findNode(f.render(), 'Button').props.onClick()
    assert.equal(f.picks, 1)
    assert.equal(findNode(f.render(), 'textarea').props.value, '지금도 그대로예요')
    assert.ok(findNode(f.render(), 'img', item => item.src === 'blob:selected-photo'))
  } finally { f.unmount() }
})

test('위치 확인 실패는 제출하지 않으며 재확인 후에도 사진과 안부를 유지한다', async () => {
  let currentPosition = null, locationCalls = 0
  const f = verificationFlowFixture({
    locate: async () => { locationCalls++; return currentPosition },
    locationError: { message: '위치 권한을 허용해주세요.' },
  })
  try {
    await f.prepare()
    f.start()
    await flushVerification()
    assert.match(textOf(f.render()), /위치 권한을 허용해주세요/)
    assert.equal(f.posts.length, 0)
    currentPosition = position
    findNode(f.render(), 'Button').props.onClick()
    await flushVerification()
    f.advance(3000)
    await flushVerification()
    assert.equal(locationCalls, 2)
    assert.equal(f.posts.length, 1)
    assert.equal(f.posts[0].body.note, '지금도 그대로예요')
    assert.equal(f.posts[0].body.photo.name, 'selected.jpg')
    assert.match(textOf(f.render()), /인증 완료/)
  } finally { f.unmount() }
})

test('서버 범위 초과는 별도 화면으로 안내하고 기기 거리 0m여도 통과시키지 않는다', async () => {
  for (const coordinates of [position, { ...position, lat: position.lat + 0.01 }]) {
    const f = verificationFlowFixture({ locate: async () => coordinates, submit: async () => { throw httpError(403, 'OUT_OF_RANGE') } })
    try {
      await f.prepare()
      f.start()
      await flushVerification()
      const tree = f.render()
      assert.match(textOf(tree), /인증 범위 안내/)
      assert.match(textOf(tree), /200m 이내/)
      assert.equal(findNode(tree, 'textarea'), null)
      assert.equal(f.invalidations.length, 0)
      assert.equal(f.pendingTimers, 0)
      if (coordinates === position) assert.match(textOf(tree), /위치를 다시 확인해주세요/)
      findNode(tree, 'Button').props.onClick()
      assert.equal(findNode(f.render(), 'textarea').props.value, '지금도 그대로예요')
      assert.ok(findNode(f.render(), 'img', item => item.src === 'blob:selected-photo'))
      assert.equal(f.posts.length, 1)
    } finally { f.unmount() }
  }
})

test('응답 불명에서는 입력 화면으로 돌아와도 POST를 재전송하지 않고 조회로만 완료를 확인한다', async () => {
  let status = 'NONE'
  const f = verificationFlowFixture({
    submit: async () => { throw new axios.AxiosError('timeout', 'ECONNABORTED') },
    readStatus: () => status,
  })
  try {
    await f.prepare()
    f.start()
    await flushVerification()
    assert.match(textOf(f.render()), /전송 결과를 확인해주세요/)
    for (const pendingStatus of ['NONE', 'FAILED']) {
      status = pendingStatus
      findNode(f.render(), 'Button').props.onClick()
      assert.match(textOf(f.render()), /전송 결과를 확인하고 있어요/)
      assert.equal(findNode(f.render(), 'div', item => item.className === 'qv-scanner'), null)
      await flushVerification()
      assert.equal(f.posts.length, 1)
      assert.match(textOf(f.render()), /아직 확인하지 못했어요/)
    }
    f.returnToForm()
    assert.equal(findNode(f.render(), 'textarea').props.value, '지금도 그대로예요')
    assert.match(textOf(findNode(f.render(), 'Button')), /전송 결과 확인/)
    status = 'PASSED'
    f.start()
    await flushVerification()
    assert.equal(f.reads.length, 3)
    assert.equal(f.posts.length, 1)
    assert.match(textOf(f.render()), /인증 완료/)
    assert.equal(f.invalidations.length, 4)
  } finally { f.unmount() }
})

test('일반 퀘스트와 전송 결과 조회에는 이미지 스캔을 표시하지 않는다', async () => {
  let finishSubmission
  const promise = new Promise(resolve => { finishSubmission = resolve })
  const f = verificationFlowFixture({ questType: 'GENERAL', submit: () => promise })
  try {
    await f.prepare()
    f.start()
    await flushVerification()
    const tree = f.render()
    assert.match(textOf(tree), /안부를 전송하고 있어요/)
    assert.equal(findNode(tree, 'div', item => item.className === 'qv-scanner'), null)
    finishSubmission({ verifyStatus: 'PASSED', similarity: null })
    await flushVerification()
    assert.equal(f.posts[0].body.photo, null)
  } finally { f.unmount() }
})

test('빠른 인증 성공은 완료 상태를 갱신하되 스캔 화면은 3초 유지한다', async () => {
  const f = verificationFlowFixture()
  try {
    await f.prepare()
    f.start()
    await flushVerification()
    assert.equal(f.invalidations.length, 4)
    f.advance(2999)
    assert.match(textOf(f.render()), /AI 검증 중/)
    f.advance(1)
    await flushVerification()
    assert.match(textOf(f.render()), /인증 완료/)
    assert.equal(f.posts.length, 1)
    assert.equal(f.pendingTimers, 1)
  } finally { f.unmount() }
})

test('인증 완료를 같은 사진에 표시한 뒤 전달 애니메이션 종료·완료 안내 순서로 홈에 복귀한다', async () => {
  const f = verificationFlowFixture()
  try {
    await f.prepare()
    f.start()
    await flushVerification()
    f.advance(3000)
    await flushVerification()
    const verified = f.render()
    assert.ok(findNode(verified, 'img', item => item.src === 'blob:selected-photo'))
    assert.ok(findNode(verified, 'div', item => item.className === 'qv-verified-badge'))
    assert.equal(findNode(verified, 'div', item => item.className === 'qv-scanner'), null)
    assert.equal(findNode(verified, 'SwipeSheet'), null)
    assert.doesNotMatch(textOf(verified), /84|%|다른 수행자/)
    f.advance(699)
    assert.match(textOf(f.render()), /인증 완료/)
    f.advance(1)
    const delivering = f.render()
    assert.ok(findNode(delivering, 'section', item => item.className === 'qv-delivery'))
    assert.equal(findNode(delivering, 'section', item => item.className === 'qv-progress'), null)
    assert.match(textOf(delivering), /안부를 전하고 있어요/)
    const flight = findNode(delivering, 'motion.g')
    assert.equal(flight.props.transition.duration, 1.2)
    f.advance(5000)
    assert.match(textOf(f.render()), /안부를 전하고 있어요/)
    assert.equal(f.navigations.length, 0)
    flight.props.onAnimationComplete()
    assert.match(textOf(f.render()), /안부가 전달됐어요/)
    f.advance(400)
    // 중복 완료 이벤트가 홈 복귀 타이머를 다시 시작하면 안 됩니다.
    flight.props.onAnimationComplete()
    f.render()
    f.advance(399)
    assert.equal(f.navigations.length, 0)
    f.advance(1)
    assert.equal(f.navigations.length, 1)
    assert.equal(f.navigations[0].to, '/')
    assert.equal(f.navigations[0].options.replace, true)
    assert.equal(f.posts.length, 1)
    assert.equal(f.reads.length, 0)
    assert.equal(f.invalidations.length, 4)
  } finally { f.unmount() }
})

test('동작 줄이기에서는 봉투를 움직이지 않고 일반 퀘스트도 전달 완료 후 홈에 복귀한다', async () => {
  const f = verificationFlowFixture({ reducedMotion: true, questType: 'GENERAL', photoUrl: null })
  try {
    await f.prepare()
    f.start()
    await flushVerification()
    assert.match(textOf(f.render()), /인증 완료/)
    f.advance(700)
    const delivering = f.render()
    assert.match(textOf(delivering), /안부를 전하고 있어요/)
    assert.equal(findNode(delivering, 'motion.g'), null)
    assert.equal(findNode(delivering, 'img'), null)
    assert.ok(findNode(delivering, 'div', item => item.className === 'qv-delivery-placeholder'))
    f.advance(1199)
    assert.match(textOf(f.render()), /안부를 전하고 있어요/)
    f.advance(1)
    assert.match(textOf(f.render()), /안부가 전달됐어요/)
    f.advance(800)
    assert.equal(f.navigations.length, 1)
    assert.equal(f.navigations[0].to, '/')
    assert.equal(f.navigations[0].options.replace, true)
    assert.equal(f.posts.length, 1)
  } finally { f.unmount() }
})

test('완료·전달 도중 화면을 떠나면 남은 타이머와 홈 자동 이동을 취소한다', async () => {
  for (const phase of ['verified', 'delivering', 'delivered']) {
    const f = verificationFlowFixture({ reducedMotion: true, questType: 'GENERAL' })
    try {
      await f.prepare()
      f.start()
      await flushVerification()
      f.render()
      if (phase !== 'verified') { f.advance(700); f.render() }
      if (phase === 'delivered') { f.advance(1200); f.render() }
      assert.equal(f.pendingTimers, 1)
    } finally { f.unmount() }
    assert.equal(f.pendingTimers, 0)
    f.advance(10000)
    assert.equal(f.navigations.length, 0)
  }
})

test('인증 실패·범위 초과·응답 대기 초과에서는 전달 화면이나 홈으로 자동 이동하지 않는다', async () => {
  for (const submit of [
    async () => ({ verifyStatus: 'FAILED', similarity: 0.41 }),
    async () => { throw httpError(403, 'OUT_OF_RANGE') },
    () => new Promise(() => {}),
  ]) {
    const f = verificationFlowFixture({ submit })
    try {
      await f.prepare()
      f.start()
      await flushVerification()
      f.advance(3000)
      await flushVerification()
      f.render()
      f.advance(10000)
      const tree = f.render()
      assert.equal(findNode(tree, 'section', item => item.className === 'qv-delivery'), null)
      assert.doesNotMatch(textOf(tree), /인증 완료|안부가 전달됐어요/)
      assert.equal(f.navigations.length, 0)
      assert.equal(f.posts.length, 1)
    } finally { f.unmount() }
  }
})

test('사진 검증 3초 초과는 초안을 보존해 입력으로 복귀하고 늦은 응답과 중복 전송을 막는다', async () => {
  let finishSubmission
  const response = new Promise(resolve => { finishSubmission = resolve })
  const f = verificationFlowFixture({ submit: () => response, readStatus: () => 'PASSED' })
  try {
    await f.prepare()
    f.start()
    await flushVerification()
    f.advance(2999)
    assert.match(textOf(f.render()), /AI 검증 중/)
    f.advance(1)
    const tree = f.render()
    assert.match(textOf(tree), /3초 안에 끝나지 않았어요/)
    assert.equal(findNode(tree, 'textarea').props.value, '지금도 그대로예요')
    assert.ok(findNode(tree, 'img', item => item.src === 'blob:selected-photo'))
    assert.equal(f.posts[0].signal.aborted, true)
    assert.match(textOf(findNode(tree, 'Button')), /전송 결과 확인/)
    assert.equal(f.pendingTimers, 0)
    finishSubmission({ verifyStatus: 'PASSED', similarity: 0.84 })
    await flushVerification()
    assert.ok(findNode(f.render(), 'textarea'))
    assert.equal(f.invalidations.length, 0)
    f.start()
    await flushVerification()
    assert.equal(f.posts.length, 1)
    assert.equal(f.reads.length, 1)
    assert.match(textOf(f.render()), /인증 완료/)
  } finally { f.unmount() }
})

test('사진 스캐너는 사진이 있는 이미지 검증에만 표시하고 상태 문구와 분리한다', () => {
  const { default: Progress } = loadSource('features/quests/pages/verification/VerificationProgress.tsx', {
    'lucide-react': { Check: 'Check', MapPin: 'MapPin' },
    './PhotoScanner': loadSource('features/quests/pages/verification/PhotoScanner.tsx'),
    './verification.css': {},
  })
  for (const phase of ['locating', 'verifying', 'checking-result', 'verified']) {
    for (const general of [false, true]) {
      const tree = renderComponents(Progress({ phase, general, photoUrl: 'photo.jpg' }))
      const scanner = findNode(tree, 'div', item => item.className === 'qv-scanner')
      assert.equal(Boolean(scanner), phase === 'verifying' && !general)
      assert.ok(findNode(tree, 'h1'))
      assert.equal(findNode(tree, 'img', item => item.className === 'qv-scan-image').props.alt, '인증 장소')
      if (scanner) {
        assert.equal(scanner.props['aria-hidden'], 'true')
        assert.equal(textOf(scanner), '')
        assert.equal(findNode(scanner, 'button'), null)
      }
    }
  }
  const withoutPhoto = renderComponents(Progress({ phase: 'verifying', general: false, photoUrl: null }))
  assert.equal(findNode(withoutPhoto, 'div', item => item.className === 'qv-scanner'), null)
})

test('AI 서버의 명시적 실패는 입력 복귀 후 사용자가 다시 보낼 수 있고 자동 재전송하지 않는다', async () => {
  let attempts = 0
  const f = verificationFlowFixture({ submit: async () => {
    if (++attempts === 1) throw httpError(503, 'AI_ERROR')
    return { verifyStatus: 'PASSED', similarity: 0.12, message: '안부가 전달됐어요' }
  } })
  try {
    await f.prepare()
    f.start()
    await flushVerification()
    assert.match(textOf(f.render()), /인증 요청을 완료하지 못했어요/)
    assert.equal(f.posts.length, 1)
    findNode(f.render(), 'Button').props.onClick()
    assert.match(textOf(findNode(f.render(), 'Button')), /인증하고 안부 보내기/)
    f.start()
    await flushVerification()
    f.advance(3000)
    await flushVerification()
    assert.equal(f.posts.length, 2)
    assert.equal(f.reads.length, 0)
    assert.match(textOf(f.render()), /인증 완료/)
  } finally { f.unmount() }
})

test('인증 화면을 떠나면 요청을 취소하고 늦은 성공 응답으로 결과·캐시를 변경하지 않는다', async () => {
  let finishSubmission
  const promise = new Promise(resolve => { finishSubmission = resolve })
  const f = verificationFlowFixture({ submit: () => promise })
  await f.prepare()
  f.start()
  await flushVerification()
  assert.equal(f.pendingTimers, 1)
  f.unmount()
  assert.equal(f.pendingTimers, 0)
  assert.equal(f.posts[0].signal.aborted, true)
  finishSubmission({ verifyStatus: 'PASSED', similarity: 0.84 })
  await flushVerification()
  assert.equal(f.invalidations.length, 0)
  assert.equal(f.revoked.length, 1)
})

test('실제 상세 훅은 인증·선택을 검사하고 같은 사용자·ID의 요청과 캐시를 공유한다', async () => {
  let auth = { status: 'authenticated', user: { userId: 1 } }
  const calls = []
  const { useQuestDetail } = loadSource('features/quests/hooks/useQuestDetail.ts', {
    '@tanstack/react-query': { useQuery: (options) => options },
    '@/features/auth/hooks/useAuth': { useAuth: () => auth },
    '../api/questQueries': { getQuestDetail: async (id, signal) => { calls.push({ id, signal }); return { questId: id } } },
  })
  assert.equal(useQuestDetail(null).enabled, false)
  assert.throws(() => useQuestDetail(null).queryFn({ signal: new AbortController().signal }), /선택/)
  auth = { status: 'anonymous', user: null }
  assert.equal(useQuestDetail(701).enabled, false)
  assert.throws(() => useQuestDetail(701).queryFn({ signal: new AbortController().signal }), /로그인/)
  auth = { status: 'authenticated', user: { userId: 1 } }
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } })
  const card = new QueryObserver(client, useQuestDetail(701))
  const drawer = new QueryObserver(client, useQuestDetail(701))
  const stopCard = card.subscribe(() => {})
  const stopDrawer = drawer.subscribe(() => {})
  try {
    await card.refetch()
    assert.equal(calls.length, 1)
    assert.equal(calls[0].id, 701)
    assert.ok(calls[0].signal instanceof AbortSignal)
    assert.equal(card.getCurrentResult().data, drawer.getCurrentResult().data)
    auth = { status: 'authenticated', user: { userId: 2 } }
    drawer.setOptions(useQuestDetail(701))
    assert.equal(drawer.getCurrentResult().data, undefined)
    await drawer.refetch()
    assert.equal(calls.length, 2)
  } finally {
    stopCard()
    stopDrawer()
    client.clear()
  }
})

function httpError(status, code) {
  return new axios.AxiosError('Private server diagnostics', undefined, undefined, undefined, {
    status,
    data: { code, message: 'Private server diagnostics' },
  })
}

test('401·토큰 누락·403·404·통신·타임아웃·서버·응답 검증 오류를 안전한 문구로 구분한다', () => {
  const { getQuestQueryError } = queryErrorUtils
  for (const error of [httpError(401), { code: 'UNAUTHORIZED' }]) {
    const info = getQuestQueryError(error, 'detail')
    assert.equal(info.requiresLogin, true)
    assert.equal(info.keepPreviousData, false)
  }
  assert.match(getQuestQueryError(httpError(404), 'detail').message, /이 퀘스트를 찾을 수 없어요/)
  assert.match(getQuestQueryError(httpError(404), 'nearby').message, /주변 퀘스트 정보/)
  assert.equal(getQuestQueryError(httpError(403), 'detail').keepPreviousData, false)
  for (const [error, expected] of [
    [new axios.AxiosError('Private server diagnostics', 'ERR_NETWORK'), /인터넷 연결/],
    [new axios.AxiosError('Private server diagnostics', 'ECONNABORTED'), /시간이 초과/],
    [new axios.AxiosError('Private server diagnostics', 'ETIMEDOUT'), /시간이 초과/],
    [httpError(503), /서버에 일시적인 문제/],
    [new z.ZodError([{ code: 'custom', path: [], message: 'Private server diagnostics' }]), /서버 응답/],
  ]) {
    const info = getQuestQueryError(error, 'nearby')
    assert.match(info.message, expected)
    assert.doesNotMatch(info.message, /Private server diagnostics/)
    assert.equal(info.keepPreviousData, true)
  }
})

test('첫 목록 실패에서 재시도하고 갱신 실패에서는 기존 마커와 카드를 유지한다', () => {
  const f = homeFixture()
  f.query = { data: undefined, isError: true, isPending: false, error: new axios.AxiosError('Network', 'ERR_NETWORK') }
  f.render()
  f.node('QuestQueryErrorNotice').props.onRetry()
  assert.equal(f.refetchCalls[0].target, 'nearby')
  assert.equal(f.refetchCalls[0].options.cancelRefetch, false)
  f.query.data = quests
  f.render()
  assert.deepEqual(f.node('QuestMap').props.quests, quests)
  assert.ok(f.node('NearestQuestBar'))
  assert.equal(f.node('QuestQueryErrorNotice').props.showingPreviousData, true)
  f.query.isFetching = true
  f.render()
  assert.equal(f.node('QuestQueryErrorNotice').props.isFetching, true)
  f.query.error = httpError(401)
  f.render()
  assert.equal(f.node('QuestMap').props.quests.length, 0)
  assert.equal(f.navigation.count, null)
  assert.equal(f.node('QuestQueryErrorNotice').props.info.requiresLogin, true)
  assert.equal(f.query.data, quests)
})

test('추천 갱신 실패는 기존 결과를 유지하지만 404 상세를 추천하지 않는다', () => {
  const f = homeFixture()
  f.query = { data: quests, isError: false, isPending: false }
  f.nearestQuery = { isError: true, error: new axios.AxiosError('Network', 'ERR_NETWORK') }
  f.render()
  assert.ok(f.node('NearestQuestBar'))
  assert.equal(f.node('QuestQueryErrorNotice').props.showingPreviousData, true)
  f.node('QuestQueryErrorNotice').props.onRetry()
  assert.equal(f.refetchCalls[0].target, 'nearest')
  f.nearestQuery.error = httpError(404)
  f.render()
  assert.equal(f.node('NearestQuestBar'), null)
  assert.match(f.node('QuestQueryErrorNotice').props.info.message, /찾을 수 없어요/)
})

test('오류 안내는 조회 중 중복 클릭을 막고 401에서 로그인 링크만 표시한다', () => {
  const { default: Notice } = loadSource('features/quests/pages/home/components/QuestQueryErrorNotice.tsx', {
    'react-router': { Link: 'Link' },
  })
  let retries = 0
  const props = {
    info: queryErrorUtils.getQuestQueryError(httpError(503), 'nearby'),
    isFetching: false,
    onRetry: () => { retries++ },
    showingPreviousData: true,
  }
  const initial = Notice(props)
  assert.match(textOf(initial), /이전에 불러온 결과/)
  findNode(initial, 'button').props.onClick()
  assert.equal(retries, 1)
  const fetching = Notice({ ...props, isFetching: true })
  assert.equal(findNode(fetching, 'button').props.disabled, true)
  findNode(fetching, 'button').props.onClick()
  assert.equal(retries, 1)
  const unauthorized = Notice({ ...props, info: queryErrorUtils.getQuestQueryError(httpError(401), 'nearby') })
  assert.equal(findNode(unauthorized, 'button'), null)
  assert.equal(findNode(unauthorized, 'Link').props.to, '/login')
  assert.doesNotMatch(textOf(unauthorized), /이전에 불러온 결과/)
})

test('접힌 상세 미리보기는 사진이 있으면 사진만, 없으면 그리움과 수행 내용을 표시한다', () => {
  const { default: Preview } = loadSource('features/quests/pages/home/components/QuestDetailPreview.tsx', {
    '@/shared/components/RemotePhoto': { RemotePhoto: 'RemotePhoto' },
  })
  const quest = {
    ...quests[0], photoUrl: 'https://example.com/quest.jpg',
    longingText: '학교가 끝나면 들르던 서점이에요.',
    questDescription: '서점이 그대로 있는지 확인해주세요.',
  }
  // GENERAL에도 사진이 있으면 사진을 쓰고, 본문은 확장하기 전에는 노출하지 않습니다.
  const photo = Preview({ quest })
  assert.equal(findNode(photo, 'RemotePhoto').props.photoUrl, quest.photoUrl)
  assert.doesNotMatch(textOf(photo), /학교가 끝나면|서점이 그대로/)
  for (const photoUrl of [null, '', '   ']) {
    const noPhoto = Preview({ quest: { ...quest, questType: 'IMAGE', photoUrl } })
    assert.equal(findNode(noPhoto, 'RemotePhoto'), null)
    assert.match(textOf(noPhoto), /학교가 끝나면 들르던 서점/)
    assert.match(textOf(noPhoto), /전해줄 안부 · 서점이 그대로/)
  }
})

test('위치 카드는 주소를 복사하고 중복 클릭·권한 거절·미지원·빈 주소를 처리한다', async () => {
  const dependencies = {
    'lucide-react': { Copy: 'Copy', MapPin: 'MapPin' },
    '@/shared/components/ui/button': { Button: 'Button' },
  }
  const writes = []
  let finishCopy, views = 0
  const browser = { clipboard: { writeText: (address) => {
    writes.push(address)
    return new Promise((resolve) => { finishCopy = resolve })
  } } }
  const props = { placeName: '서점', address: ' 대구 중구 테스트 주소 ', onViewOnMap: () => views++ }
  const f = componentFixture('features/quests/pages/home/components/QuestLocationCard.tsx', dependencies, { navigator: browser })
  let tree = f.render(props)
  const copyButton = findNode(tree, 'Button')
  copyButton.props.onClick()
  copyButton.props.onClick()
  assert.deepEqual(writes, ['대구 중구 테스트 주소'])
  tree = f.render(props)
  assert.equal(findNode(tree, 'Button').props.disabled, true)
  assert.match(textOf(tree), /복사 중/)
  finishCopy()
  await new Promise(setImmediate)
  tree = f.render(props)
  assert.equal(findNode(tree, 'Button').props.disabled, false)
  assert.match(textOf(tree), /주소를 복사했어요/)
  tree.props.children[1].props.children[1].props.onClick()
  assert.equal(views, 1)

  browser.clipboard.writeText = async () => { throw new Error('Permission denied') }
  findNode(tree, 'Button').props.onClick()
  await new Promise(setImmediate)
  tree = f.render(props)
  assert.match(textOf(tree), /주소를 선택해 직접 복사/)
  assert.equal(findNode(tree, 'Button').props.disabled, false)
  browser.clipboard = undefined
  findNode(tree, 'Button').props.onClick()
  tree = f.render(props)
  assert.match(textOf(tree), /주소를 선택해 직접 복사/)
  const blank = componentFixture('features/quests/pages/home/components/QuestLocationCard.tsx', dependencies, { navigator: browser })
  tree = blank.render({ ...props, address: '  ' })
  assert.match(textOf(tree), /등록된 주소가 없어요/)
  assert.equal(findNode(tree, 'Button').props.disabled, true)
})

test('펼친 상세 본문은 수행 내용·그리움 전문·작성자·위치를 사진 유무와 관계없이 표시한다', () => {
  const { default: Content } = loadSource('features/quests/pages/home/components/QuestDetailContent.tsx', {
    './QuestLocationCard': { __esModule: true, default: 'QuestLocationCard' },
  })
  const quest = {
    ...quests[0], author: { userId: 3, nickname: '기억하는사람' },
    address: '대구 중구 테스트 주소',
    questDescription: '서점이 그대로 있는지 확인해주세요.\n가게 앞 모습을 남겨주세요.',
    longingText: '학교가 끝나면 들르던 서점이에요.\n' + '오래된 기억을 전합니다. '.repeat(80),
  }
  const onViewOnMap = () => {}
  for (const photoUrl of [null, 'https://example.com/quest.jpg']) {
    const tree = Content({ quest: { ...quest, photoUrl }, onViewOnMap })
    const text = textOf(tree)
    assert.ok(text.includes(quest.questDescription))
    assert.ok(text.includes(quest.longingText))
    assert.ok(text.includes('기억하는사람님이 남긴 그리움'))
    const location = findNode(tree, 'QuestLocationCard')
    assert.equal(location.props.placeName, quest.placeName)
    assert.equal(location.props.address, quest.address)
    assert.equal(location.props.onViewOnMap, onViewOnMap)
    assert.ok(text.indexOf(quest.questDescription) < text.indexOf(quest.longingText))
    assert.equal(findNode(tree, 'img'), null)
    assert.doesNotMatch(text, /등록 사진|등록된 사진이 없어요/)
  }
})

test('상세 Drawer는 미리보기·확장·고정 수행 버튼과 오류 재시도를 연결한다', () => {
  const retries = []
  let viewerPosition = position
  let expandedPhoto = null, hostTop = 200, layoutHeight = 330, resized, observed = false, disconnected = 0
  const positions = []
  const onPositionChange = (top) => positions.push(top)
  const onExpandedPhotoChange = (photo) => { expandedPhoto = photo }
  const query = {
    data: { ...quests[0], photoUrl: 'https://example.com/701.jpg' }, isError: true, isPending: false, isFetching: false,
    error: new axios.AxiosError('Network', 'ERR_NETWORK'),
    refetch: (options) => { retries.push(options); return Promise.resolve() },
  }
  const drawer = componentFixture('features/quests/pages/home/components/QuestDetailDrawer.tsx', {
    'lucide-react': { ChevronUp: 'ChevronUp', X: 'X' },
    '@/shared/components/ui/button': { Button: 'Button' },
    '@/features/quests/hooks/useQuestDetail': { useQuestDetail: () => query },
    './QuestStartButton': { __esModule: true, default: 'QuestStartButton' },
    './QuestDetailPreview': { __esModule: true, default: 'QuestDetailPreview' },
    './QuestDetailContent': { __esModule: true, default: 'QuestDetailContent' },
    './QuestQueryErrorNotice': { __esModule: true, default: 'QuestQueryErrorNotice' },
    '../utils/getQuestQueryError': queryErrorUtils,
    '../utils/getDistanceMeters': distanceUtils,
    '@/shared/components/ui/drawer': Object.fromEntries(['Drawer', 'DrawerClose', 'DrawerContent', 'DrawerDescription', 'DrawerFooter', 'DrawerHeader', 'DrawerTitle'].map((name) => [name, name])),
  }, {
    ResizeObserver: class {
      constructor(callback) { resized = callback }
      observe() { observed = true }
      disconnect() { disconnected++ }
    },
    window: { addEventListener() {}, removeEventListener() {} },
  })
  const render = () => drawer.render({ questId: 701, position: viewerPosition, onPositionChange, onExpandedPhotoChange, onClose() {} })
  let tree = render()
  const host = {
    getBoundingClientRect: () => ({ top: hostTop }),
    querySelector: () => ({ getBoundingClientRect: () => ({ height: 12 }) }),
    offsetHeight: 600, clientHeight: 599,
  }
  drawer.refs[0].current = host
  drawer.refs[1].current = { getBoundingClientRect: () => ({ height: layoutHeight }) }
  assert.match(textOf(tree), /내 위치에서 약 0m/)
  assert.equal(findNode(tree, 'QuestDetailPreview').props.quest, query.data)
  resized()
  tree = render()
  assert.equal(findNode(tree, 'Drawer').props.snapPoint, '343px')
  assert.equal(findNode(tree, 'Drawer').props.snapPoints[0], '343px')
  // 사진 로드 뒤 높이가 바뀌어도 고정 비율로 돌아가지 않고 내용 크기를 따라갑니다.
  layoutHeight = 350
  resized()
  tree = render()
  assert.equal(findNode(tree, 'Drawer').props.snapPoint, '363px')
  positions.length = 0
  assert.equal(findNode(tree, 'QuestStartButton'), null)
  assert.equal(findNode(tree, 'RemotePhoto'), null)
  const expand = findNode(tree, 'Button')
  assert.equal(expand.props['aria-expanded'], false)
  expand.props.onClick()
  let expanded = render()
  assert.equal(findNode(expanded, 'Drawer').props.snapPoint, 0.75)
  assert.equal(expandedPhoto, null)
  const transition = findNode(expanded, 'DrawerContent').props.onTransitionEnd
  transition({ target: {}, currentTarget: host, propertyName: 'transform' })
  assert.equal(positions.length, 0)
  transition({ target: host, currentTarget: host, propertyName: 'transform' })
  render()
  assert.equal(positions.at(-1), 200)
  assert.equal(expandedPhoto.photoUrl, query.data.photoUrl)
  assert.equal(observed, true)
  hostTop = 180
  resized()
  assert.equal(positions.at(-1), 180)
  // 이미 펼친 상태에서 상세가 나중에 갱신돼도 사진 없음·있음을 다시 반영합니다.
  query.data = { ...query.data, photoUrl: null }
  render()
  assert.equal(expandedPhoto, null)
  query.data = { ...query.data, photoUrl: 'https://example.com/new.jpg' }
  expanded = render()
  assert.equal(expandedPhoto.photoUrl, query.data.photoUrl)
  assert.equal(findNode(expanded, 'QuestDetailPreview'), null)
  assert.equal(findNode(expanded, 'QuestDetailContent').props.quest, query.data)
  assert.equal(findNode(expanded, 'RemotePhoto'), null)
  assert.ok(findNode(findNode(expanded, 'DrawerFooter'), 'QuestStartButton'))
  assert.equal(findNode(expanded, 'Button').props['aria-expanded'], true)
  // 지도 보기는 선택한 ID를 유지한 채 접어서 사진 레이어를 해제합니다.
  findNode(expanded, 'QuestDetailContent').props.onViewOnMap()
  const collapsed = render()
  assert.ok(findNode(collapsed, 'QuestDetailPreview'))
  assert.equal(findNode(collapsed, 'Drawer').props.snapPoint, '363px')
  assert.equal(findNode(collapsed, 'Drawer').props.open, true)
  assert.equal(findNode(collapsed, 'QuestStartButton'), null)
  assert.equal(expandedPhoto, null)
  hostTop = 400
  findNode(collapsed, 'DrawerContent').props.onTransitionEnd({ target: host, currentTarget: host, propertyName: 'transform' })
  assert.equal(positions.at(-1), 400)
  viewerPosition = { ...position, lat: position.lat - 0.001 }
  assert.match(textOf(render()), /내 위치에서 약 111m/)
  viewerPosition = { ...position, lng: position.lng - 0.1 }
  assert.match(textOf(render()), /내 위치에서 약 [0-9.]+km/)
  viewerPosition = null
  assert.match(textOf(render()), /위치 확인 후 거리 표시/)
  assert.equal(findNode(tree, 'QuestStartButton'), null)
  const notice = findNode(tree, 'QuestQueryErrorNotice')
  assert.equal(notice.props.showingPreviousData, true)
  notice.props.onRetry()
  assert.equal(retries[0].cancelRefetch, false)
  findNode(render(), 'Button').props.onClick()
  tree = render()
  findNode(tree, 'DrawerContent').props.onTransitionEnd({ target: host, currentTarget: host, propertyName: 'transform' })
  render()
  assert.ok(expandedPhoto)
  for (const status of [401, 403, 404]) {
    query.error = httpError(status)
    tree = render()
    assert.equal(findNode(tree, 'QuestStartButton'), null)
    assert.equal(findNode(tree, 'QuestDetailPreview'), null)
    assert.equal(findNode(tree, 'QuestDetailContent'), null)
    assert.equal(expandedPhoto, null)
    assert.equal(findNode(tree, 'QuestQueryErrorNotice').props.info.keepPreviousData, false)
  }
  drawer.unmount()
  assert.ok(disconnected > 0)
  assert.equal(expandedPhoto, null)
})


test('같은 계정으로 재진입하면 신선한 데이터에 남은 401 오류도 즉시 재조회한다', { timeout: 2000 }, async () => {
  for (const kind of ['nearby', 'detail']) {
    let fail = false, calls = 0
    const request = async () => {
      calls++
      if (fail) throw httpError(401)
      return kind === 'nearby' ? quests : quests[0]
    }
    const hook = loadSource(`features/quests/hooks/${kind === 'nearby' ? 'useNearbyQuests' : 'useQuestDetail'}.ts`, {
      '@tanstack/react-query': { useQuery: (options) => options },
      '@/features/auth/hooks/useAuth': { useAuth: () => ({ status: 'authenticated', user: { userId: 1 } }) },
      '../api/questQueries': { getNearbyQuests: request, getQuestDetail: request },
    })
    const options = () => kind === 'nearby' ? hook.useNearbyQuests(position) : hook.useQuestDetail(701)
    const client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } })
    const initial = new QueryObserver(client, options())
    const stopInitial = initial.subscribe(() => {})
    let stopNext = () => {}
    try {
      await initial.refetch()
      fail = true
      const failed = await initial.refetch()
      assert.equal(failed.isError, true)
      assert.notEqual(failed.data, undefined)
      stopInitial()
      fail = false
      const next = new QueryObserver(client, options())
      await new Promise((resolve) => {
        stopNext = next.subscribe((result) => {
          if (result.status === 'success' && result.fetchStatus === 'idle') resolve()
        })
      })
      assert.equal(calls, 3)
      assert.equal(next.getCurrentResult().isError, false)
    } finally {
      stopInitial()
      stopNext()
      client.clear()
    }
  }
})
