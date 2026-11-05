/** Frontend view model. Map API DTOs here once response schemas are finalized. */
export type Greeting = {
  id: string
  greeting: string
  photoUrl: string | null
  senderName: string
  createdAt: string
}
export type Memory = {
  id: string
  title: string
  sub: string
  photoUrl: string | null
  greetings: Greeting[]
}
export type RecordItem = {
  id: string
  title: string
  photoUrl: string | null
}
export type MyPageData = { memories: Memory[]; records: RecordItem[] }
