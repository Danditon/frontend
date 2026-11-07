// 로그인 상태를 공유하고 앱 시작 시 저장된 토큰으로 사용자 정보를 복원합니다.
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import axios from 'axios'
import { login, getMe } from '../api/auth'
import { AuthContext } from '../hooks/useAuth'
import { useSessionExpiry } from '../hooks/useSessionExpiry'
import type { AuthState, LoginRequest } from '../types/auth'
import { getAuthErrorMessage } from '../utils/getAuthErrorMessage'
import { getTokenExpiresAt } from '../utils/getTokenExpiresAt'
import { getStoredAuthSession, saveAuthSession, removeAccessToken } from '../utils/tokenStorage'

type PendingSession = {
  accessToken: string
  // 로그인 직후에는 응답의 사용자 ID와 일치하는지도 확인합니다.
  expectedUserId?: number
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'checking', user: null, error: null })
  const [isSigningIn, setIsSigningIn] = useState(false)
  const [sessionToken, setSessionToken] = useState<string | null>(null)
  // 이전 토큰의 늦은 만료 처리가 새 로그인을 종료하지 않도록 비교합니다.
  const activeTokenRef = useRef<string | null>(null)
  const mounted = useRef(false)
  const requestRef = useRef<AbortController | null>(null)
  // 로그인은 성공했지만 사용자 조회가 실패하면 토큰을 메모리에 남겨 재확인합니다.
  const pendingSession = useRef<PendingSession | null>(null)

  const endSession = useCallback((expectedToken?: string) => {
    if (expectedToken !== undefined && activeTokenRef.current !== expectedToken) return

    // 종료 후 도착하는 인증 응답이 로그인 상태를 복구하지 못하도록 취소합니다.
    requestRef.current?.abort()
    requestRef.current = null
    pendingSession.current = null
    activeTokenRef.current = null
    setSessionToken(null)
    setIsSigningIn(false)

    try {
      removeAccessToken()
      setState({ status: 'anonymous', user: null, error: null })
    } catch (error) {
      setState({ status: 'error', user: null, error: getAuthErrorMessage(error, 'storage') })
    }
  }, [])

  const runAuth = useCallback(async (
    values: LoginRequest | null,
    signal?: AbortSignal,
  ): Promise<boolean> => {
    // 이전 복원·로그인 요청의 늦은 결과가 새 인증 상태를 덮어쓰지 않게 합니다.
    requestRef.current?.abort()
    const controller = new AbortController()
    requestRef.current = controller
    const abort = () => controller.abort()
    signal?.addEventListener('abort', abort, { once: true })
    if (signal?.aborted) controller.abort()

    const isActive = () => mounted.current && requestRef.current === controller
    const ensureActive = () => {
      if (!isActive() || controller.signal.aborted) {
        throw new axios.CanceledError('인증 요청이 취소됐어요.')
      }
    }
    setIsSigningIn(values !== null)
    let step: 'login' | 'session' | 'storage' = values ? 'login' : 'storage'

    try {
      ensureActive()
      let session = pendingSession.current

      if (values) {
        const result = await login(values, controller.signal)
        ensureActive()
        session = {
          accessToken: result.accessToken,
          expectedUserId: result.userId,
        }
        pendingSession.current = session
      } else if (!session) {
        const stored = getStoredAuthSession()
        session = stored
          ? { accessToken: stored.accessToken, expectedUserId: stored.user?.userId }
          : null
      }

      if (!session) {
        endSession()
        return false
      }

      // 만료되거나 만료 시각을 읽을 수 없는 토큰으로 서버에 요청하지 않습니다.
      const expiresAt = getTokenExpiresAt(session.accessToken)
      if (expiresAt === null || expiresAt <= Date.now()) {
        endSession()
        return false
      }

      // 캐시만으로 접근을 허용하지 않고 서버 확인 중에는 대기 화면을 유지합니다.
      setState({ status: 'checking', user: null, error: null })
      step = 'session'
      const user = await getMe(session.accessToken, controller.signal)
      ensureActive()
      // 서버 응답을 기다리는 동안 만료된 경우도 저장하지 않습니다.
      if (expiresAt <= Date.now()) {
        endSession()
        return false
      }
      if (session.expectedUserId !== undefined && user.userId !== session.expectedUserId) {
        throw new Error('로그인 응답과 사용자 정보가 일치하지 않아요.')
      }

      // 새로고침 시에도 서버의 최신 사용자 정보로 저장된 세션을 갱신합니다.
      step = 'storage'
      saveAuthSession(session.accessToken, user)
      activeTokenRef.current = session.accessToken
      setSessionToken(session.accessToken)
      pendingSession.current = null
      setState({ status: 'authenticated', user, error: null })
      return true
    } catch (error) {
      if (!isActive() || controller.signal.aborted || axios.isCancel(error)) {
        if (isActive()) {
          setState((previous) => previous.status === 'checking'
            ? { status: 'error', user: null, error: '로그인 정보 확인이 중단됐어요. 다시 확인해주세요.' }
            : previous)
        }
        if (axios.isCancel(error)) throw error
        throw Object.assign(new axios.CanceledError('인증 요청이 취소됐어요.'), { cause: error })
      }

      const message = getAuthErrorMessage(error, step)
      if (step === 'session' && axios.isAxiosError(error) && error.response?.status === 401) {
        endSession()
      } else if (step !== 'login') {
        // 네트워크·서버 오류에서는 저장된 토큰이나 재확인할 토큰을 삭제하지 않습니다.
        setState({ status: 'error', user: null, error: message })
      } else {
        // 잘못된 로그인 입력은 폼 오류로 전달하며 기존 인증 결과는 유지합니다.
        setState((previous) => previous.status === 'checking'
          ? { status: 'anonymous', user: null, error: null }
          : previous)
      }
      throw new Error(message, { cause: error })
    } finally {
      signal?.removeEventListener('abort', abort)
      if (isActive()) setIsSigningIn(false)
      if (requestRef.current === controller) requestRef.current = null
    }
  }, [endSession])

  const signIn = useCallback(async (values: LoginRequest, signal?: AbortSignal) => {
    const authenticated = await runAuth(values, signal)
    if (!authenticated) {
      throw new Error('로그인 정보가 만료됐어요. 다시 로그인해주세요.')
    }
  }, [runAuth])

  const retrySession = useCallback(async (signal?: AbortSignal): Promise<boolean> => {
    try {
      return await runAuth(null, signal)
    } catch {
      // 상태와 안내 문구는 runAuth에서 설정하며 UI에는 확인 결과를 반환합니다.
      return false
    }
  }, [runAuth])

  useEffect(() => {
    let active = true
    mounted.current = true
    // 개발 모드의 첫 정리 작업 이후 복원해 불필요한 중복 요청을 줄입니다.
    queueMicrotask(() => {
      if (active && !requestRef.current) void retrySession()
    })

    return () => {
      active = false
      mounted.current = false
      requestRef.current?.abort()
      requestRef.current = null
    }
  }, [retrySession])

  useSessionExpiry({
    accessToken: sessionToken,
    enabled: state.status === 'authenticated',
    onExpire: endSession,
  })

  return (
    <AuthContext.Provider value={{ ...state, isSigningIn, signIn, retrySession }}>
      {children}
    </AuthContext.Provider>
  )
}
