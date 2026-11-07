// 앱의 인증 상태와 로그인·세션 재확인 함수를 공유하는 훅입니다.
import { createContext, useContext } from 'react'
import type { AuthContextValue } from '../types/auth'

export const AuthContext = createContext<AuthContextValue | null>(null)

export function useAuth() {
  const context = useContext(AuthContext)

  if (!context) {
    throw new Error('useAuth는 AuthProvider 안에서 사용해야 합니다.')
  }

  return context
}
