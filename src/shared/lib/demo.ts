import type { RecordLocation } from "../types/location.ts";
export type Entry = {
  questType?: "GENERAL" | "IMAGE";
  difficulty?: 1 | 2 | 3;
  id: string;
  title: string;
  place: string;
  date: string;
  message: string;
  createdAt?: string;
  location?: RecordLocation;
};
export function readHistory(): Entry[] {
  try {
    const value: unknown = JSON.parse(
      localStorage.getItem("geurium.demo.history") || "[]",
    );
    return Array.isArray(value)
      ? value.filter(
          (x): x is Entry =>
            typeof x?.id === "string" &&
            typeof x?.title === "string" &&
            typeof x?.date === "string" &&
            typeof x?.place === "string",
        )
      : [];
  } catch {
    return [];
  }
}
export function saveHistory(
  id: string,
  details?: {
    title?: string;
    message?: string;
    location?: RecordLocation;
    questType?: "GENERAL" | "IMAGE";
    difficulty?: 1 | 2 | 3;
  },
) {
  const entries = readHistory();
  if (!entries.some((x) => x.id === id))
    entries.unshift({
      id,
      title: details?.title ?? "누군가의 그리움에 도착했어요",
      place: "직접 담은 오늘의 풍경",
      date: new Date().toLocaleDateString("ko-KR"),
      createdAt: new Date().toISOString(),
      location: details?.location,
      questType: details?.questType,
      difficulty: details?.difficulty,
      message: details?.message ?? "",
    });
  localStorage.setItem("geurium.demo.history", JSON.stringify(entries));
}
