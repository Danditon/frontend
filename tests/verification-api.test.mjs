import assert from 'node:assert/strict'
import { after, before, test } from 'node:test'
import { createServer } from 'vite'

let server, api, client
const store = new Map()
before(async () => {
  Object.defineProperty(globalThis, 'sessionStorage', { configurable: true, value: { getItem: key => store.get(key) ?? null } })
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: { getItem: () => null } })
  server = await createServer({ server: { middlewareMode: true, open: false }, appType: 'custom' })
  api = await server.ssrLoadModule('/src/features/quests/api/verification.ts')
  ;({ apiClient: client } = await server.ssrLoadModule('/src/shared/api/client.ts'))
})
after(async () => { await server?.close() })

test('GENERAL sends a JSON request part, without inventing a photo', async () => {
  const body = api.createSubmissionForm('GENERAL', '  안부를 전해요  ', { lat: 35.87, lng: 128.6 }, null)
  assert.equal(body.get('photo'), null)
  assert.equal(body.get('request').type, 'application/json')
  assert.deepEqual(JSON.parse(await body.get('request').text()), { greeting: '안부를 전해요', lat: 35.87, lng: 128.6 })
})
test('IMAGE requires photo and both quest types require a greeting and valid GPS', () => {
  assert.throws(() => api.createSubmissionForm('IMAGE', '안부', { lat: 35, lng: 128 }, null))
  assert.throws(() => api.createSubmissionForm('GENERAL', '  ', { lat: 35, lng: 128 }, null))
  assert.throws(() => api.createSubmissionForm('GENERAL', '안부', { lat: NaN, lng: 128 }, null))
  assert.throws(() => api.createSubmissionForm('GENERAL', '안부', { lat: 91, lng: 128 }, null))
  const heic = new File(['test'], 'test.heic', { type: 'image/heic' })
  assert.throws(() => api.createSubmissionForm('IMAGE', '안부', { lat: 35, lng: 128 }, heic))
})
test('IMAGE attaches the actual File separately', () => {
  const photo = new File(['image fixture'], 'photo.jpg', { type: 'image/jpeg' })
  const body = api.createSubmissionForm('IMAGE', '안부', { lat: 35, lng: 128 }, photo)
  assert.equal(body.get('photo').name, 'photo.jpg')
  assert.equal(body.get('photo').size, photo.size)
})
test('missing token and demo IDs never reach transport', async () => {
  store.clear()
  client.defaults.adapter = async () => { throw new Error('Transport must not run') }
  await assert.rejects(() => api.getVerificationQuest('1'), /로그인/)
  await assert.rejects(() => api.getVerificationQuest('demo'), /선택/)
})
test('submit attaches Bearer token and distinguishes 201 FAILED from transport failure', async () => {
  store.set('accessToken', 'unit-test-token')
  let calls = 0
  client.defaults.adapter = async config => {
    calls++
    assert.equal(config.url, '/quests/17/submissions')
    assert.equal(config.headers.get('Authorization'), 'Bearer unit-test-token')
    assert.ok(config.data instanceof FormData)
    return { status: 201, statusText: 'Created', headers: {}, config, data: { submissionId: 9, verifyStatus: 'FAILED', similarity: 0.41, message: '같은 구도로 다시 찍어 주세요' } }
  }
  const body = api.createSubmissionForm('GENERAL', '안부', { lat: 35, lng: 128 }, null)
  const result = await api.submitVerification('17', body)
  assert.equal(result.verifyStatus, 'FAILED')
  assert.equal(api.similarityPercent(result.similarity), 41)
  assert.equal(api.similarityPercent(null), null)
  assert.equal(calls, 1)
})
test('invalid server result cannot be treated as success', async () => {
  client.defaults.adapter = async config => ({ status: 201, statusText: 'Created', headers: {}, config, data: { verifyStatus: 'SUCCESS' } })
  const body = api.createSubmissionForm('GENERAL', '안부', { lat: 35, lng: 128 }, null)
  await assert.rejects(() => api.submitVerification('17', body))
})
test('PASSED GENERAL preserves null similarity and returns actual server message', async () => {
  client.defaults.adapter = async config => ({ status: 201, statusText: 'Created', headers: {}, config, data: { submissionId: 10, verifyStatus: 'PASSED', similarity: null, message: '안부가 전달됐어요' } })
  const result = await api.submitVerification('17', api.createSubmissionForm('GENERAL', '안부', { lat: 35, lng: 128 }, null))
  assert.equal(result.verifyStatus, 'PASSED')
  assert.equal(result.similarity, null)
  assert.equal(result.message, '안부가 전달됐어요')
})
test('greetings keep backend role, performer, photo and text fields', async () => {
  client.defaults.adapter = async config => ({ status: 200, statusText: 'OK', headers: {}, config, data: { viewerRole: 'COMPLETED', submissions: [{ submissionId: 10, performer: { userId: 3, nickname: '방문자' }, greeting: '안부', photoUrl: 'https://example.com/photo.jpg', verifyStatus: 'PASSED', similarity: null, isLiked: false, createdAt: '2026-11-07T00:00:00' }] } })
  const result = await api.getQuestGreetings('17')
  assert.equal(result.viewerRole, 'COMPLETED')
  assert.equal(result.submissions[0].photoUrl, 'https://example.com/photo.jpg')
})
test('permission, GPS and AI errors produce retry guidance, not fake results', () => {
  const failure = code => ({ isAxiosError: true, response: { status: 403, data: { code } } })
  assert.match(api.verificationError(failure('OUT_OF_RANGE')), /200m/)
  assert.match(api.verificationError(failure('UNAUTHORIZED')), /로그인/)
  assert.match(api.verificationError(failure('AI_ERROR')), /유지/)
})
