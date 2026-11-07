// 풍경과 점선이 함께 올라오고, 등장 후 점선 강조를 반복하는 두 번째 장면입니다.
import { useEffect, useRef, useState } from 'react'
import { motion, useAnimationControls, type Variants } from 'motion/react'
import background from '@/assets/onboarding/layers/visit/background.png'
import street from '@/assets/onboarding/layers/visit/street.png'
import person from '@/assets/onboarding/layers/visit/person.png'
import type { OnboardingSceneProps } from '@/features/auth/types/onboarding'
import VisitRoute from './VisitRoute'

const streetMotion: Variants = {
  hidden: { y: 80, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.5, ease: 'easeOut' } },
}
const personMotion: Variants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { duration: 0.3, delay: 0.15, ease: 'easeOut' } },
}

export default function VisitScene({ active, reducedMotion }: OnboardingSceneProps) {
  const controls = useAnimationControls()
  const loaded = useRef(new Set<string>())
  const [ready, setReady] = useState(false)
  const [entered, setEntered] = useState(false)

  function markLoaded(layer: string) {
    loaded.current.add(layer)
    if (loaded.current.size === 3) setReady(true)
  }

  useEffect(() => {
    if (!active || !ready || reducedMotion) return
    let cancelled = false
    void controls.start('visible').then(() => {
      // 등장 도중 다른 페이지로 이동했다면 점선 반복을 시작하지 않습니다.
      if (!cancelled) setEntered(true)
    })
    return () => {
      cancelled = true
      controls.stop()
    }
  }, [active, ready, reducedMotion, controls])

  return (
    <svg
      viewBox="0 0 1000 1000"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="사람의 발 근처에서 그리운 가게까지 이어지는 점선 길"
      data-active={active}
      data-reduced-motion={reducedMotion}
      className="h-full w-full"
    >
      <image data-layer="background" href={background} width="1000" height="1000" onLoad={() => markLoaded('background')} />
      {/* 점선도 같은 그룹에 넣어 풍경과 동시에 같은 거리만큼 올라오게 합니다. */}
      <motion.g data-layer="street" initial={reducedMotion ? 'visible' : 'hidden'} animate={controls} variants={streetMotion}>
        <image href={street} width="1000" height="1000" onLoad={() => markLoaded('street')} />
        <VisitRoute active={active && ready && entered} reducedMotion={reducedMotion} />
      </motion.g>
      <motion.g data-layer="person" initial={reducedMotion ? 'visible' : 'hidden'} animate={controls} variants={personMotion}>
        <image href={person} width="1000" height="1000" onLoad={() => markLoaded('person')} />
      </motion.g>
    </svg>
  )
}
