import { useEffect, useState } from 'react'
import { animate, motion, useIsPresent, useMotionValue, useTransform } from 'motion/react'
import { MailOpen } from 'lucide-react'

type Props = {
  photoUrl: string | null
  ready: boolean
  active: boolean
  reducedMotion: boolean
  onComplete: () => void
}

export default function CreationGeneratingStep({ photoUrl, ready, active, reducedMotion, onComplete }: Props) {
  const present = useIsPresent()
  const progress = useMotionValue(0)
  const offset = useTransform(progress, value => 1 - value)
  const [slow, setSlow] = useState(false)
  const moving = present && active && !ready && !reducedMotion

  useEffect(() => {
    if (!present || !active) return
    let live = true
    const controls = animate(progress, ready ? 1 : 0.88, {
      // 서버 진행률을 가정하지 않고 응답 대기는 88%에서 멈춥니다.
      duration: reducedMotion ? 0.12 : ready ? 0.45 : 10,
      ease: ready ? 'easeOut' : 'linear',
      onComplete: () => { if (live && ready) onComplete() },
    })
    return () => {
      live = false
      controls.stop()
    }
  }, [present, active, ready, reducedMotion, progress, onComplete])

  useEffect(() => {
    if (!present || !active || ready) return
    const timer = setTimeout(() => setSlow(true), 15_000)
    return () => clearTimeout(timer)
  }, [present, active, ready])

  return (
    <div className="creation-generating">
      <h1 className="creation-title">그리움을 퀘스트로<br />바꾸는 중…</h1>

      <div className="creation-generation-figure">
        <div className="creation-generation-photo">
          <motion.div
            className="creation-generation-memory"
            initial={false}
            animate={{
              y: moving ? [0, -4, 0, 4, 0] : 0,
              rotateY: moving ? [0, 6, 0, -6, 0] : 0,
              rotateZ: moving ? [0, -1, 0, 1, 0] : 0,
            }}
            transition={moving
              ? { duration: 6, repeat: Infinity, ease: 'easeInOut' }
              : { duration: reducedMotion ? 0 : 0.3, ease: 'easeOut' }}
          >
            {photoUrl ? <img src={photoUrl} alt="선택한 그리움 사진" className="creation-photo-image" />
              : <MailOpen size={72} strokeWidth={1} aria-hidden="true" />}
          </motion.div>
        </div>
        <svg viewBox="0 0 240 240" className="creation-generation-ring" aria-hidden="true">
          <circle cx="120" cy="120" r="114" fill="none" stroke="white" strokeWidth="6" />
          <motion.circle
            cx="120" cy="120" r="114" fill="none" stroke="#F4E5A2" strokeWidth="6"
            strokeLinecap="round" pathLength={1} strokeDasharray="1 1"
            style={{ strokeDashoffset: offset }}
          />
        </svg>
      </div>

      <p role="status" className="creation-generation-message">
        {ready ? '퀘스트 내용을 준비했어요.'
          : slow ? <>처리가 조금 더 걸리고 있어요.<br />잠시만 기다려 주세요.</>
            : <>그리움을 담은 퀘스트를<br />준비하고 있어요.</>}
      </p>
    </div>
  )
}
