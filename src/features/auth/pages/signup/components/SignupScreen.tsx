// 회원가입 API와 화면 배치·기존 키프레임을 사용한 진입·복귀 동작을 연결합니다.
import { useCallback, useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { signup } from '@/features/auth/api/auth'
import type { SignupRequest } from '@/features/auth/types/auth'
import { getSafeReturnTo } from '@/features/auth/utils/getSafeReturnTo'
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
  const location = useLocation()
  const returnTo = getSafeReturnTo(new URLSearchParams(location.search).get('returnTo'))
  const loginHref = returnTo === '/'
    ? '/login'
    : `/login?${new URLSearchParams({ returnTo })}`
  const navigationFinished = useRef(false)
  const requestRef = useRef<AbortController | null>(null)
  const registeredEmail = useRef<string | null>(null)
  const [isRequesting, setIsRequesting] = useState(false)
  const [phase, setPhase] = useState<MotionPhase>(() =>
    prefersReducedMotion() ? 'idle' : 'enter',
  )

  const navigateToLogin = useCallback(() => {
    if (navigationFinished.current) return
    navigationFinished.current = true
    // 직접 접속·가입 성공 모두 로그인으로 돌아가며 비밀번호는 이동 상태에 남기지 않습니다.
    navigate(loginHref, {
      replace: true,
      state: registeredEmail.current ? { registeredEmail: registeredEmail.current } : undefined,
    })
  }, [navigate, loginHref])

  const finishMotion = useCallback(() => {
    if (phase === 'enter') {
      // 진입 애니메이션을 해제해야 같은 키프레임을 복귀 때 다시 실행할 수 있습니다.
      setPhase('idle')
    } else if (phase === 'exit') {
      navigateToLogin()
    }
  }, [phase, navigateToLogin])

  useEffect(() => {
    if (phase === 'idle') return

    // 종료 이벤트가 취소되거나 오지 않아도 화면 이동이 막히지 않게 합니다.
    const timer = window.setTimeout(finishMotion, 400)

    return () => window.clearTimeout(timer)
  }, [phase, finishMotion])

  useEffect(() => () => {
    requestRef.current?.abort()
    requestRef.current = null
  }, [])

  async function handleSignup(values: SignupRequest) {
    if (requestRef.current || phase !== 'idle') return

    const controller = new AbortController()
    requestRef.current = controller
    setIsRequesting(true)

    try {
      await signup(values, controller.signal)
      if (controller.signal.aborted) return

      // 201과 응답 검사를 통과한 경우에만 복귀 애니메이션을 시작합니다.
      registeredEmail.current = values.email
      if (prefersReducedMotion()) {
        navigateToLogin()
      } else {
        setPhase('exit')
      }
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null
        setIsRequesting(false)
      }
    }
  }

  function handleReturnToLogin() {
    if (phase !== 'idle' || navigationFinished.current || requestRef.current) return

    if (prefersReducedMotion()) {
      navigateToLogin()
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
          disabled={phase !== 'idle' || isRequesting}
        />

        {/* 입력 영역은 고정하지 않아 작은 화면과 키보드 환경에서 스크롤됩니다. */}
        <div className="my-auto py-10">
          <SignupForm
            onSubmit={handleSignup}
            disabled={phase !== 'idle' || isRequesting}
          />
        </div>
      </section>
    </div>
  )
}
