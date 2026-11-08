import { useEffect, useRef, type ReactNode } from 'react'
import { motion, useIsPresent } from 'motion/react'
import { creationTransition, creationVariants, type CreationNavigation } from './questCreationMotion'

type Props = {
  screen: CreationNavigation
  isTransitioning: boolean
  reducedMotion: boolean
  onComplete: (id: number) => void
  children: ReactNode
}

export default function CreationScreen({ screen, isTransitioning, reducedMotion, onComplete, children }: Props) {
  const present = useIsPresent()
  const element = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!present || isTransitioning) return
    const heading = element.current?.querySelector('h1')
    heading?.setAttribute('tabindex', '-1')
    heading?.focus({ preventScroll: true })
  }, [present, isTransitioning])

  return (
    <motion.div
      ref={element}
      className="creation-screen"
      custom={{ direction: screen.direction, kind: screen.kind, reducedMotion }}
      variants={creationVariants}
      initial="enter"
      animate="center"
      exit="exit"
      transition={creationTransition(reducedMotion)}
      aria-hidden={!present}
      inert={!present || isTransitioning}
      onAnimationComplete={definition => {
        // 나가는 화면의 늦은 완료 이벤트가 다음 화면의 잠금을 풀지 않습니다.
        if (present && definition === 'center') onComplete(screen.id)
      }}
    >
      {children}
    </motion.div>
  )
}
