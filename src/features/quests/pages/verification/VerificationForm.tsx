// 사진 비교와 입력 폼을 표시하고, 입력 상태는 부모 페이지에서 관리합니다.
import { ChevronsLeftRight, Mail, Plus } from "lucide-react";
import { Back } from "@/shared/components/WireUI";
import { Button } from "@/shared/components/ui/button";
import type { VerificationQuest } from "@/features/quests/api/verification";
import "./verification.css";

type Props = {
  quest: VerificationQuest;
  step: "capture" | "compare";
  photo: string;
  hasPhoto: boolean;
  note: string;
  mix: number;
  sending: boolean;
  error: string;
  needsStatusCheck?: boolean;
  onNoteChange: (note: string) => void;
  onMixChange: (mix: number) => void;
  onPickPhoto: () => void;
  onSubmit: () => void;
};

export default function VerificationForm({
  quest, step, photo, hasPhoto, note, mix, sending, error, needsStatusCheck = false,
  onNoteChange, onMixChange, onPickPhoto, onSubmit,
}: Props) {
  const general = quest.questType === "GENERAL";
  const showComparison = step === "compare" && Boolean(quest.photoUrl?.trim());
  const basePhoto = showComparison ? quest.photoUrl : photo || quest.photoUrl;
  const disabled = sending || (!needsStatusCheck && (!note.trim() || (!hasPhoto && !general) || quest.isMine || quest.myStatus === "PASSED"));
  const submitLabel = needsStatusCheck ? "전송 결과 확인"
    : quest.isMine ? "내 퀘스트는 인증할 수 없어요"
    : quest.myStatus === "PASSED" ? "이미 인증한 퀘스트예요"
    : sending ? "인증을 요청하고 있어요"
    : !note.trim() && !hasPhoto && !general ? "사진과 안부를 남겨주세요"
    : !note.trim() ? "안부를 남겨주세요"
    : !hasPhoto && !general ? "사진을 골라주세요"
    : "인증하고 안부 보내기";

  return (
    <section className="qv-form" aria-labelledby="verification-title">
      <div className="qv-form-photo">
        <div className="qv-form-header">
          <Back to="/" />
          <span className="qv-place">
            <i aria-hidden="true" />
            <span>{quest.placeName}</span>
          </span>
        </div>

        {basePhoto && (
          <img className="qv-photo-image" src={basePhoto} alt={!showComparison && photo ? "인증을 위해 선택한 사진" : "퀘스트 기준 사진"} />
        )}

        {step === "capture" ? (
          <>
            <div className="qv-photo-frame" data-photo={Boolean(basePhoto)}>
              <i aria-hidden="true" /><i aria-hidden="true" />
              <i aria-hidden="true" /><i aria-hidden="true" />
              <p>
                {general ? <>사진도 남기고 싶다면<br />함께 올려주세요</> : <>이 구도 그대로<br />찍어주세요</>}
              </p>
            </div>
            <button type="button" className="qv-pick-photo" onClick={onPickPhoto}>
              <span><Plus size={24} aria-hidden="true" /></span>
              {general ? "사진 추가/선택" : "갤러리에서 고르기"}
            </button>
          </>
        ) : showComparison ? (
          <>
            <div className="qv-comparison">
              <img
                className="qv-photo-image"
                src={photo}
                alt="인증을 위해 선택한 사진"
                style={{ clipPath: `inset(0 0 0 ${mix}%)` }}
              />
              <div className="qv-comparison-divider" style={{ left: `${mix}%` }} aria-hidden="true">
                <span><ChevronsLeftRight size={22} /></span>
              </div>
              <input
                type="range"
                min="0"
                max="100"
                value={mix}
                onChange={(event) => onMixChange(Number(event.target.value))}
                aria-label="과거와 지금 사진 비교"
              />
            </div>
            <div className="qv-comparison-actions">
              <span>과거</span>
              <button type="button" onClick={onPickPhoto}>다시 고르기</button>
              <span>지금</span>
            </div>
          </>
        ) : (
          <button type="button" className="qv-repick-photo" onClick={onPickPhoto}>
            사진 다시 고르기
          </button>
        )}
      </div>

      {/* 고정 패널이므로 끌어올리기 손잡이를 두지 않습니다. */}
      <div className="qv-form-panel">
        <div className="qv-form-meta">
          <span>{general ? "일반" : "이미지"} 퀘스트 · 난이도 {quest.difficulty}</span>
          <span>{quest.author.nickname} 님의 그리움</span>
        </div>
        <h1 id="verification-title">{quest.questTitle}</h1>
        <p className="qv-description">{quest.questDescription}</p>
        <textarea
          className="qv-note"
          placeholder="떠난 사람에게 한 줄 안부를 남겨주세요"
          aria-label="안부 메시지"
          value={note}
          onChange={(event) => onNoteChange(event.target.value)}
          maxLength={500}
        />

        {error && <p role="alert" className="qv-form-error">{error}</p>}

        <div className="qv-submit-area">
          <Button type="button" className="qv-submit" disabled={disabled} onClick={onSubmit}>
            {!disabled && !needsStatusCheck && <Mail size={20} aria-hidden="true" />}
            {submitLabel}
          </Button>
        </div>
      </div>
    </section>
  );
}
