import { ChevronLeft } from 'lucide-react'
import { Link } from 'react-router'

type Props = {
  step: 1 | 2 | 3
  backToHome: boolean
  busy: boolean
  onBack: () => void
}

export default function CreationHeader({ step, backToHome, busy, onBack }: Props) {
  return (
    <header className="creation-header">
      {backToHome ? (
        <Link to="/" aria-label="홈으로 돌아가기" className="creation-back">
          <ChevronLeft size={20} aria-hidden="true" />
        </Link>
      ) : !busy && (
        <button type="button" aria-label="이전 단계" className="creation-back" onClick={onBack}>
          <ChevronLeft size={20} aria-hidden="true" />
        </button>
      )}

      <div
        className="creation-steps"
        role="progressbar"
        aria-label="그리움 등록 단계"
        aria-valuemin={1}
        aria-valuemax={3}
        aria-valuenow={step}
      >
        {[1, 2, 3].map(index => (
          <span key={index} data-active={index <= step} aria-hidden="true" />
        ))}
      </div>
    </header>
  )
}
