// 공통 선택 상태로 퀘스트 마커의 표시·강조·위치 이동을 관리하는 컴포넌트입니다.
import { useEffect, useRef } from 'react'
import type { NearbyQuest } from '@/features/quests/types/quest'
import type { KakaoMap, KakaoMarker } from '../types/kakaoMaps'
import { createQuestMarkerImage } from '../utils/createQuestMarkerImage'

type QuestMarkersProps = {
  selectedQuestId: number | null // 마커와 목록이 공유하는 선택 ID
  drawerTop: number | null
  onQuestSelect: (questId: number) => void
  map: KakaoMap | null // 기존에 생성한 카카오 지도
  quests: NearbyQuest[] // 지도에 표시할 퀘스트 배열
}

export default function QuestMarkers({
  map,
  quests,
  selectedQuestId,
  drawerTop,
  onQuestSelect,
}: QuestMarkersProps) {
  // questId를 기준으로 마커를 보관합니다.
  // 여기서 Map은 JavaScript의 자료구조이며 카카오 지도와는 별개입니다.
  const markersRef = useRef(new Map<number, KakaoMarker>())
  // 선택과 Drawer는 홈에서 공유하고, 마커는 전달받은 ID로 갱신합니다.
  const selectedQuest = quests.find((quest) => quest.questId === selectedQuestId)
  const selectedLat = selectedQuest?.lat
  const selectedLng = selectedQuest?.lng

  useEffect(() => {
    const maps = window.kakao?.maps

    // 지도와 SDK가 준비된 뒤 마커를 표시합니다.
    if (!map || !maps) return

    // 종류 2개 × 난이도 3개의 이미지를 만들어 같은 조합의 퀘스트가 함께 사용합니다.
    const markerImages = {
      GENERAL: {
        1: createQuestMarkerImage(maps, 'GENERAL', 1),
        2: createQuestMarkerImage(maps, 'GENERAL', 2),
        3: createQuestMarkerImage(maps, 'GENERAL', 3),
      },
      IMAGE: {
        1: createQuestMarkerImage(maps, 'IMAGE', 1),
        2: createQuestMarkerImage(maps, 'IMAGE', 2),
        3: createQuestMarkerImage(maps, 'IMAGE', 3),
      },
    }

    const currentIds = new Set(quests.map((quest) => quest.questId))

    // 새 목록에서 사라진 퀘스트는 지도에서도 제거합니다.
    for (const [questId, marker] of markersRef.current) {
      if (!currentIds.has(questId)) {
        marker.setMap(null)
        markersRef.current.delete(questId)
      }
    }

    for (const quest of quests) {
      // 퀘스트의 위도·경도를 카카오 좌표 객체로 변환합니다.
      const position = new maps.LatLng(quest.lat, quest.lng)
      const isSelected = quest.questId === selectedQuestId
      // Drawer에서 보고 있는 마커만 색상과 테두리를 강조합니다.
      const image = isSelected
        ? createQuestMarkerImage(maps, quest.questType, quest.difficulty, true)
        : markerImages[quest.questType][quest.difficulty]
      const existingMarker = markersRef.current.get(quest.questId)

      if (existingMarker) {
        // 이미 있는 마커는 새로 만들지 않고 위치만 갱신합니다.
        existingMarker.setPosition(position)
        // 종류나 난이도가 변하면 기존 마커의 이미지도 갱신합니다.
        existingMarker.setImage(image)
        existingMarker.setMap(map)
      } else {
        // 처음 받은 퀘스트는 마커를 생성하고 보관합니다.
        const marker = new maps.Marker({
          map,
          position,
          image,
          // 마커 클릭이 지도 바닥 클릭으로 함께 처리되지 않게 합니다.
          clickable: true,
        })
        markersRef.current.set(quest.questId, marker)
      }

      // 선택한 마커를 맨 앞에 놓고, 선택이 풀리면 기본 순서로 복원합니다.
      markersRef.current.get(quest.questId)?.setZIndex(isSelected ? 10 : 0)
    }
  }, [map, quests, selectedQuestId])

  // 선택한 마커를 Drawer 위로 보이는 지도 영역의 중앙에 배치합니다.
  useEffect(() => {
    const maps = window.kakao?.maps
    if (
      !map ||
      !maps ||
      selectedQuestId === null ||
      selectedLat === undefined ||
      selectedLng === undefined ||
      drawerTop === null
    ) {
      return
    }

    const projection = map.getProjection()
    const centerPoint = projection.containerPointFromCoords(map.getCenter())
    const mapHeight = centerPoint.y * 2
    if (mapHeight <= 0) return

    // 현재 지도는 화면 맨 위부터 채워져 있으므로 Drawer top이 보이는 높이입니다.
    const visibleHeight = Math.max(0, Math.min(mapHeight, drawerTop))
    const offsetY = centerPoint.y - visibleHeight / 2
    const questPosition = new maps.LatLng(selectedLat, selectedLng)
    const questPoint = projection.containerPointFromCoords(questPosition)

    // 지도 중심을 아래로 보정하면 마커는 화면에서 위로 올라옵니다.
    const adjustedCenter = projection.coordsFromContainerPoint(
      new maps.Point(questPoint.x, questPoint.y + offsetY),
    )

    // 확대 수준과 GPS 좌표는 그대로 두고, 기존 지도의 중심만 이동합니다.
    map.panTo(adjustedCenter)
  }, [map, selectedQuestId, selectedLat, selectedLng, drawerTop])

  // 앞선 Effect에서 생성한 마커에 클릭 이벤트를 연결합니다.
  useEffect(() => {
    const maps = window.kakao?.maps
    if (!map || !maps) return

    const removeListeners: Array<() => void> = []

    for (const quest of quests) {
      const marker = markersRef.current.get(quest.questId)
      if (!marker) continue

      const handleClick = () => {
        onQuestSelect(quest.questId)
      }

      maps.event.addListener(marker, 'click', handleClick)

      // 등록한 함수와 같은 함수로 이벤트를 해제합니다.
      removeListeners.push(() => {
        maps.event.removeListener(marker, 'click', handleClick)
      })
    }

    return () => {
      // 목록 변경·화면 종료 시 이벤트 중복 등록을 막습니다.
      removeListeners.forEach((removeListener) => removeListener())
    }
  }, [map, quests, onQuestSelect])

  useEffect(() => {
    const markers = markersRef.current

    return () => {
      // 컴포넌트가 사라질 때 모든 퀘스트 마커를 정리합니다.
      for (const marker of markers.values()) {
        marker.setMap(null)
      }

      markers.clear()
    }
  }, [])

  // 마커는 SDK가 그리고, 목록·상세 Drawer는 홈에서 렌더링합니다.
  return null
}
