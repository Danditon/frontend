// 화면과 같은 진행값으로 파란 막대를 이동하고, 도착한 단계는 읽기 도구에 안내합니다.
import { motion, useTransform, type MotionValue } from 'motion/react'

type Props = {
  currentIndex: number
  total: number
  progress: MotionValue<number>
}

export default function OnboardingProgress({ currentIndex, total, progress }: Props) {
  // 칸 너비 2rem + 간격 0.5rem입니다. rem 단위를 사용해 글꼴 크기 변경에도 맞춥니다.
  const indicatorX = useTransform(progress, (value) => `${value * 2.5}rem`)

  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">{total}단계 중 {currentIndex + 1}단계</span>
      <div aria-hidden="true" className="relative mx-auto w-fit">
        <ol className="flex items-center gap-2">
          {Array.from({ length: total }, (_, index) => (
            <li key={index} className="flex h-1.5 w-8 justify-center">
              <span className="h-1.5 w-5 rounded-full bg-[#EAE7DF]" />
            </li>
          ))}
        </ol>
        {/* 회색 칸의 너비를 바꾸지 않고 파란 막대 하나만 위에서 이동합니다. */}
        <motion.span
          style={{ x: indicatorX }}
          className="pointer-events-none absolute top-0 left-0 h-1.5 w-8 rounded-full bg-[#557582]"
        />
      </div>
    </div>
  )
}
