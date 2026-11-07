// 온보딩의 문구와 교체 가능한 그림 영역의 데이터 구조를 정의합니다.
import type { ComponentType } from 'react'

export type OnboardingVisual =
  | { kind: 'image'; src: string; alt: string }
  | { kind: 'component'; Component: ComponentType }

export type OnboardingStep = {
  id: string
  title: string
  description: string
  visual: OnboardingVisual
}
