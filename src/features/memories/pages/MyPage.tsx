import { useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import { Heart, LogOut } from "lucide-react";
import { Back, Bottom, Profile } from "@/shared/components/WireUI";
import { RemotePhoto } from "@/shared/components/RemotePhoto";
import type { MyPageData } from "@/features/memories/types";
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
// The router uses previews until the backend publishes response DTOs.
// Supply mapped API data through this boundary without changing the UI.
export default function MyPage({ data }: { data?: MyPageData } = {}) {
  const { pathname } = useLocation();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const [liked, setLiked] = useState(false);
  const [error, setError] = useState("");
  const memories = data?.memories ?? items.map((item, i) => ({
    id: String(i), title: item.title, sub: item.sub, photoUrl: null,
    greetings: item.message ? [{ id: String(i), greeting: item.message, photoUrl: null, senderName: '동네 주민 수현', createdAt: '' }] : [],
  }));
  const selected = memories.find(item => item.id === params.get('quest')) ?? memories[0];
  const greetings = selected?.greetings ?? [];
  const requested = Number(params.get('message'));
  const index = Number.isFinite(requested) ? Math.max(0, Math.min(greetings.length - 1, Math.trunc(requested))) : 0;
  const greeting = greetings[index];
  const message = params.has("message") || params.get("tab") === "messages";
  const history = pathname === "/me/history";
  const logout = pathname === "/me/logout";
  const entries = readHistory();
  const records = data?.records ?? entries.map(entry => ({ id: entry.id, title: entry.title, photoUrl: null }));
  const recordCount = records.length;
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
      <section className="memory-page min-h-[790px] flex-1 relative [padding:12px_15px] max-[500px]:[min-height:calc(100dvh_-_54px)]">
        <Back />
        <div className="absolute left-[15px] right-[15px] bottom-[26px] bg-[#242624] rounded-[29px] [padding:37px_22px_20px] [&_h1]:text-[23px] [&_h1]:font-normal [&_h1]:tracking-[-1px] [&_p]:text-[11px] [&_p]:[margin:5px_0_18px] [&_>_div]:flex [&_>_div]:gap-[16px] [&_>_div_>_*]:bg-[#ddd] [&_>_div_>_*]:rounded-[30px] [&_>_div_>_*]:h-[50px] [&_>_div_>_*]:flex-1 [&_>_div_>_*]:grid [&_>_div_>_*]:place-items-center [&_>_div_>_*]:text-[14px] [&_>_div_>_button]:bg-[#fff]">
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
      <section className="memory-page [padding:12px_15px_15px] min-h-[790px] flex-1 flex flex-col max-[500px]:[min-height:calc(100dvh_-_54px)]">
        <header className="flex items-center gap-[10px] mb-[15px] [&_>_div]:flex-1 [&_small]:text-[10px] [&_small]:block [&_strong]:text-[15px] [&_strong]:block [&_strong]:tracking-[-0.5px]">
          <Back />
          <div>
            <small>도착한 안부 {greeting ? index + 1 : 0}/{greetings.length}</small>
            <strong>{selected?.title ?? "도착한 안부"}</strong>
          </div>
          <Link
            className="h-[54px] w-[54px] rounded-full bg-[#c9eaf5] inline-flex items-center justify-center shrink-0 [&_svg]:[stroke-width:1.25]"
            to="/me/logout"
            aria-label="로그아웃"
          >
            <LogOut size={21} />
          </Link>
        </header>
        <article className="message-envelope rounded-[24px] bg-[#fff] flex-1 relative overflow-hidden [padding:20px_14px] flex flex-col items-center min-h-[650px] [&_>_small]:text-[10px] [&_>_small]:z-[1]">
          <RemotePhoto className="postcard-photo" photoUrl={greeting?.photoUrl} alt="도착한 안부 사진" />
          <p className="text-[20px] leading-[1.3] whitespace-pre-line text-center [margin:22px_0_10px] z-[1]">
            {greeting?.greeting ?? "아직 도착한 안부가 없어요."}
          </p>
          <small>{greeting ? `From. ${greeting.senderName}${greeting.createdAt ? ` | ${greeting.createdAt.slice(0, 10)}` : ""}` : ""}</small>
          <div className="absolute [inset:38%_0_0] bg-[#c9eaf5] [clip-path:polygon(0_0,_50%_37%,_100%_0,_100%_100%,_0_100%)]" />
          <div className="relative mt-auto z-[1] text-center pt-[90px] [&_:is(a,button)]:h-[66px] [&_:is(a,button)]:w-[66px] [&_:is(a,button)]:bg-[#242624] [&_.liked]:bg-[#999] [&_p]:text-[11px] [&_p]:[margin:12px_0_34px]">
            <button
              className={`h-[54px] w-[54px] rounded-full bg-[#c9eaf5] inline-flex items-center justify-center shrink-0 [&_svg]:[stroke-width:1.25] ${liked ? "liked" : ""}`}
              aria-label="안부 좋아요"
              aria-pressed={liked}
              disabled={!greeting}
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
            className="relative z-[1] bg-[#242624] h-[64px] rounded-[35px] w-full text-[15px]"
            disabled={greetings.length < 2}
            onClick={() => {
              setParams({ quest: selected.id, message: String((index + 1) % greetings.length) });
              setLiked(false);
            }}
          >
            다음 안부 보기
          </button>
        </article>
      </section>
    );
  return (
    <section className="memory-page [padding:12px_15px_100px] min-h-[790px] relative flex-1 max-[500px]:[min-height:calc(100dvh_-_54px)]">
      <Profile />
      <div className="grid [grid-template-columns:1fr_1fr] gap-[6px] mb-[16px] [&_>_a]:h-[115px] [&_>_a]:rounded-[23px] [&_>_a]:bg-[#c9eaf5] [&_>_a]:flex [&_>_a]:flex-col [&_>_a]:[padding:25px_14px_13px] [&_>_a]:relative [&_>_a]:justify-end [&_>_a.selected]:bg-[#242624] [&_strong]:font-normal [&_strong]:text-[45px] [&_strong]:leading-[1.05] [&_small]:text-[12px] [&_small]:mt-[4px]">
        <Link to="/me/memories" className={!history ? "selected" : ""}>
          <span className="text-[10px] absolute right-[12px] top-[14px] rounded-[15px] [padding:4px_7px] bg-[#dedede]">
            도착한 안부
          </span>
          <strong>{memories.length}</strong>
          <small>내 그리움</small>
        </Link>
        <Link to="/me/history" className={history ? "selected" : ""}>
          <strong>{recordCount}</strong>
          <small>내 기록</small>
        </Link>
      </div>
      {history ? (
        <>
          <div
            className="h-[215px] rounded-[24px] bg-[#c9eaf5] relative mb-[15px] [&_>_span]:absolute [&_>_span]:top-[60px] [&_>_span]:left-[65px] [&_>_span]:w-[69px] [&_>_span]:h-[51px] [&_>_span]:[transform:rotate(-14deg)] [&_>_span]:bg-[#b5b5b5] [&_>_span:nth-child(2)]:top-[120px] [&_>_span:nth-child(2)]:left-[auto] [&_>_span:nth-child(2)]:right-[40px] [&_>_span:nth-child(2)]:[transform:rotate(7deg)] [&_small]:absolute [&_small]:bottom-[18px] [&_small]:left-[18px] [&_small]:bg-[#c9eaf5] [&_small]:rounded-[20px] [&_small]:[padding:4px_6px] [&_small]:text-[10px]"
            aria-label="미션 기록 예시 지도"
          >
            <span className="map-stamp">대구<br />골목</span>
            <span className="map-stamp">추억<br />도착</span>
            <small>미션 다녀온 곳 {recordCount}</small>
          </div>
          <div className="grid [grid-template-columns:repeat(3,_1fr)] gap-[6px] [&_article_>_div]:bg-[#c9eaf5] [&_article_>_div]:h-[85px] [&_article_>_p]:text-[10px] [&_article_>_p]:leading-[1.3] [&_article_>_p]:text-center [&_article_>_p]:[padding:7px_0] [&_>_a]:h-[85px] [&_>_a]:[border:1px_dotted_#111] [&_>_a]:grid [&_>_a]:place-items-center [&_>_a]:text-[10px]">
            {records.map(record => (
              <article key={record.id}>
                <RemotePhoto className="record-photo" photoUrl={record.photoUrl} alt={record.title} />
                <p>{record.title}</p>
              </article>
            ))}
            <Link to="/">다음 퀘스트 찾기</Link>
          </div>
        </>
      ) : (
        <div className="flex flex-col gap-[8px] [&_>_button]:rounded-[23px] [&_>_button]:h-[113px] [&_>_button]:bg-[#c9eaf5] [&_>_button]:text-left [&_>_button]:[padding:21px_14px] [&_>_button]:relative [&_strong]:text-[15px] [&_strong]:font-medium [&_strong]:block [&_strong]:max-w-[76%] [&_strong]:tracking-[-0.5px] [&_small]:text-[10px] [&_small]:text-[#666] [&_small]:block [&_small]:mt-[2px] [&_button_>_span]:inline-block [&_button_>_span]:bg-[#bbb] [&_button_>_span]:rounded-[20px] [&_button_>_span]:text-[9px] [&_button_>_span]:[padding:4px_10px] [&_button_>_span]:mt-[11px] [&_i]:absolute [&_i]:right-[21px] [&_i]:top-[13px] [&_i]:w-[60px] [&_i]:h-[79px] [&_i]:bg-[#fff] [&_i]:[transform:rotate(10deg)] [&_button:nth-child(2)_i]:[transform:rotate(-10deg)]">
          {memories.map((x) => (
            <button
              key={x.id}
              onClick={() => {
                if (x.greetings.length) {
                  setParams({ quest: x.id, message: "0" });
                  setLiked(false);
                } else setError("아직 도착한 안부가 없어요.");
              }}
            >
              <strong>{x.title}</strong>
              <small>{x.sub}</small>
              {x.greetings.length > 0 && <span>안부 {x.greetings.length}통 도착</span>}
              <i className="memory-thumbnail"><RemotePhoto photoUrl={x.photoUrl} alt={x.title} /></i>
            </button>
          ))}
          {memories.length === 0 && <p role="status">등록한 그리움이 없어요.</p>}
          {error && (
            <p className="text-[12px] p-[12px]" role="status">
              {error}
            </p>
          )}
        </div>
      )}
      <Bottom />
    </section>
  );
}
