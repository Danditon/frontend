// 펼친 상세 Drawer 위의 지도 영역을 사진으로 덮고, 실제 표시 여부를 홈에 알리는 컴포넌트입니다.
import { useEffect, useState } from 'react'
import type { QuestDetail } from '@/features/quests/types/quest'

export type QuestDetailMapPhotoData = Pick<QuestDetail, 'questId' | 'placeName'> & {
  photoUrl: string
}

type Props = {
  photo: QuestDetailMapPhotoData
  top: number | null
  onVisibilityChange: (photo: QuestDetailMapPhotoData | null) => void
}

export default function QuestDetailMapPhoto({ photo, top, onVisibilityChange }: Props) {
  const [isLoaded, setIsLoaded] = useState(false)
  const validUrl = /^https?:\/\//i.test(photo.photoUrl) || /^\/(?!\/)/.test(photo.photoUrl)
  const isVisible = validUrl && isLoaded && top !== null && top > 0

  useEffect(() => {
    // 사진이 준비되기 전에는 지도·상단 버튼을 유지하고, 실패·해제 시 다시 복원합니다.
    onVisibilityChange(isVisible ? photo : null)
    return () => onVisibilityChange(null)
  }, [isVisible, photo, onVisibilityChange])

  if (!validUrl || top === null || top <= 0) return null

  return (
    <div
      aria-hidden={!isVisible}
      className={`absolute inset-x-0 top-0 z-10 overflow-hidden ${isVisible ? '' : 'invisible pointer-events-none'}`}
      // 둥근 Drawer 모서리 뒤까지 사진을 이어 지도 가장자리가 비치지 않게 합니다.
      style={{ height: `calc(${top}px + 2rem)` }}
    >
      <img
        src={photo.photoUrl}
        alt={`${photo.placeName} 등록 사진`}
        draggable={false}
        className="h-full w-full object-cover"
        onLoad={() => setIsLoaded(true)}
        onError={() => setIsLoaded(false)}
      />
    </div>
  )
}
