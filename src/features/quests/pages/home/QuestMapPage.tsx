import QuestMap from './components/QuestMap.tsx'
import CurrentLocationButton from './components/CurrentLocationButton'
import { useGeolocation } from '@/features/quests/hooks/useGeolocation'

export default function QuestMapPage() {
  // 홈에서 위치 조회 상태를 관리하고, 버튼과 결과 표시에 연결합니다.
  const { position, isLocating, error, requestLocation } = useGeolocation()
  return (

  <div className="fixed inset-0 z-10 h-dvh w-full overflow-hidden bg-neutral-100">
    <section className="relative h-full w-full overflow-hidden">
      <h1 className="sr-only">
        홈·퀘스트 지도
      </h1>

      {/* 지도 영역을 담당하는 컴포넌트 */}
      <QuestMap position={position} />

      {/* 위치 권한 거절·시간 초과 등은 사용자에게 안내합니다. */}
      {error && (
        <p
          role="alert"
          className="absolute inset-x-4 top-20 z-20 rounded-lg bg-white p-3 text-sm text-red-600 shadow"
        >
          {error.message}
        </p>
      )}

      {/* 개발 중에만 조회된 좌표와 정확도를 표시해 위치 조회 결과를 확인합니다. */}
      {import.meta.env.DEV && position && (
        <output
          aria-live="polite"
          className="absolute left-4 top-36 z-20 rounded-lg bg-white p-3 text-xs shadow"
        >
          <div>위도: {position.lat.toFixed(6)}</div>
          <div>경도: {position.lng.toFixed(6)}</div>
          <div>정확도 범위: {Math.round(position.accuracy)}m</div>
        </output>
      )}

      {/* 지도 위 상단 UI */}
      <div className="absolute inset-x-0 top-0 z-10 p-4">
        {/* 지역명·벨·MY 컴포넌트 */}
      </div>

      {/* 지도 위 현위치 버튼 */}
      <div className="absolute bottom-40 right-4 z-10">
        <CurrentLocationButton
          isLocating={isLocating}
          onClick={() => {
            // 조회 결과는 훅의 position과 error로 받으므로 반환값은 여기서 사용하지 않습니다.
            void requestLocation()
          }}
        />
      </div>

      {/* 지도 위 하단 UI */}
      <div className="absolute inset-x-0 bottom-0 z-10 p-4">
        {/* 퀘스트 카드·하단 메뉴 컴포넌트 */}
      </div>
    </section>
  </div>
  )
}
