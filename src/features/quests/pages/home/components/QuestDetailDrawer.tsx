// 마커에서 선택한 퀘스트의 Drawer를 열고, 지도를 조작할 수 있게 유지하는 컴포넌트입니다.
import { useState, type CSSProperties } from 'react'
import { X } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/shared/components/ui/drawer'

type QuestDetailDrawerProps = {
  questId: number | null // null이면 닫히고, ID가 있으면 해당 퀘스트로 열립니다.
  onClose: () => void // 닫힐 때 부모의 선택 상태를 해제합니다.
}

export default function QuestDetailDrawer({
  questId,
  onClose,
}: QuestDetailDrawerProps) {
  // 기본 40%, 확장 85% 중 현재 높이를 관리합니다.
  const [snapPoint, setSnapPoint] = useState(0.4)
  const isExpanded = snapPoint === 0.85

  return (
    <Drawer
      open={questId !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      // 닫기 애니메이션 완료 후 다음에 열 높이를 초기화합니다.
      onOpenChangeComplete={(open) => {
        if (!open) setSnapPoint(0.4)
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
          <DrawerTitle>퀘스트 상세</DrawerTitle>
          <DrawerDescription>
            선택한 퀘스트를 확인하는 공간입니다.
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
          <p>선택한 퀘스트 ID: {questId}</p>

          {isExpanded ? (
            <>
              {/* 상세 API 연결 전이므로 필드별 표시 영역만 만듭니다. */}
              <section className="mt-4">
                <h3 className="font-semibold">등록 사진</h3>
                {/* photoUrl: 사진이 있으면 표시합니다. */}
              </section>
              <section className="mt-4">
                <h3 className="font-semibold">이곳에 남긴 그리움</h3>
                {/* longingText: 그리운 이유 전체를 표시합니다. */}
              </section>
              <section className="mt-4">
                <h3 className="font-semibold">전해줄 안부</h3>
                {/* questDescription: 수행할 내용을 표시합니다. */}
              </section>
              <section className="mt-4">
                <h3 className="font-semibold">위치</h3>
                {/* placeName, address: 장소와 주소를 표시합니다. */}
              </section>
            </>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">
              위로 올리면 상세 내용을 확인할 수 있어요.
            </p>
          )}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
