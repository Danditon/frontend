import { Check } from 'lucide-react'
import { motion } from 'motion/react'
import type { RegistrationPlace } from '../../api/questRegistration'
import { QuestPlacePicker } from '../QuestPlacePicker'

type Props = {
  questType: 'GENERAL' | 'IMAGE'
  place: RegistrationPlace | null
  reason: string
  reducedMotion: boolean
  onQuestTypeChange: (type: Props['questType']) => void
  onPlaceChange: (place: RegistrationPlace | null) => void
  onReasonChange: (reason: string) => void
  onNext: () => void
}

export default function CreationDetailsStep({
  questType, place, reason, reducedMotion, onQuestTypeChange, onPlaceChange, onReasonChange, onNext,
}: Props) {
  return (
    <div className="creation-step creation-details">
      <h1 className="creation-title">어떤 그리움을<br />남길까요?</h1>

      <fieldset className="creation-type-options">
        <legend className="sr-only">퀘스트 유형</legend>
        {(['GENERAL', 'IMAGE'] as const).map(type => (
          <label key={type} className="creation-type-option" data-selected={questType === type}>
            <input
              className="peer sr-only"
              type="radio"
              name="quest-type"
              value={type}
              checked={questType === type}
              onChange={() => onQuestTypeChange(type)}
            />
            <span className="creation-type-check peer-focus-visible:ring-2" aria-hidden="true">
              <motion.span
                initial={false}
                animate={{ opacity: questType === type ? 1 : 0, scale: questType === type ? 1 : 0.75 }}
                transition={{ duration: reducedMotion ? 0 : 0.18, ease: 'easeOut' }}
              >
                <Check size={16} />
              </motion.span>
            </span>
            <strong>{type === 'GENERAL' ? '일반' : '이미지'}</strong>
            <span className="creation-type-badges">
              {type === 'GENERAL' ? <><small>글 필수</small><small>사진 선택</small></> : <small>글 · 사진 필수</small>}
            </span>
          </label>
        ))}
      </fieldset>

      <QuestPlacePicker value={place} onChange={onPlaceChange} />

      <div className="creation-field">
        <label htmlFor="longing-reason">그리운 이유</label>
        <div className="creation-reason-input">
          <textarea
            id="longing-reason"
            value={reason}
            maxLength={500}
            rows={4}
            placeholder="이 장소가 그리운 이유를 적어주세요."
            className="creation-reason"
            aria-describedby="longing-reason-count"
            onChange={event => onReasonChange(event.target.value)}
          />
          <p id="longing-reason-count" className="creation-reason-count">{reason.length}/500</p>
        </div>
      </div>

      <div className="creation-actions">
        <button type="button" className="creation-primary" disabled={!place || !reason.trim()} onClick={onNext}>
          다음
        </button>
      </div>
    </div>
  )
}
