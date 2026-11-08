import { MapPin } from 'lucide-react'
import { Link } from 'react-router'
import type { RegistrationPreview } from '../../api/questRegistration'

type Props = {
  preview: RegistrationPreview
  photoUrl: string | null
  placeName: string
  registering?: boolean
  registrationUncertain?: boolean
  error: string
  onChange: (preview: RegistrationPreview) => void
  onRegister: () => void
}

export default function CreationPreviewStep({
  preview, photoUrl, placeName, registering = false, registrationUncertain = false, error, onChange, onRegister,
}: Props) {
  return (
    <div className="creation-step creation-preview">
      <h1 className="creation-title">이런 퀘스트가<br />만들어졌어요</h1>
      {(error || registrationUncertain) && (
        <p role="alert" className="creation-error">
          {error || '등록 결과를 확인하지 못했어요.'}
          {registrationUncertain && <> <Link to="/me" className="underline">등록 내역 확인</Link></>}
        </p>
      )}

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

      <div className="creation-preview-fields">
        <label className="creation-field">
          <span>퀘스트 제목</span>
          <input
            value={preview.questTitle}
            disabled={registering}
            readOnly={registrationUncertain}
            onChange={event => onChange({ ...preview, questTitle: event.target.value })}
          />
        </label>
        <label className="creation-field">
          <span>퀘스트 설명</span>
          <textarea
            value={preview.questDescription}
            rows={4}
            disabled={registering}
            readOnly={registrationUncertain}
            onChange={event => onChange({ ...preview, questDescription: event.target.value })}
          />
        </label>
      </div>

      <div className="creation-actions">
        <button
          type="button"
          className="creation-primary"
          disabled={registering || registrationUncertain || !preview.questTitle.trim() || !preview.questDescription.trim()}
          aria-busy={registering}
          onClick={onRegister}
        >
          {registering ? '등록 중…' : registrationUncertain ? '등록 여부를 먼저 확인해 주세요' : '이대로 등록하기'}
        </button>
      </div>
    </div>
  )
}
