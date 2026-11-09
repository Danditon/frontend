import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { isAxiosError } from "axios";
import { Back } from "@/shared/components/WireUI";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getDistanceMeters } from "./home/utils/getNearestQuest";
import { useGeolocation, type UserPosition } from "@/features/quests/hooks/useGeolocation";
import { getAccessToken, getVerificationQuest, isQuestId, submitVerification, createSubmissionForm, verificationError, similarityPercent, type VerificationResult } from "@/features/quests/api/verification";
import { decodeQuestPhoto } from "@/features/quests/lib/questPhoto";
import VerificationForm from "./verification/VerificationForm";
import VerificationProgress from "./verification/VerificationProgress";
import VerificationSuccess from "./verification/VerificationSuccess";
import VerificationNotice from "./verification/VerificationNotice";
type Phase = "editing" | "locating" | "verifying" | "checking-result" | "success"
  | "failed" | "out-of-range" | "location-error" | "request-error";
export default function QuestVerifyPage() {
  const { questId = "" } = useParams();
  const id = isQuestId(questId) ? questId : "";
  return <VerificationScreen key={id} questId={id} />;
}
function VerificationScreen({ questId }: { questId: string }) {
  // 화면 컴포넌트가 바뀌어도 초안과 제출 요청은 부모에서 유지합니다.
  const input = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [mix, setMix] = useState(50);
  const [error, setError] = useState("");
  const [measuredDistance, setMeasuredDistance] = useState<number | null>(null);
  const [phase, setPhase] = useState<Phase>("editing");
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [needsStatusCheck, setNeedsStatusCheck] = useState(false);
  const submitting = useRef(false);
  const request = useRef<AbortController | null>(null);
  const token = getAccessToken();
  const queryClient = useQueryClient();
  const location = useGeolocation();
  const detail = useQuery({ queryKey: ['verification-quest', questId, token], queryFn: ({ signal }) => getVerificationQuest(questId, signal), enabled: isQuestId(questId) && Boolean(token), retry: false });
  const quest = detail.data;
  const general = quest?.questType === 'GENERAL';
  const busy = phase === "locating" || phase === "verifying" || phase === "checking-result";
  const percent = similarityPercent(result?.similarity);
  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo); }, [photo]);
  useEffect(() => () => request.current?.abort(), []);

  function invalidateCompletedQuest() {
    void queryClient.invalidateQueries({ queryKey: ['quest-greetings', questId] });
    void queryClient.invalidateQueries({ queryKey: ['my-submissions'] });
    void queryClient.invalidateQueries({ queryKey: ['quests'] });
    void queryClient.invalidateQueries({ queryKey: ['verification-quest', questId] });
  }

  function returnToForm() {
    // 사진·안부와 미확정 전송 상태를 보존한 채 입력 화면으로 돌아갑니다.
    setResult(null);
    if (!needsStatusCheck) setError('');
    setPhase("editing");
  }

  async function submit() {
    if (submitting.current || !quest || needsStatusCheck) return;
    setMeasuredDistance(null);
    if (!note.trim()) { setError('안부를 한 줄 이상 남겨주세요.'); return; }
    if (!general && !photoFile) { setError('인증 사진을 선택해 주세요.'); return; }
    if (quest.isMine || quest.myStatus === 'PASSED') { setError(quest.isMine ? '내가 등록한 퀘스트는 수행할 수 없어요.' : '이미 인증을 완료한 퀘스트예요.'); return; }
    submitting.current = true;
    const controller = new AbortController();
    request.current = controller;
    setError('');
    setResult(null);
    setPhase("locating");
    let position: UserPosition | null = null;
    let postStarted = false;
    let accepted = false;
    try {
      position = await location.requestLocation();
      if (controller.signal.aborted) return;
      if (!position) {
        setError('현재 위치를 확인하지 못했어요. 위치 권한을 확인하고 다시 시도해 주세요.');
        setPhase("location-error");
        return;
      }
      const body = createSubmissionForm(quest.questType, note, position, photoFile);
      setPhase("verifying");
      postStarted = true;
      const response = await submitVerification(questId, body, controller.signal);
      if (controller.signal.aborted) return;
      setResult(response);
      if (response.verifyStatus === 'PASSED') {
        accepted = true;
        setPhase("success");
        invalidateCompletedQuest();
      } else {
        setPhase("failed");
      }
    } catch (cause) {
      if (!controller.signal.aborted) {
        const code = isAxiosError(cause) ? cause.response?.data?.code : undefined;
        const distance = position && code === "OUT_OF_RANGE"
          ? getDistanceMeters(position, quest)
          : null;
        setMeasuredDistance(distance);
        setError(verificationError(cause, distance === null ? undefined : { distance }));
        // 응답이 끊겼어도 전송이 완료됐을 수 있어 확인 전 재제출을 막습니다.
        const rejected = isAxiosError(cause) && (
          Boolean(cause.response && cause.response.status >= 400 && cause.response.status < 500 && cause.response.status !== 408)
          || code === "AI_ERROR" || code === "OUT_OF_RANGE"
        );
        setNeedsStatusCheck(code === "ALREADY_PASSED" || (postStarted && !rejected));
        setPhase(code === "OUT_OF_RANGE" ? "out-of-range" : "request-error");
      }
    } finally {
      if (request.current === controller) {
        request.current = null;
        // 성공 후에도 이전 이벤트로 중복 제출되지 않도록 잠금을 유지합니다.
        if (!accepted) submitting.current = false;
      }
    }
  }

  async function checkSubmission() {
    if (submitting.current || !quest) return;
    submitting.current = true;
    const controller = new AbortController();
    request.current = controller;
    setPhase("checking-result");
    let confirmed = false;
    try {
      // 조회 요청으로만 확인하고 제출 POST를 반복하지 않습니다.
      const latest = await getVerificationQuest(questId, controller.signal);
      if (controller.signal.aborted) return;
      if (latest.myStatus === "PASSED") {
        confirmed = true;
        setNeedsStatusCheck(false);
        setError('');
        setPhase("success");
        invalidateCompletedQuest();
      } else {
        // NONE/FAILED만으로 이번 요청의 처리 중 여부를 알 수 없어 재전송하지 않습니다.
        setError('전송 결과를 아직 확인하지 못했어요. 잠시 후 다시 확인해 주세요.');
        setPhase("request-error");
      }
    } catch (cause) {
      if (!controller.signal.aborted) {
        setError(verificationError(cause));
        setPhase("request-error");
      }
    } finally {
      if (request.current === controller) {
        request.current = null;
        if (!confirmed) submitting.current = false;
      }
    }
  }

  const pick = () => input.current?.click();
  const fileInput = (
    <input
      ref={input}
      type="file"
      className="sr-only"
      tabIndex={-1}
      disabled={busy}
      accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
      aria-label="인증 사진 선택"
      onChange={async (e) => {
        const file = e.target.files?.[0];
        e.currentTarget.value = "";
        if (!file) return;
        setMeasuredDistance(null);
        try {
          const url = await decodeQuestPhoto(file);
          setPhoto(url);
          setPhotoFile(file);
          setError("");
          setResult(null);
          setPhase("editing");
        } catch (cause) {
          setError(cause instanceof Error ? cause.message : "사진을 열 수 없어요.");
        }
      }}
    />
  );
  if (!isQuestId(questId) || !token || detail.isPending || detail.isError || !quest) {
    return <section className="p-6 min-h-full flex flex-col gap-5">
      <Back to="/" /><h1 className="text-xl font-semibold">수행 인증</h1>
      <p role={!token || detail.isError ? "alert" : "status"}>
        {!isQuestId(questId) ? '홈에서 수행할 퀘스트를 먼저 선택해 주세요.' : !token ? '로그인 후 수행 인증을 진행할 수 있어요.' : detail.isError ? verificationError(detail.error) : '퀘스트를 불러오는 중이에요.'}
      </p>
      {!token && <Link to="/login" className="underline">로그인하기</Link>}
      {detail.isError && <button onClick={() => void detail.refetch()}>다시 불러오기</button>}
      <Link to="/" className="underline">홈으로 돌아가기</Link>
    </section>;
  }
  let screen;
  if (phase === "locating" || phase === "verifying" || phase === "checking-result") {
    screen = <VerificationProgress phase={phase} photoUrl={photo || quest.photoUrl} general={general} />;
  } else if (phase === "success") {
    screen = <VerificationSuccess questId={questId} photo={photo} general={general} percent={percent} message={result?.message ?? "안부가 전달됐어요"} error={error} />;
  } else if (phase === "failed" || phase === "out-of-range" || phase === "location-error" || phase === "request-error") {
    screen = (
      <VerificationNotice
        kind={phase}
        photoUrl={quest.photoUrl}
        photo={photo}
        general={general}
        message={phase === "location-error" ? location.error?.message || error : error}
        distance={measuredDistance}
        needsStatusCheck={needsStatusCheck}
        onReturn={returnToForm}
        onRetry={() => {
          if (phase === "location-error") void submit();
          else if (phase === "request-error" && needsStatusCheck) void checkSubmission();
          else {
            returnToForm();
            if (phase === "failed" && !general) pick();
          }
        }}
      />
    );
  } else {
    screen = (
      <VerificationForm
        quest={quest}
        step={photoFile ? "compare" : "capture"}
        photo={photo}
        hasPhoto={Boolean(photoFile)}
        note={note}
        mix={mix}
        sending={busy}
        error={error}
        needsStatusCheck={needsStatusCheck}
        onNoteChange={setNote}
        onMixChange={setMix}
        onPickPhoto={pick}
        onSubmit={() => { void (needsStatusCheck ? checkSubmission() : submit()); }}
      />
    );
  }
  // 파일 입력을 유지해 실패 화면에서도 사진 선택창을 바로 열 수 있게 합니다.
  return <>{fileInput}{screen}</>;
}
