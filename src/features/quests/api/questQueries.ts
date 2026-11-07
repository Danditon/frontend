// 홈에서 사용할 주변 퀘스트·상세 조회와 요청·응답 검증을 담당하는 API 모듈입니다.
import { z } from 'zod'
import { apiClient } from '@/shared/api/client'
import { getAccessToken } from '@/features/auth/utils/tokenStorage'
import type { NearbyQuest, NearbyQuestParams, QuestDetail } from '../types/quest'

const QUEST_QUERY_TIMEOUT_MS = 15_000
const difficultySchema = z.union([z.literal(1), z.literal(2), z.literal(3)])

// TypeScript 타입과 별도로 서버의 실제 데이터를 검사해 잘못된 마커 생성을 막습니다.
const nearbyQuestSchema = z.object({
  questId: z.number().int().positive(),
  questTitle: z.string(),
  questType: z.enum(['GENERAL', 'IMAGE']),
  difficulty: difficultySchema,
  placeName: z.string(),
  lat: z.number().finite().min(-90).max(90),
  lng: z.number().finite().min(-180).max(180),
  distance: z.number().finite().nonnegative(),
  isMine: z.boolean(),
})
const nearbyQuestsSchema = z.array(nearbyQuestSchema)

// 상세에는 목록의 distance가 없고, 사진·작성자·수행 여부 등이 추가됩니다.
const questDetailSchema = nearbyQuestSchema.omit({ distance: true }).extend({
  author: z.object({
    userId: z.number().int().positive(),
    nickname: z.string(),
  }),
  address: z.string(),
  longingText: z.string(),
  photoUrl: z.string().nullable(),
  questDescription: z.string(),
  status: z.literal('OPEN'),
  myStatus: z.enum(['NONE', 'FAILED', 'PASSED']),
})

// 기본 지도 좌표를 대신 보내지 않고, 전달받은 실제 검색 좌표와 조건을 검증합니다.
const nearbyParamsSchema = z.object({
  lat: z.number().finite().min(-90).max(90),
  lng: z.number().finite().min(-180).max(180),
  radius: z.number().finite().positive().default(50_000),
  type: z.enum(['GENERAL', 'IMAGE']).optional(),
  difficulty: difficultySchema.optional(),
})
const questIdSchema = z.number().int().positive()

function requestOptions(signal?: AbortSignal) {
  // 모듈 로딩 때 토큰을 고정하지 않고 각 요청 시점의 최신 JWT를 사용합니다.
  const token = getAccessToken()
  if (!token) throw new Error('로그인한 뒤 다시 시도해 주세요.')

  // 서버 주소만 등록했거나 /api까지 등록한 경우 모두 /api를 한 번만 사용합니다.
  // 이번 조회에만 적용하므로 공용 Axios와 기존 인증·등록·수행 API는 변경하지 않습니다.
  const baseURL = (apiClient.defaults.baseURL || '/api').replace(/\/+$/, '')

  return {
    baseURL: baseURL.endsWith('/api') ? baseURL : `${baseURL}/api`,
    headers: { Authorization: `Bearer ${token}` },
    signal,
    timeout: QUEST_QUERY_TIMEOUT_MS,
  }
}

// 한 번의 요청으로 반경 안의 목록 배열을 받습니다. 목록 행별 상세 요청은 하지 않습니다.
export async function getNearbyQuests(
  params: NearbyQuestParams,
  signal?: AbortSignal,
): Promise<NearbyQuest[]> {
  const query = nearbyParamsSchema.parse(params)
  const response = await apiClient.get<unknown>('/quests', {
    ...requestOptions(signal),
    params: query,
  })

  // 성공 응답은 래퍼 없는 배열입니다. 실패 시 mock으로 대체하지 않고 오류를 전달합니다.
  return nearbyQuestsSchema.parse(response.data)
}

// 선택한 실제 퀘스트 ID로 상세를 받아 카드·Drawer에서 사용하도록 반환합니다.
export async function getQuestDetail(
  questId: number,
  signal?: AbortSignal,
): Promise<QuestDetail> {
  const id = questIdSchema.parse(questId)
  const response = await apiClient.get<unknown>(`/quests/${id}`, requestOptions(signal))
  const quest = questDetailSchema.parse(response.data)

  if (quest.questId !== id) {
    throw new Error('요청한 퀘스트와 상세 정보가 일치하지 않아요.')
  }

  return quest
}
