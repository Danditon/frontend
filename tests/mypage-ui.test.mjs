import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import test from 'node:test'
import ts from 'typescript'
import { QueryClient } from '@tanstack/react-query'
import { z } from 'zod'

function load(path, dependencies = {}, globals = {}) {
  const code = ts.transpileModule(readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  const module = { exports: {} }
  const element = (type, props, key) => ({ type, props, key })
  runInNewContext(code, { ...globals, module, exports: module.exports, require(id) {
    if (id === 'react/jsx-runtime') return { jsx: element, jsxs: element, Fragment: 'Fragment' }
    if (id.endsWith('.css')) return {}
    if (Object.hasOwn(dependencies, id)) return dependencies[id]
    throw new Error(`Unexpected dependency: ${id}`)
  } })
  return module.exports.default ?? module.exports
}
function all(tree, type) {
  if (!tree || typeof tree !== 'object') return []
  return [...(tree.type === type ? [tree] : []), ...[tree.props?.children].flat(Infinity).flatMap(child => all(child, type))]
}
const find = (tree, type, matches = () => true) => all(tree, type).find(node => matches(node.props))
const nextButton = tree => find(tree, 'button', props => props.className === 'greeting-next')
const likeButton = tree => find(tree, 'button', props => props.className === 'greeting-like')
const text = tree => typeof tree === 'string' || typeof tree === 'number' ? String(tree)
  : tree ? [tree.props?.children].flat(Infinity).map(text).join('') : ''
const wire = { Back: 'Back', Profile: 'Profile', Bottom: 'Bottom' }
const router = { Link: 'Link' }
const photo = { RemotePhoto: 'RemotePhoto' }
const memory = { id: '22', questType: 'GENERAL', title: '그리운 카페', sub: '일반 퀘스트', photoUrl: null, passedCount: 2 }
const record = { id: '101', questId: '22', title: '카페의 안부', photoUrl: '/record.jpg', location: { lat: 35, lng: 128, placeName: '카페' } }
const submission = (id, createdAt, extra = {}) => ({ submissionId: id, createdAt, greeting: `안부 ${id}`, photoUrl: `/photo-${id}.jpg`,
  isLiked: false, verifyStatus: 'PASSED', performer: { userId: 8, nickname: '보낸 사람' }, ...extra })

function envelopeFixture(reducedMotion = false) {
  let cursor = 0, idCursor = 0, motionCursor = 0
  const states = [], motionValues = []
  const f = { reducedMotion }
  const Envelope = load('features/memories/components/GreetingEnvelope.tsx', {
    react: { useId: () => `flap-${idCursor++}`, useState(initial) {
      const i = cursor++
      if (!(i in states)) states[i] = initial
      return [states[i], value => { states[i] = value }]
    } },
    'motion/react': {
      motion: { div: 'div', footer: 'footer' }, useReducedMotion: () => f.reducedMotion,
      useMotionValue: value => motionValues[motionCursor++] ??= { get: () => value, set: next => { value = next } },
      useTransform: (source, convert) => ({ get: () => convert(source.get()) }),
    },
    'lucide-react': { Heart: 'Heart' },
    './GreetingLetter': { __esModule: true, default: 'GreetingLetter' },
  })
  function expand(tree) {
    if (Array.isArray(tree)) return tree.map(expand)
    if (!tree || typeof tree !== 'object') return tree
    if (typeof tree.type === 'function') return expand(tree.type(tree.props))
    return { ...tree, props: { ...tree.props, children: expand(tree.props?.children) } }
  }
  return Object.assign(f, { render(props) { cursor = 0; idCursor = 0; motionCursor = 0; return expand(Envelope(props)) } })
}

function fixture(path = '/me', search = '') {
  const client = new QueryClient()
  client.setQueryData(['quest-greetings', '22', 'token'], { viewerRole: 'AUTHOR', submissions: [
    submission(1, '2026-11-01'), submission(2, '2026-11-02'), submission(3, '2026-11-03', { verifyStatus: 'FAILED' }),
  ] })
  let params = new URLSearchParams(search), cursor = 0, refCursor = 0, effectCursor = 0, mutationOptions
  const states = [], refs = [], effects = []
  const f = { pathname: path, client, memories: [memory], records: [record], likes: [], navigations: [], removed: [], scrolls: [], queries: [], questError: false, greetingError: false, pendingQueries: false, detailQuestType: 'IMAGE' }
  const envelope = envelopeFixture(true)
  const { HistoryRecordCard } = load('features/history/components/HistoryRecordCard.tsx', { '@/shared/components/RemotePhoto': photo })
  function expand(tree) {
    if (Array.isArray(tree)) return tree.map(expand)
    if (!tree || typeof tree !== 'object') return tree
    if (tree.type === 'GreetingEnvelope') {
      f.envelopeKey = tree.key
      return envelope.render(tree.props)
    }
    if (tree.type === 'HistoryRecordCard') return expand(HistoryRecordCard(tree.props))
    if (tree.type === 'MyPageTabs') { f.tabs = tree.props; return { type: 'section', props: { children: expand([tree.props.summary, tree.props.children]) } } }
    return { ...tree, props: { ...tree.props, children: expand(tree.props?.children) } }
  }
  const mutation = { isPending: false, isError: false, variables: undefined, mutate(value) {
    f.likes.push(value); this.variables = value; this.isPending = true
  } }
  const query = (data, isError = false) => ({ data, isError, isPending: f.pendingQueries, isFetching: f.pendingQueries,
    isSuccess: !isError && !f.pendingQueries && data !== undefined, refetch() { f.retried = true } })
  const Page = load('features/memories/pages/MyPage.tsx', {
    react: {
      useState(initial) { const i = cursor++; if (!(i in states)) states[i] = initial; return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value }] },
      useMemo: fn => fn(),
      useRef(initial) { const i = refCursor++; return refs[i] ??= { current: i === 0 ? { scrollIntoView: () => f.scrolls.push('top') } : initial } },
      useEffect(run, deps) { const i = effectCursor++; if (!effects[i] || deps.some((value, j) => !Object.is(value, effects[i][j]))) { effects[i] = deps; run() } },
    },
    'react-router': { ...router, useLocation: () => ({ pathname: f.pathname }), useSearchParams: () => [params, update => {
      params = typeof update === 'function' ? update(params) : new URLSearchParams(update)
    }], useNavigate: () => (...args) => f.navigations.push(args) },
    'motion/react': { AnimatePresence: 'AnimatePresence' },
    'lucide-react': { Heart: 'Heart', ExternalLink: 'ExternalLink' }, '@/shared/components/WireUI': wire, '@/shared/components/RemotePhoto': photo,
    '@/features/history/components/HistoryMap': { HistoryMap: 'HistoryMap' },
    '@/features/history/components/HistoryRecordCard': { HistoryRecordCard: 'HistoryRecordCard' },
    '@/features/history/components/PeerGreetingsDrawer': { __esModule: true, default: 'PeerGreetingsDrawer' },
    '@/features/history/lib/locations': load('features/history/lib/locations.ts'),
    '@/features/auth/hooks/useAuth': { useAuth: () => ({ user: { userId: 7, nickname: '사용자', email: 'user@example.com' }, retrySession: async () => {} }) },
    '@/features/auth/utils/tokenStorage': { getAccessToken: () => 'token' },
    '@tanstack/react-query': {
      useQueryClient: () => client,
      useQuery(options) {
        f.queries.push(options)
        if (options.queryKey[0] === 'my-quests') return query(f.memories, f.questError)
        if (options.queryKey[0] === 'verification-quest') return query(f.detailQuestType ? { questType: f.detailQuestType } : undefined)
        if (options.queryKey[0] === 'quest-greetings') return query(client.getQueryData(options.queryKey), f.greetingError)
        return query(f.records)
      },
      useQueries: ({ queries }) => queries.map(options => query(client.getQueryData(options.queryKey), f.greetingError)),
      useMutation(options) { mutationOptions = options; return mutation },
    },
    '../api/myPage': { getMyQuests: () => {}, getMySubmissions: () => {} },
    '../lib/performances': load('features/memories/lib/performances.ts'),
    '../lib/greetingViews': load('features/memories/lib/greetingViews.ts', { './performances.ts': load('features/memories/lib/performances.ts') }),
    '@/features/quests/api/verification': { getQuestGreetings: () => {}, toggleSubmissionLike: () => {}, getVerificationQuest: (...args) => { f.requestedDetail = args } },
    '../components/MyPageSummary': { __esModule: true, default: 'MyPageSummary' },
    '../components/MemoryQuestCard': { __esModule: true, default: 'MemoryQuestCard' },
    '../components/GreetingEnvelope': { __esModule: true, default: 'GreetingEnvelope' },
    '../components/ReceivedGreetingsDrawer': { __esModule: true, default: 'ReceivedGreetingsDrawer' },
    '../components/MyPageTabs': { __esModule: true, default: 'MyPageTabs' },
  }, { URLSearchParams, requestAnimationFrame: fn => fn(), localStorage: { removeItem: key => f.removed.push(key) }, sessionStorage: { removeItem: key => f.removed.push(key) } })
  return Object.defineProperty(Object.assign(f, {
    render() { cursor = 0; refCursor = 0; effectCursor = 0; return expand(Page()) },
    visit(path) { const [pathname, search = ''] = path.split('?'); f.pathname = pathname; params = new URLSearchParams(search) },
    finishLike() { mutationOptions.onSuccess({ submissionId: mutation.variables.submissionId, isLiked: true }, mutation.variables); mutation.isPending = false },
  }), 'params', { get: () => params })
}

test('뚜껑은 수직에서만 편지지 뒤로 넘어가며 회전축은 봉투 입구에 고정된다', () => {
  const tree = envelopeFixture().render({ greeting: { id: '2' } })
  const flap = find(tree, 'div', props => props.className === 'greeting-envelope-flap')
  assert.equal(flap.props.style.transformOrigin, '50% 0')
  const { rotateX, zIndex } = flap.props.style
  for (const [angle, layer] of [[0, 5], [-45, 5], [-89.9, 5], [-90, 1], [-135, 1], [-180, 1]]) {
    rotateX.set(angle)
    assert.equal(zIndex.get(), layer)
  }
})

test('둥근 뚜껑의 앞뒷면은 같은 경로를 겹치며 그라데이션 ID가 충돌하지 않는다', () => {
  const tree = envelopeFixture().render({ greeting: { id: '2' } })
  const faces = all(tree, 'svg').filter(node => node.props.className?.includes('greeting-envelope-flap-face'))
  assert.equal(faces.length, 2)
  assert.equal(find(faces[0], 'path').props.d, find(faces[1], 'path').props.d)
  assert.match(find(faces[0], 'path').props.d, /Q/)
  assert.equal(find(faces[0], 'g').props.transform, undefined)
  assert.equal(find(faces[1], 'g').props.transform, 'translate(0 130) scale(1 -1)')
  const gradients = faces.map(face => find(face, 'linearGradient').props.id)
  assert.notEqual(gradients[0], gradients[1])
  faces.forEach((face, index) => assert.equal(find(face, 'path').props.fill, `url(#${gradients[index]})`))
  const css = readFileSync(new URL('../src/features/memories/styles/mypage.css', import.meta.url), 'utf8')
  assert.match(css, /\.greeting-envelope-flap-inside\s*\{\s*transform:\s*rotateX\(180deg\)/)
})

test('뚜껑이 열리기 전부터 안감과 실제 편지지가 있고 같은 편지지를 위로 꺼낸다', () => {
  const f = envelopeFixture()
  const greeting = { id: '2', photoUrl: '/photo.jpg', greeting: '안부', senderName: '보낸 사람' }
  const props = { greeting, questType: 'GENERAL' }
  let tree = f.render(props)
  const lining = find(tree, 'div', props => props.className === 'greeting-envelope-lining')
  assert.ok(lining)
  assert.equal(lining.props['aria-hidden'], 'true')
  assert.equal(find(tree, 'div', props => props.className === 'greeting-envelope-back'), undefined)
  const reader = find(tree, 'div', props => props.className === 'greeting-reader')
  assert.equal(reader.props.initial['--greeting-paper-offset'], 1)
  assert.equal(reader.props.animate['--greeting-paper-offset'], 0)
  assert.equal(all(tree, 'GreetingLetter').length, 1)
  assert.equal(find(tree, 'GreetingLetter').props.greeting, greeting)
  find(tree, 'div', props => props.className === 'greeting-envelope-flap').props.style.rotateX.set(-180)
  tree = f.render(props)
  assert.ok(find(tree, 'div', props => props.className === 'greeting-envelope-lining'))
  assert.equal(all(tree, 'GreetingLetter').length, 1)
  assert.equal(find(tree, 'GreetingLetter').props.greeting, greeting)
  const empty = envelopeFixture().render({ loading: true })
  assert.equal(find(empty, 'div', props => props.className === 'greeting-envelope-lining'), undefined)
})

test('봉투가 열리는 동안 내용을 숨기고 입력을 막으며 완료 후 스크롤과 버튼을 푼다', () => {
  const f = envelopeFixture()
  let likes = 0, next = 0
  const props = { greeting: { id: '2' }, canLike: true, liking: false, hasNext: true, onLike: () => likes++, onNext: () => next++ }
  let tree = f.render(props)
  assert.equal(tree.props['aria-busy'], true)
  const reader = find(tree, 'div', props => props.className === 'greeting-reader')
  assert.equal(reader.props.inert, true)
  assert.equal(reader.props['aria-hidden'], true)
  assert.equal(likeButton(tree).props.disabled, true)
  assert.equal(nextButton(tree).props.disabled, true)
  likeButton(tree).props.onClick()
  nextButton(tree).props.onClick()
  assert.equal(likes + next, 0)

  const flap = find(tree, 'div', props => props.className === 'greeting-envelope-flap')
  assert.equal(flap.props.initial['--flap-open-progress'], 0)
  assert.equal(flap.props.animate['--flap-open-progress'], 1)
  flap.props.style.rotateX.set(-180)
  tree = f.render(props)
  assert.equal(find(tree, 'div', props => props.className === 'greeting-envelope-flap').props.style.zIndex.get(), 1)
  assert.equal(find(tree, 'div', props => props.className === 'greeting-envelope-back'), undefined)
  assert.equal(nextButton(tree).props.disabled, true)

  find(tree, 'footer').props.onAnimationComplete()
  tree = f.render(props)
  assert.ok(find(tree, 'div', props => props.className === 'greeting-envelope-flap'))
  assert.equal(tree.props['aria-busy'], false)
  assert.equal(find(tree, 'div', props => props.className === 'greeting-reader').props.inert, false)
  assert.equal(likeButton(tree).props.disabled, false)
  assert.equal(nextButton(tree).props.disabled, false)
  likeButton(tree).props.onClick()
  nextButton(tree).props.onClick()
  assert.equal(likes, 1)
  assert.equal(next, 1)
})

test('동작 줄이기와 안부 없음에서는 열림을 기다리지 않고 화면을 사용할 수 있다', () => {
  const props = { greeting: { id: '2' }, canLike: true, hasNext: true }
  const f = envelopeFixture(true)
  let tree = f.render(props)
  assert.equal(tree.props['aria-busy'], false)
  assert.equal(nextButton(tree).props.disabled, false)
  assert.equal(find(tree, 'div', props => props.className === 'greeting-reader').props.initial, false)
  const flap = find(tree, 'div', props => props.className === 'greeting-envelope-flap')
  assert.equal(flap.props.initial, false)
  assert.equal(flap.props.style.rotateX.get(), -180)
  assert.equal(flap.props.style.zIndex.get(), 1)
  tree = envelopeFixture().render({ loading: true, hasNext: false })
  assert.equal(tree.props['aria-busy'], false)
  assert.equal(find(tree, 'GreetingLetter').props.loading, true)
  assert.equal(find(tree, 'div', props => props.className === 'greeting-reader').props.inert, false)
  assert.equal(nextButton(tree).props.disabled, true)
})

test('봉투 재생 기준은 퀘스트와 안부 ID이며 좋아요와 같은 안부 재조회로 바뀌지 않는다', () => {
  const f = fixture('/me/memories', 'quest=22&message=0')
  let tree = f.render()
  const key = f.envelopeKey
  likeButton(tree).props.onClick()
  f.finishLike()
  tree = f.render()
  assert.equal(f.envelopeKey, key)
  f.client.setQueryData(['quest-greetings', '22', 'token'], current => ({ ...current, submissions: [...current.submissions] }))
  tree = f.render()
  assert.equal(f.envelopeKey, key)
  nextButton(tree).props.onClick()
  f.render()
  assert.notEqual(f.envelopeKey, key)
})

test('카드는 받은 안부 목록을 열고 선택한 편지에서 돌아오면 같은 목록과 스크롤을 복원한다', () => {
  const f = fixture()
  let tree = f.render()
  assert.equal(find(tree, 'MyPageSummary').props.active, 'memories')
  f.tabs.scrollPositions.current.memories = 260
  find(tree, 'MemoryQuestCard').props.onOpen(memory)
  tree = f.render()
  let drawer = find(tree, 'ReceivedGreetingsDrawer').props
  assert.equal(drawer.open, true)
  assert.equal(drawer.questId, memory.id)
  assert.deepEqual(Array.from(drawer.greetings, item => item.id), ['2', '1'])
  assert.equal(find(tree, 'MemoryQuestCard').props.expanded, true)
  assert.equal(f.params.has('message'), false)
  assert.equal(find(tree, 'GreetingLetter'), undefined)
  drawer.saveScroll(180)
  f.visit(drawer.greetingPath(1))
  tree = f.render()
  assert.equal(f.params.get('quest'), '22')
  assert.equal(find(tree, 'GreetingLetter').props.greeting.id, '1')
  const back = find(tree, 'Back').props.to
  assert.equal(back, '/me?quest=22&panel=received')
  f.visit(back)
  tree = f.render()
  assert.equal(find(tree, 'GreetingLetter'), undefined)
  drawer = find(tree, 'ReceivedGreetingsDrawer').props
  assert.equal(drawer.open, true)
  const list = { scrollTop: 0 }
  drawer.restoreScroll(list)
  assert.equal(list.scrollTop, 180)
  assert.equal(f.tabs.scrollPositions.current.memories, 260)
  drawer.onClose()
  assert.equal(find(f.render(), 'ReceivedGreetingsDrawer').props.open, false)
  assert.equal(f.params.has('message'), false)
})

test('다른 카드로 바꾸면 이전 응답을 섞지 않고 목록 안에서 조회 중·없음·실패·재시도를 구분한다', () => {
  const f = fixture()
  f.memories.push({ ...memory, id: '23' })
  f.client.setQueryData(['quest-greetings', '23', 'token'], { viewerRole: 'AUTHOR', submissions: [] })
  f.pendingQueries = true
  let tree = f.render()
  const card = (tree, id) => all(tree, 'MemoryQuestCard').find(node => node.props.memory.id === id)
  card(tree, '22').props.onOpen(memory)
  tree = f.render()
  assert.equal(find(tree, 'ReceivedGreetingsDrawer').props.loading, true)
  card(tree, '23').props.onOpen(f.memories[1])
  f.pendingQueries = false
  tree = f.render()
  assert.equal(card(tree, '22').props.expanded, false)
  assert.equal(card(tree, '23').props.expanded, true)
  f.client.setQueryData(['quest-greetings', '22', 'token'], { viewerRole: 'AUTHOR', submissions: [submission(9, '2026-11-05')] })
  const empty = find(f.render(), 'ReceivedGreetingsDrawer').props
  assert.equal(empty.questId, '23')
  assert.equal(empty.greetings.length, 0)
  assert.equal(empty.failed, false)
  assert.equal(f.params.has('message'), false)
  f.greetingError = true
  tree = f.render()
  assert.equal(find(tree, 'ReceivedGreetingsDrawer').props.failed, true)
  find(tree, 'ReceivedGreetingsDrawer').props.onRetry()
  assert.equal(f.retried, true)
  find(tree, 'ReceivedGreetingsDrawer').props.onClose()
  assert.equal(find(f.render(), 'ReceivedGreetingsDrawer').props.open, false)
})

test('소유하지 않은 그리움의 목록은 조회하지 않고 작성자 응답이 아닌 안부는 표시하지 않는다', () => {
  const f = fixture('/me/memories', 'quest=999&panel=received')
  let drawer = find(f.render(), 'ReceivedGreetingsDrawer').props
  assert.equal(drawer.open, true)
  assert.equal(drawer.failed, true)
  assert.ok(f.queries.filter(item => item.queryKey[0] === 'quest-greetings').every(item => item.enabled === false))
  f.questError = true
  assert.equal(find(f.render(), 'ReceivedGreetingsDrawer').props.errorMessage, '내 그리움을 불러오지 못했어요.')
  f.questError = false
  f.visit('/me/memories?quest=22&panel=received')
  f.client.setQueryData(['quest-greetings', '22', 'token'], { viewerRole: 'PERFORMER', submissions: [submission(2, '2026-11-02')] })
  drawer = find(f.render(), 'ReceivedGreetingsDrawer').props
  assert.equal(drawer.failed, true)
  assert.equal(drawer.greetings.length, 0)
})

test('받은 안부 Drawer는 사진·작성자·날짜·미리보기를 표시하고 빈 목록·오류·닫기를 처리한다', () => {
  let closed = 0, retried = 0, scroll = 0
  const owner = {}
  const Drawer = load('features/memories/components/ReceivedGreetingsDrawer.tsx', {
    react: { useRef: () => ({ current: null }) },
    'react-router': router,
    'lucide-react': { ChevronRight: 'ChevronRight', Mail: 'Mail', X: 'X' },
    '@/shared/components/RemotePhoto': photo,
    '@/shared/components/ui/drawer': Object.fromEntries(['Drawer', 'DrawerClose', 'DrawerContent', 'DrawerDescription', 'DrawerHeader', 'DrawerTitle'].map(name => [name, name])),
  }, { document: { getElementById: id => id === 'memory-card-22' ? owner : null } })
  const props = {
    open: true, questId: '22', title: memory.title, loading: false, failed: false,
    errorMessage: '안부를 불러오지 못했어요.',
    greetings: [
      { id: '1', submissionId: 1, senderName: '민수', createdAt: '2026-11-10', greeting: '잘 있어요', photoUrl: '/photo.jpg' },
      { id: '2', submissionId: 2, senderName: '지연', createdAt: '2026-11-09', greeting: '그대로예요', photoUrl: null },
    ],
    onClose: () => closed++, onRetry: () => retried++,
    greetingPath: id => `/me?quest=22&panel=received&submission=${id}&message=0`,
    restoreScroll() {}, saveScroll: top => { scroll = top },
  }
  let tree = Drawer(props)
  assert.match(text(tree), /도착한 안부 2통/)
  assert.equal(all(tree, 'Link').length, 2)
  assert.equal(find(tree, 'Link').props.to, '/me?quest=22&panel=received&submission=1&message=0')
  assert.equal(all(tree, 'RemotePhoto').length, 1)
  assert.equal(all(tree, 'Mail').length, 1)
  assert.match(text(tree), /민수 님2026.11.10잘 있어요/)
  find(tree, 'div', props => props['aria-label'] === '받은 안부 목록').props.onScroll({ currentTarget: { scrollTop: 140 } })
  assert.equal(scroll, 140)
  assert.equal(find(tree, 'DrawerContent').props.finalFocus(), owner)
  find(tree, 'Drawer').props.onOpenChange(false)
  assert.equal(closed, 1)
  tree = Drawer({ ...props, greetings: [] })
  assert.match(text(tree), /아직 도착한 안부가 없어요/)
  assert.equal(all(tree, 'Link').length, 0)
  tree = Drawer({ ...props, loading: true })
  assert.equal(all(tree, 'Link').length, 0)
  assert.doesNotMatch(text(tree), /도착한 안부 2통/)
  tree = Drawer({ ...props, failed: true })
  assert.equal(all(tree, 'Link').length, 0)
  find(find(tree, 'div', props => props.role === 'alert'), 'button').props.onClick()
  assert.equal(retried, 1)
})

test('안부는 최신순으로 한 번씩 이동한 뒤 목록으로 복귀하며 기록과 복귀 경로를 보존한다', () => {
  const f = fixture('/me/memories', 'source=records&record=101&quest=22&submission=2&message=0&returnOthers=1')
  let tree = f.render()
  assert.equal(find(tree, 'GreetingLetter').props.greeting.id, '2')
  const bottom = find(tree, 'div', props => props.className === 'greeting-envelope-bottom')
  const backdrop = find(bottom, 'div', props => props.className === 'greeting-envelope-front')
  const back = find(bottom, 'div', props => props.className === 'greeting-envelope-flap')
  assert.ok(back)
  assert.equal(back.props['aria-hidden'], 'true')
  assert.ok(backdrop)
  assert.equal(backdrop.props['aria-hidden'], 'true')
  assert.ok(find(bottom, 'footer', props => props.className === 'greeting-footer'))
  assert.equal(likeButton(bottom), undefined)
  assert.equal(find(tree, 'Link', props => props['aria-label'] === '로그아웃'), undefined)
  assert.equal(find(tree, 'Back').props.to, '/me/history?record=101&panel=others')
  assert.equal(find(tree, 'section', props => props['aria-label'] === '수행 글 목록'), undefined)
  assert.equal(all(tree, 'ol').length, 0)
  assert.equal(nextButton(tree).props.disabled, false)
  nextButton(tree).props.onClick()
  tree = f.render()
  assert.equal(find(tree, 'GreetingLetter').props.greeting.id, '1')
  assert.equal(f.params.get('submission'), '1')
  assert.equal(f.params.get('record'), '101')
  assert.equal(f.params.get('quest'), '22')
  assert.equal(f.params.get('source'), 'records')
  assert.equal(f.scrolls.length, 2)
  assert.equal(text(nextButton(tree)), '목록으로 돌아가기')
  nextButton(tree).props.onClick()
  assert.equal(f.navigations[0][0], '/me/history?record=101&panel=others')
  assert.equal(f.navigations[0][1].replace, true)
})

test('받은 안부 3통은 1→2→3까지만 이동하고 원래 받은 안부 목록으로 돌아간다', () => {
  const f = fixture('/me/memories', 'quest=22&panel=received&submission=3&message=0')
  f.client.setQueryData(['quest-greetings', '22', 'token'], { viewerRole: 'AUTHOR', submissions: [
    submission(1, '2026-11-01'), submission(2, '2026-11-02'), submission(3, '2026-11-03'),
  ] })
  for (const [index, id] of ['3', '2', '1'].entries()) {
    const tree = f.render()
    assert.equal(find(tree, 'GreetingLetter').props.greeting.id, id)
    assert.match(text(tree), new RegExp(`도착한 안부 ${index + 1}/3`))
    assert.equal(text(nextButton(tree)), index === 2 ? '목록으로 돌아가기' : '다음 안부 보기')
    nextButton(tree).props.onClick()
  }
  assert.equal(f.navigations.length, 1)
  assert.equal(f.navigations[0][0], '/me/memories?quest=22&panel=received')
})

test('안부 0·1개에서는 목록으로 복귀하고 조회 중·실패 시 이동을 잠그며 재시도를 제공한다', () => {
  const f = fixture('/me/memories', 'quest=22&message=0')
  for (const submissions of [[], [submission(1, '2026-11-01')]]) {
    f.client.setQueryData(['quest-greetings', '22', 'token'], { viewerRole: 'AUTHOR', submissions })
    const tree = f.render()
    assert.equal(nextButton(tree).props.disabled, false)
    assert.equal(text(nextButton(tree)), '목록으로 돌아가기')
    nextButton(tree).props.onClick()
    assert.equal(f.navigations.at(-1)[0], '/me/memories')
    assert.equal(Boolean(find(tree, 'div', props => props.className === 'greeting-envelope-flap')), submissions.length > 0)
  }
  f.client.setQueryData(['quest-greetings', '22', 'token'], { submissions: [] })
  f.greetingError = true
  let tree = f.render()
  assert.equal(nextButton(tree).props.disabled, true)
  const letter = find(tree, 'GreetingLetter').props
  assert.equal(letter.failed, true)
  assert.match(letter.statusMessage, /불러오지 못했어요/)
  letter.onRetry()
  assert.equal(f.retried, true)
  f.greetingError = false
  f.pendingQueries = true
  tree = f.render()
  assert.equal(nextButton(tree).props.disabled, true)
})

test('좋아요는 작성자에게만 허용하고 중복 요청을 막으며 해당 안부의 캐시만 갱신한다', () => {
  const f = fixture('/me/memories', 'quest=22&message=0')
  let button = likeButton(f.render())
  assert.ok(button)
  button.props.onClick()
  button = likeButton(f.render())
  assert.equal(button.props.disabled, true)
  button.props.onClick()
  assert.equal(f.likes.length, 1)
  assert.equal(f.likes[0].submissionId, 2)
  f.finishLike()
  assert.equal(likeButton(f.render()).props['aria-pressed'], true)
  assert.equal(f.client.getQueryData(['quest-greetings', '22', 'token']).submissions[0].isLiked, false)
  f.client.setQueryData(['quest-greetings', '22', 'token'], current => ({ ...current, viewerRole: 'PERFORMER' }))
  assert.equal(likeButton(f.render()), undefined)
  assert.equal(f.likes.length, 1)
})

test('카드 클릭은 지도만 선택하고 재클릭·마커 클릭도 같은 선택 상태를 공유한다', () => {
  const f = fixture('/me/history')
  f.records.push({ ...record, id: '102', questId: '23', title: '다른 장소', createdAt: '2026-11-09', location: { lat: 36, lng: 129, placeName: '다른 장소' } })
  let tree = f.render()
  assert.equal(all(tree, 'button').find(node => node.props['data-history-key']).props['data-history-key'], '102')
  const card = tree => find(tree, 'button', props => props['data-history-key'] === '101')
  card(tree).props.onClick()
  tree = f.render()
  assert.equal(f.pathname, '/me/history')
  assert.equal(f.params.has('message'), false)
  assert.equal(card(tree).props['aria-pressed'], true)
  assert.equal(find(tree, 'HistoryMap').props.selectedRecordId, '101')
  const request = find(tree, 'HistoryMap').props.focusRequest
  card(tree).props.onClick()
  tree = f.render()
  assert.equal(find(tree, 'HistoryMap').props.focusRequest, request + 1)
  find(tree, 'HistoryMap').props.onSelectRecord('102')
  tree = f.render()
  assert.equal(card(tree).props['aria-pressed'], false)
  assert.equal(find(tree, 'HistoryMap').props.selectedRecordId, '102')
  assert.equal(find(tree, 'a'), undefined)
  assert.match(find(tree, 'Link', props => props.to.includes('submission=')).props.to, /submission=102/)
  f.records = [record]
  tree = f.render()
  assert.equal(find(tree, 'HistoryMap').props.selectedRecordId, null)
  assert.equal(find(tree, 'a'), undefined)
})

test('좌표나 사진이 없어도 기록 선택과 안부 조회는 가능하며 외부 지도 링크는 만들지 않는다', () => {
  const f = fixture('/me/history')
  f.records = [{ ...record, location: { lat: NaN, lng: 128 }, photoUrl: null }]
  let tree = f.render()
  find(tree, 'button', props => props['data-history-key'] === '101').props.onClick()
  tree = f.render()
  assert.equal(find(tree, 'RemotePhoto').props.photoUrl, null)
  assert.ok(find(tree, 'Link', props => props.to.includes('record=101')))
  assert.equal(find(tree, 'a'), undefined)
  assert.ok(find(tree, 'button', props => text({ props }) === '다른 사람 안부'))
})

test('내 기록에는 내 카드만 남고 다른 사람 버튼은 선택한 퀘스트 하나의 Drawer를 연다', () => {
  const f = fixture('/me/history')
  f.records.push({ ...record, id: '102', questId: '23' })
  f.client.setQueryData(['quest-greetings', '22', 'token'], { submissions: [
    submission(101, '2026-11-03', { performer: { userId: 7, nickname: '나' } }),
    submission(1, '2026-11-01'), submission(2, '2026-11-02'),
  ] })
  let tree = f.render()
  assert.equal(all(tree, 'button').filter(node => node.props['data-history-key']).length, 2)
  assert.equal(find(tree, 'button', props => text({ props }) === '다른 수행자 기록 보기'), undefined)
  assert.equal(f.queries.filter(query => query.queryKey[0] === 'quest-greetings' && query.enabled).length, 0)
  find(tree, 'button', props => props['data-history-key'] === '101').props.onClick()
  tree = f.render()
  const ownLink = find(tree, 'Link', props => text({ props }) === '내가 남긴 안부 보기')
  const ownParams = new URL(ownLink.props.to, 'https://example.com').searchParams
  assert.equal(ownParams.get('record'), '101')
  assert.equal(ownParams.get('submission'), '101')
  assert.equal(ownParams.get('view'), 'mine')
  assert.equal(find(tree, 'a'), undefined)
  find(tree, 'button', props => text({ props }) === '다른 사람 안부').props.onClick()
  tree = f.render()
  const drawer = find(tree, 'PeerGreetingsDrawer').props
  assert.deepEqual(Array.from(drawer.greetings, item => item.id), ['2', '1'])
  assert.equal(drawer.record.questId, '22')
  assert.equal(find(tree, 'div', props => props.className === 'mypage-history-panel'), undefined)
  assert.equal(find(tree, 'HistoryMap').props.selectedRecordId, '101')
  drawer.onExpandedChange(true)
  tree = f.render()
  assert.equal(find(tree, 'PeerGreetingsDrawer').props.expanded, true)
  const peerUrl = new URL(find(tree, 'PeerGreetingsDrawer').props.greetingPath(2), 'https://example.com')
  assert.equal(peerUrl.searchParams.get('quest'), '22')
  assert.equal(peerUrl.searchParams.get('view'), 'others')
  assert.equal(peerUrl.searchParams.get('submission'), '2')
  assert.equal(peerUrl.searchParams.get('expanded'), '1')
  drawer.saveScroll(150)
  const scroll = { scrollTop: 0 }
  find(tree, 'PeerGreetingsDrawer').props.restoreScroll(scroll)
  assert.equal(scroll.scrollTop, 150)
  drawer.onClose()
  tree = f.render()
  assert.equal(find(tree, 'PeerGreetingsDrawer'), undefined)
  assert.equal(find(tree, 'HistoryMap').props.selectedRecordId, '101')
})

test('내 편지는 선택한 내 글 한 건만 열고 다음 대신 내 기록으로 돌아간다', () => {
  const f = fixture('/me/memories', 'source=records&view=mine&record=101&quest=22&submission=101&message=0')
  f.client.setQueryData(['quest-greetings', '22', 'token'], { viewerRole: 'COMPLETED', submissions: [
    submission(1, '2026-11-01'), submission(101, '2026-11-02', { performer: { userId: 7, nickname: '나' } }),
    submission(102, '2026-11-03', { performer: { userId: 7, nickname: '나' } }),
  ] })
  const tree = f.render()
  assert.equal(find(tree, 'GreetingLetter').props.greeting.id, '101')
  assert.equal(text(nextButton(tree)), '내 기록으로 돌아가기')
  assert.match(text(tree), /내가 남긴 안부/)
  assert.doesNotMatch(text(tree), /1\/3/)
  nextButton(tree).props.onClick()
  assert.equal(f.navigations[0][0], '/me/history?record=101')
  assert.equal(f.navigations[0][1].replace, true)
})

test('누락되거나 다른 작성자의 안부 ID를 대신 열지 않으며 퀘스트·기록 불일치를 차단한다', () => {
  for (const query of [
    'source=records&view=mine&record=101&quest=22&submission=1&message=0',
    'source=records&view=others&record=101&quest=22&submission=999&message=0',
    'source=records&view=others&record=101&quest=23&submission=1&message=0',
  ]) {
    const f = fixture('/me/memories', query)
    const tree = f.render()
    const letter = find(tree, 'GreetingLetter').props
    assert.equal(letter.greeting, undefined)
    assert.equal(letter.failed, true)
    assert.equal(letter.loading, false)
    assert.match(letter.statusMessage, /찾을 수 없어요/)
  }
})

test('다른 사람 편지는 내 글을 제외하고 마지막 안부에서 펼친 Drawer로 복귀한다', () => {
  const f = fixture('/me/memories', 'source=records&view=others&record=101&quest=22&submission=2&message=0&expanded=1')
  f.client.setQueryData(['quest-greetings', '22', 'token'], { viewerRole: 'COMPLETED', submissions: [
    submission(101, '2026-11-10', { performer: { userId: 7, nickname: '나' } }),
    submission(1, '2026-11-01'), submission(2, '2026-11-02'),
  ] })
  let tree = f.render()
  assert.equal(find(tree, 'GreetingLetter').props.greeting.id, '2')
  assert.match(text(tree), /다른 사람이 남긴 안부 1\/2/)
  assert.equal(text(nextButton(tree)), '다음 사람의 안부 보기')
  assert.equal(find(tree, 'Back').props.to, '/me/history?record=101&panel=others&expanded=1')
  nextButton(tree).props.onClick()
  tree = f.render()
  assert.equal(find(tree, 'GreetingLetter').props.greeting.id, '1')
  assert.equal(text(nextButton(tree)), '목록으로 돌아가기')
  nextButton(tree).props.onClick()
  assert.equal(f.navigations[0][0], '/me/history?record=101&panel=others&expanded=1')
  f.client.setQueryData(['quest-greetings', '22', 'token'], { submissions: [submission(1, '2026-11-01')] })
  tree = f.render()
  assert.equal(text(nextButton(tree)), '목록으로 돌아가기')
  nextButton(tree).props.onClick()
  assert.equal(f.navigations.at(-1)[0], '/me/history?record=101&panel=others&expanded=1')
})

test('다른 사람 목록 조회 실패·없음은 Drawer 안에서 처리하며 다른 장소로 바꾸면 이전 응답을 쓰지 않는다', () => {
  const f = fixture('/me/history', 'record=101&panel=others')
  f.greetingError = true
  let tree = f.render()
  find(tree, 'PeerGreetingsDrawer').props.onRetry()
  assert.equal(f.retried, true)
  assert.equal(find(tree, 'PeerGreetingsDrawer').props.failed, true)
  f.greetingError = false
  f.client.setQueryData(['quest-greetings', '22', 'token'], { submissions: [] })
  tree = f.render()
  assert.equal(find(tree, 'PeerGreetingsDrawer').props.greetings.length, 0)
  f.records.push({ ...record, id: '102', questId: '23' })
  tree = f.render()
  find(tree, 'HistoryMap').props.onSelectRecord('102')
  tree = f.render()
  assert.equal(find(tree, 'PeerGreetingsDrawer'), undefined)
  assert.equal(find(tree, 'HistoryMap').props.selectedRecordId, '102')
  find(tree, 'button', props => text({ props }) === '다른 사람 안부').props.onClick()
  tree = f.render()
  assert.equal(find(tree, 'PeerGreetingsDrawer').props.record.questId, '23')
  assert.equal(find(tree, 'PeerGreetingsDrawer').props.greetings.length, 0)
})

test('편지지에는 사진·본문·작성자를 함께 표시하고 사진 없음·조회 실패를 처리한다', () => {
  const Letter = load('features/memories/components/GreetingLetter.tsx', { '@/shared/components/RemotePhoto': photo })
  const props = { greeting: { greeting: '긴 안부\n둘째 줄', photoUrl: '/greeting.jpg', senderName: '보낸 사람', createdAt: '2026-11-01' } }
  let tree = Letter(props)
  assert.equal(find(tree, 'div', props => props.className === 'greeting-envelope'), undefined)
  assert.equal(find(tree, 'RemotePhoto').props.photoUrl, '/greeting.jpg')
  assert.match(text(tree), /From. 보낸 사람/)
  assert.match(text(find(tree, 'time')), /2026-11-01/)
  assert.equal(find(tree, 'button'), undefined)
  tree = Letter({ ...props, greeting: { ...props.greeting, photoUrl: null } })
  assert.equal(find(tree, 'RemotePhoto'), undefined)
  assert.equal(find(tree, 'button'), undefined)
  assert.match(text(tree), /긴 안부\n둘째 줄/)
  assert.equal(find(tree, 'p', props => props.className === 'greeting-text').props['data-long'], false)
  let retried = false
  tree = Letter({ failed: true, statusMessage: '안부 조회 실패', onRetry: () => { retried = true } })
  assert.equal(tree.props.role, 'alert')
  find(tree, 'button').props.onClick()
  assert.equal(retried, true)
})

test('500자 안부는 생략 없이 사진·본문·From을 같은 키보드 스크롤 영역에 표시한다', () => {
  const Letter = load('features/memories/components/GreetingLetter.tsx', { '@/shared/components/RemotePhoto': photo })
  const message = '오랜만에 찾은 학교의 모습이 반가웠어요.\n함께 걷던 길도 그대로 남아 있었어요. '.repeat(12).slice(0, 500)
  assert.equal(message.length, 500)
  const greeting = { greeting: message, photoUrl: '/school.jpg', senderName: '보낸 사람', createdAt: '2026-11-08' }
  for (const photoUrl of [greeting.photoUrl, null]) {
    const tree = Letter({ greeting: { ...greeting, photoUrl } })
    const region = find(tree, 'div', props => props.className === 'greeting-letter-content')
    assert.equal(region.props.role, 'region')
    assert.equal(region.props['aria-label'], '안부 편지 내용')
    assert.equal(region.props.tabIndex, 0)
    assert.equal(Boolean(find(region, 'RemotePhoto')), Boolean(photoUrl))
    const body = find(region, 'p', props => props.className === 'greeting-text')
    assert.equal(body.props['data-long'], true)
    assert.equal(text(body), message)
    assert.match(text(region), /From\. 보낸 사람 \| 2026-11-08$/)
    assert.equal(region.props.children.at(-1).props.className, 'greeting-sender')
  }
})

test('숫자 카드는 선택 상태·실제 개수·미조회 표시를 구분하고 새 안부를 추정하지 않는다', () => {
  const Summary = load('features/memories/components/MyPageSummary.tsx', { 'react-router': router, '@/shared/components/WireUI': wire })
  const tree = Summary({ active: 'history', memoryCount: null, recordCount: 5, hasGreetings: true })
  assert.equal(find(tree, 'Link', props => props.to === '/me/history').props['aria-current'], 'page')
  assert.equal(text(find(tree, 'strong')), '–')
  assert.match(text(tree), /5내 기록/)
  assert.match(text(tree), /도착한 안부/)
  assert.doesNotMatch(text(tree), /새 안부/)
})

test('편지 테마는 선택한 퀘스트 유형을 따르며 기록 ID가 아닌 퀘스트 ID로 상세를 조회한다', async () => {
  const f = fixture('/me/memories', 'quest=22&message=0')
  const sceneType = tree => find(tree, 'div', props => props.className === 'greeting-scene').props['data-quest-type']
  assert.equal(sceneType(f.render()), 'GENERAL')
  assert.equal(f.queries.find(query => query.queryKey[0] === 'verification-quest').enabled, false)
  f.memories = [{ ...memory, questType: 'IMAGE' }]
  assert.equal(sceneType(f.render()), 'IMAGE')

  const recordPage = fixture('/me/memories', 'source=records&record=101&quest=22&message=0')
  assert.equal(sceneType(recordPage.render()), 'IMAGE')
  const detailQuery = recordPage.queries.find(query => query.queryKey[0] === 'verification-quest')
  assert.equal(detailQuery.enabled, true)
  const signal = new AbortController().signal
  await detailQuery.queryFn({ signal })
  assert.equal(recordPage.requestedDetail[0], '22')
  assert.equal(recordPage.requestedDetail[1], signal)
  recordPage.detailQuestType = undefined
  assert.equal(sceneType(recordPage.render()), undefined)
})

test('내 그리움 API는 일반·이미지 유형을 버리지 않고 화면에 전달한다', async () => {
  const api = load('features/memories/api/myPage.ts', {
    zod: { z }, '@/shared/api/client': { apiClient: { get: async () => ({ data: [
      { questId: 1, questTitle: '일반', questType: 'GENERAL', passedCount: 1 },
      { questId: 2, questTitle: '이미지', questType: 'IMAGE', passedCount: 2 },
    ] }) } },
  })
  const items = await api.getMyQuests('token', new AbortController().signal)
  assert.deepEqual(Array.from(items, item => item.questType), ['GENERAL', 'IMAGE'])
})

test('그리움 카드는 자신의 퀘스트 ID로 상세 사진을 조회하고 선택한 항목을 전달한다', async () => {
  let options, requested, opened
  const Card = load('features/memories/components/MemoryQuestCard.tsx', {
    'motion/react': { AnimatePresence: 'AnimatePresence', motion: { div: 'div' }, useReducedMotion: () => true },
    '@tanstack/react-query': { useQuery: value => { options = value; return { data: { photoUrl: '/quest-detail.jpg' } } } },
    '@/shared/components/RemotePhoto': photo,
    '@/features/quests/api/verification': { getVerificationQuest: (...args) => { requested = args } },
  })
  const tree = Card({ memory, token: 'token', onOpen: value => { opened = value } })
  const signal = new AbortController().signal
  await options.queryFn({ signal })
  assert.equal(requested[0], '22')
  assert.equal(requested[1], signal)
  assert.equal(find(tree, 'RemotePhoto').props.photoUrl, '/quest-detail.jpg')
  find(tree, 'button').props.onClick()
  assert.equal(opened, memory)
})

test('그리움 카드는 받은 안부 모달을 가리키고 카드 안에 버튼을 중첩하지 않는다', () => {
  const Card = load('features/memories/components/MemoryQuestCard.tsx', {
    'motion/react': { AnimatePresence: 'AnimatePresence', motion: { div: 'div' }, useReducedMotion: () => true },
    '@tanstack/react-query': { useQuery: () => ({ data: {} }) },
    '@/shared/components/RemotePhoto': photo,
    '@/features/quests/api/verification': { getVerificationQuest() {} },
  })
  const props = { memory, token: 'token', onOpen() {} }
  const tree = Card({ ...props, expanded: true })
  const button = find(tree, 'button')
  assert.equal(button.props['aria-expanded'], true)
  assert.equal(button.props['aria-haspopup'], 'dialog')
  assert.equal(button.props['aria-controls'], 'received-greetings-drawer')
  assert.equal(button.props.id, 'memory-card-22')
  assert.equal(find(tree, 'div', props => props.role === 'status'), undefined)
  assert.equal(all(find(tree, 'button'), 'button').length, 1)
})

function homeLinkFixture({ native = false, reduced = false, pathname = '/me/history' } = {}) {
  let cleanup, finish, reject
  const state = { navigations: [], animations: 0, pathname }
  const element = { inert: false, animate() {
    state.animations++
    return { finished: new Promise((resolve, fail) => { finish = resolve; reject = fail }), cancel() { reject(new Error('cancelled')) } }
  } }
  const Link = load('shared/components/MyPageHomeLink.tsx', {
    react: { useRef: () => ({ current: null }), useLayoutEffect: fn => { cleanup = fn() } },
    'react-router': { Link: 'Link', useLocation: () => ({ pathname: state.pathname }), useNavigate: () => path => state.navigations.push(path) },
    'motion/react': { useReducedMotion: () => reduced },
  }, { document: { startViewTransition: native ? () => {} : undefined, querySelector: () => element } })
  const tree = Link({ children: '홈', className: 'home' })
  const event = { button: 0, preventDefault() { this.defaultPrevented = true } }
  return { state, element, tree, event, cleanup: () => cleanup(), finish: () => finish() }
}

test('홈 복귀는 native 전환을 사용하고 미지원 환경에서는 닫힘 완료 후 한 번만 이동한다', async () => {
  const native = homeLinkFixture({ native: true })
  await native.tree.props.onClick(native.event)
  assert.equal(native.tree.props.viewTransition, true)
  assert.equal(native.state.animations, 0)
  const fallback = homeLinkFixture()
  const closing = fallback.tree.props.onClick(fallback.event)
  assert.equal(fallback.event.defaultPrevented, true)
  assert.equal(fallback.element.inert, true)
  await fallback.tree.props.onClick({ ...fallback.event, defaultPrevented: false })
  assert.equal(fallback.state.animations, 1)
  assert.deepEqual(fallback.state.navigations, [])
  fallback.finish()
  await closing
  assert.deepEqual(fallback.state.navigations, ['/'])
  fallback.cleanup()
  assert.equal(fallback.element.inert, false)
})

test('취소된 닫힘은 홈으로 이동하지 않으며 동작 줄이기·새 탭 열기·다른 화면의 홈 링크는 그대로 동작한다', async () => {
  const cancelled = homeLinkFixture()
  const closing = cancelled.tree.props.onClick(cancelled.event)
  cancelled.cleanup()
  await closing
  assert.deepEqual(cancelled.state.navigations, [])
  for (const options of [{ reduced: true }, { pathname: '/' }, { pathname: '/quests/new' }]) {
    const f = homeLinkFixture(options)
    await f.tree.props.onClick(f.event)
    assert.equal(f.event.defaultPrevented, undefined)
    assert.equal(f.state.animations, 0)
  }
  const modified = homeLinkFixture()
  await modified.tree.props.onClick({ ...modified.event, ctrlKey: true })
  assert.equal(modified.state.animations, 0)
})

test('로그아웃 확인·안부에는 navbar가 없고 일반 마이페이지와 기록에는 유지된다', () => {
  let pathname, search
  const { RootLayout } = load('app/layouts/RootLayout.tsx', {
    react: { useState: () => [null, () => {}] },
    'react-router': { Outlet: 'Outlet', useLocation: () => ({ pathname }), useSearchParams: () => [new URLSearchParams(search)] },
    '@/shared/components/WireUI': wire,
  })
  for (const path of ['/me', '/me/memories', '/me/history', '/me/logout', '/me/memories?quest=22&message=0', '/me/memories?quest=22&panel=received', '/me?quest=22&panel=received']) {
    ;[pathname, search = ''] = path.split('?')
    const tree = RootLayout()
    assert.equal(Boolean(find(tree, 'Bottom')), !path.includes('logout') && !search.includes('message') && !search.includes('panel=received'))
    assert.equal(find(tree, 'div', props => props['data-memories'] === true).props['data-memories'], true)
  }
})

test('로그아웃은 목록 요청을 비활성화하고 기존 토큰 제거 후 로그인으로 이동한다', async () => {
  const f = fixture('/me/logout')
  const tree = f.render()
  assert.ok(f.queries.every(query => query.enabled === false))
  await find(tree, 'button').props.onClick()
  assert.deepEqual(f.removed, ['accessToken', 'refreshToken', 'accessToken'])
  assert.equal(f.navigations[0][0], '/login')
  assert.equal(f.navigations[0][1].replace, true)
})

test('공용 SwipeSheet는 기존 자체 상태와 Drawer의 제어 상태 모두 접기·펼치기를 지원한다', () => {
  let cursor = 0
  let reduced = true
  const states = [], refs = []
  const { SwipeSheet } = load('shared/components/SwipeSheet.tsx', {
    react: {
      useId: () => 'sheet',
      useState(initial) { const i = cursor++; if (!(i in states)) states[i] = initial; return [states[i], value => { states[i] = value }] },
      useRef(initial) { const i = cursor++; return refs[i] ??= { current: initial } },
    },
    'motion/react': { motion: { section: 'section' }, useReducedMotion: () => reduced },
  })
  const render = props => { cursor = 0; return SwipeSheet({ label: '안부', ...props }) }
  let tree = render({})
  assert.equal(tree.props.animate.height, '64%')
  assert.equal(tree.props.initial, false)
  assert.equal(tree.props.exit, undefined)
  find(tree, 'button').props.onClick()
  tree = render({})
  assert.equal(tree.props.animate.height, '94%')
  let expanded
  tree = render({ expanded: true, onExpandedChange: value => { expanded = value } })
  find(tree, 'button').props.onKeyDown({ key: 'ArrowDown', preventDefault() {} })
  assert.equal(expanded, false)
  tree = render({ expanded: false, onExpandedChange: value => { expanded = value } })
  assert.equal(tree.props.animate.height, '64%')
  find(tree, 'button').props.onClick()
  assert.equal(expanded, true)
  reduced = false
  tree = render({ expanded: false, slideFromBottom: true })
  assert.equal(tree.props.initial.y, '100%')
  assert.equal(tree.props.initial.height, '64%')
  assert.equal(tree.props.animate.y, 0)
  assert.equal(tree.props.exit.y, '100%')
  assert.equal(tree.props.transition.y.duration, 0.3)
  reduced = true
  tree = render({ expanded: false, slideFromBottom: true })
  assert.equal(tree.props.initial, false)
  assert.equal(tree.props.exit.y, 0)
  assert.equal(tree.props.transition.y.duration, 0)
})

test('안부 Drawer는 열림 완료 후 한 번만 포커스·지도 보정을 요청하고 퇴장 중에는 조작을 막는다', () => {
  function makeFixture(reducedMotion) {
    let cursor = 0, effectCursor = 0
    const states = [], effects = []
    const f = { present: true, focused: 0, entered: [] }
    const Drawer = load('features/history/components/PeerGreetingsDrawer.tsx', {
      react: {
        useState(initial) { const i = cursor++; if (!(i in states)) states[i] = initial; return [states[i], value => { states[i] = value }] },
        useRef: () => ({ current: { focus() { f.focused++ } } }),
        useEffect(run, deps) { const i = effectCursor++; if (!effects[i] || deps.some((value, j) => value !== effects[i][j])) { effects[i] = deps; run() } },
      },
      'motion/react': { useIsPresent: () => f.present, useReducedMotion: () => reducedMotion },
      'react-router': router, 'lucide-react': { X: 'X', ChevronRight: 'ChevronRight' },
      '@/shared/components/SwipeSheet': { SwipeSheet: 'SwipeSheet' }, '@/shared/components/RemotePhoto': photo,
    })
    const props = { record, greetings: [], loading: false, failed: false, expanded: false,
      onEntered: id => f.entered.push(id), onClose() {}, onRetry() {}, onExpandedChange() {}, greetingPath() {}, restoreScroll() {}, saveScroll() {} }
    return Object.assign(f, { render() { cursor = 0; effectCursor = 0; return Drawer(props) } })
  }
  const f = makeFixture(false)
  let tree = f.render()
  assert.equal(tree.props['data-phase'], 'opening')
  assert.equal(tree.props.inert, true)
  assert.equal(f.focused, 0)
  find(tree, 'SwipeSheet').props.onSlideComplete()
  tree = f.render()
  assert.equal(tree.props['data-phase'], 'open')
  assert.equal(tree.props.inert, false)
  assert.deepEqual(f.entered, ['101'])
  assert.equal(f.focused, 1)
  find(tree, 'SwipeSheet').props.onSlideComplete()
  assert.equal(f.focused, 1)
  assert.equal(f.entered.length, 1)
  f.present = false
  tree = f.render()
  assert.equal(tree.props['data-phase'], 'closing')
  assert.equal(tree.props.inert, true)
  assert.equal(tree.props['aria-hidden'], true)
  find(tree, 'SwipeSheet').props.onSlideComplete()
  assert.equal(f.entered.length, 1)
  const reduced = makeFixture(true)
  tree = reduced.render()
  assert.equal(tree.props['data-phase'], 'open')
  assert.equal(tree.props.inert, false)
  assert.deepEqual(reduced.entered, ['101'])
  assert.equal(reduced.focused, 1)
})
