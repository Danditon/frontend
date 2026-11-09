import { useLayoutEffect, useRef, type ReactNode } from "react";
import { Link, useLocation, useNavigate } from "react-router";
import { useReducedMotion } from "motion/react";

export default function MyPageHomeLink({ children, className }: { children: ReactNode; className: string }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const reducedMotion = useReducedMotion();
  const leaving = useRef<{ animation: Animation; element: HTMLElement } | null>(null);
  const fromMyPage = ["/me", "/me/memories", "/me/history"].includes(pathname);

  useLayoutEffect(() => () => {
    const current = leaving.current;
    leaving.current = null;
    if (current) {
      current.element.inert = false;
      current.animation.cancel();
    }
  }, [pathname]);

  return (
    <Link to="/" className={className} viewTransition={fromMyPage && !reducedMotion}
      onClick={async (event) => {
        if (!fromMyPage || reducedMotion || typeof document.startViewTransition === "function" || event.defaultPrevented
          || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
        const element = document.querySelector<HTMLElement>(".app-content");
        if (!element?.animate) return;
        event.preventDefault();
        if (leaving.current) return;
        // View Transition 미지원 브라우저도 본문이 닫힌 뒤 홈으로 이동합니다.
        const animation = element.animate([{ transform: "translateX(0)" }, { transform: "translateX(100%)" }], {
          duration: 300, easing: "cubic-bezier(0.22,0.61,0.36,1)", fill: "forwards",
        });
        leaving.current = { animation, element };
        element.inert = true;
        try {
          await animation.finished;
          if (leaving.current?.animation === animation) void navigate("/");
        } catch {
          // 다른 경로로 이동해 취소된 애니메이션은 홈 이동을 실행하지 않습니다.
        }
      }}
    >{children}</Link>
  );
}
