// 로그인 화면을 배치하고 인증 API·사용자 확인·홈 이동을 연결합니다.
import { useEffect, useRef, useState } from 'react'
import { useLocation, useNavigate } from 'react-router'
import axios from 'axios'
import { login, getMe } from '@/features/auth/api/auth'
import type { LoginRequest } from '@/features/auth/types/auth'
import { getAuthErrorMessage } from '@/features/auth/utils/getAuthErrorMessage'
import LoginHeader from './LoginHeader'
import LoginForm from './LoginForm'

export default function LoginScreen() {
  const navigate = useNavigate()
  const location = useLocation()
  const requestRef = useRef<AbortController | null>(null)
  const [isRequesting, setIsRequesting] = useState(false)
  const registeredEmail = typeof location.state?.registeredEmail === 'string'
    ? location.state.registeredEmail
    : ''

  useEffect(() => () => {
    requestRef.current?.abort()
    requestRef.current = null
  }, [])

  async function handleLogin(values: LoginRequest) {
    if (requestRef.current) return

    const controller = new AbortController()
    requestRef.current = controller
    setIsRequesting(true)
    let step: 'login' | 'session' | 'storage' = 'login'

    try {
      const result = await login(values, controller.signal)
      step = 'session'
      const user = await getMe(result.accessToken, controller.signal)
      if (controller.signal.aborted) return
      if (user.userId !== result.userId) {
        throw new Error('로그인 응답과 사용자 정보가 일치하지 않아요.')
      }

      step = 'storage'
      // shortcut: 현재는 토큰만 보관합니다. 세션 복원·경로 보호는 AuthProvider 단계에서 연결합니다.
      sessionStorage.setItem('accessToken', result.accessToken)
      navigate('/', { replace: true })
    } catch (error) {
      if (axios.isCancel(error)) throw error
      // Axios 설정에 포함된 비밀번호나 내부 오류를 화면에 노출하지 않습니다.
      throw new Error(getAuthErrorMessage(error, step), { cause: error })
    } finally {
      if (requestRef.current === controller) {
        requestRef.current = null
        setIsRequesting(false)
      }
    }
  }

  return (
    <section
      aria-labelledby="login-heading"
      className="flex min-h-full flex-col bg-white px-6 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-[calc(2.5rem+env(safe-area-inset-bottom,0px))] text-[#242624]"
      style={{ fontFamily: '"Pretendard", system-ui, sans-serif' }}
    >
      <LoginHeader />

      {/* 작은 화면에서는 고정 배치 대신 페이지 스크롤로 폼에 접근합니다. */}
      <div className="mt-auto pt-24">
        <LoginForm
          initialEmail={registeredEmail}
          disabled={isRequesting}
          onSubmit={handleLogin}
        />
      </div>
    </section>
  )
}
