import { HistoryMap } from "@/features/history/components/HistoryMap";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import { Heart, LogOut } from "lucide-react";
import { Back, Profile } from "@/shared/components/WireUI";
import { RemotePhoto } from "@/shared/components/RemotePhoto";
import type { MyPageData } from "@/features/memories/types";
import {
  newestFirst,
  recordMemory,
  otherPerformances,
} from "@/features/memories/lib/performances";
import {
  previewMemories,
  previewCompletedRecords,
  previewRecordLocation,
} from "@/features/memories/data/preview";
import type { RecordItem } from "@/features/memories/types";
import { readHistory } from "@/shared/lib/demo";
// The router uses previews until the backend publishes response DTOs.
// Supply mapped API data through this boundary without changing the UI.
export default function MyPage({ data }: { data?: MyPageData } = {}) {
  const { pathname } = useLocation();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const messageTop = useRef<HTMLElement>(null);
  const [liked, setLiked] = useState(false);
  const [error, setError] = useState("");
  const memories = data?.memories ?? previewMemories;
  const records: RecordItem[] = newestFirst(
    data?.records ??
      readHistory().map((entry) => ({
        id: entry.id,
        questId: entry.id,
        location: entry.location ?? previewRecordLocation(entry.id),
        title: entry.title,
        photoUrl: null,
        createdAt: entry.createdAt ?? entry.date,
        greetings: entry.message
          ? [
              {
                id: `local-${entry.id}`,
                greeting: entry.message,
                photoUrl: null,
                senderName: "나",
                isMine: true,
                createdAt: entry.createdAt ?? entry.date,
              },
            ]
          : undefined,
      })),
  );
  const completedRecords = newestFirst(
    data?.completedRecords ?? (data ? [] : previewCompletedRecords),
  );
  const showOthers = params.get("showOthers") === "1";
  const relatedOtherRecords = otherPerformances(records, completedRecords);
  const historyQuestId =
    pathname === "/me/history" ? params.get("quest") : null;
  const visibleRecords = records.filter(
    (item) => !historyQuestId || (item.questId ?? item.id) === historyQuestId,
  );
  const source = params.get("source");
  const sourceRecords = source === "completed" ? completedRecords : records;
  const requestedRecord = sourceRecords.find(
    (item) =>
      item.id === params.get("record") ||
      (!params.has("record") &&
        (item.questId ?? item.id) === params.get("quest")),
  );
  const selected =
    source === "records" || source === "completed"
      ? requestedRecord &&
        recordMemory(requestedRecord, memories, [
          ...records,
          ...completedRecords,
        ])
      : params.has("quest")
        ? memories.find((item) => item.id === params.get("quest"))
        : memories[0];
  const greetings = newestFirst(selected?.greetings ?? []);
  const requested = Number(params.get("message"));
  const index = Number.isFinite(requested)
    ? Math.max(0, Math.min(greetings.length - 1, Math.trunc(requested)))
    : 0;
  const greeting = greetings[index];
  const message = params.has("message") || params.get("tab") === "messages";
  const history = pathname === "/me/history";
  const logout = pathname === "/me/logout";
  const recordCount = records.length;
  const backTo =
    source === "completed"
      ? "/me/history?showOthers=1"
      : source === "records"
        ? `/me/history${params.get("returnOthers") === "1" ? "?showOthers=1" : ""}`
        : "/me/memories";
  useEffect(() => {
    if (message) messageTop.current?.scrollIntoView({ block: "start" });
  }, [message, selected?.id, index]);
  function openGreeting(next: number) {
    setParams((previous) => {
      previous.set("message", String(next));
      return previous;
    });
    setLiked(false);
  }
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
        <header
          ref={messageTop}
          className="flex items-center gap-[10px] mb-[15px] [&_>_div]:flex-1 [&_small]:text-[10px] [&_small]:block [&_strong]:text-[15px] [&_strong]:block [&_strong]:tracking-[-0.5px]"
        >
          <Back to={backTo} />
          <div>
            <small>
              {source === "records" || source === "completed"
                ? "수행한 퀘스트의 안부"
                : "내 그리움에 도착한 안부"}{" "}
              {greeting ? index + 1 : 0}/{greetings.length}
            </small>
            <strong>{selected?.title ?? "퀘스트를 찾을 수 없어요"}</strong>
          </div>
          <Link
            className="h-[54px] w-[54px] rounded-full bg-[#c9eaf5] inline-flex items-center justify-center shrink-0 [&_svg]:[stroke-width:1.25]"
            to="/me/logout"
            aria-label="로그아웃"
          >
            <LogOut size={21} />
          </Link>
        </header>
        <section
          aria-label="수행 글 목록"
          className="mb-4 rounded-2xl bg-white p-3 text-[#242624]"
        >
          <h2 className="mb-2 text-sm font-semibold">
            {source === "records" || source === "completed"
              ? "나와 다른 수행자의 안부 · 최신순"
              : "도착한 수행 안부 · 최신순"}
          </h2>
          {greetings.length ? (
            <ol className="flex flex-col gap-2">
              {greetings.map((item, position) => (
                <li key={item.id}>
                  <button
                    className={`w-full rounded-xl p-3 text-left text-sm ${position === index ? "bg-[#c9eaf5]" : "bg-neutral-100"}`}
                    aria-current={position === index ? "true" : undefined}
                    onClick={() => openGreeting(position)}
                  >
                    <span className="block font-medium">
                      {item.senderName}
                      {item.isMine && (
                        <span className="ml-2 rounded-full bg-white px-2 py-0.5 text-[10px]">
                          내가 보낸 안부
                        </span>
                      )}
                    </span>
                    <span className="block truncate">{item.greeting}</span>
                    <time
                      className="text-xs text-neutral-500"
                      dateTime={item.createdAt}
                    >
                      {item.createdAt
                        ? item.createdAt.slice(0, 10)
                        : "등록일 정보 없음"}
                    </time>
                  </button>
                </li>
              ))}
            </ol>
          ) : (
            <p className="text-sm" role="status">
              아직 등록된 수행 글이 없어요.
            </p>
          )}
        </section>
        <article className="message-envelope rounded-[24px] bg-[#fff] flex-1 relative overflow-hidden [padding:20px_14px] flex flex-col items-center min-h-[650px] [&_>_small]:text-[10px] [&_>_small]:z-[1]">
          <RemotePhoto
            className="postcard-photo"
            photoUrl={greeting?.photoUrl}
            alt="도착한 안부 사진"
          />
          <p className="text-[20px] leading-[1.3] whitespace-pre-line text-center [margin:22px_0_10px] z-[1]">
            {greeting?.greeting ?? "아직 도착한 안부가 없어요."}
          </p>
          <small>
            {greeting
              ? `From. ${greeting.senderName}${greeting.createdAt ? ` | ${greeting.createdAt.slice(0, 10)}` : ""}`
              : ""}
          </small>
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
              openGreeting((index + 1) % greetings.length);
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
          <HistoryMap records={visibleRecords} source="records" />
          {historyQuestId && (
            <Link to="/me/history" className="block py-2 text-sm underline">
              내 기록 전체 보기
            </Link>
          )}
          <div
            aria-label="내 수행 퀘스트 사진"
            className="grid grid-cols-3 gap-2"
          >
            {visibleRecords.map((record) => (
              <Link
                key={record.id}
                className="min-w-0 text-center text-[#242624]"
                to={`/me/memories?${new URLSearchParams({ source: "records", record: record.id, quest: record.questId ?? record.id, message: "0", returnOthers: showOthers ? "1" : "0" })}`}
              >
                <RemotePhoto
                  className="aspect-square w-full rounded-none!"
                  photoUrl={record.photoUrl}
                  alt={record.title}
                />
                <h3 className="pt-2 text-[10px] font-normal leading-snug">
                  {record.title}
                </h3>
                <span className="sr-only">나와 다른 수행자의 안부 보기</span>
              </Link>
            ))}
            <Link
              className="grid aspect-square place-items-center border border-dotted border-neutral-400 p-2 text-center text-[10px]"
              to="/"
            >
              다음 퀘스트 찾기
            </Link>
          </div>
          <header className="mt-4 mb-2 flex items-center justify-between gap-3">
            <h2 className="text-[11px] font-medium">수행 기록 · 최신순</h2>
            <button
              aria-expanded={showOthers}
              aria-controls="other-performance-list"
              className="rounded-full bg-[#242624] px-3 py-2 text-xs text-white"
              onClick={() =>
                setParams((previous) => {
                  if (showOthers) previous.delete("showOthers");
                  else previous.set("showOthers", "1");
                  previous.delete("scope");
                  return previous;
                })
              }
            >
              {showOthers ? "다른 수행자 기록 숨기기" : "다른 수행자 기록 보기"}
            </button>
          </header>
          <p className="sr-only">
            {showOthers
              ? "내가 수행한 퀘스트의 다른 수행 기록도 함께 보여요."
              : "내가 수행한 퀘스트만 보여요. 안부를 열면 다른 수행자의 글도 함께 볼 수 있어요."}
          </p>
          {showOthers && (
            <div
              id="other-performance-list"
              className="mt-3 flex flex-col gap-3"
            >
              {visibleRecords.map((record) => {
                const peers = relatedOtherRecords.filter(
                  (item) =>
                    (item.questId ?? item.id) === (record.questId ?? record.id),
                );
                return (
                  <section
                    key={record.id}
                    aria-label={`${record.title} 다른 수행자 기록`}
                    className="rounded-xl bg-white p-3 text-[#242624]"
                  >
                    <h3 className="mb-2 text-xs font-semibold">
                      {record.title} · 다른 수행 기록 {peers.length}건
                    </h3>
                    {peers.length ? (
                      <ul className="flex flex-col gap-2">
                        {peers.map((peer) => (
                          <li key={peer.id}>
                            <Link
                              className="block rounded-lg bg-[#edf4f6] p-3 text-xs"
                              to={`/me/memories?${new URLSearchParams({ source: "records", record: record.id, quest: record.questId ?? record.id, message: "0", returnOthers: "1" })}`}
                            >
                              <span>
                                {peer.performerName ?? "다른 수행자"} ·{" "}
                                {peer.title}
                              </span>
                              <time
                                className="mt-1 block text-[10px] text-neutral-500"
                                dateTime={peer.createdAt}
                              >
                                {peer.createdAt?.slice(0, 10) ??
                                  "등록일 정보 없음"}
                              </time>
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className="text-xs text-neutral-500">
                        다른 수행자의 기록이 아직 없어요.
                      </p>
                    )}
                  </section>
                );
              })}
            </div>
          )}
          {visibleRecords.length === 0 && (
            <p role="status" className="py-5 text-sm">
              아직 수행한 기록이 없어요.
            </p>
          )}
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
              {x.greetings.length > 0 && (
                <span>안부 {x.greetings.length}통 도착</span>
              )}
              <i className="memory-thumbnail">
                <RemotePhoto photoUrl={x.photoUrl} alt={x.title} />
              </i>
            </button>
          ))}
          {memories.length === 0 && (
            <p role="status">등록한 그리움이 없어요.</p>
          )}
          {error && (
            <p className="text-[12px] p-[12px]" role="status">
              {error}
            </p>
          )}
        </div>
      )}
    </section>
  );
}
