// 전송은 인증 요청에서 완료됐으며, 이 화면은 도착 연출만 표시합니다.
import { Button } from "@/shared/components/ui/button";
import DeliveryAnimation from "./DeliveryAnimation";
import "./verification.css";

type Props = {
  phase: "delivering" | "delivered";
  photoUrl: string | null;
  note: string;
  reducedMotion: boolean;
  onComplete: () => void;
  onHome: () => void;
};

export default function GreetingDelivery({ phase, photoUrl, note, reducedMotion, onComplete, onHome }: Props) {
  const delivered = phase === "delivered";
  return (
    <section className="qv-delivery" aria-labelledby="delivery-title">
      <DeliveryAnimation
        photoUrl={photoUrl} note={note} delivered={delivered}
        reducedMotion={reducedMotion} onComplete={onComplete}
      />
      <div className="qv-delivery-status" role="status">
        <h1 id="delivery-title">{delivered ? "안부가 전달됐어요" : "안부를 전하고 있어요"}</h1>
        <p>{delivered ? "남겨주신 안부를 소중히 전했어요" : "그리운 곳에 지금의 모습을 전해요"}</p>
      </div>
      <div className="qv-delivery-actions">
        {delivered && <Button className="qv-submit qv-delivery-home" onClick={onHome}>홈으로 돌아가기</Button>}
      </div>
    </section>
  );
}
