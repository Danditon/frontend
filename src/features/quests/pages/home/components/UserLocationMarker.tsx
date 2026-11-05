// 사용자 조회된 현재 위치를 카카오 지도에 표시하고, 마커의 생성·갱신·제거를 관리하는 컴포넌트입니다.
import { useEffect, useRef } from 'react'
import type { UserPosition } from '@/features/quests/hooks/useGeolocation'
import type { KakaoMap, KakaoMarker } from '../types/kakaoMaps'

type UserLocationMarkerProps = {
  map: KakaoMap | null // 생성 완료된 카카오 지도
  position: UserPosition | null // 브라우저에서 조회한 현재 위치
}

export default function UserLocationMarker({
  map,
  position,
}: UserLocationMarkerProps) {
  // 마커 객체를 보관해 위치를 다시 조회해도 새 마커가 겹쳐 생기지 않게 합니다.
  const markerRef = useRef<KakaoMarker | null>(null)

  // 지도 또는 조회한 좌표가 바뀌면 마커를 생성하거나 갱신합니다.
  useEffect(() => {
    // 지도나 유효한 위치가 없으면 이전 마커를 지도에서 제거합니다.
    if (!map || !position) {
      markerRef.current?.setMap(null)
      markerRef.current = null
      return
    }

    const maps = window.kakao?.maps
    if (!maps) return

    // 앱의 lat/lng를 SDK가 사용하는 좌표 객체로 변환합니다.
    const target = new maps.LatLng(position.lat, position.lng)

    if (markerRef.current) {
      // 기존 마커의 위치만 갱신하고, 현재 지도에 연결합니다.
      markerRef.current.setPosition(target)
      markerRef.current.setMap(map)
    } else {
      // 최초 위치 조회 성공 시 마커를 하나 생성합니다.
      markerRef.current = new maps.Marker({
        map,
        position: target,
        title: '내 위치',
      })
    }
  }, [map, position])

  // 좌표 변경 때마다 마커를 재생성하지 않도록 종료 시 정리는 따로 둡니다.
  useEffect(() => {
    return () => {
      markerRef.current?.setMap(null)
      markerRef.current = null
    }
  }, [])

  // 마커는 카카오 SDK가 그리므로 React가 출력할 HTML은 없습니다.
  return null
}
