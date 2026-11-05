// 주변 퀘스트 목록을 종류별로 필터링하고, 행 선택 시 기존 상세 화면으로 연결하는 Drawer입니다.
import { useState, type CSSProperties } from 'react'
import { X } from 'lucide-react'
import type { NearbyQuest } from '@/features/quests/types/quest'
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerHeader,
  DrawerTitle,
} from '@/shared/components/ui/drawer'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/shared/components/ui/tabs'
import QuestListItem from './QuestListItem'

type QuestListDrawerProps = {
  open: boolean
  quests: NearbyQuest[] // 목록을 열 때 저장한 지도 범위의 퀘스트입니다.
  onClose: () => void
  onSelect: (questId: number) => void
}

type QuestFilter = 'ALL' | NearbyQuest['questType']

const filters = [
  { value: 'ALL', label: '전체' },
  { value: 'GENERAL', label: '일반' },
  { value: 'IMAGE', label: '이미지' },
] as const

export default function QuestListDrawer({
  open,
  quests,
  onClose,
  onSelect,
}: QuestListDrawerProps) {
  const [filter, setFilter] = useState<QuestFilter>('ALL')

  return (
    <Drawer
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen) onClose()
      }}
      onOpenChangeComplete={(nextOpen) => {
        if (!nextOpen) setFilter('ALL')
      }}
      // 보이는 지도는 조작할 수 있지만, 지도 클릭으로 목록을 닫지는 않습니다.
      modal={false}
      disablePointerDismissal
      showSwipeHandle
    >
      <DrawerContent
        style={{
          '--drawer-content-height': '85dvh',
          '--drawer-content-max-height': '85dvh',
        } as CSSProperties}
        className="data-[swipe-direction=down]:rounded-t-[28px] bg-[#F1F9FA]/95 text-[#242624] backdrop-blur-md"
      >
        <DrawerHeader className="relative h-5 shrink-0 p-0">
          <DrawerTitle className="sr-only">주변 퀘스트 목록</DrawerTitle>
          <DrawerDescription className="sr-only">
            퀘스트를 선택하면 상세 내용을 확인할 수 있어요.
          </DrawerDescription>
          <DrawerClose
            aria-label="퀘스트 목록 닫기"
            className="absolute right-3 top-0 z-10 grid size-9 place-items-center rounded-full hover:bg-black/5"
          >
            <X className="size-4" aria-hidden="true" />
          </DrawerClose>
        </DrawerHeader>

        <Tabs
          value={filter}
          onValueChange={(value) => {
            if (value === 'ALL' || value === 'GENERAL' || value === 'IMAGE') {
              setFilter(value)
            }
          }}
          className="min-h-0 flex-1 gap-0"
        >
          {/* 필터는 스크롤 영역 밖에 고정합니다. */}
          <TabsList className="mx-5 mb-4 h-9 shrink-0 gap-2 bg-transparent p-0">
            {filters.map(({ value, label }) => (
              <TabsTrigger
                key={value}
                value={value}
                className="h-9 rounded-full px-4 text-[13px] data-active:shadow-none"
                style={{ backgroundColor: filter === value ? '#D5EAF4' : '#FFFFFF', color: '#242624' }}
              >
                {label}
              </TabsTrigger>
            ))}
          </TabsList>

          {filters.map(({ value }) => {
            const filteredQuests = quests.filter(
              (quest) => value === 'ALL' || quest.questType === value,
            )

            return (
              <TabsContent
                key={value}
                value={value}
                className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-[calc(1rem+env(safe-area-inset-bottom,0px))]"
              >
                {filteredQuests.length > 0 ? (
                  <ul>
                    {filteredQuests.map((quest) => (
                      <li key={quest.questId}>
                        <QuestListItem quest={quest} onSelect={onSelect} />
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="py-12 text-center text-sm text-neutral-500">
                    {value === 'ALL' ? '현재 지도 범위에 퀘스트가 없어요.' : '해당 종류의 퀘스트가 없어요.'}
                  </p>
                )}
              </TabsContent>
            )
          })}
        </Tabs>
      </DrawerContent>
    </Drawer>
  )
}
