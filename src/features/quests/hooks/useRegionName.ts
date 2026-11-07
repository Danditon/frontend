// 기존 GPS 좌표를 카카오 지역 정보로 변환해 상단에 표시할 지역명을 반환하는 훅입니다.
import { useQuery } from '@tanstack/react-query'
import type { UserPosition } from './useGeolocation'
import { formatRegionName } from '../pages/home/utils/formatRegionName'

function lookupRegionName(lat: number, lng: number): Promise<string> {
  return new Promise((resolve, reject) => {
    const maps = window.kakao?.maps

    if (!maps) {
      reject(new Error('카카오 지도 SDK를 확인할 수 없어요.'))
      return
    }

    let finished = false

    // SDK나 지역 조회 응답이 오지 않아 계속 로딩되는 상황을 막습니다.
    const timeoutId = window.setTimeout(() => {
      finish(new Error('지역 확인 시간이 초과됐어요.'))
    }, 10000)

    function finish(result: string | Error) {
      if (finished) return

      finished = true
      window.clearTimeout(timeoutId)

      if (result instanceof Error) {
        reject(result)
      } else {
        resolve(result)
      }
    }

    try {
      // autoload=false이므로 SDK 준비 완료 후 서비스를 사용합니다.
      maps.load(() => {
        if (finished) return

        try {
          const services = maps.services

          if (!services) {
            finish(new Error('지역 조회 기능을 불러오지 못했어요.'))
            return
          }

          const geocoder = new services.Geocoder()

          // 카카오 좌표 변환의 인자는 경도·위도 순서입니다.
          geocoder.coord2RegionCode(lng, lat, (results, status) => {
            if (finished) return

            if (status !== services.Status.OK) {
              finish(new Error('현재 위치의 지역을 확인하지 못했어요.'))
              return
            }

            // 행정동을 우선하고, 없으면 법정동 정보를 사용합니다.
            const region =
              results.find((item) => item.region_type === 'H') ??
              results.find((item) => item.region_type === 'B')

            const label = region ? formatRegionName(region) : ''

            if (!label) {
              finish(new Error('표시할 지역 정보가 없어요.'))
              return
            }

            finish(label)
          })
        } catch {
          finish(new Error('지역 조회 중 문제가 발생했어요.'))
        }
      })
    } catch {
      finish(new Error('지역 조회 중 문제가 발생했어요.'))
    }
  })
}

export function useRegionName(position: UserPosition | null): string {
  const query = useQuery({
    queryKey: [
      'location',
      'region',
      position?.lat ?? null,
      position?.lng ?? null,
      position?.timestamp ?? null,
    ],
    queryFn: () => {
      if (!position) {
        throw new Error('현재 위치가 필요합니다.')
      }

      return lookupRegionName(position.lat, position.lng)
    },
    // 실제 위치가 없으면 기본 지도 좌표로 대신 조회하지 않습니다.
    enabled: position !== null,
    staleTime: Infinity,
    retry: false,
  })

  if (!position) return '위치 확인'
  if (query.isPending) return '지역 확인 중'
  if (query.isError) return '지역 확인 불가'

  return query.data ?? '지역 확인 불가'
}
