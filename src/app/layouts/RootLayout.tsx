import { Outlet, useLocation } from "react-router";
import { BatteryFull, Signal, Wifi } from "lucide-react";
import "@/shared/styles/memories.css";
export function RootLayout() {
  const { pathname } = useLocation();
  const scoped = pathname.startsWith("/me") || pathname.endsWith("/verify");
  return (
    <div className="wire-stage">
      <div className={`wire-phone ${scoped ? "" : "wire-other"}`}>
        <div className="wire-status" aria-hidden="true">
          <b>12:34</b>
          <span>
            <Signal size={15} />
            <Wifi size={15} />
            <BatteryFull size={22} />
          </span>
        </div>
        <Outlet />
      </div>
      <p className="wire-demo-label">와이어프레임 미리보기 · 예시 데이터</p>
    </div>
  );
}
