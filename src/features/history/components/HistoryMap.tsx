import { createQuestMarkerImage } from "@/features/quests/pages/home/utils/createQuestMarkerImage";
import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { useQueries } from "@tanstack/react-query";
import { getVerificationQuest, isQuestId } from "@/features/quests/api/verification";
import type { RecordItem } from "@/features/memories/types";
import type {
  KakaoMap,
  KakaoMarker,
} from "@/features/quests/pages/home/types/kakaoMaps";
import { locatedRecords } from "../lib/locations";

// 카카오 일반 지도의 100m 축척입니다.
const SELECTED_RECORD_LEVEL = 4;

function coveredHeight(element: HTMLElement) {
  const panel = element.closest(".mypage-history-map")?.querySelector(".mypage-history-panel, .mypage-peer-drawer");
  // 버튼 추가나 작은 화면의 패널 스크롤에도 마커가 실제 가려지지 않는 위치로 이동합니다.
  if (panel) return Math.max(0, element.getBoundingClientRect().bottom - panel.getBoundingClientRect().top + 12);
  return 306;
}

function focusLocation(
  map: KakaoMap,
  lat: number,
  lng: number,
  element: HTMLElement | null,
) {
  const maps = window.kakao?.maps;
  if (!maps || !element) return;
  const visibleHeight = Math.max(64, element.clientHeight - coveredHeight(element));
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
  token,
  selectedRecordId,
  focusRequest,
  onSelectRecord,
  overlayKey = "records",
  overlayReady = true,
}: {
  records: RecordItem[];
  token: string | null;
  selectedRecordId: string | null;
  focusRequest: number;
  onSelectRecord: (recordId: string) => void;
  overlayKey?: "records" | "peers";
  overlayReady?: boolean;
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
  const appliedFocus = useRef<{ map: KakaoMap; id: string; request: number; points: typeof points } | null>(null);
  const [status, setStatus] = useState<"loading" | "ready" | "error">(
    "loading",
  );
  const selectRecord = useEffectEvent(onSelectRecord);
  const focusSelected = useEffectEvent((map: KakaoMap) => {
    const point = points.find((record) => record.id === selectedRecordId);
    if (!point) return false;
    focusLocation(map, point.location.lat, point.location.lng, container.current);
    return true;
  });
  const fitMap = useEffectEvent(() => {
    const map = mapRef.current;
    const element = container.current;
    const maps = window.kakao?.maps;
    if (!overlayReady || !map || !element || !maps || !points.length) return;
    map.relayout();
    if (focusSelected(map)) return;
    const bounds = new maps.LatLngBounds();
    points.forEach(({ location }) => bounds.extend(new maps.LatLng(location.lat, location.lng)));
    const bottom = Math.min(element.clientHeight - 80, coveredHeight(element));
    if (points.length > 1) map.setBounds(bounds, 64, 40, bottom, 40);
    else focusLocation(map, points[0].location.lat, points[0].location.lng, element);
  });

  useEffect(() => {
    if (status !== "ready" || !overlayReady) return;
    const overlay = container.current?.closest(".mypage-history-map")?.querySelector(".mypage-history-panel, .mypage-peer-drawer");
    if (!overlay) return;
    // Drawer 전환·드래그 때도 지도를 새로 만들지 않고 보이는 영역만 보정합니다.
    const observer = new ResizeObserver(() => fitMap());
    observer.observe(overlay);
    fitMap();
    return () => observer.disconnect();
  }, [overlayKey, overlayReady, status]);

  useEffect(() => {
    const map = mapRef.current;
    if (status !== "ready" || !map || !overlayReady || !selectedRecordId) return;
    if (!points.some((record) => record.id === selectedRecordId)) return;

    // 확대 수준을 먼저 바꾼 뒤 화면 좌표를 계산해야 중앙 보정이 정확합니다.
    // 패널 크기 변경 시에는 이 효과를 실행하지 않아 사용자의 확대 수준을 유지합니다.
    const previous = appliedFocus.current;
    if (previous?.map !== map || previous.id !== selectedRecordId || previous.request !== focusRequest || previous.points !== points) {
      map.setLevel(SELECTED_RECORD_LEVEL);
      appliedFocus.current = { map, id: selectedRecordId, request: focusRequest, points };
    }
    focusSelected(map);
  }, [selectedRecordId, focusRequest, points, status, overlayReady]);

  const updateMarkerImages = useEffectEvent(() => {
    const maps = window.kakao?.maps;
    if (!maps) return;
    for (const record of points) {
      const marker = markersRef.current.get(record.id);
      if (!marker) continue;
      const isSelected = record.id === selectedRecordId;
      // 선택한 마커는 겹침 방지용 오프셋 없이 실제 좌표의 중앙에 표시합니다.
      const offset = isSelected ? 0 : offsets.get(record.id) ?? 0;
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
  }, [points, offsets, questDetails, selectedRecordId]);

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
        if (cancelled || expired) return;
        try {
          const first = points[0].location;
          const map = new maps.Map(element, {
            center: new maps.LatLng(first.lat, first.lng),
            level: 3,
          });
          mapRef.current = map;
          points.forEach((record) => {
            const position = new maps.LatLng(
              record.location.lat,
              record.location.lng,
            );
            const marker = new maps.Marker({
              map,
              position,
              title: record.location.placeName || record.title,
              clickable: true,
            });
            const handler = () => selectRecord(record.id);
            maps.event.addListener(marker, "click", handler);
            markers.set(record.id, marker);
            listeners.push({ marker, handler });
          });
          updateMarkerImages();
          fitMap();
          observer = new ResizeObserver(() => fitMap());
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
  }, [points]);

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
      {records.length > points.length && (
        <p className="mypage-history-missing">
          위치 정보가 없는 기록 {records.length - points.length}건은 지도에
          표시하지 않았어요.
        </p>
      )}
    </section>
  );
}
