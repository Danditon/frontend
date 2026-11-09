import test from "node:test";
import assert from "node:assert/strict";
import { greetingViewItems } from "../src/features/memories/lib/greetingViews.ts";
import type { QuestGreetings } from "../src/features/quests/api/verification.ts";

const submission = (id: number, userId: number, createdAt: string, verifyStatus: "PASSED" | "FAILED" = "PASSED"): QuestGreetings["submissions"][number] => ({
  submissionId: id, performer: { userId, nickname: `사용자 ${userId}` },
  createdAt, greeting: `안부 ${id}`, photoUrl: null, verifyStatus, similarity: null, isLiked: false,
});
const items = [submission(101, 7, "2026-11-03"), submission(201, 8, "2026-11-02"),
  submission(102, 7, "2026-11-05"), submission(202, 9, "2026-11-04"), submission(203, 10, "2026-11-06", "FAILED")];

test("내 안부는 선택한 수행 ID와 내 작성자 ID가 모두 맞는 한 건만 표시한다", () => {
  const mine = greetingViewItems(items, "mine", 7, "101");
  assert.deepEqual(mine.map(item => item.id), ["101"]);
  assert.equal(mine[0].isMine, true);
  assert.deepEqual(greetingViewItems(items, "mine", 7, "201"), []);
  assert.deepEqual(greetingViewItems(items, "mine", 7, "missing"), []);
  assert.deepEqual(greetingViewItems(items, "mine", 7), []);
});

test("다른 사람 안부는 내 모든 수행과 실패 글을 제외하고 최신순으로 표시한다", () => {
  const peers = greetingViewItems(items, "others", 7);
  assert.deepEqual(peers.map(item => item.id), ["202", "201"]);
  assert.equal(peers.every(item => !item.isMine), true);
  assert.deepEqual(items.map(item => item.submissionId), [101, 201, 102, 202, 203]);
});

test("도착한 안부는 작성자 화면의 성공 글 전체를 유지하고 사용자 미확인 시 내·다른 안부를 노출하지 않는다", () => {
  assert.deepEqual(greetingViewItems(items, "received", 7).map(item => item.id), ["102", "202", "101", "201"]);
  for (const userId of [undefined, 0, -1]) {
    assert.deepEqual(greetingViewItems(items, "mine", userId, "101"), []);
    assert.deepEqual(greetingViewItems(items, "others", userId), []);
  }
});
