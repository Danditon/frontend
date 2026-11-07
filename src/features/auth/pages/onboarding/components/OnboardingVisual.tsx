// 레이어 장면을 표시하고, 모션 감소 설정에서는 기존의 완성된 정적 그림을 사용합니다.
import type { OnboardingSceneProps, OnboardingVisual as Visual } from '@/features/auth/types/onboarding'

type Props = OnboardingSceneProps & {
  visual: Visual
}

export default function OnboardingVisual({ visual, active, reducedMotion }: Props) {
  if (visual.kind === 'component' && !reducedMotion) {
    const VisualComponent = visual.Component
    return <VisualComponent active={active} reducedMotion={reducedMotion} />
  }

  const image = visual.kind === 'image' ? visual : visual.fallback

  return (
    <img
      src={image.src}
      alt={image.alt}
      width={1024}
      height={1024}
      draggable={false}
      className="h-full w-full object-contain"
    />
  )
}
