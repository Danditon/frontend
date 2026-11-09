// 실패해도 부모의 사진·안부는 유지하고 사진 재선택만 요청합니다.
import type { ReactNode } from "react";
import { Link } from "react-router";
import { X } from "lucide-react";
import { SlideButton } from "@/shared/components/WireUI";
import { RemotePhoto } from "@/shared/components/RemotePhoto";

type Props = {
  photoUrl: string | null;
  photo: string;
  general: boolean;
  percent: number | null;
  message?: string;
  onRetry: () => void;
  children: ReactNode;
};

export default function VerificationNotice({
  photoUrl, photo, general, percent, message, onRetry, children,
}: Props) {
  return (
    <section className={`verify-page verify-failure ${general ? "verify-general" : ""} [&::before]:content-[''] [&::before]:absolute [&::before]:top-[-54px] [&::before]:left-0 [&::before]:right-0 [&::before]:h-[54px] [&::before]:bg-[#def2f6] [&::before]:z-0 bg-[#def2f6] min-h-[790px] flex-1 relative [padding:68px_15px_25px] flex flex-col [&_>_p_small]:text-[10px] [&_>_p_small]:text-[#666] [&_>_p_small]:ml-[10px] [&_>_p]:text-[17px] [&_>_p]:mb-[16px] [&_>_h1]:text-[40px] [&_>_h1]:leading-[1.15] [&_>_h1]:font-semibold [&_>_h1]:tracking-[-2px] [&_>_h1]:[margin:0_10px_32px] max-[500px]:[min-height:calc(100dvh_-_54px)]`}>
      <Link
        className="h-[54px] w-[54px] rounded-full bg-[#ededed] inline-flex items-center justify-center shrink-0 [&_svg]:[stroke-width:1.25] absolute right-[15px] top-[12px]"
        to="/me/memories"
        aria-label="닫기"
      >
        <X />
      </Link>
      <p>
        인증 실패
      </p>
      <h1>
        조금
        <br />
        달라 보여요
      </h1>
      <div className="flex gap-[10px] h-[250px] [&_>_div]:relative [&_>_div]:flex-1 [&_>_div]:bg-[#def2f6] [&_>_div]:rounded-[23px] [&_>_div]:overflow-hidden [&_>_div:nth-child(2)]:bg-[#ededed] [&_img]:w-full [&_img]:h-full [&_img]:object-cover [&_span]:absolute [&_span]:left-[13px] [&_span]:top-[16px] [&_span]:bg-[#aaa] [&_span]:rounded-[20px] [&_span]:[padding:4px_10px] [&_span]:text-[12px] [&_span]:z-[1]">
        <div>
          <span>과거</span>
          <RemotePhoto className="past-photo" photoUrl={photoUrl} alt="퀘스트 기준 사진" />
        </div>
        <div>
          <span>지금</span>
          {photo ? <img src={photo} alt="선택한 사진" /> : <div className="past-photo current-photo" />}
        </div>
      </div>
      <div className="flex items-center gap-[20px] bg-[#ededed] rounded-[24px] [padding:22px_20px] mt-[12px] [&_strong]:text-[46px] [&_strong]:font-normal [&_strong]:tracking-[-2px] [&_strong]:whitespace-nowrap [&_strong_small]:text-[12px] [&_strong_small]:tracking-[0] [&_p]:text-[12px] [&_p]:leading-[1.5]">
        <strong>
          {percent === null ? "—" : <>{percent}<small>%</small></>}
        </strong>
        <p>
          {message}
        </p>
      </div>
      <div className="mt-auto pt-[36px] [&_>_p]:text-center [&_>_p]:text-[12px] [&_>_p]:mb-[12px]">
        <p>적어둔 안부는 그대로 남아 있어요.</p>
        <SlideButton
          onClick={onRetry}
        >
          사진 다시 고르기
        </SlideButton>
      </div>
      {children}
    </section>
  );
}
