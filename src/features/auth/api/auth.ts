// 회원가입·로그인·현재 사용자 조회 요청을 담당하는 인증 API 모듈입니다.
import { z } from 'zod'
import { apiClient } from '@/shared/api/client'
import type {
  SignupRequest,
  SignupResponse,
  LoginRequest,
  LoginResponse,
  MeResponse,
} from '../types/auth'

// 인증 요청에만 적용하며 공용 Axios 설정은 변경하지 않습니다.
const AUTH_TIMEOUT_MS = 10_000

// 타입 선언과 별도로 실제 응답의 필수 필드를 검사합니다.
const signupResponseSchema = z.object({
  userId: z.number().int().positive(),
})

const loginResponseSchema = z.object({
  accessToken: z.string().trim().min(1),
  userId: z.number().int().positive(),
  nickname: z.string(),
})

const meResponseSchema = z.object({
  userId: z.number().int().positive(),
  email: z.string().min(1),
  nickname: z.string(),
  createdAt: z.string().min(1),
})

// 회원가입을 요청하고 생성된 사용자 ID를 반환합니다.
export async function signup(
  payload: SignupRequest,
  signal?: AbortSignal,
): Promise<SignupResponse> {
  const response = await apiClient.post<unknown>(
    '/api/auth/signup',
    {
      // 폼에 확인용 비밀번호 등이 있어도 명세의 필드만 전송합니다.
      email: payload.email,
      password: payload.password,
      nickname: payload.nickname,
    },
    {
      signal,
      timeout: AUTH_TIMEOUT_MS,
      validateStatus: (status) => status === 201,
    },
  )

  return signupResponseSchema.parse(response.data)
}

// 로그인 정보를 전송하고 JWT와 사용자 기본 정보를 반환합니다.
export async function login(
  payload: LoginRequest,
  signal?: AbortSignal,
): Promise<LoginResponse> {
  const response = await apiClient.post<unknown>(
    '/api/auth/login',
    {
      email: payload.email,
      password: payload.password,
    },
    {
      signal,
      timeout: AUTH_TIMEOUT_MS,
      validateStatus: (status) => status === 200,
    },
  )

  return loginResponseSchema.parse(response.data)
}

// 전달받은 JWT로 사용자 정보를 조회하며 토큰 저장은 호출한 쪽에서 담당합니다.
export async function getMe(
  accessToken: string,
  signal?: AbortSignal,
): Promise<MeResponse> {
  if (!accessToken.trim()) {
    throw new Error('사용자 확인에 필요한 인증 토큰이 없어요.')
  }

  const response = await apiClient.get<unknown>(
    '/api/users/me',
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      signal,
      timeout: AUTH_TIMEOUT_MS,
      validateStatus: (status) => status === 200,
    },
  )

  return meResponseSchema.parse(response.data)
}
