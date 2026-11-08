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
  return module.exports.default
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
    decode: async () => 'blob:memory',
    generate: async () => ({ ...preview }),
    register: async () => ({ questId: 701 }),
  }
  const Page = load('pages/QuestCreatePage.tsx', {
    react: {
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
    },
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
    render() {
      stateIndex = 0; refIndex = 0; effectIndex = 0; pending = []
      tree = Page()
      for (const run of pending) run()
      return tree
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
