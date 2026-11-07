// JWT와 해당 토큰으로 확인한 사용자 정보의 저장·조회·삭제를 담당합니다.
import { z } from 'zod'
import type { MeResponse } from '../types/auth'

const ACCESS_TOKEN_KEY = 'accessToken'
const SESSION_CACHE_KEY = 'authSessionCache'

// 저장된 값이 손상되거나 이전 버전의 형식인 경우에도 안전하게 읽습니다.
const sessionCacheSchema = z.object({
  accessToken: z.string().min(1),
  user: z.object({
    userId: z.number().int().positive(),
    email: z.string().min(1),
    nickname: z.string(),
    createdAt: z.string().min(1),
  }),
})

export function getAccessToken(): string | null {
  return sessionStorage.getItem(ACCESS_TOKEN_KEY)?.trim() || null
}

export function setAccessToken(accessToken: string): void {
  sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
}

// 사용자 정보가 다른 계정의 토큰과 연결되지 않도록 토큰도 함께 기록합니다.
export function saveAuthSession(accessToken: string, user: MeResponse): void {
  sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify({ accessToken, user }))
  setAccessToken(accessToken)
}

export function getStoredAuthSession(): {
  accessToken: string
  user: MeResponse | null
} | null {
  const accessToken = getAccessToken()
  if (!accessToken) return null

  // 저장소 접근 자체의 오류는 Provider에서 안내하도록 전달합니다.
  const raw = sessionStorage.getItem(SESSION_CACHE_KEY)
  if (raw) {
    try {
      const result = sessionCacheSchema.safeParse(JSON.parse(raw))
      if (result.success && result.data.accessToken === accessToken) {
        return { accessToken, user: result.data.user }
      }
    } catch {
      // 캐시가 손상돼도 토큰이 있으면 서버에서 사용자 정보를 다시 조회합니다.
    }
  }

  // 기존 버전처럼 토큰만 저장된 경우도 재로그인 없이 서버에 확인합니다.
  return { accessToken, user: null }
}

// 만료·로그아웃·사용자 조회 401 시 JWT와 사용자 정보를 함께 제거합니다.
export function removeAccessToken(): void {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY)
  sessionStorage.removeItem(SESSION_CACHE_KEY)
}
