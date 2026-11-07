// 지도 위로 사진과 종이가 양옆에서 들어와 겹쳐지는 첫 번째 온보딩 장면입니다.
import { useEffect, useRef, useState } from 'react'
import { motion, useAnimationControls, type Variants } from 'motion/react'
import background from '@/assets/onboarding/layers/memory/background.png'
import paper from '@/assets/onboarding/layers/memory/paper.png'
import photo from '@/assets/onboarding/layers/memory/photo.png'
import type { OnboardingSceneProps } from '@/features/auth/types/onboarding'

const photoMotion: Variants = {
  hidden: { x: -160, opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { duration: 0.65, ease: 'easeOut' } },
}
const paperMotion: Variants = {
  hidden: { x: 140, opacity: 0 },
  visible: { x: 0, opacity: 1, transition: { duration: 0.65, delay: 0.12, ease: 'easeOut' } },
}

export default function MemoryScene({ active, reducedMotion }: OnboardingSceneProps) {
  const controls = useAnimationControls()
  const loaded = useRef(new Set<string>())
  const [ready, setReady] = useState(false)

  function markLoaded(layer: string) {
    loaded.current.add(layer)
    if (loaded.current.size === 3) setReady(true)
  }

  useEffect(() => {
    if (!active || !ready || reducedMotion) return
    void controls.start('visible')
    // 화면을 떠날 때 초기 위치로 돌리지 않고 현재 모양에서 멈춥니다.
    return () => controls.stop()
  }, [active, ready, reducedMotion, controls])

  return (
    <svg
      viewBox="0 0 1000 1000"
      preserveAspectRatio="xMidYMid meet"
      role="img"
      aria-label="지도 위에 겹쳐 놓은 그리운 가게의 사진과 추억을 남긴 종이"
      data-active={active}
      data-reduced-motion={reducedMotion}
      className="h-full w-full"
    >
      {/* 모든 레이어가 같은 화폭을 사용해 화면 크기가 바뀌어도 위치 관계를 유지합니다. */}
      <image data-layer="background" href={background} width="1000" height="1000" onLoad={() => markLoaded('background')} />
      <motion.g data-layer="paper" initial={reducedMotion ? 'visible' : 'hidden'} animate={controls} variants={paperMotion}>
        <image href={paper} width="1000" height="1000" onLoad={() => markLoaded('paper')} />
      </motion.g>
      <motion.g data-layer="photo" initial={reducedMotion ? 'visible' : 'hidden'} animate={controls} variants={photoMotion}>
        <image href={photo} width="1000" height="1000" onLoad={() => markLoaded('photo')} />
      </motion.g>
    </svg>
  )
}
