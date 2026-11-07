// 온보딩 세 화면과 다음·건너뛰기·시작하기 동작을 구성하는 컴포넌트입니다.
import { useEffect, useRef, useState } from 'react'
import { animate, motion, useMotionValue, useReducedMotion, useTransform, type AnimationPlaybackControls } from 'motion/react'
import { useNavigate } from 'react-router'
import { onboardingSteps } from '../data/onboardingSteps'
import OnboardingProgress from './OnboardingProgress'
import OnboardingVisual from './OnboardingVisual'

export default function OnboardingScreen() {
  const navigate = useNavigate()
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isTransitioning, setIsTransitioning] = useState(false)
  // 화면과 하단 표시가 같은 중간값을 읽어 매 프레임 함께 이동합니다.
  const pageProgress = useMotionValue(0)
  const screenX = useTransform(pageProgress, (value) => `${-value * 100}%`)
  const reducedMotion = useReducedMotion()
  const animationRef = useRef<AnimationPlaybackControls | null>(null)
  const moving = useRef(false)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const finished = useRef(false)
  const isLastStep = currentIndex === onboardingSteps.length - 1

  useEffect(() => {
    // 도착한 화면의 제목부터 읽도록 전환이 끝난 후 포커스를 옮깁니다.
    if (!isTransitioning) headingRef.current?.focus({ preventScroll: true })
  }, [currentIndex, isTransitioning])

  useEffect(() => () => {
    moving.current = false
    animationRef.current?.stop()
    animationRef.current = null
  }, [])

  function finishOnboarding() {
    if (finished.current) return
    finished.current = true
    moving.current = false
    animationRef.current?.stop()
    animationRef.current = null
    // 완료 후 뒤로가기로 온보딩에 다시 진입하지 않도록 현재 경로를 교체합니다.
    navigate('/', { replace: true })
  }

  function handleNext() {
    // React가 버튼을 비활성화하기 전의 빠른 연속 클릭도 막습니다.
    if (finished.current || moving.current) return

    if (isLastStep) {
      finishOnboarding()
      return
    }

    const nextIndex = currentIndex + 1
    if (reducedMotion) {
      pageProgress.set(nextIndex)
      setCurrentIndex(nextIndex)
      return
    }

    moving.current = true
    setIsTransitioning(true)
    animationRef.current = animate(pageProgress, nextIndex, {
      duration: 0.35,
      ease: 'easeInOut',
      onComplete: () => {
        if (!moving.current || finished.current) return
        moving.current = false
        animationRef.current = null
        setCurrentIndex(nextIndex)
        setIsTransitioning(false)
      },
    })
  }

  return (
    <main
      className="grid min-h-dvh place-items-center bg-[#F2F3EF] min-[501px]:p-6"
      style={{ fontFamily: '"Pretendard", system-ui, sans-serif' }}
    >
      {/* 공통 navbar 없이 표시하고, 작은 화면에서는 그림을 줄이거나 세로 스크롤합니다. */}
      <section
        aria-labelledby={`onboarding-heading-${currentIndex}`}
        className="flex h-dvh w-full max-w-[500px] flex-col overflow-y-auto overscroll-contain bg-[#FCFDFB] text-[#242624] min-[501px]:h-[calc(100dvh-3rem)] min-[501px]:max-w-[390px] min-[501px]:rounded-[28px] min-[501px]:shadow-lg"
      >
        <header className="flex shrink-0 items-center justify-between px-7 pt-[max(1rem,env(safe-area-inset-top,0px))]">
          <span className="text-xl font-bold tracking-[-0.05em]">그리움</span>
          <button
            type="button"
            onClick={finishOnboarding}
            className="min-h-11 cursor-pointer rounded-lg px-1 text-sm font-medium text-[#5C7079] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#557582]"
          >
            건너뛰기
          </button>
        </header>

        {/* 제목·설명·그림을 한 트랙으로 이동합니다. 화면 비율로 계산해 회전에도 대응합니다. */}
        <div className="min-h-[360px] flex-1 overflow-hidden">
          <motion.div className="flex h-full w-full" style={{ x: screenX }}>
            {onboardingSteps.map((step, index) => (
              <div
                key={step.id}
                aria-hidden={index !== currentIndex || isTransitioning}
                inert={index !== currentIndex || isTransitioning}
                className="flex h-full w-full shrink-0 flex-col"
              >
                <div className="shrink-0 px-7 pt-[clamp(1.25rem,4dvh,2.5rem)]">
                  <h1
                    id={`onboarding-heading-${index}`}
                    ref={index === currentIndex ? headingRef : undefined}
                    tabIndex={-1}
                    className="whitespace-pre-line text-[clamp(1.75rem,4.2dvh,2.125rem)] leading-[1.22] font-bold tracking-[-0.05em] outline-none"
                  >
                    {step.title}
                  </h1>
                  <p className="mt-4 whitespace-pre-line text-[15px] leading-[1.65] tracking-[-0.025em] text-[#526165]">
                    {step.description}
                  </p>
                </div>

                {/* 그림은 정적으로 유지하고, 다음 화면의 이미지도 함께 준비합니다. */}
                <div className="flex min-h-[160px] flex-1 items-center justify-center overflow-hidden">
                  <OnboardingVisual visual={step.visual} />
                </div>
              </div>
            ))}
          </motion.div>
        </div>

        <footer className="shrink-0 px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))]">
          <OnboardingProgress currentIndex={currentIndex} total={onboardingSteps.length} progress={pageProgress} />
          <button
            type="button"
            onClick={handleNext}
            disabled={isTransitioning}
            className="mt-6 flex min-h-13 w-full cursor-pointer items-center justify-center rounded-full bg-[#242624] px-6 text-base font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#557582] disabled:cursor-default"
          >
            {isLastStep ? '시작하기' : '다음'}
          </button>
        </footer>
      </section>
    </main>
  )
}
