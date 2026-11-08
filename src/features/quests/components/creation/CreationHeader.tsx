import { ChevronLeft } from 'lucide-react'
import { Link } from 'react-router'
import { motion } from 'motion/react'
import { creationTransition } from './questCreationMotion'

type Props = {
  step: 1 | 2 | 3
  backToHome: boolean
  busy: boolean
  isTransitioning: boolean
  reducedMotion: boolean
  hidden: boolean
  hideSteps?: boolean
  onBack: () => void
}

export default function CreationHeader({ step, backToHome, busy, isTransitioning, reducedMotion, hidden, hideSteps = false, onBack }: Props) {
  return (
    <motion.header
      className="creation-header"
      initial={false}
      animate={{ opacity: hidden ? 0 : 1 }}
      transition={creationTransition(reducedMotion)}
      aria-hidden={hidden}
      inert={hidden || isTransitioning}
    >
      {backToHome ? (
        <Link to="/" aria-label="홈으로 돌아가기" className="creation-back">
          <ChevronLeft size={20} aria-hidden="true" />
        </Link>
      ) : !busy && (
        <button type="button" aria-label="이전 단계" className="creation-back" disabled={isTransitioning} onClick={onBack}>
          <ChevronLeft size={20} aria-hidden="true" />
        </button>
      )}

      <motion.div
        className="creation-steps"
        initial={false}
        animate={{ opacity: hideSteps ? 0 : 1 }}
        transition={creationTransition(reducedMotion)}
        aria-hidden={hideSteps}
        role="progressbar"
        aria-label="그리움 등록 단계"
        aria-valuemin={1}
        aria-valuemax={3}
        aria-valuenow={step}
      >
        {[1, 2, 3].map(index => (
          <span key={index} aria-hidden="true">
            <motion.span
              initial={false}
              animate={{ scaleX: index <= step ? 1 : 0 }}
              transition={creationTransition(reducedMotion)}
            />
          </span>
        ))}
      </motion.div>
    </motion.header>
  )
}
