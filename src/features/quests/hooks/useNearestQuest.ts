// 가까운 후보부터 상세를 확인해 본인·완료 퀘스트를 제외한 첫 항목을 찾습니다.
import { useQuery, useQueryClient } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { getQuestDetail } from '../api/questQueries'
import type { NearbyQuest, QuestDetail } from '../types/quest'
import { getDistanceMeters, type Coordinates } from '../pages/home/utils/getDistanceMeters'

export function useNearestQuest(
  quests: readonly NearbyQuest[] | undefined,
  position: Coordinates | null,
) {
  const { status, user } = useAuth()
  const userId = status === 'authenticated' ? user.userId : null
  const queryClient = useQueryClient()
  const lat = position?.lat ?? null
  const lng = position?.lng ?? null
  const candidates = position
    ? (quests ?? [])
      .filter((quest) => !quest.isMine)
      .map((quest) => ({ quest, distance: getDistanceMeters(position, quest) }))
      .sort((a, b) => a.distance - b.distance || a.quest.questId - b.quest.questId)
    : []

  return useQuery({
    // 후보가 같아도 좌표·계정이 바뀌면 이전 탐색 결과와 분리합니다.
    queryKey: [
      'quests', 'nearest', userId, lat, lng,
      candidates.map(({ quest }) => [quest.questId, quest.lat, quest.lng]),
    ],
    queryFn: async ({ signal }): Promise<QuestDetail | null> => {
      if (userId === null) throw new Error('로그인한 뒤 다시 시도해 주세요.')
      if (lat === null || lng === null) throw new Error('현위치를 먼저 확인해 주세요.')
      if (quests === undefined) throw new Error('주변 퀘스트를 먼저 확인해 주세요.')

      signal.throwIfAborted()
      for (const { quest } of candidates) {
        signal.throwIfAborted()
        const detailKey = ['quests', 'detail', userId, quest.questId] as const
        const detail = await queryClient.fetchQuery({
          // Drawer의 useQuestDetail과 같은 키·유효 시간을 사용합니다.
          queryKey: detailKey,
          // 상세 요청은 다른 화면도 공유하므로 자체 취소 신호를 유지합니다.
          queryFn: ({ signal: detailSignal }) => getQuestDetail(quest.questId, detailSignal),
          // 갱신 실패한 상세는 캐시 시간이 남아도 재확인합니다.
          staleTime: queryClient.getQueryState(detailKey)?.status === 'error' ? 0 : 30_000,
          retry: false,
        })
        signal.throwIfAborted()
        if (!detail.isMine && detail.myStatus !== 'PASSED') return detail
      }

      return null
    },
    enabled: userId !== null && position !== null && quests !== undefined,
    staleTime: 30_000,
    refetchOnMount: (query) => query.state.status === 'error' ? 'always' : true,
    retry: false,
    refetchOnWindowFocus: false,
  })
}
