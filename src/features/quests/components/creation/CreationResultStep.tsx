import { Link } from 'react-router'
import FloatingEnvelope from './FloatingEnvelope'

type Props = {
  outcome: 'previewError' | 'registerError' | 'done'
  error: string
  uncertain: boolean
  active: boolean
  reducedMotion: boolean
  onEdit: () => void
  onRetry: () => void
}

export default function CreationResultStep({ outcome, error, uncertain, active, reducedMotion, onEdit, onRetry }: Props) {
  const failed = outcome !== 'done'
  const registrationFailed = outcome === 'registerError'
  const needsCheck = registrationFailed && uncertain

  return (
    <div className="creation-step creation-result" data-failed={failed}>
      <div className="creation-result-illustration">
        <FloatingEnvelope failed={failed} uncertain={needsCheck} active={active} reducedMotion={reducedMotion} />
      </div>

      <h1 className="creation-title">
        {!failed ? '등록 완료' : needsCheck ? <>등록 결과를<br />확인해 주세요</>
          : registrationFailed ? <>퀘스트를<br />등록하지 못했어요</> : <>퀘스트를<br />만들지 못했어요</>}
      </h1>
      <div className="creation-result-copy">
        <p className="creation-description">
          {!failed ? <>누군가 다녀오면<br />안부가 도착해요.</>
            : needsCheck ? <>작성한 내용을 보존했어요.<br />등록 내역을 먼저 확인해 주세요.</>
              : registrationFailed ? <>생성한 퀘스트와 작성한 내용은 그대로 남아 있어요.<br />잠시 후 다시 등록해 주세요.</>
                : <>AI 퀘스트 생성에 실패했어요.<br />적어둔 내용은 그대로 있으니 다시 시도해 주세요.</>}
        </p>
        {failed && error && <p role="alert" className="creation-result-error">{error}</p>}
      </div>

      <div className="creation-actions">
        {!failed ? <Link to="/" className="creation-primary">지도에서 보기</Link>
          : needsCheck ? (
            <>
              <button type="button" className="creation-secondary" onClick={onEdit}>내용 확인</button>
              <Link to="/me" className="creation-primary">등록 내역 확인</Link>
            </>
          ) : (
            <>
              <button type="button" className="creation-secondary" onClick={onEdit}>{registrationFailed ? '문구 수정' : '수정하기'}</button>
              <button type="button" className="creation-primary" onClick={onRetry}>{registrationFailed ? '다시 등록하기' : '다시 만들기'}</button>
            </>
          )}
      </div>
    </div>
  )
}
