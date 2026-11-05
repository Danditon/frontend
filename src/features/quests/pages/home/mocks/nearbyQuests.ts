import type { NearbyQuest } from '@/features/quests/types/quest'

// 마커 표시를 확인하기 위한 임시 데이터입니다. API 연결 후 이 파일을 제거합니다.
// distance도 예시 값이며, 실제 사용자 위치로 계산한 거리가 아닙니다.
export const mockNearbyQuests: NearbyQuest[] = [
  {
    questId: 1,
    questTitle: '떡볶이집 안부 확인하기',
    questType: 'GENERAL',
    difficulty: 1,
    placeName: '임시 떡볶이집',
    lat: 35.8714,
    lng: 128.6014,
    distance: 0,
    isMine: false,
  },
  {
    questId: 2,
    questTitle: '문구점 사진 남기기',
    questType: 'IMAGE',
    difficulty: 2,
    placeName: '임시 문구점',
    lat: 35.8724,
    lng: 128.6024,
    distance: 150,
    isMine: false,
  },
  {
    questId: 3,
    questTitle: '놀이터 안부 확인하기',
    questType: 'GENERAL',
    difficulty: 1,
    placeName: '임시 놀이터',
    lat: 35.8894,
    lng: 128.6014,
    distance: 2000,
    isMine: true,
  },
]
