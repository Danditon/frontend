// 사용자 좌표를 기준으로 목록에서 가장 가까운 퀘스트를 선택하는 함수입니다.
import type { NearbyQuest } from '@/features/quests/types/quest'
import { getDistanceMeters, type Coordinates } from './getDistanceMeters'

export function getNearestQuest(
  quests: readonly NearbyQuest[],
  position: Coordinates | null,
): NearbyQuest | null {
  if (!position) return null

  let nearestQuest: NearbyQuest | null = null
  let nearestDistance = Infinity

  // 현재 사용자 좌표로 거리를 계산하므로 응답 배열 순서에 의존하지 않고 원본도 변경하지 않습니다.
  for (const quest of quests) {
    const distance = getDistanceMeters(position, quest)

    if (distance < nearestDistance) {
      nearestDistance = distance
      nearestQuest = quest
    }
  }

  return nearestQuest
}
