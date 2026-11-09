import { Link } from "react-router";
import { Profile } from "@/shared/components/WireUI";

type Props = {
  nickname?: string;
  email?: string;
  active: "memories" | "history";
  memoryCount: number | null;
  recordCount: number | null;
  hasGreetings: boolean;
};

export default function MyPageSummary({ nickname, email, active, memoryCount, recordCount, hasGreetings }: Props) {
  return (
    <section className="mypage-summary">
      <Profile nickname={nickname} email={email} />
      <nav className="mypage-stats" aria-label="내 활동">
        <Link to="/me/memories" aria-current={active === "memories" ? "page" : undefined}>
          {/* 읽음 여부가 없는 API이므로 새 안부로 표시하지 않습니다. */}
          {hasGreetings && <span className="mypage-greeting-badge">도착한 안부</span>}
          <strong>{memoryCount ?? "–"}</strong>
          <small>내 그리움</small>
        </Link>
        <Link to="/me/history" aria-current={active === "history" ? "page" : undefined}>
          <strong>{recordCount ?? "–"}</strong>
          <small>내 기록</small>
        </Link>
      </nav>
    </section>
  );
}
