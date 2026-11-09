import { Heart } from "lucide-react";
import { RemotePhoto } from "@/shared/components/RemotePhoto";
import type { Greeting } from "../types";

type Props = {
  greeting?: Greeting;
  statusMessage: string;
  loading: boolean;
  failed: boolean;
  onRetry: () => void;
  canLike: boolean;
  liked: boolean;
  pending: boolean;
  likeError: boolean;
  onLike: () => void;
};

export default function GreetingLetter({
  greeting, statusMessage, loading, failed, onRetry, canLike, liked, pending, likeError, onLike,
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
      <div className="greeting-envelope" aria-hidden="true" />
      {canLike && (
        <div className="greeting-reaction">
          <button type="button" className="greeting-like" aria-label="안부 좋아요" aria-pressed={liked} disabled={pending} onClick={onLike}>
            <Heart fill={liked ? "currentColor" : "none"} />
          </button>
          <p>{liked ? "고마운 마음을 전했어요" : "좋아요로 고마움을 전해보세요"}</p>
          {likeError && <p role="alert">좋아요를 변경하지 못했어요. 다시 시도해 주세요.</p>}
        </div>
      )}
    </article>
  );
}
