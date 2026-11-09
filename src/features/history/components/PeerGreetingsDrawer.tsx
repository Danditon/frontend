import { useEffect, useRef } from "react";
import { Link } from "react-router";
import { ChevronRight, X } from "lucide-react";
import { SwipeSheet } from "@/shared/components/SwipeSheet";
import { RemotePhoto } from "@/shared/components/RemotePhoto";
import type { RecordItem } from "@/features/memories/types";
import type { SubmissionGreeting } from "@/features/memories/lib/greetingViews";

export default function PeerGreetingsDrawer({ record, greetings, loading, failed, expanded,
  onExpandedChange, onClose, onRetry, greetingPath, restoreScroll, saveScroll,
}: {
  record: RecordItem; greetings: SubmissionGreeting[]; loading: boolean; failed: boolean;
  expanded: boolean; onExpandedChange: (expanded: boolean) => void;
  onClose: () => void; onRetry: () => void; greetingPath: (submissionId: number) => string;
  restoreScroll: (element: HTMLDivElement | null) => void; saveScroll: (top: number) => void;
}) {
  const closeButton = useRef<HTMLButtonElement>(null);
  useEffect(() => { closeButton.current?.focus({ preventScroll: true }); }, []);
  return (
    <div className="mypage-peer-host" onKeyDown={(event) => {
      if (event.key === "Escape") { event.stopPropagation(); onClose(); }
    }}>
      <SwipeSheet label="다른 사람 안부" className="mypage-peer-drawer" collapsed={0.64}
        expanded={expanded} onExpandedChange={onExpandedChange}>
        <header className="mypage-peer-header">
          <h2>같은 퀘스트의 다른 안부 {!loading && !failed && <span>{greetings.length}</span>}</h2>
          <p>{record.title}</p>
          <button ref={closeButton} type="button" aria-label="다른 사람 안부 닫기" onClick={onClose}><X size={18} /></button>
        </header>
        <div ref={restoreScroll} className="mypage-peer-list" role="region" aria-label="다른 사람 안부 목록" tabIndex={0}
          onScroll={(event) => saveScroll(event.currentTarget.scrollTop)}>
          {failed ? <div className="mypage-peer-status" role="alert">
            <p>다른 사람의 안부를 불러오지 못했어요.</p><button type="button" onClick={onRetry}>다시 시도</button>
          </div> : loading ? <p className="mypage-peer-status" role="status">안부를 불러오는 중이에요.</p>
            : greetings.length === 0 ? <p className="mypage-peer-status" role="status">아직 같은 퀘스트를 다녀온 다른 사람의 안부가 없어요.</p>
            : <ul>{greetings.map((greeting) => <li key={greeting.id}>
              <Link to={greetingPath(greeting.submissionId)} className="mypage-peer-row">
                <RemotePhoto photoUrl={greeting.photoUrl} alt={`${greeting.senderName} 님의 수행 사진`} />
                <span className="mypage-peer-copy"><strong>{greeting.senderName} 님</strong>
                  <time dateTime={greeting.createdAt}>{greeting.createdAt.slice(0, 10)}</time>
                  <span>{greeting.greeting}</span></span>
                <ChevronRight size={16} aria-hidden="true" />
              </Link>
            </li>)}</ul>}
        </div>
      </SwipeSheet>
    </div>
  );
}
