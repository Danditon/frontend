import { Link } from "react-router";
import { ChevronLeft, ChevronsRight, LogOut } from "lucide-react";
import type { ReactNode } from "react";
export function Back({ to = "/me/memories" }: { to?: string }) {
  return (
    <Link className="wire-circle" to={to} aria-label="뒤로">
      <ChevronLeft size={21} />
    </Link>
  );
}
export function Profile() {
  return (
    <header className="wire-profile">
      <span className="wire-avatar" />
      <div>
        민지 님<small>minji11@example.com</small>
      </div>
      <Link to="/me/logout" className="wire-circle" aria-label="로그아웃">
        <LogOut size={21} />
      </Link>
    </header>
  );
}
export function Bottom() {
  return (
    <nav className="wire-bottom" aria-label="주 메뉴">
      <Link to="/quests/demo/verify">수행 인증</Link>
      <Link to="/" className="wire-home">
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
    <button className="wire-slide" onClick={onClick} disabled={disabled}>
      <span>
        <ChevronsRight size={21} />
      </span>
      {children}
    </button>
  );
}
