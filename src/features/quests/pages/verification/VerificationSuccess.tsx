// 기존 성공 Drawer와 이동 경로를 유지하는 결과 화면입니다.
import { Link } from "react-router";
import { X } from "lucide-react";
import { SwipeSheet } from "@/shared/components/SwipeSheet";

type Props = {
  questId: string;
  photo: string;
  general: boolean;
  percent: number | null;
  message?: string;
  error: string;
  locationError?: string;
};

export default function VerificationSuccess({
  questId, photo, general, percent, message, error, locationError,
}: Props) {
  return (
    <section className={`verify-page verify-success ${general ? "verify-general" : ""} [&::before]:content-[''] [&::before]:absolute [&::before]:top-[-54px] [&::before]:left-0 [&::before]:right-0 [&::before]:h-[54px] [&::before]:bg-[#def2f6] [&::before]:z-0 bg-[#def2f6] min-h-[790px] flex-1 relative max-[500px]:[min-height:calc(100dvh_-_54px)]`}>
      <Link
        className="h-[54px] w-[54px] rounded-full bg-[#ededed] inline-flex items-center justify-center shrink-0 [&_svg]:[stroke-width:1.25] absolute right-[15px] top-[12px]"
        to="/me/history"
        aria-label="닫기"
      >
        <X />
      </Link>
      {photo && <img className="verify-result-background" src={photo} alt="인증한 장소" />}
      <SwipeSheet key="success" label="인증 성공 결과" collapsed={0.64} className="success-swipe-sheet">
      <div className="success-sheet-content">

        <p>
          인증 성공
        </p>
        <div className="text-[112px] leading-[1.15] tracking-[-6px] font-normal [&_span]:text-[36px] [&_span]:tracking-[0]">
          {percent === null ? "인증 완료" : <>{percent}<span>%</span></>}
        </div>
        <small>{percent === null ? "퀘스트 수행을 완료했어요" : "그때 사진과의 유사도"}</small>
        <h1>
          {message}
        </h1>
        <div className="mt-auto pt-[45px] flex flex-col text-center gap-[17px] text-[14px] [&_>_a:first-of-type]:bg-[#242624] [&_>_a:first-of-type]:rounded-[35px] [&_>_a:first-of-type]:p-[20px] [&_>_button]:text-[10px] [&_>_button]:text-[#555]">
          <Link to={`/quests/${questId}/greetings`}>다른 수행자의 안부 보기</Link>
          <Link to="/">지도로 돌아가기</Link>
        </div>
        {error && <p role="alert">{error}</p>}
        {locationError && <p role="alert">{locationError}</p>}
      </div>
      </SwipeSheet>
    </section>
  );
}
