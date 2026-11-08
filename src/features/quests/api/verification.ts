import axios from 'axios'
import { z } from 'zod'
import { apiClient } from '@/shared/api/client'
import { getQuestPhotoError } from '../lib/questPhoto'

const questSchema = z.object({
  questId: z.number().int().positive(), questType: z.enum(['GENERAL', 'IMAGE']),
  author: z.object({ userId: z.number(), nickname: z.string() }),
  placeName: z.string(), address: z.string(), lat: z.number(), lng: z.number(),
  longingText: z.string(), photoUrl: z.string().nullable(), questTitle: z.string(),
  questDescription: z.string(), difficulty: z.number(), status: z.enum(['OPEN', 'CLOSED']),
  isMine: z.boolean(), myStatus: z.enum(['NONE', 'FAILED', 'PASSED']),
})
const resultSchema = z.object({
  submissionId: z.number().int().positive(), verifyStatus: z.enum(['PASSED', 'FAILED']),
  similarity: z.number().nullable(), message: z.string(),
})
const greetingsSchema = z.object({
  viewerRole: z.enum(['AUTHOR', 'COMPLETED', 'PERFORMER']),
  submissions: z.array(z.object({
    submissionId: z.number(), performer: z.object({ userId: z.number(), nickname: z.string() }),
    greeting: z.string(), photoUrl: z.string().nullable(), verifyStatus: z.enum(['PASSED', 'FAILED']),
    similarity: z.number().nullable(), isLiked: z.boolean(), createdAt: z.string(),
  })),
})
export type VerificationQuest = z.infer<typeof questSchema>
export type VerificationResult = z.infer<typeof resultSchema>
export type QuestGreetings = z.infer<typeof greetingsSchema>

export function getAccessToken(): string | null {
  try { return sessionStorage.getItem('accessToken') || localStorage.getItem('accessToken') } catch { return null }
}
export function isQuestId(value: string): boolean { return /^[1-9]\d*$/.test(value) && Number.isSafeInteger(Number(value)) }
function headers() {
  const token = getAccessToken()
  if (!token) throw new Error('로그인이 필요해요. 로그인한 뒤 다시 시도해 주세요.')
  return { Authorization: `Bearer ${token}` }
}
export async function getVerificationQuest(id: string, signal?: AbortSignal) {
  if (!isQuestId(id)) throw new Error('홈에서 수행할 퀘스트를 선택해 주세요.')
  const response = await apiClient.get(`/quests/${id}`, { headers: headers(), signal, timeout: 15000 })
  return questSchema.parse(response.data)
}
export function createSubmissionForm(questType: 'GENERAL' | 'IMAGE', greeting: string, location: { lat: number; lng: number }, photo: File | null) {
  if (!greeting.trim()) throw new Error('안부를 한 줄 이상 남겨주세요.')
  if (!Number.isFinite(location.lat) || !Number.isFinite(location.lng) || Math.abs(location.lat) > 90 || Math.abs(location.lng) > 180) throw new Error('현재 위치를 다시 확인해 주세요.')
  if (questType === 'IMAGE' && !photo) throw new Error('이미지 퀘스트는 인증 사진이 필요해요.')
  const photoError = photo && getQuestPhotoError(photo)
  if (photoError) throw new Error(photoError)
  const body = new FormData()
  body.append('request', new Blob([JSON.stringify({ greeting: greeting.trim(), lat: location.lat, lng: location.lng })], { type: 'application/json' }))
  if (photo) body.append('photo', photo)
  return body
}
export async function submitVerification(id: string, body: FormData, signal?: AbortSignal) {
  if (!isQuestId(id)) throw new Error('퀘스트를 다시 선택해 주세요.')
  // Browser sets the multipart boundary. Never retry this POST automatically.
  const response = await apiClient.post(`/quests/${id}/submissions`, body, { headers: headers(), signal, timeout: 90000 })
  return resultSchema.parse(response.data)
}
export async function getQuestGreetings(id: string, signal?: AbortSignal) {
  if (!isQuestId(id)) throw new Error('퀘스트를 다시 선택해 주세요.')
  const response = await apiClient.get(`/quests/${id}/submissions`, { headers: headers(), signal, timeout: 15000 })
  return greetingsSchema.parse(response.data)
}
export function verificationError(
  error: unknown,
  location?: { distance: number },
): string {
  if (axios.isAxiosError(error)) {
    const code = error.response?.data?.code
    const messages: Record<string, string> = {
      UNAUTHORIZED: '로그인이 만료됐어요. 다시 로그인해 주세요.',
      OUT_OF_RANGE: '퀘스트 장소에서 200m 이내로 이동한 뒤 다시 시도해 주세요.',
      SELF_QUEST: '내가 등록한 퀘스트는 수행할 수 없어요.',
      ALREADY_PASSED: '이미 인증을 완료한 퀘스트예요.',
      NOT_FOUND: '퀘스트를 찾지 못했어요. 홈에서 다시 선택해 주세요.',
      AI_ERROR: 'AI 검증 서버에 연결하지 못했어요. 안부와 사진은 유지되니 잠시 후 다시 시도해 주세요.',
      FORBIDDEN: '이 안부를 볼 권한이 없어요.',
      INVALID_INPUT: '입력한 안부와 사진 형식을 확인해 주세요.',
    }
    if (code === 'OUT_OF_RANGE' && location) {
      const { distance } = location
      const measured = `기기에서 측정한 거리는 약 ${Math.round(distance)}m예요.`
      return distance <= 200
        ? `서버가 인증 가능 범위를 벗어났다고 응답했어요. ${measured}`
        : `${messages.OUT_OF_RANGE} ${measured}`
    }
    if (typeof code === 'string' && messages[code]) return messages[code]
    if (error.response?.status === 401) return messages.UNAUTHORIZED
    if (error.response?.status === 413) return '사진 용량이 너무 커요. 10MB 이하 사진을 선택해 주세요.'
    if (error.code === 'ECONNABORTED') return '응답 시간이 초과됐어요. 전송 여부를 확인한 뒤 다시 시도해 주세요.'
    return '서버와 연결하지 못했어요. 네트워크 상태를 확인한 뒤 다시 시도해 주세요.'
  }
  if (error instanceof z.ZodError) return '서버 응답 형식이 올바르지 않아요. 잠시 후 다시 시도해 주세요.'
  return error instanceof Error ? error.message : '요청을 처리하지 못했어요.'
}
export function similarityPercent(value: number | null | undefined) {
  return value == null ? null : Math.round(Math.max(0, Math.min(1, value)) * 100)
}
