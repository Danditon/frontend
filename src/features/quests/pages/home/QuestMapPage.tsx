// 홈 지도와 가까운 퀘스트 카드·개수 카드·목록·상세 Drawer의 선택 상태를 연결하는 화면입니다.
import { useCallback, useState } from 'react'
import type { NearbyQuest } from '@/features/quests/types/quest'
import QuestMap from './components/QuestMap.tsx'
import NearbyQuestCountCard from './components/NearbyQuestCountCard'
import QuestListDrawer from './components/QuestListDrawer'
import QuestDetailDrawer from './components/QuestDetailDrawer'
import ActiveQuestCard from './components/ActiveQuestCard'
import { mockNearbyQuests } from './mocks/nearbyQuests'
import CurrentLocationButton from './components/CurrentLocationButton'
import { useGeolocation } from '@/features/quests/hooks/useGeolocation'
import { useQuestDetail } from '@/features/quests/hooks/useQuestDetail'
import { getNearestQuest } from './utils/getNearestQuest'

export default function QuestMapPage() {
  // 홈에서 위치 조회 상태를 관리하고, 버튼과 결과 표시에 연결합니다.
  const { position, isLocating, error, requestLocation } = useGeolocation()
  // 지도 표시 범위가 아닌 사용자 좌표를 기준으로 전체 목록에서 가장 가까운 항목을 찾습니다.
  const nearestQuest = getNearestQuest(mockNearbyQuests, position)
  const nearestQuestQuery = useQuestDetail(nearestQuest?.questId ?? null)
  const nearestQuestDetail = nearestQuestQuery.data
  const [visibleQuests, setVisibleQuests] = useState<NearbyQuest[] | null>(null)
  const [isListOpen, setIsListOpen] = useState(false)
  const [listSnapshot, setListSnapshot] = useState<NearbyQuest[]>([])
  const [selectedQuestId, setSelectedQuestId] = useState<number | null>(null)
  const [drawerTop, setDrawerTop] = useState<number | null>(null)

  // 마커·목록 행·가까운 퀘스트 카드가 같은 상세 Drawer를 사용합니다.
  const handleQuestSelect = useCallback((questId: number) => {
    setIsListOpen(false)
    setSelectedQuestId(questId)

    // 선택한 ID의 상세 조회는 QuestDetailDrawer의 useQuestDetail에서 처리합니다.
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

      {/* Drawer가 닫혀 있을 때 가까운 퀘스트 카드·개수 카드·현위치 버튼을 보여줍니다. */}
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
            {/* 현재 위치를 확인한 뒤 가까운 퀘스트를 표시하고, 카드 선택도 마커 선택과 연결합니다. */}
            <div className="min-w-0">
              {!position && (
                <p role="status" className="rounded-3xl bg-white/80 p-4 text-sm">
                  {isLocating
                    ? '현재 위치를 확인하는 중이에요.'
                    : '가까운 퀘스트를 보려면 현위치 버튼을 눌러주세요.'}
                </p>
              )}
              {position && !nearestQuest && (
                <p role="status" className="rounded-3xl bg-white/80 p-4 text-sm">
                  주변에 등록된 퀘스트가 없어요.
                </p>
              )}
              {nearestQuestDetail && (
                <ActiveQuestCard
                  quest={nearestQuestDetail}
                  onSelect={handleQuestSelect}
                />
              )}
              {nearestQuest !== null && nearestQuestQuery.isPending && (
                <p role="status" className="rounded-3xl bg-white/80 p-4 text-sm">
                  가까운 퀘스트를 불러오는 중이에요.
                </p>
              )}
              {nearestQuestQuery.isError && (
                <p role="alert" className="rounded-3xl bg-white/80 p-4 text-sm">
                  {nearestQuestQuery.error.message}
                </p>
              )}
            </div>
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
