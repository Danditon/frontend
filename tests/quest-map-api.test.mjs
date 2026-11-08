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

function findNode(tree, type) {
  if (!tree || typeof tree !== 'object') return null
  if (tree.type === type) return tree
  for (const child of [tree.props?.children].flat()) {
    const result = findNode(child, type)
    if (result) return result
  }
  return null
}

function textOf(tree) {
  if (typeof tree === 'string' || typeof tree === 'number') return String(tree)
  if (!tree || typeof tree !== 'object') return ''
  return [tree?.props?.children].flat().map((child) => textOf(child)).join('')
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
    position,
    query: { data: undefined, isPending: true, isError: false },
    activeQuestId: null,
    detailIds: [],
    navigations: [],
    refetchCalls: [],
    detailQuery: {},
    locationRequests: 0,
    isLocating: false,
    locationError: null,
    requestLocation: async () => { fixture.locationRequests++; return fixture.position },
  }
  const page = loadSource('features/quests/pages/home/QuestMapPage.tsx', {
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
    'react-router': { useNavigate: () => (path) => fixture.navigations.push(path) },
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
    '@/features/quests/hooks/useActiveQuest': { useActiveQuest: () => ({ activeQuestId: fixture.activeQuestId }) },
    '@/features/quests/hooks/useQuestDetail': {
      useQuestDetail: (id) => {
        fixture.detailIds.push(id)
        return {
          data: id === null ? undefined : { ...quests[0], questId: id },
          isPending: false,
          isError: false,
          isFetching: false,
          refetch: (options) => { fixture.refetchCalls.push({ target: 'detail', options }); return Promise.resolve() },
          ...fixture.detailQuery,
        }
      },
    },
    './utils/getNearestQuest': loadSource('features/quests/pages/home/utils/getNearestQuest.ts', { './getDistanceMeters': distanceUtils }),
    './utils/getQuestVerifyPath': loadSource('features/quests/pages/home/utils/getQuestVerifyPath.ts'),
    './utils/getQuestQueryError': queryErrorUtils,
  }, { queueMicrotask: (callback) => microtasks.push(callback) })
  return Object.assign(fixture, {
    render() { cursor = 0; memoCursor = 0; effectCursor = 0; tree = page.default(); return tree },
    node(type) { return findNode(tree, type) },
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
  f.node('LocationPromptCard').props.onRequestLocation()
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

test('위치 미확인·조회 중·실패·성공 0개를 구분하고 mock 마커로 대체하지 않는다', () => {
  const f = homeFixture()
  f.position = null
  f.render()
  assert.ok(f.node('LocationPromptCard'))
  assert.equal(f.node('QuestMap').props.quests.length, 0)
  assert.equal(f.node('NearbyQuestCountCard').props.status, 'location-required')
  f.position = position
  assert.match(textOf(f.render()), /불러오는 중/)
  assert.equal(f.node('NearbyQuestCountCard').props.status, 'loading')
  f.query = { data: undefined, isPending: false, isError: true }
  f.render()
  assert.match(f.node('QuestQueryErrorNotice').props.info.message, /불러오지 못/)
  assert.equal(f.node('NearbyQuestCountCard').props.status, 'error')
  f.query = { data: [], isPending: false, isError: false }
  assert.match(textOf(f.render()), /주변에 수행할 수 있는 퀘스트가 없어요/)
  f.node('QuestMap').props.onVisibleQuestsChange([])
  f.render()
  assert.equal(f.node('NearbyQuestCountCard').props.count, 0)
  f.node('NearbyQuestCountCard').props.onClick()
  f.render()
  assert.equal(f.node('QuestListDrawer').props.open, true)
  assert.equal(f.node('QuestListDrawer').props.quests.length, 0)
})

test('서버 목록으로 마커·가까운 카드·목록을 연결하고 모두 같은 ID의 상세를 연다', () => {
  const f = homeFixture()
  f.query = { data: quests, isPending: false, isError: false }
  f.render()
  assert.deepEqual(f.node('QuestMap').props.quests, quests)
  assert.equal(f.detailIds.at(-1), 701)
  f.node('QuestMap').props.onVisibleQuestsChange([quests[1]])
  f.render()
  assert.equal(f.node('NearbyQuestCountCard').props.count, 1)
  f.node('NearbyQuestCountCard').props.onClick()
  f.render()
  assert.equal(f.node('QuestListDrawer').props.quests[0], quests[1])
  f.node('QuestListDrawer').props.onSelect(702)
  f.render()
  assert.equal(f.node('QuestListDrawer').props.open, false)
  assert.equal(f.node('QuestDetailDrawer').props.questId, 702)
  f.node('QuestDetailDrawer').props.onClose()
  f.render()
  f.node('ActiveQuestCard').props.onSelect(701)
  f.render()
  assert.equal(f.node('QuestDetailDrawer').props.questId, 701)
  f.node('QuestMap').props.onQuestSelect(702)
  f.render()
  assert.equal(f.node('QuestDetailDrawer').props.questId, 702)
})

test('본인 퀘스트를 마커·개수·목록·가까운 카드에서 함께 제외하고 API 배열을 보존한다', () => {
  const f = homeFixture()
  const mine = { ...quests[0], questId: 700, isMine: true }
  const other = { ...quests[0], lat: 35.8724, distance: 100 }
  const response = [mine, other, quests[1]]
  f.query = { data: response, isPending: false, isError: false }
  f.render()
  const displayed = f.node('QuestMap').props.quests
  assert.deepEqual(displayed.map((quest) => quest.questId), [701, 702])
  assert.equal(f.detailIds.at(-1), 701)
  assert.equal(f.node('ActiveQuestCard').props.quest.questId, 701)
  f.node('QuestMap').props.onVisibleQuestsChange(displayed)
  f.render()
  assert.equal(f.node('QuestMap').props.quests, displayed)
  assert.equal(f.node('NearbyQuestCountCard').props.count, 2)
  f.node('NearbyQuestCountCard').props.onClick()
  f.render()
  assert.deepEqual(Array.from(f.node('QuestListDrawer').props.quests, (quest) => quest.questId), [701, 702])
  assert.equal(f.query.data, response)
  assert.equal(response.length, 3)
  assert.equal(response[0], mine)
})

test('주변에 본인 퀘스트만 있으면 성공 0개와 수행할 퀘스트 없음 안내를 표시한다', () => {
  const f = homeFixture()
  f.query = { data: quests.map((quest) => ({ ...quest, isMine: true })), isPending: false, isError: false }
  assert.match(textOf(f.render()), /주변에 수행할 수 있는 퀘스트가 없어요/)
  assert.equal(f.node('QuestMap').props.quests.length, 0)
  assert.equal(f.detailIds.at(-1), null)
  assert.equal(f.node('ActiveQuestCard'), null)
  f.node('QuestMap').props.onVisibleQuestsChange([])
  f.render()
  assert.equal(f.node('NearbyQuestCountCard').props.status, 'ready')
  assert.equal(f.node('NearbyQuestCountCard').props.count, 0)
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
  assert.equal(f.node('NearbyQuestCountCard').props.count, 2)
  const updated = [{ ...quests[0], questId: 801 }]
  f.query = { data: updated, isPending: false, isError: false }
  f.render()
  oldCallback(quests)
  f.render()
  assert.equal(f.node('NearbyQuestCountCard').props.count, null)
  f.node('NearbyQuestCountCard').props.onClick()
  f.render()
  assert.equal(f.node('QuestListDrawer').props.open, false)
  f.node('QuestMap').props.onVisibleQuestsChange(updated)
  f.render()
  assert.equal(f.node('NearbyQuestCountCard').props.count, 1)
})

test('기존 수행 중 카드의 우선 표시와 인증 화면 이동은 유지한다', () => {
  const f = homeFixture()
  f.query = { data: quests, isPending: false, isError: false }
  f.activeQuestId = 900
  f.render()
  const card = f.node('ActiveQuestCard')
  assert.equal(card.props.mode, 'active')
  assert.equal(card.props.quest.questId, 900)
  card.props.onSelect(900)
  assert.deepEqual(f.navigations, ['/quests/900/verify?type=general'])
})

test('개수 카드의 비활성·로딩 표시와 성공 0개 동작을 구분한다', () => {
  const { default: CountCard } = loadSource('features/quests/pages/home/components/NearbyQuestCountCard.tsx', { 'lucide-react': { ChevronUp: 'ChevronUp' } })
  for (const [status, count, disabled, busy] of [
    ['location-required', null, true, false], ['loading', null, true, true],
    ['error', 9, true, false], ['ready', null, true, true], ['ready', 0, false, false],
  ]) {
    const button = CountCard({ status, count, onClick() {} })
    assert.equal(button.props.disabled, disabled)
    assert.equal(button.props['aria-busy'], busy)
    if (status === 'error') assert.doesNotMatch(textOf(button), /9/)
    if (status === 'ready' && count === 0) assert.match(button.props['aria-label'], /0개/)
  }
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
  assert.ok(f.node('ActiveQuestCard'))
  assert.equal(f.node('QuestQueryErrorNotice').props.showingPreviousData, true)
  f.query.isFetching = true
  f.render()
  assert.equal(f.node('QuestQueryErrorNotice').props.isFetching, true)
  f.query.error = httpError(401)
  f.render()
  assert.equal(f.node('QuestMap').props.quests.length, 0)
  assert.equal(f.node('NearbyQuestCountCard').props.status, 'error')
  assert.equal(f.node('QuestQueryErrorNotice').props.info.requiresLogin, true)
  assert.equal(f.query.data, quests)
})

test('카드 갱신 실패는 기존 카드를 유지하지만 404 상세로 수행 버튼을 제공하지 않는다', () => {
  const f = homeFixture()
  f.query = { data: quests, isError: false, isPending: false }
  f.detailQuery = { isError: true, error: new axios.AxiosError('Network', 'ERR_NETWORK') }
  f.render()
  assert.ok(f.node('ActiveQuestCard'))
  assert.equal(f.node('QuestQueryErrorNotice').props.showingPreviousData, true)
  f.node('QuestQueryErrorNotice').props.onRetry()
  assert.equal(f.refetchCalls[0].target, 'detail')
  f.detailQuery.error = httpError(404)
  f.render()
  assert.equal(f.node('ActiveQuestCard'), null)
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

test('상세 Drawer는 미리보기·확장·고정 수행 버튼과 오류 재시도를 연결한다', () => {
  const retries = []
  let viewerPosition = position
  let snapPoint = 0.4
  const query = {
    data: quests[0], isError: true, isPending: false, isFetching: false,
    error: new axios.AxiosError('Network', 'ERR_NETWORK'),
    refetch: (options) => { retries.push(options); return Promise.resolve() },
  }
  const { default: Drawer } = loadSource('features/quests/pages/home/components/QuestDetailDrawer.tsx', {
    react: { useCallback: (fn) => fn, useRef: () => ({ current: null }), useState: () => [snapPoint, (next) => { snapPoint = next }] },
    'lucide-react': { ChevronUp: 'ChevronUp', X: 'X' },
    '@/shared/components/ui/button': { Button: 'Button' },
    '@/shared/components/RemotePhoto': { RemotePhoto: 'RemotePhoto' },
    '@/features/quests/hooks/useQuestDetail': { useQuestDetail: () => query },
    './QuestStartButton': { __esModule: true, default: 'QuestStartButton' },
    './QuestDetailPreview': { __esModule: true, default: 'QuestDetailPreview' },
    './QuestQueryErrorNotice': { __esModule: true, default: 'QuestQueryErrorNotice' },
    '../utils/getQuestQueryError': queryErrorUtils,
    '../utils/getDistanceMeters': distanceUtils,
    '@/shared/components/ui/drawer': Object.fromEntries(['Drawer', 'DrawerClose', 'DrawerContent', 'DrawerDescription', 'DrawerFooter', 'DrawerHeader', 'DrawerTitle'].map((name) => [name, name])),
  })
  const render = () => Drawer({ questId: 701, position: viewerPosition, onPositionChange() {}, onClose() {} })
  let tree = render()
  assert.match(textOf(tree), /내 위치에서 약 0m/)
  assert.equal(findNode(tree, 'QuestDetailPreview').props.quest, query.data)
  assert.ok(findNode(findNode(tree, 'DrawerFooter'), 'QuestStartButton'))
  assert.equal(findNode(tree, 'RemotePhoto'), null)
  const expand = findNode(tree, 'Button')
  assert.equal(expand.props['aria-expanded'], false)
  expand.props.onClick()
  const expanded = render()
  assert.equal(findNode(expanded, 'QuestDetailPreview'), null)
  assert.ok(findNode(expanded, 'RemotePhoto'))
  assert.ok(findNode(findNode(expanded, 'DrawerFooter'), 'QuestStartButton'))
  assert.equal(findNode(expanded, 'Button').props['aria-expanded'], true)
  findNode(expanded, 'Button').props.onClick()
  assert.ok(findNode(render(), 'QuestDetailPreview'))
  viewerPosition = { ...position, lat: position.lat - 0.001 }
  assert.match(textOf(render()), /내 위치에서 약 111m/)
  viewerPosition = { ...position, lng: position.lng - 0.1 }
  assert.match(textOf(render()), /내 위치에서 약 [0-9.]+km/)
  viewerPosition = null
  assert.match(textOf(render()), /위치 확인 후 거리 표시/)
  assert.ok(findNode(tree, 'QuestStartButton'))
  const notice = findNode(tree, 'QuestQueryErrorNotice')
  assert.equal(notice.props.showingPreviousData, true)
  notice.props.onRetry()
  assert.equal(retries[0].cancelRefetch, false)
  for (const status of [401, 403, 404]) {
    query.error = httpError(status)
    tree = render()
    assert.equal(findNode(tree, 'QuestStartButton'), null)
    assert.equal(findNode(tree, 'QuestDetailPreview'), null)
    assert.equal(findNode(tree, 'QuestQueryErrorNotice').props.info.keepPreviousData, false)
  }
})

test('같은 상세 캐시를 쓰는 navbar도 접근 거절·404의 오래된 데이터로 이동하지 않는다', () => {
  const alerts = [], navigations = []
  const query = { data: quests[0], isError: true, isPending: false, error: httpError(404) }
  const { default: Nav } = loadSource('features/quests/components/QuestVerifyNavItem.tsx', {
    'lucide-react': { BadgeCheck: 'BadgeCheck' },
    'react-router': { useNavigate: () => (path) => navigations.push(path) },
    '../hooks/useActiveQuest': { useActiveQuest: () => ({ activeQuestId: 701 }) },
    '../hooks/useQuestDetail': { useQuestDetail: () => query },
    '../pages/home/utils/getQuestVerifyPath': loadSource('features/quests/pages/home/utils/getQuestVerifyPath.ts'),
    '../pages/home/utils/getQuestQueryError': queryErrorUtils,
  }, { window: { alert: (message) => alerts.push(message) } })
  for (const status of [401, 403, 404]) {
    query.error = httpError(status)
    Nav().props.onClick()
  }
  assert.equal(navigations.length, 0)
  assert.equal(alerts.length, 3)
  query.error = new axios.AxiosError('Network', 'ERR_NETWORK')
  Nav().props.onClick()
  assert.equal(navigations[0], '/quests/701/verify?type=general')
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
