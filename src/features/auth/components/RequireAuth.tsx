// 인증된 사용자에게만 하위 경로를 표시하고 비로그인 사용자를 로그인으로 보냅니다.
import { useEffect, useRef } from 'react'
import { Navigate, Outlet, useLocation } from 'react-router'
import { useAuth } from '../hooks/useAuth'
import { getSafeReturnTo } from '../utils/getSafeReturnTo'
import AuthStatusPanel from './AuthStatusPanel'

export default function RequireAuth() {
  const { status, error, retrySession } = useAuth()
  const location = useLocation()
  const requestRef = useRef<AbortController | null>(null)
  const returnTo = getSafeReturnTo(`${location.pathname}${location.search}${location.hash}`)
  const loginHref = returnTo === '/'
    ? '/login'
    : `/login?${new URLSearchParams({ returnTo })}`

  useEffect(() => () => {
    requestRef.current?.abort()
    requestRef.current = null
  }, [])

  async function handleRetry() {
    if (requestRef.current) return
    const controller = new AbortController()
    requestRef.current = controller
    try {
      // 성공하면 갱신된 인증 상태로 현재 요청한 하위 화면을 표시합니다.
      await retrySession(controller.signal)
    } finally {
      if (requestRef.current === controller) requestRef.current = null
    }
  }

  // 인증 확인이 완료된 경우에만 navbar와 보호 페이지를 마운트합니다.
  if (status === 'authenticated') return <Outlet />

  if (status === 'checking') return <AuthStatusPanel status="checking" />

  if (status === 'error') {
    return (
      <AuthStatusPanel
        status="error"
        message={error}
        onRetry={() => { void handleRetry() }}
        loginHref={loginHref}
      />
    )
  }

  return <Navigate to={loginHref} replace />
}
