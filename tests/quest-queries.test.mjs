// 환경변수·실제 서버를 사용하지 않고 조회 API의 인증·경로·응답 검증을 확인합니다.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import axios from 'axios'
import ts from 'typescript'
import { z } from 'zod'

// Vite를 실행하지 않아 로컬 .env를 읽거나 실제 네트워크 요청을 만들지 않습니다.
const source = ts.transpileModule(
  readFileSync(new URL('../src/features/quests/api/questQueries.ts', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText

const nearbyQuest = {
  questId: 10,
  questTitle: 'Visit the cafe',
  questType: 'IMAGE',
  difficulty: 2,
  placeName: 'Cafe',
  lat: 35.8714,
  lng: 128.6014,
  distance: 420,
  isMine: false,
}
const { distance: _distance, ...questFields } = nearbyQuest
const detail = {
  ...questFields,
  author: { userId: 3, nickname: 'Author' },
  address: 'Daegu',
  longingText: 'A memory',
  photoUrl: null,
  questDescription: 'Send a greeting',
  status: 'OPEN',
  myStatus: 'NONE',
}

function setup({ baseURL = '/api', token = 'test-token', data = [nearbyQuest], error } = {}) {
  const calls = []
  const apiClient = axios.create({
    baseURL,
    adapter: async (config) => {
      calls.push(config)
      if (error) throw error
      return { data, status: 200, statusText: 'OK', headers: {}, config }
    },
  })
  let currentToken = token
  const module = { exports: {} }
  const dependencies = {
    zod: { z },
    '@/shared/api/client': { apiClient },
    '@/features/auth/utils/tokenStorage': { getAccessToken: () => currentToken },
  }
  runInNewContext(source, {
    module,
    exports: module.exports,
    require: (id) => {
      assert.ok(Object.hasOwn(dependencies, id), `Unexpected dependency: ${id}`)
      return dependencies[id]
    },
  })
  return { api: module.exports, apiClient, calls, setToken: (next) => { currentToken = next } }
}

test('주변 목록은 JWT·검색 조건·취소 signal·타임아웃을 전달한다', async () => {
  const { api, apiClient, calls } = setup()
  const controller = new AbortController()
  const params = { lat: 35.8714, lng: 128.6014, type: 'IMAGE', difficulty: 2 }
  assert.deepEqual(await api.getNearbyQuests(params, controller.signal), [nearbyQuest])
  const [request] = calls
  assert.equal(request.method, 'get')
  assert.equal(request.headers.get('Authorization'), 'Bearer test-token')
  assert.equal(request.signal, controller.signal)
  assert.equal(request.timeout, 15_000)
  assert.equal(request.params.radius, 50_000)
  assert.equal(params.radius, undefined)
  const url = new URL(apiClient.getUri(request), 'https://frontend.example')
  assert.equal(url.pathname, '/api/quests')
  assert.equal(url.searchParams.get('type'), 'IMAGE')
  assert.equal(url.searchParams.get('difficulty'), '2')
  assert.equal(url.searchParams.get('lat'), '35.8714')
  assert.equal(url.searchParams.get('lng'), '128.6014')
})

test('서버 주소와 /api 포함 주소 모두 접두어 중복 없이 요청하고 공용 설정은 유지한다', async () => {
  for (const baseURL of ['/api', '/api/', 'https://backend.example', 'https://backend.example/', 'https://backend.example/api/']) {
    const { api, apiClient, calls } = setup({ baseURL })
    await api.getNearbyQuests({ lat: 35, lng: 128, radius: 1000 })
    const url = new URL(apiClient.getUri(calls[0]), 'https://frontend.example')
    assert.equal(url.pathname, '/api/quests')
    assert.equal(url.searchParams.get('radius'), '1000')
    assert.equal(apiClient.defaults.baseURL, baseURL)
  }
})

test('다음 요청에는 갱신된 토큰을 사용하고 토큰이 없으면 전송하지 않는다', async () => {
  const { api, calls, setToken } = setup()
  await api.getNearbyQuests({ lat: 35, lng: 128 })
  setToken('new-token')
  await api.getNearbyQuests({ lat: 35, lng: 128 })
  assert.equal(calls[1].headers.get('Authorization'), 'Bearer new-token')
  setToken(null)
  await assert.rejects(api.getNearbyQuests({ lat: 35, lng: 128 }), /로그인/)
  await assert.rejects(api.getQuestDetail(10), /로그인/)
  assert.equal(calls.length, 2)
})

test('잘못된 검색 조건·상세 ID는 서버에 보내지 않는다', async () => {
  const { api, calls } = setup()
  for (const invalid of [{ lat: NaN }, { lat: 91 }, { lng: -181 }, { radius: 0 }, { difficulty: 4 }, { type: 'OTHER' }]) {
    await assert.rejects(api.getNearbyQuests({ lat: 35, lng: 128, ...invalid }), z.ZodError)
  }
  for (const id of [0, -1, 1.5, Infinity]) await assert.rejects(api.getQuestDetail(id), z.ZodError)
  assert.equal(calls.length, 0)
})

test('빈 목록은 성공이고 래퍼·잘못된 좌표·종류·난이도는 오류다', async () => {
  assert.deepEqual(await setup({ data: [] }).api.getNearbyQuests({ lat: 35, lng: 128 }), [])
  for (const data of [{ data: [nearbyQuest] }, [{ ...nearbyQuest, lat: 91 }], [{ ...nearbyQuest, questType: 'OTHER' }], [{ ...nearbyQuest, difficulty: 4 }], [{ ...nearbyQuest, distance: -1 }]]) {
    await assert.rejects(setup({ data }).api.getNearbyQuests({ lat: 35, lng: 128 }), z.ZodError)
  }
})

test('상세 응답은 선택 ID·nullable 사진·수행 여부를 검증한다', async () => {
  const { api, apiClient, calls } = setup({ data: detail })
  assert.deepEqual(await api.getQuestDetail(10), detail)
  assert.equal(new URL(apiClient.getUri(calls[0]), 'https://frontend.example').pathname, '/api/quests/10')
  await assert.rejects(setup({ data: detail }).api.getQuestDetail(11), /일치/)
  await assert.rejects(setup({ data: { ...detail, myStatus: 'IN_PROGRESS' } }).api.getQuestDetail(10), z.ZodError)
})

test('이미 취소된 요청은 전송하지 않고 서버 오류는 mock으로 대체하지 않는다', async () => {
  const controller = new AbortController()
  controller.abort()
  const { api, calls } = setup()
  await assert.rejects(api.getNearbyQuests({ lat: 35, lng: 128 }, controller.signal), axios.isCancel)
  assert.equal(calls.length, 0)
  const unauthorized = new axios.AxiosError('Unauthorized', undefined, undefined, undefined, { status: 401 })
  await assert.rejects(setup({ error: unauthorized }).api.getQuestDetail(10), (error) => error === unauthorized)
})
