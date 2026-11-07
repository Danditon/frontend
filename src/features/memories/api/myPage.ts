import { z } from 'zod'
import { apiClient } from '@/shared/api/client'
import type { Memory, RecordItem } from '../types'

const myQuest = z.object({
  questId: z.number().int().positive(),
  questTitle: z.string(),
  questType: z.enum(['GENERAL', 'IMAGE']),
  passedCount: z.number().int().nonnegative(),
})

const mySubmission = z.object({
  submissionId: z.number().int().positive(),
  questId: z.number().int().positive(),
  questTitle: z.string(),
  placeName: z.string(),
  lat: z.number(),
  lng: z.number(),
  photoUrl: z.string().nullable(),
  createdAt: z.string(),
})

async function getMyList(path: string, token: string, signal: AbortSignal) {
  const response = await apiClient.get<unknown>(path, {
    headers: { Authorization: `Bearer ${token}` },
    signal,
    timeout: 10000,
  })
  return response.data
}

export async function getMyQuests(token: string, signal: AbortSignal): Promise<Memory[]> {
  const data = await getMyList('/users/me/quests', token, signal)
  return z.array(myQuest).parse(data).map((quest) => ({
    id: String(quest.questId),
    title: quest.questTitle,
    sub: quest.questType === 'IMAGE' ? '이미지 퀘스트' : '일반 퀘스트',
    passedCount: quest.passedCount,
    photoUrl: null,
    greetings: [],
  }))
}

export async function getMySubmissions(token: string, signal: AbortSignal): Promise<RecordItem[]> {
  const data = await getMyList('/users/me/submissions', token, signal)
  return z.array(mySubmission).parse(data).map((submission) => ({
    id: String(submission.submissionId),
    questId: String(submission.questId),
    title: submission.questTitle,
    location: { lat: submission.lat, lng: submission.lng, placeName: submission.placeName },
    photoUrl: submission.photoUrl,
    createdAt: submission.createdAt,
  }))
}
