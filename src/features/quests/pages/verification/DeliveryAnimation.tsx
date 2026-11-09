import { useId, useState } from "react";
import { motion } from "motion/react";

type Props = {
  photoUrl: string | null;
  note: string;
  delivered: boolean;
  reducedMotion: boolean;
  onComplete: () => void;
};

const mailboxFront = "M250 150a36 36 0 0 1 72 0v82h-72Z";
const timing = { duration: 4, ease: "linear" as const };

export default function DeliveryAnimation({ photoUrl, note, delivered, reducedMotion, onComplete }: Props) {
  const id = useId();
  const [failedPhoto, setFailedPhoto] = useState<string | null>(null);
  const moving = !delivered && !reducedMotion;
  const paper = (
    <g clipPath={`url(#${id}-paper)`}>
      <motion.g
        data-layer="paper"
        initial={moving ? { y: 0 } : false}
        animate={{ y: moving ? [0, 67, 67] : 67 }}
        transition={{ ...timing, times: [0, 0.2, 1] }}
      >
        <rect x="-31" y="-91" width="62" height="80" rx="5" fill="white" stroke="#bed9e5" />
        {photoUrl && failedPhoto !== photoUrl ? (
          <image
            href={photoUrl} x="-28" y="-88" width="56" height="74"
            preserveAspectRatio="xMidYMid slice"
            onError={() => setFailedPhoto(photoUrl)}
          />
        ) : (
          <g data-layer="note-paper">
            <path d="M-22-73H22M-22-63H22M-22-53H12" stroke="#bed9e5" strokeWidth="2" strokeLinecap="round" />
            <text x="0" y="-35" textAnchor="middle" fill="#6196a8" fontSize="5">{[...note.trim()].slice(0, 12).join("") || "오늘의 안부를 전해요"}</text>
            <path d="M-5-22C-5-27-1-27 0-24C1-27 5-27 5-22C5-19 0-16 0-16S-5-19-5-22Z" fill="#7daabd" />
          </g>
        )}
      </motion.g>
    </g>
  );

  return (
    <svg className="qv-delivery-scene" viewBox="0 0 360 270" aria-hidden="true" focusable="false">
      <defs>
        <radialGradient id={`${id}-glow`}>
          <stop stopColor="#c3e1ee" stopOpacity="0.65" />
          <stop offset="1" stopColor="#c3e1ee" stopOpacity="0" />
        </radialGradient>
        <clipPath id={`${id}-paper`}><rect x="-40" y="-100" width="80" height="129" /></clipPath>
        {/* 투입구를 제외한 우체통 앞면이 봉투를 가리게 합니다. */}
        <mask id={`${id}-slot`} maskUnits="userSpaceOnUse" x="0" y="0" width="360" height="270">
          <rect width="360" height="270" fill="white" />
          <path d={mailboxFront} fill="black" />
          <rect x="262" y="161" width="48" height="10" rx="4" fill="white" />
        </mask>
      </defs>
      <ellipse cx="180" cy="169" rx="174" ry="95" fill={`url(#${id}-glow)`} />
      <ellipse cx="291" cy="242" rx="48" ry="7" fill="#7daabd" opacity="0.16" />
      <path d="M74 166Q180 62 286 166" fill="none" stroke="#94bfd2" strokeWidth="1.8" strokeDasharray="3 7" opacity="0.6" />

      <g data-layer="mailbox">
        <path d="M286 114h12c21 0 38 17 38 38v72l-14 8V150c0-20-16-36-36-36Z" fill="#94bfd2" />
        <path d={mailboxFront} fill="#7daabd" stroke="white" strokeWidth="1.5" />
        <path d="M250 232h72l14-8v10l-14 8h-66v-10" fill="#8bb3c5" />
        <rect x="262" y="161" width="48" height="10" rx="4" fill="#356978" />
        <rect x="270" y="190" width="32" height="23" rx="3" fill="#f6fbff" />
        <path d="M272 193l14 10 14-10" fill="none" stroke="#94bfd2" strokeWidth="1.5" />
      </g>

      {!delivered && (
        <g mask={`url(#${id}-slot)`}>
          <g transform="translate(74 166)">
            <motion.g
              data-layer="flight"
              style={{ originX: "0px", originY: "0px" }}
              initial={moving ? { x: 0, y: 0, scale: 1, rotate: 0, opacity: 1 } : false}
              animate={moving ? {
                x: [0, 0, 53, 106, 159, 202, 212, 212],
                y: [0, 0, -39, -52, -39, 0, 0, 0],
                scale: [1, 1, 0.82, 0.65, 0.5, 0.35, 0.05, 0.05],
                rotate: [0, 0, -8, 0, 8, 0, 0, 0],
                opacity: [1, 1, 1, 1, 1, 1, 0, 0],
              } : { x: 0, y: 0, scale: 1, rotate: 0, opacity: 1 }}
              transition={{ ...timing, times: [0, 0.3, 0.425, 0.55, 0.675, 0.8, 0.95, 1] }}
              // 사진·덮개 등 개별 레이어가 아닌 전체 4초 연출의 종료만 알립니다.
              onAnimationComplete={moving ? onComplete : undefined}
            >
              <g transform="translate(0 -29)">
                <motion.g
                  data-layer="open-flap"
                  style={{ originX: "0px", originY: "0px" }}
                  initial={moving ? { scaleY: 1 } : false}
                  animate={{ scaleY: moving ? [1, 1, 0, 0] : 0 }}
                  transition={{ ...timing, times: [0, 0.2, 0.25, 1] }}
                >
                  <path d="M-40 0L0-34L40 0Z" fill="#eaf5fa" stroke="#bed9e5" />
                </motion.g>
              </g>
              <rect x="-40" y="-29" width="80" height="58" rx="6" fill="#eef7fb" stroke="#bed9e5" />
              {paper}
              <path d="M-40-29L0 1L40-29V23Q40 29 34 29H-34Q-40 29-40 23Z" fill="white" stroke="#bed9e5" strokeLinejoin="round" />
              <path d="M-37 26L-12 0M37 26L12 0" stroke="#d3e7f4" fill="none" />
              <g transform="translate(0 -29)">
                <motion.g
                  data-layer="flap"
                  style={{ originX: "0px", originY: "0px" }}
                  initial={moving ? { scaleY: 0 } : false}
                  animate={{ scaleY: moving ? [0, 0, 1, 1] : 1 }}
                  transition={{ ...timing, times: [0, 0.25, 0.3, 1] }}
                >
                  <path d="M-40 0L0 34L40 0Z" fill="#f3faff" stroke="#bed9e5" strokeLinejoin="round" />
                </motion.g>
              </g>
              <motion.g
                data-layer="seal" initial={moving ? { opacity: 0 } : false}
                animate={{ opacity: moving ? [0, 0, 1, 1] : 1 }}
                transition={{ ...timing, times: [0, 0.28, 0.3, 1] }}
              >
                <circle cy="5" r="9" fill="#d3e7f4" />
                <path d="M-5 3C-5-1-1-1 0 2C1-1 5-1 5 3C5 7 0 10 0 10S-5 7-5 3Z" fill="#7daabd" />
              </motion.g>
            </motion.g>
          </g>
        </g>
      )}
      <rect x="262" y="161" width="48" height="10" rx="4" fill="none" stroke="#356978" strokeWidth="1.5" />
      <motion.g
        data-layer="arrival" initial={moving ? { opacity: 0 } : false}
        animate={{ opacity: moving ? [0, 0, 1, 0.65] : delivered ? 0.65 : 0 }}
        transition={{ ...timing, times: [0, 0.95, 0.98, 1] }}
      >
        <ellipse cx="286" cy="166" rx="34" ry="16" fill="#c5efff" opacity="0.35" />
        <path d="M249 112l3-7 3 7 7 3-7 3-3 7-3-7-7-3ZM328 129l2-5 2 5 5 2-5 2-2 5-2-5-5-2Z" fill="#7daabd" />
      </motion.g>
    </svg>
  );
}
