// 안내 화면에서 돌아가도 사진과 안부는 부모 페이지에 보존됩니다.
import { ChevronLeft, MapPin } from "lucide-react";
import { Button } from "@/shared/components/ui/button";
import { RemotePhoto } from "@/shared/components/RemotePhoto";
import "./verification.css";

type Props = {
  kind: "failed" | "out-of-range" | "location-error" | "request-error";
  photoUrl: string | null;
  photo: string;
  general: boolean;
  message: string;
  distance: number | null;
  needsStatusCheck: boolean;
  onReturn: () => void;
  onRetry: () => void;
};

export default function VerificationNotice({
  kind, photoUrl, photo, general, message, distance, needsStatusCheck, onReturn, onRetry,
}: Props) {
  const range = kind === "out-of-range";
  const failed = kind === "failed";
  const locationError = kind === "location-error";
  const uncertain = kind === "request-error" && needsStatusCheck;
  const mismatchedDistance = range && distance !== null && distance <= 200;
  const title = range ? (mismatchedDistance ? "위치를 다시 확인해주세요" : "조금 더 가까이 와주세요")
    : locationError ? "현재 위치를 확인해주세요"
    : failed ? (general ? "인증을 완료하지 못했어요" : "사진을 한 번 더 확인해주세요")
    : uncertain ? "전송 결과를 확인해주세요" : "인증 요청을 완료하지 못했어요";
  const description = range
    ? (mismatchedDistance ? "현재 거리와 인증 범위 확인 결과가 달라요. 위치를 다시 확인한 뒤 시도해주세요." : "퀘스트 장소에서 200m 이내로 이동한 뒤 다시 인증해주세요.")
    : failed ? (general ? "인증 내용을 확인한 뒤 다시 시도해주세요." : "계절이나 주변 풍경이 달라졌을 수 있어요. 기준 사진과 비슷한 방향으로 다시 골라주세요.")
    : message;
  const action = range ? "인증 화면으로 돌아가기" : locationError ? "위치 다시 확인"
    : failed ? (general ? "인증 내용 확인하기" : "사진 다시 고르기")
    : uncertain ? "전송 결과 확인" : "인증 화면으로 돌아가기";

  return (
    <section className="qv-notice" aria-labelledby="verification-notice-title">
      <button type="button" className="qv-notice-back" onClick={onReturn} aria-label="인증 화면으로 돌아가기">
        <ChevronLeft size={22} aria-hidden="true" />
      </button>
      <div role="alert">
        <span className="qv-notice-badge">{range ? "인증 범위 안내" : locationError ? "위치 확인 필요" : failed ? "인증 미완료" : "전송 안내"}</span>
        <h1 id="verification-notice-title">{title}</h1>
        {(!failed || general) && <p className="qv-notice-description">{description}</p>}
      </div>

      {(range || locationError) && <div className="qv-range-illustration" aria-hidden="true"><MapPin size={52} /><span>200m</span></div>}
      {range && <div className="qv-distance-notice">
        <p>현재 퀘스트까지</p>
        <p className="qv-distance-value">{distance === null ? "거리 확인 필요" : <>약 <strong>{Math.round(distance).toLocaleString("ko-KR")}</strong> m</>}</p>
        <p>인증 가능 거리 200m 이내</p>
      </div>}

      {failed && !general && <>
        <div className="qv-failed-photos">
          <div><span>과거</span><RemotePhoto photoUrl={photoUrl} alt="퀘스트 기준 사진" /></div>
          <div><span>지금</span>{photo && <img src={photo} alt="선택한 사진" />}</div>
        </div>
        <p className="qv-failed-guidance">{description}</p>
      </>}

      <div className="qv-notice-actions">
        <p>{photo ? "사진과 적어둔 안부는 그대로예요." : "적어둔 안부는 그대로 남아 있어요."}</p>
        <Button type="button" className="qv-submit" onClick={onRetry}>{action}</Button>
        {!range && <button type="button" className="qv-notice-return" onClick={onReturn}>인증 화면으로 돌아가기</button>}
      </div>
    </section>
  );
}
