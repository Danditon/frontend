import { useCallback, useEffect, useRef, useState } from 'react'
import type { CreationDirection, CreationNavigation, CreationStage, CreationTransitionKind } from './questCreationMotion'

type Destination = Omit<CreationNavigation, 'id'>

export function useCreationTransition() {
  const [screen, setScreen] = useState<CreationNavigation>({ stage: 'details', direction: 1, kind: 'slide', id: 0 })
  const [isTransitioning, setIsTransitioning] = useState(false)
  const active = useRef(screen)
  const moving = useRef(false)
  const mounted = useRef(false)
  const pending = useRef<Destination | null>(null)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      moving.current = false
      pending.current = null
    }
  }, [])

  const start = useCallback((destination: Destination) => {
    if (!mounted.current || active.current.stage === destination.stage) return false
    moving.current = true
    active.current = { ...destination, id: active.current.id + 1 }
    setScreen(active.current)
    setIsTransitioning(true)
    return true
  }, [])

  const move = useCallback((stage: CreationStage, direction: CreationDirection = 1) => {
    // React가 다시 그리기 전의 연속 클릭도 동기적으로 차단합니다.
    if (moving.current) return false
    return start({ stage, direction, kind: 'slide' })
  }, [start])

  const show = useCallback((stage: CreationStage, kind: CreationTransitionKind = 'slide') => {
    if (!mounted.current) return
    const destination: Destination = { stage, direction: 1, kind }
    // 응답이 빨라도 진입 애니메이션이 끝난 뒤 결과 화면으로 넘어갑니다.
    if (moving.current) pending.current = destination
    else start(destination)
  }, [start])

  const complete = useCallback((id: number) => {
    if (!mounted.current || !moving.current || active.current.id !== id) return
    const destination = pending.current
    pending.current = null
    if (destination && start(destination)) return
    moving.current = false
    setIsTransitioning(false)
  }, [start])

  return { screen, isTransitioning, move, show, complete }
}
