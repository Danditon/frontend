import { Outlet, useLocation, useSearchParams } from "react-router";
import { Bottom } from "@/shared/components/WireUI";

export function RootLayout() {
  const { pathname } = useLocation();
  const [params] = useSearchParams();

  const greetingScreen =
    pathname.startsWith("/me") &&
    pathname !== "/me/logout" &&
    (params.has("message") || params.get("tab") === "messages");

  const floatingMemoriesNav =
    pathname === "/me" || pathname === "/me/memories";

  const isAuthPage = ["/login", "/signup"].includes(
    pathname.replace(/\/+$/, ""),
  );

  const isQuestRegistration = pathname.replace(/\/+$/, "") === "/quests/new";
  const isQuestVerificationFlow = /^\/quests\/[^/]+\/(verify|greetings)\/?$/i.test(pathname);
  const scoped = isQuestRegistration || pathname.startsWith("/me") || isQuestVerificationFlow;

  return (
    <div
      data-history={pathname === "/me/history" || greetingScreen}
      className="group data-[history=true]:h-dvh data-[history=true]:overflow-hidden [&_button]:cursor-pointer [&_:is(button,a,input,textarea)]:[-webkit-tap-highlight-color:transparent] [&_:is(button,a,input,textarea):focus-visible]:outline-2 [&_:is(button,a,input,textarea):focus-visible]:outline-[#333] [&_:is(button,a,input,textarea):focus-visible]:outline-offset-[3px] min-h-[100dvh] bg-[#444] flex flex-col items-center justify-start p-[24px] text-[#080808] [font-family:Arial,Malgun_Gothic,sans-serif] max-[500px]:p-0 max-[500px]:bg-[#fff]"
    >
      <div
        className={`app-phone ${scoped ? "designed-screen" : ""} w-[390px] min-h-[844px] bg-[#fff] relative flex flex-col [box-shadow:0_0_0_1px_#777] max-[500px]:w-full max-[500px]:min-h-[100dvh] max-[500px]:shadow-none ${scoped ? "" : "pb-[30px] [&_>_h1]:p-[20px]"}`}
      >
        <main
          className={`app-content ${
            greetingScreen
              ? "overflow-hidden! [&>.memory-page]:min-h-0! [&>.memory-page]:p-0!"
              : ""
          } ${
            !greetingScreen && floatingMemoriesNav
              ? "[&>.memory-page]:pb-[calc(124px+env(safe-area-inset-bottom,0px))]! [scroll-padding-bottom:calc(124px+env(safe-area-inset-bottom,0px))]"
              : ""
          }`}
          data-home={pathname === "/" || pathname === "/me/history"}
          data-mypage={pathname === "/me"}
        >
          <Outlet />
        </main>

        {!greetingScreen && !isAuthPage && !isQuestRegistration && !isQuestVerificationFlow && (
          <div
            className={`app-navigation ${
              floatingMemoriesNav
                ? "absolute! inset-x-0 bottom-0 bg-transparent! pointer-events-none [&>nav]:pointer-events-auto"
                : ""
            }`}
          >
            <Bottom />
          </div>
        )}
      </div>

      <p className="text-[#ccc] text-[11px] p-[14px] max-[500px]:hidden group-data-[history=true]:hidden">
        그립데이 · UI 미리보기
      </p>
    </div>
  );
}