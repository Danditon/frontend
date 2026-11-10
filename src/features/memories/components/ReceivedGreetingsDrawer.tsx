import { useRef, type CSSProperties } from "react";
import { Link } from "react-router";
import { ChevronRight, Mail, X } from "lucide-react";
import { RemotePhoto } from "@/shared/components/RemotePhoto";
import { Drawer, DrawerClose, DrawerContent, DrawerDescription, DrawerHeader, DrawerTitle } from "@/shared/components/ui/drawer";
import type { SubmissionGreeting } from "../lib/greetingViews";

type Props = {
  open: boolean;
  questId?: string;
  title: string;
  greetings: SubmissionGreeting[];
  loading: boolean;
  failed: boolean;
  errorMessage: string;
  onClose: () => void;
  onRetry: () => void;
  greetingPath: (submissionId: number) => string;
  restoreScroll: (element: HTMLDivElement | null) => void;
  saveScroll: (top: number) => void;
};

export default function ReceivedGreetingsDrawer({ open, questId, title, greetings, loading, failed, errorMessage,
  onClose, onRetry, greetingPath, restoreScroll, saveScroll,
}: Props) {
  const closeButton = useRef<HTMLButtonElement>(null);
  return (
    <Drawer open={open} onOpenChange={next => { if (!next) onClose(); }} showSwipeHandle>
      <DrawerContent id="received-greetings-drawer" className="received-greetings-drawer"
        style={{ "--drawer-content-height": "82dvh", "--drawer-content-max-height": "calc(100dvh - 48px)" } as CSSProperties}
        initialFocus={closeButton}
        finalFocus={() => questId ? document.getElementById(`memory-card-${questId}`) : null}>
        <DrawerHeader className="received-greetings-header">
          <DrawerTitle>{title}</DrawerTitle>
          <DrawerDescription>
            {loading ? "안부를 불러오는 중이에요." : failed ? "받은 안부" : `도착한 안부 ${greetings.length}통`}
          </DrawerDescription>
          <DrawerClose ref={closeButton} aria-label="받은 안부 목록 닫기"><X size={20} aria-hidden="true" /></DrawerClose>
        </DrawerHeader>
        <div ref={restoreScroll} className="received-greetings-list" role="region" aria-label="받은 안부 목록" tabIndex={0}
          onScroll={event => saveScroll(event.currentTarget.scrollTop)}>
          {failed ? <div className="received-greetings-status" role="alert">
            <p>{errorMessage}</p><button type="button" onClick={onRetry}>다시 시도</button>
          </div> : loading ? <p className="received-greetings-status" role="status">안부를 확인하고 있어요.</p>
            : greetings.length === 0 ? <div className="received-greetings-status" role="status">
              <Mail size={32} aria-hidden="true" /><p>아직 도착한 안부가 없어요.</p><small>누군가 다녀오면 이곳에 안부가 도착해요.</small>
            </div>
            : <ul>{greetings.map(greeting => <li key={greeting.id}>
              <Link to={greetingPath(greeting.submissionId)} className="received-greetings-row">
                {greeting.photoUrl?.trim()
                  ? <RemotePhoto photoUrl={greeting.photoUrl} alt={`${greeting.senderName} 님의 안부 사진`} />
                  : <span className="received-greetings-no-photo" aria-hidden="true"><Mail size={24} /></span>}
                <span className="received-greetings-copy">
                  <strong>{greeting.senderName} 님</strong>
                  <time dateTime={greeting.createdAt}>{greeting.createdAt.slice(0, 10).replaceAll("-", ".")}</time>
                  <span>{greeting.greeting}</span>
                </span>
                <ChevronRight size={18} aria-hidden="true" />
              </Link>
            </li>)}</ul>}
        </div>
      </DrawerContent>
    </Drawer>
  );
}
