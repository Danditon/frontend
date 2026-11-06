import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { ExternalLink } from "lucide-react";
import type { RecordItem } from "@/features/memories/types";
import type {
  KakaoMap,
  KakaoCustomOverlay,
} from "@/features/quests/pages/home/types/kakaoMaps";
import { greetingPath, locatedRecords } from "../lib/locations";

export function HistoryMap({
  records,
  source,
}: {
  records: RecordItem[];
  source: "records" | "completed";
}) {
  const points = useMemo(() => locatedRecords(records), [records]);
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<KakaoMap | null>(null);
  const markersRef = useRef(new Map<string, KakaoCustomOverlay>());
  const buttonsRef = useRef(new Map<string, HTMLButtonElement>());
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected = points.find((record) => record.id === selectedId);
  const select = useCallback(
    (id: string) => {
      setSelectedId(id);
      const point = points.find((record) => record.id === id);
      const maps = window.kakao?.maps;
      if (point && maps && mapRef.current) {
        mapRef.current.panTo(
          new maps.LatLng(point.location.lat, point.location.lng),
        );
        markersRef.current.forEach((marker, key) =>
          marker.setZIndex(key === id ? 10 : 0),
        );
        buttonsRef.current.forEach((button, key) =>
          button.setAttribute("aria-pressed", String(key === id)),
        );
      }
    },
    [points],
  );

  useEffect(() => {
    if (!points.length) return;
    const element = container.current;
    if (!element) return;
    const markers = markersRef.current;
    const buttons = buttonsRef.current;
    let cancelled = false;
    let expired = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let observer: ResizeObserver | undefined;
    const listeners: { button: HTMLButtonElement; handler: () => void }[] = [];
    const timeout = setTimeout(() => {
      expired = true;
      if (!cancelled) setStatus("error");
    }, 8000);
    const start = () => {
      if (expired || cancelled) return;
      const maps = window.kakao?.maps;
      if (!maps) {
        retry = setTimeout(start, 100);
        return;
      }
      maps.load(() => {
        if (cancelled) return;
        try {
          const first = points[0].location;
          const map = new maps.Map(element, {
            center: new maps.LatLng(first.lat, first.lng),
            level: 3,
          });
          mapRef.current = map;
          const bounds = new maps.LatLngBounds();
          points.forEach((record) => {
            const position = new maps.LatLng(
              record.location.lat,
              record.location.lng,
            );
            bounds.extend(position);
            const button = document.createElement("button");
            button.type = "button";
            button.className =
              "relative flex flex-col items-center border-0 bg-transparent p-1 focus-visible:outline-2 focus-visible:outline-[#242624]";
            button.setAttribute(
              "aria-label",
              `${record.location.placeName || record.title} 위치 보기`,
            );
            button.setAttribute("aria-pressed", "false");
            const circle = document.createElement("span");
            circle.className =
              "relative grid h-11 w-11 place-items-center overflow-hidden rounded-full border-[3px] border-[#c7bf8e] bg-[#dcecef] text-sm font-semibold shadow-md";
            circle.textContent = (
              record.location.placeName || record.title
            ).slice(0, 1);
            const photoUrl = record.photoUrl?.trim();
            if (
              photoUrl &&
              (/^https?:\/\//i.test(photoUrl) || /^\/(?!\/)/.test(photoUrl))
            ) {
              const image = document.createElement("img");
              image.src = photoUrl;
              image.alt = "";
              image.className = "absolute inset-0 h-full w-full object-cover";
              image.addEventListener("error", () => image.remove(), {
                once: true,
              });
              circle.append(image);
            }
            const stamp = document.createElement("span");
            stamp.className =
              "-mt-1 rounded-full bg-[#f0e3ad] px-2 py-0.5 text-[8px] font-medium text-[#65572b] shadow-sm";
            stamp.textContent = "완료";
            button.append(circle, stamp);
            const marker = new maps.CustomOverlay({
              map,
              position,
              content: button,
              xAnchor: 0.5,
              yAnchor: 1,
              zIndex: 1,
            });
            const handler = () => select(record.id);
            button.addEventListener("click", handler);
            markers.set(record.id, marker);
            buttons.set(record.id, button);
            listeners.push({ button, handler });
          });
          const fit = () => {
            map.relayout();
            if (points.length > 1) map.setBounds(bounds, 36, 36, 36, 36);
          };
          fit();
          observer = new ResizeObserver(fit);
          observer.observe(element);
          clearTimeout(timeout);
          setStatus("ready");
        } catch {
          clearTimeout(timeout);
          setStatus("error");
        }
      });
    };
    start();
    return () => {
      cancelled = true;
      clearTimeout(retry);
      clearTimeout(timeout);
      observer?.disconnect();
      listeners.forEach(({ button, handler }) =>
        button.removeEventListener("click", handler),
      );
      markers.forEach((marker) => marker.setMap(null));
      markers.clear();
      buttons.clear();
      mapRef.current = null;
      element.replaceChildren();
    };
  }, [points, select]);

  return (
    <section aria-label="완료한 퀘스트 위치" className="mb-3 text-[#242624]">
      <div className="relative h-[220px] overflow-hidden rounded-2xl bg-[#eef5f6]">
        <div
          ref={container}
          className="absolute inset-0"
          role="region"
          aria-label="완료 장소 지도"
        />
        {!points.length ? (
          <p
            role="status"
            className="absolute inset-0 grid place-items-center p-5 text-center text-xs"
          >
            {records.length
              ? "이 기록에는 아직 위치 정보가 없어요."
              : "퀘스트를 수행하면 이곳에 방문한 장소가 표시돼요."}
          </p>
        ) : (
          status !== "ready" && (
            <p
              role="status"
              className="pointer-events-none absolute inset-0 grid place-items-center bg-[#eef5f6] p-5 text-center text-xs"
            >
              {status === "error"
                ? "지도를 불러오지 못했어요. 아래에서 장소를 선택해 주세요."
                : "방문한 장소를 표시하고 있어요."}
            </p>
          )
        )}
        <span className="pointer-events-none absolute bottom-4 left-4 z-10 rounded-full bg-[#242624] px-3 py-1.5 text-[10px] text-white">
          미션 다녀온 곳 {points.length}
        </span>
      </div>
      {status === "error" && (
        <div className="mt-2 flex flex-wrap gap-2">
          {points.map((record) => (
            <button
              key={record.id}
              className="rounded-full bg-white px-3 py-2 text-xs"
              onClick={() => select(record.id)}
            >
              {record.location.placeName || record.title}
            </button>
          ))}
        </div>
      )}
      {selected && (
        <div className="relative mt-2 rounded-xl bg-white p-3 pr-9 text-xs shadow-sm">
          <button
            className="absolute right-3 top-2 p-1 text-neutral-500"
            aria-label="장소 정보 닫기"
            onClick={() => {
              setSelectedId(null);
              buttonsRef.current.forEach((button) =>
                button.setAttribute("aria-pressed", "false"),
              );
            }}
          >
            ×
          </button>
          <h3 className="font-semibold">
            {selected.location.placeName || selected.title}
          </h3>
          <p className="mt-1 text-[10px] text-neutral-500">
            {selected.location.address ?? selected.title}
          </p>
          <div className="mt-2 flex gap-4">
            <Link className="underline" to={greetingPath(selected, source)}>
              이곳의 안부 보기
            </Link>
            <a
              className="inline-flex items-center gap-1 text-neutral-500"
              href={`https://map.kakao.com/link/map/${encodeURIComponent(selected.location.placeName || selected.title)},${selected.location.lat},${selected.location.lng}`}
              target="_blank"
              rel="noreferrer"
            >
              지도 열기
              <ExternalLink size={11} />
            </a>
          </div>
        </div>
      )}
      {records.length > points.length && (
        <p className="mt-2 text-[10px] text-neutral-500">
          위치 정보가 없는 기록 {records.length - points.length}건은 지도에
          표시하지 않았어요.
        </p>
      )}
    </section>
  );
}
