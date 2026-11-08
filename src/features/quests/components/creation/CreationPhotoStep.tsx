import { useRef } from 'react'
import { Plus, X } from 'lucide-react'

type Props = {
  questType: 'GENERAL' | 'IMAGE'
  photoUrl: string | null
  readingPhoto: boolean
  error: string
  onChoose: (file: File) => void
  onRemove: () => void
  onGenerate: () => void
}

export default function CreationPhotoStep({
  questType, photoUrl, readingPhoto, error, onChoose, onRemove, onGenerate,
}: Props) {
  const input = useRef<HTMLInputElement>(null)
  const general = questType === 'GENERAL'

  return (
    <div className="creation-step creation-photo" aria-busy={readingPhoto}>
      <div className="creation-photo-intro">
        <span className="creation-type-tag">{general ? '일반' : '이미지'} 퀘스트</span>
        <h1 className="creation-title">
          {general ? <>사진이 있다면<br />함께 올려주세요</> : <>그때 찍은 사진을<br />올려주세요</>}
        </h1>
        <p className="creation-description">
          {general ? <>없어도 괜찮아요.<br />글만으로도 퀘스트를 만들 수 있어요.</>
            : <>다녀오는 사람에게<br />촬영 방향을 알려주는 힌트가 돼요.</>}
        </p>
      </div>

      <input
        ref={input}
        type="file"
        accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
        aria-label="그리움 사진 선택"
        disabled={readingPhoto}
        hidden
        onChange={event => {
          const file = event.target.files?.[0]
          event.currentTarget.value = ''
          if (file) onChoose(file)
        }}
      />

      {photoUrl ? (
        <div className="creation-photo-upload">
          <img src={photoUrl} alt="선택한 그리움 사진" className="creation-photo-image" />
          <button
            type="button"
            aria-label="선택한 사진 지우기"
            className="creation-photo-remove"
            disabled={readingPhoto}
            onClick={onRemove}
          >
            <X size={18} aria-hidden="true" />
          </button>
          <button type="button" className="creation-photo-replace" disabled={readingPhoto} onClick={() => input.current?.click()}>
            다시 고르기
          </button>
        </div>
      ) : (
        <button
          type="button"
          className="creation-photo-upload creation-photo-empty"
          disabled={readingPhoto}
          onClick={() => input.current?.click()}
        >
          <span className="creation-photo-plus"><Plus size={26} strokeWidth={1.6} aria-hidden="true" /></span>
          <span>{general ? '사진 추가하기' : '갤러리에서 고르기'}</span>
        </button>
      )}

      <div className="creation-photo-feedback">
        {readingPhoto ? (
          <p role="status" className="creation-description">사진을 확인하는 중…</p>
        ) : error ? (
          <p role="alert" className="creation-error">{error}</p>
        ) : (
          <p className="creation-photo-hint">JPG, PNG, WEBP · 최대 10MB</p>
        )}
      </div>

      <div className="creation-actions">
        <button type="button" className="creation-primary" disabled={readingPhoto || (!general && !photoUrl)} onClick={onGenerate}>
          {readingPhoto ? '사진 확인 중…' : !general && !photoUrl ? '사진을 골라주세요' : 'AI로 퀘스트 만들기'}
        </button>
      </div>
    </div>
  )
}
