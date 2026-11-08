import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'

const element = (type, props) => ({ type, props })

function load(path, dependencies = {}, globals = {}) {
  const code = ts.transpileModule(readFileSync(new URL(`../src/features/quests/${path}`, import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  const module = { exports: {} }
  runInNewContext(code, {
    ...globals, module, exports: module.exports,
    require(id) {
      if (id === 'react/jsx-runtime') return { jsx: element, jsxs: element, Fragment: 'Fragment' }
      if (id.endsWith('.css')) return {}
      if (Object.hasOwn(dependencies, id)) return dependencies[id]
      if (id.startsWith('../components/creation/')) return { __esModule: true, default: id.split('/').at(-1) }
      throw new Error(`Unexpected dependency: ${id}`)
    },
  })
  return module.exports.default ?? module.exports
}

function find(tree, type, matches = () => true) {
  if (!tree || typeof tree !== 'object') return null
  if (tree.type === type && matches(tree.props)) return tree
  for (const child of [tree.props?.children].flat(Infinity)) {
    const result = find(child, type, matches)
    if (result) return result
  }
  return null
}

function textOf(tree) {
  if (typeof tree === 'string' || typeof tree === 'number') return String(tree)
  return tree ? [tree.props?.children].flat(Infinity).map(textOf).join('') : ''
}

const Details = load('components/creation/CreationDetailsStep.tsx', {
  'lucide-react': { Check: 'Check' }, '../QuestPlacePicker': { QuestPlacePicker: 'QuestPlacePicker' },
})
const Photo = load('components/creation/CreationPhotoStep.tsx', {
  react: { useRef: () => ({ current: null }) }, 'lucide-react': { Plus: 'Plus', X: 'X' },
})
const Preview = load('components/creation/CreationPreviewStep.tsx', { 'lucide-react': { MapPin: 'MapPin' } })
const place = { placeName: '그리운 카페', address: '대구 중구', lat: 35.87, lng: 128.6 }
const preview = { questTitle: '카페에 안부 남기기', questDescription: '방문하고 안부를 남겨주세요.', difficulty: 1, difficultyReason: '방문하기 쉬워요.' }
const tick = () => new Promise(resolve => setImmediate(resolve))

function pageFixture() {
  const states = [], setters = [], refs = [], effects = []
  let stateIndex = 0, refIndex = 0, effectIndex = 0, pending = [], tree, mounted = true
  const f = {
    calls: [], invalidations: [], revoked: [],
    reducedMotion: false,
    decode: async () => 'blob:memory',
    generate: async () => ({ ...preview }),
    register: async () => ({ questId: 701 }),
  }
  const hooks = {
    useCallback: callback => callback,
    useRef(initial) { return refs[refIndex++] ??= { current: initial } },
    useState(initial) {
      const index = stateIndex++
      if (!(index in states)) states[index] = initial
      setters[index] ??= next => { if (mounted) states[index] = typeof next === 'function' ? next(states[index]) : next }
      return [states[index], setters[index]]
    },
    useEffect(run, deps) {
      const index = effectIndex++
      if (!effects[index] || deps.some((value, i) => !Object.is(value, effects[index].deps[i]))) {
        pending.push(() => {
          effects[index]?.cleanup?.()
          effects[index] = { deps, cleanup: run() }
        })
      }
    },
  }
  const Page = load('pages/QuestCreatePage.tsx', {
    react: hooks,
    '../components/creation/useCreationTransition': load('components/creation/useCreationTransition.ts', { react: hooks }),
    'motion/react': { AnimatePresence: 'AnimatePresence', useReducedMotion: () => f.reducedMotion },
    'react-router': { Link: 'Link' },
    '@tanstack/react-query': { useQueryClient: () => ({ invalidateQueries: options => f.invalidations.push(options) }) },
    'lucide-react': { LoaderCircle: 'LoaderCircle', MailOpen: 'MailOpen' },
    '../lib/questPhoto': { decodeQuestPhoto: file => f.decode(file) },
    '../api/questRegistration': {
      previewQuest: (draft, signal) => { f.calls.push({ action: 'preview', draft, signal }); return f.generate() },
      registerQuest: (draft, value, file, signal) => { f.calls.push({ action: 'register', draft, preview: value, file, signal }); return f.register() },
      registrationError: error => error.message,
    },
  }, { AbortController, URL: { revokeObjectURL: url => f.revoked.push(url) } })

  return Object.assign(f, {
    render(finishTransition = true) {
      const draw = () => {
        stateIndex = 0; refIndex = 0; effectIndex = 0; pending = []
        tree = Page()
        for (const run of pending) run()
      }
      draw()
      // 기존 흐름 검사는 완료 이벤트를 전달하고, 전환 검사는 직접 완료 시점을 제어합니다.
      if (finishTransition) {
        for (let i = 0; i < 10 && this.props('CreationScreen').isTransitioning; i++) {
          this.props('CreationScreen').onComplete(this.props('CreationScreen').screen.id)
          draw()
        }
      }
      return tree
    },
    complete(id = this.props('CreationScreen').screen.id) {
      this.props('CreationScreen').onComplete(id)
      return this.render(false)
    },
    props(name) { return find(tree, name).props },
    fill(type = 'GENERAL') {
      this.render()
      const props = this.props('CreationDetailsStep')
      props.onQuestTypeChange(type)
      props.onPlaceChange(place)
      props.onReasonChange('  친구들과 자주 가던 카페예요.  ')
      props.onNext()
      this.render()
    },
    unmount() { mounted = false; for (const effect of effects) effect.cleanup?.() },
  })
}

test('입력 화면은 실제 장소 선택·공백이 아닌 이유를 요구하고 유형·입력 이벤트를 전달한다', () => {
  const changes = []
  const props = { questType: 'GENERAL', place: null, reason: '', onQuestTypeChange: value => changes.push(value), onReasonChange: value => changes.push(value) }
  assert.equal(find(Details(props), 'button').props.disabled, true)
  assert.equal(find(Details({ ...props, place, reason: '   ' }), 'button').props.disabled, true)
  const tree = Details({ ...props, place, reason: '그리운 이유' })
  assert.equal(find(tree, 'button').props.disabled, false)
  find(tree, 'input', props => props.value === 'IMAGE').props.onChange()
  find(tree, 'textarea').props.onChange({ target: { value: '수정한 이유' } })
  assert.deepEqual(changes, ['IMAGE', '수정한 이유'])
  assert.equal(find(tree, 'textarea').props.maxLength, 500)
  assert.match(textOf(tree), /글 필수사진 선택/)
})

test('사진 화면은 일반 선택·이미지 필수 조건과 읽기 중 잠금을 유지하고 같은 파일도 다시 고를 수 있다', () => {
  const chosen = []
  const file = new File(['photo'], 'memory.jpg', { type: 'image/jpeg' })
  for (const questType of ['GENERAL', 'IMAGE']) {
    for (const photoUrl of [null, 'blob:memory']) {
      for (const readingPhoto of [false, true]) {
        const tree = Photo({ questType, photoUrl, readingPhoto, error: '', onChoose: file => chosen.push(file) })
        const button = find(tree, 'button', props => props.className === 'creation-primary')
        assert.equal(button.props.disabled, readingPhoto || (questType === 'IMAGE' && !photoUrl))
        assert.equal(find(tree, 'img')?.props.src ?? null, photoUrl)
        assert.equal(Boolean(find(tree, 'p', props => props.role === 'status')), readingPhoto)
      }
    }
  }
  const input = find(Photo({ questType: 'IMAGE', photoUrl: null, readingPhoto: false, onChoose: file => chosen.push(file) }), 'input')
  const event = { target: { files: [file] }, currentTarget: { value: 'memory.jpg' } }
  input.props.onChange(event)
  assert.equal(event.currentTarget.value, '')
  assert.equal(chosen[0], file)
})

test('미리보기는 사진 없는 장소 카드·제목과 설명 편집·공백 검증·등록 실패 재시도를 유지한다', () => {
  const edits = []
  const props = { preview, placeName: place.placeName, photoUrl: null, registrationFailed: false, onChange: value => edits.push(value) }
  let tree = Preview(props)
  assert.equal(find(tree, 'img'), null)
  assert.match(textOf(tree), /그리운 카페/)
  find(tree, 'input').props.onChange({ target: { value: '새 제목' } })
  find(tree, 'textarea').props.onChange({ target: { value: '새 설명' } })
  assert.equal(edits[0].questTitle, '새 제목')
  assert.equal(edits[0].difficultyReason, preview.difficultyReason)
  assert.equal(edits[1].questDescription, '새 설명')
  for (const key of ['questTitle', 'questDescription']) {
    tree = Preview({ ...props, preview: { ...preview, [key]: '  ' } })
    assert.equal(find(tree, 'button', props => props.className === 'creation-primary').props.disabled, true)
  }
  tree = Preview({ ...props, photoUrl: 'blob:memory', registrationFailed: true, error: '응답을 받지 못했어요.' })
  assert.equal(find(tree, 'img').props.src, 'blob:memory')
  assert.equal(find(tree, 'input'), null)
  assert.match(textOf(tree), /문구 수정다시 등록하기/)
  assert.match(textOf(find(tree, 'p', props => props.role === 'alert')), /응답을 받지 못/)
})

test('입력 상태를 보존하며 일반 퀘스트는 사진 없이 생성하고 등록 재시도에서 AI를 다시 호출하지 않는다', async () => {
  const f = pageFixture()
  f.fill()
  f.props('CreationHeader').onBack()
  f.render()
  assert.equal(f.props('CreationDetailsStep').reason, '  친구들과 자주 가던 카페예요.  ')
  assert.equal(f.props('CreationDetailsStep').place, place)
  f.props('CreationDetailsStep').onNext()
  f.render()
  f.props('CreationPhotoStep').onGenerate()
  await tick()
  f.render()
  assert.equal(f.props('CreationPreviewStep').preview.questTitle, preview.questTitle)
  assert.equal(f.calls[0].draft.longingText, '친구들과 자주 가던 카페예요.')
  f.props('CreationPreviewStep').onChange({ ...preview, questTitle: '수정한 제목' })
  f.render()
  f.register = async () => { throw new Error('등록 응답을 받지 못했어요.') }
  f.props('CreationPreviewStep').onRegister()
  await tick()
  f.render()
  assert.equal(f.props('CreationPreviewStep').registrationFailed, true)
  assert.equal(f.props('CreationPreviewStep').preview.questTitle, '수정한 제목')
  assert.match(f.props('CreationPreviewStep').error, /등록 응답/)
  f.props('CreationPreviewStep').onEdit()
  f.render()
  assert.equal(f.props('CreationPreviewStep').registrationFailed, false)
  f.register = async () => ({ questId: 701 })
  f.props('CreationPreviewStep').onRegister()
  await tick()
  assert.match(textOf(f.render()), /등록 완료/)
  assert.deepEqual(f.calls.map(call => call.action), ['preview', 'register', 'register'])
  assert.equal(f.calls[1].file, null)
  assert.equal(f.calls[2].preview.questTitle, '수정한 제목')
  assert.equal(f.invalidations[0].queryKey[0], 'my-quests')
  f.unmount()
})

test('이미지는 사진이 없거나 읽기 실패 시 생성을 막고 선택한 실제 파일을 등록까지 보존한다', async () => {
  const f = pageFixture()
  f.fill('IMAGE')
  f.props('CreationPhotoStep').onGenerate()
  assert.equal(f.calls.length, 0)
  const file = new File(['photo'], 'memory.jpg', { type: 'image/jpeg' })
  f.decode = async () => { throw new Error('사진을 열 수 없어요.') }
  f.props('CreationPhotoStep').onChoose(file)
  await tick()
  f.render()
  assert.match(f.props('CreationPhotoStep').error, /사진을 열 수 없어요/)
  assert.equal(f.props('CreationPhotoStep').photoUrl, null)
  let resolvePhoto
  f.decode = () => new Promise(resolve => { resolvePhoto = resolve })
  f.props('CreationPhotoStep').onChoose(file)
  f.render()
  assert.equal(f.props('CreationPhotoStep').readingPhoto, true)
  f.props('CreationPhotoStep').onGenerate()
  assert.equal(f.calls.length, 0)
  resolvePhoto('blob:memory')
  await tick()
  f.render()
  assert.equal(f.props('CreationPhotoStep').photoUrl, 'blob:memory')
  f.props('CreationHeader').onBack()
  f.render()
  assert.equal(f.props('CreationDetailsStep').questType, 'IMAGE')
  f.props('CreationDetailsStep').onNext()
  f.render()
  assert.equal(f.props('CreationPhotoStep').photoUrl, 'blob:memory')
  assert.equal(f.revoked.length, 0)
  f.props('CreationPhotoStep').onGenerate()
  await tick()
  f.render()
  f.props('CreationPreviewStep').onRegister()
  await tick()
  assert.equal(f.calls[1].file, file)
  f.render()
  f.unmount()
  assert.deepEqual(f.revoked, ['blob:memory'])
})

test('생성 실패 후 수정하기는 입력을 보존하고 재시도 중 중복 요청을 막는다', async () => {
  const f = pageFixture()
  f.fill()
  f.generate = async () => { throw new Error('AI 처리 실패') }
  f.props('CreationPhotoStep').onGenerate()
  await tick()
  let tree = f.render()
  assert.match(textOf(tree), /AI 처리 실패/)
  find(tree, 'button', props => props.children === '수정하기').props.onClick()
  f.render()
  assert.equal(f.props('CreationDetailsStep').place, place)
  f.props('CreationDetailsStep').onNext()
  f.render()
  let resolvePreview
  f.generate = () => new Promise(resolve => { resolvePreview = resolve })
  const generate = f.props('CreationPhotoStep').onGenerate
  generate()
  generate()
  tree = f.render()
  assert.match(textOf(tree), /바꾸는 중/)
  assert.equal(f.props('CreationHeader').busy, true)
  assert.equal(f.calls.length, 2)
  resolvePreview(preview)
  await tick()
  f.render()
  assert.equal(f.props('CreationPreviewStep').preview.questTitle, preview.questTitle)
  f.unmount()
})

test('페이지 종료 시 생성 요청을 취소하고 뒤늦게 읽은 사진 URL도 해제한다', async () => {
  const f = pageFixture()
  f.fill()
  let resolvePreview
  f.generate = () => new Promise(resolve => { resolvePreview = resolve })
  f.props('CreationPhotoStep').onGenerate()
  f.render()
  f.unmount()
  assert.equal(f.calls[0].signal.aborted, true)
  resolvePreview(preview)
  await tick()

  const photo = pageFixture()
  photo.fill('IMAGE')
  let resolvePhoto
  photo.decode = () => new Promise(resolve => { resolvePhoto = resolve })
  photo.props('CreationPhotoStep').onChoose(new File(['photo'], 'memory.jpg'))
  photo.unmount()
  resolvePhoto('blob:late')
  await tick()
  assert.deepEqual(photo.revoked, ['blob:late'])
})

test('다음은 오른쪽 진입, 뒤로는 왼쪽 진입이며 전환 중 연속 이동과 이전 완료 이벤트를 차단한다', () => {
  const f = pageFixture()
  f.render()
  const initial = f.props('CreationDetailsStep')
  initial.onPlaceChange(place)
  initial.onReasonChange('그리운 이유')
  initial.onNext()
  f.render(false)
  const arrival = f.props('CreationScreen')
  assert.equal(arrival.screen.stage, 'photo')
  assert.equal(arrival.screen.direction, 1)
  assert.equal(arrival.isTransitioning, true)
  assert.equal(f.props('CreationHeader').isTransitioning, true)
  assert.equal(f.props('CreationHeader').step, 2)
  f.props('CreationHeader').onBack()
  initial.onNext()
  f.render(false)
  assert.equal(f.props('CreationScreen').screen.id, arrival.screen.id)
  f.complete(arrival.screen.id - 1)
  assert.equal(f.props('CreationScreen').isTransitioning, true)
  f.complete()
  assert.equal(f.props('CreationScreen').isTransitioning, false)
  f.props('CreationHeader').onBack()
  f.render(false)
  assert.equal(f.props('CreationScreen').screen.stage, 'details')
  assert.equal(f.props('CreationScreen').screen.direction, -1)
  assert.equal(f.props('CreationHeader').step, 1)
  assert.equal(f.props('CreationDetailsStep').reason, '그리운 이유')
  f.complete()
  f.unmount()
})

test('빠른 생성 응답도 생성 화면의 진입 완료를 기다리고 미리보기 페이드가 끝나기 전 등록을 막는다', async () => {
  const f = pageFixture()
  f.fill()
  f.props('CreationPhotoStep').onGenerate()
  await tick()
  f.render(false)
  const generatingId = f.props('CreationScreen').screen.id
  assert.equal(f.props('CreationScreen').screen.stage, 'generating')
  assert.equal(f.props('CreationHeader').step, 2)
  f.complete(generatingId)
  const arrival = f.props('CreationScreen')
  assert.equal(arrival.screen.stage, 'preview')
  assert.equal(arrival.screen.kind, 'fade')
  assert.equal(arrival.isTransitioning, true)
  assert.equal(f.props('CreationHeader').step, 3)
  f.props('CreationPreviewStep').onRegister()
  assert.equal(f.calls.length, 1)
  f.complete(generatingId)
  assert.equal(f.props('CreationScreen').isTransitioning, true)
  f.complete()
  f.props('CreationPreviewStep').onRegister()
  await tick()
  f.render(false)
  assert.equal(f.props('CreationScreen').screen.stage, 'registering')
  f.complete()
  assert.equal(f.props('CreationScreen').screen.stage, 'done')
  assert.equal(f.props('CreationHeader').hidden, true)
  f.complete()
  assert.deepEqual(f.calls.map(call => call.action), ['preview', 'register'])
  f.unmount()
})

test('빠른 생성 오류도 진입 완료 뒤 표시하며 수정하기는 역방향으로 입력 화면에 돌아간다', async () => {
  const f = pageFixture()
  f.fill()
  f.generate = async () => { throw new Error('AI 처리 실패') }
  f.props('CreationPhotoStep').onGenerate()
  await tick()
  f.render(false)
  assert.equal(f.props('CreationScreen').screen.stage, 'generating')
  f.complete()
  assert.equal(f.props('CreationScreen').screen.stage, 'previewError')
  let tree = f.render(false)
  const edit = find(tree, 'button', props => props.children === '수정하기')
  edit.props.onClick()
  f.render(false)
  assert.equal(f.props('CreationScreen').screen.stage, 'previewError')
  f.complete()
  edit.props.onClick()
  tree = f.render(false)
  assert.equal(f.props('CreationScreen').screen.direction, -1)
  assert.equal(f.props('CreationDetailsStep').place, place)
  assert.match(f.props('CreationDetailsStep').reason, /친구들과/)
  f.complete()
  f.unmount()
})

test('본문과 단계 표시는 같은 시간·곡선을 사용하고 애니메이션 줄이기에서도 페이드 전환을 유지한다', () => {
  const config = load('components/creation/questCreationMotion.ts')
  const { creationVariants: variants, creationTransition: transition } = config
  for (const direction of [1, -1]) {
    const data = { direction, kind: 'slide', reducedMotion: false }
    assert.equal(variants.enter(data).x, `${direction * 100}%`)
    assert.equal(variants.exit(data).x, `${direction * -100}%`)
    const reduced = variants.enter({ ...data, reducedMotion: true })
    assert.equal(reduced.x, 0)
    assert.equal(reduced.opacity, 0)
  }
  assert.equal(variants.enter({ direction: 1, kind: 'fade', reducedMotion: false }).x, 0)
  assert.equal(transition(false).duration, 0.36)
  assert.equal(transition(true).duration, 0.12)
  const Header = load('components/creation/CreationHeader.tsx', {
    'lucide-react': { ChevronLeft: 'ChevronLeft' }, 'react-router': { Link: 'Link' },
    'motion/react': { motion: { header: 'motion.header', span: 'motion.span' } },
    './questCreationMotion': config,
  })
  for (const reducedMotion of [false, true]) {
    const tree = Header({ step: 2, backToHome: false, busy: false, isTransitioning: true, reducedMotion, hidden: false })
    assert.equal(tree.props.inert, true)
    assert.equal(find(tree, 'button').props.disabled, true)
    const progress = find(tree, 'div', props => props.role === 'progressbar')
    const bars = progress.props.children.map(bar => bar.props.children)
    assert.deepEqual(Array.from(bars, bar => bar.props.animate.scaleX), [1, 1, 0])
    for (const bar of bars) assert.equal(bar.props.transition.duration, transition(reducedMotion).duration)
    assert.deepEqual(bars[0].props.transition.ease, transition(reducedMotion).ease)
  }
})

test('나가는 화면은 입력·접근성에서 제외하고 도착 완료 후에만 제목으로 포커스를 옮긴다', () => {
  let present = true
  const completed = [], focus = []
  const Screen = load('components/creation/CreationScreen.tsx', {
    react: {
      useRef: () => ({ current: { querySelector: () => ({ setAttribute: (...args) => focus.push(args), focus: options => focus.push(options) }) } }),
      useEffect: run => run(),
    },
    'motion/react': { motion: { div: 'motion.div' }, useIsPresent: () => present },
    './questCreationMotion': load('components/creation/questCreationMotion.ts'),
  })
  const props = { screen: { stage: 'photo', id: 1, direction: 1, kind: 'slide' }, isTransitioning: true, reducedMotion: false, onComplete: id => completed.push(id) }
  let tree = Screen(props)
  assert.equal(tree.props.inert, true)
  assert.equal(focus.length, 0)
  tree.props.onAnimationComplete('exit')
  assert.equal(completed.length, 0)
  tree.props.onAnimationComplete('center')
  assert.deepEqual(completed, [1])
  present = false
  tree = Screen({ ...props, isTransitioning: false })
  assert.equal(tree.props.inert, true)
  assert.equal(tree.props['aria-hidden'], true)
  tree.props.onAnimationComplete('center')
  assert.deepEqual(completed, [1])
  assert.equal(focus.length, 0)
  present = true
  tree = Screen({ ...props, isTransitioning: false })
  assert.equal(tree.props.inert, false)
  assert.deepEqual(focus[0], ['tabindex', '-1'])
  assert.equal(focus[1].preventScroll, true)
})

test('화면 종료 후 대기 중인 결과와 오래된 전환 완료 이벤트가 다음 요청을 시작하지 않는다', async () => {
  const f = pageFixture()
  f.fill()
  const generate = f.props('CreationPhotoStep').onGenerate
  generate()
  await tick()
  f.render(false)
  const finish = f.props('CreationScreen').onComplete
  const id = f.props('CreationScreen').screen.id
  f.unmount()
  finish(id)
  generate()
  assert.equal(f.calls.length, 1)
})
