// 받아온 퀘스트 중 현재 지도 범위 안의 목록을 거리순으로 전달하는 훅입니다.
import { useEffect } from 'react'
import type { NearbyQuest } from '../types/quest'
import type { KakaoMap } from '../pages/home/types/kakaoMaps'

export function useVisibleQuests(
  map: KakaoMap | null,
  quests: NearbyQuest[],
  onChange: (quests: NearbyQuest[]) => void,
) {
  useEffect(() => {
    const maps = window.kakao?.maps
    if (!map || !maps) return

    const updateVisibleQuests = () => {
      const bounds = map.getBounds()
      const visibleQuests = quests
        .filter((quest) => bounds.contain(new maps.LatLng(quest.lat, quest.lng)))
        .sort((a, b) => a.distance - b.distance)

      // filter로 만든 새 배열을 정렬하므로 원본 목록은 변경하지 않습니다.
      onChange(visibleQuests)
    }

    // 지도 생성 직후 계산하고, 이후에는 지도 이동이 끝날 때만 갱신합니다.
    const frame = requestAnimationFrame(updateVisibleQuests)
    maps.event.addListener(map, 'idle', updateVisibleQuests)

    return () => {
      cancelAnimationFrame(frame)
      maps.event.removeListener(map, 'idle', updateVisibleQuests)
    }
  }, [map, quests, onChange])
}
