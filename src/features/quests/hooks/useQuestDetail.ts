// 선택한 퀘스트 ID에 해당하는 상세 mock을 반환하는 조회 훅입니다.
import { useQuery } from '@tanstack/react-query'
import { mockQuestDetails } from '../pages/home/mocks/questDetails'

export function useQuestDetail(questId: number | null) {
  return useQuery({
    // 실제 API 데이터와 섞이지 않도록 mock 전용 조회 키를 사용합니다.
    queryKey: ['quests', 'detail', 'mock', questId],

    queryFn: () => {
      const quest = mockQuestDetails.find(
        (item) => item.questId === questId,
      )

      if (!quest) {
        throw new Error('해당 퀘스트의 상세 테스트 데이터가 없어요.')
      }

      return quest
    },

    // 선택된 ID가 없으면 조회하지 않습니다. 현재는 네트워크 요청이 없습니다.
    enabled: questId !== null,

    // 고정된 mock은 반복 조회하지 않습니다. 실제 API 연결 시 갱신 정책도 변경합니다.
    staleTime: Infinity,
    retry: false,
  })
}
