import type { Memory, RecordItem } from "../types";
import { mockNearbyQuests } from "@/features/quests/pages/home/mocks/nearbyQuests";

export const previewMemories: Memory[] = [
  {
    id: "0",
    title: "시험 끝나면 가던 떡볶이집",
    sub: "안부 2통 | 일반 퀘스트",
    photoUrl: null,
    greetings: [
      {
        id: "m-old",
        greeting: "사장님 아직 그대로세요.\n떡볶이도 그대로예요.",
        photoUrl: null,
        senderName: "동네 주민 수현",
        createdAt: "2026-11-03T10:00:00+09:00",
      },
      {
        id: "m-new",
        greeting: "오늘도 학교 앞에 다녀왔어요. 여전히 학생들로 북적여요.",
        photoUrl: null,
        senderName: "여행자 지우",
        createdAt: "2026-11-06T09:00:00+09:00",
      },
    ],
  },
  {
    id: "memory-view",
    title: "해 질 무렵의 앞산 전망대",
    sub: "안부 1통 | 이미지 퀘스트",
    photoUrl: null,
    greetings: [
      {
        id: "view",
        greeting: "해 질 무렵의 풍경은 여전히 아름다워요.",
        photoUrl: null,
        senderName: "동네 주민 수현",
        createdAt: "2026-11-04T18:00:00+09:00",
      },
    ],
  },
  {
    id: "memory-lake",
    title: "친구들과 탔던 수성못 오리배",
    sub: "아직 안부를 기다리는 중",
    photoUrl: null,
    greetings: [],
  },
];

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

