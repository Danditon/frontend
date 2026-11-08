import { Link } from "react-router";
import { ChevronLeft, ChevronsRight, LogOut, MailPlus, House, UserRound } from "lucide-react";
import type { ReactNode } from "react";
import NearbyQuestNavItem from "@/features/quests/components/NearbyQuestNavItem";
import type { NearbyNavigation } from "@/features/quests/types/nearbyNavigation";
export function Back({ to = "/me/memories" }: { to?: string }) {
  return (
    <Link
      className="h-[54px] w-[54px] rounded-full bg-[#242624] text-white inline-flex items-center justify-center shrink-0 [&_svg]:[stroke-width:1.25]"
      to={to}
      aria-label="뒤로"
    >
      <ChevronLeft size={21} />
    </Link>
  );
}
export function Profile({ nickname, email }: { nickname?: string; email?: string }) {
  return (
    <header className="flex gap-[10px] items-center h-[60px] mb-[14px] text-[15px] [&_small]:block [&_small]:text-[10px] [&_:is(a,button)]:ml-auto">
      <span aria-hidden="true" className="grid size-[54px] shrink-0 place-items-center rounded-full bg-[#c9eaf5] text-[#375963]">
        <UserRound size={26} />
      </span>
      <div>
        {nickname ? `${nickname} 님` : "내 프로필"}<small>{email}</small>
      </div>
      <Link
        to="/me/logout"
        className="h-[54px] w-[54px] rounded-full bg-[#242624] text-white inline-flex items-center justify-center shrink-0 [&_svg]:[stroke-width:1.25]"
        aria-label="로그아웃"
      >
        <LogOut size={21} />
      </Link>
    </header>
  );
}
// 모든 화면에서 같은 크기와 간격으로 사용하는 공용 하단 navbar입니다.
export function Bottom({ nearbyNavigation = null }: { nearbyNavigation?: NearbyNavigation | null }) {
  return (
    <nav
      className="absolute bottom-[26px] left-[15px] right-[15px] h-[62px] rounded-[36px] bg-[#242624] text-white grid grid-cols-3 place-items-center px-4 text-[14px] max-[500px]:[bottom:max(26px,_env(safe-area-inset-bottom))]"
      aria-label="주 메뉴"
    >
      <NearbyQuestNavItem count={nearbyNavigation?.count ?? null} isLoading={nearbyNavigation?.isLoading ?? false} />
      <Link
        to="/"
        className="relative -translate-y-[22px] h-[60px] w-[60px] bg-white text-[#242624] rounded-full grid place-items-center text-[18px]"
      >
        <House size={25} fill="currentColor" aria-hidden="true" /><span className="sr-only">홈</span>
      </Link>
      <Link className="nav-item" to="/quests/new"><span className="nav-icon"><MailPlus size={20} strokeWidth={1.6} aria-hidden="true" /></span><span>그리움 등록</span></Link>
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
      className="w-full h-[64px] rounded-[36px] bg-[#242624] text-white relative flex items-center justify-center text-[16px] [&_>_span]:absolute [&_>_span]:left-[8px] [&_>_span]:h-[48px] [&_>_span]:w-[48px] [&_>_span]:rounded-full [&_>_span]:bg-white [&_>_span]:text-[#242624] [&_>_span]:grid [&_>_span]:place-items-center [&_svg]:[stroke-width:1] [&:disabled]:cursor-default [&:disabled]:text-[#333]"
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
