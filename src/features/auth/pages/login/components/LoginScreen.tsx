// 공통 인증 상태를 사용해 로그인 화면과 세션 재확인·홈 이동을 연결합니다.
import { useEffect, useRef } from 'react'
import { useLocation, useNavigate } from 'react-router'
import { useAuth } from '@/features/auth/hooks/useAuth'
import type { LoginRequest } from '@/features/auth/types/auth'
import { getSafeReturnTo } from '@/features/auth/utils/getSafeReturnTo'
import { getAccessToken } from '@/features/auth/utils/tokenStorage'
import LoginHeader from './LoginHeader'
import LoginForm from './LoginForm'

export default function LoginScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const returnTo = getSafeReturnTo(new URLSearchParams(location.search).get('returnTo'))
  const signupHref = returnTo === '/'
    ? '/signup'
    : `/signup?${new URLSearchParams({ returnTo })}`
  const requestRef = useRef<AbortController | null>(null)
  const { signIn, retrySession, status, error: sessionError, isSigningIn } = useAuth()
  const registeredEmail = typeof location.state?.registeredEmail === 'string'
    ? location.state.registeredEmail
    : ''

  useEffect(() => () => {
    requestRef.current?.abort()
    requestRef.current = null
  }, [])

  // shortcut: 기존 로그아웃의 /login 이동 시 상태를 맞춥니다. 다른 로그아웃 경로가 생기면 공통 signOut으로 연결합니다.
  useEffect(() => {
    if (status !== 'authenticated') return

    let active = true
    const controller = new AbortController()

    // StrictMode의 첫 정리 작업 이후 실행해 중복 동기화를 피합니다.
    queueMicrotask(() => {
      if (!active || requestRef.current) return

      try {
        if (getAccessToken()) return
      } catch {
        // 저장소 접근 오류는 Provider의 기존 오류 처리로 전달합니다.
      }

      requestRef.current = controller
      // 토큰이 없으면 Provider가 사용자 캐시·인증 상태·만료 타이머를 정리합니다.
      void retrySession(controller.signal).finally(() => {
        if (requestRef.current === controller) requestRef.current = null
      })
    })

    return () => {
      active = false
      controller.abort()
      if (requestRef.current === controller) requestRef.current = null
    }
  }, [status, retrySession])

  async function handleLogin(values: LoginRequest) {
    if (requestRef.current) return

    const controller = new AbortController()
    requestRef.current = controller
    try {
      await signIn(values, controller.signal)
      if (controller.signal.aborted) return
      navigate(returnTo, { replace: true })
    } finally {
      if (requestRef.current === controller) requestRef.current = null
    }
  }

  async function handleRetrySession() {
    if (requestRef.current) return
    const controller = new AbortController()
    requestRef.current = controller
    try {
      const confirmed = await retrySession(controller.signal)
      if (confirmed && !controller.signal.aborted) navigate(returnTo, { replace: true })
    } finally {
      if (requestRef.current === controller) requestRef.current = null
    }
  }

  return (
    <section
      aria-labelledby="login-heading"
      className="flex min-h-full flex-col bg-white px-4 pt-[clamp(80px,17cqh,155px)] pb-[max(48px,env(safe-area-inset-bottom,0px))] text-[#242624]"
      style={{ fontFamily: '"Pretendard", system-ui, sans-serif' }}
    >
      <LoginHeader />

      {/* 작은 화면에서는 고정 배치 대신 페이지 스크롤로 폼에 접근합니다. */}
      <div className="mt-auto pt-16">
        {status === 'checking' && (
          <p role="status" className="mb-4 text-center text-sm text-[#66757B]">
            로그인 정보를 확인하는 중이에요.
          </p>
        )}
        {status === 'error' && sessionError && (
          <div className="mb-4 rounded-2xl bg-[#F4F4F4] p-4 text-center text-sm text-[#66757B]">
            <p role="alert">{sessionError}</p>
            <button
              type="button"
              onClick={() => { void handleRetrySession() }}
              disabled={isSigningIn}
              className="mt-2 min-h-11 underline underline-offset-4 disabled:opacity-50"
            >
              로그인 정보 다시 확인
            </button>
          </div>
        )}
        <LoginForm
          initialEmail={registeredEmail}
          signupHref={signupHref}
          disabled={isSigningIn || status === 'checking'}
          onSubmit={handleLogin}
        />
      </div>
    </section>
  )
}
