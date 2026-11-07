// 온보딩의 그림을 표시합니다. 추후 같은 자리에 레이어 애니메이션 컴포넌트를 넣을 수 있습니다.
import type { OnboardingVisual as Visual } from '@/features/auth/types/onboarding'

type Props = {
  visual: Visual
}

export default function OnboardingVisual({ visual }: Props) {
  if (visual.kind === 'component') {
    const VisualComponent = visual.Component
    return <VisualComponent />
  }

  return (
    <img
      src={visual.src}
      alt={visual.alt}
      width={1024}
      height={1024}
      draggable={false}
      className="h-full w-full object-contain"
    />
  )
}
