import { useRef, type ReactNode } from "react";
import { AnimatePresence, motion, useIsPresent, useReducedMotion } from "motion/react";

function TabPanel({ active, restoreScroll, saveScroll, children }: {
  active: "memories" | "history";
  restoreScroll: (element: HTMLDivElement | null) => void;
  saveScroll: (top: number) => void;
  children: ReactNode;
}) {
  const reducedMotion = useReducedMotion();
  const present = useIsPresent();
  return (
    <motion.div className="mypage-tab-panel" data-tab={active} inert={!present} aria-hidden={!present}
      ref={restoreScroll}
      onScroll={(event) => saveScroll(event.currentTarget.scrollTop)}
      initial={{ opacity: 0, x: reducedMotion ? 0 : active === "history" ? 16 : -16 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: reducedMotion ? 0 : active === "history" ? 16 : -16 }}
      transition={{ duration: reducedMotion ? 0.1 : 0.2, ease: "easeOut" }}
    >{children}</motion.div>
  );
}

export default function MyPageTabs({ active, summary, children }: {
  active: "memories" | "history";
  summary: ReactNode;
  children: ReactNode;
}) {
  const reducedMotion = useReducedMotion();
  const scrollPositions = useRef({ memories: 0, history: 0 });
  return (
    <motion.section className="mypage-shell" data-tab={active} aria-label={active === "history" ? "내 수행 기록 지도 화면" : "내 그리움"}
      initial={reducedMotion || typeof document.startViewTransition === "function" ? false : { x: "100%" }}
      animate={{ x: 0 }} transition={{ duration: 0.3, ease: "easeOut" }}>
      <div className="mypage-shell-header">{summary}</div>
      <div className="mypage-tab-body">
        <AnimatePresence initial={false}>
          <TabPanel key={active} active={active}
            restoreScroll={(element) => { if (element) element.scrollTop = scrollPositions.current[active]; }}
            saveScroll={(top) => { scrollPositions.current[active] = top; }}
          >{children}</TabPanel>
        </AnimatePresence>
      </div>
    </motion.section>
  );
}
