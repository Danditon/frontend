import { useEffect, useRef, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router";
import { ChevronsLeftRight, Plus, X } from "lucide-react";
import { Back, SlideButton } from "@/shared/components/WireUI";
import { saveHistory } from "@/shared/lib/demo";
type Step = "capture" | "compare" | "checking" | "success" | "failure";
export default function QuestVerifyPage() {
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
      saveHistory(questId);
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
          setError("사진을 열 수 없어요. 정상적인 JPG, PNG, WEBP 사진을 선택해 주세요.");
        }
      }}
    />
  );
  if (step === "checking")
    return (
      <section className="wire-checking" aria-live="polite">
        <div className="wire-scan-line" />
        <div className="wire-check-panel">
          <small>AI 검증중 · 데모</small>
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
      <section className="wire-success">
        <Link
          className="wire-circle wire-close"
          to="/me/history"
          aria-label="닫기"
        >
          <X />
        </Link>
        <div className="wire-success-panel">
          <p>
            인증 성공 <small>예시 결과</small>
          </p>
          <div className="wire-score">
            84<span>%</span>
          </div>
          <small>그때 사진과의 유사도</small>
          <h1>
            판교에 있는 사람에게
            <br />
            안부가 전해졌어요
          </h1>
          <div className="wire-result-actions">
            <button onClick={record} disabled={saved}>
              {saved ? "데모 기록 저장 완료" : "데모 기록 저장하기"}
            </button>
            <Link to="/me/memories?message=0">다른 수행자의 안부 보기</Link>
            <Link to="/">지도로 돌아가기</Link>
          </div>
          {error && <p role="alert">{error}</p>}
        </div>
      </section>
    );
  if (step === "failure")
    return (
      <section className="wire-failure">
        <Link
          className="wire-circle wire-close"
          to="/me/memories"
          aria-label="닫기"
        >
          <X />
        </Link>
        <p>
          인증 실패 <small>예시 결과</small>
        </p>
        <h1>
          조금
          <br />
          달라 보여요
        </h1>
        <div className="wire-pair">
          <div>
            <span>과거</span>
          </div>
          <div>
            <span>지금</span>
            {photo && <img src={photo} alt="선택한 사진" />}
          </div>
        </div>
        <div className="wire-fail-score">
          <strong>
            41<small>%</small>
          </strong>
          <p>
            그때 사진과 다른 곳처럼 보여요.
            <br />
            같은 방향에서 다시 찍어 보세요.
          </p>
        </div>
        <div className="wire-retry">
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
    <section className="wire-verify">
      <div
        className={`wire-photo-stage ${step === "compare" ? "comparing" : ""}`}
      >
        <div className="wire-capture-toolbar">
          <Back />
          <span className="wire-distance">
            <i />
            퀘스트 위치까지 32m
          </span>
        </div>
        {photo && (
          <img
            className="wire-photo"
            src={photo}
            alt="인증을 위해 선택한 사진"
          />
        )}
        {step === "capture" ? (
          <>
            <div className="wire-frame">
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
            <button className="wire-pick" onClick={pick}>
              <span>
                <Plus size={29} />
              </span>
              {general ? "사진 추가/선택" : "갤러리에서 고르기"}
            </button>
          </>
        ) : (
          <>
            <div className="wire-past" style={{ width: `${mix}%` }} />
            <div className="wire-compare-line" style={{ left: `${mix}%` }}>
              <span>
                <ChevronsLeftRight />
              </span>
            </div>
            <input
              className="wire-compare-range"
              type="range"
              min="0"
              max="100"
              value={mix}
              onChange={(e) => setMix(Number(e.target.value))}
              aria-label="과거와 지금 사진 비교"
            />
            <div className="wire-photo-labels">
              <span>과거</span>
              <button onClick={pick}>다시 고르기</button>
              <span>지금</span>
            </div>
          </>
        )}
      </div>
      <div className="wire-quest-panel">
        <div className="wire-quest-meta">
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
        <div className="wire-submit">
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
      {fileInput}
      <details className="wire-preview-tools">
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
    </section>
  );
}
