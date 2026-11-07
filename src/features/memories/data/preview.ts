import type { RecordItem } from "../types";
import { mockNearbyQuests } from "@/features/quests/pages/home/mocks/nearbyQuests";

// API 연결 전 완료 장소와 수행 글을 확인하기 위한 예시입니다.
export const previewCompletedRecords: RecordItem[] = [1, 2, 101].map(
  (id, index) => {
    const quest = mockNearbyQuests.find((item) => item.questId === id)!;
    return {
      id: `completed-${id}`,
      questId: String(id),
      title: quest.questTitle,
      photoUrl: null,
      createdAt: `2026-11-0${3 + index}T12:00:00+09:00`,
      greetings: [
        {
          id: `visit-${id}-old`,
          greeting: `${quest.placeName}에 다녀왔어요. 기억 속 모습이 남아 있어요.`,
          photoUrl: null,
          senderName: "여행자 수현",
          createdAt: `2026-11-0${3 + index}T12:00:00+09:00`,
        },
        {
          id: `visit-${id}-new`,
          greeting: `오늘 다시 ${quest.placeName}에 들렀어요. 이곳의 안부를 전해요.`,
          photoUrl: null,
          senderName: "여행자 지우",
          createdAt: `2026-11-0${4 + index}T15:00:00+09:00`,
        },
      ],
    };
  },
);

export function previewRecordLocation(questId: string) {
  const quest = mockNearbyQuests.find(
    (item) => String(item.questId) === questId,
  );
  return quest
    ? { lat: quest.lat, lng: quest.lng, placeName: quest.placeName }
    : undefined;
}

export function previewRecordQuest(questId: string) {
  const quest = mockNearbyQuests.find(
    (item) => String(item.questId) === questId,
  );
  return quest
    ? { questType: quest.questType, difficulty: quest.difficulty }
    : undefined;
}
