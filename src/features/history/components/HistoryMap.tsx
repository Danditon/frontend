import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router";
import { MapPin, ExternalLink } from "lucide-react";
import type { RecordItem } from "@/features/memories/types";
import type {
  KakaoMap,
  KakaoMarker,
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
  const markersRef = useRef(new Map<string, KakaoMarker>());
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const selected =
    points.find((record) => record.id === selectedId) ?? points[0];
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
      }
    },
    [points],
  );

  useEffect(() => {
    if (!points.length) return;
    const element = container.current;
    if (!element) return;
    const markers = markersRef.current;
    let cancelled = false;
    let expired = false;
    let retry: ReturnType<typeof setTimeout> | undefined;
    let observer: ResizeObserver | undefined;
    const listeners: { marker: KakaoMarker; handler: () => void }[] = [];
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
          points.forEach((record, index) => {
            const position = new maps.LatLng(
              record.location.lat,
              record.location.lng,
            );
            bounds.extend(position);
            const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="34" height="44" viewBox="0 0 34 44"><path d="M17 1C8 1 1 8 1 17c0 12 16 26 16 26s16-14 16-26C33 8 26 1 17 1Z" fill="#242624" stroke="white" stroke-width="2"/><text x="17" y="23" fill="white" text-anchor="middle" font-family="Arial" font-size="15" font-weight="bold">${index + 1}</text></svg>`;
            const marker = new maps.Marker({
              map,
              position,
              title: record.location.placeName || record.title,
              clickable: true,
              image: new maps.MarkerImage(
                `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`,
                new maps.Size(34, 44),
              ),
            });
            const handler = () => select(record.id);
            maps.event.addListener(marker, "click", handler);
            markers.set(record.id, marker);
            listeners.push({ marker, handler });
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
      const maps = window.kakao?.maps;
      listeners.forEach(({ marker, handler }) => {
        maps?.event.removeListener(marker, "click", handler);
        marker.setMap(null);
      });
      markers.clear();
      mapRef.current = null;
      element.replaceChildren();
    };
  }, [points, select]);

  return (
    <section
      aria-label="완료한 퀘스트 위치"
      className="overflow-hidden rounded-3xl border border-[#c9eaf5] bg-white text-[#242624]"
    >
      <div className="flex items-center justify-between px-4 py-3 text-sm">
        <h2 className="flex items-center gap-2 font-semibold">
          <MapPin size={16} />
          다녀온 그리움 지도
        </h2>
        <span>{points.length}곳</span>
      </div>
      <div className="relative h-[240px] bg-[#eef5f6]">
        <div
          ref={container}
          className="absolute inset-0"
          role="region"
          aria-label="완료 장소 지도"
        />
        {!points.length ? (
          <p
            role="status"
            className="absolute inset-0 grid place-items-center p-5 text-center text-sm"
          >
            {records.length
              ? "이 기록에는 아직 위치 정보가 없어요."
              : "완료한 퀘스트가 생기면 지도에 표시해 드려요."}
          </p>
        ) : (
          status !== "ready" && (
            <p
              role="status"
              className="pointer-events-none absolute inset-0 grid place-items-center bg-[#eef5f6] p-5 text-center text-sm"
            >
              {status === "error"
                ? "지도를 불러오지 못했어요. 아래 장소의 지도 열기로 위치를 확인해 주세요."
                : "완료한 장소를 지도에 표시하고 있어요."}
            </p>
          )
        )}
      </div>
      {!!points.length && (
        <>
          <div
            aria-label="지도에 표시한 장소"
            className="flex flex-wrap gap-2 px-3 pt-3"
          >
            {points.map((record, index) => (
              <button
                key={record.id}
                aria-pressed={selected?.id === record.id}
                onClick={() => select(record.id)}
                className={`rounded-full px-3 py-2 text-xs ${selected?.id === record.id ? "bg-[#242624] text-white" : "bg-[#edf4f6]"}`}
              >
                {index + 1}. {record.location.placeName || record.title}
              </button>
            ))}
          </div>
          {selected && (
            <div className="p-4">
              <h3 className="font-semibold">
                {selected.location.placeName || selected.title}
              </h3>
              <p className="mt-1 text-xs text-neutral-500">{selected.title}</p>
              <p className="mt-1 text-xs text-neutral-500">
                {selected.location.address ??
                  `위도 ${selected.location.lat.toFixed(5)} · 경도 ${selected.location.lng.toFixed(5)}`}
              </p>
              <div className="mt-3 flex gap-2">
                <Link
                  className="rounded-full bg-[#c9eaf5] px-4 py-2 text-xs"
                  to={greetingPath(selected, source)}
                >
                  이곳의 안부 보기
                </Link>
                <a
                  className="inline-flex items-center gap-1 rounded-full border px-4 py-2 text-xs"
                  href={`https://map.kakao.com/link/map/${encodeURIComponent(selected.location.placeName || selected.title)},${selected.location.lat},${selected.location.lng}`}
                  target="_blank"
                  rel="noreferrer"
                >
                  지도 열기
                  <ExternalLink size={12} />
                </a>
              </div>
            </div>
          )}
        </>
      )}
      {records.length > points.length && (
        <p className="px-4 pb-3 text-xs text-neutral-500">
          위치 정보가 없는 기록 {records.length - points.length}건은 지도에서
          제외했어요.
        </p>
      )}
    </section>
  );
}
