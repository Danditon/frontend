// 인증 API의 요청·응답과 서버 오류 형식을 정의합니다.

// 회원가입 요청입니다. 비밀번호 확인은 서버에 보내지 않습니다.
export type SignupRequest = {
  email: string
  password: string
  nickname: string
}

// 회원가입 성공 응답입니다. 토큰은 포함되지 않습니다.
export type SignupResponse = {
  userId: number
}

export type LoginRequest = {
  email: string
  password: string
}

export type LoginResponse = {
  accessToken: string
  userId: number
  nickname: string
}

// JWT를 사용해 조회한 현재 사용자의 정보입니다.
export type MeResponse = {
  userId: number
  email: string
  nickname: string
  createdAt: string
}

// HTTP 상태 코드는 Axios 응답에서 별도로 확인합니다.
export type ApiErrorResponse = {
  code: string
  message: string
}

// 인증된 상태에서만 사용자 정보가 존재하도록 상태를 구분합니다.
export type AuthState =
  | { status: 'checking'; user: null; error: null }
  | { status: 'authenticated'; user: MeResponse; error: null }
  | { status: 'anonymous'; user: null; error: null }
  | { status: 'error'; user: null; error: string }

export type AuthContextValue = AuthState & {
  isSigningIn: boolean
  signIn: (values: LoginRequest, signal?: AbortSignal) => Promise<void>
  retrySession: (signal?: AbortSignal) => Promise<boolean>
}
