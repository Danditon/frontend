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
    return { ...tree, props: { ...tree.props, children: expand(tree.props?.children) } }
  }
  const mutation = { isPending: false, isError: false, variables: undefined, mutate(value) {
    f.likes.push(value); this.variables = value; this.isPending = true
  } }
  const query = (data, isError = false) => ({ data, isError, isPending: f.pendingQueries, refetch() { f.retried = true } })
  const Page = load('features/memories/pages/MyPage.tsx', {
    react: {
      useState(initial) { const i = cursor++; if (!(i in states)) states[i] = initial; return [states[i], value => { states[i] = typeof value === 'function' ? value(states[i]) : value }] },
      useMemo: fn => fn(),
      useRef() { const i = refCursor++; return refs[i] ??= { current: i === 0 ? { scrollIntoView: () => f.scrolls.push('top') } : null } },
      useEffect(run, deps) { const i = effectCursor++; if (!effects[i] || deps.some((value, j) => !Object.is(value, effects[i][j]))) { effects[i] = deps; run() } },
    },
    'react-router': { ...router, useLocation: () => ({ pathname: f.pathname }), useSearchParams: () => [params, update => {
      params = typeof update === 'function' ? update(params) : new URLSearchParams(update)
    }], useNavigate: () => (...args) => f.navigations.push(args) },
    'lucide-react': { Heart: 'Heart', ExternalLink: 'ExternalLink' }, '@/shared/components/WireUI': wire, '@/shared/components/RemotePhoto': photo,
    '@/features/history/components/HistoryMap': { HistoryMap: 'HistoryMap' },
    '@/features/history/components/HistoryRecordCard': { HistoryRecordCard: 'HistoryRecordCard' },
    '@/features/history/lib/locations': load('features/history/lib/locations.ts'),
    '@/features/auth/hooks/useAuth': { useAuth: () => ({ user: { userId: 7, nickname: '사용자', email: 'user@example.com' }, retrySession: async () => {} }) },
    '@/features/auth/utils/tokenStorage': { getAccessToken: () => 'token' },
    '@tanstack/react-query': {
      useQueryClient: () => client,
      useQuery(options) {
        f.queries.push(options)
        if (options.queryKey[0] === 'my-quests') return query(f.memories, f.questError)
        if (options.queryKey[0] === 'verification-quest') return query(f.detailQuestType ? { questType: f.detailQuestType } : undefined)
        return query(f.records)
      },
      useQueries: ({ queries }) => queries.map(options => query(client.getQueryData(options.queryKey), f.greetingError)),
      useMutation(options) { mutationOptions = options; return mutation },
    },
    '../api/myPage': { getMyQuests: () => {}, getMySubmissions: () => {} },
    '../lib/performances': load('features/memories/lib/performances.ts'),
    '@/features/quests/api/verification': { getQuestGreetings: () => {}, toggleSubmissionLike: () => {}, getVerificationQuest: (...args) => { f.requestedDetail = args } },
    '../components/MyPageSummary': { __esModule: true, default: 'MyPageSummary' },
    '../components/MemoryQuestCard': { __esModule: true, default: 'MemoryQuestCard' },
    '../components/GreetingEnvelope': { __esModule: true, default: 'GreetingEnvelope' },
  }, { URLSearchParams, localStorage: { removeItem: key => f.removed.push(key) }, sessionStorage: { removeItem: key => f.removed.push(key) } })
  return Object.defineProperty(Object.assign(f, {
    render() { cursor = 0; refCursor = 0; effectCursor = 0; return expand(Page()) },
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
  const bottom = find(tree, 'div', props => props.className === 'greeting-envelope-bottom')
  const backdrop = find(bottom, 'div', props => props.className === 'greeting-envelope-front')
  const back = find(bottom, 'div', props => props.className === 'greeting-envelope-flap')
  assert.ok(back)
  assert.equal(back.props['aria-hidden'], 'true')
  assert.ok(backdrop)
  assert.equal(backdrop.props['aria-hidden'], 'true')
  assert.ok(find(bottom, 'footer', props => props.className === 'greeting-footer'))
  assert.ok(likeButton(bottom))
  assert.equal(find(tree, 'Link', props => props['aria-label'] === '로그아웃'), undefined)
  assert.equal(find(tree, 'Back').props.to, '/me/history?showOthers=1')
  assert.equal(find(tree, 'section', props => props['aria-label'] === '수행 글 목록'), undefined)
  assert.equal(all(tree, 'ol').length, 0)
  assert.equal(nextButton(tree).props.disabled, false)
  nextButton(tree).props.onClick()
  tree = f.render()
  assert.equal(find(tree, 'GreetingLetter').props.greeting.id, '2')
  assert.equal(f.params.has('submission'), false)
  assert.equal(f.params.get('record'), '101')
  assert.equal(f.params.get('quest'), '22')
  assert.equal(f.params.get('source'), 'records')
  assert.equal(f.scrolls.length, 2)
  nextButton(tree).props.onClick()
  assert.equal(find(f.render(), 'GreetingLetter').props.greeting.id, '1')
})

test('안부 0·1개에서는 다음을 잠그며 조회 실패 안내와 재시도는 남긴다', () => {
  const f = fixture('/me/memories', 'quest=22&message=0')
  for (const submissions of [[], [submission(1, '2026-11-01')]]) {
    f.client.setQueryData(['quest-greetings', '22', 'token'], { viewerRole: 'AUTHOR', submissions })
    const tree = f.render()
    assert.equal(nextButton(tree).props.disabled, true)
    assert.equal(Boolean(find(tree, 'div', props => props.className === 'greeting-envelope-flap')), submissions.length > 0)
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

test('기록과 다른 수행자 링크는 퀘스트·기록·안부 ID와 돌아올 목록을 유지한다', () => {
  const f = fixture('/me/history')
  let tree = f.render()
  assert.equal(find(tree, 'MyPageSummary').props.active, 'history')
  assert.equal(find(tree, 'HistoryMap').props.records[0].id, '101')
  find(tree, 'button', props => props['data-history-key'] === '101').props.onClick()
  tree = f.render()
  let link = find(tree, 'Link', props => text({ props }) === '이곳의 안부 보기')
  assert.equal(new URL(link.props.to, 'https://example.com').searchParams.get('record'), '101')
  assert.equal(new URL(link.props.to, 'https://example.com').searchParams.get('submission'), '101')
  find(tree, 'button').props.onClick()
  tree = f.render()
  assert.equal(find(tree, 'HistoryMap').props.selectedRecordId, null)
  find(tree, 'button', props => props['data-history-key'] === 'peer-2').props.onClick()
  tree = f.render()
  link = find(tree, 'Link', props => text({ props }) === '이곳의 안부 보기')
  const params = new URL(link.props.to, 'https://example.com').searchParams
  assert.equal(params.get('quest'), '22')
  assert.equal(params.get('submission'), '2')
  assert.equal(params.get('returnOthers'), '1')
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
  assert.match(find(tree, 'a').props.href, /36,129$/)
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
  assert.match(text(tree), /위치 정보가 없어요/)
})

test('같은 장소의 다른 수행자 여러 명은 각 안부 ID를 유지하고 마커는 최신 기록을 선택한다', () => {
  const f = fixture('/me/history', 'showOthers=1')
  let tree = f.render()
  find(tree, 'button', props => props['data-history-key'] === 'peer-1').props.onClick()
  tree = f.render()
  let link = find(tree, 'Link', props => props.to.includes('submission='))
  assert.match(link.props.to, /submission=1/)
  find(tree, 'HistoryMap').props.onSelectRecord('101')
  tree = f.render()
  link = find(tree, 'Link', props => props.to.includes('submission='))
  assert.match(link.props.to, /submission=2/)
  assert.equal(all(tree, 'button').filter(node => node.props['aria-pressed']).length, 1)
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
  assert.equal(f.queries.at(-1).enabled, false)
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
