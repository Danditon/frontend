// 지도와 내 위치 마커가 함께 사용하는 카카오 SDK 타입입니다.
// 이 파일은 타입만 선언하며, 실제 SDK 로딩은 index.html에서 처리합니다.

export type KakaoLatLng = {
  getLat(): number // 위도 반환
  getLng(): number // 경도 반환
}

export type KakaoSize = {
  width: number
  height: number
}

// 이미지 객체는 생성 후 마커 옵션에 전달하는 용도로만 사용합니다.
export type KakaoMarkerImage = object

export type KakaoMap = {
  relayout(): void // 지도 영역 크기가 바뀌었을 때 다시 계산
  panTo(position: KakaoLatLng): void // 전달받은 좌표로 지도 중심 이동
}

export type KakaoMarker = {
  setPosition(position: KakaoLatLng): void // 기존 마커의 좌표 변경
  setMap(map: KakaoMap | null): void // 지도에 연결하거나 null로 제거
}

// TypeScript에 브라우저의 window.kakao 형태를 알려줍니다.
// SDK 로딩 실패 시 없을 수 있으므로 kakao에 ?를 붙입니다.
declare global {
  interface Window {
    kakao?: {
      maps: {
        load(callback: () => void): void // SDK 준비가 끝나면 콜백 실행

        LatLng: new (
          latitude: number,
          longitude: number,
        ) => KakaoLatLng

        Map: new (
          container: HTMLElement,
          options: {
            center: KakaoLatLng
            level: number
          },
        ) => KakaoMap

        Size: new (width: number, height: number) => KakaoSize

        MarkerImage: new (
          source: string,
          size: KakaoSize,
        ) => KakaoMarkerImage

        Marker: new (options: {
          map: KakaoMap
          position: KakaoLatLng
          title?: string
          image?: KakaoMarkerImage // 생략하면 기본 마커 사용
        }) => KakaoMarker
      }
    }
  }
}
