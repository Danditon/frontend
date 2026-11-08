// 두 위도·경도 사이의 대략적인 직선거리를 미터로 계산하는 공통 함수입니다.
export type Coordinates = {
  lat: number
  lng: number
}

// GPS와 API에서 받은 좌표를 사용하며, 도보 경로나 소요 시간을 계산하지는 않습니다.
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
