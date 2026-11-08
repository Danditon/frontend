// 실제 서버 없이 후보 선택과 기존 상세 캐시의 공유·취소·계정 분리를 확인합니다.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { afterEach, test } from 'node:test'
import { runInNewContext } from 'node:vm'
import { QueryClient, QueryObserver } from '@tanstack/react-query'
import ts from 'typescript'

function loadSource(path, dependencies = {}) {
  const source = ts.transpileModule(
    readFileSync(new URL(`../src/features/quests/${path}`, import.meta.url), 'utf8'),
    { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
  ).outputText
  const module = { exports: {} }
  runInNewContext(source, {
    module, exports: module.exports,
    require: id => {
      assert.ok(Object.hasOwn(dependencies, id), `Unexpected dependency: ${id}`)
      return dependencies[id]
    },
  })
  return module.exports
}

const distanceUtils = loadSource('pages/home/utils/getDistanceMeters.ts')
const clients = new Set()
const position = { lat: 0, lng: 0 }
const tick = () => new Promise(resolve => setImmediate(resolve))

afterEach(() => {
  for (const client of clients) client.clear()
  clients.clear()
})

function nearby(questId, lng, extra = {}) {
  return {
    questId, questTitle: `Quest ${questId}`, questType: 'GENERAL', difficulty: 1,
    placeName: 'Cafe', lat: 0, lng, distance: 9999, isMine: false, ...extra,
  }
}

function detail(questId, extra = {}) {
  const { distance: _distance, ...quest } = nearby(questId, questId / 1000)
  return {
    ...quest, author: { userId: 8, nickname: 'Author' }, address: 'Daegu',
    longingText: 'A memory', photoUrl: null, questDescription: 'Send a greeting',
    status: 'OPEN', myStatus: 'NONE', ...extra,
  }
}

function setup(readDetail = async id => detail(id)) {
  let auth = { status: 'authenticated', user: { userId: 1 } }
  const calls = []
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } })
  clients.add(client)
  const dependencies = {
    '@tanstack/react-query': { useQuery: options => options, useQueryClient: () => client },
    '@/features/auth/hooks/useAuth': { useAuth: () => auth },
    '../api/questQueries': {
      getQuestDetail: (id, signal) => {
        calls.push({ id, signal, userId: auth.user?.userId })
        return readDetail(id, signal)
      },
    },
    '../pages/home/utils/getDistanceMeters': distanceUtils,
  }
  return {
    client, calls,
    options: loadSource('hooks/useNearestQuest.ts', dependencies).useNearestQuest,
    detailOptions: loadSource('hooks/useQuestDetail.ts', dependencies).useQuestDetail,
    setAuth: next => { auth = next },
  }
}

test('로그인·GPS·목록이 준비되지 않으면 비활성화하고 직접 재조회도 차단한다', async () => {
  const f = setup()
  const quests = [nearby(1, 0.001)]
  const signal = new AbortController().signal
  for (const status of ['anonymous', 'checking', 'error']) {
    f.setAuth({ status, user: null })
    const options = f.options(quests, position)
    assert.equal(options.enabled, false)
    await assert.rejects(options.queryFn({ signal }), /로그인/)
  }
  f.setAuth({ status: 'authenticated', user: { userId: 1 } })
  assert.equal(f.options(quests, null).enabled, false)
  await assert.rejects(f.options(quests, null).queryFn({ signal }), /현위치/)
  assert.equal(f.options(undefined, position).enabled, false)
  await assert.rejects(f.options(undefined, position).queryFn({ signal }), /주변 퀘스트/)
  assert.equal(f.calls.length, 0)
})

test('GPS 거리순으로 본인·완료 항목을 건너뛰고 FAILED를 찾으면 후속 조회를 멈춘다', async () => {
  const f = setup(async id => detail(id, {
    isMine: id === 2,
    myStatus: id === 1 ? 'PASSED' : 'FAILED',
  }))
  const quests = [nearby(4, 0.004), nearby(3, 0.003), nearby(2, 0.002), nearby(1, 0.001), nearby(5, 0.0001, { isMine: true })]
  const snapshot = JSON.stringify(quests)
  const options = f.options(quests, position)
  assert.equal(options.enabled, true)
  const selected = await f.client.fetchQuery(options)
  assert.equal(selected.questId, 3)
  assert.equal(selected.myStatus, 'FAILED')
  assert.equal(selected.photoUrl, null)
  assert.deepEqual(f.calls.map(call => call.id), [1, 2, 3])
  assert.equal(JSON.stringify(quests), snapshot)
  assert.equal(options.retry, false)
  assert.equal(options.refetchOnWindowFocus, false)
  assert.equal(options.refetchInterval, undefined)
})

test('거리가 같으면 ID 순으로 고르고 제목·사진은 ID별 상세 응답을 사용한다', async () => {
  const actual = detail(1, { questTitle: 'Server detail title', photoUrl: 'https://example.com/photo.jpg' })
  const f = setup(async () => actual)
  const result = await f.client.fetchQuery(f.options([nearby(2, 0.001), nearby(1, 0.001)], position))
  assert.equal(result, actual)
  assert.equal(result.questTitle, actual.questTitle)
  assert.equal(result.photoUrl, actual.photoUrl)
  assert.deepEqual(f.calls.map(call => call.id), [1])
})

test('빈 목록·본인 항목만 있는 목록·모두 완료한 목록은 오류 없이 null을 반환한다', async () => {
  for (const quests of [[], [nearby(1, 0.001, { isMine: true })], [nearby(1, 0.001), nearby(2, 0.002)]]) {
    const f = setup(async id => detail(id, { myStatus: 'PASSED' }))
    assert.equal(await f.client.fetchQuery(f.options(quests, position)), null)
    assert.equal(f.calls.length, quests.filter(quest => !quest.isMine).length)
  }
})

test('인증·권한·404·서버·통신 오류를 완료로 취급하거나 다음 후보로 숨기지 않는다', async () => {
  for (const status of [401, 403, 404, 500, undefined]) {
    const failure = Object.assign(new Error('Detail lookup failed'), { status })
    const f = setup(async () => { throw failure })
    await assert.rejects(f.client.fetchQuery(f.options([nearby(1, 0.001), nearby(2, 0.002)], position)), error => error === failure)
    assert.deepEqual(f.calls.map(call => call.id), [1])
  }
})

test('기존 useQuestDetail과 신선한 데이터 및 진행 중인 상세 요청을 공유한다', async () => {
  let finish
  const pending = new Promise(resolve => { finish = resolve })
  const f = setup(() => pending)
  const search = f.client.fetchQuery(f.options([nearby(1, 0.001)], position))
  const drawer = f.client.fetchQuery(f.detailOptions(1))
  assert.equal(f.calls.length, 1)
  assert.ok(f.calls[0].signal instanceof AbortSignal)
  const actual = detail(1)
  finish(actual)
  assert.equal(await search, actual)
  assert.equal(await drawer, actual)
  const observer = new QueryObserver(f.client, f.detailOptions(1))
  const stop = observer.subscribe(() => {})
  try {
    assert.equal(observer.getCurrentResult().data, actual)
    assert.equal(await f.client.fetchQuery(f.detailOptions(1)), actual)
    assert.equal(f.calls.length, 1)
  } finally {
    stop()
  }
})

test('후보 순서·측정 시각만 바뀌면 캐시를 재사용하고 좌표·후보·계정은 분리한다', () => {
  const f = setup()
  const quests = [nearby(2, 0.002), nearby(1, 0.001)]
  const key = JSON.stringify(f.options(quests, position).queryKey)
  assert.equal(JSON.stringify(f.options([...quests].reverse(), { ...position, timestamp: 2, accuracy: 5 }).queryKey), key)
  assert.notEqual(JSON.stringify(f.options(quests, { lat: 1, lng: 0 }).queryKey), key)
  assert.notEqual(JSON.stringify(f.options([quests[0]], position).queryKey), key)
  assert.notEqual(JSON.stringify(f.options([quests[0], { ...quests[1], lng: 0.0015 }], position).queryKey), key)
  f.setAuth({ status: 'authenticated', user: { userId: 2 } })
  assert.notEqual(JSON.stringify(f.options(quests, position).queryKey), key)
})

test('취소된 탐색은 시작하지 않으며 진행 중 취소 후 다음 후보를 조회하지 않는다', async () => {
  let finish
  const pending = new Promise(resolve => { finish = resolve })
  const f = setup(() => pending)
  const options = f.options([nearby(1, 0.001), nearby(2, 0.002)], position)
  const alreadyCancelled = new AbortController()
  alreadyCancelled.abort()
  await assert.rejects(options.queryFn({ signal: alreadyCancelled.signal }), { name: 'AbortError' })
  assert.equal(f.calls.length, 0)
  const controller = new AbortController()
  const search = options.queryFn({ signal: controller.signal })
  controller.abort()
  finish(detail(1, { myStatus: 'PASSED' }))
  await assert.rejects(search, { name: 'AbortError' })
  assert.deepEqual(f.calls.map(call => call.id), [1])
})

test('GPS 변경 후 이전 상세 응답이 늦게 와도 새 위치의 추천을 덮어쓰지 않는다', async () => {
  let finishOld
  const pending = new Promise(resolve => { finishOld = resolve })
  const f = setup(id => id === 1 ? pending : Promise.resolve(detail(id)))
  const quests = [nearby(1, 0), nearby(2, 0.02)]
  const observer = new QueryObserver(f.client, f.options(quests, position))
  const stop = observer.subscribe(() => {})
  try {
    assert.equal(f.calls[0].id, 1)
    observer.setOptions(f.options(quests, { lat: 0, lng: 0.02 }))
    const current = await observer.refetch()
    assert.equal(current.data.questId, 2)
    finishOld(detail(1))
    await tick()
    assert.equal(observer.getCurrentResult().data.questId, 2)
    assert.deepEqual(f.calls.map(call => call.id), [1, 2])
  } finally {
    stop()
  }
})

test('계정 변경 후 이전 계정의 상세 캐시와 늦은 추천 응답을 사용하지 않는다', async () => {
  let finishOld, first = true
  const pending = new Promise(resolve => { finishOld = resolve })
  const f = setup(id => {
    if (first) { first = false; return pending }
    return Promise.resolve(detail(id, { questTitle: 'Current user result' }))
  })
  const quests = [nearby(1, 0.001)]
  const observer = new QueryObserver(f.client, f.options(quests, position))
  const stop = observer.subscribe(() => {})
  try {
    f.setAuth({ status: 'authenticated', user: { userId: 2 } })
    observer.setOptions(f.options(quests, position))
    assert.equal(observer.getCurrentResult().data, undefined)
    const current = await observer.refetch()
    assert.equal(current.data.questTitle, 'Current user result')
    finishOld(detail(1, { questTitle: 'Previous user result' }))
    await tick()
    assert.equal(observer.getCurrentResult().data.questTitle, 'Current user result')
    assert.deepEqual(f.calls.map(call => call.userId), [1, 2])
  } finally {
    stop()
  }
})

test('퀘스트 캐시 갱신 후 완료한 항목을 다시 확인하고 다음 후보를 선택한다', async () => {
  let passed = false
  const f = setup(async id => detail(id, { myStatus: id === 1 && passed ? 'PASSED' : 'NONE' }))
  const options = f.options([nearby(1, 0.001), nearby(2, 0.002)], position)
  assert.equal((await f.client.fetchQuery(options)).questId, 1)
  passed = true
  await f.client.invalidateQueries({ queryKey: ['quests'] })
  assert.equal((await f.client.fetchQuery(options)).questId, 2)
  assert.deepEqual(f.calls.map(call => call.id), [1, 1, 2])
})

test('갱신 실패한 상세는 캐시 시간이 남아도 이전 데이터로 추천하지 않고 다시 확인한다', async () => {
  let fail = false
  const failure = new Error('Session or detail unavailable')
  const f = setup(async id => {
    if (fail) throw failure
    return detail(id)
  })
  const options = f.detailOptions(1)
  await f.client.fetchQuery(options)
  const drawer = new QueryObserver(f.client, options)
  const stop = drawer.subscribe(() => {})
  try {
    fail = true
    const previous = await drawer.refetch()
    assert.equal(previous.isError, true)
    assert.equal(previous.data.questId, 1)
    await assert.rejects(f.client.fetchQuery(f.options([nearby(1, 0.001), nearby(2, 0.002)], position)), error => error === failure)
    assert.deepEqual(f.calls.map(call => call.id), [1, 1, 1])
  } finally {
    stop()
  }
})
