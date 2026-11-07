// 로그인과 실제 위치 조회가 완료된 뒤 주변 퀘스트를 조회하고 캐시·로딩·오류 상태를 제공하는 훅입니다.
import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@/features/auth/hooks/useAuth'
import { getNearbyQuests } from '../api/questQueries'
import type { UserPosition } from './useGeolocation'

export function useNearbyQuests(position: UserPosition | null, radius = 50_000) {
  const { status, user } = useAuth()
  const userId = status === 'authenticated' ? user.userId : null
  const lat = position?.lat ?? null
  const lng = position?.lng ?? null

  return useQuery({
    // 계정·좌표·반경이 다르면 별도 결과로 관리합니다. JWT는 캐시 키에 넣지 않습니다.
    // 측정 시각·정확도만 바뀐 경우에는 같은 위치의 결과를 재사용합니다.
    queryKey: ['quests', 'nearby', userId, lat, lng, radius],

    queryFn: ({ signal }) => {
      // enabled=false에서도 refetch를 직접 호출할 수 있어 요청 조건을 한 번 더 확인합니다.
      if (userId === null) throw new Error('로그인한 뒤 다시 시도해 주세요.')
      if (lat === null || lng === null) throw new Error('현위치를 먼저 확인해 주세요.')

      // 화면 이탈·검색 조건 변경 시 TanStack Query의 취소 신호를 API에 전달합니다.
      return getNearbyQuests({ lat, lng, radius }, signal)
    },

    // 위치를 확인하기 전에는 기본 지도 좌표로 퀘스트를 요청하지 않습니다.
    enabled: userId !== null && lat !== null && lng !== null,

    // 30초는 캐시 유효 시간입니다. 주기적인 GPS 조회나 API 폴링을 시작하지 않습니다.
    staleTime: 30_000,
    retry: false,
    refetchOnWindowFocus: false,
  })
}
