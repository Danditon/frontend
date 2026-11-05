// 마커에서 선택한 퀘스트의 Drawer를 열고, 지도를 조작할 수 있게 유지하는 컴포넌트입니다.
import type { CSSProperties } from 'react'
import { X } from 'lucide-react'
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
  return (
    <Drawer
      open={questId !== null}
      onOpenChange={(open) => {
        if (!open) onClose()
      }}
      // 배경을 막지 않아 Drawer 위로 보이는 지도를 계속 조작할 수 있습니다.
      modal={false}
      // 지도 조작이나 다른 마커 클릭만으로 Drawer가 닫히지 않게 합니다.
      disablePointerDismissal
      showSwipeHandle
    >
      <DrawerContent
        // 하단은 공용 Drawer의 bottom: 0을 사용해 향후 navbar를 덮습니다.
        // 높이는 기기의 실제 화면 높이에 맞춰 정합니다.
        style={
          {
            '--drawer-content-height': '40dvh',
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
        </DrawerHeader>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          <p>선택한 퀘스트 ID: {questId}</p>

          {/* 추후 상세 API 응답을 표시할 영역입니다. */}
        </div>
      </DrawerContent>
    </Drawer>
  )
}
