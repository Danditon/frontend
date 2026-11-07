// 광역시는 구·군까지, 도 지역은 시·군까지만 표시합니다.
import type { KakaoRegion } from '../types/kakaoMaps'

export function formatRegionName(region: KakaoRegion): string {
  const province = region.region_1depth_name?.trim() ?? ''
  const provinceName = province.replace(/광역시$/, '')

  // SDK가 축약명으로 반환하는 경우도 함께 처리합니다.
  const isMetropolitan = [
    '부산', '대구', '인천', '광주', '대전', '울산',
  ].includes(provinceName)

  const shortProvince =
    province === '경상북도'
      ? '경북'
      : isMetropolitan
        ? provinceName
        : province

  const areaPattern = isMetropolitan ? /[구군]$/ : /[시군]$/

  const areaName =
    region.region_2depth_name
      ?.split(/\s+/)
      .find((part) => areaPattern.test(part)) ?? ''

  return [shortProvince, areaName]
    .filter(Boolean)
    .join(' ')
}
