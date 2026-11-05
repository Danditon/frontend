// 주변 퀘스트 목록 API가 반환하는 퀘스트 한 개의 형태입니다.
export type NearbyQuest = {
  questId: number
  questTitle: string
  questType: 'GENERAL' | 'IMAGE'
  difficulty: 1 | 2 | 3
  placeName: string
  lat: number
  lng: number
  distance: number
  isMine: boolean
}
