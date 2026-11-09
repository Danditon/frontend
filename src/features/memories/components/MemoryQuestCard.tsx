import { useQuery } from "@tanstack/react-query";
import { RemotePhoto } from "@/shared/components/RemotePhoto";
import { getVerificationQuest } from "@/features/quests/api/verification";
import type { Memory } from "../types";
import { AnimatePresence, motion, useReducedMotion } from "motion/react";

type Props = {
  memory: Memory; token: string | null; onOpen: (memory: Memory) => void;
  previewStatus?: "loading" | "empty" | "error" | null;
  onRetry?: () => void;
};

export default function MemoryQuestCard({ memory, token, onOpen, previewStatus = null, onRetry }: Props) {
  const reducedMotion = useReducedMotion();
  const detail = useQuery({
    queryKey: ["verification-quest", memory.id, token],
    queryFn: ({ signal }) => getVerificationQuest(memory.id, signal),
    enabled: Boolean(token),
    staleTime: 60_000,
    retry: false,
  });

  return (
    <article className="mypage-quest-item">
    <button type="button" className="mypage-quest-card" onClick={() => onOpen(memory)}
      aria-expanded={previewStatus !== null} aria-controls={`memory-greetings-${memory.id}`}>
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
    <AnimatePresence initial={false}>
      {previewStatus && (
        <motion.div key="notice" id={`memory-greetings-${memory.id}`} className="mypage-quest-notice"
          initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
          transition={{ duration: reducedMotion ? 0 : 0.2 }}>
          <div role={previewStatus === "error" ? "alert" : "status"} aria-busy={previewStatus === "loading"}>
            {previewStatus === "loading" ? <p>안부를 확인하고 있어요.</p>
              : previewStatus === "error" ? <><p>안부를 불러오지 못했어요.</p><button type="button" onClick={onRetry}>다시 시도</button></>
              : <><p>아직 도착한 안부가 없어요.</p><small>누군가 다녀오면 이곳에 안부가 도착해요.</small></>}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
    </article>
  );
}
