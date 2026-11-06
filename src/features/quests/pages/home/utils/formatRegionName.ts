// 카카오 지역 정보를 상단에 표시할 시·군 단위 이름으로 정리합니다.
import type { KakaoRegion } from '../types/kakaoMaps'

export function formatRegionName(region: KakaoRegion): string {
  const province = region.region_1depth_name?.trim() ?? ''

  const shortProvince =
    province === '경상북도'
      ? '경북'
      : province === '대구광역시'
        ? '대구'
        : province

  // ‘포항시 북구’라면 포항시만, ‘중구’라면 생략합니다.
  const cityOrCounty =
    region.region_2depth_name
      ?.split(/\s+/)
      .find((part) => /[시군]$/.test(part)) ?? ''

  return [shortProvince, cityOrCounty]
    .filter(Boolean)
    .join(' ')
}
