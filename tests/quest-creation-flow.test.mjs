import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import ts from 'typescript'
import axios from 'axios'
import { z } from 'zod'
import { QueryClient } from '@tanstack/react-query'

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
  'motion/react': { motion: { span: 'motion.span' } },
  'lucide-react': { Check: 'Check' }, '../QuestPlacePicker': { QuestPlacePicker: 'QuestPlacePicker' },
})
const Photo = load('components/creation/CreationPhotoStep.tsx', {
  react: { useRef: () => ({ current: null }) }, 'lucide-react': { Plus: 'Plus', X: 'X' },
})
const Preview = load('components/creation/CreationPreviewStep.tsx', { 'lucide-react': { MapPin: 'MapPin' }, 'react-router': { Link: 'Link' } })
const Result = load('components/creation/CreationResultStep.tsx', {
  'react-router': { Link: 'Link' }, './FloatingEnvelope': { __esModule: true, default: 'FloatingEnvelope' },
})
const registrationApi = load('api/questRegistration.ts', {
  axios: { __esModule: true, default: axios }, zod: { z },
  '@/shared/api/client': { apiClient: { post: async () => ({ data: {} }) } }, '@/features/auth/utils/tokenStorage': { getAccessToken: () => 'test-token' },
  '../lib/questPhoto': { getQuestPhotoError: () => null },
}, { FormData, Blob, Error })
const creationMotion = load('components/creation/questCreationMotion.ts')
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
    '../components/creation/useCreationTransition': load('components/creation/useCreationTransition.ts', { react: hooks, './questCreationMotion': creationMotion }),
    '../components/creation/questCreationMotion': creationMotion,
    'motion/react': { AnimatePresence: 'AnimatePresence', useReducedMotion: () => f.reducedMotion },
    'react-router': { Link: 'Link' },
    '@tanstack/react-query': { useQueryClient: () => ({ invalidateQueries: options => {
      f.invalidations.push(options)
      return f.client?.invalidateQueries(options)
    } }) },
    'lucide-react': { MailOpen: 'MailOpen' },
    '../lib/questPhoto': { decodeQuestPhoto: file => f.decode(file) },
    '../api/questRegistration': {
      previewQuest: (draft, signal) => { f.calls.push({ action: 'preview', draft, signal }); return f.generate() },
      registerQuest: (draft, value, file, signal) => { f.calls.push({ action: 'register', draft, preview: value, file, signal }); return f.register() },
      registrationError: registrationApi.registrationError,
      isRegistrationUncertain: registrationApi.isRegistrationUncertain,
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
        for (let i = 0; i < 10; i++) {
          const screen = this.props('CreationScreen')
          const generating = find(tree, 'CreationGeneratingStep')
          if (screen.isTransitioning) screen.onComplete(screen.screen.id)
          else if (generating?.props.ready) generating.props.onComplete()
          else break
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
  const props = { questType: 'GENERAL', place: null, reason: '', reducedMotion: false, onQuestTypeChange: value => changes.push(value), onReasonChange: value => changes.push(value) }
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

test('유형을 바꾸면 라디오 선택과 체크 애니메이션이 함께 바뀌고 모션 축소 설정을 따른다', () => {
  for (const questType of ['GENERAL', 'IMAGE']) {
    for (const reducedMotion of [false, true]) {
      const tree = Details({ questType, reason: '', place: null, reducedMotion })
      for (const type of ['GENERAL', 'IMAGE']) {
        const radio = find(tree, 'input', props => props.value === type)
        const card = find(tree, 'label', props => props['data-selected'] === (type === questType))
        const check = find(card, 'motion.span')
        assert.equal(radio.props.checked, type === questType)
        assert.equal(check.props.initial, false)
        assert.equal(check.props.animate.opacity, type === questType ? 1 : 0)
        assert.equal(check.props.animate.scale, type === questType ? 1 : 0.75)
        assert.equal(check.props.transition.duration, reducedMotion ? 0 : 0.18)
      }
    }
  }
  const f = pageFixture()
  f.reducedMotion = true
  f.render()
  assert.equal(f.props('CreationDetailsStep').reducedMotion, true)
})

test('이유 입력의 글자 수와 접근성 연결은 빈 값부터 최대 길이까지 현재 값을 반영한다', () => {
  for (const reason of ['', '그리운 이유', '가'.repeat(500)]) {
    const tree = Details({ questType: 'GENERAL', place, reason, reducedMotion: false })
    const input = find(tree, 'textarea')
    const label = find(tree, 'label', props => props.htmlFor === input.props.id)
    const count = find(tree, 'p', props => props.id === input.props['aria-describedby'])
    assert.equal(textOf(label), '그리운 이유')
    assert.equal(textOf(count), `${reason.length}/500`)
    assert.equal(input.props.value, reason)
    assert.equal(input.props.maxLength, 500)
  }
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
        assert.equal(textOf(button), readingPhoto ? '사진 확인 중…' : questType === 'IMAGE' && !photoUrl ? '사진을 골라주세요' : 'AI로 퀘스트 만들기')
        assert.equal(tree.props['aria-busy'], readingPhoto)
        assert.equal(find(tree, 'input').props.disabled, readingPhoto)
        for (const className of photoUrl ? ['creation-photo-remove', 'creation-photo-replace'] : ['creation-photo-upload creation-photo-empty']) {
          assert.equal(find(tree, 'button', props => props.className === className).props.disabled, readingPhoto)
        }
        assert.equal(find(tree, 'img')?.props.src ?? null, photoUrl)
        assert.equal(Boolean(find(tree, 'p', props => props.role === 'status')), readingPhoto)
        assert.equal(Boolean(find(tree, 'p', props => props.className === 'creation-photo-hint')), !readingPhoto)
      }
    }
  }
  const input = find(Photo({ questType: 'IMAGE', photoUrl: null, readingPhoto: false, onChoose: file => chosen.push(file) }), 'input')
  const event = { target: { files: [file] }, currentTarget: { value: 'memory.jpg' } }
  input.props.onChange(event)
  assert.equal(event.currentTarget.value, '')
  assert.equal(chosen[0], file)
})

test('사진 안내는 파일 조건·확인 중·오류를 하나씩 표시하고 정상 상태에서 조건 안내로 돌아온다', () => {
  const props = { questType: 'IMAGE', photoUrl: null, readingPhoto: false, error: '' }
  let tree = Photo(props)
  assert.equal(textOf(find(tree, 'div', props => props.className === 'creation-photo-feedback')), 'JPG, PNG, WEBP · 최대 10MB')

  tree = Photo({ ...props, error: '사진을 열 수 없어요. 다른 사진을 골라 주세요.' })
  assert.equal(textOf(find(tree, 'p', props => props.role === 'alert')), '사진을 열 수 없어요. 다른 사진을 골라 주세요.')
  assert.equal(find(tree, 'p', props => props.className === 'creation-photo-hint'), null)
  assert.equal(find(tree, 'button', props => props.className === 'creation-primary').props.disabled, true)

  tree = Photo({ ...props, readingPhoto: true, error: '이전 오류' })
  assert.equal(textOf(find(tree, 'p', props => props.role === 'status')), '사진을 확인하는 중…')
  assert.equal(find(tree, 'p', props => props.role === 'alert'), null)

  tree = Photo({ ...props, photoUrl: 'blob:memory' })
  assert.equal(find(tree, 'p', props => props.role === 'status'), null)
  assert.equal(find(tree, 'p', props => props.role === 'alert'), null)
  assert.match(textOf(tree), /JPG, PNG, WEBP · 최대 10MB/)
  assert.equal(find(tree, 'button', props => props.className === 'creation-primary').props.disabled, false)
})

test('미리보기는 사진 없는 장소 카드·편집·공백 검증을 유지하고 등록 결과 미확인 시 읽기 전용으로 표시한다', () => {
  const edits = []
  const props = { preview, placeName: place.placeName, photoUrl: null, onChange: value => edits.push(value) }
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
  tree = Preview({ ...props, photoUrl: 'blob:memory', registrationUncertain: true, error: '응답을 받지 못했어요.' })
  assert.equal(find(tree, 'img').props.src, 'blob:memory')
  assert.equal(find(tree, 'input').props.readOnly, true)
  assert.equal(find(tree, 'textarea').props.readOnly, true)
  assert.equal(find(tree, 'button').props.disabled, true)
  assert.equal(find(tree, 'Link').props.to, '/me')
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
  f.register = async () => { throw new Error('등록 요청이 거절됐어요.') }
  f.props('CreationPreviewStep').onRegister()
  await tick()
  f.render()
  assert.equal(f.props('CreationResultStep').outcome, 'registerError')
  assert.match(f.props('CreationResultStep').error, /등록 요청/)
  f.props('CreationResultStep').onEdit()
  f.render()
  assert.equal(f.props('CreationPreviewStep').preview.questTitle, '수정한 제목')
  f.register = async () => ({ questId: 701 })
  f.props('CreationPreviewStep').onRegister()
  await tick()
  f.render()
  assert.equal(f.props('CreationResultStep').outcome, 'done')
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
  assert.match(f.props('CreationResultStep').error, /AI 처리 실패/)
  f.props('CreationResultStep').onEdit()
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
  assert.equal(f.props('CreationGeneratingStep').ready, false)
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
  assert.equal(f.props('CreationScreen').screen.stage, 'generating')
  assert.equal(f.props('CreationGeneratingStep').active, true)
  assert.equal(f.props('CreationGeneratingStep').ready, true)
  f.props('CreationGeneratingStep').onComplete()
  f.render(false)
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
  const edit = f.props('CreationResultStep').onEdit
  edit()
  f.render(false)
  assert.equal(f.props('CreationScreen').screen.stage, 'previewError')
  f.complete()
  edit()
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
  for (const stage of ['details', 'photo', 'preview', 'registering', 'generating', 'previewError', 'registerError', 'done']) {
    tree = Screen({ ...props, screen: { ...props.screen, stage } })
    assert.equal(tree.props['data-surface'], ['details', 'photo', 'preview', 'registering'].includes(stage) ? 'form' : 'result')
  }
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

function generationFixture() {
  const effects = [], animations = [], timers = new Map()
  let cursor = 0, pending = [], now = 0, timerId = 0, slow = false
  const progress = { value: 0, get() { return this.value }, set(value) { this.value = value } }
  const f = { present: true, completed: 0, animations, progress }
  const props = { photoUrl: null, ready: false, active: true, reducedMotion: false, onComplete: () => { f.completed++ } }
  const Generate = load('components/creation/CreationGeneratingStep.tsx', {
    react: {
      useState: () => [slow, value => { slow = value }],
      useEffect(run, deps) {
        const index = cursor++
        if (!effects[index] || deps.some((value, i) => !Object.is(value, effects[index].deps[i]))) {
          pending.push(() => {
            effects[index]?.cleanup?.()
            effects[index] = { deps, cleanup: run() }
          })
        }
      },
    },
    'lucide-react': { MailOpen: 'MailOpen' },
    'motion/react': {
      motion: { circle: 'motion.circle' },
      useIsPresent: () => f.present,
      useMotionValue: () => progress,
      useTransform: (value, transform) => ({ get: () => transform(value.get()) }),
      animate(value, target, options) {
        const animation = { value, from: value.get(), target, options, start: now, running: true }
        animations.push(animation)
        return { stop() { animation.running = false } }
      },
    },
  }, {
    setTimeout: (run, delay) => { const id = ++timerId; timers.set(id, { run, at: now + delay }); return id },
    clearTimeout: id => timers.delete(id),
  })
  return Object.assign(f, {
    render(next = {}) {
      Object.assign(props, next)
      cursor = 0; pending = []
      const tree = Generate(props)
      for (const run of pending) run()
      return tree
    },
    advance(ms) {
      now += ms
      for (const animation of animations) {
        if (!animation.running) continue
        const fraction = Math.min(1, (now - animation.start) / (animation.options.duration * 1000))
        animation.value.set(animation.from + (animation.target - animation.from) * fraction)
        if (fraction === 1) {
          animation.running = false
          animation.options.onComplete()
        }
      }
      for (const [id, timer] of timers) {
        if (timer.at > now) continue
        timers.delete(id)
        timer.run()
      }
    },
    unmount() { for (const effect of effects) effect.cleanup?.() },
  })
}

test('대기 링은 10초에 88%까지 채우고 응답이 없으면 90초 뒤에도 완료하지 않는다', () => {
  const f = generationFixture()
  let tree = f.render({ photoUrl: 'blob:memory' })
  assert.equal(find(tree, 'img').props.src, 'blob:memory')
  assert.equal(find(tree, 'LoaderCircle'), null)
  assert.equal(find(tree, 'svg').props['aria-hidden'], 'true')
  f.advance(5000)
  assert.ok(Math.abs(f.progress.get() - 0.44) < 0.0001)
  f.render()
  assert.equal(f.animations.length, 1)
  f.advance(5000)
  assert.equal(f.progress.get(), 0.88)
  assert.equal(f.completed, 0)
  f.advance(80000)
  tree = f.render()
  assert.equal(f.progress.get(), 0.88)
  assert.equal(f.completed, 0)
  assert.match(textOf(tree), /처리가 조금 더 걸리고/)
  assert.ok(Math.abs(find(tree, 'motion.circle').props.style.strokeDashoffset.get() - 0.12) < 0.0001)
  f.unmount()
})

test('부분 진행 중 응답이 오면 현재 위치에서 100%를 채운 뒤 한 번만 완료한다', () => {
  const f = generationFixture()
  f.render()
  f.advance(2000)
  const before = f.progress.get()
  f.render({ ready: true })
  assert.equal(f.progress.get(), before)
  assert.equal(f.animations[0].running, false)
  assert.equal(f.animations[1].options.duration, 0.45)
  f.advance(449)
  assert.ok(f.progress.get() > before && f.progress.get() < 1)
  assert.equal(f.completed, 0)
  f.advance(1)
  assert.equal(f.progress.get(), 1)
  assert.equal(f.completed, 1)
  f.advance(10000)
  assert.equal(f.completed, 1)
  f.unmount()
})

test('빠른 응답은 진입 완료 후 곧바로 완료 링을 채우고 사진 없는 일반 퀘스트는 편지로 표시한다', () => {
  const f = generationFixture()
  let tree = f.render({ active: false })
  assert.equal(find(tree, 'img'), null)
  assert.ok(find(tree, 'MailOpen'))
  f.render({ ready: true })
  f.advance(10000)
  assert.equal(f.animations.length, 0)
  assert.equal(f.completed, 0)
  tree = f.render({ active: true })
  assert.match(textOf(tree), /내용을 준비했어요/)
  assert.equal(f.animations[0].target, 1)
  assert.equal(f.animations[0].options.duration, 0.45)
  f.advance(450)
  assert.equal(f.completed, 1)
  f.unmount()
})

test('오류로 나가거나 페이지를 종료하면 링·안내 타이머·늦은 완료 콜백을 중지한다', () => {
  for (const exit of [true, false]) {
    const f = generationFixture()
    f.render()
    f.advance(1000)
    f.render({ ready: true })
    const late = f.animations.at(-1).options.onComplete
    if (exit) {
      f.present = false
      f.render()
    } else f.unmount()
    const stoppedAt = f.progress.get()
    f.advance(90000)
    late()
    assert.equal(f.completed, 0)
    assert.equal(f.progress.get(), stoppedAt)
    assert.ok(f.animations.every(animation => !animation.running))
    f.unmount()
  }
})

test('애니메이션 줄이기에서도 성공 응답 전에는 88%까지만 채운다', () => {
  const f = generationFixture()
  f.render({ reducedMotion: true })
  f.advance(120)
  assert.equal(f.progress.get(), 0.88)
  assert.equal(f.completed, 0)
  f.render({ ready: true })
  f.advance(120)
  assert.equal(f.progress.get(), 1)
  assert.equal(f.completed, 1)
  f.unmount()
})

test('재생성은 이전 결과를 초기화하고 링 완료 전의 중복 생성·등록을 막는다', async () => {
  const f = pageFixture()
  f.fill()
  const generate = f.props('CreationPhotoStep').onGenerate
  generate()
  await tick()
  f.render(false)
  f.complete()
  generate()
  assert.equal(f.calls.length, 1)
  assert.equal(f.props('CreationGeneratingStep').ready, true)
  f.props('CreationGeneratingStep').onComplete()
  f.render()
  f.props('CreationHeader').onBack()
  f.render()
  let resolvePreview
  f.generate = () => new Promise(resolve => { resolvePreview = resolve })
  f.props('CreationPhotoStep').onGenerate()
  f.render()
  assert.equal(f.props('CreationGeneratingStep').ready, false)
  assert.equal(f.calls.length, 2)
  resolvePreview({ ...preview, questTitle: '다시 생성한 제목' })
  await tick()
  f.render()
  assert.equal(f.props('CreationPreviewStep').preview.questTitle, '다시 생성한 제목')
  f.unmount()
})

test('최종 등록은 미리보기 화면을 유지하고 편집·중복 제출을 잠그며 응답 후 결과로 전환한다', async () => {
  const f = pageFixture()
  f.fill()
  f.props('CreationPhotoStep').onGenerate()
  await tick()
  f.render()
  let resolveRegister
  f.register = () => new Promise(resolve => { resolveRegister = resolve })
  const register = f.props('CreationPreviewStep').onRegister
  register()
  f.render(false)
  assert.equal(f.props('CreationScreen').screen.stage, 'registering')
  assert.equal(f.props('CreationScreen').isTransitioning, false)
  assert.equal(creationMotion.creationScreenKey('preview'), creationMotion.creationScreenKey('registering'))
  assert.equal(f.props('CreationPreviewStep').registering, true)
  assert.equal(f.props('CreationHeader').busy, true)
  const previewTree = Preview(f.props('CreationPreviewStep'))
  assert.equal(find(previewTree, 'input').props.disabled, true)
  assert.equal(find(previewTree, 'textarea').props.disabled, true)
  const button = find(previewTree, 'button', props => props.className === 'creation-primary')
  assert.equal(button.props.disabled, true)
  assert.equal(button.props['aria-busy'], true)
  assert.equal(textOf(button), '등록 중…')
  assert.equal(f.props('CreationPreviewStep').preview.questTitle, preview.questTitle)
  register()
  assert.equal(f.calls.filter(call => call.action === 'register').length, 1)
  resolveRegister({ questId: 701 })
  await tick()
  f.render(false)
  assert.equal(f.props('CreationScreen').screen.stage, 'done')
  assert.equal(f.props('CreationScreen').isTransitioning, true)
  f.complete()
  f.unmount()
})

test('결과 화면은 완료·생성 실패·등록 실패·등록 미확인의 문구와 복구 동작을 구분한다', () => {
  for (const outcome of ['done', 'previewError', 'registerError']) {
    const actions = []
    const tree = Result({ outcome, error: '서버 안내', uncertain: false, active: true, reducedMotion: false,
      onEdit: () => actions.push('edit'), onRetry: () => actions.push('retry') })
    assert.equal(tree.props['data-failed'], outcome !== 'done')
    assert.equal(find(tree, 'FloatingEnvelope').props.failed, outcome !== 'done')
    if (outcome === 'done') {
      assert.match(textOf(tree), /등록 완료/)
      assert.equal(find(tree, 'Link').props.to, '/')
      assert.equal(find(tree, 'p', props => props.role === 'alert'), null)
    } else {
      assert.match(textOf(tree), /만들지 못했어요/)
      assert.match(textOf(find(tree, 'p', props => props.role === 'alert')), /서버 안내/)
      const edit = find(tree, 'button', props => props.className === 'creation-secondary')
      const retry = find(tree, 'button', props => props.className === 'creation-primary')
      assert.equal(textOf(retry), outcome === 'previewError' ? '다시 만들기' : '다시 등록하기')
      edit.props.onClick()
      retry.props.onClick()
      assert.deepEqual(actions, ['edit', 'retry'])
    }
  }
  const tree = Result({ outcome: 'registerError', uncertain: true, error: '', active: true, reducedMotion: false })
  assert.match(textOf(tree), /등록 결과를확인해 주세요/)
  assert.doesNotMatch(textOf(tree), /만들지 못했어요|다시 등록하기/)
  assert.equal(find(tree, 'Link').props.to, '/me')
  assert.equal(find(tree, 'FloatingEnvelope').props.uncertain, true)
})

test('편지 레이어만 4초 주기로 8px 부유하고 전환 중·퇴장·애니메이션 줄이기에서는 멈춘다', () => {
  let present = true
  const Envelope = load('components/creation/FloatingEnvelope.tsx', {
    'motion/react': { motion: { svg: 'motion.svg' }, useIsPresent: () => present },
  })
  const props = { failed: false, uncertain: false, active: true, reducedMotion: false }
  let tree = Envelope(props)
  assert.equal(tree.type, 'motion.svg')
  assert.deepEqual(Array.from(tree.props.animate.y), [0, -8, 0])
  assert.equal(tree.props.transition.duration, 4)
  assert.equal(tree.props.transition.repeat, Infinity)
  assert.equal(textOf(tree), '완료')
  assert.equal(textOf(Envelope({ ...props, failed: true })), '반송')
  assert.equal(textOf(Envelope({ ...props, failed: true, uncertain: true })), '확인')
  for (const next of [{ active: false }, { reducedMotion: true }]) {
    tree = Envelope({ ...props, ...next })
    assert.equal(tree.props.animate.y, 0)
    assert.equal(tree.props.transition.repeat, 0)
  }
  present = false
  assert.equal(Envelope(props).props.transition.repeat, 0)
})

test('등록 불명확 시 입력을 읽기 전용으로 보존하고 생성·등록 재시도 대신 등록 내역을 안내한다', async () => {
  let invalidResponse
  try { await registrationApi.registerQuest({ ...place, questType: 'GENERAL', longingText: '그리운 이유' }, preview, null, new AbortController().signal) }
  catch (cause) { invalidResponse = cause }
  assert.ok(invalidResponse)
  for (const cause of [new axios.AxiosError('Network', 'ERR_NETWORK'), invalidResponse, { isAxiosError: true, response: { status: 504 } }]) {
    const f = pageFixture()
    f.fill()
    f.props('CreationPhotoStep').onGenerate()
    await tick()
    f.render()
    f.props('CreationPreviewStep').onChange({ ...preview, questTitle: '보존할 제목', questDescription: '보존할 설명' })
    f.render()
    f.register = async () => { throw cause }
    f.props('CreationPreviewStep').onRegister()
    await tick()
    f.render()
    const result = f.props('CreationResultStep')
    assert.equal(result.outcome, 'registerError')
    assert.equal(result.uncertain, true)
    assert.match(result.error, /등록 내역을 먼저 확인/)
    assert.equal(find(Result(result), 'Link').props.to, '/me')
    result.onRetry()
    assert.equal(f.calls.length, 2)
    result.onEdit()
    f.render()
    const preserved = f.props('CreationPreviewStep')
    assert.equal(preserved.preview.questTitle, '보존할 제목')
    assert.equal(preserved.preview.questDescription, '보존할 설명')
    assert.equal(preserved.registrationUncertain, true)
    assert.equal(find(Preview(preserved), 'input').props.readOnly, true)
    preserved.onRegister()
    assert.equal(f.calls.length, 2)
    f.props('CreationHeader').onBack()
    f.render()
    assert.equal(f.props('CreationResultStep').uncertain, true)
    assert.deepEqual(f.invalidations.map(item => item.queryKey[0]), ['my-quests', 'quests'])
    f.unmount()
  }
})

test('확정된 등록 거절은 편집한 문구·사진을 그대로 재등록하며 AI 생성은 반복하지 않는다', async () => {
  const f = pageFixture()
  f.fill('IMAGE')
  const file = new File(['photo'], 'memory.jpg', { type: 'image/jpeg' })
  f.props('CreationPhotoStep').onChoose(file)
  await tick()
  f.render()
  f.props('CreationPhotoStep').onGenerate()
  await tick()
  f.render()
  f.props('CreationPreviewStep').onChange({ ...preview, questTitle: '편집한 제목' })
  f.render()
  f.register = async () => { throw { isAxiosError: true, response: { status: 400, data: { message: '요청을 확인해 주세요.' } } } }
  f.props('CreationPreviewStep').onRegister()
  await tick()
  f.render()
  assert.equal(f.props('CreationResultStep').uncertain, false)
  assert.equal(f.invalidations.length, 0)
  f.register = async () => ({ questId: 701 })
  const retry = f.props('CreationResultStep').onRetry
  retry()
  retry()
  await tick()
  f.render()
  assert.equal(f.props('CreationResultStep').outcome, 'done')
  assert.deepEqual(f.calls.map(item => item.action), ['preview', 'register', 'register'])
  assert.equal(f.calls[2].file, file)
  assert.equal(f.calls[2].preview.questTitle, '편집한 제목')
  f.unmount()
})

test('등록 성공은 내 목록·주변 목록·추천 캐시를 갱신하고 페이지 종료 뒤 늦은 응답은 캐시를 건드리지 않는다', async () => {
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } })
  const keys = [['my-quests', 1], ['quests', 'nearby', 1], ['quests', 'nearest', 1]]
  for (const key of [...keys, ['unrelated']]) client.setQueryData(key, {})
  const f = pageFixture()
  f.client = client
  try {
    f.fill()
    f.props('CreationPhotoStep').onGenerate()
    await tick()
    f.render()
    f.props('CreationPreviewStep').onRegister()
    await tick()
    f.render()
    assert.equal(f.props('CreationResultStep').outcome, 'done')
    for (const key of keys) assert.equal(client.getQueryState(key).isInvalidated, true)
    assert.equal(client.getQueryState(['unrelated']).isInvalidated, false)
  } finally {
    f.unmount()
    client.clear()
  }
  const closed = pageFixture()
  closed.fill()
  closed.props('CreationPhotoStep').onGenerate()
  await tick()
  closed.render()
  let resolve
  closed.register = () => new Promise(done => { resolve = done })
  closed.props('CreationPreviewStep').onRegister()
  closed.unmount()
  resolve({ questId: 701 })
  await tick()
  assert.equal(closed.invalidations.length, 0)
})
