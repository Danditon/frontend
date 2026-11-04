import { Link } from "react-router";
import { ChevronLeft, ChevronsRight, LogOut } from "lucide-react";
import type { ReactNode } from "react";
export function Back({ to = "/me/memories" }: { to?: string }) {
  return (
    <Link
      className="h-[54px] w-[54px] rounded-full bg-[#d9d9d9] inline-flex items-center justify-center shrink-0 [&_svg]:[stroke-width:1.25]"
      to={to}
      aria-label="뒤로"
    >
      <ChevronLeft size={21} />
    </Link>
  );
}
export function Profile() {
  return (
    <header className="flex gap-[10px] items-center h-[60px] mb-[14px] text-[15px] [&_small]:block [&_small]:text-[10px] [&_:is(a,button)]:ml-auto">
      <span className="h-[54px] w-[54px] rounded-full bg-[#bfbfbf]" />
      <div>
        민지 님<small>minji11@example.com</small>
      </div>
      <Link
        to="/me/logout"
        className="h-[54px] w-[54px] rounded-full bg-[#d9d9d9] inline-flex items-center justify-center shrink-0 [&_svg]:[stroke-width:1.25]"
        aria-label="로그아웃"
      >
        <LogOut size={21} />
      </Link>
    </header>
  );
}
export function Bottom() {
  return (
    <nav
      className="absolute bottom-[26px] left-[15px] right-[15px] h-[65px] rounded-[36px] bg-[#c4c4c4] flex justify-between items-center [padding:0_37px] text-[14px] max-[500px]:[bottom:max(26px,_env(safe-area-inset-bottom))]"
      aria-label="주 메뉴"
    >
      <Link to="/quests/demo/verify">수행 인증</Link>
      <Link
        to="/"
        className="absolute left-[50%] top-[-36px] [transform:translateX(-50%)] h-[73px] w-[73px] bg-[#e2e2e2] rounded-full grid place-items-center text-[18px]"
      >
        홈
      </Link>
      <Link to="/quests/new">그리움 등록</Link>
    </nav>
  );
}
export function SlideButton({
  children,
  onClick,
  disabled = false,
}: {
  children: ReactNode;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      className="w-full h-[64px] rounded-[36px] bg-[#c6c6c6] relative flex items-center justify-center text-[16px] [&_>_span]:absolute [&_>_span]:left-[8px] [&_>_span]:h-[48px] [&_>_span]:w-[48px] [&_>_span]:rounded-full [&_>_span]:bg-[#d9d9d9] [&_>_span]:grid [&_>_span]:place-items-center [&_svg]:[stroke-width:1] [&:disabled]:cursor-default [&:disabled]:text-[#333]"
      onClick={onClick}
      disabled={disabled}
    >
      <span>
        <ChevronsRight size={21} />
      </span>
      {children}
    </button>
  );
}
