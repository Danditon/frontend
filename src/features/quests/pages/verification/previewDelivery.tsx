// Vite 개발 서버의 콘솔에서만 불러오는 미리보기입니다. 앱 진입점에서는 사용하지 않습니다.
import { useState } from "react";
import { createRoot } from "react-dom/client";
import GreetingDelivery from "./GreetingDelivery";

let closePreview: (() => void) | undefined;

export function previewDelivery({
  photoUrl = document.querySelector<HTMLImageElement>(".qv-scan-image, .qv-comparison img")?.currentSrc || null,
  note = "오늘도 이곳은 잘 있어요",
}: { photoUrl?: string | null; note?: string } = {}) {
  if (!import.meta.env.DEV) throw new Error("개발 서버에서만 사용할 수 있어요.");
  closePreview?.();
  const host = document.createElement("div");
  host.className = "qv-delivery-preview";
  host.setAttribute("role", "dialog");
  host.setAttribute("aria-modal", "true");
  host.setAttribute("aria-label", "안부 전달 미리보기");
  document.body.append(host);
  const root = createRoot(host);
  const previousFocus = document.activeElement;
  const close = () => {
    root.unmount();
    host.remove();
    document.removeEventListener("keydown", onKeyDown);
    if (previousFocus instanceof HTMLElement) previousFocus.focus();
    if (closePreview === close) closePreview = undefined;
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key === "Escape") close();
    // 모달 미리보기를 조작하는 동안 배경 앱으로 키보드 포커스가 빠지지 않게 합니다.
    if (event.key === "Tab") {
      const buttons = [...host.querySelectorAll<HTMLButtonElement>("button")];
      const index = buttons.indexOf(document.activeElement as HTMLButtonElement);
      event.preventDefault();
      buttons[(index + (event.shiftKey ? -1 : 1) + buttons.length) % buttons.length]?.focus();
    }
  };
  closePreview = close;
  document.addEventListener("keydown", onKeyDown);

  function Preview() {
    const [phase, setPhase] = useState<"delivering" | "delivered">("delivering");
    const [play, setPlay] = useState(0);
    return (
      <div className="qv-delivery-preview-phone">
        <div className="qv-delivery-preview-controls">
          <button autoFocus onClick={() => { setPhase("delivering"); setPlay(current => current + 1); }}>다시 재생</button>
          <button onClick={close}>닫기</button>
        </div>
        <GreetingDelivery
          key={play} phase={phase} photoUrl={photoUrl} note={note}
          reducedMotion={false}
          onComplete={() => setPhase("delivered")}
          onHome={close}
        />
      </div>
    );
  }
  root.render(<Preview />);
  // 미리보기의 홈 버튼은 미리보기를 닫으며 실제 앱의 경로나 데이터를 바꾸지 않습니다.
  return close;
}
