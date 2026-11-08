// 펼친 퀘스트 상세에서 수행할 내용, 작성자의 그리움, 장소와 주소를 표시하는 컴포넌트입니다.
import type { QuestDetail } from '@/features/quests/types/quest'
import QuestLocationCard from './QuestLocationCard'

type Props = {
  quest: QuestDetail
  onViewOnMap: () => void
}

export default function QuestDetailContent({ quest, onViewOnMap }: Props) {
  return (
    <div className="space-y-4 pb-2">
      {/* 실제 수행할 내용을 먼저 보여주고, 사진은 상세 본문에 중복 배치하지 않습니다. */}
      <section className="rounded-2xl bg-[#242624] p-4 text-white">
        <h3 className="mb-2 text-xs font-semibold text-[#F5E6A7]">퀘스트</h3>
        <p className="whitespace-pre-wrap text-sm leading-relaxed [overflow-wrap:anywhere]">
          {quest.questDescription}
        </p>
      </section>

      <section className="rounded-2xl bg-[#F3F5F4] p-4 text-[#303B3C]">
        <h3 className="mb-2 text-xs font-semibold [overflow-wrap:anywhere]">
          {quest.author.nickname}님이 남긴 그리움
        </h3>
        {/* 미리보기의 줄 수 제한을 적용하지 않아 남긴 이야기를 끝까지 읽을 수 있습니다. */}
        <p className="whitespace-pre-wrap text-sm leading-relaxed [overflow-wrap:anywhere]">
          {quest.longingText}
        </p>
      </section>

      {/* 선택한 퀘스트가 바뀌면 이전 주소의 복사 결과도 함께 초기화합니다. */}
      <QuestLocationCard
        key={`${quest.questId}:${quest.address}`}
        placeName={quest.placeName}
        address={quest.address}
        onViewOnMap={onViewOnMap}
      />
    </div>
  )
}
