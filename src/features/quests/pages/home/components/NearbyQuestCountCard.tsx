// 현재 지도 범위의 퀘스트 개수를 표시하고, 누르면 목록을 여는 반투명 카드입니다.
import { ChevronUp } from 'lucide-react'

type NearbyQuestCountCardProps = {
  count: number | null // 지도 범위를 확인하기 전에는 null입니다.
  status: 'location-required' | 'loading' | 'error' | 'ready'
  onClick: () => void
}

export default function NearbyQuestCountCard({
  count,
  status,
  onClick,
}: NearbyQuestCountCardProps) {
  // 실제 목록 조회와 지도 범위 계산이 모두 끝난 뒤에만 목록을 열 수 있습니다.
  const isLoading = status === 'loading' || (status === 'ready' && count === null)
  const canOpenList = status === 'ready' && count !== null
  const message = status === 'location-required'
    ? '현위치를 확인해 주세요'
    : status === 'error'
      ? '목록 조회에 실패했어요'
      : isLoading
        ? '퀘스트 확인 중'
        : count !== null && count > 0
          ? '개가 기다려요'
          : '이 지도엔 아직 없어요'

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={!canOpenList}
      aria-busy={isLoading}
      aria-label={canOpenList ? `현재 지도의 퀘스트 ${count}개 목록 열기` : message}
      className="pointer-events-auto relative flex aspect-[6/7] w-full flex-col justify-end rounded-[24px] border-2 border-white/90 bg-[#DFF1FA]/60 p-4 text-left text-[#242624] shadow-sm backdrop-blur-sm disabled:cursor-default"
    >
      {/* 카드 전체가 버튼이므로 화살표는 별도의 버튼으로 만들지 않습니다. */}
      <span className="absolute right-2 top-2 grid size-8 place-items-center rounded-full bg-[#242624] text-white">
        <ChevronUp className="size-4" aria-hidden="true" />
      </span>

      <span className="text-[clamp(2.5rem,12vw,3.5rem)] leading-none" aria-hidden="true">
        {canOpenList ? count : '—'}
      </span>
      <span className="mt-2 text-xs leading-4" aria-hidden="true">
        {message}
      </span>
    </button>
  )
}
