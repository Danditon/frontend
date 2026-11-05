// 홈 지도와 개수 카드·목록·상세 Drawer의 선택 상태를 연결하는 화면입니다.
import { useCallback, useState } from 'react'
import type { NearbyQuest } from '@/features/quests/types/quest'
import QuestMap from './components/QuestMap.tsx'
import NearbyQuestCountCard from './components/NearbyQuestCountCard'
import QuestListDrawer from './components/QuestListDrawer'
import QuestDetailDrawer from './components/QuestDetailDrawer'
import { mockNearbyQuests } from './mocks/nearbyQuests'
import CurrentLocationButton from './components/CurrentLocationButton'
import { useGeolocation } from '@/features/quests/hooks/useGeolocation'

export default function QuestMapPage() {
  // 홈에서 위치 조회 상태를 관리하고, 버튼과 결과 표시에 연결합니다.
  const { position, isLocating, error, requestLocation } = useGeolocation()
  const [visibleQuests, setVisibleQuests] = useState<NearbyQuest[] | null>(null)
  const [isListOpen, setIsListOpen] = useState(false)
  const [listSnapshot, setListSnapshot] = useState<NearbyQuest[]>([])
  const [selectedQuestId, setSelectedQuestId] = useState<number | null>(null)
  const [drawerTop, setDrawerTop] = useState<number | null>(null)

  // 마커와 목록 행이 같은 상세 Drawer를 사용합니다.
  const handleQuestSelect = useCallback((questId: number) => {
    setIsListOpen(false)
    setSelectedQuestId(questId)

    // TODO: 선택한 ID로 GET /quests/{questId} 상세 API를 요청할 위치입니다.
    // 현재는 mock 목록으로 UI와 선택 동작만 확인합니다.
  }, [])

  const handleOpenList = () => {
    if (visibleQuests === null) return

    setSelectedQuestId(null)
    setDrawerTop(null)
    // 열린 목록은 지도를 옮겨도 행이 바뀌지 않게 현재 배열을 저장합니다.
    setListSnapshot([...visibleQuests])
    setIsListOpen(true)
  }
  return (

  <div className="fixed inset-0 z-10 h-dvh w-full overflow-hidden bg-neutral-100">
    <section className="relative h-full w-full overflow-hidden">
      <h1 className="sr-only">
        홈·퀘스트 지도
      </h1>

      {/* 지도 영역을 담당하는 컴포넌트 */}
      <QuestMap
        position={position}
        quests={mockNearbyQuests}
        selectedQuestId={selectedQuestId}
        drawerTop={drawerTop}
        onQuestSelect={handleQuestSelect}
        onVisibleQuestsChange={setVisibleQuests}
      />

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

      {/* Drawer가 닫혀 있을 때 개수 카드와 현위치 버튼을 보여줍니다. */}
      {!isListOpen && selectedQuestId === null && (
        <div className="pointer-events-none absolute inset-x-4 bottom-[calc(7rem+env(safe-area-inset-bottom,0px))] z-20">
          {/* 카드 높이가 달라져도 현위치 버튼이 겹치지 않게 행 위에 배치합니다. */}
          <div className="mb-3 flex justify-end">
            <div className="pointer-events-auto">
              <CurrentLocationButton
                isLocating={isLocating}
                onClick={() => {
                  void requestLocation()
                }}
              />
            </div>
          </div>
          <div className="grid grid-cols-[minmax(0,1.7fr)_minmax(0,1fr)] gap-3">
            <div aria-hidden="true">{/* 추후 선택한 퀘스트 카드를 배치할 영역 */}</div>
            <NearbyQuestCountCard
              count={visibleQuests?.length ?? null}
              onClick={handleOpenList}
            />
          </div>
        </div>
      )}

      <QuestListDrawer
        open={isListOpen}
        quests={listSnapshot}
        onClose={() => setIsListOpen(false)}
        onSelect={handleQuestSelect}
      />
      <QuestDetailDrawer
        questId={selectedQuestId}
        onPositionChange={setDrawerTop}
        onClose={() => {
          setSelectedQuestId(null)
          setDrawerTop(null)
        }}
      />
    </section>
  </div>
  )
}
