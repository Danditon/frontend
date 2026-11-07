// 인증 Provider에서 사용하는 토큰의 조회·저장·삭제를 한곳에서 관리합니다.
const ACCESS_TOKEN_KEY = 'accessToken'

export function getAccessToken(): string | null {
  return sessionStorage.getItem(ACCESS_TOKEN_KEY)?.trim() || null
}

export function setAccessToken(accessToken: string): void {
  sessionStorage.setItem(ACCESS_TOKEN_KEY, accessToken)
}

// 세션 복원 중 서버가 401을 반환하면 무효한 토큰을 제거합니다.
export function removeAccessToken(): void {
  sessionStorage.removeItem(ACCESS_TOKEN_KEY)
}
