import type { QuestGreetings } from "../../quests/api/verification.ts";
import type { Greeting } from "../types.ts";
import { newestFirst } from "./performances.ts";

export type GreetingView = "received" | "mine" | "others";
export type SubmissionGreeting = Greeting & { submissionId: number; isLiked: boolean };

// submissions는 선택한 퀘스트의 API 응답만 전달합니다.
export function greetingViewItems(
  submissions: QuestGreetings["submissions"],
  view: GreetingView,
  userId: number | undefined,
  ownSubmissionId?: string,
): SubmissionGreeting[] {
  return newestFirst(submissions.filter((item) => {
    if (item.verifyStatus !== "PASSED") return false;
    if (view === "received") return true;
    if (!userId || userId <= 0) return false;
    if (view === "mine") return item.performer.userId === userId && String(item.submissionId) === ownSubmissionId;
    return item.performer.userId !== userId;
  }).map((item) => ({
    id: String(item.submissionId), submissionId: item.submissionId,
    greeting: item.greeting, photoUrl: item.photoUrl,
    senderName: item.performer.nickname, createdAt: item.createdAt,
    isMine: item.performer.userId === userId, isLiked: item.isLiked,
  })));
}
