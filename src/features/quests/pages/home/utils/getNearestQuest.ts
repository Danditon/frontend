// 사용자 좌표를 기준으로 목록에서 가장 가까운 퀘스트를 선택하는 함수입니다.
import type { NearbyQuest } from '@/features/quests/types/quest'

type Coordinates = {
  lat: number
  lng: number
}

export function getDistanceMeters(from: Coordinates, to: Coordinates): number {
  const radians = (degrees: number) => degrees * Math.PI / 180
  const latDifference = radians(to.lat - from.lat)
  const lngDifference = radians(to.lng - from.lng)

  const value =
    Math.sin(latDifference / 2) ** 2 +
    Math.cos(radians(from.lat)) *
      Math.cos(radians(to.lat)) *
      Math.sin(lngDifference / 2) ** 2

  // 부동소수점 오차로 제곱근의 범위를 벗어나지 않게 합니다.
  const clamped = Math.min(1, Math.max(0, value))

  return 6_371_000 * 2 * Math.atan2(
    Math.sqrt(clamped),
    Math.sqrt(1 - clamped),
  )
}

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
