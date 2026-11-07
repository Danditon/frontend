// 현재 온보딩이 몇 번째 화면인지 하단의 막대와 점으로 표시하는 컴포넌트입니다.
type Props = {
  currentIndex: number
  total: number
}

export default function OnboardingProgress({ currentIndex, total }: Props) {
  return (
    <div role="status" aria-live="polite">
      <span className="sr-only">{total}단계 중 {currentIndex + 1}단계</span>
      <ol aria-hidden="true" className="flex items-center justify-center gap-2">
        {Array.from({ length: total }, (_, index) => (
          <li
            key={index}
            data-active={index === currentIndex}
            className="h-1.5 w-5 rounded-full bg-[#EAE7DF] data-[active=true]:w-8 data-[active=true]:bg-[#557582]"
          />
        ))}
      </ol>
    </div>
  )
}
