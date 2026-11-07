// 위치 확인 전 안내를 표시하고 현재 위치 조회를 요청하는 카드입니다.
import { LocateFixed } from 'lucide-react'

type Props = {
  isLocating: boolean
  onRequestLocation: () => void // 실제 위치 조회는 홈의 기존 훅에서 처리합니다.
}

export default function LocationPromptCard({
  isLocating,
  onRequestLocation,
}: Props) {
  return (
    <button
      type="button"
      disabled={isLocating}
      aria-busy={isLocating}
      aria-label="현재 위치를 확인하고 가까운 퀘스트 보기"
      onClick={onRequestLocation}
      style={{
        fontFamily: '"Pretendard", system-ui, sans-serif',
        background:
          'linear-gradient(135deg, rgba(243,247,248,0.97), rgba(231,239,241,0.97))',
      }}
      className="pointer-events-auto flex h-full w-full flex-col justify-between overflow-hidden rounded-3xl border-2 border-white/90 p-3.5 text-left text-[#293638] shadow-sm backdrop-blur-sm disabled:cursor-wait max-[360px]:p-2.5"
    >
      {/* 좁은 화면에서는 제목·설명·위치 확인 동작을 우선합니다. */}
      <span className="flex items-center gap-1.5 px-1 text-[10px] font-medium leading-3 text-[#718489] max-[360px]:hidden">
        <LocateFixed className="size-3" strokeWidth={1.6} aria-hidden="true" />
        내 주변 퀘스트
      </span>

      <span className="block px-1">
        <span className="block text-[14px] font-bold leading-[1.22] tracking-[-0.025em] max-[360px]:text-[13px]">
          가까운 그리움을
          <br />
          찾아볼까요?
        </span>

        <span className="mt-1.5 block text-[10.5px] font-normal leading-[1.4] text-[#718489] max-[360px]:mt-1 max-[360px]:text-[10px]">
          위치를 확인하면
          <br />
          가까운 퀘스트를 보여드려요.
        </span>
      </span>

      {/* 카드 전체가 버튼이므로 내부 동작 표시는 span으로 만듭니다. */}
      <span
        aria-live="polite"
        className="flex h-7 w-full shrink-0 items-center justify-center gap-1.5 rounded-full bg-[#D2DFE2] text-[12px] font-semibold text-[#344447] max-[360px]:h-6 max-[360px]:text-[11px]"
      >
        <LocateFixed className="size-4" strokeWidth={1.6} aria-hidden="true" />
        {isLocating ? '위치 확인 중…' : '현위치 확인하기'}
      </span>
    </button>
  )
}
