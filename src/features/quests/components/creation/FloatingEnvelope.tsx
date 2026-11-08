import { motion, useIsPresent } from 'motion/react'

type Props = {
  failed: boolean
  uncertain: boolean
  active: boolean
  reducedMotion: boolean
}

export default function FloatingEnvelope({ failed, uncertain, active, reducedMotion }: Props) {
  const present = useIsPresent()
  const floating = present && active && !reducedMotion

  return (
    <motion.svg
      viewBox="0 0 360 280"
      className="creation-envelope"
      aria-hidden="true"
      initial={false}
      animate={{ y: floating ? [0, -8, 0] : 0 }}
      transition={{ duration: floating ? 4 : 0.2, repeat: floating ? Infinity : 0, ease: 'easeInOut' }}
    >
      {/* 봉투만 독립된 레이어로 움직이고 문구와 버튼은 고정합니다. */}
      <g transform="rotate(-10 180 140)">
        <rect x="22" y="54" width="316" height="200" rx="20" fill="var(--envelope-paper)" stroke="var(--envelope-border)" />
        <path
          d="M22 74Q22 54 42 54H318Q338 54 338 74L196 163Q180 173 164 163Z"
          fill="var(--envelope-flap)"
        />
        <path d="M26 237L130 160M334 237L230 160" fill="none" stroke="var(--envelope-border)" />
        <circle cx="180" cy="166" r="34" fill="var(--envelope-paper)" fillOpacity="0.9" stroke="var(--envelope-seal)" />
        <circle cx="180" cy="166" r="28" fill="none" stroke="var(--envelope-seal)" />
        <text x="180" y="171" textAnchor="middle" fill="var(--envelope-ink)" fontSize="13" fontWeight="500">
          {uncertain ? '확인' : failed ? '반송' : '완료'}
        </text>
      </g>
    </motion.svg>
  )
}
