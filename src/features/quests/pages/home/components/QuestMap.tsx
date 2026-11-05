// 카카오 지도를 생성하고 현재 위치로 중심을 이동시키며, 내 위치 마커 컴포넌트를 연결합니다.
import { useEffect, useRef, useState } from 'react'
import type { UserPosition } from '@/features/quests/hooks/useGeolocation'
import type { NearbyQuest } from '@/features/quests/types/quest'
import type { KakaoMap } from '../types/kakaoMaps'
import UserLocationMarker from './UserLocationMarker'
import QuestMarkers from './QuestMarkers'

type QuestMapProps = {
  quests: NearbyQuest[] // 지도에 표시할 퀘스트 배열
  position: UserPosition | null // 홈에서 조회한 현재 위치
}

export default function QuestMap({ position, quests }: QuestMapProps) {
  // 아래 JSX의 div 요소에 접근하기 위한 ref입니다.
  // 첫 렌더링 전에는 실제 div가 없으므로 초기값은 null입니다.
  const containerRef = useRef<HTMLDivElement>(null)
  // 지도 생성 완료를 React에 알려 마커 컴포넌트에도 지도 객체를 전달합니다.
  const [map, setMap] = useState<KakaoMap | null>(null)
  const latestPositionRef = useRef<UserPosition | null>(position)

  // 위치 조회가 성공하면 기존 지도의 중심만 이동합니다.
  useEffect(() => {
    // SDK 로딩보다 위치 조회가 먼저 끝나도 최신 좌표를 기억합니다.
    latestPositionRef.current = position

    const maps = window.kakao?.maps

    if (!position || !map || !maps) return

    map.panTo(new maps.LatLng(position.lat, position.lng))
  }, [map, position])

  // React가 div를 화면에 연결한 다음 지도 생성 작업을 실행합니다.
  useEffect(() => {
    const container = containerRef.current

    // index.html에서 불러온 SDK는 window.kakao에 연결됩니다.
    // ?.는 kakao가 없어도 여기서 바로 오류가 나지 않게 합니다.
    const maps = window.kakao?.maps

    // 지도를 담을 HTML 요소가 없으면 진행하지 않습니다.
    if (!container) return

    // SDK를 불러오지 못했다면 개발자 도구 Console에 안내합니다.
    if (!maps) {
      console.error(
        '카카오 지도 SDK를 불러오지 못했습니다. Network 탭을 확인해주세요.',
      )
      return
    }

    // SDK를 기다리는 도중 이 화면을 떠났는지 기록합니다.
    let cancelled = false

    // autoload=false로 불러온 지도 SDK의 준비 완료를 기다립니다.
    maps.load(() => {
      // 기다리는 동안 컴포넌트가 사라졌다면 지도를 생성하지 않습니다.
      if (cancelled) return

      // 이미 조회된 위치가 있으면 그곳에서 시작하고, 없으면 기본 지도 좌표를 사용합니다.
      const initialPosition = latestPositionRef.current ?? {
        lat: 35.8714,
        lng: 128.6014,
      }

      // 지도 객체를 저장해 이후 위치 조회 시 새로 만들지 않고 이동시킵니다.
      const createdMap = new maps.Map(container, {
        center: new maps.LatLng(initialPosition.lat, initialPosition.lng),

        // 숫자가 작을수록 확대되고, 클수록 넓은 지역이 보입니다.
        level: 3,
      })
      setMap(createdMap)
    })

    // 화면을 떠나거나 Effect가 다시 실행되기 전에 호출됩니다.
    return () => {
      // 뒤늦게 실행되는 load 콜백의 지도 생성을 막습니다.
      cancelled = true

      // SDK가 div 안에 추가한 지도 DOM을 비웁니다.
      container.replaceChildren()
    }
  }, []) // 일반 재렌더링으로는 다시 실행하지 않습니다.

  return (
    <div
      // 이 div를 위의 containerRef.current로 접근할 수 있게 연결합니다.
      ref={containerRef}
      aria-label="퀘스트 지도"
      // 지도는 실제 높이가 있어야 보입니다.
      // 부모 화면 영역의 너비와 높이를 모두 채웁니다.
      className="absolute inset-0 z-0 h-full w-full"
    >
      {/* 지도와 최신 좌표를 전달하면 마커 컴포넌트가 표시·갱신을 담당합니다. */}
      <UserLocationMarker map={map} position={position} />
      {/* 퀘스트 배열의 좌표별로 마커를 표시합니다. */}
      <QuestMarkers map={map} quests={quests} />
    </div>
  )
}