// 전송은 인증 요청에서 완료됐으며, 이 화면은 도착 연출만 표시합니다.
import { motion } from "motion/react";
import { MapPin } from "lucide-react";
import "./verification.css";

type Props = {
  phase: "delivering" | "delivered";
  photoUrl: string | null;
  reducedMotion: boolean;
  onComplete: () => void;
};

const envelope = (
  <g>
    <rect width="96" height="72" rx="8" fill="white" stroke="#bed9e5" />
    <path d="M2 6L48 38L94 6" fill="#f3faff" stroke="#bed9e5" strokeLinejoin="round" />
    <path d="M3 68L34 37M93 68L62 37" fill="none" stroke="#d3e7f4" />
    <circle cx="48" cy="39" r="10" fill="#d3e7f4" />
    <path d="M42 37C42 33 47 33 48 36C49 33 54 33 54 37C54 41 48 45 48 45S42 41 42 37Z" fill="#63a4bc" />
  </g>
);

export default function GreetingDelivery({ phase, photoUrl, reducedMotion, onComplete }: Props) {
  const delivered = phase === "delivered";
  return (
    <section className="qv-delivery" aria-labelledby="delivery-title">
      {photoUrl
        ? <img className="qv-delivery-thumbnail" src={photoUrl} alt="안부와 함께 남긴 장소" />
        : <div className="qv-delivery-placeholder" aria-hidden="true"><MapPin size={40} /></div>}
      <svg className="qv-delivery-scene" viewBox="0 0 280 220" aria-hidden="true">
        <path d="M60 164C112 50 168 10 236 60" fill="none" stroke="#94bfd2" strokeWidth="2" strokeDasharray="4 8" />
        {delivered ? (
          <g transform="translate(202 35) scale(.7)">{envelope}</g>
        ) : reducedMotion ? (
          <g transform="translate(12 128)">{envelope}</g>
        ) : (
          <motion.g
            initial={{ x: 0, y: 0, rotate: -10, scale: 1, opacity: 1 }}
            animate={{ x: [0, 88, 176], y: [0, -88, -104], rotate: [-10, 3, 0], scale: [1, 1, 0.7], opacity: [1, 1, 0] }}
            transition={{ duration: 1.2, ease: "easeInOut" }}
            // 반복 호출돼도 부모에서 전달 중인 경우에만 완료로 전환합니다.
            onAnimationComplete={onComplete}
          >
            <g transform="translate(12 128)">{envelope}</g>
          </motion.g>
        )}
        {delivered && <circle cx="236" cy="58" r="36" fill="#b9e3f277" />}
        <MapPin x={208} y={30} size={56} fill="#63a4bc" stroke="white" strokeWidth={1.6} />
        {delivered && <path d="M227 53L233 59L244 46" fill="none" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />}
      </svg>
      <div role="status">
        <h1 id="delivery-title">{delivered ? "안부가 전달됐어요" : "안부를 전하고 있어요"}</h1>
        <p>{delivered ? "잠시 후 홈으로 돌아가요" : "그리운 곳에 지금의 모습을 전해요"}</p>
      </div>
    </section>
  );
}
