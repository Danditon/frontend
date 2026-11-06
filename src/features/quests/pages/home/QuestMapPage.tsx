// 홈 지도의 위치 안내·가까운 퀘스트·수행 중 카드와 목록·상세 Drawer를 연결하는 화면입니다.
import { useCallback, useState } from 'react'
import { useNavigate } from 'react-router'
import type { NearbyQuest } from '@/features/quests/types/quest'
import QuestMap from './components/QuestMap.tsx'
import NearbyQuestCountCard from './components/NearbyQuestCountCard'
import QuestListDrawer from './components/QuestListDrawer'
import QuestDetailDrawer from './components/QuestDetailDrawer'
import ActiveQuestCard from './components/ActiveQuestCard'
import LocationPromptCard from './components/LocationPromptCard'
import HomeHeader from './components/HomeHeader'
import { mockNearbyQuests } from './mocks/nearbyQuests'
import CurrentLocationButton from './components/CurrentLocationButton'
import { useGeolocation } from '@/features/quests/hooks/useGeolocation'
import { useQuestDetail } from '@/features/quests/hooks/useQuestDetail'
import { useActiveQuest } from '@/features/quests/hooks/useActiveQuest'
import { getNearestQuest } from './utils/getNearestQuest'
import { getQuestVerifyPath } from './utils/getQuestVerifyPath'

export default function QuestMapPage() {
  // 홈에서 위치 조회 상태를 관리하고, 버튼과 결과 표시에 연결합니다.
  const { position, isLocating, error, requestLocation } = useGeolocation()
  const navigate = useNavigate()
  const { activeQuestId } = useActiveQuest()
  // 지도 표시 범위가 아닌 사용자 좌표를 기준으로 전체 목록에서 가장 가까운 항목을 찾습니다.
  const nearestQuest = getNearestQuest(mockNearbyQuests, position)
  // 위치 조회가 실패하거나 홈에 다시 들어와도 수행 중인 퀘스트를 우선합니다.
  const displayQuestId = activeQuestId ?? nearestQuest?.questId ?? null
  const cardMode = activeQuestId !== null ? 'active' : 'nearest'
  const cardQuery = useQuestDetail(displayQuestId)
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

  function handleQuestCardSelect(questId: number) {
    if (cardMode === 'nearest') {
      handleQuestSelect(questId)
      return
    }

    const quest = cardQuery.data
    if (!quest || quest.questId !== questId) return

    // 수행 중 카드는 상세를 다시 거치지 않고 인증 화면으로 이어갑니다.
    navigate(getQuestVerifyPath(quest))
  }

  function renderQuestCard() {
    if (displayQuestId === null) {
      if (!position) {
        return (
          <LocationPromptCard
            isLocating={isLocating}
            onRequestLocation={() => {
              void requestLocation()
            }}
          />
        )
      }

      return (
        <p role="status" className="grid h-full place-items-center rounded-3xl bg-[#EDF4F5]/95 p-3 text-sm">
          주변에 등록된 퀘스트가 없어요.
        </p>
      )
    }

    if (cardQuery.isPending || cardQuery.isError) {
      return (
        <p
          role={cardQuery.isError ? 'alert' : 'status'}
          className="grid h-full place-items-center rounded-3xl bg-[#EDF4F5]/95 p-3 text-sm"
        >
          {cardQuery.isError
            ? cardQuery.error.message
            : '퀘스트를 불러오는 중이에요.'}
        </p>
      )
    }

    if (!cardQuery.data) return null

    return (
      <ActiveQuestCard
        quest={cardQuery.data}
        mode={cardMode}
        onSelect={handleQuestCardSelect}
      />
    )
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
      <div className="pointer-events-none absolute inset-x-0 top-0 z-10 px-4 pt-[calc(0.75rem+env(safe-area-inset-top,0px))]">
        <HomeHeader />
      </div>

      {/* Drawer가 닫혀 있을 때 현재 상태의 카드·개수 카드·현위치 버튼을 보여줍니다. */}
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
            {/* 세 상태와 로딩·오류 모두 같은 카드 크기를 사용합니다. */}
            <div className="relative aspect-[51/35] min-w-0">
              {renderQuestCard()}
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
