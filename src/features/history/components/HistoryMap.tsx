import { createQuestMarkerImage } from "@/features/quests/pages/home/utils/createQuestMarkerImage";
import { useCallback, useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { getVerificationQuest, isQuestId } from "@/features/quests/api/verification";
import { Link } from "react-router";
import { ExternalLink } from "lucide-react";
import type { RecordItem } from "@/features/memories/types";
import type {
  KakaoMap,
  KakaoMarker,
} from "@/features/quests/pages/home/types/kakaoMaps";
import { greetingPath, locatedRecords } from "../lib/locations";

function focusLocation(
  map: KakaoMap,
  lat: number,
  lng: number,
  element: HTMLElement | null,
) {
  const maps = window.kakao?.maps;
  if (!maps || !element) return;
  const panelHeight =
    parseFloat(
      getComputedStyle(element).getPropertyValue("--history-panel-height"),
    ) || 170;
  const navHeight = element.closest(".app-phone")?.querySelector(".app-navigation")?.getBoundingClientRect().height ?? 124;
  const visibleHeight = Math.max(64, element.clientHeight - panelHeight - navHeight - 12);
  const projection = map.getProjection();
  const point = projection.containerPointFromCoords(new maps.LatLng(lat, lng));
  map.panTo(
    projection.coordsFromContainerPoint(
      new maps.Point(
        point.x,
        point.y + (element.clientHeight - visibleHeight) / 2,
      ),
    ),
  );
}

export function HistoryMap({
  records,
  source,
  token,
}: {
  records: RecordItem[];
  source: "records" | "completed";
  token: string | null;
}) {
  const points = useMemo(() => locatedRecords(records), [records]);
  const offsets = useMemo(() => {
    const groups = new Map<string, string[]>();
    for (const { id, location } of points) {
      const key = `${location.lat},${location.lng}`;
      const group = groups.get(key) ?? [];
      group.push(id);
      groups.set(key, group);
    }
    const byId = new Map<string, number>();
    for (const ids of groups.values()) {
      ids.forEach((id, index) => byId.set(id, (index - (ids.length - 1) / 2) * 56));
    }
    return byId;
  }, [points]);
  const questIds = [...new Set(points.flatMap(({ questId, questType, difficulty }) =>
    questId && isQuestId(questId) && (!questType || !difficulty) ? [questId] : [],
  ))];
  const questDetails = useQueries({
    queries: questIds.map((questId) => ({
      queryKey: ["verification-quest", questId, token],
      queryFn: ({ signal }: { signal: AbortSignal }) => getVerificationQuest(questId, signal),
      enabled: Boolean(token),
      staleTime: 60_000,
      retry: false,
    })),
    combine: (queries) => queries.map(({ data }) => data),
  });
  const container = useRef<HTMLDivElement>(null);
  const mapRef = useRef<KakaoMap | null>(null);
  const markersRef = useRef(new Map<string, KakaoMarker>());
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
        focusLocation(
          mapRef.current,
          point.location.lat,
          point.location.lng,
          container.current,
        );
      }
    },
    [points],
  );

  const updateMarkerImages = useEffectEvent(() => {
    const maps = window.kakao?.maps;
    if (!maps) return;
    for (const record of points) {
      const marker = markersRef.current.get(record.id);
      if (!marker) continue;
      const isSelected = record.id === selectedId;
      const offset = offsets.get(record.id) ?? 0;
      marker.setZIndex(isSelected ? 10 : offset ? 1 : 0);
      const detail = questDetails.find((quest) => String(quest?.questId) === record.questId);
      const questType = record.questType ?? detail?.questType;
      const difficulty = record.difficulty ?? detail?.difficulty;
      if (questType && (difficulty === 1 || difficulty === 2 || difficulty === 3)) {
        marker.setImage(createQuestMarkerImage(maps, questType, difficulty, isSelected, offset));
      }
    }
  });

  useEffect(() => {
    updateMarkerImages();
  }, [points, offsets, questDetails, selectedId]);

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
          points.forEach((record) => {
            const position = new maps.LatLng(
              record.location.lat,
              record.location.lng,
            );
            bounds.extend(position);
            const marker = new maps.Marker({
              map,
              position,
              title: record.location.placeName || record.title,
              clickable: true,
            });
            const handler = () => select(record.id);
            maps.event.addListener(marker, "click", handler);
            markers.set(record.id, marker);
            listeners.push({ marker, handler });
          });
          updateMarkerImages();
          const fit = () => {
            map.relayout();
            const panelHeight =
              parseFloat(
                getComputedStyle(element).getPropertyValue(
                  "--history-panel-height",
                ),
              ) || 170;
            const navHeight = element.closest(".app-phone")?.querySelector(".app-navigation")?.getBoundingClientRect().height ?? 124;
            const bottom = Math.min(element.clientHeight - 80, panelHeight + navHeight + 12);
            if (points.length > 1) map.setBounds(bounds, 64, 40, bottom, 40);
            else focusLocation(map, first.lat, first.lng, element);
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
      listeners.forEach(({ marker, handler }) =>
        maps?.event.removeListener(marker, "click", handler),
      );
      markers.forEach((marker) => marker.setMap(null));
      markers.clear();
      mapRef.current = null;
      element.replaceChildren();
    };
  }, [points, select]);

  return (
    <section
      aria-label="완료한 퀘스트 위치"
      className="absolute inset-0 text-[#242624]"
    >
      <div className="absolute inset-0 bg-[#eef5f6]">
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
        <span className="mypage-history-count">
          대신 다녀온 곳 {points.length}
        </span>
      </div>
      {status === "error" && (
        <div className="absolute left-4 right-4 top-1/2 z-10 flex flex-wrap gap-2">
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
        <div className="mypage-history-place">
          <button
            className="absolute right-3 top-2 p-1 text-neutral-500"
            aria-label="장소 정보 닫기"
            onClick={() => {
              setSelectedId(null);
            }}
          >
            ×
          </button>
          <h3>
            {selected.location.placeName || selected.title}
          </h3>
          <p>
            {selected.location.address ?? selected.title}
          </p>
          <div>
            <Link to={greetingPath(selected, source)}>
              이곳의 안부 보기
            </Link>
            <a
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
        <p className="mypage-history-missing">
          위치 정보가 없는 기록 {records.length - points.length}건은 지도에
          표시하지 않았어요.
        </p>
      )}
    </section>
  );
}
