import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'
import test from 'node:test'
import ts from 'typescript'

const records = [
  { id: '101', questId: '22', title: '카페', questType: 'GENERAL', difficulty: 1, location: { lat: 35, lng: 128 } },
  { id: '102', questId: '23', title: '학교', questType: 'IMAGE', difficulty: 2, location: { lat: 36, lng: 129 } },
]

function fixture() {
  let cursor = 0, loadMap
  const slots = [], pending = [], timers = [], maps = [], markers = [], observers = []
  const panel = { top: 400, getBoundingClientRect() { return { top: this.top } } }
  const element = {
    clientHeight: 600, getBoundingClientRect: () => ({ bottom: 600 }),
    closest: () => ({ querySelector: () => panel }), replaceChildren() {},
  }
  const dependenciesChanged = (a, b) => !a || b.some((value, i) => !Object.is(a[i], value))
  const react = {
    useMemo(fn, deps) {
      const i = cursor++
      if (!slots[i] || dependenciesChanged(slots[i].deps, deps)) slots[i] = { deps, value: fn() }
      return slots[i].value
    },
    useRef(value) { const i = cursor++; return slots[i] ??= { current: value === null && i === 2 ? element : value } },
    useState(initial) {
      const i = cursor++
      if (!(i in slots)) slots[i] = initial
      return [slots[i], value => { slots[i] = value }]
    },
    useEffectEvent(fn) {
      const i = cursor++
      if (!slots[i]) slots[i] = { fn, event: (...args) => slots[i].fn(...args) }
      slots[i].fn = fn
      return slots[i].event
    },
    useEffect(fn, deps) {
      const i = cursor++
      if (!slots[i] || dependenciesChanged(slots[i].deps, deps)) pending.push(() => {
        slots[i]?.cleanup?.()
        slots[i] = { deps, cleanup: fn() }
      })
    },
  }
  const sdk = {
    maps: {
      load(fn) { loadMap = fn },
      LatLng: class { constructor(lat, lng) { this.lat = lat; this.lng = lng } },
      Point: class { constructor(x, y) { this.x = x; this.y = y } },
      LatLngBounds: class { extend() {} },
      Map: class {
        constructor(_element, options) { this.level = options.level; this.levels = []; this.calls = []; this.pans = []; this.bounds = 0; maps.push(this) }
        setLevel(level) { this.level = level; this.levels.push(level); this.calls.push('level') }
        getProjection() { this.calls.push('projection'); return { containerPointFromCoords: ({ lat, lng }) => ({ x: lng, y: lat }), coordsFromContainerPoint: p => p } }
        relayout() {}
        panTo(p) { this.pans.push(p); this.calls.push('pan') }
        setBounds() { this.bounds++ }
      },
      Marker: class {
        constructor() { markers.push(this) }
        setZIndex(value) { this.zIndex = value }
        setImage(value) { this.image = value }
        setMap(value) { this.map = value }
      },
      event: { addListener(marker, _event, fn) { marker.click = fn }, removeListener(marker) { delete marker.click } },
    },
  }
  const code = ts.transpileModule(readFileSync(new URL('../src/features/history/components/HistoryMap.tsx', import.meta.url), 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX },
  }).outputText
  const module = { exports: {} }
  runInNewContext(code, {
    module, exports: module.exports, window: { kakao: sdk },
    setTimeout(fn, ms) { const timer = { fn, ms }; timers.push(timer); return timer }, clearTimeout() {},
    ResizeObserver: class { constructor(fn) { this.resize = fn; observers.push(this) } observe() {} disconnect() { this.disconnected = true } },
    require(id) {
      if (id === 'react') return react
      if (id === 'react/jsx-runtime') return { jsx: (type, props) => ({ type, props }), jsxs: (type, props) => ({ type, props }) }
      if (id === '@tanstack/react-query') return { useQueries: () => [] }
      if (id.endsWith('/createQuestMarkerImage')) return { createQuestMarkerImage: (_maps, type, difficulty, selected, offset) => ({ type, difficulty, selected, offset }) }
      if (id.endsWith('/verification')) return { isQuestId: () => true }
      if (id === '../lib/locations') return { locatedRecords: items => items.filter(item => item.location) }
      throw new Error(`Unexpected dependency: ${id}`)
    },
  })
  let props = { records, selectedRecordId: null, focusRequest: 0, token: null, onSelectRecord() {} }
  return {
    maps, markers, observers, panel, timers,
    render(next = {}) {
      props = { ...props, ...next }; cursor = 0
      const tree = module.exports.HistoryMap(props)
      while (pending.length) pending.shift()()
      return tree
    },
    ready() { loadMap() },
    unmount() { slots.forEach(slot => slot?.cleanup?.()) },
  }
}

test('카드 선택·재선택은 지도를 재생성하지 않고 보이는 영역으로 이동하며 마커를 강조한다', () => {
  const f = fixture()
  f.render(); f.ready(); f.render()
  assert.equal(f.maps[0].levels.length, 0, '선택 전에는 전체 장소 보기 축척을 유지한다')
  let clicked
  f.render({ selectedRecordId: '102', focusRequest: 1, onSelectRecord: id => { clicked = id } })
  assert.equal(f.maps.length, 1)
  assert.equal(f.markers[1].zIndex, 10)
  assert.equal(f.markers[1].image.selected, true)
  assert.equal(f.maps[0].level, 4)
  assert.deepEqual(f.maps[0].calls.slice(-3), ['level', 'projection', 'pan'])
  assert.equal(f.maps[0].pans.at(-1).x, 129)
  assert.equal(f.maps[0].pans.at(-1).y, 36 + 106)
  const before = f.maps[0].pans.length
  f.maps[0].level = 7 // 사용자가 직접 축소한 상태
  f.render({ focusRequest: 2 })
  assert.equal(f.maps[0].pans.length, before + 1)
  assert.equal(f.maps[0].level, 4, '같은 카드 재선택 시 100m 축척으로 복귀한다')
  f.markers[0].click()
  assert.equal(clicked, '101')
  f.panel.top = 360
  const levelsBeforeResize = f.maps[0].levels.length
  f.maps[0].level = 6
  f.observers[0].resize()
  assert.equal(f.maps[0].pans.at(-1).y, 36 + 126)
  assert.equal(f.maps[0].levels.length, levelsBeforeResize)
  assert.equal(f.maps[0].level, 6, '패널 크기 변경은 사용자 확대 수준을 바꾸지 않는다')
  f.unmount()
  assert.equal(f.markers[0].click, undefined)
  assert.equal(f.markers[0].map, null)
  assert.equal(f.observers[0].disconnected, true)
})

test('SDK 준비 전에 선택한 카드도 로딩 완료 후 이동하고, 시간 초과된 콜백은 지도를 만들지 않는다', () => {
  const f = fixture()
  f.render({ selectedRecordId: '101' })
  f.render({ selectedRecordId: '102', focusRequest: 1 })
  f.ready(); f.render()
  assert.equal(f.maps.length, 1)
  assert.equal(f.maps[0].pans.at(-1).x, 129)
  assert.equal(f.maps[0].level, 4)
  const failed = fixture()
  failed.render()
  failed.timers.find(timer => timer.ms === 8000).fn()
  failed.ready()
  assert.equal(failed.maps.length, 0)
  failed.unmount(); f.unmount()
})

test('동일 좌표의 선택 마커는 좌우 오프셋을 제거하고 선택 해제된 마커는 원래 간격으로 돌아간다', () => {
  const f = fixture()
  const overlapping = records.map(record => ({ ...record, location: records[0].location }))
  f.render({ records: overlapping }); f.ready(); f.render()
  assert.equal(f.markers[0].image.offset, -28)
  assert.equal(f.markers[1].image.offset, 28)
  f.render({ selectedRecordId: '102' })
  assert.equal(f.markers[1].image.offset, 0)
  assert.equal(f.markers[0].image.offset, -28)
  f.render({ selectedRecordId: '101' })
  assert.equal(f.markers[0].image.offset, 0)
  assert.equal(f.markers[1].image.offset, 28)
  f.unmount()
})

test('위치가 없는 기록을 선택하면 기존 지도의 확대 수준과 중심을 바꾸지 않는다', () => {
  const f = fixture()
  f.render({ records: [...records, { id: '103', title: '위치 없음' }] })
  f.ready(); f.render()
  f.maps[0].level = 8
  const before = f.maps[0].pans.length
  f.render({ selectedRecordId: '103', focusRequest: 1 })
  assert.equal(f.maps[0].level, 8)
  assert.equal(f.maps[0].pans.length, before)
  f.unmount()
})

test('다른 안부 Drawer를 열고 높이를 바꿔도 지도와 확대 수준을 유지하며 가리지 않는 중앙으로 이동한다', () => {
  const f = fixture()
  f.render({ selectedRecordId: '101' }); f.ready(); f.render()
  const oldOverlayObserver = f.observers.at(-1)
  f.maps[0].level = 6
  f.panel.top = 280
  f.render({ overlayKey: 'peers' })
  assert.equal(oldOverlayObserver.disconnected, true)
  assert.equal(f.maps.length, 1)
  assert.equal(f.maps[0].level, 6)
  assert.equal(f.maps[0].pans.at(-1).y, 35 + 166)
  f.panel.top = 180
  f.observers.at(-1).resize()
  assert.equal(f.maps[0].pans.at(-1).y, 35 + 216)
  f.render({ overlayKey: 'records' })
  assert.equal(f.maps.length, 1)
  f.unmount()
})
