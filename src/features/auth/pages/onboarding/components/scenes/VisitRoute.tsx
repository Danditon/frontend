// 두번쨰 온보딩 페이지에 완성된 점선 위로 사람에서 가게 방향의 작은 물결 강조를 반복하는 SVG 컴포넌트입니다.
import { useCallback, useEffect, useState } from 'react'
import { motion, useAnimationControls } from 'motion/react'
import type { OnboardingSceneProps } from '@/features/auth/types/onboarding'

const ROUTE = 'M 385 765 C 390 695 460 655 530 630 S 565 590 545 570 S 565 530 600 520 S 635 495 645 470'
const DASH_LENGTH = 14
const DASH_GAP = 13
const WAVE_DURATION = 1.5
const WAVE_REST = 2.5
const PULSE_DURATION = 0.6

export default function VisitRoute({ active, reducedMotion }: OnboardingSceneProps) {
  const controls = useAnimationControls()
  const [routeLength, setRouteLength] = useState(0)

  // 실제 곡선 길이로 조각 수를 계산해 점선을 원래 경로에 정확히 겹칩니다.
  const measureRoute = useCallback((node: SVGPathElement | null) => {
    if (!node) return
    const length = node.getTotalLength()
    if (Number.isFinite(length) && length > 0) setRouteLength(length)
  }, [])

  const dashCount = Math.ceil(routeLength / (DASH_LENGTH + DASH_GAP))
  const staggerDelay = (WAVE_DURATION - PULSE_DURATION) / Math.max(dashCount - 1, 1)

  useEffect(() => {
    if (!active || reducedMotion || dashCount === 0) return
    void controls.start('wave')
    // 별도의 interval을 남기지 않고 모든 반복 동작을 함께 정지합니다.
    return () => controls.stop()
  }, [active, reducedMotion, dashCount, controls])

  return (
    <g data-layer="route" aria-hidden="true">
      {/* 기본 점선은 항상 제자리에 두고, 그 위의 짧은 조각들만 순차적으로 강조합니다. */}
      <path ref={measureRoute} d={ROUTE} fill="none" stroke="#5E8393" strokeWidth="5" strokeDasharray={`${DASH_LENGTH} ${DASH_GAP}`} strokeLinecap="round" opacity="0.65" />
      {Array.from({ length: dashCount }, (_, index) => (
        <motion.path
          key={index}
          data-dash={index}
          d={ROUTE}
          fill="none"
          stroke="#446B7C"
          strokeWidth="5"
          strokeLinecap="round"
          // 한 번에 한 조각만 그려지도록 나머지 경로 길이는 빈 간격으로 둡니다.
          strokeDasharray={`${DASH_LENGTH} ${routeLength}`}
          strokeDashoffset={-index * (DASH_LENGTH + DASH_GAP)}
          initial={{ opacity: 0, y: 0 }}
          animate={controls}
          custom={index}
          variants={{
            wave: (position: number) => ({
              opacity: [0, 1, 0],
              y: [0, -4, 0],
              strokeWidth: [5, 7, 5],
              transition: {
                duration: PULSE_DURATION,
                delay: position * staggerDelay,
                repeat: Infinity,
                // 각 조각의 주기를 같게 맞춰 마지막 조각 이후 2.5초 쉬도록 합니다.
                repeatDelay: WAVE_DURATION + WAVE_REST - PULSE_DURATION,
                ease: 'easeInOut',
              },
            }),
          }}
        />
      ))}
    </g>
  )
}
