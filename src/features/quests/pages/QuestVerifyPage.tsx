import { mockNearbyQuests } from '@/features/quests/pages/home/mocks/nearbyQuests';
import { motion, useReducedMotion } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { ChevronsLeftRight, Plus, X } from "lucide-react";
import { Back, SlideButton } from "@/shared/components/WireUI";
import { SwipeSheet } from "@/shared/components/SwipeSheet";
import { saveHistory } from "@/shared/lib/demo";
type Step = "capture" | "compare" | "checking" | "success" | "failure";
export default function QuestVerifyPage() {
  const reduceMotion = useReducedMotion();
  const { questId = "demo" } = useParams();
  const [params, setParams] = useSearchParams();
  const input = useRef<HTMLInputElement>(null);
  const [photo, setPhoto] = useState("");
  const [note, setNote] = useState("");
  const [mix, setMix] = useState(50);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const raw = params.get("screen");
  const step: Step =
    raw === "compare" ||
    raw === "checking" ||
    raw === "success" ||
    raw === "failure"
      ? raw
      : "capture";
  const general = params.get("type") === "general";
  const fail = params.get("result") === "failure";
  function go(screen: Step) {
    setParams((p) => {
      p.set("screen", screen);
      return p;
    });
  }
  useEffect(
    () => () => {
      if (photo) URL.revokeObjectURL(photo);
    },
    [photo],
  );
  useEffect(() => {
    if (step !== "checking") return;
    const timer = window.setTimeout(
      () =>
        setParams(
          (p) => {
            p.set(
              "screen",
              p.get("result") === "failure" ? "failure" : "success",
            );
            return p;
          },
          { replace: true },
        ),
      1600,
    );
    return () => window.clearTimeout(timer);
  }, [step, setParams]);
  function record() {
    try {
      const quest = mockNearbyQuests.find(item => String(item.questId) === questId);
      saveHistory(questId, {
        title: quest?.questTitle,
        message: note,
        location: quest ? { lat: quest.lat, lng: quest.lng, placeName: quest.placeName } : undefined,
      });
      setSaved(true);
    } catch {
      setError("기록을 저장하지 못했어요. 다시 시도해 주세요.");
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
  if (step === "checking")
    return (
      <section
        className="verify-page verify-checking min-h-[790px] flex-1 bg-[#def2f6] relative [&::before]:content-[''] [&::before]:absolute [&::before]:top-[-54px] [&::before]:left-0 [&::before]:right-0 [&::before]:h-[54px] [&::before]:bg-[#def2f6] [&::before]:z-0 max-[500px]:[min-height:calc(100dvh_-_54px)]"
        aria-live="polite"
      >
        <motion.div
          className="absolute top-[63%] left-0 right-0 h-[3px] bg-[#111]"
          animate={{ y: reduceMotion ? 0 : [0, -200, 0] }}
          transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
        />
        <div className="checking-card absolute bottom-[27px] left-[15px] right-[15px] bg-[#c9eaf5] rounded-[28px] p-[20px] [&_small]:text-[15px] [&_h1]:text-[28px] [&_h1]:leading-[1.2] [&_h1]:mt-[12px] [&_h1]:font-normal [&_h1]:tracking-[-1px]">
          <small>AI 검증 중</small>
          <h1>
            같은 자리인지
            <br />
            비교하고 있어요
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
            인증 성공 <small className="sr-only">예시 결과</small>
          </p>
          <div className="text-[112px] leading-[1.15] tracking-[-6px] font-normal [&_span]:text-[36px] [&_span]:tracking-[0]">
            {general ? "인증 완료" : <>84<span>%</span></>}
          </div>
          <small>{general ? "퀘스트 수행을 완료했어요" : "그때 사진과의 유사도"}</small>
          <h1>
            판교에 있는 사람에게
            <br />
            안부가 전해졌어요
          </h1>
          <div className="mt-auto pt-[45px] flex flex-col text-center gap-[17px] text-[14px] [&_>_a:first-of-type]:bg-[#242624] [&_>_a:first-of-type]:rounded-[35px] [&_>_a:first-of-type]:p-[20px] [&_>_button]:text-[10px] [&_>_button]:text-[#555]">
            <button className="save-demo-record" onClick={record} disabled={saved}>
              {saved ? "데모 기록 저장 완료" : "데모 기록 저장하기"}
            </button>
            <Link to="/me/memories?message=0">다른 수행자의 안부 보기</Link>
            <Link to="/">지도로 돌아가기</Link>
          </div>
          {error && <p role="alert">{error}</p>}
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
          인증 실패 <small className="sr-only">예시 결과</small>
        </p>
        <h1>
          조금
          <br />
          달라 보여요
        </h1>
        <div className="flex gap-[10px] h-[250px] [&_>_div]:relative [&_>_div]:flex-1 [&_>_div]:bg-[#def2f6] [&_>_div]:rounded-[23px] [&_>_div]:overflow-hidden [&_>_div:nth-child(2)]:bg-[#ededed] [&_img]:w-full [&_img]:h-full [&_img]:object-cover [&_span]:absolute [&_span]:left-[13px] [&_span]:top-[16px] [&_span]:bg-[#aaa] [&_span]:rounded-[20px] [&_span]:[padding:4px_10px] [&_span]:text-[12px] [&_span]:z-[1]">
          <div>
            <span>과거</span>
            <div className="past-photo" />
          </div>
          <div>
            <span>지금</span>
            {photo ? <img src={photo} alt="선택한 사진" /> : <div className="past-photo current-photo" />}
          </div>
        </div>
        <div className="flex items-center gap-[20px] bg-[#ededed] rounded-[24px] [padding:22px_20px] mt-[12px] [&_strong]:text-[46px] [&_strong]:font-normal [&_strong]:tracking-[-2px] [&_strong]:whitespace-nowrap [&_strong_small]:text-[12px] [&_strong_small]:tracking-[0] [&_p]:text-[12px] [&_p]:leading-[1.5]">
          <strong>
            41<small>%</small>
          </strong>
          <p>
            그때 사진과 다른 곳처럼 보여요.
            <br />
            같은 방향에서 다시 찍어 보세요.
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
            퀘스트 위치까지 32m
          </span>
        </div>
        {photo && (
          <img
            className="absolute [inset:0] w-full h-full object-cover"
            src={photo}
            alt="인증을 위해 선택한 사진"
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
              style={{ width: `${mix}%` }}
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
          <span>{general ? "일반" : "이미지"} 퀘스트 | 난이도 2</span>
          <span>판교에서 온 그리움</span>
        </div>
        <h1>자취방 앞 가로등 골목</h1>
        <p>골목이 아직 그대로인지 같은 자리에서 찍어오기</p>
        <textarea
          placeholder="떠난 사람에게 한 줄 안부를 남겨주세요"
          aria-label="안부 메시지"
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
        />
        {error && <p role="alert">{error}</p>}
        <div className="mt-auto pt-[40px]">
          <SlideButton
            disabled={!photo && !general}
            onClick={() => go("checking")}
          >
            {step === "compare" || (general && note)
              ? "인증 보내기"
              : "사진을 골라주세요"}
          </SlideButton>
        </div>
      </div>
      <details className="absolute top-[100%] left-0 w-full p-[14px] text-[#ddd] text-[11px] bg-[#444] z-[1] [&_label]:inline-flex [&_label]:gap-[5px] [&_label]:p-[10px] [&_p]:text-[10px] max-[500px]:text-[#555] max-[500px]:bg-[#def2f6]">
        <summary>미리보기 설정</summary>
        <label>
          <input
            type="checkbox"
            checked={general}
            onChange={(e) =>
              setParams((p) => {
                p.set("type", e.target.checked ? "general" : "image");
                return p;
              })
            }
          />{" "}
          일반 퀘스트
        </label>
        <label>
          <input
            type="checkbox"
            checked={fail}
            onChange={(e) =>
              setParams((p) => {
                p.set("result", e.target.checked ? "failure" : "success");
                return p;
              })
            }
          />{" "}
          실패 결과 보기
        </label>
        <p>실제 AI 판정과 위치 검증은 서버 연동 전입니다.</p>
      </details>
      </SwipeSheet>
      {fileInput}

    </section>
  );
}
