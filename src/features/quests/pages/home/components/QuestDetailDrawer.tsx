// 선택한 실제 퀘스트의 상세 정보와 수행 시작 버튼을 표시하며 지도 조작을 유지하는 Drawer입니다.
import { useCallback, useRef, useState, type CSSProperties } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import { RemotePhoto } from '@/shared/components/RemotePhoto'
import { useQuestDetail } from '@/features/quests/hooks/useQuestDetail'
import QuestStartButton from './QuestStartButton'
import QuestQueryErrorNotice from './QuestQueryErrorNotice'
import { getQuestQueryError } from '../utils/getQuestQueryError'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/shared/components/ui/drawer'

type QuestDetailDrawerProps = {
  onPositionChange: (top: number) => void // 보이는 지도 높이를 계산하도록 Drawer 상단 위치를 전달합니다.
  questId: number | null // null이면 닫히고, ID가 있으면 해당 퀘스트로 열립니다.
  onClose: () => void // 닫힐 때 부모의 선택 상태를 해제합니다.
}

export default function QuestDetailDrawer({
  questId,
  onClose,
  onPositionChange,
}: QuestDetailDrawerProps) {
  // 기본 40%, 확장 85% 중 현재 높이를 관리합니다.
  const [snapPoint, setSnapPoint] = useState(0.4)
  const isExpanded = snapPoint === 0.85
  const drawerRef = useRef<HTMLDivElement>(null)
  // 마커·목록·가까운 카드에서 선택한 ID로 실제 상세 API와 캐시를 공유합니다.
  const detailQuery = useQuestDetail(questId)
  const detailError = detailQuery.isError ? getQuestQueryError(detailQuery.error, 'detail') : null
  // 통신 오류에는 기존 상세를 유지하지만, 401·403·404의 오래된 수행 버튼은 숨깁니다.
  const quest = detailError?.keepPreviousData === false ? undefined : detailQuery.data

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
      snapPoints={[0.4, 0.85]}
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
            '--drawer-content-max-height': '85dvh',
          } as CSSProperties
        }
        className="data-[swipe-direction=down]:rounded-t-3xl pb-[env(safe-area-inset-bottom,0px)]"
      >
        <DrawerHeader className="relative pr-14 text-left">
          <DrawerTitle className="line-clamp-2">
            {quest?.questTitle ?? '퀘스트 상세'}
          </DrawerTitle>
          <DrawerDescription>
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
          {/* 드래그 외에 버튼·키보드로도 확장하거나 접을 수 있습니다. */}
          <Button
            variant="link"
            size="sm"
            className="self-start px-0"
            aria-expanded={isExpanded}
            onClick={() => setSnapPoint(isExpanded ? 0.4 : 0.85)}
          >
            {isExpanded ? '접기' : '더 보기'}
          </Button>
        </DrawerHeader>

        {/* 헤더는 고정하고, 확장했을 때만 내용 영역을 스크롤합니다. */}
        <div
          className={`min-h-0 flex-1 p-4 ${
            isExpanded ? 'overflow-y-auto overscroll-contain' : 'overflow-hidden'
          }`}
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

          {quest && (
            <>
              <p className="text-sm text-neutral-500">
                {quest.questType === 'GENERAL' ? '일반' : '이미지'}
                {' · '}난이도 {quest.difficulty}
              </p>

              {/* 접힌 상태에서도 수행을 시작할 수 있게 상세 내용보다 먼저 배치합니다. */}
              <div className="mt-3">
                <QuestStartButton quest={quest} />
              </div>

              {isExpanded ? (
                <>
                  <section className="mt-4">
                    <h3 className="font-semibold">등록 사진</h3>
                    <RemotePhoto
                      photoUrl={quest.photoUrl}
                      alt={`${quest.placeName} 등록 사진`}
                      className="mt-2 grid aspect-video place-items-center overflow-hidden rounded-xl bg-neutral-100 text-neutral-500 [&>img]:h-full [&>img]:w-full [&>img]:object-cover"
                    />
                  </section>
                  <section className="mt-4">
                    <h3 className="font-semibold">이곳에 남긴 그리움</h3>
                    <p className="whitespace-pre-wrap break-words">{quest.longingText}</p>
                  </section>
                  <section className="mt-4">
                    <h3 className="font-semibold">전해줄 안부</h3>
                    <p className="whitespace-pre-wrap break-words">{quest.questDescription}</p>
                  </section>
                  <section className="mt-4">
                    <h3 className="font-semibold">위치</h3>
                    <p>{quest.placeName}</p>
                    <p className="break-words">{quest.address}</p>
                  </section>
                </>
              ) : (
                <p className="mt-3 text-sm text-muted-foreground">
                  위로 올리면 상세 내용을 확인할 수 있어요.
                </p>
              )}
            </>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
