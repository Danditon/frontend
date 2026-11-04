import { useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import { Heart, LogOut } from "lucide-react";
import { Back, Bottom, Profile } from "@/shared/components/WireUI";
import { readHistory } from "@/shared/lib/demo";
const items = [
  {
    title: "시험 끝나면 가던 떡볶이집",
    sub: "안부 2통  |  일반 퀘스트",
    message: "사장님 아직 그대로세요.\n떡볶이도 그대로예요.",
  },
  {
    title: "해 질 무렵의 앞산 전망대",
    sub: "안부 1통  |  이미지 퀘스트",
    message: "해 질 무렵의 풍경은 여전히 아름다워요.",
  },
  {
    title: "친구들과 탔던 수성못 오리배",
    sub: "아직 안부를 기다리는 중",
    message: "",
  },
];
export default function MyPage() {
  const { pathname } = useLocation();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(false);
  const [error, setError] = useState("");
  const index = Math.max(0, Math.min(1, Number(params.get("message")) || 0));
  const message = params.has("message") || params.get("tab") === "messages";
  const history = pathname === "/me/history";
  const logout = pathname === "/me/logout";
  const entries = readHistory();
  const recordCount = 2 + entries.length;
  function signOut() {
    try {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      sessionStorage.removeItem("accessToken");
      navigate("/login", { replace: true });
    } catch {
      setError("로그아웃하지 못했어요. 다시 시도해 주세요.");
    }
  }
  if (logout)
    return (
      <section className="wire-logout">
        <Back />
        <div className="wire-logout-panel">
          <h1>로그아웃할까요?</h1>
          <p>다시 로그인하면 내 그리움과 기록을 그대로 볼 수 있어요.</p>
          {error && <p role="alert">{error}</p>}
          <div>
            <Link to="/me/memories">취소</Link>
            <button onClick={signOut}>로그아웃</button>
          </div>
        </div>
      </section>
    );
  if (message)
    return (
      <section className="wire-mail-page">
        <header className="wire-mail-head">
          <Back />
          <div>
            <small>도착한 안부 {index + 1}/2</small>
            <strong>{items[0].title}</strong>
          </div>
          <Link className="wire-circle" to="/me/logout" aria-label="로그아웃">
            <LogOut size={21} />
          </Link>
        </header>
        <article className="wire-envelope">
          <div
            className="wire-letter-photo"
            aria-label="도착한 안부 사진 자리"
            role="img"
          />
          <p className="wire-letter-text">{items[index].message}</p>
          <small>From. 동네 주민 수현 | 11월 3일</small>
          <div className="wire-envelope-fold" />
          <div className="wire-thanks">
            <button
              className={`wire-circle ${liked ? "liked" : ""}`}
              aria-label="안부 좋아요"
              aria-pressed={liked}
              onClick={() => setLiked(!liked)}
            >
              <Heart fill={liked ? "currentColor" : "none"} />
            </button>
            <p>
              {liked
                ? "고마운 마음을 전했어요"
                : "좋아요로 고마움을 전해보세요"}
            </p>
          </div>
          <button
            className="wire-next"
            onClick={() => {
              setParams({ message: String((index + 1) % 2) });
              setLiked(false);
            }}
          >
            다음 안부 보기
          </button>
        </article>
      </section>
    );
  return (
    <section className="wire-archive">
      <Profile />
      <div className="wire-stats">
        <Link to="/me/memories" className={!history ? "selected" : ""}>
          <span className="wire-new">새 안부 1</span>
          <strong>3</strong>
          <small>내 그리움</small>
        </Link>
        <Link to="/me/history" className={history ? "selected" : ""}>
          <strong>{recordCount}</strong>
          <small>내 기록</small>
        </Link>
      </div>
      {history ? (
        <>
          <div className="wire-stamp-map" aria-label="미션 기록 지도 자리">
            <span />
            <span />
            <small>미션 다녀온 곳 {recordCount}</small>
          </div>
          <div className="wire-records">
            {[
              "자취방 앞 가로등 골목",
              "주말마다 가던 동네 목욕탕",
              ...entries.map((x) => x.title),
            ].map((title, i) => (
              <article key={i}>
                <div />
                <p>{title}</p>
              </article>
            ))}
            <Link to="/">다음 퀘스트 찾기</Link>
          </div>
        </>
      ) : (
        <div className="wire-memory-cards">
          {items.map((x, i) => (
            <button
              key={x.title}
              onClick={() => {
                if (x.message) {
                  setParams({ message: String(i) });
                  setLiked(false);
                } else setError("아직 도착한 안부가 없어요.");
              }}
            >
              <strong>{x.title}</strong>
              <small>{x.sub}</small>
              {i === 0 && <span>새 안부 도착</span>}
              <i />
            </button>
          ))}
          {error && (
            <p className="wire-empty" role="status">
              {error}
            </p>
          )}
        </div>
      )}
      <Bottom />
    </section>
  );
}
