//위치 조회 버튼 컴포넌트입니다. 클릭 시 부모인 QuestMapPage에서 전달한 위치 조회 함수를 실행합니다.
import { LocateFixed, LoaderCircle } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'

type CurrentLocationButtonProps = {
  isLocating: boolean // 홈에서 전달한 위치 조회 중 상태
  onClick: () => void // 버튼을 누르면 홈의 위치 조회 함수를 실행
}

// 위치를 직접 조회하지 않고, 클릭 전달과 버튼 표시만 담당합니다.
// 지도 위 배치 위치는 부모인 QuestMapPage에서 결정합니다.
export default function CurrentLocationButton({
  isLocating,
  onClick,
}: CurrentLocationButtonProps) {
  return (
    <Button
      type="button"
      variant="secondary"
      size="icon"
      className="size-11 rounded-full shadow-md"
      onClick={onClick}
      // 조회 중에는 버튼을 비활성화해 연속 클릭을 막습니다.
      disabled={isLocating}
      aria-label={isLocating ? '현재 위치 확인 중' : '현재 위치 확인'}
    >
      {/* 조회 중에는 회전 아이콘, 평소에는 현위치 아이콘을 표시합니다. */}
      {isLocating ? (
        <LoaderCircle className="size-5 animate-spin" aria-hidden="true" />
      ) : (
        <LocateFixed className="size-5" aria-hidden="true" />
      )}
    </Button>
  )
}
