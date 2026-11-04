export type Entry = {
  id: string;
  title: string;
  place: string;
  date: string;
  message: string;
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
export function saveHistory(id: string) {
  const entries = readHistory();
  if (!entries.some((x) => x.id === id))
    entries.unshift({
      id,
      title: "누군가의 그리움에 도착했어요",
      place: "직접 담은 오늘의 풍경",
      date: new Date().toLocaleDateString("ko-KR"),
      message: "",
    });
  localStorage.setItem("geurium.demo.history", JSON.stringify(entries));
}
