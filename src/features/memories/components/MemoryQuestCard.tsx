import { useQuery } from "@tanstack/react-query";
import { RemotePhoto } from "@/shared/components/RemotePhoto";
import { getVerificationQuest } from "@/features/quests/api/verification";
import type { Memory } from "../types";

type Props = {
  memory: Memory; token: string | null; onOpen: (memory: Memory) => void;
  expanded?: boolean;
};

export default function MemoryQuestCard({ memory, token, onOpen, expanded = false }: Props) {
  const detail = useQuery({
    queryKey: ["verification-quest", memory.id, token],
    queryFn: ({ signal }) => getVerificationQuest(memory.id, signal),
    enabled: Boolean(token),
    staleTime: 60_000,
    retry: false,
  });

  return (
    <article className="mypage-quest-item">
    <button id={`memory-card-${memory.id}`} type="button" className="mypage-quest-card" onClick={() => onOpen(memory)}
      aria-expanded={expanded} aria-haspopup="dialog" aria-controls="received-greetings-drawer">
      <div className="mypage-quest-copy">
        <strong>{memory.title}</strong>
        <small>{memory.sub}</small>
        {Boolean(memory.passedCount) && <span>안부 {memory.passedCount}통 도착</span>}
      </div>
      <div className="mypage-quest-photo">
        {/* 목록 썸네일은 해당 퀘스트 ID의 상세 사진으로 표시합니다. */}
        <RemotePhoto photoUrl={detail.data?.photoUrl} alt={memory.title} />
      </div>
    </button>
    </article>
  );
}
