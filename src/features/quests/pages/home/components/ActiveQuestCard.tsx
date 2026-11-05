// 수행 중인 퀘스트의 요약을 표시하고 해당 상세 페이지로 이동하는 카드입니다.
import { Link } from 'react-router'
import { ArrowUpRight } from 'lucide-react'
import { RemotePhoto } from '@/shared/components/RemotePhoto'
import type { QuestDetail } from '@/features/quests/types/quest'

type Props = {
  quest: QuestDetail
}

export default function ActiveQuestCard({ quest }: Props) {
  return (
    <Link
      to={`/quests/${quest.questId}`}
      aria-label={`${quest.questTitle} 상세 보기`}
      className="pointer-events-auto relative block h-full overflow-hidden rounded-3xl bg-[#69716B] text-white"
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

      <span className="absolute left-3 top-3 rounded-full bg-black/65 px-2 py-1 text-[10px]">
        {quest.questType === 'GENERAL' ? '일반' : '이미지'}
        {' · '}난이도 {quest.difficulty}
      </span>

      {/* 카드 전체가 링크이므로 화살표는 별도의 버튼으로 만들지 않습니다. */}
      <span className="absolute right-3 top-3 grid size-7 place-items-center rounded-full bg-white text-[#242624]">
        <ArrowUpRight className="size-4" aria-hidden="true" />
      </span>

      <div className="absolute inset-x-3 bottom-3">
        <p className="line-clamp-2 text-sm font-semibold">
          {quest.questTitle}
        </p>
        <p className="mt-1 truncate text-[11px] text-white/85">
          {quest.placeName}에서 온 그리움
        </p>
      </div>
    </Link>
  )
}
