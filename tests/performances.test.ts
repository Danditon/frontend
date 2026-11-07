import test from "node:test";
import assert from "node:assert/strict";
import {
  newestFirst,
  recordMemory,
  otherPerformances,
  timestamp,
} from "../src/features/memories/lib/performances.ts";
import { readHistory, saveHistory } from "../src/shared/lib/demo.ts";

const greeting = (id: string, createdAt: string) => ({
  id,
  createdAt,
  greeting: id,
  photoUrl: null,
  senderName: "작성자",
});

test("등록 시각 기준 내림차순이며 원본 배열을 바꾸지 않는다", () => {
  const items = [
    greeting("old", "2026-11-03T10:00:00+09:00"),
    greeting("unknown", ""),
    greeting("new", "2026-11-06T09:00:00+09:00"),
  ];
  assert.deepEqual(
    newestFirst(items).map((x) => x.id),
    ["new", "old", "unknown"],
  );
  assert.equal(items[0].id, "old");
  assert.equal(timestamp("잘못된 날짜"), 0);
  assert.ok(timestamp("2026. 11. 4.") > 0);
});

test("같은 날도 시간과 시간대를 비교하고 같은 시각의 순서는 유지한다", () => {
  const items = [
    greeting("a", "2026-11-06T09:00:00+09:00"),
    greeting("b", "2026-11-06T01:00:00Z"),
    greeting("c", "2026-11-06T09:00:00+09:00"),
  ];
  assert.deepEqual(
    newestFirst(items).map((x) => x.id),
    ["b", "a", "c"],
  );
});

test("기록의 퀘스트에 해당하는 안부만 가져온다", () => {
  const memories = [
    {
      id: "quest-a",
      title: "A",
      sub: "",
      photoUrl: null,
      greetings: [greeting("a", "")],
    },
    {
      id: "quest-b",
      title: "B",
      sub: "",
      photoUrl: null,
      greetings: [greeting("b", "")],
    },
  ];
  const record = {
    id: "record",
    questId: "quest-b",
    title: "기록 B",
    photoUrl: null,
  };
  assert.equal(recordMemory(record, memories).greetings[0].id, "b");
  assert.deepEqual(
    recordMemory({ ...record, questId: "missing" }, memories).greetings,
    [],
  );
  assert.deepEqual(
    recordMemory({ ...record, greetings: [] }, memories).greetings,
    [],
  );
});

test("완료 기록에 연결된 수행 글도 최신순으로 표시한다", () => {
  const record = {
    id: "completed",
    title: "완료 장소",
    photoUrl: null,
    greetings: [greeting("old", "2026-11-03"), greeting("new", "2026-11-06")],
  };
  assert.deepEqual(
    recordMemory(record, []).greetings.map((x) => x.id),
    ["new", "old"],
  );
});

test("수행 저장 시 제목과 안부, 정확한 등록 시각을 보존하고 중복 등록하지 않는다", () => {
  const values = new Map<string, string>();
  Object.defineProperty(globalThis, "localStorage", {
    configurable: true,
    value: {
      getItem: (key: string) => values.get(key) ?? null,
      setItem: (key: string, value: string) => values.set(key, value),
    },
  });
  saveHistory("quest-b", {
    title: "장소 B",
    message: "다녀왔어요",
    questType: "IMAGE",
    difficulty: 3,
  });
  saveHistory("quest-b", { message: "중복" });
  const records = readHistory();
  assert.equal(records.length, 1);
  assert.equal(records[0].title, "장소 B");
  assert.equal(records[0].message, "다녀왔어요");
  assert.equal(records[0].questType, "IMAGE");
  assert.equal(records[0].difficulty, 3);
  assert.ok(timestamp(records[0].createdAt) > 0);
});

test("내 수행 퀘스트의 안부는 나와 다른 수행자의 글을 합쳐 최신순으로 표시한다", () => {
  const mine = {
    id: "mine",
    questId: "q1",
    title: "내 퀘스트",
    photoUrl: null,
    greetings: [{ ...greeting("mine-message", "2026-11-05"), isMine: true }],
  };
  const peers = [
    {
      id: "peer1",
      questId: "q1",
      title: "",
      photoUrl: null,
      greetings: [
        greeting("peer-new", "2026-11-06"),
        greeting("peer-old", "2026-11-03"),
      ],
    },
    {
      id: "unrelated",
      questId: "q2",
      title: "",
      photoUrl: null,
      greetings: [greeting("unrelated", "2026-11-07")],
    },
  ];
  const result = recordMemory(mine, [], [mine, ...peers]);
  assert.deepEqual(
    result.greetings.map((item) => item.id),
    ["peer-new", "mine-message", "peer-old"],
  );
  assert.equal(result.greetings[1].isMine, true);
  assert.equal(mine.greetings.length, 1);
});

test("같은 글을 여러 기록에서 가져와도 중복 표시하지 않는다", () => {
  const message = greeting("same", "2026-11-06");
  const mine = {
    id: "mine",
    questId: "q1",
    title: "",
    photoUrl: null,
    greetings: [{ ...message, isMine: true }],
  };
  const peer = { ...mine, id: "peer", greetings: [message] };
  const result = recordMemory(peer, [], [mine, peer]);
  assert.equal(result.greetings.length, 1);
  assert.equal(result.greetings[0].isMine, true);
});

test("펼칠 다른 사람 기록은 내가 수행한 퀘스트에 한정하고 최신순으로 정렬한다", () => {
  const record = (id: string, questId: string, createdAt: string) => ({
    id,
    questId,
    createdAt,
    title: id,
    photoUrl: null,
  });
  const mine = [record("mine", "q1", "2026-11-04")];
  const completed = [
    record("old", "q1", "2026-11-03"),
    record("unrelated", "q2", "2026-11-07"),
    record("new", "q1", "2026-11-06"),
    ...mine,
  ];
  assert.deepEqual(
    otherPerformances(mine, completed).map((item) => item.id),
    ["new", "old"],
  );
  assert.deepEqual(otherPerformances([], completed), []);
});
