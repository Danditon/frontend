// 퀘스트 마커를 관리하고, 클릭한 퀘스트의 상세 Drawer를 여는 컴포넌트입니다.
import { useCallback, useEffect, useRef, useState } from 'react'
import type { NearbyQuest } from '@/features/quests/types/quest'
import type { KakaoMap, KakaoMarker } from '../types/kakaoMaps'
import { createQuestMarkerImage } from '../utils/createQuestMarkerImage'
import QuestDetailDrawer from './QuestDetailDrawer'

type QuestMarkersProps = {
  map: KakaoMap | null // 기존에 생성한 카카오 지도
  quests: NearbyQuest[] // 지도에 표시할 퀘스트 배열
}

export default function QuestMarkers({ map, quests }: QuestMarkersProps) {
  // questId를 기준으로 마커를 보관합니다.
  // 여기서 Map은 JavaScript의 자료구조이며 카카오 지도와는 별개입니다.
  const markersRef = useRef(new Map<number, KakaoMarker>())
  // 선택한 ID가 있으면 Drawer를 열고, null이면 닫습니다.
  const [selectedQuestId, setSelectedQuestId] = useState<number | null>(null)

  // 마커 클릭을 이 컴포넌트에서 처리해 부모로 함수를 전달하지 않습니다.
  const handleMarkerClick = useCallback((questId: number) => {
    setSelectedQuestId(questId)

    // TODO: 상세 API 연결 위치
    // 클릭한 questId로 GET /quests/{questId}를 요청합니다.
    // Axios 요청과 로딩·오류 처리는 다음 단계에서 연결합니다.
  }, [])

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

  // 앞선 Effect에서 생성한 마커에 클릭 이벤트를 연결합니다.
  useEffect(() => {
    const maps = window.kakao?.maps
    if (!map || !maps) return

    const removeListeners: Array<() => void> = []

    for (const quest of quests) {
      const marker = markersRef.current.get(quest.questId)
      if (!marker) continue

      const handleClick = () => {
        handleMarkerClick(quest.questId)
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
  }, [map, quests, handleMarkerClick])

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

  // 마커는 SDK가 그리고, 상세 화면은 선택한 ID로 Drawer에 연결합니다.
  return (
    <QuestDetailDrawer
      questId={selectedQuestId}
      onClose={() => setSelectedQuestId(null)}
    />
  )
}
