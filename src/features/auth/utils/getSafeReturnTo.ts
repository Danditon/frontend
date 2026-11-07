// 로그인 후 복귀할 주소를 앱 내부의 허용된 경로로 제한합니다.
import { matchPath } from 'react-router'

// 새 화면을 로그인 후 복귀 대상으로 허용할 때 이 목록도 함께 갱신합니다.
const RETURN_PATHS = [
  '/',
  '/onboarding',
  '/quests/new',
  '/quests/:questId',
  '/quests/:questId/verify',
  '/me',
  '/me/memories',
  '/me/history',
]

export function getSafeReturnTo(value: unknown): string {
  if (
    typeof value !== 'string' ||
    !value.startsWith('/') ||
    value.startsWith('//') ||
    value.includes('\\')
  ) return '/'

  // URL 파서가 무시하는 공백·제어 문자를 포함한 모호한 입력은 허용하지 않습니다.
  for (const character of value) {
    const code = character.charCodeAt(0)
    if (code <= 32 || code === 127) return '/'
  }

  try {
    // 경로 해석만을 위한 기준 주소이며 실제 요청은 발생하지 않습니다.
    const origin = 'https://return-to.invalid'
    const url = new URL(value, origin)
    if (url.origin !== origin) return '/'
    if (!RETURN_PATHS.some((path) => matchPath(path, url.pathname))) return '/'

    // 로그인·회원가입·로그아웃은 허용 목록에서 제외해 반복 이동을 막습니다.
    return `${url.pathname}${url.search}${url.hash}`
  } catch {
    return '/'
  }
}
