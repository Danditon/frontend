import { useEffect, useRef } from 'react'
import type { UserPosition } from '@/features/quests/hooks/useGeolocation'

// 카카오 SDK의 좌표 객체가 제공하는 기능.
// 실제 좌표 객체는 SDK가 만들고, 여기서는 TypeScript 타입만 정의합니다.
type KakaoLatLng = {
  getLat(): number // 위도 반환
  getLng(): number // 경도 반환
}

// 지도 객체의 타입.
// relayout은 지도 영역의 크기가 바뀌었을 때 다시 계산하는 기능
type KakaoMap = {
  relayout(): void
  panTo(position: KakaoLatLng): void // 전달받은 좌표로 지도 중심을 이동합니다.
}

type QuestMapProps = {
  position: UserPosition | null // 홈에서 조회한 현재 위치
}

// TypeScript에 window.kakao가 존재할 수 있다는 것을 알려줍니다.
// SDK를 불러오는 코드가 아니라, 타입을 설명하는 선언입니다.
declare global {
  interface Window {
    // SDK 로딩에 실패하면 없을 수 있으므로 ?를 붙입니다.
    kakao?: {
      maps: {
        // SDK가 준비되면 전달한 함수를 실행합니다.
        load(callback: () => void): void

        // new maps.LatLng(위도, 경도)로 좌표 객체를 만듭니다.
        LatLng: new (
          latitude: number,
          longitude: number,
        ) => KakaoLatLng

        // new maps.Map(HTML 요소, 설정)으로 지도 객체를 만듭니다.
        Map: new (
          container: HTMLElement,
          options: {
            center: KakaoLatLng // 처음 보여줄 지도 중심
            level: number      // 확대 수준
          },
        ) => KakaoMap
      }
    }
  }
}

export default function QuestMap({ position }: QuestMapProps) {
  // 아래 JSX의 div 요소에 접근하기 위한 ref입니다.
  // 첫 렌더링 전에는 실제 div가 없으므로 초기값은 null입니다.
  const containerRef = useRef<HTMLDivElement>(null)
  const mapRef = useRef<KakaoMap | null>(null) // 생성한 지도를 보관해 다시 사용합니다.
  const latestPositionRef = useRef<UserPosition | null>(position)

  // 위치 조회가 성공하면 기존 지도의 중심만 이동합니다.
  useEffect(() => {
    // SDK 로딩보다 위치 조회가 먼저 끝나도 최신 좌표를 기억합니다.
    latestPositionRef.current = position

    const map = mapRef.current
    const maps = window.kakao?.maps

    if (!position || !map || !maps) return

    map.panTo(new maps.LatLng(position.lat, position.lng))
  }, [position])

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
      mapRef.current = new maps.Map(container, {
        center: new maps.LatLng(initialPosition.lat, initialPosition.lng),

        // 숫자가 작을수록 확대되고, 클수록 넓은 지역이 보입니다.
        level: 3,
      })
    })

    // 화면을 떠나거나 Effect가 다시 실행되기 전에 호출됩니다.
    return () => {
      // 뒤늦게 실행되는 load 콜백의 지도 생성을 막습니다.
      cancelled = true
      mapRef.current = null // 화면을 떠날 때 이전 지도 참조를 해제합니다.

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
    />
  )
}