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

// 퀘스트 상세 화면과 수행 중 카드에서 사용하는 상세 데이터입니다.
export type QuestDetail = {
  questId: number
  questType: NearbyQuest['questType']
  author: {
    userId: number
    nickname: string
  }
  placeName: string
  address: string
  lat: number
  lng: number
  longingText: string
  photoUrl: string | null
  questTitle: string
  questDescription: string
  difficulty: NearbyQuest['difficulty']
  status: 'OPEN'
  isMine: boolean
  myStatus: 'NONE' | 'FAILED' | 'PASSED'
}
