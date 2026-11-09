// 위치 확인·검증 진행 표시를 담당하고, 제출 처리는 부모 페이지에 둡니다.
import { motion, useReducedMotion } from "motion/react";

type Props = {
  photoUrl: string | null;
  general: boolean;
  isLocating: boolean;
};

export default function VerificationProgress({ photoUrl, general, isLocating }: Props) {
  const reduceMotion = useReducedMotion();
  return (
    <section
      className="verify-page verify-checking min-h-[790px] flex-1 bg-[#def2f6] relative [&::before]:content-[''] [&::before]:absolute [&::before]:top-[-54px] [&::before]:left-0 [&::before]:right-0 [&::before]:h-[54px] [&::before]:bg-[#def2f6] [&::before]:z-0 max-[500px]:[min-height:calc(100dvh_-_54px)]"
      aria-live="polite"
    >
      {photoUrl && <img className="verify-result-background" src={photoUrl} alt="검증 중인 장소" />}
      <motion.div
        className="absolute top-[63%] left-0 right-0 h-[3px] bg-[#111]"
        animate={{ y: reduceMotion ? 0 : [0, -200, 0] }}
        transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      />
      <div className="checking-card absolute bottom-[27px] left-[15px] right-[15px] bg-[#c9eaf5] rounded-[28px] p-[20px] [&_small]:text-[15px] [&_h1]:text-[28px] [&_h1]:leading-[1.2] [&_h1]:mt-[12px] [&_h1]:font-normal [&_h1]:tracking-[-1px]">
        <small>{isLocating ? "현재 위치 확인 중" : general ? "안부를 전송하고 있어요" : "AI 검증 중"}</small>
        <h1>
          {isLocating ? "현재 위치를 확인하고 있어요" : general ? "잠시만 기다려 주세요" : <>같은 자리인지<br />비교하고 있어요</>}
        </h1>
      </div>
    </section>
  );
}
