import type { RecordItem } from "../../memories/types.ts";
import type { RecordLocation } from "../../../shared/types/location.ts";

export type LocatedRecord = RecordItem & { location: RecordLocation };
export function locatedRecords(
  records: readonly RecordItem[],
): LocatedRecord[] {
  return records.filter((record): record is LocatedRecord => {
    const location = record.location;
    return (
      !!location &&
      Number.isFinite(location.lat) &&
      Number.isFinite(location.lng) &&
      location.lat >= -90 &&
      location.lat <= 90 &&
      location.lng >= -180 &&
      location.lng <= 180
    );
  });
}
export function greetingPath(
  record: RecordItem,
  source: "records" | "completed",
) {
  return `/me/memories?${new URLSearchParams({ source, record: record.id, quest: record.questId ?? record.id, message: "0" })}`;
}
