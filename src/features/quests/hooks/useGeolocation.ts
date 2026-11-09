import { useCallback, useEffect, useRef, useState } from 'react'

// 위치 조회에 성공했을 때 화면에 전달할 좌표 정보의 타입입니다.
export type UserPosition = {
  lat: number // 위도
  lng: number // 경도
  accuracy: number // 위치 정확도 범위(미터). 작을수록 더 정밀한 위치입니다.
  timestamp: number // 위치가 측정된 시각(1970년 1월 1일부터 지난 밀리초)
}

// 화면에서 오류 종류를 구분할 code와 사용자에게 보여줄 message입니다.
export type LocationError = {
  code: 'UNSUPPORTED' | 'PERMISSION_DENIED' | 'POSITION_UNAVAILABLE' | 'TIMEOUT'
  message: string
}

// 화면에 함께 전달할 조회 상태입니다. null은 아직 값이 없다는 뜻입니다.
type LocationState = {
  position: UserPosition | null // 조회에 성공한 좌표
  isLocating: boolean // 위치를 가져오는 중이면 true
  error: LocationError | null // 실패했을 때의 오류 정보
}

// 브라우저의 오류 번호를 앱에서 사용할 오류 코드와 안내 문구로 변환합니다.
// 1: 권한 거절 / 2: 위치 확인 불가 / 3: 시간 초과
export const locationErrors: Record<number, LocationError> = {
  1: {
    code: 'PERMISSION_DENIED',
    message: '현재 위치를 확인하려면 위치 권한을 허용해주세요.',
  },
  2: {
    code: 'POSITION_UNAVAILABLE',
    message: '현재 위치를 확인할 수 없어요. 다시 시도해주세요.',
  },
  3: {
    code: 'TIMEOUT',
    message: '위치 확인 시간이 초과됐어요. 다시 시도해주세요.',
  },
}

export function useGeolocation() {
  // useState 값이 바뀌면 이 훅을 사용하는 화면도 다시 렌더링됩니다.
  const [state, setState] = useState<LocationState>({
    position: null,
    isLocating: false,
    error: null,
  })
  // useRef는 렌더링 사이에 값을 유지하지만, 변경해도 화면을 다시 그리지 않습니다.
  const isRequesting = useRef(false) // 진행 중인 요청이 있는지 즉시 확인하는 잠금 값
  const isMounted = useRef(false) // 이 훅을 사용하는 컴포넌트가 화면에 남아 있는지

  // 컴포넌트의 시작·종료만 확인합니다. 여기서 위치를 자동 요청하지는 않습니다.
  useEffect(() => {
    isMounted.current = true

    return () => {
      // 브라우저의 일회성 위치 요청은 취소할 수 없어 늦은 응답을 무시합니다.
      isMounted.current = false
    }
  }, [])

  // 화면에서 호출할 위치 조회 함수입니다. useCallback으로 함수 참조를 유지합니다.
  // Promise를 반환하므로 await requestLocation()으로 결과를 기다릴 수 있습니다.
  // 성공하면 좌표, 실패·중복 요청·화면 종료 상황에서는 null을 반환합니다.
  const requestLocation = useCallback((): Promise<UserPosition | null> => {
    // 화면이 이미 종료됐거나 조회 중이면 새로운 요청을 보내지 않습니다.
    if (!isMounted.current || isRequesting.current) {
      return Promise.resolve(null)
    }

    // navigator는 브라우저 객체이며, geolocation이 위치 조회 기능입니다.
    // 브라우저 밖에서 실행되거나 위치 기능이 없는 환경을 처리합니다.
    if (typeof navigator === 'undefined' || !navigator.geolocation) {
      setState({
        position: null,
        isLocating: false,
        error: {
          code: 'UNSUPPORTED',
          message: '이 환경에서는 위치 조회를 사용할 수 없어요.',
        },
      })
      return Promise.resolve(null)
    }

    // 먼저 잠금을 걸어 연속 클릭을 막고, 화면에는 로딩 상태를 알립니다.
    isRequesting.current = true
    // ...previous는 이전 좌표를 조회 중에 유지하고, 이전 오류만 지웁니다.
    setState((previous) => ({ ...previous, isLocating: true, error: null }))

    // 콜백 방식의 브라우저 API를 await로 사용할 수 있도록 Promise로 감쌉니다.
    return new Promise((resolve) => {
      // 성공·실패가 공통으로 사용하는 종료 처리입니다.
      const finish = (position: UserPosition | null, error: LocationError | null) => {
        // 다음 조회를 할 수 있도록 잠금을 해제합니다.
        isRequesting.current = false

        // 응답을 기다리는 동안 화면을 떠났다면 상태를 갱신하지 않습니다.
        if (!isMounted.current) {
          resolve(null)
          return
        }

        setState({ position, isLocating: false, error }) // 화면의 조회 결과 갱신
        resolve(position) // 이 함수를 await한 쪽에 결과 전달
      }

      try {
        // 현재 위치를 한 번 조회합니다. 필요하면 브라우저가 권한을 요청합니다.
        // 인자 순서: 성공 콜백, 실패 콜백, 조회 옵션
        navigator.geolocation.getCurrentPosition(
          // 성공: 브라우저의 latitude/longitude를 앱의 lat/lng 이름으로 옮깁니다.
          ({ coords, timestamp }) => {
            finish({
              lat: coords.latitude,
              lng: coords.longitude,
              accuracy: coords.accuracy,
              timestamp,
            }, null)
          },
          // 실패: 알 수 없는 오류 번호는 위치 확인 불가(2번)로 처리합니다.
          (error) => {
            finish(null, locationErrors[error.code] ?? locationErrors[2])
          },
          // 높은 정확도 요청(보장 아님), 최대 10초 대기, 캐시된 위치 사용 안 함
          { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 },
        )
      } catch {
        // API 호출 자체가 예외를 던져도 로딩과 잠금을 해제합니다.
        finish(null, locationErrors[2])
      }
    })
  }, [])

  // 화면에서는 position, isLocating, error, requestLocation을 꺼내 사용합니다.
  return { ...state, requestLocation }
}
