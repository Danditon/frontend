import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import test from 'node:test'
import ts from 'typescript'
import { QueryClient } from '@tanstack/react-query'

function load(path, dependencies = {}, globals = {}) {
  const code = ts.transpileModule(readFileSync(new URL(`../src/${path}`, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  const module = { exports: {} }
  const element = (type, props) => ({ type, props })
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
const text = tree => typeof tree === 'string' || typeof tree === 'number' ? String(tree)
  : tree ? [tree.props?.children].flat(Infinity).map(text).join('') : ''
const wire = { Back: 'Back', Profile: 'Profile', Bottom: 'Bottom' }
const router = { Link: 'Link' }
const photo = { RemotePhoto: 'RemotePhoto' }
const memory = { id: '22', title: '그리운 카페', sub: '일반 퀘스트', photoUrl: null, passedCount: 2 }
const record = { id: '101', questId: '22', title: '카페의 안부', photoUrl: '/record.jpg', location: { lat: 35, lng: 128, placeName: '카페' } }
const submission = (id, createdAt, extra = {}) => ({ submissionId: id, createdAt, greeting: `안부 ${id}`, photoUrl: `/photo-${id}.jpg`,
  isLiked: false, verifyStatus: 'PASSED', performer: { userId: 8, nickname: '보낸 사람' }, ...extra })

function fixture(path = '/me', search = '') {
  const client = new QueryClient()
  client.setQueryData(['quest-greetings', '22', 'token'], { viewerRole: 'AUTHOR', submissions: [
    submission(1, '2026-11-01'), submission(2, '2026-11-02'), submission(3, '2026-11-03', { verifyStatus: 'FAILED' }),
  ] })
  let params = new URLSearchParams(search), cursor = 0, refCursor = 0, effectCursor = 0, mutationOptions
  const states = [], refs = [], effects = []
  const f = { pathname: path, client, memories: [memory], records: [record], likes: [], navigations: [], removed: [], scrolls: [], queries: [], questError: false, greetingError: false, pendingQueries: false }
  const mutation = { isPending: false, isError: false, variables: undefined, mutate(value) {
    f.likes.push(value); this.variables = value; this.isPending = true
  } }
  const query = (data, isError = false) => ({ data, isError, isPending: f.pendingQueries, refetch() { f.retried = true } })
  const Page = load('features/memories/pages/MyPage.tsx', {
    react: {
      useState(initial) { const i = cursor++; if (!(i in states)) states[i] = initial; return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value }] },
      useMemo: fn => fn(),
      useRef() { const i = refCursor++; return refs[i] ??= { current: i < 2 ? { scrollIntoView: () => {}, scrollTo: () => f.scrolls.push('top') } : null } },
      useEffect(run, deps) { const i = effectCursor++; if (!effects[i] || deps.some((value, j) => !Object.is(value, effects[i][j]))) { effects[i] = deps; run() } },
    },
    'react-router': { ...router, useLocation: () => ({ pathname: f.pathname }), useSearchParams: () => [params, update => {
      params = typeof update === 'function' ? update(params) : new URLSearchParams(update)
    }], useNavigate: () => (...args) => f.navigations.push(args) },
    'lucide-react': { LogOut: 'LogOut' }, '@/shared/components/WireUI': wire, '@/shared/components/RemotePhoto': photo,
    '@/features/history/components/HistoryMap': { HistoryMap: 'HistoryMap' },
    '@/features/auth/hooks/useAuth': { useAuth: () => ({ user: { userId: 7, nickname: '사용자', email: 'user@example.com' }, retrySession: async () => {} }) },
    '@/features/auth/utils/tokenStorage': { getAccessToken: () => 'token' },
    '@tanstack/react-query': {
      useQueryClient: () => client,
      useQuery(options) { f.queries.push(options); return options.queryKey[0] === 'my-quests' ? query(f.memories, f.questError) : query(f.records) },
      useQueries: ({ queries }) => queries.map(options => query(client.getQueryData(options.queryKey), f.greetingError)),
      useMutation(options) { mutationOptions = options; return mutation },
    },
    '../api/myPage': { getMyQuests: () => {}, getMySubmissions: () => {} },
    '../lib/performances': load('features/memories/lib/performances.ts'),
    '@/features/quests/api/verification': { getQuestGreetings: () => {}, toggleSubmissionLike: () => {} },
    '../components/MyPageSummary': { __esModule: true, default: 'MyPageSummary' },
    '../components/MemoryQuestCard': { __esModule: true, default: 'MemoryQuestCard' },
    '../components/GreetingLetter': { __esModule: true, default: 'GreetingLetter' },
  }, { URLSearchParams, localStorage: { removeItem: key => f.removed.push(key) }, sessionStorage: { removeItem: key => f.removed.push(key) } })
  return Object.defineProperty(Object.assign(f, {
    render() { cursor = 0; refCursor = 0; effectCursor = 0; return Page() },
    finishLike() { mutationOptions.onSuccess({ submissionId: mutation.variables.submissionId, isLiked: true }, mutation.variables); mutation.isPending = false },
  }), 'params', { get: () => params })
}

test('마이페이지 진입은 내 그리움이며 안부가 있는 카드만 해당 퀘스트의 편지로 이동한다', () => {
  const f = fixture()
  let tree = f.render()
  assert.equal(find(tree, 'MyPageSummary').props.active, 'memories')
  find(tree, 'MemoryQuestCard').props.onOpen({ ...memory, passedCount: 0 })
  assert.match(text(f.render()), /아직 도착한 안부가 없어요/)
  assert.equal(f.params.has('message'), false)
  find(tree, 'MemoryQuestCard').props.onOpen(memory)
  tree = f.render()
  assert.equal(f.params.get('quest'), '22')
  assert.equal(find(tree, 'GreetingLetter').props.greeting.id, '2')
})

test('안부 하단 목록 없이 다음 버튼으로 최신순 이동·순환하며 기록과 복귀 경로를 보존한다', () => {
  const f = fixture('/me/memories', 'source=records&record=101&quest=22&submission=1&message=0&returnOthers=1')
  let tree = f.render()
  assert.equal(find(tree, 'GreetingLetter').props.greeting.id, '1')
  const backdrop = find(tree, 'div', props => props.className === 'greeting-envelope')
  assert.ok(tree.props.children.includes(backdrop))
  assert.equal(backdrop.props['aria-hidden'], 'true')
  assert.ok(find(tree, 'footer', props => props.className === 'greeting-footer'))
  assert.equal(find(tree, 'Back').props.to, '/me/history?showOthers=1')
  assert.equal(find(tree, 'section', props => props['aria-label'] === '수행 글 목록'), undefined)
  assert.equal(all(tree, 'ol').length, 0)
  assert.equal(find(tree, 'button').props.disabled, false)
  find(tree, 'button').props.onClick()
  tree = f.render()
  assert.equal(find(tree, 'GreetingLetter').props.greeting.id, '2')
  assert.equal(f.params.has('submission'), false)
  assert.equal(f.params.get('record'), '101')
  assert.equal(f.params.get('quest'), '22')
  assert.equal(f.params.get('source'), 'records')
  assert.equal(f.scrolls.length, 2)
  find(tree, 'button').props.onClick()
  assert.equal(find(f.render(), 'GreetingLetter').props.greeting.id, '1')
})

test('안부 0·1개에서는 다음을 잠그며 조회 실패 안내와 재시도는 남긴다', () => {
  const f = fixture('/me/memories', 'quest=22&message=0')
  for (const submissions of [[], [submission(1, '2026-11-01')]]) {
    f.client.setQueryData(['quest-greetings', '22', 'token'], { viewerRole: 'AUTHOR', submissions })
    assert.equal(find(f.render(), 'button').props.disabled, true)
  }
  f.client.setQueryData(['quest-greetings', '22', 'token'], { submissions: [] })
  f.greetingError = true
  const letter = find(f.render(), 'GreetingLetter').props
  assert.equal(letter.failed, true)
  assert.match(letter.statusMessage, /불러오지 못했어요/)
  letter.onRetry()
  assert.equal(f.retried, true)
})

test('좋아요는 작성자에게만 허용하고 중복 요청을 막으며 해당 안부의 캐시만 갱신한다', () => {
  const f = fixture('/me/memories', 'quest=22&message=0')
  let props = find(f.render(), 'GreetingLetter').props
  assert.equal(props.canLike, true)
  props.onLike()
  props = find(f.render(), 'GreetingLetter').props
  assert.equal(props.pending, true)
  props.onLike()
  assert.equal(f.likes.length, 1)
  assert.equal(f.likes[0].submissionId, 2)
  f.finishLike()
  assert.equal(find(f.render(), 'GreetingLetter').props.liked, true)
  assert.equal(f.client.getQueryData(['quest-greetings', '22', 'token']).submissions[0].isLiked, false)
  f.client.setQueryData(['quest-greetings', '22', 'token'], current => ({ ...current, viewerRole: 'PERFORMER' }))
  props = find(f.render(), 'GreetingLetter').props
  assert.equal(props.canLike, false)
  props.onLike()
  assert.equal(f.likes.length, 1)
})

test('기록과 다른 수행자 링크는 퀘스트·기록·안부 ID와 돌아올 목록을 유지한다', () => {
  const f = fixture('/me/history')
  let tree = f.render()
  assert.equal(find(tree, 'MyPageSummary').props.active, 'history')
  assert.equal(find(tree, 'HistoryMap').props.records[0].id, '101')
  let link = find(tree, 'Link', props => props.className === 'mypage-record-card')
  assert.equal(new URL(link.props.to, 'https://example.com').searchParams.get('record'), '101')
  find(tree, 'button').props.onClick()
  tree = f.render()
  link = find(tree, 'Link', props => props.className === 'mypage-record-card')
  const params = new URL(link.props.to, 'https://example.com').searchParams
  assert.equal(params.get('quest'), '22')
  assert.equal(params.get('submission'), '2')
  assert.equal(params.get('returnOthers'), '1')
})

test('편지는 사진 없는 안부·좋아요 잠금·실패 상태를 표시하고 실패 시 재시도할 수 있다', () => {
  const Letter = load('features/memories/components/GreetingLetter.tsx', { 'lucide-react': { Heart: 'Heart' }, '@/shared/components/RemotePhoto': photo })
  const props = { greeting: { greeting: '긴 안부\n둘째 줄', photoUrl: '/greeting.jpg', senderName: '보낸 사람', createdAt: '2026-11-01' }, canLike: true, liked: true, pending: true, likeError: true }
  let tree = Letter(props)
  assert.equal(find(tree, 'div', props => props.className === 'greeting-envelope'), undefined)
  assert.equal(find(tree, 'RemotePhoto').props.photoUrl, '/greeting.jpg')
  assert.equal(find(tree, 'button').props['aria-pressed'], true)
  assert.equal(find(tree, 'button').props.disabled, true)
  assert.match(text(find(tree, 'p', props => props.role === 'alert')), /좋아요를 변경하지 못했어요/)
  tree = Letter({ ...props, greeting: { ...props.greeting, photoUrl: null }, canLike: false })
  assert.equal(find(tree, 'RemotePhoto'), undefined)
  assert.equal(find(tree, 'button'), undefined)
  assert.match(text(tree), /긴 안부\n둘째 줄/)
  let retried = false
  tree = Letter({ failed: true, statusMessage: '안부 조회 실패', onRetry: () => { retried = true } })
  assert.equal(tree.props.role, 'alert')
  find(tree, 'button').props.onClick()
  assert.equal(retried, true)
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

test('그리움 카드는 자신의 퀘스트 ID로 상세 사진을 조회하고 선택한 항목을 전달한다', async () => {
  let options, requested, opened
  const Card = load('features/memories/components/MemoryQuestCard.tsx', {
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
  tree.props.onClick()
  assert.equal(opened, memory)
})

test('로그아웃 확인·안부에는 navbar가 없고 일반 마이페이지와 기록에는 유지된다', () => {
  let pathname, search
  const { RootLayout } = load('app/layouts/RootLayout.tsx', {
    react: { useState: () => [null, () => {}] },
    'react-router': { Outlet: 'Outlet', useLocation: () => ({ pathname }), useSearchParams: () => [new URLSearchParams(search)] },
    '@/shared/components/WireUI': wire,
  })
  for (const path of ['/me', '/me/memories', '/me/history', '/me/logout', '/me/memories?quest=22&message=0']) {
    ;[pathname, search = ''] = path.split('?')
    const tree = RootLayout()
    assert.equal(Boolean(find(tree, 'Bottom')), !path.includes('logout') && !search.includes('message'))
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
