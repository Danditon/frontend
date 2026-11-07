// 로그인 상태를 공유하고 앱 시작 시 저장된 토큰으로 사용자 정보를 복원합니다.
import { useCallback, useEffect, useRef, useState, type ReactNode } from 'react'
import axios from 'axios'
import { login, getMe } from '../api/auth'
import { AuthContext } from '../hooks/useAuth'
import type { AuthState, LoginRequest, MeResponse } from '../types/auth'
import { getAuthErrorMessage } from '../utils/getAuthErrorMessage'
import { getAccessToken, setAccessToken, removeAccessToken } from '../utils/tokenStorage'

// shortcut: 개발 중 사용자 조회를 건너뜁니다. API 정상화 후 false로 바꾸면 기존 검증을 복구합니다.
const SKIP_CURRENT_USER_CHECK = import.meta.env.DEV

type PendingSession = {
  accessToken: string
  // 로그인 직후에는 응답의 사용자 ID와 일치하는지도 확인합니다.
  expectedUserId?: number
  // 사용자 조회를 생략할 때 사용할 로그인 응답 기반의 임시 정보입니다.
  user?: MeResponse
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<AuthState>({ status: 'checking', user: null, error: null })
  const [isSigningIn, setIsSigningIn] = useState(false)
  const mounted = useRef(false)
  const requestRef = useRef<AbortController | null>(null)
  // 로그인은 성공했지만 사용자 조회가 실패하면 토큰을 메모리에 남겨 재확인합니다.
  const pendingSession = useRef<PendingSession | null>(null)

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
          user: {
            userId: result.userId,
            email: values.email,
            nickname: result.nickname,
            // 로그인 응답에는 가입일이 없으므로 임의의 날짜를 넣지 않습니다.
            createdAt: '',
          },
        }
        pendingSession.current = session
      } else if (!session) {
        const accessToken = getAccessToken()
        session = accessToken ? { accessToken } : null
      }

      if (!session) {
        setState({ status: 'anonymous', user: null, error: null })
        return false
      }

      // 새로고침 후에는 토큰만으로 사용자 정보를 꾸며내지 않고 재로그인을 기다립니다.
      if (SKIP_CURRENT_USER_CHECK && !session.user) {
        setState({ status: 'anonymous', user: null, error: null })
        return false
      }

      setState({ status: 'checking', user: null, error: null })
      step = 'session'
      const user = SKIP_CURRENT_USER_CHECK && session.user
        ? session.user
        : await getMe(session.accessToken, controller.signal)
      ensureActive()
      if (session.expectedUserId !== undefined && user.userId !== session.expectedUserId) {
        throw new Error('로그인 응답과 사용자 정보가 일치하지 않아요.')
      }

      // 기존 토큰은 재저장하지 않고, 새 로그인은 사용자 확인 후에만 저장합니다.
      if (session.expectedUserId !== undefined) {
        step = 'storage'
        setAccessToken(session.accessToken)
      }
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

      let message = getAuthErrorMessage(error, step)
      if (step === 'session' && axios.isAxiosError(error) && error.response?.status === 401) {
        pendingSession.current = null
        try {
          removeAccessToken()
          setState({ status: 'anonymous', user: null, error: null })
        } catch (storageError) {
          message = getAuthErrorMessage(storageError, 'storage')
          setState({ status: 'error', user: null, error: message })
        }
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
  }, [])

  const signIn = useCallback(async (values: LoginRequest, signal?: AbortSignal) => {
    await runAuth(values, signal)
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

  return (
    <AuthContext.Provider value={{ ...state, isSigningIn, signIn, retrySession }}>
      {children}
    </AuthContext.Provider>
  )
}
