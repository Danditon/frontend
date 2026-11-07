import axios from 'axios'
import { z } from 'zod'
import { apiClient } from '@/shared/api/client'
import { getAccessToken } from '@/features/auth/utils/tokenStorage'
import { getQuestPhotoError } from '../lib/questPhoto'

export type RegistrationPlace = {
  placeName: string
  address: string
  lat: number
  lng: number
}

type QuestDraft = RegistrationPlace & {
  questType: 'GENERAL' | 'IMAGE'
  longingText: string
}

const previewSchema = z.object({
  questTitle: z.string().trim().min(1),
  questDescription: z.string().trim().min(1),
  difficulty: z.number().int().min(1).max(3),
  difficultyReason: z.string(),
})

export type RegistrationPreview = z.infer<typeof previewSchema>

function requestOptions(signal: AbortSignal) {
  const token = getAccessToken()
  if (!token) throw new Error('로그인한 뒤 다시 시도해 주세요.')
  return { headers: { Authorization: `Bearer ${token}` }, signal, timeout: 90000 }
}

export async function previewQuest(draft: QuestDraft, signal: AbortSignal) {
  const { questType, placeName, address, longingText } = draft
  const response = await apiClient.post('/quests/preview', {
    questType, placeName, address, longingText,
  }, requestOptions(signal))
  return previewSchema.parse(response.data)
}

export async function registerQuest(
  draft: QuestDraft,
  preview: RegistrationPreview,
  photo: File | null,
  signal: AbortSignal,
) {
  if (draft.questType === 'IMAGE' && !photo) throw new Error('이미지 퀘스트는 사진을 선택해 주세요.')
  const photoError = photo && getQuestPhotoError(photo)
  if (photoError) throw new Error(photoError)

  const { questTitle, questDescription, difficulty } = previewSchema.parse(preview)
  const body = new FormData()
  body.append('request', new Blob([
    JSON.stringify({ ...draft, questTitle, questDescription, difficulty }),
  ], { type: 'application/json' }))
  if (photo) body.append('photo', photo)

  const response = await apiClient.post('/quests', body, requestOptions(signal))
  return z.object({ questId: z.number().int().positive() }).parse(response.data)
}

export function registrationError(error: unknown, action: 'preview' | 'register') {
  if (axios.isAxiosError(error)) {
    if (error.response?.status === 401) return '로그인이 만료됐어요. 다시 로그인해 주세요.'
    if (error.response?.status === 413) return '10MB 이하 사진을 선택해 주세요.'
    if (error.response?.data?.code === 'AI_ERROR') return 'AI 처리에 문제가 생겼어요. 잠시 후 다시 시도해 주세요.'
    if (!error.response && action === 'register') return '등록 응답을 받지 못했어요. 중복 등록을 피하려면 등록 여부를 먼저 확인해 주세요.'
    const message = error.response?.data?.message
    if (typeof message === 'string' && message.trim()) return message
    return '서버에 연결하지 못했어요. 잠시 후 다시 시도해 주세요.'
  }
  if (error instanceof z.ZodError) return '서버 응답을 확인하지 못했어요.'
  return error instanceof Error ? error.message : '요청을 처리하지 못했어요.'
}
