import { HistoryMap } from "@/features/history/components/HistoryMap";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import { Heart, LogOut } from "lucide-react";
import { Back, Profile } from "@/shared/components/WireUI";
import { RemotePhoto } from "@/shared/components/RemotePhoto";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { getAccessToken } from "@/features/auth/utils/tokenStorage";
import { getMyQuests, getMySubmissions } from "../api/myPage";
import { newestFirst } from "../lib/performances";
import type { Memory } from "../types";
import { getQuestGreetings, getVerificationQuest, toggleSubmissionLike, type QuestGreetings } from "@/features/quests/api/verification";

function MemoryThumbnail({ memory, token }: { memory: Memory; token: string | null }) {
  const detail = useQuery({
    queryKey: ["verification-quest", memory.id, token],
    queryFn: ({ signal }) => getVerificationQuest(memory.id, signal),
    enabled: Boolean(token) && !memory.photoUrl,
    staleTime: 60_000,
    retry: false,
  });

  return (
    <i className="memory-thumbnail">
      <RemotePhoto photoUrl={memory.photoUrl ?? detail.data?.photoUrl} alt={memory.title} />
    </i>
  );
}

function ListStatus({ query, enabled, label, empty }: {
  query: { isPending: boolean; isError: boolean; refetch: () => unknown };
  enabled: boolean;
  label: string;
  empty: string;
}) {
  if (enabled && query.isError) {
    return (
      <p role="alert" className="py-2 text-xs">
        {label} 불러오지 못했어요.{" "}
        <button className="underline" onClick={() => { void query.refetch(); }}>다시 시도</button>
      </p>
    );
  }
  return <p role="status" className="py-2 text-xs">{enabled && query.isPending ? `${label} 불러오는 중이에요.` : empty}</p>;
}

export default function MyPage() {
  const { pathname } = useLocation();
  const [params, setParams] = useSearchParams();
  const navigate = useNavigate();
  const messageTop = useRef<HTMLElement>(null);
  const greetingBody = useRef<HTMLDivElement>(null);
  const historyPanel = useRef<HTMLDivElement>(null);
  const [error, setError] = useState("");
  const queryClient = useQueryClient();
  const { user, retrySession } = useAuth();
  const token = user && user.userId > 0 ? getAccessToken() : null;
  const logout = pathname === "/me/logout";
  const history = pathname === "/me/history";
  const message = params.has("message") || params.get("tab") === "messages";
  const showOthers = params.get("showOthers") === "1";
  const questsQuery = useQuery({
    queryKey: ["my-quests", user?.userId],
    queryFn: ({ signal }) => getMyQuests(token!, signal),
    enabled: Boolean(token) && !logout,
  });
  const recordsQuery = useQuery({
    queryKey: ["my-submissions", user?.userId],
    queryFn: ({ signal }) => getMySubmissions(token!, signal),
    enabled: Boolean(token) && !logout,
  });
  const memories = token ? questsQuery.data ?? [] : [];
  const records = token ? recordsQuery.data ?? [] : [];
  const historyQuestId = history ? params.get("quest") : null;
  const visibleRecords = useMemo(() => {
    const items = token ? recordsQuery.data ?? [] : [];
    return historyQuestId ? items.filter((item) => item.questId === historyQuestId) : items;
  }, [token, recordsQuery.data, historyQuestId]);
  const source = params.get("source");
  const fromRecords = source === "records" || source === "completed";
  const questParam = params.get("quest");
  const selected = fromRecords
    ? records.find((item) => params.has("record") ? item.id === params.get("record") : item.questId === questParam)
    : questParam ? memories.find((item) => item.id === questParam) : memories[0];
  const selectedQuestId = selected && ("questId" in selected ? selected.questId : selected.id);
  const peerQuestIds = history && showOthers
    ? [...new Set(visibleRecords.map((record) => record.questId).filter((id): id is string => Boolean(id)))]
    : [];
  const greetingQuestIds = message && selectedQuestId ? [selectedQuestId] : peerQuestIds;
  const greetingQueries = useQueries({
    queries: greetingQuestIds.map((questId) => ({
      queryKey: ["quest-greetings", questId, token],
      queryFn: ({ signal }: { signal: AbortSignal }) => getQuestGreetings(questId, signal),
      enabled: Boolean(token),
      retry: false,
    })),
  });
  const greetingQuery = message ? greetingQueries[0] : undefined;
  const greetings = newestFirst((greetingQuery?.data?.submissions ?? [])
    .filter((item) => item.verifyStatus === "PASSED")
    .map((item) => ({
      id: String(item.submissionId),
      submissionId: item.submissionId,
      isLiked: item.isLiked,
      greeting: item.greeting,
      photoUrl: item.photoUrl,
      senderName: item.performer.nickname,
      isMine: item.performer.userId === user?.userId,
      createdAt: item.createdAt,
    })));
  const requested = Number(params.get("message"));
  const linkedGreeting = greetings.findIndex((item) => item.id === params.get("submission"));
  const index = linkedGreeting >= 0 ? linkedGreeting : Number.isFinite(requested)
    ? Math.max(0, Math.min(greetings.length - 1, Math.trunc(requested)))
    : 0;
  const greeting = greetings[index];
  const liked = greeting?.isLiked ?? false;
  const canLike = Boolean(token && greeting && selectedQuestId && greetingQuery?.data?.viewerRole === "AUTHOR");
  const likeMutation = useMutation({
    mutationFn: ({ submissionId }: { submissionId: number; questId: string; token: string }) =>
      toggleSubmissionLike(submissionId),
    retry: false,
    onMutate: ({ questId, token }) => queryClient.cancelQueries({ queryKey: ["quest-greetings", questId, token] }),
    onSuccess: (result, { questId, token }) => {
      queryClient.setQueryData<QuestGreetings>(["quest-greetings", questId, token], (current) =>
        current && {
          ...current,
          submissions: current.submissions.map((item) =>
            item.submissionId === result.submissionId ? { ...item, isLiked: result.isLiked } : item,
          ),
        },
      );
    },
    onError: (_error, { questId, token }) =>
      queryClient.invalidateQueries({ queryKey: ["quest-greetings", questId, token] }),
  });
  const recordCount = records.length;
  const backTo =
    source === "completed"
      ? "/me/history?showOthers=1"
      : source === "records"
        ? `/me/history${params.get("returnOthers") === "1" ? "?showOthers=1" : ""}`
        : "/me/memories";
  useEffect(() => {
    if (message) {
      messageTop.current?.scrollIntoView({ block: "start" });
      greetingBody.current?.scrollTo({ top: 0 });
    }
  }, [message, selected?.id, index]);
  useEffect(() => {
    const panel = historyPanel.current;
    if (!history || !panel) return;
    const update = () =>
      panel.parentElement?.style.setProperty(
        "--history-panel-height",
        `${panel.offsetHeight}px`,
      );
    const observer = new ResizeObserver(update);
    observer.observe(panel);
    update();
    return () => observer.disconnect();
  }, [history]);
  function openGreeting(next: number) {
    setParams((previous) => {
      previous.delete("submission");
      previous.set("message", String(next));
      return previous;
    });
  }
  async function signOut() {
    try {
      localStorage.removeItem("accessToken");
      localStorage.removeItem("refreshToken");
      sessionStorage.removeItem("accessToken");
      await retrySession();
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
      <section className="memory-page flex h-full min-h-0! flex-col overflow-hidden p-0!">
        <header
          ref={messageTop}
          className="flex shrink-0 items-center gap-[10px] px-[15px] pt-3 mb-[15px] [&_>_div]:flex-1 [&_small]:text-[10px] [&_small]:block [&_strong]:text-[15px] [&_strong]:block [&_strong]:tracking-[-0.5px]"
        >
          <Back to={backTo} />
          <div>
            <small>
              {fromRecords
                ? "수행한 퀘스트의 안부"
                : "내 그리움에 도착한 안부"}{" "}
              {greeting ? index + 1 : 0}/{greetings.length}
            </small>
            <strong>{selected?.title ?? (token && (fromRecords ? recordsQuery : questsQuery).isPending ? "불러오는 중…" : "퀘스트를 찾을 수 없어요")}</strong>
          </div>
          <Link
            className="h-[54px] w-[54px] rounded-full bg-[#c9eaf5] inline-flex items-center justify-center shrink-0 [&_svg]:[stroke-width:1.25]"
            to="/me/logout"
            aria-label="로그아웃"
          >
            <LogOut size={21} />
          </Link>
        </header>
        <div ref={greetingBody} className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-[15px] pb-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">

        <article className="message-envelope rounded-[24px] bg-[#fff] flex-1 relative overflow-hidden [padding:20px_14px] flex flex-col items-center min-h-[650px] [&_>_small]:text-[10px] [&_>_small]:z-[1]">
          <RemotePhoto
            className="postcard-photo"
            photoUrl={greeting?.photoUrl}
            alt="도착한 안부 사진"
          />
          <p className="text-[20px] leading-[1.3] whitespace-pre-line text-center [margin:22px_0_10px] z-[1]">
            {greeting?.greeting ?? (greetingQuery?.isPending ? "안부를 불러오는 중이에요." : greetingQuery?.isError ? "안부를 불러오지 못했어요." : "아직 도착한 안부가 없어요.")}
          </p>
          <small>
            {greeting
              ? `From. ${greeting.senderName}${greeting.createdAt ? ` | ${greeting.createdAt.slice(0, 10)}` : ""}`
              : ""}
          </small>
          <div className="absolute [inset:38%_0_0] bg-[#c9eaf5] [clip-path:polygon(0_0,_50%_37%,_100%_0,_100%_100%,_0_100%)]" />
          {canLike && <div className="relative mt-auto z-[1] text-center pt-[90px] [&_:is(a,button)]:h-[66px] [&_:is(a,button)]:w-[66px] [&_:is(a,button)]:bg-[#242624] [&_.liked]:bg-[#999] [&_p]:text-[11px] [&_p]:[margin:12px_0_34px]">
            <button
              className={`h-[54px] w-[54px] rounded-full bg-[#c9eaf5] inline-flex items-center justify-center shrink-0 [&_svg]:[stroke-width:1.25] ${liked ? "liked" : ""}`}
              aria-label="안부 좋아요"
              aria-pressed={liked}
              disabled={likeMutation.isPending}
              onClick={() => {
                if (token && greeting && selectedQuestId && !likeMutation.isPending) {
                  likeMutation.mutate({ submissionId: greeting.submissionId, questId: selectedQuestId, token });
                }
              }}
            >
              <Heart fill={liked ? "currentColor" : "none"} />
            </button>
            <p>
              {liked
                ? "고마운 마음을 전했어요"
                : "좋아요로 고마움을 전해보세요"}
            </p>
            {likeMutation.isError && likeMutation.variables.submissionId === greeting?.submissionId && (
              <p role="alert">좋아요를 변경하지 못했어요. 다시 시도해 주세요.</p>
            )}
          </div>}

        </article>
        <section
          aria-label="수행 글 목록"
          className="mt-4 rounded-2xl bg-white p-3 text-[#242624]"
        >
          <h2 className="mb-2 text-sm font-semibold">
            {fromRecords
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
            <ListStatus query={greetingQuery ?? (fromRecords ? recordsQuery : questsQuery)} enabled={Boolean(token)} label="안부를" empty="아직 등록된 수행 글이 없어요." />
          )}
        </section>
        </div>
        <footer aria-label="안부 이동" className="shrink-0 px-[15px] pt-3 pb-[max(26px,env(safe-area-inset-bottom,0px))]">
          <button
            className="h-[62px] w-full rounded-[36px] bg-[#242624] text-[15px] text-white disabled:cursor-default disabled:opacity-50"
            disabled={greetings.length < 2}
            onClick={() => {
              openGreeting((index + 1) % greetings.length);
            }}
          >
            다음 안부 보기
          </button>
        </footer>
      </section>
    );
  if (history) {
    const peerRecords = showOthers
      ? newestFirst(peerQuestIds.flatMap((questId, index) => {
          const record = visibleRecords.find((item) => item.questId === questId);
          if (!record) return [];
          return (greetingQueries[index]?.data?.submissions ?? [])
            .filter((item) => item.verifyStatus === "PASSED" && item.performer.userId !== user?.userId)
            .map((item) => ({
              record,
              submissionId: item.submissionId,
              photoUrl: item.photoUrl,
              createdAt: item.createdAt,
              performerName: item.performer.nickname,
            }));
        }))
      : [];
    const historyCards = showOthers
      ? peerRecords.map((peer) => ({ ...peer, key: `peer-${peer.submissionId}` }))
      : visibleRecords.map((record) => ({
          key: record.id,
          record,
          photoUrl: record.photoUrl,
          submissionId: undefined,
          performerName: undefined,
        }));
    const peerStatus = greetingQueries.find((query) => query.isError)
      ?? greetingQueries.find((query) => query.isPending);
    return (
      <section
        aria-label="내 수행 기록 지도 화면"
        className="absolute inset-0 isolate flex flex-col overflow-hidden bg-white"
      >
        <div className="relative z-10 shrink-0 bg-white px-[15px] pb-3 pt-3">
          <Profile nickname={token ? user?.nickname : undefined} email={token ? user?.email : undefined} />
          <div className="grid [grid-template-columns:1fr_1fr] gap-[6px] mb-0 [&_>_a]:h-[96px] [&_>_a]:rounded-[23px] [&_>_a]:bg-white/95 [&_>_a]:flex [&_>_a]:flex-col [&_>_a]:[padding:16px_14px_12px] [&_>_a]:relative [&_>_a]:justify-end [&_>_a.selected]:bg-[#c9eaf5] [&_strong]:font-normal [&_strong]:text-[38px] [&_strong]:leading-[1.05] [&_small]:text-[12px] [&_small]:mt-[4px]">
            <Link to="/me/memories" className="bg-[#e5e5e5]! text-[#242624]">
              <span className="text-[10px] absolute right-[12px] top-[14px] rounded-[15px] [padding:4px_7px] bg-[#dedede]">
                도착한 안부
              </span>
              <strong>{questsQuery.data ? memories.length : "–"}</strong>
              <small>내 그리움</small>
            </Link>
            <Link to="/me/history" className={history ? "selected" : ""}>
              <strong>{recordsQuery.data ? recordCount : "–"}</strong>
              <small>내 기록</small>
            </Link>
          </div>
        </div>
        <div className="relative min-h-0 flex-1">
          <HistoryMap records={visibleRecords} source="records" token={token} />
          <div
            ref={historyPanel}
            className="absolute inset-x-4 bottom-[124px] z-10 max-h-[min(max(120px,calc(100%_-_190px)),max(0px,calc(100%_-_136px)))] overflow-x-hidden overflow-y-auto overscroll-y-contain rounded-2xl bg-white/95 p-3 shadow-lg backdrop-blur-sm"
          >
            {historyQuestId && (
              <Link to="/me/history" className="block py-2 text-sm underline">
                내 기록 전체 보기
              </Link>
            )}
            <header className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h2 className="text-[11px] font-medium">{showOthers ? "다른 수행자 기록" : "수행 기록"} · 최신순</h2>
              <button
                aria-controls="history-record-list"
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
                {showOthers
                  ? "내 기록 보기"
                  : "다른 수행자 기록 보기"}
              </button>
            </header>
            <div
              key={String(showOthers)}
              id="history-record-list"
              role="region"
              tabIndex={0}
              aria-label={showOthers ? "다른 수행자 기록 목록" : "내 수행 퀘스트 목록"}
              className="relative grid w-full min-w-0 grid-flow-col auto-cols-[calc((100%_-_1rem)/3)] snap-x snap-proximity gap-2 overflow-x-auto overscroll-x-contain pb-2 [scrollbar-width:thin]"
            >
              {historyCards.map(({ key, record, photoUrl, submissionId, performerName }) => (
                <Link
                  key={key}
                  className="min-w-0 snap-start rounded-xl bg-[#edf4f6] p-2 text-[#242624]"
                  to={`/me/memories?${new URLSearchParams({
                    source: "records",
                    record: record.id,
                    quest: record.questId ?? record.id,
                    message: "0",
                    returnOthers: showOthers ? "1" : "0",
                    ...(submissionId === undefined ? {} : { submission: String(submissionId) }),
                  })}`}
                >
                  <RemotePhoto className="h-16 w-full rounded-lg!" photoUrl={photoUrl} alt={record.title} />
                  <h3 className="mt-1 text-xs font-medium leading-snug [overflow-wrap:anywhere]">
                    {record.title}
                  </h3>
                  {performerName && <p className="truncate text-[10px] text-neutral-600">{performerName} 님</p>}
                  <span className="sr-only">안부 보기</span>
                </Link>
              ))}
              {!showOthers && (
                <Link
                  className="grid min-w-0 snap-start place-items-center rounded-lg border border-dotted border-neutral-400 bg-white/80 p-2 text-center text-xs"
                  to="/"
                >
                  다음 퀘스트 찾기
                </Link>
              )}
            </div>
            {showOthers && visibleRecords.length > 0 && (
              peerStatus
                ? <ListStatus query={peerStatus} enabled={Boolean(token)} label="다른 수행 기록을" empty="" />
                : historyCards.length === 0 && <p role="status" className="py-2 text-xs">다른 수행자의 기록이 아직 없어요.</p>
            )}
            {visibleRecords.length === 0 && (
              <ListStatus query={recordsQuery} enabled={Boolean(token)} label="수행 기록을" empty="아직 수행한 기록이 없어요." />
            )}
          </div>
        </div>
      </section>
    );
  }
  return (
    <section className="memory-page [padding:12px_15px_100px] min-h-[790px] relative flex-1 max-[500px]:[min-height:calc(100dvh_-_54px)]">
      <Profile nickname={token ? user?.nickname : undefined} email={token ? user?.email : undefined} />
      <div className="grid [grid-template-columns:1fr_1fr] gap-[6px] mb-[16px] [&_>_a]:h-[115px] [&_>_a]:rounded-[23px] [&_>_a]:bg-[#c9eaf5] [&_>_a]:flex [&_>_a]:flex-col [&_>_a]:[padding:25px_14px_13px] [&_>_a]:relative [&_>_a]:justify-end [&_>_a.selected]:bg-[#242624] [&_strong]:font-normal [&_strong]:text-[45px] [&_strong]:leading-[1.05] [&_small]:text-[12px] [&_small]:mt-[4px]">
        <Link to="/me/memories" className={!history ? "selected" : ""}>
          <span className="text-[10px] absolute right-[12px] top-[14px] rounded-[15px] [padding:4px_7px] bg-[#dedede]">
            도착한 안부
          </span>
          <strong>{questsQuery.data ? memories.length : "–"}</strong>
          <small>내 그리움</small>
        </Link>
        <Link to="/me/history" className="bg-[#e5e5e5]! text-[#242624]">
          <strong>{recordsQuery.data ? recordCount : "–"}</strong>
          <small>내 기록</small>
        </Link>
      </div>

      <div className="flex flex-col gap-[8px] [&_>_button]:rounded-[23px] [&_>_button]:h-[113px] [&_>_button]:bg-[#c9eaf5] [&_>_button]:text-left [&_>_button]:[padding:21px_14px] [&_>_button]:relative [&_strong]:text-[15px] [&_strong]:font-medium [&_strong]:block [&_strong]:max-w-[76%] [&_strong]:tracking-[-0.5px] [&_small]:text-[10px] [&_small]:text-[#666] [&_small]:block [&_small]:mt-[2px] [&_button_>_span]:inline-block [&_button_>_span]:bg-[#bbb] [&_button_>_span]:rounded-[20px] [&_button_>_span]:text-[9px] [&_button_>_span]:[padding:4px_10px] [&_button_>_span]:mt-[11px] [&_i]:absolute [&_i]:right-[21px] [&_i]:top-[13px] [&_i]:w-[60px] [&_i]:h-[79px] [&_i]:bg-[#fff] [&_i]:[transform:rotate(10deg)] [&_button:nth-child(2)_i]:[transform:rotate(-10deg)]">
        {memories.map((x) => (
          <button
            key={x.id}
            onClick={() => {
              if (x.passedCount) {
                setParams({ quest: x.id, message: "0" });
              } else setError("아직 도착한 안부가 없어요.");
            }}
          >
            <strong>{x.title}</strong>
            <small>{x.sub}</small>
            {Boolean(x.passedCount) && (
              <span>안부 {x.passedCount}통 도착</span>
            )}
            <MemoryThumbnail memory={x} token={token} />
          </button>
        ))}
        {memories.length === 0 && <ListStatus query={questsQuery} enabled={Boolean(token)} label="내 그리움을" empty="등록한 그리움이 없어요." />}
        {error && (
          <p className="text-[12px] p-[12px]" role="status">
            {error}
          </p>
        )}
      </div>
    </section>
  );
}
