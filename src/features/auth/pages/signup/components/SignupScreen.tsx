// 회원가입 화면의 배치와 기존 키프레임을 사용한 진입·복귀 동작을 담당합니다.
import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router'
import SignupHeader from './SignupHeader'
import SignupForm from './SignupForm'

type MotionPhase = 'enter' | 'idle' | 'exit'

function prefersReducedMotion() {
  return (
    typeof window !== 'undefined' &&
    window.matchMedia('(prefers-reduced-motion: reduce)').matches
  )
}

export default function SignupScreen() {
  const navigate = useNavigate()
  const navigationFinished = useRef(false)
  const [phase, setPhase] = useState<MotionPhase>(() =>
    prefersReducedMotion() ? 'idle' : 'enter',
  )

  const finishMotion = useCallback(() => {
    if (phase === 'enter') {
      // 진입 애니메이션을 해제해야 같은 키프레임을 복귀 때 다시 실행할 수 있습니다.
      setPhase('idle')
      return
    }

    if (phase === 'exit' && !navigationFinished.current) {
      navigationFinished.current = true
      // 직접 /signup에 접속한 경우에도 로그인 화면으로 돌아갑니다.
      navigate('/login', { replace: true })
    }
  }, [phase, navigate])

  useEffect(() => {
    if (phase === 'idle') return

    // 종료 이벤트가 취소되거나 오지 않아도 화면 이동이 막히지 않게 합니다.
    const timer = window.setTimeout(finishMotion, 400)

    return () => window.clearTimeout(timer)
  }, [phase, finishMotion])

  function handleReturnToLogin() {
    if (phase !== 'idle' || navigationFinished.current) return

    if (prefersReducedMotion()) {
      navigationFinished.current = true
      navigate('/login', { replace: true })
      return
    }

    setPhase('exit')
  }

  return (
    // 움직이는 화면이 가로 스크롤을 만들지 않도록 이 영역 안에서 잘라냅니다.
    <div className="grid min-h-full overflow-x-clip">
      <section
        aria-labelledby="signup-heading"
        className="signup-screen flex min-h-full flex-col bg-white px-6 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-[calc(2rem+env(safe-area-inset-bottom,0px))] text-[#242624]"
        style={{ fontFamily: '"Pretendard", system-ui, sans-serif' }}
        data-motion={phase}
        inert={phase === 'exit'}
        onAnimationEnd={(event) => {
          // 내부 요소에서 발생한 종료 이벤트는 화면 전환으로 처리하지 않습니다.
          if (event.target === event.currentTarget) {
            finishMotion()
          }
        }}
      >
        <SignupHeader
          onBack={handleReturnToLogin}
          disabled={phase !== 'idle'}
        />

        {/* 입력 영역은 고정하지 않아 작은 화면과 키보드 환경에서 스크롤됩니다. */}
        <div className="my-auto py-10">
          <SignupForm />
        </div>
      </section>
    </div>
  )
}
