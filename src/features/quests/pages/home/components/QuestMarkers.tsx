// 퀘스트 배열의 좌표에 마커를 표시하고 생성·갱신·제거를 관리하는 컴포넌트입니다.
import { useEffect, useRef } from 'react'
import type { NearbyQuest } from '@/features/quests/types/quest'
import type { KakaoMap, KakaoMarker } from '../types/kakaoMaps'

type QuestMarkersProps = {
  map: KakaoMap | null // 기존에 생성한 카카오 지도
  quests: NearbyQuest[] // 지도에 표시할 퀘스트 배열
}

export default function QuestMarkers({ map, quests }: QuestMarkersProps) {
  // questId를 기준으로 마커를 보관합니다.
  // 여기서 Map은 JavaScript의 자료구조이며 카카오 지도와는 별개입니다.
  const markersRef = useRef(new Map<number, KakaoMarker>())

  useEffect(() => {
    const maps = window.kakao?.maps

    // 지도와 SDK가 준비된 뒤 마커를 표시합니다.
    if (!map || !maps) return

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
      const existingMarker = markersRef.current.get(quest.questId)

      if (existingMarker) {
        // 이미 있는 마커는 새로 만들지 않고 위치만 갱신합니다.
        existingMarker.setPosition(position)
        existingMarker.setMap(map)
      } else {
        // 처음 받은 퀘스트는 마커를 생성하고 보관합니다.
        const marker = new maps.Marker({ map, position })
        markersRef.current.set(quest.questId, marker)
      }
    }
  }, [map, quests])

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

  // 마커는 카카오 SDK가 그리므로 별도의 HTML은 반환하지 않습니다.
  return null
}
