// 로그인 상태에서 JWT 만료와 탭 복귀를 감지하는 훅입니다.
import { useEffect } from 'react'
import { getTokenExpiresAt } from '../utils/getTokenExpiresAt'

type Props = {
  accessToken: string | null
  enabled: boolean
  onExpire: (accessToken: string) => void
}

export function useSessionExpiry({ accessToken, enabled, onExpire }: Props) {
  useEffect(() => {
    if (!enabled || !accessToken) return

    const token = accessToken
    let timer: ReturnType<typeof setTimeout> | undefined

    function checkExpiration() {
      clearTimeout(timer)
      const expiresAt = getTokenExpiresAt(token)
      const remaining = expiresAt === null ? 0 : expiresAt - Date.now()

      if (remaining <= 0) {
        onExpire(token)
        return
      }

      // 기기 시간 변경도 반영하도록 최대 1분마다 만료 시각을 다시 확인합니다.
      timer = setTimeout(checkExpiration, Math.min(remaining, 60_000))
    }

    checkExpiration()
    // 모바일에서 다른 앱을 사용하다 돌아왔을 때도 즉시 확인합니다.
    window.addEventListener('focus', checkExpiration)
    document.addEventListener('visibilitychange', checkExpiration)

    return () => {
      clearTimeout(timer)
      window.removeEventListener('focus', checkExpiration)
      document.removeEventListener('visibilitychange', checkExpiration)
    }
  }, [accessToken, enabled, onExpire])
}
