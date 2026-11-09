import { useState } from "react";
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
};

export default function GreetingEnvelope({
  greeting, questType, loading, failed, statusMessage, onRetry,
  canLike, liked, liking, likeFailed, onLike, hasNext, onNext,
}: Props) {
  const reducedMotion = useReducedMotion();
  const [flapOpened, setFlapOpened] = useState(false);
  const [complete, setComplete] = useState(false);
  const flapAngle = useMotionValue(0);
  // 뚜껑이 수직이 된 순간에만 편지지 뒤로 보내고, 깊이 순서를 보간하지 않습니다.
  const flapLayer = useTransform(flapAngle, (angle) => angle <= -90 ? 1 : 5);
  const opening = Boolean(greeting) && !reducedMotion && !complete;
  const animated = Boolean(greeting) && !reducedMotion;
  const reveal = { delay: animated ? 1.2 : 0, duration: animated ? 0.3 : 0 };

  return (
    <div className="greeting-scene" data-quest-type={questType} data-opening={opening} aria-busy={opening}>
      <motion.div
        className="greeting-reader"
        inert={opening}
        aria-hidden={opening}
        initial={animated ? { "--greeting-paper-offset": 1 } : false}
        animate={{ "--greeting-paper-offset": 0 }}
        transition={{ delay: animated ? 0.55 : 0, duration: animated ? 0.8 : 0, ease: [0.22, 1, 0.36, 1] }}
      >
        <GreetingLetter greeting={greeting} loading={loading} failed={failed} statusMessage={statusMessage} onRetry={onRetry} />
      </motion.div>
      <div className="greeting-envelope-bottom">
        {greeting && (
          <>
            <div className="greeting-envelope-lining" aria-hidden="true" />
            <div className="greeting-envelope-back" aria-hidden="true" style={{ visibility: flapOpened || reducedMotion ? "visible" : "hidden" }} />
            {animated && !flapOpened && (
              <motion.div
                className="greeting-envelope-flap"
                aria-hidden="true"
                initial={{ rotateX: 0, scaleY: 28 / 36 }}
                animate={{ rotateX: [0, -90, -180], scaleY: [28 / 36, 0.9, 1] }}
                transition={{ delay: 0.15, duration: 0.55, times: [0, 0.5, 1], ease: "easeInOut" }}
                style={{ rotateX: flapAngle, zIndex: flapLayer, transformPerspective: 1000, transformOrigin: "50% 0" }}
                onAnimationComplete={() => setFlapOpened(true)}
              >
                <div className="greeting-envelope-flap-face" />
                <div className="greeting-envelope-flap-face greeting-envelope-flap-inside" />
              </motion.div>
            )}
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
          <button className="greeting-next" type="button" disabled={opening || !hasNext} onClick={() => { if (!opening && hasNext) onNext(); }}>다음 안부 보기</button>
        </motion.footer>
      </div>
    </div>
  );
}
