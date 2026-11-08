import type { Transition, Variants } from 'motion/react'

export type CreationStage = 'details' | 'photo' | 'generating' | 'preview' | 'previewError' | 'registering' | 'registerError' | 'done'
export type CreationDirection = 1 | -1
export type CreationTransitionKind = 'slide' | 'fade'

export type CreationNavigation = {
  stage: CreationStage
  direction: CreationDirection
  kind: CreationTransitionKind
  id: number
}

type MotionData = Pick<CreationNavigation, 'direction' | 'kind'> & { reducedMotion: boolean }

export function creationTransition(reducedMotion: boolean): Transition {
  return { duration: reducedMotion ? 0.12 : 0.36, ease: [0.22, 1, 0.36, 1] }
}

export const creationVariants: Variants = {
  enter: ({ direction, kind, reducedMotion }: MotionData) => ({
    x: kind === 'slide' && !reducedMotion ? `${direction * 100}%` : 0,
    opacity: kind === 'fade' || reducedMotion ? 0 : 1,
  }),
  center: { x: 0, opacity: 1 },
  exit: ({ direction, kind, reducedMotion }: MotionData) => ({
    x: kind === 'slide' && !reducedMotion ? `${direction * -100}%` : 0,
    opacity: kind === 'fade' || reducedMotion ? 0 : 1,
  }),
}
