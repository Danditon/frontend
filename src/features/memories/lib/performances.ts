import type { Greeting, Memory, RecordItem } from "../types.ts";

export function timestamp(value?: string): number {
  if (!value) return 0;
  const parsed = Date.parse(value);
  if (Number.isFinite(parsed)) return parsed;
  const match = value.match(/^(\d{4})\s*[.년]\s*(\d{1,2})\s*[.월]\s*(\d{1,2})/);
  return match
    ? Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]))
    : 0;
}

export function newestFirst<T extends { createdAt?: string }>(
  items: readonly T[],
): T[] {
  return [...items].sort(
    (a, b) => timestamp(b.createdAt) - timestamp(a.createdAt),
  );
}

export function recordMemory(
  record: RecordItem,
  memories: readonly Memory[],
  related: readonly RecordItem[] = [],
): Memory {
  const questId = record.questId ?? record.id;
  const memory = memories.find((item) => item.id === questId);
  const greetings = new Map<string, Greeting>();
  const candidates = [
    ...(record.greetings ?? memory?.greetings ?? []),
    ...related
      .filter((item) => (item.questId ?? item.id) === questId)
      .flatMap((item) => item.greetings ?? []),
  ];
  for (const greeting of candidates) {
    const existing = greetings.get(greeting.id);
    greetings.set(
      greeting.id,
      existing
        ? { ...existing, isMine: existing.isMine || greeting.isMine }
        : greeting,
    );
  }
  return {
    id: questId,
    title: record.title,
    sub: "수행 완료",
    photoUrl: record.photoUrl,
    greetings: newestFirst([...greetings.values()]),
  };
}

export function otherPerformances(
  mine: readonly RecordItem[],
  completed: readonly RecordItem[],
): RecordItem[] {
  const questIds = new Set(mine.map((item) => item.questId ?? item.id));
  const ownIds = new Set(mine.map((item) => item.id));
  return newestFirst(
    completed.filter(
      (item) => questIds.has(item.questId ?? item.id) && !ownIds.has(item.id),
    ),
  );
}
