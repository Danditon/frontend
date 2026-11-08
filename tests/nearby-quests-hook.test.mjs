// 실제 서버·환경변수 없이 조회 훅의 조건과 TanStack Query의 캐시·취소 동작을 확인합니다.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import { runInNewContext } from 'node:vm'
import { QueryClient, QueryObserver } from '@tanstack/react-query'
import ts from 'typescript'

const source = ts.transpileModule(
  readFileSync(new URL('../src/features/quests/hooks/useNearbyQuests.ts', import.meta.url), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } },
).outputText

const position = { lat: 35.8714, lng: 128.6014, accuracy: 15, timestamp: 1000 }

function setup(request = async () => []) {
  let auth = { status: 'authenticated', user: { userId: 1 } }
  const calls = []
  const module = { exports: {} }
  const dependencies = {
    // React 렌더러 대신 옵션을 꺼내 실제 QueryObserver로 실행합니다.
    '@tanstack/react-query': { useQuery: (options) => options },
    '@/features/auth/hooks/useAuth': { useAuth: () => auth },
    '../api/questQueries': {
      getNearbyQuests: (params, signal) => {
        calls.push({ params, signal })
        return request(params, signal)
      },
    },
  }
  runInNewContext(source, {
    module,
    exports: module.exports,
    require: (id) => {
      assert.ok(Object.hasOwn(dependencies, id), `Unexpected dependency: ${id}`)
      return dependencies[id]
    },
  })
  return {
    options: module.exports.useNearbyQuests,
    calls,
    setAuth: (next) => { auth = next },
  }
}

test('미로그인·인증 확인 중·인증 오류·위치 미확인 상태에서는 요청하지 않는다', () => {
  const { options, calls, setAuth } = setup()
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } })
  try {
    for (const status of ['anonymous', 'checking', 'error']) {
      setAuth({ status, user: null })
      const config = options(position)
      const observer = new QueryObserver(client, config)
      const stop = observer.subscribe(() => {})
      assert.equal(config.enabled, false)
      assert.equal(observer.getCurrentResult().fetchStatus, 'idle')
      assert.throws(() => config.queryFn({ signal: new AbortController().signal }), /로그인/)
      stop()
    }
    setAuth({ status: 'authenticated', user: { userId: 1 } })
    const config = options(null)
    assert.equal(config.enabled, false)
    assert.throws(() => config.queryFn({ signal: new AbortController().signal }), /현위치/)
    assert.equal(calls.length, 0)
  } finally {
    client.clear()
  }
})

test('사용자·좌표·반경을 키에 넣고 측정 시각·정확도는 제외한다', () => {
  const { options, setAuth } = setup()
  const initial = Array.from(options(position).queryKey)
  assert.deepEqual(initial, ['quests', 'nearby', 1, 35.8714, 128.6014, 50_000])
  assert.deepEqual(Array.from(options({ ...position, timestamp: 2000, accuracy: 5 }).queryKey), initial)
  assert.notDeepEqual(Array.from(options({ ...position, lat: 36 }).queryKey), initial)
  assert.notDeepEqual(Array.from(options({ ...position, lng: 129 }).queryKey), initial)
  assert.notDeepEqual(Array.from(options(position, 1000).queryKey), initial)
  setAuth({ status: 'authenticated', user: { userId: 2 } })
  assert.notDeepEqual(Array.from(options(position).queryKey), initial)
})

test('검색 좌표·반경·취소 신호를 전달하며 0도 좌표도 허용한다', async () => {
  const { options, calls } = setup()
  const config = options({ ...position, lat: 0, lng: 0 }, 1000)
  const controller = new AbortController()
  assert.equal(config.enabled, true)
  await config.queryFn({ signal: controller.signal })
  assert.equal(calls[0].params.lat, 0)
  assert.equal(calls[0].params.lng, 0)
  assert.equal(calls[0].params.radius, 1000)
  assert.equal(calls[0].signal, controller.signal)
  assert.equal(config.staleTime, 30_000)
  assert.equal(config.retry, false)
  assert.equal(config.refetchOnWindowFocus, false)
  assert.equal(config.refetchInterval, undefined)
})

test('빈 배열은 성공이고 서버 오류는 오류 상태로 전달한다', async () => {
  for (const fail of [false, true]) {
    const failure = new Error('Server unavailable')
    const fixture = setup(async () => { if (fail) throw failure; return [] })
    const client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } })
    const observer = new QueryObserver(client, fixture.options(position))
    const stop = observer.subscribe(() => {})
    try {
      const result = await observer.refetch()
      assert.equal(result.status, fail ? 'error' : 'success')
      if (fail) assert.equal(result.error, failure)
      else assert.deepEqual(result.data, [])
      assert.equal(fixture.calls.length, 1)
    } finally {
      stop()
      client.clear()
    }
  }
})

test('같은 위치의 캐시는 재사용하고 계정 변경 시 이전 계정 데이터를 표시하지 않는다', async () => {
  const fixture = setup(async () => [{ questId: 10 }])
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } })
  const observer = new QueryObserver(client, fixture.options(position))
  const stop = observer.subscribe(() => {})
  try {
    await observer.refetch()
    observer.setOptions(fixture.options({ ...position, timestamp: 2000 }))
    assert.equal(fixture.calls.length, 1)
    fixture.setAuth({ status: 'authenticated', user: { userId: 2 } })
    observer.setOptions(fixture.options(position))
    assert.equal(observer.getCurrentResult().data, undefined)
    await observer.refetch()
    assert.equal(fixture.calls.length, 2)
    fixture.setAuth({ status: 'authenticated', user: { userId: 1 } })
    observer.setOptions(fixture.options(position))
    assert.deepEqual(observer.getCurrentResult().data, [{ questId: 10 }])
    assert.equal(fixture.calls.length, 2)
  } finally {
    stop()
    client.clear()
  }
})

test('마지막 구독 해제 시 진행 중인 API에 취소 신호를 보낸다', () => {
  const fixture = setup(() => new Promise(() => {}))
  const client = new QueryClient({ defaultOptions: { queries: { gcTime: Infinity } } })
  const observer = new QueryObserver(client, fixture.options(position))
  const stop = observer.subscribe(() => {})
  assert.equal(fixture.calls.length, 1)
  assert.equal(fixture.calls[0].signal.aborted, false)
  stop()
  assert.equal(fixture.calls[0].signal.aborted, true)
  client.clear()
})
