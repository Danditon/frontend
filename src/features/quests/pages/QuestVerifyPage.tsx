import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Link, useParams } from "react-router";
import { ChevronsLeftRight, Plus, X } from "lucide-react";
import { Back, SlideButton } from "@/shared/components/WireUI";
import { SwipeSheet } from "@/shared/components/SwipeSheet";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useActiveQuest } from "@/features/quests/hooks/useActiveQuest";
import { useGeolocation } from "@/features/quests/hooks/useGeolocation";
import { getAccessToken, getVerificationQuest, isQuestId, submitVerification, createSubmissionForm, verificationError, similarityPercent, type VerificationResult } from "@/features/quests/api/verification";
import { RemotePhoto } from "@/shared/components/RemotePhoto";
type Step = "capture" | "compare" | "checking" | "success" | "failure";
export default function QuestVerifyPage() {
  const { questId = "" } = useParams();
  const { activeQuestId } = useActiveQuest();
  const id = isQuestId(questId) ? questId : activeQuestId ? String(activeQuestId) : "";
  return <VerificationScreen key={id} questId={id} />;
}
function VerificationScreen({ questId }: { questId: string }) {
  const reduceMotion = useReducedMotion();
  const input = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState("");
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [note, setNote] = useState("");
  const [mix, setMix] = useState(50);
  const [error, setError] = useState("");
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
    if (!note.trim()) { setError('안부를 한 줄 이상 남겨주세요.'); return; }
    if (!general && !photoFile) { setError('인증 사진을 선택해 주세요.'); return; }
    if (quest.isMine || quest.myStatus === 'PASSED') { setError(quest.isMine ? '내가 등록한 퀘스트는 수행할 수 없어요.' : '이미 인증을 완료한 퀘스트예요.'); return; }
    submitting.current = true;
    const controller = new AbortController();
    request.current = controller;
    setError(''); setSending(true);
    try {
      const position = await location.requestLocation();
      if (controller.signal.aborted) return;
      if (!position) { setError('현재 위치를 확인하지 못했어요. 위치 권한을 확인하고 다시 시도해 주세요.'); return; }
      const body = createSubmissionForm(quest.questType, note, position, photoFile);
      const response = await submitVerification(questId, body, controller.signal);
      if (controller.signal.aborted) return;
      setResult(response);
      if (response.verifyStatus === 'PASSED') {
        void queryClient.invalidateQueries({ queryKey: ['quest-greetings', questId] });

      }
    } catch (cause) {
      if (!controller.signal.aborted) setError(verificationError(cause));
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
        if (
          file.size > 10 * 1024 * 1024 ||
          !/\.(jpe?g|png|webp)$/i.test(file.name) ||
          (file.type !== "" &&
            !["image/jpeg", "image/png", "image/webp"].includes(file.type))
        ) {
          setError("10MB 이하 JPG, PNG, WEBP 사진을 선택해 주세요.");
          return;
        }
        const url = URL.createObjectURL(file);
        try {
          const image = new Image();
          image.src = url;
          await image.decode();
          setPhoto(url);
          setPhotoFile(file);
          setError("");
          go("compare");
        } catch {
          URL.revokeObjectURL(url);
          setError(
            "사진을 열 수 없어요. 정상적인 JPG, PNG, WEBP 사진을 선택해 주세요.",
          );
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
  if (step === "checking")
    return (
      <section
        className="verify-page verify-checking min-h-[790px] flex-1 bg-[#def2f6] relative [&::before]:content-[''] [&::before]:absolute [&::before]:top-[-54px] [&::before]:left-0 [&::before]:right-0 [&::before]:h-[54px] [&::before]:bg-[#def2f6] [&::before]:z-0 max-[500px]:[min-height:calc(100dvh_-_54px)]"
        aria-live="polite"
      >
        {(photo || quest.photoUrl) && <img className="verify-result-background" src={photo || quest.photoUrl || ""} alt="검증 중인 장소" />}
        <motion.div
          className="absolute top-[63%] left-0 right-0 h-[3px] bg-[#111]"
          animate={{ y: reduceMotion ? 0 : [0, -200, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="checking-card absolute bottom-[27px] left-[15px] right-[15px] bg-[#c9eaf5] rounded-[28px] p-[20px] [&_small]:text-[15px] [&_h1]:text-[28px] [&_h1]:leading-[1.2] [&_h1]:mt-[12px] [&_h1]:font-normal [&_h1]:tracking-[-1px]">
          <small>{location.isLocating ? "현재 위치 확인 중" : general ? "안부를 전송하고 있어요" : "AI 검증 중"}</small>
          <h1>
            {location.isLocating ? "현재 위치를 확인하고 있어요" : general ? "잠시만 기다려 주세요" : <>같은 자리인지<br />비교하고 있어요</>}
          </h1>
        </div>
      </section>
    );
  if (step === "success")
    return (
      <section className={`verify-page verify-${step} ${general ? "verify-general" : ""} [&::before]:content-[''] [&::before]:absolute [&::before]:top-[-54px] [&::before]:left-0 [&::before]:right-0 [&::before]:h-[54px] [&::before]:bg-[#def2f6] [&::before]:z-0 bg-[#def2f6] min-h-[790px] flex-1 relative max-[500px]:[min-height:calc(100dvh_-_54px)]`}>
        <Link
          className="h-[54px] w-[54px] rounded-full bg-[#ededed] inline-flex items-center justify-center shrink-0 [&_svg]:[stroke-width:1.25] absolute right-[15px] top-[12px]"
          to="/me/history"
          aria-label="닫기"
        >
          <X />
        </Link>
        {photo && <img className="verify-result-background" src={photo} alt="인증한 장소" />}
        <SwipeSheet key="success" label="인증 성공 결과" collapsed={0.64} className="success-swipe-sheet">
        <div className="success-sheet-content">

          <p>
            인증 성공
          </p>
          <div className="text-[112px] leading-[1.15] tracking-[-6px] font-normal [&_span]:text-[36px] [&_span]:tracking-[0]">
            {percent === null ? "인증 완료" : <>{percent}<span>%</span></>}
          </div>
          <small>{percent === null ? "퀘스트 수행을 완료했어요" : "그때 사진과의 유사도"}</small>
          <h1>
            {result?.message}
          </h1>
          <div className="mt-auto pt-[45px] flex flex-col text-center gap-[17px] text-[14px] [&_>_a:first-of-type]:bg-[#242624] [&_>_a:first-of-type]:rounded-[35px] [&_>_a:first-of-type]:p-[20px] [&_>_button]:text-[10px] [&_>_button]:text-[#555]">
            <Link to={`/quests/${questId}/greetings`}>다른 수행자의 안부 보기</Link>
            <Link to="/">지도로 돌아가기</Link>
          </div>
          {error && <p role="alert">{error}</p>}
          {location.error && <p role="alert">{location.error.message}</p>}
        </div>
        </SwipeSheet>
      </section>
    );
  if (step === "failure")
    return (
      <section className={`verify-page verify-${step} ${general ? "verify-general" : ""} [&::before]:content-[''] [&::before]:absolute [&::before]:top-[-54px] [&::before]:left-0 [&::before]:right-0 [&::before]:h-[54px] [&::before]:bg-[#def2f6] [&::before]:z-0 bg-[#def2f6] min-h-[790px] flex-1 relative [padding:68px_15px_25px] flex flex-col [&_>_p_small]:text-[10px] [&_>_p_small]:text-[#666] [&_>_p_small]:ml-[10px] [&_>_p]:text-[17px] [&_>_p]:mb-[16px] [&_>_h1]:text-[40px] [&_>_h1]:leading-[1.15] [&_>_h1]:font-semibold [&_>_h1]:tracking-[-2px] [&_>_h1]:[margin:0_10px_32px] max-[500px]:[min-height:calc(100dvh_-_54px)]`}>
        <Link
          className="h-[54px] w-[54px] rounded-full bg-[#ededed] inline-flex items-center justify-center shrink-0 [&_svg]:[stroke-width:1.25] absolute right-[15px] top-[12px]"
          to="/me/memories"
          aria-label="닫기"
        >
          <X />
        </Link>
        <p>
          인증 실패
        </p>
        <h1>
          조금
          <br />
          달라 보여요
        </h1>
        <div className="flex gap-[10px] h-[250px] [&_>_div]:relative [&_>_div]:flex-1 [&_>_div]:bg-[#def2f6] [&_>_div]:rounded-[23px] [&_>_div]:overflow-hidden [&_>_div:nth-child(2)]:bg-[#ededed] [&_img]:w-full [&_img]:h-full [&_img]:object-cover [&_span]:absolute [&_span]:left-[13px] [&_span]:top-[16px] [&_span]:bg-[#aaa] [&_span]:rounded-[20px] [&_span]:[padding:4px_10px] [&_span]:text-[12px] [&_span]:z-[1]">
          <div>
            <span>과거</span>
            <RemotePhoto className="past-photo" photoUrl={quest.photoUrl} alt="퀘스트 기준 사진" />
          </div>
          <div>
            <span>지금</span>
            {photo ? <img src={photo} alt="선택한 사진" /> : <div className="past-photo current-photo" />}
          </div>
        </div>
        <div className="flex items-center gap-[20px] bg-[#ededed] rounded-[24px] [padding:22px_20px] mt-[12px] [&_strong]:text-[46px] [&_strong]:font-normal [&_strong]:tracking-[-2px] [&_strong]:whitespace-nowrap [&_strong_small]:text-[12px] [&_strong_small]:tracking-[0] [&_p]:text-[12px] [&_p]:leading-[1.5]">
          <strong>
            {percent === null ? "—" : <>{percent}<small>%</small></>}
          </strong>
          <p>
            {result?.message}
          </p>
        </div>
        <div className="mt-auto pt-[36px] [&_>_p]:text-center [&_>_p]:text-[12px] [&_>_p]:mb-[12px]">
          <p>적어둔 안부는 그대로 남아 있어요.</p>
          <SlideButton
            onClick={() => {
              go("capture");
              pick();
            }}
          >
            사진 다시 고르기
          </SlideButton>
        </div>
        {fileInput}
      </section>
    );
  return (
    <section className={`verify-page verify-${step} ${general ? "verify-general" : ""} min-h-[790px] flex-1 flex flex-col relative max-[500px]:[min-height:calc(100dvh_-_54px)]`}>
      <div
        className={`verify-photo h-[430px] relative shrink-0 overflow-hidden max-[500px]:h-[48dvh] max-[500px]:min-h-[325px] ${step === "compare" ? "comparing" : ""}`}
      >
        <div className="flex justify-between absolute top-[12px] left-[15px] right-[15px] z-[4]">
          <Back to="/" />
          <span className="bg-[#ededed] flex items-center gap-[5px] [padding:0_15px] h-[54px] rounded-[30px] text-[12px] [&_i]:w-[12px] [&_i]:h-[12px] [&_i]:rounded-full [&_i]:bg-[#242624]">
            <i />
            {quest.placeName}
          </span>
        </div>
        {(photo || quest.photoUrl) && (
          <img
            className="absolute [inset:0] w-full h-full object-cover"
            src={photo || quest.photoUrl || ""}
            alt={photo ? "인증을 위해 선택한 사진" : "퀘스트 기준 사진"}
          />
        )}
        {step === "capture" ? (
          <>
            <div className="absolute left-[38px] right-[38px] top-[100px] h-[183px] grid place-items-center [&_>_i]:absolute [&_>_i]:w-[32px] [&_>_i]:h-[32px] [&_>_i]:[border-color:#111] [&_>_i]:[border-style:solid] [&_>_i:nth-child(1)]:top-0 [&_>_i:nth-child(1)]:left-0 [&_>_i:nth-child(1)]:[border-width:2px_0_0_2px] [&_>_i:nth-child(1)]:[border-radius:9px_0_0_0] [&_>_i:nth-child(2)]:right-0 [&_>_i:nth-child(2)]:top-0 [&_>_i:nth-child(2)]:[border-width:2px_2px_0_0] [&_>_i:nth-child(2)]:[border-radius:0_9px_0_0] [&_>_i:nth-child(3)]:bottom-0 [&_>_i:nth-child(3)]:left-0 [&_>_i:nth-child(3)]:[border-width:0_0_2px_2px] [&_>_i:nth-child(3)]:[border-radius:0_0_0_9px] [&_>_i:nth-child(4)]:bottom-0 [&_>_i:nth-child(4)]:right-0 [&_>_i:nth-child(4)]:[border-width:0_2px_2px_0] [&_>_i:nth-child(4)]:[border-radius:0_0_9px_0] [&_h1]:text-center [&_h1]:text-[20px] [&_h1]:font-normal [&_h1]:leading-[1.3]">
              <i />
              <i />
              <i />
              <i />
              <h1>
                {general ? (
                  <>
                    사진도 남기고 싶다면
                    <br />
                    함께 올려주세요
                  </>
                ) : (
                  <>
                    이 구도 그대로
                    <br />
                    찍어오세요
                  </>
                )}
              </h1>
            </div>
            <button
              className="absolute bottom-[18px] left-[50%] [transform:translateX(-50%)] h-[54px] rounded-[30px] bg-[#ededed] flex items-center gap-[22px] whitespace-nowrap [padding:5px_24px_5px_6px] text-[12px] [&_>_span]:w-[43px] [&_>_span]:h-[43px] [&_>_span]:bg-[#def2f6] [&_>_span]:rounded-full [&_>_span]:grid [&_>_span]:place-items-center [&_>_span]:text-[#777] [&_svg]:[stroke-width:1]"
              onClick={pick}
            >
              <span>
                <Plus size={29} />
              </span>
              {general ? "사진 추가/선택" : "갤러리에서 고르기"}
            </button>
          </>
        ) : (
          <>
            <div
              className="compare-past absolute [inset:0_auto_0_0] bg-transparent"
              style={{ width: `${mix}%`, backgroundImage: quest.photoUrl ? `url(${JSON.stringify(quest.photoUrl)})` : undefined, backgroundSize: "cover", backgroundPosition: "center" }}
            />
            <div
              className="absolute top-0 bottom-0 [border-left:1px_solid_#ccc] [&_>_span]:absolute [&_>_span]:top-[46%] [&_>_span]:left-0 [&_>_span]:[transform:translateX(-50%)] [&_>_span]:h-[48px] [&_>_span]:w-[48px] [&_>_span]:rounded-full [&_>_span]:bg-[#ddd] [&_>_span]:grid [&_>_span]:place-items-center"
              style={{ left: `${mix}%` }}
            >
              <span>
                <ChevronsLeftRight />
              </span>
            </div>
            <input
              className="absolute [inset:70px_0_70px] w-full [height:calc(100%_-_140px)] opacity-0 cursor-ew-resize z-[3]"
              type="range"
              min="0"
              max="100"
              value={mix}
              onChange={(e) => setMix(Number(e.target.value))}
              aria-label="과거와 지금 사진 비교"
            />
            <div className="absolute bottom-[16px] left-[16px] right-[16px] flex items-center justify-between text-[11px] [&_>_span]:bg-[#ddd] [&_>_span]:rounded-[20px] [&_>_span]:[padding:5px_13px] [&_>_button]:bg-[#ededed] [&_>_button]:rounded-[30px] [&_>_button]:p-[20px]">
              <span>과거</span>
              <button onClick={pick}>다시 고르기</button>
              <span>지금</span>
            </div>
          </>
        )}
      </div>
      <SwipeSheet key="capture" label="퀘스트 인증 입력" collapsed={0.50} className="capture-swipe-sheet">
      <div className="verify-sheet bg-[#fff] [border-radius:46px_46px_0_0] flex-1 min-h-[402px] [padding:27px_20px_24px] flex flex-col [&_h1]:text-[22px] [&_h1]:font-bold [&_h1]:tracking-[-1px] [&_h1]:leading-[1.3] [&_h1]:mt-[3px] [&_>_p]:text-[11px] [&_>_p]:mt-[7px] [&_textarea]:block [&_textarea]:resize-y [&_textarea]:min-h-[90px] [&_textarea]:max-h-[160px] [&_textarea]:w-full [&_textarea]:bg-[#ededed] [&_textarea]:rounded-[24px] [&_textarea]:[padding:22px_10px] [&_textarea]:text-[12px] [&_textarea]:mt-[26px] [&_textarea]:border-0 [&_textarea::placeholder]:text-[#777] max-[500px]:[min-height:calc(52dvh_-_54px)]">
        <div className="flex justify-between text-[10px]">
          <span>{general ? "일반" : "이미지"} 퀘스트 | 난이도 {quest.difficulty}</span>
          <span>{quest.author.nickname} 님의 그리움</span>
        </div>
        <h1>{quest.questTitle}</h1>
        <p>{quest.questDescription}</p>
        <textarea
          placeholder="떠난 사람에게 한 줄 안부를 남겨주세요"
          aria-label="안부 메시지"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
        />
        {error && <p role="alert">{error}</p>}
        {location.error && <p role="alert">{location.error.message}</p>}
        <div className="mt-auto pt-[40px]">
          <SlideButton
            disabled={sending || !note.trim() || (!photoFile && !general) || quest.isMine || quest.myStatus === "PASSED"}
            onClick={() => void submit()}
          >
            {quest.isMine ? "내 퀘스트는 인증할 수 없어요" : quest.myStatus === "PASSED" ? "이미 인증한 퀘스트예요" : !note.trim() ? "안부를 남겨주세요" : !photoFile && !general ? "사진을 골라주세요" : "인증 보내기"}
          </SlideButton>
        </div>
      </div>

      </SwipeSheet>
      {fileInput}

    </section>
  );
}
