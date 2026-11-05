// 퀘스트 종류별 색상과 난이도별 별 개수로 카카오 마커 이미지를 만드는 함수입니다.
import type { NearbyQuest } from '@/features/quests/types/quest'
import type { KakaoMarkerImage } from '../types/kakaoMaps'

// 이미지 생성에 필요한 SDK 기능만 전달받습니다.
type MarkerImageSdk = Pick<
  NonNullable<Window['kakao']>['maps'],
  'MarkerImage' | 'Size'
>

const colors = {
  GENERAL: {
    background: '#FDE68A',
    selectedBackground: '#FACC15', // 선택한 일반 퀘스트는 선명한 노랑
    border: '#A16207',
    star: '#854D0E',
  },
  IMAGE: {
    background: '#DDD6FE',
    selectedBackground: '#C4B5FD', // 선택한 이미지 퀘스트는 조금 진한 보라
    border: '#7C3AED',
    star: '#5B21B6',
  },
}

export function createQuestMarkerImage(
  maps: MarkerImageSdk,
  questType: NearbyQuest['questType'],
  difficulty: NearbyQuest['difficulty'],
  isSelected = false, // Drawer에서 보고 있는 퀘스트인지 여부
): KakaoMarkerImage {
  const color = colors[questType]

  // 같은 크기의 별을 핀 중앙에 배치합니다. SVG 도형이라 글꼴에 영향을 받지 않습니다.
  const stars = Array.from({ length: difficulty }, (_, index) => {
    const x = 28 + (index - (difficulty - 1) / 2) * 15

    return `<polygon
      points="0,-7 2,-2 7,-2 3,1 4,6 0,3 -4,6 -3,1 -7,-2 -2,-2"
      transform="translate(${x}, 26)"
      fill="${color.star}"
    />`
  }).join('')

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="56" height="64" viewBox="0 0 56 64">
    <path
      d="M28 62C23 54 4 39 4 26a24 24 0 1 1 48 0c0 13-19 28-24 36Z"
      fill="${isSelected ? color.selectedBackground : color.background}"
      stroke="${color.border}"
      stroke-width="${isSelected ? 3.5 : 2}"
    />
    ${stars}
  </svg>`

  return new maps.MarkerImage(
    `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
    new maps.Size(56, 64),
  )
}
