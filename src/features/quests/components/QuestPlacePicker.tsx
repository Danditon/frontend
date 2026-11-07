import { useEffect, useRef, useState } from 'react'
import { MapPin, Search } from 'lucide-react'
import type { RegistrationPlace } from '../api/questRegistration'

export function QuestPlacePicker({ value, onChange }: {
  value: RegistrationPlace | null
  onChange: (place: RegistrationPlace | null) => void
}) {
  const [keyword, setKeyword] = useState(value?.placeName ?? '')
  const [results, setResults] = useState<RegistrationPlace[]>([])
  const [message, setMessage] = useState('')
  const [searching, setSearching] = useState(false)
  const requestId = useRef(0)
  const timer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined)

  useEffect(() => () => {
    requestId.current += 1
    clearTimeout(timer.current)
  }, [])

  function search() {
    const term = keyword.trim()
    if (!term || searching) return

    const maps = window.kakao?.maps
    if (!maps) {
      setMessage('카카오 지도에 연결하지 못했어요. 새로고침 후 다시 검색해 주세요.')
      return
    }

    const id = ++requestId.current
    setSearching(true)
    setResults([])
    setMessage('')
    timer.current = setTimeout(() => {
      if (requestId.current !== id) return
      requestId.current += 1
      setSearching(false)
      setMessage('장소 검색 시간이 초과됐어요. 다시 시도해 주세요.')
    }, 10000)

    function finish(places: RegistrationPlace[], error = '') {
      if (requestId.current !== id) return
      clearTimeout(timer.current)
      setSearching(false)
      setResults(places)
      setMessage(error)
    }

    maps.load(() => {
      if (requestId.current !== id) return
      const Places = maps.services?.Places
      if (!Places) {
        finish([], '장소 검색 기능을 불러오지 못했어요.')
        return
      }
      new Places().keywordSearch(term, (items, status) => {
        if (status !== 'OK') {
          finish([], status === 'ZERO_RESULT' ? '검색 결과가 없어요.' : '장소를 검색하지 못했어요.')
          return
        }
        const places = items.map(item => ({
          placeName: item.place_name,
          address: item.road_address_name || item.address_name,
          lat: Number(item.y),
          lng: Number(item.x),
        })).filter(place => place.address && Number.isFinite(place.lat) && Number.isFinite(place.lng))
        finish(places.slice(0, 5), places.length ? '' : '선택할 수 있는 장소가 없어요.')
      })
    })
  }

  return (
    <div className="space-y-2">
      <label htmlFor="longing-place" className="block text-sm font-semibold">그리운 장소</label>
      <div className="flex gap-2">
        <input id="longing-place" value={keyword} placeholder="장소 이름이나 주소로 검색"
          className="min-w-0 flex-1 rounded-full bg-neutral-100 px-4 py-3 text-sm"
          onChange={event => {
            requestId.current += 1
            clearTimeout(timer.current)
            setSearching(false)
            setKeyword(event.target.value)
            onChange(null)
            setResults([])
            setMessage('')
          }}
          onKeyDown={event => {
            if (event.key === 'Enter') {
              event.preventDefault()
              search()
            }
          }}
        />
        <button type="button" aria-label="장소 검색" disabled={!keyword.trim() || searching}
          onClick={search} className="grid size-11 shrink-0 place-items-center rounded-full bg-neutral-100 disabled:opacity-50">
          <Search size={18} />
        </button>
      </div>
      {value && <p className="flex items-center gap-1 text-xs text-neutral-600"><MapPin size={14} />{value.address}</p>}
      {searching && <p role="status" className="text-xs">장소 검색 중…</p>}
      {message && <p role="status" className="text-xs">{message}</p>}
      {results.length > 0 && (
        <ul className="max-h-48 divide-y overflow-auto rounded-2xl bg-neutral-100">
          {results.map((place, index) => (
            <li key={`${place.lat}:${place.lng}:${index}`}>
              <button type="button" className="block w-full px-4 py-3 text-left text-sm"
                onClick={() => {
                  onChange(place)
                  setKeyword(place.placeName)
                  setResults([])
                }}>
                <strong>{place.placeName}</strong>
                <span className="mt-1 block text-xs text-neutral-600">{place.address}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
