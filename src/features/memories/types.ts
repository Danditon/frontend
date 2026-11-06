/** Frontend view model. Map API DTOs here once response schemas are finalized. */
export type Greeting = {
  isMine?: boolean;
  id: string;
  greeting: string;
  photoUrl: string | null;
  senderName: string;
  createdAt: string;
};
export type Memory = {
  id: string;
  title: string;
  sub: string;
  photoUrl: string | null;
  greetings: Greeting[];
};
export type RecordItem = {
  performerName?: string;
  questId?: string;
  createdAt?: string;
  greetings?: Greeting[];
  id: string;
  title: string;
  photoUrl: string | null;
};
export type MyPageData = {
  memories: Memory[];
  records: RecordItem[];
  completedRecords?: RecordItem[];
};
