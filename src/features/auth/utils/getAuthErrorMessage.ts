// 인증 요청 오류를 폼에 표시할 안내 문구로 변환합니다.
import axios from 'axios'
import { z } from 'zod'
import type { ApiErrorResponse } from '../types/auth'

type AuthAction = 'signup' | 'login' | 'session' | 'storage'

export function getAuthErrorMessage(error: unknown, action: AuthAction): string {
  if (action === 'storage') {
    return '로그인 정보에 접근하지 못했어요. 브라우저의 저장소 설정을 확인해주세요.'
  }

  if (error instanceof z.ZodError) {
    return action === 'signup'
      ? '가입 완료 응답을 확인하지 못했어요. 이미 가입되었을 수 있으니 로그인을 확인해주세요.'
      : '서버 응답을 확인하지 못했어요. 잠시 후 다시 시도해주세요.'
  }

  if (axios.isAxiosError<ApiErrorResponse>(error)) {
    const status = error.response?.status
    const code = error.response?.data?.code

    if (action === 'signup' && status === 409 && code === 'DUPLICATE_EMAIL') {
      return '이미 가입된 이메일이에요.'
    }
    if (status === 401) {
      return action === 'session'
        ? '로그인 정보를 확인하지 못했어요. 다시 로그인해주세요.'
        : action === 'login'
          ? '이메일 또는 비밀번호를 확인해주세요.'
          : '회원가입 요청을 처리하지 못했어요. 잠시 후 다시 시도해주세요.'
    }
    if (status === 400) {
      return '입력한 정보를 확인해주세요.'
    }
    if (!error.response) {
      return action === 'signup'
        ? '가입 결과를 확인하지 못했어요. 연결 상태를 확인하고, 이미 가입되었을 수 있으니 로그인을 확인해주세요.'
        : action === 'session'
          ? '사용자 정보를 확인하지 못했어요. 연결 상태를 확인하고 다시 시도해주세요.'
          : '서버에 연결하지 못했어요. 연결 상태를 확인하고 다시 시도해주세요.'
    }
  }

  return action === 'session'
    ? '사용자 정보를 확인하지 못했어요. 잠시 후 다시 시도해주세요.'
    : '요청을 처리하지 못했어요. 잠시 후 다시 시도해주세요.'
}
