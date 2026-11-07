import test from "node:test";
import assert from "node:assert/strict";
import {
  locatedRecords,
  greetingPath,
} from "../src/features/history/lib/locations.ts";
import type { RecordItem } from "../src/features/memories/types.ts";

test("유효한 위치만 지도에 표시하고 0도 좌표도 허용한다", () => {
  const base = { id: "a", title: "방문 장소", photoUrl: null };
  const records: RecordItem[] = [
    {
      ...base,
      id: "valid",
      location: { lat: 35.87, lng: 128.6, placeName: "대구" },
    },
    { ...base, id: "zero", location: { lat: 0, lng: 0, placeName: "0도" } },
    { ...base, id: "missing" },
    { ...base, id: "nan", location: { lat: NaN, lng: 128, placeName: "" } },
    { ...base, id: "range", location: { lat: 91, lng: 128, placeName: "" } },
    {
      ...base,
      id: "infinite",
      location: { lat: 35, lng: Infinity, placeName: "" },
    },
    {
      ...base,
      id: "longitude",
      location: { lat: 35, lng: -181, placeName: "" },
    },
  ];
  assert.deepEqual(
    locatedRecords(records).map((item) => item.id),
    ["valid", "zero"],
  );
  assert.equal(records.length, 7);
});

test("마커의 안부 링크가 선택한 퀘스트와 기록 구분을 유지한다", () => {
  const path = greetingPath(
    { id: "record & 1", questId: "quest/2", title: "", photoUrl: null },
    "completed",
  );
  const url = new URL(path, "https://example.com");
  assert.equal(url.pathname, "/me/memories");
  assert.equal(url.searchParams.get("record"), "record & 1");
  assert.equal(url.searchParams.get("quest"), "quest/2");
  assert.equal(url.searchParams.get("source"), "completed");
  assert.equal(url.searchParams.get("message"), "0");
});
