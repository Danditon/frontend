// 사진과 색상 배지 없이 난이도 별·종류·제목·거리를 표시하는 퀘스트 목록 행입니다.
import { Star } from 'lucide-react'
import type { NearbyQuest } from '@/features/quests/types/quest'

type QuestListItemProps = {
  quest: NearbyQuest
  onSelect: (questId: number) => void
}

export default function QuestListItem({ quest, onSelect }: QuestListItemProps) {
  const distanceText = quest.distance < 1000
    ? `${Math.round(quest.distance)}m`
    : `${(quest.distance / 1000).toFixed(1)}km`

  return (
    <button
      type="button"
      onClick={() => onSelect(quest.questId)}
      className="flex min-h-20 w-full items-center gap-3 rounded-xl py-3 text-left text-[#242624] hover:bg-black/[0.03] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#242624]"
    >
      {/* 별은 같은 색과 크기를 사용하고, 개수로만 난이도를 구분합니다. */}
      <span
        role="img"
        aria-label={`난이도 ${quest.difficulty}`}
        className="flex w-14 shrink-0 items-center justify-center gap-0.5"
      >
        {Array.from({ length: quest.difficulty }, (_, index) => (
          <Star key={index} className="size-3.5" fill="currentColor" aria-hidden="true" />
        ))}
      </span>

      <span className="min-w-0 flex-1">
        <span className="block truncate text-sm font-medium">{quest.questTitle}</span>
        <span className="mt-1 block text-[11px] text-neutral-500">
          {quest.questType === 'GENERAL' ? '일반' : '이미지'}
        </span>
      </span>

      <span className="shrink-0 text-xs text-neutral-500">{distanceText}</span>
    </button>
  )
}
