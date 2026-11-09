import { motion, useReducedMotion } from 'motion/react'
import { useId, useRef, useState, type ReactNode } from 'react'

/** A non-modal sheet: only the handle captures gestures, leaving content scrollable. */
export function SwipeSheet({ children, label, collapsed = 0.64, className = '', expanded: controlledExpanded, onExpandedChange }: {
  children: ReactNode; label: string; collapsed?: number; className?: string
  expanded?: boolean; onExpandedChange?: (expanded: boolean) => void
}) {
  const expandedHeight = 0.94
  const [localExpanded, setLocalExpanded] = useState(false)
  const expanded = controlledExpanded ?? localExpanded
  function setExpanded(value: boolean) {
    if (controlledExpanded === undefined) setLocalExpanded(value)
    onExpandedChange?.(value)
  }
  const [dragHeight, setDragHeight] = useState<number | null>(null)
  const sheet = useRef<HTMLElement>(null)
  const gesture = useRef<{ id: number; y: number; height: number; parentHeight: number; moved: boolean } | null>(null)
  const ignoreClick = useRef(false)
  const contentId = useId()
  const reducedMotion = useReducedMotion()
  const height = dragHeight ?? (expanded ? expandedHeight : collapsed)
  return <motion.section ref={sheet} className={`swipe-sheet ${className}`}
    aria-label={label} initial={false} animate={{ height: `${height * 100}%` }}
    transition={dragHeight !== null || reducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 360, damping: 38 }}>
    <button type="button" className="swipe-sheet-handle" aria-label={`${label} ${expanded ? '접기' : '펼치기'}`}
      aria-expanded={expanded} aria-controls={contentId}
      onPointerDown={event => {
        if (!event.isPrimary || event.button !== 0 || !sheet.current?.parentElement) return
        const parentHeight = sheet.current.parentElement.clientHeight
        if (!parentHeight) return
        const actualHeight = sheet.current.getBoundingClientRect().height / parentHeight
        gesture.current = { id: event.pointerId, y: event.clientY, height: actualHeight, parentHeight, moved: false }
        ignoreClick.current = false
        event.currentTarget.setPointerCapture(event.pointerId)
        setDragHeight(actualHeight)
      }}
      onPointerMove={event => {
        const start = gesture.current
        if (!start || start.id !== event.pointerId) return
        const distance = start.y - event.clientY
        if (Math.abs(distance) > 6) start.moved = true
        setDragHeight(Math.max(collapsed, Math.min(expandedHeight, start.height + distance / start.parentHeight)))
      }}
      onPointerUp={event => {
        const start = gesture.current
        if (!start || start.id !== event.pointerId) return
        const distance = start.y - event.clientY
        if (start.moved) {
          const projected = start.height + distance / start.parentHeight
          setExpanded(Math.abs(distance) > 35 ? distance > 0 : projected > (collapsed + expandedHeight) / 2)
          ignoreClick.current = true
        }
        gesture.current = null
        setDragHeight(null)
        event.currentTarget.releasePointerCapture(event.pointerId)
      }}
      onPointerCancel={() => { gesture.current = null; setDragHeight(null); ignoreClick.current = true }}
      onLostPointerCapture={() => { if (gesture.current) { gesture.current = null; setDragHeight(null) } }}
      onClick={() => {
        if (ignoreClick.current) { ignoreClick.current = false; return }
        setExpanded(!expanded)
      }}
      onKeyDown={event => {
        if (event.key === 'ArrowUp' || event.key === 'ArrowDown') {
          event.preventDefault()
          setExpanded(event.key === 'ArrowUp')
        }
      }}><span aria-hidden="true" /></button>
    <div id={contentId} className="swipe-sheet-body">{children}</div>
  </motion.section>
}
