// 봉투가 먼저 나타난 뒤 사진 엽서가 안쪽에서 올라오는 세 번째 온보딩 장면입니다.
import { useEffect, useId, useRef, useState } from 'react'
import { motion, useAnimationControls, type Variants } from 'motion/react'
import background from '@/assets/onboarding/layers/greeting/background.png'
import envelopeBack from '@/assets/onboarding/layers/greeting/envelope-back.png'
import postcard from '@/assets/onboarding/layers/greeting/postcard.png'
import envelopeFront from '@/assets/onboarding/layers/greeting/envelope-front.png'
import type { OnboardingSceneProps } from '@/features/auth/types/onboarding'

const envelopeMotion: Variants = {
  hidden: { y: 12, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.32, ease: 'easeOut' } },
}
const postcardMotion: Variants = {
  hidden: { y: 520, opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: {
      y: { duration: 0.65, delay: 0.35, ease: 'easeOut' },
      opacity: { duration: 0.12, delay: 0.35 },
    },
  },
}

export default function GreetingScene({ active, reducedMotion }: OnboardingSceneProps) {
  // 같은 장면이 여러 번 렌더링돼도 SVG의 클리핑 ID가 겹치지 않게 합니다.
  const postcardClipId = useId()
  const controls = useAnimationControls()
  const loaded = useRef(new Set<string>())
  const [ready, setReady] = useState(false)

  function markLoaded(layer: string) {
    loaded.current.add(layer)
    if (loaded.current.size === 4) setReady(true)
  }

  useEffect(() => {
    if (!active || !ready || reducedMotion) return
    void controls.start('visible')
    return () => controls.stop()
  }, [active, ready, reducedMotion, controls])

  return (
    <svg
      viewBox="0 0 1000 1000"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="하늘색 편지봉투 안에서 모습을 드러낸 가게의 사진 엽서"
      data-active={active}
      data-reduced-motion={reducedMotion}
      className="h-full w-full"
    >
      <defs>
        <clipPath id={postcardClipId}>
          {/* 움직이는 엽서가 봉투 아래로 새어 나오지 않도록 고정된 영역으로 제한합니다. */}
          <rect width="1000" height="900" />
        </clipPath>
      </defs>
      <image data-layer="background" href={background} width="1000" height="1000" onLoad={() => markLoaded('background')} />
      <motion.g data-layer="envelope-back" initial={reducedMotion ? 'visible' : 'hidden'} animate={controls} variants={envelopeMotion}>
        <image href={envelopeBack} width="1000" height="1000" onLoad={() => markLoaded('envelope-back')} />
      </motion.g>
      <g data-layer="postcard" clipPath={`url(#${postcardClipId})`}>
        {/* 마스크는 고정하고 안쪽 엽서만 이동해야 봉투 앞면 뒤에서 올라옵니다. */}
        <motion.g initial={reducedMotion ? 'visible' : 'hidden'} animate={controls} variants={postcardMotion}>
          <image href={postcard} width="1000" height="1000" onLoad={() => markLoaded('postcard')} />
        </motion.g>
      </g>
      {/* 앞면을 마지막에 그려 엽서의 아래쪽이 봉투 안에 들어가 있는 것처럼 보이게 합니다. */}
      <motion.g data-layer="envelope-front" initial={reducedMotion ? 'visible' : 'hidden'} animate={controls} variants={envelopeMotion}>
        <image href={envelopeFront} width="1000" height="1000" onLoad={() => markLoaded('envelope-front')} />
      </motion.g>
    </svg>
  )
}
