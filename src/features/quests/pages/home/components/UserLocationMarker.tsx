// 조회된 내 위치를 작은 파란 점으로 표시하고 마커의 생성·갱신·제거를 관리하는 컴포넌트입니다.
import { useEffect, useRef } from 'react'
import type { UserPosition } from '@/features/quests/hooks/useGeolocation'
import type { KakaoCustomOverlay, KakaoMap } from '../types/kakaoMaps'
import './userLocationMarker.css'

type UserLocationMarkerProps = {
  map: KakaoMap | null // 생성 완료된 카카오 지도
  position: UserPosition | null // 브라우저에서 조회한 현재 위치
}

export default function UserLocationMarker({
  map,
  position,
}: UserLocationMarkerProps) {
  // 마커 객체를 보관해 위치를 다시 조회해도 새 마커가 겹쳐 생기지 않게 합니다.
  const markerRef = useRef<KakaoCustomOverlay | null>(null)
  const attachedMapRef = useRef<KakaoMap | null>(null)

  // 지도 또는 조회한 좌표가 바뀌면 마커를 생성하거나 갱신합니다.
  useEffect(() => {
    // 지도나 유효한 위치가 없으면 이전 마커를 지도에서 제거합니다.
    if (!map || !position) {
      markerRef.current?.setMap(null)
      markerRef.current = null
      attachedMapRef.current = null
      return
    }

    const maps = window.kakao?.maps
    if (!maps) return

    // 앱의 lat/lng를 SDK가 사용하는 좌표 객체로 변환합니다.
    const target = new maps.LatLng(position.lat, position.lng)

    if (markerRef.current) {
      // 기존 마커의 위치만 갱신하고, 현재 지도에 연결합니다.
      markerRef.current.setPosition(target)
      if (attachedMapRef.current !== map) markerRef.current.setMap(map)
    } else {
      // HTML 오버레이를 유지해 GPS가 바뀌어도 맥박 효과를 처음부터 재생하지 않습니다.
      const dot = document.createElement('div')
      dot.className = 'user-location-marker'
      dot.setAttribute('role', 'img')
      dot.setAttribute('aria-label', '내 위치')
      markerRef.current = new maps.CustomOverlay({
        map,
        position: target,
        content: dot,
        xAnchor: 0.5,
        yAnchor: 0.5,
        zIndex: 2,
      })
    }
    attachedMapRef.current = map
  }, [map, position])

  // 좌표 변경 때마다 마커를 재생성하지 않도록 종료 시 정리는 따로 둡니다.
  useEffect(() => {
    return () => {
      markerRef.current?.setMap(null)
      markerRef.current = null
      attachedMapRef.current = null
    }
  }, [])

  // 마커는 카카오 SDK가 그리므로 React가 출력할 HTML은 없습니다.
  return null
}
