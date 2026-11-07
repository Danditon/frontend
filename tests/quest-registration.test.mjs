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
  const apiClient = axios.create({
    baseURL,
    adapter: async config => {
      calls.push(config)
      return {
        data: config.url === '/quests/preview' ? preview : { questId: 10 },
        status: 200, statusText: 'OK', headers: {}, config,
      }
    },
  })
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
  for (const baseURL of ['/api', '/api/', 'https://backend.example', 'https://backend.example/', 'https://backend.example/api/']) {
    const { api, apiClient, calls } = setup(baseURL)
    const signal = new AbortController().signal
    assert.deepEqual(await api.previewQuest(draft, signal), preview)
    assert.equal((await api.registerQuest(draft, preview, null, signal)).questId, 10)
    assert.deepEqual(calls.map(config => new URL(apiClient.getUri(config), 'https://frontend.example').pathname), [
      '/api/quests/preview', '/api/quests',
    ])
    assert.equal(apiClient.defaults.baseURL, baseURL)
    if (baseURL === 'https://backend.example') {
      assert.equal(apiClient.getUri({ url: '/api/auth/login' }), 'https://backend.example/api/auth/login')
    }
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
