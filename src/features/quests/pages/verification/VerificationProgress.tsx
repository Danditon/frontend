// 위치 확인과 이미지 검증을 구분하고, 일반 퀘스트에는 AI 스캔을 표시하지 않습니다.
import { motion, useReducedMotion } from "motion/react";
import { MapPin } from "lucide-react";
import "./verification.css";

type Props = {
  photoUrl: string | null;
  general: boolean;
  phase: "locating" | "verifying" | "checking-result";
};

export default function VerificationProgress({ photoUrl, general, phase }: Props) {
  const reduceMotion = useReducedMotion();
  const locating = phase === "locating";
  const checkingResult = phase === "checking-result";
  return (
    <section className="qv-progress" aria-live="polite">
      {photoUrl && <img className="qv-photo-image" src={photoUrl} alt="인증 장소" />}
      {locating && <div className="qv-location-marker" aria-hidden="true"><MapPin size={40} /></div>}
      {!locating && !checkingResult && !general && (
        <motion.div
          className="qv-legacy-scan-line"
          animate={{ y: reduceMotion ? 0 : [0, -200, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />
      )}
      <div className="qv-status-card">
        <small>{locating ? "현재 위치 확인 중" : checkingResult ? "전송 결과 확인 중" : general ? "안부를 전송하고 있어요" : "AI 검증 중"}</small>
        <h1>
          {locating ? "현재 위치를 확인하고 있어요" : checkingResult ? "전송 결과를 확인하고 있어요" : general ? "잠시만 기다려 주세요" : <>같은 자리인지<br />비교하고 있어요</>}
        </h1>
        {locating && <p>퀘스트에서 200m 이내인지 확인해요.</p>}
      </div>
    </section>
  );
}
