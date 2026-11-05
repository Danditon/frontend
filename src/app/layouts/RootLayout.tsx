import { Outlet, useLocation } from "react-router";
import { BatteryFull, Signal, Wifi } from "lucide-react";
import { Bottom } from "@/shared/components/WireUI";
export function RootLayout() {
  const { pathname } = useLocation();
  const scoped = pathname.startsWith("/me") || pathname.endsWith("/verify");
  return (
    <div className="[&_button]:cursor-pointer [&_:is(button,a,input,textarea)]:[-webkit-tap-highlight-color:transparent] [&_:is(button,a,input,textarea):focus-visible]:outline-2 [&_:is(button,a,input,textarea):focus-visible]:outline-[#333] [&_:is(button,a,input,textarea):focus-visible]:outline-offset-[3px] min-h-[100dvh] bg-[#444] flex flex-col items-center justify-start p-[24px] text-[#080808] [font-family:Arial,Malgun_Gothic,sans-serif] max-[500px]:p-0 max-[500px]:bg-[#fff]">
      <div
        className={`app-phone ${scoped ? "designed-screen" : ""} w-[390px] min-h-[844px] bg-[#fff] relative flex flex-col [box-shadow:0_0_0_1px_#777] max-[500px]:w-full max-[500px]:min-h-[100dvh] max-[500px]:shadow-none ${scoped ? "" : "pb-[30px] [&_>_h1]:p-[20px]"}`}
      >
        <div
          className="preview-status h-[54px] shrink-0 [padding:20px_36px_10px] flex justify-between items-center text-[14px] relative z-[2] [&_>_span]:flex [&_>_span]:gap-[3px] [&_>_span]:items-center"
          aria-hidden="true"
        >
          <b>12:34</b>
          <span>
            <Signal size={15} />
            <Wifi size={15} />
            <BatteryFull size={22} />
          </span>
        </div>
        <main className="app-content" data-home={pathname === "/"}>
          <Outlet />
        </main>
        <div className="app-navigation">
          <Bottom />
        </div>
      </div>
      <p className="text-[#ccc] text-[11px] p-[14px] max-[500px]:hidden">
        그리움 퀘스트 · UI 미리보기
      </p>
    </div>
  );
}
