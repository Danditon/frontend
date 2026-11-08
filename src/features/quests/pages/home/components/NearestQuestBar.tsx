// 가장 가까운 미완료 퀘스트를 표시하고 선택한 ID의 상세를 엽니다.
import type { QuestDetail } from '@/features/quests/types/quest'

type Props = {
  quest: QuestDetail
  distance: number
  onSelect: (questId: number) => void
}

export default function NearestQuestBar({ quest, distance, onSelect }: Props) {
  const distanceText = distance < 1000
    ? `${Math.round(distance)}m`
    : `${(distance / 1000).toFixed(1)}km`

  return (
    <button
      type="button"
      onClick={() => onSelect(quest.questId)}
      aria-label={`가장 가까운 퀘스트, ${quest.questTitle}, ${distanceText}, 상세 보기`}
      title={quest.questTitle}
      className="flex min-h-11 w-full items-center gap-2 rounded-full px-3 py-2 text-left text-[#242624] hover:bg-white/40 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[#698795]"
    >
      {/* 별 하나는 난이도 표시가 아닌 퀘스트 심볼입니다. */}
      <svg viewBox="0 0 56 64" className="h-6 w-5 shrink-0" aria-hidden="true">
        <path
          d="M28 62C23 54 4 39 4 26a24 24 0 1 1 48 0c0 13-19 28-24 36Z"
          fill="#C5DEE9" stroke="#698795" strokeWidth="3"
        />
        <polygon
          points="0,-7 2,-2 7,-2 3,1 4,6 0,3 -4,6 -3,1 -7,-2 -2,-2"
          transform="translate(28, 26)" fill="#344C59"
        />
      </svg>
      <span className="flex min-w-0 flex-1 items-baseline gap-2">
        <span className="truncate text-[13px] font-semibold">{quest.questTitle}</span>
        <span className="shrink-0 text-[10px] font-normal text-[#66757B] max-[359px]:hidden">
          가장 가까운 퀘스트
        </span>
      </span>
      <span className="shrink-0 rounded-full bg-[#CDE5F0] px-2.5 py-1 text-xs font-semibold tabular-nums">
        {distanceText}
      </span>
    </button>
  )
}
