import { RemotePhoto } from "@/shared/components/RemotePhoto";
import type { RecordItem } from "@/features/memories/types";

export type HistoryCardItem = {
  key: string;
  record: RecordItem;
  photoUrl: string | null;
  createdAt?: string;
};

export function HistoryRecordCard({ item, selected, onSelect }: {
  item: HistoryCardItem;
  selected: boolean;
  onSelect: () => void;
}) {
  const { record, photoUrl, createdAt } = item;
  return (
    <button
      type="button"
      className="mypage-record-card"
      data-history-key={item.key}
      aria-pressed={selected}
      onClick={onSelect}
    >
      <RemotePhoto photoUrl={photoUrl} alt={record.title} />
      <span className="mypage-record-copy">
        <strong>{record.title}</strong>
        <small>{record.location?.placeName || "위치 정보 없음"}</small>
        {createdAt && <small>{createdAt.slice(0, 10)}</small>}
      </span>
    </button>
  );
}
