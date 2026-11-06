// 기존 주변 퀘스트 mock을 바탕으로 만드는 상세 테스트 데이터입니다.
import type { QuestDetail } from '@/features/quests/types/quest'
import { mockNearbyQuests } from './nearbyQuests'

export const mockQuestDetails: QuestDetail[] =
  mockNearbyQuests.map((quest): QuestDetail => ({
    // 목록과 상세에서 같은 퀘스트의 ID·제목·종류·난이도·좌표를 사용합니다.
    questId: quest.questId,
    questTitle: quest.questTitle,
    questType: quest.questType,
    difficulty: quest.difficulty,
    placeName: quest.placeName,
    lat: quest.lat,
    lng: quest.lng,
    isMine: quest.isMine,

    // 아래 필드는 상세 API 연결 전 사용하는 테스트 값입니다.
    author: {
      userId: 999,
      nickname: '그리움을 남긴 사람',
    },
    address: '대구 중구 · 테스트 주소',
    longingText: `${quest.placeName}에 자주 방문하던 기억이 있어요.`,
    questDescription: quest.questType === 'IMAGE'
      ? '같은 장소의 사진을 남겨주세요.'
      : '아직 그대로인지 확인하고 안부를 남겨주세요.',

    // 사진은 비워두고, 화면에서 기본 배경을 표시하도록 합니다.
    photoUrl: null,
    status: 'OPEN',
    myStatus: 'NONE',
  }))
