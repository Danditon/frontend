// 온보딩의 문구와 교체 가능한 그림 영역의 데이터 구조를 정의합니다.
import type { ComponentType } from 'react'

// 장면이 도착한 뒤 재생하고, 화면 이탈과 모션 감소 설정에 대응하도록 상태를 전달합니다.
export type OnboardingSceneProps = {
  active: boolean
  reducedMotion: boolean
}

export type OnboardingVisual =
  | { kind: 'image'; src: string; alt: string }
  | {
      kind: 'component'
      Component: ComponentType<OnboardingSceneProps>
      fallback: { src: string; alt: string }
    }

export type OnboardingStep = {
  id: string
  title: string
  description: string
  visual: OnboardingVisual
}
