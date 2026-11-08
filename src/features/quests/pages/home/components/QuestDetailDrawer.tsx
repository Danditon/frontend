// 선택한 실제 퀘스트의 상세 정보와 수행 시작 버튼을 표시하며 지도 조작을 유지하는 Drawer입니다.
import { useCallback, useRef, useState, type CSSProperties } from 'react'
import { ChevronUp, X } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { useQuestDetail } from '@/features/quests/hooks/useQuestDetail'
import type { UserPosition } from '@/features/quests/hooks/useGeolocation'
import QuestStartButton from './QuestStartButton'
import QuestDetailPreview from './QuestDetailPreview'
import QuestDetailContent from './QuestDetailContent'
import QuestQueryErrorNotice from './QuestQueryErrorNotice'
import { getQuestQueryError } from '../utils/getQuestQueryError'
import { getDistanceMeters } from '../utils/getDistanceMeters'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/shared/components/ui/drawer'

type QuestDetailDrawerProps = {
  onPositionChange: (top: number) => void // 보이는 지도 높이를 계산하도록 Drawer 상단 위치를 전달합니다.
  questId: number | null // null이면 닫히고, ID가 있으면 해당 퀘스트로 열립니다.
  position: UserPosition | null // 홈에서 확인한 GPS를 재사용하며 여기서 위치를 요청하지 않습니다.
  onClose: () => void // 닫힐 때 부모의 선택 상태를 해제합니다.
}

export default function QuestDetailDrawer({
  questId,
  position,
  onClose,
  onPositionChange,
}: QuestDetailDrawerProps) {
  // 기본 40%, 확장 75%로 두어 펼친 뒤에도 위쪽 지도가 보이게 합니다.
  const [snapPoint, setSnapPoint] = useState(0.4)
  const isExpanded = snapPoint === 0.75
  const drawerRef = useRef<HTMLDivElement>(null)
  // 마커·목록·가까운 카드에서 선택한 ID로 실제 상세 API와 캐시를 공유합니다.
  const detailQuery = useQuestDetail(questId)
  const detailError = detailQuery.isError ? getQuestQueryError(detailQuery.error, 'detail') : null
  // 통신 오류에는 기존 상세를 유지하지만, 401·403·404의 오래된 수행 버튼은 숨깁니다.
  const quest = detailError?.keepPreviousData === false ? undefined : detailQuery.data
  // 목록 응답의 distance 대신 현재 선택한 상세 좌표와 홈의 마지막 GPS로 계산합니다.
  const distanceMeters = position && quest ? getDistanceMeters(position, quest) : null
  const distanceText = distanceMeters === null
    ? '위치 확인 후 거리 표시'
    : distanceMeters < 1000
      ? `내 위치에서 약 ${Math.round(distanceMeters)}m`
      : `내 위치에서 약 ${(distanceMeters / 1000).toFixed(1)}km`

  // 접힌 상태의 DOM 높이 대신, 실제 화면에 보이는 상단 위치를 측정합니다.
  const reportPosition = useCallback(() => {
    const drawer = drawerRef.current
    if (questId === null || !drawer) return

    onPositionChange(drawer.getBoundingClientRect().top)
  }, [questId, onPositionChange])

  return (
    <Drawer
      open={questId !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      // 닫기 애니메이션 완료 후 다음에 열 높이를 초기화합니다.
      onOpenChangeComplete={(open) => {
        if (open) {
          // 열기 애니메이션 완료 후 선택한 마커의 위치를 보정합니다.
          reportPosition()
        } else {
          setSnapPoint(0.4)
        }
      }}
      // 드래그 시 두 높이 사이를 이동하도록 공용 Drawer에 맡깁니다.
      snapPoints={[0.4, 0.75]}
      snapPoint={snapPoint}
      onSnapPointChange={(nextPoint) => {
        if (typeof nextPoint === 'number') setSnapPoint(nextPoint)
      }}
      // 배경을 막지 않아 Drawer 위로 보이는 지도를 계속 조작할 수 있습니다.
      modal={false}
      // 지도 조작이나 다른 마커 클릭만으로 Drawer가 닫히지 않게 합니다.
      disablePointerDismissal
      showSwipeHandle
    >
      <DrawerContent
        ref={drawerRef}
        onTransitionEnd={(event) => {
          // 자식 요소의 애니메이션은 제외합니다.
          if (event.target !== event.currentTarget) return
          if (event.propertyName !== 'transform') return

          // 기본·확장 높이 전환이 끝난 뒤 보이는 영역을 갱신합니다.
          reportPosition()
        }}
        // 하단은 공용 Drawer의 bottom: 0을 사용해 향후 navbar를 덮습니다.
        // 고정 높이 대신 확장 시 최대 높이만 제한하고, 이동은 snapPoints로 처리합니다.
        style={
          {
            '--drawer-content-max-height': '75dvh',
          } as CSSProperties
        }
        className="data-[swipe-direction=down]:rounded-t-[2rem] font-['Pretendard',system-ui,sans-serif]"
      >
        {/* snap 이동으로 화면 아래에 내려간 높이를 빼야 하단 버튼도 보이는 영역에 고정됩니다. */}
        <div
          className="flex min-h-0 shrink-0 flex-col overflow-hidden transition-[height] duration-450 ease-[cubic-bezier(0.22,1,0.36,1)] group-data-swiping/drawer-popup:duration-0 motion-reduce:transition-none"
          style={{ height: 'calc(100% - max(0px, calc(var(--drawer-snap-point-offset, 0px) + var(--drawer-swipe-movement-y, 0px))))' }}
        >
          <DrawerHeader className="relative gap-3 px-5 pt-3 text-left">
            {quest && (
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 pr-10 text-xs">
                <span className="rounded-full bg-[#FAF3D8] px-3 py-1 font-semibold text-[#393D36]">
                  {quest.questType === 'GENERAL' ? '일반' : '이미지'} · 난이도 {quest.difficulty}
                </span>
                <span className="text-neutral-500">{distanceText}</span>
              </div>
            )}
            <DrawerTitle className="line-clamp-2 break-words text-left text-xl font-bold leading-snug tracking-tight [font-family:inherit]">
              {quest?.questTitle ?? '퀘스트 상세'}
            </DrawerTitle>
            <DrawerDescription className="sr-only">
              {quest
                ? `${quest.placeName}에서 온 그리움`
                : '선택한 퀘스트를 확인하는 공간입니다.'}
            </DrawerDescription>

            <DrawerClose
              aria-label="퀘스트 상세 닫기"
              className="absolute right-4 top-4 flex size-9 items-center justify-center rounded-full hover:bg-neutral-100"
            >
              <X className="size-5" aria-hidden="true" />
            </DrawerClose>
          </DrawerHeader>

          {/* 본문만 스크롤하여 내용·오류가 길어져도 수행 버튼을 밀어내지 않습니다. */}
          <div
            className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-3"
          >
            {detailQuery.isPending && questId !== null && (
              <p role="status">상세 내용을 불러오는 중이에요.</p>
            )}

            {detailError && (
              <QuestQueryErrorNotice
                info={detailError}
                isFetching={detailQuery.isFetching}
                onRetry={() => { void detailQuery.refetch({ cancelRefetch: false }) }}
                showingPreviousData={quest !== undefined}
              />
            )}

            {quest && (isExpanded
              ? <QuestDetailContent quest={quest} />
              : <QuestDetailPreview quest={quest} />)}
          </div>
          {quest && (
            <DrawerFooter className="gap-1 bg-white px-5 pb-[max(1rem,env(safe-area-inset-bottom,0px))]">
              {/* 드래그 외에 버튼·키보드로도 확장하거나 접을 수 있습니다. */}
              <Button
                variant="link"
                size="sm"
                className="min-h-9 text-xs text-neutral-500"
                aria-expanded={isExpanded}
                onClick={() => setSnapPoint(isExpanded ? 0.4 : 0.75)}
              >
                <ChevronUp className={`size-4 ${isExpanded ? 'rotate-180' : ''}`} aria-hidden="true" />
                {isExpanded ? '접기' : '위로 올려 자세히 보기'}
              </Button>
              <QuestStartButton quest={quest} />
            </DrawerFooter>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
