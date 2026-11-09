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
type Step = "capture" | "compare" | "checking" | "success" | "failure";
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
  const [view, setView] = useState<Step>("capture");
  const [result, setResult] = useState<VerificationResult | null>(null);
  const [sending, setSending] = useState(false);
  const submitting = useRef(false);
  const request = useRef<AbortController | null>(null);
  const token = getAccessToken();
  const queryClient = useQueryClient();
  const location = useGeolocation();
  const detail = useQuery({ queryKey: ['verification-quest', questId, token], queryFn: ({ signal }) => getVerificationQuest(questId, signal), enabled: isQuestId(questId) && Boolean(token), retry: false });
  const quest = detail.data;
  const general = quest?.questType === 'GENERAL';
  const step: Step = sending ? 'checking' : result ? (result.verifyStatus === 'PASSED' ? 'success' : 'failure') : view;
  const percent = similarityPercent(result?.similarity);
  const go = (screen: Step) => { setResult(null); setView(screen); };
  useEffect(() => () => { if (photo) URL.revokeObjectURL(photo); }, [photo]);
  useEffect(() => () => request.current?.abort(), []);
  async function submit() {
    if (submitting.current || !quest) return;
    setMeasuredDistance(null);
    if (!note.trim()) { setError('안부를 한 줄 이상 남겨주세요.'); return; }
    if (!general && !photoFile) { setError('인증 사진을 선택해 주세요.'); return; }
    if (quest.isMine || quest.myStatus === 'PASSED') { setError(quest.isMine ? '내가 등록한 퀘스트는 수행할 수 없어요.' : '이미 인증을 완료한 퀘스트예요.'); return; }
    submitting.current = true;
    const controller = new AbortController();
    request.current = controller;
    setError(''); setSending(true);
    let position: UserPosition | null = null;
    try {
      position = await location.requestLocation();
      if (controller.signal.aborted) return;
      if (!position) { setError('현재 위치를 확인하지 못했어요. 위치 권한을 확인하고 다시 시도해 주세요.'); return; }
      const body = createSubmissionForm(quest.questType, note, position, photoFile);
      const response = await submitVerification(questId, body, controller.signal);
      if (controller.signal.aborted) return;
      setResult(response);
      if (response.verifyStatus === 'PASSED') {
        void queryClient.invalidateQueries({ queryKey: ['quest-greetings', questId] });
        void queryClient.invalidateQueries({ queryKey: ['my-submissions'] });
        void queryClient.invalidateQueries({ queryKey: ['quests'] });
        void queryClient.invalidateQueries({ queryKey: ['verification-quest', questId] });
      }
    } catch (cause) {
      if (!controller.signal.aborted) {
        const distance = position && isAxiosError(cause) && cause.response?.data?.code === "OUT_OF_RANGE"
          ? getDistanceMeters(position, quest)
          : null;
        setMeasuredDistance(distance);
        setError(verificationError(cause, distance === null ? undefined : { distance }));
      }
    } finally {
      submitting.current = false;
      if (!controller.signal.aborted) setSending(false);
    }
  }
  const pick = () => input.current?.click();
  const fileInput = (
    <input
      ref={input}
      type="file"
      className="sr-only"
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
          go("compare");
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
  if (step === "checking") {
    return <VerificationProgress photoUrl={photo || quest.photoUrl} general={general} isLocating={location.isLocating} />;
  }
  if (step === "success") {
    return <VerificationSuccess questId={questId} photo={photo} general={general} percent={percent} message={result?.message} error={error} locationError={location.error?.message} />;
  }
  if (step === "failure") {
    return (
      <VerificationNotice
        photoUrl={quest.photoUrl}
        photo={photo}
        general={general}
        percent={percent}
        message={result?.message}
        onRetry={() => { go("capture"); pick(); }}
      >
        {fileInput}
      </VerificationNotice>
    );
  }
  return (
    <VerificationForm
      quest={quest}
      step={step}
      photo={photo}
      hasPhoto={Boolean(photoFile)}
      note={note}
      mix={mix}
      sending={sending}
      error={error}
      measuredDistance={measuredDistance}
      locationError={location.error?.message}
      onNoteChange={setNote}
      onMixChange={setMix}
      onPickPhoto={pick}
      onSubmit={() => void submit()}
    >
      {fileInput}
    </VerificationForm>
  );
}
