// 서버·지도 SDK 없이 홈의 실제 데이터 연결과 상세 조회 캐시를 검증합니다.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import { QueryClient, QueryObserver } from '@tanstack/react-query'
import ts from 'typescript'

const element = (type, props) => ({ type, props })

function loadSource(path, dependencies = {}) {
  const source = ts.transpileModule(
    readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8')
      .replaceAll('import.meta.env.DEV', 'false'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } },
  ).outputText
  const module = { exports: {} }
  runInNewContext(source, {
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
  let cursor = 0, tree
  const fixture = {
    position,
    query: { data: undefined, isPending: true, isError: false },
    activeQuestId: null,
    detailIds: [],
    navigations: [],
  }
  const page = loadSource('features/quests/pages/home/QuestMapPage.tsx', {
    react: {
      useCallback: (callback) => callback,
      useState: (initial) => {
        const index = cursor++
        if (!(index in states)) states[index] = initial
        return [states[index], (next) => { states[index] = next }]
      },
    },
    'react-router': { useNavigate: () => (path) => fixture.navigations.push(path) },
    '@/features/quests/hooks/useGeolocation': { useGeolocation: () => ({ position: fixture.position, isLocating: false, error: null, requestLocation: async () => fixture.position }) },
    '@/features/quests/hooks/useNearbyQuests': { useNearbyQuests: () => fixture.query },
    '@/features/quests/hooks/useRegionName': { useRegionName: () => 'Daegu' },
    '@/features/quests/hooks/useActiveQuest': { useActiveQuest: () => ({ activeQuestId: fixture.activeQuestId }) },
    '@/features/quests/hooks/useQuestDetail': {
      useQuestDetail: (id) => {
        fixture.detailIds.push(id)
        return { data: id === null ? undefined : { ...quests[0], questId: id }, isPending: false, isError: false }
      },
    },
    './utils/getNearestQuest': loadSource('features/quests/pages/home/utils/getNearestQuest.ts'),
    './utils/getQuestVerifyPath': loadSource('features/quests/pages/home/utils/getQuestVerifyPath.ts'),
  })
  return Object.assign(fixture, {
    render() { cursor = 0; tree = page.default(); return tree },
    node(type) { return findNode(tree, type) },
  })
}

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
  assert.match(textOf(f.render()), /불러오지 못/)
  assert.equal(f.node('NearbyQuestCountCard').props.status, 'error')
  f.query = { data: [], isPending: false, isError: false }
  assert.match(textOf(f.render()), /주변에 등록된 퀘스트가 없어요/)
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
  assert.equal(f.node('QuestMap').props.quests, quests)
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
