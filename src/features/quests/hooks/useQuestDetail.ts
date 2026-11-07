// 인증된 사용자가 선택한 실제 퀘스트 ID로 상세 정보를 조회하는 훅입니다.
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { getQuestDetail } from '../api/questQueries'

export function useQuestDetail(questId: number | null) {
  const { status, user } = useAuth()
  const userId = status === 'authenticated' ? user.userId : null

  return useQuery({
    // 카드·Drawer·navbar는 같은 상세를 공유하고, 다른 사용자의 캐시는 분리합니다.
    queryKey: ['quests', 'detail', userId, questId],

    queryFn: ({ signal }) => {
      // 비활성 상태에서 refetch를 직접 호출해도 인증·선택 없이 요청하지 않습니다.
      if (userId === null) throw new Error('로그인한 뒤 다시 시도해 주세요.')
      if (questId === null) throw new Error('퀘스트를 선택해 주세요.')

      return getQuestDetail(questId, signal)
    },

    // 목록 전체가 아니라 선택한 ID와 가까운 카드 등 필요한 상세만 조회합니다.
    enabled: userId !== null && questId !== null,

    staleTime: 30_000,
    retry: false,
    refetchOnWindowFocus: false,
  })
}
