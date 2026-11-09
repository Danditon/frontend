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

export type KakaoPoint = {
  x: number
  y: number
}

// 지도 좌표와 지도 왼쪽 위 기준의 화면 좌표를 변환합니다.
export type KakaoMapProjection = {
  containerPointFromCoords(position: KakaoLatLng): KakaoPoint
  coordsFromContainerPoint(point: KakaoPoint): KakaoLatLng
}

export type KakaoBounds = {
  extend(position: KakaoLatLng): void
  contain(position: KakaoLatLng): boolean // 퀘스트 좌표가 현재 지도 범위 안인지 확인
}

export type KakaoMap = {
  setLevel(level: number): void // 지도 확대 수준 설정
  setBounds(bounds: KakaoBounds, paddingTop?: number, paddingRight?: number, paddingBottom?: number, paddingLeft?: number): void
  getBounds(): KakaoBounds // 현재 지도 영역
  getCenter(): KakaoLatLng // 현재 지도 중심 좌표
  getProjection(): KakaoMapProjection // 화면·지도 좌표 변환 객체
  relayout(): void // 지도 영역 크기가 바뀌었을 때 다시 계산
  panTo(position: KakaoLatLng): void // 전달받은 좌표로 지도 중심 이동
}

export type KakaoMarker = {
  setZIndex(zIndex: number): void // 선택한 마커를 다른 마커보다 앞에 표시
  setImage(image: KakaoMarkerImage): void // 종류·난이도 이미지 갱신
  setPosition(position: KakaoLatLng): void // 기존 마커의 좌표 변경
  setMap(map: KakaoMap | null): void // 지도에 연결하거나 null로 제거
}

export type KakaoCustomOverlay = {
  setMap(map: KakaoMap | null): void
  setPosition(position: KakaoLatLng): void
  setZIndex(zIndex: number): void
}
// 상단 지역명 표시에 필요한 행정구역 필드만 선언합니다.
export type KakaoRegion = {
  region_type: 'H' | 'B'
  region_1depth_name?: string
  region_2depth_name?: string
}

export type KakaoGeocoder = {
  coord2RegionCode(
    longitude: number,
    latitude: number,
    callback: (
      result: KakaoRegion[],
      status: 'OK' | 'ZERO_RESULT' | 'ERROR',
    ) => void,
  ): void
}

// TypeScript에 브라우저의 window.kakao 형태를 알려줍니다.
// SDK 로딩 실패 시 없을 수 있으므로 kakao에 ?를 붙입니다.
declare global {
  interface Window {
    kakao?: {
      maps: {
        load(callback: () => void): void // SDK 준비가 끝나면 콜백 실행

        // services 라이브러리는 maps.load 완료 후 사용합니다.
        services?: {
          Places: new () => {
            keywordSearch(
              keyword: string,
              callback: (results: Array<{
                place_name: string
                address_name: string
                road_address_name: string
                x: string
                y: string
              }>, status: 'OK' | 'ZERO_RESULT' | 'ERROR') => void,
            ): void
          }
          Geocoder: new () => KakaoGeocoder
          Status: {
            OK: 'OK'
          }
        }

        LatLng: new (
          latitude: number,
          longitude: number,
        ) => KakaoLatLng

        CustomOverlay: new (options: { map: KakaoMap; position: KakaoLatLng; content: HTMLElement; xAnchor?: number; yAnchor?: number; zIndex?: number }) => KakaoCustomOverlay

        LatLngBounds: new () => KakaoBounds

        Map: new (
          container: HTMLElement,
          options: {
            center: KakaoLatLng
            level: number
          },
        ) => KakaoMap

        Point: new (x: number, y: number) => KakaoPoint

        Size: new (width: number, height: number) => KakaoSize

        MarkerImage: new (
          source: string,
          size: KakaoSize,
          options?: { offset?: KakaoPoint }, // 이미지 안에서 실제 지도 좌표에 맞출 기준점
        ) => KakaoMarkerImage

        // 마커 클릭 이벤트의 등록과 정리에 사용합니다.
        event: {
          addListener(
            target: KakaoMap,
            eventName: 'idle',
            handler: () => void,
          ): void
          addListener(
            target: KakaoMarker,
            eventName: 'click',
            handler: () => void,
          ): void
          removeListener(
            target: KakaoMap,
            eventName: 'idle',
            handler: () => void,
          ): void
          removeListener(
            target: KakaoMarker,
            eventName: 'click',
            handler: () => void,
          ): void
        }

        Marker: new (options: {
          map: KakaoMap
          position: KakaoLatLng
          title?: string
          clickable?: boolean // 마커 클릭의 지도 전파 차단
          image?: KakaoMarkerImage // 생략하면 기본 마커 사용
        }) => KakaoMarker
      }
    }
  }
}
