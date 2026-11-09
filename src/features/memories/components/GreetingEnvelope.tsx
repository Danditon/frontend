import { useId, useState } from "react";
import { motion, useMotionValue, useReducedMotion, useTransform } from "motion/react";
import { Heart } from "lucide-react";
import type { Greeting, Memory } from "../types";
import GreetingLetter from "./GreetingLetter";

type Props = {
  greeting?: Greeting;
  questType?: Memory["questType"];
  loading: boolean;
  failed: boolean;
  statusMessage: string;
  onRetry: () => void;
  canLike: boolean;
  liked: boolean;
  liking: boolean;
  likeFailed: boolean;
  onLike: () => void;
  hasNext: boolean;
  onNext: () => void;
  actionLabel?: string;
};

const FLAP_PATH = "M6 0 H354 Q360 0 360 3 Q360 5 355 8 L186 126 Q180 132 174 126 L5 8 Q0 5 0 3 Q0 0 6 0 Z";

function EnvelopeFlapFace({ inside = false }: { inside?: boolean }) {
  const gradientId = useId();

  return (
    <svg
      className={`greeting-envelope-flap-face${inside ? " greeting-envelope-flap-inside" : ""}`}
      viewBox="0 0 360 130"
      preserveAspectRatio="none"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={inside ? "var(--envelope-bottom)" : "var(--envelope-top)"} />
          <stop offset="100%" stopColor={inside ? "var(--envelope-top)" : "var(--envelope-bottom)"} />
        </linearGradient>
      </defs>
      {/* SVG 반전과 CSS 뒤집기를 맞춰 앞·뒷면을 같은 위치에 겹칩니다. */}
      <g transform={inside ? "translate(0 130) scale(1 -1)" : undefined}>
        <path d={FLAP_PATH} fill={`url(#${gradientId})`} stroke="#fff9" strokeWidth="1.5" vectorEffect="non-scaling-stroke" />
      </g>
    </svg>
  );
}

export default function GreetingEnvelope({
  greeting, questType, loading, failed, statusMessage, onRetry,
  canLike, liked, liking, likeFailed, onLike, hasNext, onNext, actionLabel = "다음 안부 보기",
}: Props) {
  const reducedMotion = useReducedMotion();
  const [complete, setComplete] = useState(false);
  const flapAngle = useMotionValue(reducedMotion ? -180 : 0);
  // 뚜껑이 수직이 된 순간에만 편지지 뒤로 보내고, 깊이 순서를 보간하지 않습니다.
  const flapLayer = useTransform(flapAngle, (angle) => angle <= -90 ? 1 : 5);
  const opening = Boolean(greeting) && !reducedMotion && !complete;
  const animated = Boolean(greeting) && !reducedMotion;
  const reveal = { delay: animated ? 1.65 : 0, duration: animated ? 0.3 : 0 };

  return (
    <div className="greeting-scene" data-quest-type={questType} data-opening={opening} aria-busy={opening}>
      <motion.div
        className="greeting-reader"
        inert={opening}
        aria-hidden={opening}
        initial={animated ? { "--greeting-paper-offset": 1 } : false}
        animate={{ "--greeting-paper-offset": 0 }}
        transition={{ delay: animated ? 0.8 : 0, duration: animated ? 0.95 : 0, ease: [0.22, 1, 0.36, 1] }}
      >
        <GreetingLetter greeting={greeting} loading={loading} failed={failed} statusMessage={statusMessage} onRetry={onRetry} />
      </motion.div>
      <div className="greeting-envelope-bottom">
        {greeting && (
          <>
            <div className="greeting-envelope-lining" aria-hidden="true" />
            <motion.div
              className="greeting-envelope-flap"
              aria-hidden="true"
              initial={animated ? { rotateX: 0, "--flap-open-progress": 0 } : false}
              animate={{ rotateX: -180, "--flap-open-progress": 1 }}
              transition={{ delay: animated ? 0.15 : 0, duration: animated ? 0.85 : 0, ease: [0.45, 0, 0.2, 1] }}
              style={{ rotateX: flapAngle, zIndex: flapLayer, transformPerspective: 1000, transformOrigin: "50% 0" }}
            >
              <EnvelopeFlapFace />
              <EnvelopeFlapFace inside />
            </motion.div>
            <div className="greeting-envelope-front" aria-hidden="true">
              <svg className="greeting-envelope-rim" viewBox="0 0 100 100" preserveAspectRatio="none" focusable="false">
                <path d="M0 0 L50 100 L100 0" fill="none" stroke="#fff9" strokeWidth="4.5" vectorEffect="non-scaling-stroke" />
              </svg>
            </div>
          </>
        )}
        {canLike && (
          <motion.div className="greeting-reaction" inert={opening} aria-hidden={opening} initial={animated ? { opacity: 0 } : false} animate={{ opacity: 1 }} transition={reveal}>
            <button
              type="button"
              className="greeting-like"
              aria-label="안부 좋아요"
              aria-pressed={liked}
              disabled={opening || liking}
              onClick={() => { if (!opening && !liking) onLike(); }}
            >
              <Heart fill={liked ? "currentColor" : "none"} size={25} strokeWidth={1.8} />
            </button>
            <p>{liked ? "고마운 마음을 전했어요" : "좋아요로 고마움을 전해보세요"}</p>
            {likeFailed && <p role="alert">좋아요를 변경하지 못했어요. 다시 시도해 주세요.</p>}
          </motion.div>
        )}
        <motion.footer
          className="greeting-footer"
          aria-label="안부 이동"
          inert={opening}
          aria-hidden={opening}
          initial={animated ? { opacity: 0 } : false}
          animate={{ opacity: 1 }}
          transition={reveal}
          onAnimationComplete={() => setComplete(true)}
        >
          <button className="greeting-next" type="button" disabled={opening || !hasNext} onClick={() => { if (!opening && hasNext) onNext(); }}>{actionLabel}</button>
        </motion.footer>
      </div>
    </div>
  );
}
