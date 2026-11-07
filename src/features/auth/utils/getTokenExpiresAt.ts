// JWT의 만료 시각을 읽는 함수입니다. 토큰의 서명은 서버에서 검증합니다.
export function getTokenExpiresAt(token: string): number | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3 || parts.some((part) => !part)) return null

    // JWT의 Base64URL 형식을 브라우저에서 읽을 수 있도록 변환합니다.
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/')
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, '=')
    const bytes = Uint8Array.from(atob(padded), (character) => character.charCodeAt(0))
    const payload: unknown = JSON.parse(new TextDecoder().decode(bytes))

    if (
      typeof payload !== 'object' ||
      payload === null ||
      !('exp' in payload) ||
      typeof payload.exp !== 'number'
    ) {
      return null
    }

    // exp는 초 단위이고 Date.now()는 밀리초 단위입니다.
    const expiresAt = payload.exp * 1000
    return Number.isFinite(expiresAt) && expiresAt > 0 ? expiresAt : null
  } catch {
    return null
  }
}
