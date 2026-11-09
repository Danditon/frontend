// 홈 지도에 가까운 미완료 퀘스트와 목록·상세 Drawer를 연결하는 화면입니다.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate, useOutletContext } from 'react-router'
import type { NearbyQuest } from '@/features/quests/types/quest'
import type { QuestMapOutletContext } from '@/features/quests/types/nearbyNavigation'
import QuestMap from './components/QuestMap.tsx'
import QuestListDrawer from './components/QuestListDrawer'
import QuestDetailDrawer from './components/QuestDetailDrawer'
import QuestDetailMapPhoto, { type QuestDetailMapPhotoData } from './components/QuestDetailMapPhoto'
import QuestQueryErrorNotice from './components/QuestQueryErrorNotice'
import NearestQuestBar from './components/NearestQuestBar'
import HomeHeader from './components/HomeHeader'
import CurrentLocationButton from './components/CurrentLocationButton'
import { useGeolocation } from '@/features/quests/hooks/useGeolocation'
import { useLivePosition } from '@/features/quests/hooks/useLivePosition'
import { useNearbyQuests } from '@/features/quests/hooks/useNearbyQuests'
import { useRegionName } from '@/features/quests/hooks/useRegionName'
import { useNearestQuest } from '@/features/quests/hooks/useNearestQuest'
import { getDistanceMeters } from './utils/getDistanceMeters'
import { getQuestQueryError } from './utils/getQuestQueryError'

// 조회 전에는 같은 빈 배열을 전달해 마커·지도 범위 계산의 불필요한 재실행을 막습니다.
const EMPTY_NEARBY_QUESTS: NearbyQuest[] = []

export default function QuestMapPage() {
  const location = useLocation()
  const navigate = useNavigate()
  const { onNearbyNavigationChange } = useOutletContext<QuestMapOutletContext>()
  // 홈에서 위치 조회 상태를 관리하고, 버튼과 결과 표시에 연결합니다.
  const { position: requestedPosition, isLocating, error: locationError, requestLocation } = useGeolocation()
  const { position, error: liveError } = useLivePosition(requestedPosition)
  const error = locationError ?? liveError

  useEffect(() => {
    let active = true

    // 홈 진입 시 한 번 조회하며, StrictMode의 첫 정리 이후 실행해 중복 요청을 막습니다.
    queueMicrotask(() => {
      if (active) void requestLocation()
    })

    return () => {
      // 조회 시작 전에 화면을 떠났다면 예약된 자동 조회를 실행하지 않습니다.
      active = false
    }
  }, [requestLocation])

  // 실시간 GPS 변화는 마커에 반영하고, 검색은 최초 조회·위치 버튼의 좌표를 사용합니다.
  const nearbyQuery = useNearbyQuests(requestedPosition)
  const nearbyError = nearbyQuery.isError ? getQuestQueryError(nearbyQuery.error, 'nearby') : null
  // 일시적인 갱신 실패는 기존 마커를 유지하고, 인증·권한 거절 결과는 화면에서 제외합니다.
  const nearbyData = nearbyError?.keepPreviousData === false ? undefined : nearbyQuery.data
  // 본인 퀘스트는 홈의 마커·개수·목록·추천에서 함께 제외하고 서버 캐시는 보존합니다.
  // 배열 참조를 유지해 일반 재렌더링마다 마커와 지도 범위 계산이 반복되지 않게 합니다.
  const nearbyQuests = useMemo(
    () => nearbyData?.filter((quest) => !quest.isMine) ?? EMPTY_NEARBY_QUESTS,
    [nearbyData],
  )
  const nearbyState = !position
    ? 'location-required'
    : nearbyData !== undefined
      ? 'ready'
      : nearbyQuery.isError
        ? 'error'
        : 'loading'
  const regionLabel = useRegionName(requestedPosition)
  const nearestQuery = useNearestQuest(nearbyData === undefined ? undefined : nearbyQuests, requestedPosition)
  const nearestError = nearestQuery.isError ? getQuestQueryError(nearestQuery.error, 'detail') : null
  const nearestQuest = nearbyData === undefined || nearestError?.keepPreviousData === false
    ? undefined
    : nearestQuery.data
  // 어느 응답 배열로 계산한 결과인지 함께 보관해 목록 교체 직후의 오래된 개수를 숨깁니다.
  const [visibleResult, setVisibleResult] = useState<{
    source: NearbyQuest[]
    quests: NearbyQuest[]
  } | null>(null)
  const visibleQuests = visibleResult?.source === nearbyQuests ? visibleResult.quests : null
  const [isListOpen, setIsListOpen] = useState(false)
  const [listSnapshot, setListSnapshot] = useState<NearbyQuest[]>([])
  const [selectedQuestId, setSelectedQuestId] = useState<number | null>(null)
  const [drawerTop, setDrawerTop] = useState<number | null>(null)
  const [expandedPhoto, setExpandedPhoto] = useState<QuestDetailMapPhotoData | null>(null)
  const [visiblePhoto, setVisiblePhoto] = useState<QuestDetailMapPhotoData | null>(null)
  // 선택이 바뀐 직후에도 다른 ID의 이전 사진으로 지도나 상단 UI를 가리지 않습니다.
  const detailPhoto = !isListOpen && expandedPhoto?.questId === selectedQuestId ? expandedPhoto : null
  const isDetailPhotoVisible = detailPhoto !== null && visiblePhoto === detailPhoto
  const showMapControls = !isListOpen && selectedQuestId === null
  const canOpenList = nearbyState === 'ready' && visibleQuests !== null
  const nearbyCount = canOpenList ? visibleQuests.length : null
  const isListLoading = nearbyState === 'loading' || (nearbyState === 'ready' && visibleQuests === null)

  useEffect(() => {
    onNearbyNavigationChange({ count: nearbyCount, isLoading: isListLoading })
    return () => onNearbyNavigationChange(null)
  }, [nearbyCount, isListLoading, onNearbyNavigationChange])

  const clearListRequest = useCallback(() => {
    if (location.state?.openQuestList !== true) return
    // 한 번 소비한 요청은 새로고침·캐시 갱신 시 목록을 다시 열지 않습니다.
    void navigate({ pathname: location.pathname, search: location.search, hash: location.hash }, {
      replace: true,
      state: { ...location.state, openQuestList: false },
    })
  }, [location.pathname, location.search, location.hash, location.state, navigate])

  const handleVisibleQuestsChange = useCallback((quests: NearbyQuest[]) => {
    setVisibleResult({ source: nearbyQuests, quests })
  }, [nearbyQuests])

  // 마커·목록 행·가까운 퀘스트 바가 같은 상세 Drawer를 사용합니다.
  const handleQuestSelect = useCallback((questId: number) => {
    clearListRequest()
    setIsListOpen(false)
    setSelectedQuestId(questId)

    // 선택한 ID의 상세 조회는 QuestDetailDrawer의 useQuestDetail에서 처리합니다.
  }, [clearListRequest])

  const handleOpenList = useCallback(() => {
    if (nearbyState !== 'ready' || visibleQuests === null) return

    setSelectedQuestId(null)
    setDrawerTop(null)
    setExpandedPhoto(null)
    setVisiblePhoto(null)
    // 열린 목록은 지도를 옮겨도 행이 바뀌지 않게 현재 배열을 저장합니다.
    setListSnapshot([...visibleQuests])
    setIsListOpen(true)
  }, [nearbyState, visibleQuests])

  useEffect(() => {
    if (location.state?.openQuestList !== true) return
    if (!canOpenList && nearbyState !== 'error' && !error) return
    let active = true
    queueMicrotask(() => {
      if (!active) return
      if (canOpenList) handleOpenList()
      clearListRequest()
    })
    return () => { active = false }
  }, [location.state, canOpenList, nearbyState, error, handleOpenList, clearListRequest])

  function renderNearestQuest() {
    if (!position) {
      return (
        <button
          type="button"
          disabled={isLocating}
          aria-busy={isLocating}
          aria-label="현재 위치를 확인하고 가까운 퀘스트 보기"
          onClick={() => { void requestLocation() }}
          className="min-h-11 w-full rounded-full px-4 py-2 text-left text-xs font-medium disabled:cursor-wait"
        >
          {isLocating ? '현재 위치를 확인하는 중이에요.' : '위치를 확인하고 가까운 퀘스트를 찾아보세요.'}
        </button>
      )
    }

    // 실패·첫 응답 대기를 완료한 퀘스트만 남은 경우와 구분합니다.
    if (nearbyState !== 'ready' || (nearestError && !nearestQuest)) {
      const queryError = nearbyState !== 'ready' ? nearbyError : nearestError
      const query = nearbyState !== 'ready' ? nearbyQuery : nearestQuery
      return (
        <div className="px-4 py-2">
          {queryError ? (
            <QuestQueryErrorNotice
              info={queryError}
              isFetching={query.isFetching}
              onRetry={() => { void query.refetch({ cancelRefetch: false }) }}
            />
          ) : (
            <p role="status" className="flex min-h-7 items-center text-xs">주변 퀘스트를 불러오는 중이에요.</p>
          )}
        </div>
      )
    }

    if (!nearestQuest) {
      return (
        <p role="status" className="flex min-h-11 items-center px-4 py-2 text-xs">
          {nearestQuery.isPending
            ? '가까운 미완료 퀘스트를 확인하는 중이에요.'
            : '주변에 새로 수행할 퀘스트가 없어요.'}
        </p>
      )
    }

    return (
      <NearestQuestBar
        quest={nearestQuest}
        distance={getDistanceMeters(position, nearestQuest)}
        onSelect={handleQuestSelect}
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
        position={requestedPosition}
        userPosition={position}
        quests={nearbyQuests}
        selectedQuestId={selectedQuestId}
        drawerTop={drawerTop}
        onQuestSelect={handleQuestSelect}
        onVisibleQuestsChange={handleVisibleQuestsChange}
      />

      {/* 지도 자체는 유지하고, 펼친 Drawer 위쪽만 사진으로 덮습니다. */}
      {detailPhoto && (
        <QuestDetailMapPhoto
          key={`${detailPhoto.questId}:${detailPhoto.photoUrl}`}
          photo={detailPhoto}
          top={drawerTop}
          onVisibilityChange={setVisiblePhoto}
        />
      )}

      {/* Header·추천·오류를 한 흐름으로 배치해 작은 화면에서도 겹치지 않게 합니다. */}
      {!isDetailPhotoVisible && (
        <div className="pointer-events-none absolute inset-x-4 top-0 z-20 space-y-2 pt-[calc(0.75rem+env(safe-area-inset-top,0px))] [font-family:Pretendard,system-ui,sans-serif]">
          <HomeHeader regionLabel={isLocating ? '위치 확인 중' : regionLabel} />
          {showMapControls && (
            <div className="pointer-events-auto overflow-hidden rounded-3xl border border-white/90 bg-[#EDF6F9]/95 text-[#242624] shadow-md backdrop-blur-sm">
              {renderNearestQuest()}
            </div>
          )}
          {error && (
            <p role="alert" className="rounded-lg bg-white p-3 text-sm text-red-600 shadow">
              {error.message}
            </p>
          )}
          {position && nearbyError && (nearbyData !== undefined || !showMapControls) && (
            <div className="rounded-lg bg-white p-3 shadow">
              <QuestQueryErrorNotice
                info={nearbyError}
                isFetching={nearbyQuery.isFetching}
                onRetry={() => { void nearbyQuery.refetch({ cancelRefetch: false }) }}
                showingPreviousData={nearbyData !== undefined}
              />
            </div>
          )}
          {nearestError && nearestQuest && showMapControls && (
            <div className="rounded-lg bg-white p-3 shadow">
              <QuestQueryErrorNotice
                info={nearestError}
                isFetching={nearestQuery.isFetching}
                onRetry={() => { void nearestQuery.refetch({ cancelRefetch: false }) }}
                showingPreviousData
              />
            </div>
          )}
        </div>
      )}

      {showMapControls && (
        <div className="pointer-events-none absolute inset-x-4 bottom-[calc(7rem+env(safe-area-inset-bottom,0px))] z-20 flex items-end justify-end">
          <div className="pointer-events-auto">
            <CurrentLocationButton
              isLocating={isLocating}
              onClick={() => {
                void requestLocation()
              }}
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
        position={position}
        onPositionChange={setDrawerTop}
        onExpandedPhotoChange={setExpandedPhoto}
        onClose={() => {
          setSelectedQuestId(null)
          setDrawerTop(null)
          setExpandedPhoto(null)
          setVisiblePhoto(null)
        }}
      />
    </section>
  </div>
  )
}
