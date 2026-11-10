// 위치 확인과 이미지 검증을 구분하고, 일반 퀘스트에는 AI 스캔을 표시하지 않습니다.
import { Check, MapPin } from "lucide-react";
import PhotoScanner from "./PhotoScanner";
import "./verification.css";

type Props = {
  photoUrl: string | null;
  general: boolean;
  phase: "locating" | "verifying" | "checking-result" | "verified";
};

export default function VerificationProgress({ photoUrl, general, phase }: Props) {
  const locating = phase === "locating";
  const checkingResult = phase === "checking-result";
  const verified = phase === "verified";
  return (
    <section className="qv-progress" aria-live="polite">
      {photoUrl && <img className="qv-progress-backdrop" src={photoUrl} alt="" aria-hidden="true" />}
      <div className="qv-progress-visual">
        {photoUrl && (
          <div className="qv-scan-photo">
            <img className="qv-scan-image" src={photoUrl} alt="인증 장소" />
            {phase === "verifying" && !general && <PhotoScanner />}
          </div>
        )}
        {locating && <div className="qv-location-marker" aria-hidden="true"><MapPin size={40} /></div>}
        {verified && <div className="qv-verified-badge" aria-hidden="true"><Check size={20} /> 인증 완료</div>}
      </div>
      <div className="qv-status-card">
        <small>{verified ? "인증 완료" : locating ? "현재 위치 확인 중" : checkingResult ? "전송 결과 확인 중" : general ? "안부를 전송하고 있어요" : "AI 검증 중"}</small>
        <h1>
          {verified ? (general ? "인증을 완료했어요" : "사진 인증을 완료했어요") : locating ? "현재 위치를 확인하고 있어요" : checkingResult ? "전송 결과를 확인하고 있어요" : general ? "잠시만 기다려 주세요" : <>같은 자리인지<br />비교하고 있어요</>}
        </h1>
        {locating && <p>퀘스트에서 200m 이내인지 확인해요.</p>}
      </div>
    </section>
  );
}
