import { HistoryMap } from "@/features/history/components/HistoryMap";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import { LogOut } from "lucide-react";
import { Back } from "@/shared/components/WireUI";
import { RemotePhoto } from "@/shared/components/RemotePhoto";
import { useMutation, useQueries, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { getAccessToken } from "@/features/auth/utils/tokenStorage";
import { getMyQuests, getMySubmissions } from "../api/myPage";
import { newestFirst } from "../lib/performances";
import { getQuestGreetings, toggleSubmissionLike, type QuestGreetings } from "@/features/quests/api/verification";

import MyPageSummary from "../components/MyPageSummary";
import MemoryQuestCard from "../components/MemoryQuestCard";
import GreetingLetter from "../components/GreetingLetter";
import "../styles/mypage.css";

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
  const summary = (
    <MyPageSummary
      nickname={token ? user?.nickname : undefined}
      email={token ? user?.email : undefined}
      active={history ? "history" : "memories"}
      memoryCount={token && questsQuery.data ? memories.length : null}
      recordCount={token && recordsQuery.data ? recordCount : null}
      hasGreetings={memories.some((memory) => Boolean(memory.passedCount))}
    />
  );
  if (logout)
    return (
      <section className="memory-page mypage-logout">
        <Back />
        <div className="mypage-logout-dialog">
          <h1>로그아웃할까요?</h1>
          <p>다시 로그인하면 내 그리움과 기록을 그대로 볼 수 있어요.</p>
          {error && <p role="alert">{error}</p>}
          <div>
            <Link to="/me/memories">취소</Link>
            <button type="button" onClick={signOut}>로그아웃</button>
          </div>
        </div>
      </section>
    );
  if (message) {
    const sourceQuery = fromRecords ? recordsQuery : questsQuery;
    const loading = Boolean(token && (sourceQuery.isPending || greetingQuery?.isPending));
    const failed = Boolean(token && (sourceQuery.isError || greetingQuery?.isError));
    return (
      <section className="memory-page mypage-greeting">
        {/* 화면 전체를 기준으로 깔아 스크롤 본문과 하단 버튼 뒤까지 이어집니다. */}
        {greeting && <div className="greeting-envelope" aria-hidden="true" />}
        <header ref={messageTop} className="greeting-header">
          <div className="greeting-tools">
            <Back to={backTo} />
            <p>{fromRecords ? "수행한 퀘스트의 안부" : "도착한 안부"} {greeting ? index + 1 : 0}/{greetings.length}</p>
            <Link to="/me/logout" aria-label="로그아웃"><LogOut size={20} /></Link>
          </div>
          <h1>{selected?.title ?? (loading ? "불러오는 중…" : "퀘스트를 찾을 수 없어요")}</h1>
        </header>
        <div ref={greetingBody} className="greeting-reader">
          <GreetingLetter
            greeting={greeting}
            statusMessage={loading ? "안부를 불러오는 중이에요." : failed ? "안부를 불러오지 못했어요." : "아직 도착한 안부가 없어요."}
            loading={loading}
            failed={failed}
            onRetry={() => { void (sourceQuery.isError ? sourceQuery.refetch() : greetingQuery?.refetch()); }}
            canLike={canLike}
            liked={liked}
            pending={likeMutation.isPending}
            likeError={likeMutation.isError && likeMutation.variables?.submissionId === greeting?.submissionId}
            onLike={() => {
              if (canLike && token && greeting && selectedQuestId && !likeMutation.isPending) {
                likeMutation.mutate({ submissionId: greeting.submissionId, questId: selectedQuestId, token });
              }
            }}
          />
        </div>
        <footer className="greeting-footer" aria-label="안부 이동">
          <button type="button" disabled={greetings.length < 2} onClick={() => openGreeting((index + 1) % greetings.length)}>
            다음 안부 보기
          </button>
        </footer>
      </section>
    );
  }
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
        className="mypage-history"
      >
        <div className="mypage-history-header">{summary}</div>
        <div className="mypage-history-map">
          <HistoryMap records={visibleRecords} source="records" token={token} />
          <div
            ref={historyPanel}
            className="mypage-history-panel"
          >
            {historyQuestId && (
              <Link to="/me/history" className="block py-2 text-sm underline">
                내 기록 전체 보기
              </Link>
            )}
            <header>
              <h2>{showOthers ? "다른 수행자 기록" : "수행 기록"} · 최신순</h2>
              <button
                aria-controls="history-record-list"
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
              className="mypage-record-list"
            >
              {historyCards.map(({ key, record, photoUrl, submissionId, performerName }) => (
                <Link
                  key={key}
                  className="mypage-record-card"
                  to={`/me/memories?${new URLSearchParams({
                    source: "records",
                    record: record.id,
                    quest: record.questId ?? record.id,
                    message: "0",
                    returnOthers: showOthers ? "1" : "0",
                    ...(submissionId === undefined ? {} : { submission: String(submissionId) }),
                  })}`}
                >
                  <RemotePhoto photoUrl={photoUrl} alt={record.title} />
                  <h3>
                    {record.title}
                  </h3>
                  {performerName && <p className="truncate text-[10px] text-neutral-600">{performerName} 님</p>}
                  <span className="sr-only">안부 보기</span>
                </Link>
              ))}
              {!showOthers && (
                <Link
                  className="mypage-record-next"
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
    <section className="memory-page mypage-page">
      {summary}
      <div className="mypage-quest-list">
        {memories.map((memory) => (
          <MemoryQuestCard key={memory.id} memory={memory} token={token} onOpen={(item) => {
            if (item.passedCount) {
              setError("");
              setParams({ quest: item.id, message: "0" });
            } else setError("아직 도착한 안부가 없어요.");
          }} />
        ))}
        {memories.length === 0 && <ListStatus query={questsQuery} enabled={Boolean(token)} label="내 그리움을" empty="등록한 그리움이 없어요." />}
        {error && <p className="p-3 text-sm" role="status">{error}</p>}
      </div>
    </section>
  );
}
