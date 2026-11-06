// 가까운 퀘스트와 수행 중인 퀘스트를 구분해 표시하고, 클릭한 ID를 홈에 전달하는 카드입니다.
import { ArrowUpRight } from 'lucide-react'
import { RemotePhoto } from '@/shared/components/RemotePhoto'
import type { QuestDetail } from '@/features/quests/types/quest'

type Props = {
  quest: QuestDetail
  mode?: 'nearest' | 'active'
  onSelect: (questId: number) => void
}

export default function ActiveQuestCard({
  quest,
  mode = 'nearest',
  onSelect,
}: Props) {
  const isActive = mode === 'active'

  return (
    <button
      type="button"
      onClick={() => onSelect(quest.questId)}
      aria-label={isActive
        ? `${quest.questTitle} 수행 계속하기`
        : `${quest.questTitle} 상세 보기`}
      className={`pointer-events-auto relative block h-full w-full overflow-hidden rounded-3xl border-2 bg-[#69716B] text-left text-white ${
        isActive ? 'border-[#FDE68A]' : 'border-white/80'
      }`}
    >
      {/* 현재 mock 사진은 null입니다. URL이 생기면 같은 카드에 사진을 표시합니다. */}
      {quest.photoUrl && (
        <RemotePhoto
          key={quest.photoUrl}
          photoUrl={quest.photoUrl}
          alt={quest.placeName}
          className="absolute inset-0 h-full w-full [&>img]:h-full [&>img]:w-full [&>img]:object-cover"
        />
      )}

      {/* 사진이 없어도 제목이 잘 보이도록 기본 배경 위에 그라데이션을 적용합니다. */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/20 to-transparent" />

      {/* 수행 중 상태는 색뿐 아니라 배지 문구로도 구분합니다. */}
      <span
        className={`absolute left-3 top-3 inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-medium ${
          isActive
            ? 'bg-[#FDE68A] text-[#854D0E]'
            : 'bg-[#DFF1FA] text-[#303B3C]'
        }`}
      >
        {isActive && (
          <span className="size-1.5 rounded-full bg-current" aria-hidden="true" />
        )}
        {isActive ? '수행 중' : '가까운 퀘스트'}
      </span>

      <p className="absolute left-3 top-10 text-[10px] text-white/85">
        {quest.questType === 'GENERAL' ? '일반' : '이미지'}
        {' · '}난이도 {quest.difficulty}
      </p>

      {/* 카드 전체가 버튼이므로 화살표는 별도의 버튼으로 만들지 않습니다. */}
      <span className="absolute right-3 top-3 grid size-7 place-items-center rounded-full bg-white text-[#242624]">
        <ArrowUpRight className="size-4" aria-hidden="true" />
      </span>

      <div className="absolute inset-x-3 bottom-3">
        <p className="line-clamp-2 text-sm font-semibold max-[360px]:line-clamp-1">
          {quest.questTitle}
        </p>
        <div className="mt-1 flex items-center gap-2">
          <p className="min-w-0 flex-1 truncate text-[11px] text-white/85">
            {quest.placeName}에서 온 그리움
          </p>
          {isActive && (
            <span className="shrink-0 text-[10px] font-medium text-[#FDE68A]">
              이어서 하기
            </span>
          )}
        </div>
      </div>
    </button>
  )
}
