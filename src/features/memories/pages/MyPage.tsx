import { HistoryMap } from "@/features/history/components/HistoryMap";
import { HistoryRecordCard, type HistoryCardItem } from "@/features/history/components/HistoryRecordCard";
import PeerGreetingsDrawer from "@/features/history/components/PeerGreetingsDrawer";
import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate, useSearchParams } from "react-router";
import { Back } from "@/shared/components/WireUI";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { getAccessToken } from "@/features/auth/utils/tokenStorage";
import { getMyQuests, getMySubmissions } from "../api/myPage";
import { newestFirst } from "../lib/performances";
import { greetingViewItems, type GreetingView } from "../lib/greetingViews";
import type { RecordItem } from "../types";
import { getQuestGreetings, getVerificationQuest, toggleSubmissionLike, type QuestGreetings } from "@/features/quests/api/verification";

import MyPageSummary from "../components/MyPageSummary";
import MemoryQuestCard from "../components/MemoryQuestCard";
import GreetingEnvelope from "../components/GreetingEnvelope";
import MyPageTabs from "../components/MyPageTabs";
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
  const historyPanel = useRef<HTMLDivElement>(null);
  const historyList = useRef<HTMLDivElement>(null);
  const peerTrigger = useRef<HTMLButtonElement>(null);
  const peerScroll = useRef(new Map<string, number>());
  const [historySelection, setHistorySelection] = useState({ key: "", request: 0 });
  const [previewQuestId, setPreviewQuestId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const queryClient = useQueryClient();
  const { user, retrySession } = useAuth();
  const token = user && user.userId > 0 ? getAccessToken() : null;
  const logout = pathname === "/me/logout";
  const history = pathname === "/me/history";
  const message = params.has("message") || params.get("tab") === "messages";
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
  const previewMemory = !history && !message && !logout ? memories.find((item) => item.id === previewQuestId) : undefined;
  const previewQuery = useQuery({
    queryKey: ["quest-greetings", previewMemory?.id, token],
    queryFn: ({ signal }) => getQuestGreetings(previewMemory!.id, signal),
    enabled: Boolean(token && previewMemory),
    retry: false,
  });
  const previewHasGreetings = Boolean(previewQuery.data?.submissions.some((item) => item.verifyStatus === "PASSED"));
  const historyQuestId = history ? params.get("quest") : null;
  const visibleRecords = useMemo(() => {
    const items = token ? recordsQuery.data ?? [] : [];
    return historyQuestId ? items.filter((item) => item.questId === historyQuestId) : items;
  }, [token, recordsQuery.data, historyQuestId]);
  const source = params.get("source");
  const fromRecords = source === "records" || source === "completed";
  const greetingView: GreetingView = !fromRecords ? "received"
    : params.get("view") === "others" || source === "completed" || params.get("returnOthers") === "1" ? "others" : "mine";
  const questParam = params.get("quest");
  const selectedRecord = fromRecords ? records.find((item) =>
    (params.has("record") ? item.id === params.get("record") : item.questId === questParam)
    && (!questParam || item.questId === questParam)) : undefined;
  const selected = fromRecords
    ? selectedRecord
    : questParam ? memories.find((item) => item.id === questParam) : memories[0];
  const selectedQuestId = fromRecords ? selectedRecord?.questId : selected?.id;
  const historyCards: HistoryCardItem[] = newestFirst(visibleRecords).map((record) => ({
    key: record.id, record, photoUrl: record.photoUrl, createdAt: record.createdAt,
  }));
  const selectedHistoryCard = historyCards.find((item) => item.key === (params.get("record") ?? historySelection.key));
  const selectedHistoryKey = selectedHistoryCard?.key;
  const peerOpen = Boolean(history && params.get("panel") === "others" && selectedHistoryCard?.record.questId);
  const peerExpanded = params.get("expanded") === "1";
  // 수행 기록에는 유형이 없을 수 있어 선택한 퀘스트의 상세 정보로 확인합니다.
  const selectedQuest = useQuery({
    queryKey: ["verification-quest", selectedQuestId, token],
    queryFn: ({ signal }) => getVerificationQuest(selectedQuestId!, signal),
    enabled: Boolean(token && message && selectedQuestId && !selected?.questType),
    staleTime: 60_000,
    retry: false,
  });
  const questType = selected?.questType ?? selectedQuest.data?.questType;
  const greetingQuestId = message ? selectedQuestId : peerOpen ? selectedHistoryCard?.record.questId : undefined;
  const greetingQuery = useQuery({
    queryKey: ["quest-greetings", greetingQuestId, token],
    queryFn: ({ signal }) => getQuestGreetings(greetingQuestId!, signal),
    enabled: Boolean(token && greetingQuestId),
    retry: false,
  });
  function selectHistoryCard(key: string) {
    // 같은 카드를 다시 눌러도 드래그한 지도를 해당 장소로 되돌립니다.
    setHistorySelection((previous) => ({ key, request: previous.request + 1 }));
    setParams((previous) => {
      previous.set("record", key);
      previous.delete("panel");
      previous.delete("expanded");
      return previous;
    }, { replace: true });
  }
  const peerGreetings = greetingViewItems(greetingQuery.data?.submissions ?? [], "others", user?.userId);
  const greetings = greetingViewItems(greetingQuery.data?.submissions ?? [], greetingView, user?.userId, selectedRecord?.id);
  const requested = Number(params.get("message"));
  const requestedId = params.get("submission") ?? (greetingView === "mine" ? selectedRecord?.id : undefined);
  const index = requestedId ? greetings.findIndex((item) => item.id === requestedId) : Number.isFinite(requested)
    ? Math.max(0, Math.min(greetings.length - 1, Math.trunc(requested))) : 0;
  const greeting = greetings[index];
  const liked = greeting?.isLiked ?? false;
  const canLike = Boolean(token && greetingView === "received" && greeting && selectedQuestId && greetingQuery.data?.viewerRole === "AUTHOR");
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
  const returnParams = new URLSearchParams();
  if (selectedRecord) returnParams.set("record", selectedRecord.id);
  if (params.get("historyQuest")) returnParams.set("quest", params.get("historyQuest")!);
  if (greetingView === "others") {
    returnParams.set("panel", "others");
    if (peerExpanded) returnParams.set("expanded", "1");
  }
  const backTo = fromRecords ? `/me/history${returnParams.size ? `?${returnParams}` : ""}` : "/me/memories";
  useEffect(() => {
    if (message) {
      messageTop.current?.scrollIntoView({ block: "start" });
    }
  }, [message, selected?.id, index]);
  useEffect(() => {
    // 응답은 클릭한 퀘스트의 쿼리에만 연결해 이전 카드의 늦은 응답을 무시합니다.
    if (!previewMemory || !previewHasGreetings || previewQuery.isFetching || !previewQuery.isSuccess) return;
    setParams({ quest: previewMemory.id, message: "0" });
  }, [previewMemory, previewHasGreetings, previewQuery.isFetching, previewQuery.isSuccess, setParams]);
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
  }, [history, peerOpen]);
  useEffect(() => {
    const list = historyList.current;
    if (!history || !list || !selectedHistoryKey) return;
    const card = [...list.querySelectorAll<HTMLElement>("[data-history-key]")]
      .find((element) => element.dataset.historyKey === selectedHistoryKey);
    if (card) list.scrollTo({
      left: card.offsetLeft - (list.clientWidth - card.offsetWidth) / 2,
      behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
    });
  }, [history, selectedHistoryKey, historySelection.request, peerOpen]);
  function openGreeting(next: number) {
    setParams((previous) => {
      if (greetingView === "others" && greetings[next]) previous.set("submission", greetings[next].id);
      else previous.delete("submission");
      previous.set("message", String(next));
      return previous;
    }, { replace: greetingView === "others" });
  }
  function recordGreetingPath(record: RecordItem, view: "mine" | "others", submissionId: string) {
    const next = new URLSearchParams({ source: "records", view, record: record.id,
      quest: record.questId!, submission: submissionId, message: "0" });
    if (historyQuestId) next.set("historyQuest", historyQuestId);
    if (peerExpanded) next.set("expanded", "1");
    return `/me/memories?${next}`;
  }
  function closePeers() {
    setParams((previous) => {
      previous.delete("panel"); previous.delete("expanded"); return previous;
    }, { replace: true });
    requestAnimationFrame(() => peerTrigger.current?.focus({ preventScroll: true }));
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
  // 편지나 다른 탭에서 돌아왔을 때 이전 클릭이 편지를 자동으로 다시 열지 않게 합니다.
  if (previewQuestId !== null && (history || message || logout)) setPreviewQuestId(null);
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
    const loading = Boolean(token && (sourceQuery.isPending || (greetingQuestId && greetingQuery.isPending)));
    const failed = Boolean(token && (sourceQuery.isError || (greetingQuestId && greetingQuery.isError)));
    const missingRecordGreeting = fromRecords && !loading && !failed && !greeting;
    const returnOnly = greetingView === "mine" || (greetingView === "others" && (!greeting || greetings.length < 2));
    const emptyMessage = !selected ? "선택한 기록을 찾을 수 없어요." : greetingView === "mine" ? "내가 남긴 안부를 찾을 수 없어요."
      : requestedId && !greeting ? "선택한 안부를 찾을 수 없어요." : greetingView === "others" ? "아직 다른 사람의 안부가 없어요." : "아직 도착한 안부가 없어요.";
    return (
      <section className="memory-page mypage-greeting">
        <header ref={messageTop} className="greeting-header">
          <Back to={backTo} />
          <p>{greetingView === "mine" ? "내가 남긴 안부" : <>{greetingView === "others" ? "다른 사람이 남긴 안부" : "도착한 안부"} {greeting ? index + 1 : 0}/{greetings.length}</>}</p>
          <h1>{selected?.title ?? (loading ? "불러오는 중…" : "퀘스트를 찾을 수 없어요")}</h1>
        </header>
        <GreetingEnvelope
          key={`${selectedQuestId ?? "none"}:${greeting?.id ?? "empty"}`}
          greeting={greeting}
          questType={questType}
          statusMessage={loading ? "안부를 불러오는 중이에요." : failed ? "안부를 불러오지 못했어요." : emptyMessage}
          loading={loading}
          failed={failed || missingRecordGreeting}
          onRetry={() => { void (sourceQuery.isError || !selected ? sourceQuery.refetch() : greetingQuery.refetch({ cancelRefetch: false })); }}
          canLike={canLike}
          liked={liked}
          liking={likeMutation.isPending}
          likeFailed={likeMutation.isError && likeMutation.variables?.submissionId === greeting?.submissionId}
          onLike={() => {
            if (canLike && token && greeting && selectedQuestId && !likeMutation.isPending) {
              likeMutation.mutate({ submissionId: greeting.submissionId, questId: selectedQuestId, token });
            }
          }}
          actionLabel={greetingView === "mine" ? "내 기록으로 돌아가기" : greetingView === "others"
            ? returnOnly ? "목록으로 돌아가기" : "다음 사람의 안부 보기" : "다음 안부 보기"}
          hasNext={returnOnly || greetings.length > 1}
          onNext={() => {
            if (returnOnly) void navigate(backTo, { replace: true });
            else openGreeting((index + 1) % greetings.length);
          }}
        />
      </section>
    );
  }
  if (history) {
    return (
      <MyPageTabs active="history" summary={summary}>
        <div className="mypage-history-map">
          <HistoryMap
            records={visibleRecords}
            token={token}
            selectedRecordId={selectedHistoryCard?.record.id ?? null}
            focusRequest={historySelection.request}
            overlayKey={peerOpen ? "peers" : "records"}
            onSelectRecord={(recordId) => {
              const card = historyCards.find((item) => item.record.id === recordId);
              if (card) selectHistoryCard(card.key);
            }}
          />
          {peerOpen && selectedHistoryCard ? (
            <PeerGreetingsDrawer key={selectedHistoryCard.key} record={selectedHistoryCard.record}
              greetings={peerGreetings} loading={greetingQuery.isPending} failed={greetingQuery.isError}
              expanded={peerExpanded} onExpandedChange={(expanded) => setParams((previous) => {
                if (expanded) previous.set("expanded", "1"); else previous.delete("expanded");
                return previous;
              }, { replace: true })}
              onClose={closePeers} onRetry={() => { void greetingQuery.refetch({ cancelRefetch: false }); }}
              greetingPath={(id) => recordGreetingPath(selectedHistoryCard.record, "others", String(id))}
              restoreScroll={(element) => { if (element) element.scrollTop = peerScroll.current.get(selectedHistoryCard.key) ?? 0; }}
              saveScroll={(top) => { peerScroll.current.set(selectedHistoryCard.key, top); }}
            />
          ) : <div
            ref={historyPanel}
            className="mypage-history-panel"
          >
            {historyQuestId && (
              <Link to="/me/history" className="block py-2 text-sm underline">
                내 기록 전체 보기
              </Link>
            )}
            <header>
              <h2>수행 기록 · 최신순</h2>
            </header>
            <div
              ref={historyList}
              id="history-record-list"
              role="region"
              tabIndex={0}
              aria-label="내 수행 퀘스트 목록"
              className="mypage-record-list"
            >
              {historyCards.map((item) => (
                <HistoryRecordCard key={item.key} item={item}
                  selected={selectedHistoryCard?.key === item.key}
                  onSelect={() => selectHistoryCard(item.key)}
                />
              ))}
              <Link className="mypage-record-next" to="/">다음 퀘스트 찾기</Link>
            </div>
            {selectedHistoryCard ? (
              <div className="mypage-history-actions">
                {selectedHistoryCard.record.questId ? <>
                  <Link to={recordGreetingPath(selectedHistoryCard.record, "mine", selectedHistoryCard.record.id)}>내가 남긴 안부 보기</Link>
                  <button ref={peerTrigger} type="button" onClick={() => setParams((previous) => {
                    previous.set("record", selectedHistoryCard.record.id);
                    previous.set("panel", "others"); return previous;
                  })}>다른 사람 안부</button>
                </> : <span>퀘스트 정보를 찾을 수 없어요.</span>}
              </div>
            ) : historyCards.length > 0 && (
              <p className="mypage-history-hint">기록을 누르면 장소와 안부를 확인할 수 있어요.</p>
            )}
            {visibleRecords.length === 0 && (
              <ListStatus query={recordsQuery} enabled={Boolean(token)} label="수행 기록을" empty="아직 수행한 기록이 없어요." />
            )}
          </div>}
        </div>
      </MyPageTabs>
    );
  }
  return (
    <MyPageTabs active="memories" summary={summary}>
      <div className="mypage-quest-list">
        {memories.map((memory) => (
          <MemoryQuestCard key={memory.id} memory={memory} token={token}
            previewStatus={previewMemory?.id !== memory.id ? null
              : previewQuery.isFetching || previewQuery.isPending ? "loading"
              : previewQuery.isError || !token ? "error" : previewHasGreetings ? "loading" : "empty"}
            onRetry={() => { void previewQuery.refetch({ cancelRefetch: false }); }}
            onOpen={(item) => setPreviewQuestId((previous) => previous === item.id ? null : item.id)}
          />
        ))}
        {memories.length === 0 && <ListStatus query={questsQuery} enabled={Boolean(token)} label="내 그리움을" empty="등록한 그리움이 없어요." />}
      </div>
    </MyPageTabs>
  );
}
