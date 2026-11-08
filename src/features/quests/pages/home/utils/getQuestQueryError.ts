// 퀘스트 조회 오류를 사용자 안내와 이전 데이터 표시 가능 여부로 변환합니다.
import axios from 'axios'
import { z } from 'zod'

export type QuestQueryErrorInfo = {
  message: string
  requiresLogin: boolean
  keepPreviousData: boolean
}

export function getQuestQueryError(
  error: unknown,
  target: 'nearby' | 'detail',
): QuestQueryErrorInfo {
  const response = axios.isAxiosError(error) ? error.response : undefined
  const code = response?.data?.code ?? (
    typeof error === 'object' && error !== null && 'code' in error ? error.code : undefined
  )

  // 서버 401과 요청 전 토큰 누락을 같은 로그인 안내로 처리하며 세션은 직접 변경하지 않습니다.
  if (response?.status === 401 || code === 'UNAUTHORIZED') {
    return {
      message: '로그인 정보를 확인할 수 없어요. 다시 로그인해 주세요.',
      requiresLogin: true,
      keepPreviousData: false,
    }
  }

  // 이미 사라졌거나 접근할 수 없는 상세로 수행 버튼을 표시하지 않습니다.
  if (response?.status === 404 || code === 'NOT_FOUND') {
    return {
      message: target === 'detail'
        ? '이 퀘스트를 찾을 수 없어요. 다른 퀘스트를 선택해 주세요.'
        : '주변 퀘스트 정보를 찾을 수 없어요. 잠시 후 다시 시도해 주세요.',
      requiresLogin: false,
      keepPreviousData: false,
    }
  }

  if (response?.status === 403 || code === 'FORBIDDEN') {
    return {
      message: '이 퀘스트 정보를 볼 권한이 없어요.',
      requiresLogin: false,
      keepPreviousData: false,
    }
  }

  let message = target === 'nearby'
    ? '주변 퀘스트를 불러오지 못했어요. 다시 시도해 주세요.'
    : '퀘스트 상세를 불러오지 못했어요. 다시 시도해 주세요.'

  if (axios.isAxiosError(error)) {
    if (error.code === 'ECONNABORTED' || error.code === 'ETIMEDOUT') {
      message = '응답 시간이 초과됐어요. 다시 시도해 주세요.'
    } else if (!response) {
      message = '서버에 연결하지 못했어요. 인터넷 연결을 확인해 주세요.'
    } else if (response.status >= 500) {
      message = '서버에 일시적인 문제가 있어요. 잠시 후 다시 시도해 주세요.'
    }
  } else if (error instanceof z.ZodError) {
    // 검증 오류의 원문에는 응답 내용이 포함될 수 있어 화면에 그대로 노출하지 않습니다.
    message = '서버 응답을 확인하지 못했어요. 잠시 후 다시 시도해 주세요.'
  }

  return { message, requiresLogin: false, keepPreviousData: true }
}
