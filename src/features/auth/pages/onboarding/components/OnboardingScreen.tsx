// 온보딩 세 화면과 다음·건너뛰기·시작하기 동작을 구성하는 컴포넌트입니다.
import { useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import { onboardingSteps } from '../data/onboardingSteps'
import OnboardingProgress from './OnboardingProgress'
import OnboardingVisual from './OnboardingVisual'

export default function OnboardingScreen() {
  const navigate = useNavigate()
  const [currentIndex, setCurrentIndex] = useState(0)
  const headingRef = useRef<HTMLHeadingElement>(null)
  const finished = useRef(false)
  const step = onboardingSteps[currentIndex]
  const isLastStep = currentIndex === onboardingSteps.length - 1

  useEffect(() => {
    // 화면이 바뀌면 키보드와 스크린리더도 새 제목부터 읽도록 합니다.
    headingRef.current?.focus({ preventScroll: true })
  }, [currentIndex])

  function finishOnboarding() {
    if (finished.current) return
    finished.current = true
    // 완료 후 뒤로가기로 온보딩에 다시 진입하지 않도록 현재 경로를 교체합니다.
    navigate('/', { replace: true })
  }

  function handleNext() {
    if (isLastStep) {
      finishOnboarding()
      return
    }

    setCurrentIndex((previous) => Math.min(previous + 1, onboardingSteps.length - 1))
  }

  return (
    <main
      className="grid min-h-dvh place-items-center bg-[#F2F3EF] min-[501px]:p-6"
      style={{ fontFamily: '"Pretendard", system-ui, sans-serif' }}
    >
      {/* 공통 navbar 없이 표시하고, 작은 화면에서는 그림을 줄이거나 세로 스크롤합니다. */}
      <section
        aria-labelledby="onboarding-heading"
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

        <div className="shrink-0 px-7 pt-[clamp(1.25rem,4dvh,2.5rem)]">
          <h1
            id="onboarding-heading"
            ref={headingRef}
            tabIndex={-1}
            className="whitespace-pre-line text-[clamp(1.75rem,4.2dvh,2.125rem)] leading-[1.22] font-bold tracking-[-0.05em] outline-none"
          >
            {step.title}
          </h1>
          <p className="mt-4 whitespace-pre-line text-[15px] leading-[1.65] tracking-[-0.025em] text-[#526165]">
            {step.description}
          </p>
        </div>

        {/* 현재는 정적 그림이며 visual 객체를 교체하면 이 영역에 애니메이션을 넣습니다. */}
        <div className="flex min-h-[160px] flex-1 items-center justify-center overflow-hidden">
          <OnboardingVisual key={step.id} visual={step.visual} />
        </div>

        <footer className="shrink-0 px-5 pt-3 pb-[max(1.25rem,env(safe-area-inset-bottom,0px))]">
          <OnboardingProgress currentIndex={currentIndex} total={onboardingSteps.length} />
          <button
            type="button"
            onClick={handleNext}
            className="mt-6 flex min-h-13 w-full cursor-pointer items-center justify-center rounded-full bg-[#242624] px-6 text-base font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[#557582]"
          >
            {isLastStep ? '시작하기' : '다음'}
          </button>
        </footer>
      </section>
    </main>
  )
}
