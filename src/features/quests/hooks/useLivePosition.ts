import { useEffect, useState } from 'react'
import { locationErrors, type LocationError, type UserPosition } from './useGeolocation'

// 최초 조회·위치 버튼의 좌표와 별도로 홈 지도에 표시할 최신 좌표만 구독합니다.
export function useLivePosition(position: UserPosition | null) {
  const [update, setUpdate] = useState<{
    source: UserPosition
    position: UserPosition | null
    error: LocationError | null
  } | null>(null)

  useEffect(() => {
    if (!position || typeof navigator === 'undefined' || !navigator.geolocation) return
    let active = true
    let watchId: number | undefined
    const onError = ({ code }: { code: number }) => {
      if (!active) return
      // 일시적인 GPS 오류에서도 마지막으로 확인한 점은 유지합니다.
      setUpdate(previous => ({
        source: position,
        position: previous?.source === position ? previous.position : null,
        error: locationErrors[code] ?? locationErrors[2],
      }))
    }
    try {
      watchId = navigator.geolocation.watchPosition(({ coords, timestamp }) => {
        if (!active) return
        const next = { lat: coords.latitude, lng: coords.longitude, accuracy: coords.accuracy, timestamp }
        setUpdate(previous => ({
          source: position,
          position: previous?.source === position && previous.position && previous.position.timestamp > timestamp
            ? previous.position : next,
          error: null,
        }))
      }, onError, { enableHighAccuracy: true, maximumAge: 0, timeout: 10000 })
    } catch {
      queueMicrotask(() => onError({ code: 2 }))
    }
    return () => {
      active = false
      if (watchId !== undefined) navigator.geolocation.clearWatch(watchId)
    }
  }, [position])

  const current = update?.source === position ? update : null
  return {
    position: current?.position && position && current.position.timestamp >= position.timestamp ? current.position : position,
    error: current?.error ?? null,
  }
}
