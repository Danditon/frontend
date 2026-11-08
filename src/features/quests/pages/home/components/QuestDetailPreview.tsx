// 접힌 퀘스트 상세에서 사진 또는 그리움·수행 내용의 짧은 미리보기를 표시하는 컴포넌트입니다.
import { RemotePhoto } from '@/shared/components/RemotePhoto'
import type { QuestDetail } from '@/features/quests/types/quest'

type Props = {
  quest: QuestDetail
}

export default function QuestDetailPreview({ quest }: Props) {
  // 일반 퀘스트에도 사진이 있을 수 있으므로 종류 대신 실제 사진 주소로 나눕니다.
  if (quest.photoUrl?.trim()) {
    return (
      <RemotePhoto
        photoUrl={quest.photoUrl}
        alt={`${quest.placeName} 등록 사진`}
        className="grid h-full min-h-24 w-full place-items-center overflow-hidden rounded-2xl bg-neutral-100 text-sm text-neutral-500 [&>img]:h-full [&>img]:w-full [&>img]:object-cover"
      />
    )
  }

  return (
    <div className="space-y-3">
      {/* 사진이 없을 때는 남긴 그리움으로 관심을 끌고, 전문은 확장 화면에서 보여줍니다. */}
      <blockquote className="rounded-2xl bg-[#F3F5F4] px-4 py-3 text-sm leading-relaxed text-[#303B3C]">
        <p className="line-clamp-3 break-words">“{quest.longingText}”</p>
      </blockquote>
      <p className="line-clamp-2 break-words text-xs leading-relaxed text-neutral-500">
        <span className="font-semibold">전해줄 안부 · </span>
        {quest.questDescription}
      </p>
    </div>
  )
}
