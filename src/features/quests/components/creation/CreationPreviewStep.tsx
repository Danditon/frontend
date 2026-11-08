import { MapPin } from 'lucide-react'
import type { RegistrationPreview } from '../../api/questRegistration'

type Props = {
  preview: RegistrationPreview
  photoUrl: string | null
  placeName: string
  registrationFailed: boolean
  error: string
  onChange: (preview: RegistrationPreview) => void
  onEdit: () => void
  onRegister: () => void
}

export default function CreationPreviewStep({
  preview, photoUrl, placeName, registrationFailed, error, onChange, onEdit, onRegister,
}: Props) {
  return (
    <div className="creation-step creation-preview">
      <h1 className="creation-title">
        {registrationFailed ? <>아직 등록되지<br />않았어요</> : <>이런 퀘스트가<br />만들어졌어요</>}
      </h1>
      {error && <p role="alert" className="creation-error">{error}</p>}

      <div className="creation-preview-summary">
        <div className="creation-preview-place" data-has-photo={Boolean(photoUrl)}>
          {photoUrl ? <img src={photoUrl} alt="퀘스트 사진" className="creation-photo-image" />
            : <MapPin size={28} strokeWidth={1.5} aria-hidden="true" className="creation-preview-pin" />}
          <span>{placeName}</span>
        </div>
        <div className="creation-difficulty">
          <span>난이도</span>
          <strong>{preview.difficulty}</strong>
          <p>{preview.difficultyReason}</p>
        </div>
      </div>

      {registrationFailed ? (
        <div className="creation-preview-fields">
          <strong>{preview.questTitle}</strong>
          <p className="whitespace-pre-line">{preview.questDescription}</p>
        </div>
      ) : (
        <div className="creation-preview-fields">
          <label className="creation-field">
            <span>퀘스트 제목</span>
            <input
              value={preview.questTitle}
              onChange={event => onChange({ ...preview, questTitle: event.target.value })}
            />
          </label>
          <label className="creation-field">
            <span>퀘스트 설명</span>
            <textarea
              value={preview.questDescription}
              rows={4}
              onChange={event => onChange({ ...preview, questDescription: event.target.value })}
            />
          </label>
        </div>
      )}

      <div className="creation-actions">
        {registrationFailed && <button type="button" className="creation-secondary" onClick={onEdit}>문구 수정</button>}
        <button
          type="button"
          className="creation-primary"
          disabled={!preview.questTitle.trim() || !preview.questDescription.trim()}
          onClick={onRegister}
        >
          {registrationFailed ? '다시 등록하기' : '이대로 등록하기'}
        </button>
      </div>
    </div>
  )
}
