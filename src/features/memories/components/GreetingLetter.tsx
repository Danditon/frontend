import { RemotePhoto } from "@/shared/components/RemotePhoto";
import type { Greeting } from "../types";

type Props = {
  greeting?: Greeting;
  statusMessage: string;
  loading: boolean;
  failed: boolean;
  onRetry: () => void;
};

export default function GreetingLetter({
  greeting, statusMessage, loading, failed, onRetry,
}: Props) {
  if (!greeting) {
    return (
      <div className="greeting-empty" role={failed ? "alert" : "status"} aria-busy={loading}>
        <p>{statusMessage}</p>
        {failed && <button type="button" onClick={onRetry}>다시 시도</button>}
      </div>
    );
  }

  return (
    <article className="greeting-letter" aria-label="도착한 안부">
      {greeting.photoUrl && <RemotePhoto className="greeting-photo" photoUrl={greeting.photoUrl} alt="도착한 안부 사진" />}
      <p className="greeting-text">{greeting.greeting}</p>
      <p className="greeting-sender">
        From. {greeting.senderName}
        {greeting.createdAt && <> | <time dateTime={greeting.createdAt}>{greeting.createdAt.slice(0, 10)}</time></>}
      </p>
    </article>
  );
}
