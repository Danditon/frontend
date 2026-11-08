import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import axios from 'axios'
import ts from 'typescript'
import { z } from 'zod'

const source = ts.transpileModule(
  readFileSync(new URL('../src/features/quests/api/questRegistration.ts', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText

// 실제 공통 클라이언트의 주소 정규화까지 사용해 테스트 전용 주소 차이를 없앱니다.
const clientSource = ts.transpileModule(
  readFileSync(new URL('../src/shared/api/client.ts', import.meta.url), 'utf8')
    .replace('import.meta.env.VITE_API_BASE_URL', '__TEST_BASE_URL__'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText

const draft = {
  questType: 'GENERAL', placeName: 'Cafe', address: 'Daegu',
  lat: 35.87, lng: 128.6, longingText: 'A memory',
}
const preview = {
  questTitle: 'Visit the cafe', questDescription: 'Send a greeting',
  difficulty: 1, difficultyReason: 'Easy to visit',
}

function setup(baseURL, token = 'test-token') {
  const calls = []
  const clientModule = { exports: {} }
  runInNewContext(clientSource, {
    module: clientModule, exports: clientModule.exports, __TEST_BASE_URL__: baseURL,
    require: id => { assert.equal(id, 'axios'); return { __esModule: true, default: axios } },
  })
  const { apiClient } = clientModule.exports
  apiClient.defaults.adapter = async config => {
    calls.push(config)
    return {
      data: config.url === '/quests/preview' ? preview : { questId: 10 },
      status: 200, statusText: 'OK', headers: {}, config,
    }
  }
  const module = { exports: {} }
  const dependencies = {
    axios: { __esModule: true, default: axios },
    zod: { z },
    '@/shared/api/client': { apiClient },
    '@/features/auth/utils/tokenStorage': { getAccessToken: () => token },
    '../lib/questPhoto': { getQuestPhotoError: () => null },
  }
  runInNewContext(source, {
    module, exports: module.exports, FormData, Blob,
    require: id => {
      assert.ok(Object.hasOwn(dependencies, id), `Unexpected dependency: ${id}`)
      return dependencies[id]
    },
  })
  return { api: module.exports, apiClient, calls }
}

test('preview and registration include /api once for backend origins and /api base URLs', async () => {
  for (const [baseURL, expectedBase] of [
    ['/api', '/api'], ['/api/', '/api'], ['https://backend.example', 'https://backend.example/api'],
    ['https://backend.example/', 'https://backend.example/api'], ['https://backend.example/api/', 'https://backend.example/api'],
  ]) {
    const { api, apiClient, calls } = setup(baseURL)
    const signal = new AbortController().signal
    assert.deepEqual(await api.previewQuest(draft, signal), preview)
    assert.equal((await api.registerQuest(draft, preview, null, signal)).questId, 10)
    assert.deepEqual(calls.map(config => new URL(apiClient.getUri(config), 'https://frontend.example').pathname), [
      '/api/quests/preview', '/api/quests',
    ])
    assert.equal(apiClient.defaults.baseURL, expectedBase)
  }
})

test('preview JSON and registration multipart preserve credentials, location and request options', async () => {
  const { api, calls } = setup('https://backend.example')
  const signal = new AbortController().signal
  await api.previewQuest(draft, signal)
  await api.registerQuest(draft, preview, null, signal)
  for (const config of calls) {
    assert.equal(config.method, 'post')
    assert.equal(config.headers.get('Authorization'), 'Bearer test-token')
    assert.equal(config.signal, signal)
    assert.equal(config.timeout, 90_000)
  }
  assert.deepEqual(JSON.parse(calls[0].data), {
    questType: draft.questType, placeName: draft.placeName,
    address: draft.address, longingText: draft.longingText,
  })
  assert.ok(calls[1].data instanceof FormData)
  const request = calls[1].data.get('request')
  assert.equal(request.type, 'application/json')
  assert.deepEqual(JSON.parse(await request.text()), {
    ...draft, questTitle: preview.questTitle,
    questDescription: preview.questDescription, difficulty: preview.difficulty,
  })
  assert.equal(calls[1].data.get('photo'), null)
})

test('missing tokens and cancelled requests do not reach transport', async () => {
  for (const token of [null, 'test-token']) {
    const { api, calls } = setup('https://backend.example', token)
    const controller = new AbortController()
    if (token) controller.abort()
    const expectedError = token ? axios.isCancel : /로그인/
    await assert.rejects(api.previewQuest(draft, controller.signal), expectedError)
    await assert.rejects(api.registerQuest(draft, preview, null, controller.signal), expectedError)
    assert.equal(calls.length, 0)
  }
})

test('registration uncertainty distinguishes lost responses and ambiguous server errors from request rejections', () => {
  const { api } = setup('/api')
  const network = new axios.AxiosError('Network', 'ERR_NETWORK')
  for (const error of [network, { isAxiosError: true, response: { status: 408 } }, { isAxiosError: true, response: { status: 500 } }, { isAxiosError: true, response: { status: 504 } }]) {
    assert.equal(api.isRegistrationUncertain(error), true)
    assert.match(api.registrationError(error, 'register'), /등록 내역을 먼저 확인/)
  }
  for (const status of [400, 401, 403, 413, 422]) {
    const error = { isAxiosError: true, response: { status, data: { message: '등록 요청이 거절됐어요.' } } }
    assert.equal(api.isRegistrationUncertain(error), false)
  }
  assert.equal(api.isRegistrationUncertain(new Error('사진을 선택해 주세요.')), false)
  assert.equal(api.isRegistrationUncertain(new z.ZodError([])), false)
  assert.match(api.registrationError(network, 'preview'), /서버에 연결/)
})

test('a response with no valid quest ID never becomes a registration success', async () => {
  const { api, apiClient } = setup('/api')
  apiClient.defaults.adapter = async config => ({ status: 201, statusText: 'Created', headers: {}, config, data: {} })
  let error
  try { await api.registerQuest(draft, preview, null, new AbortController().signal) }
  catch (cause) { error = cause }
  assert.ok(error.cause instanceof z.ZodError)
  assert.equal(api.isRegistrationUncertain(error), true)
})

test('invalid edited content is rejected before transport and remains safe to correct', async () => {
  const { api, calls } = setup('/api')
  let error
  try { await api.registerQuest(draft, { ...preview, questTitle: '  ' }, null, new AbortController().signal) }
  catch (cause) { error = cause }
  assert.ok(error instanceof z.ZodError)
  assert.equal(calls.length, 0)
  assert.equal(api.isRegistrationUncertain(error), false)
  assert.match(api.registrationError(error, 'register'), /퀘스트 내용을 확인/)
})
