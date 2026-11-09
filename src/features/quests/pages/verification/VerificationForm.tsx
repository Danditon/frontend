// 사진 비교와 입력 폼을 표시하고, 입력 상태는 부모 페이지에서 관리합니다.
import type { ReactNode } from "react";
import { ChevronsLeftRight, MapPin, Plus } from "lucide-react";
import { Back, SlideButton } from "@/shared/components/WireUI";
import { SwipeSheet } from "@/shared/components/SwipeSheet";
import type { VerificationQuest } from "@/features/quests/api/verification";

type Props = {
  quest: VerificationQuest;
  step: "capture" | "compare";
  photo: string;
  hasPhoto: boolean;
  note: string;
  mix: number;
  sending: boolean;
  error: string;
  measuredDistance: number | null;
  locationError?: string;
  onNoteChange: (note: string) => void;
  onMixChange: (mix: number) => void;
  onPickPhoto: () => void;
  onSubmit: () => void;
  children: ReactNode;
};

export default function VerificationForm({
  quest, step, photo, hasPhoto, note, mix, sending, error, measuredDistance,
  locationError, onNoteChange, onMixChange, onPickPhoto, onSubmit, children,
}: Props) {
  const general = quest.questType === "GENERAL";
  const showComparison = step === "compare" && Boolean(quest.photoUrl?.trim());
  const basePhoto = showComparison ? quest.photoUrl : photo || quest.photoUrl;
  return (
    <section className={`verify-page verify-${step} ${general ? "verify-general" : ""} min-h-[790px] flex-1 flex flex-col relative max-[500px]:[min-height:calc(100dvh_-_54px)]`}>
      <div
        className={`verify-photo h-[430px] relative shrink-0 overflow-hidden max-[500px]:h-[48dvh] max-[500px]:min-h-[325px] ${showComparison ? "comparing" : ""}`}
      >
        <div className="flex justify-between absolute top-[12px] left-[15px] right-[15px] z-[4]">
          <Back to="/" />
          <span className="bg-[#ededed] flex items-center gap-[5px] [padding:0_15px] h-[54px] rounded-[30px] text-[12px] [&_i]:w-[12px] [&_i]:h-[12px] [&_i]:rounded-full [&_i]:bg-[#242624]">
            <i />
            {quest.placeName}
          </span>
        </div>
        {basePhoto && (
          <img
            className={`absolute inset-0 h-full w-full object-cover ${showComparison ? "compare-past" : ""}`}
            src={basePhoto}
            alt={!showComparison && photo ? "인증을 위해 선택한 사진" : "퀘스트 기준 사진"}
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
              onClick={onPickPhoto}
            >
              <span>
                <Plus size={29} />
              </span>
              {general ? "사진 추가/선택" : "갤러리에서 고르기"}
            </button>
          </>
        ) : showComparison ? (
          <>
            <img
              className="absolute inset-0 h-full w-full object-cover"
              src={photo}
              alt="인증을 위해 선택한 사진"
              style={{ clipPath: `inset(0 0 0 ${mix}%)` }}
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
              onChange={(e) => onMixChange(Number(e.target.value))}
              aria-label="과거와 지금 사진 비교"
            />
            <div className="absolute bottom-[16px] left-[16px] right-[16px] flex items-center justify-between text-[11px] [&_>_span]:bg-[#ddd] [&_>_span]:rounded-[20px] [&_>_span]:[padding:5px_13px] [&_>_button]:bg-[#ededed] [&_>_button]:rounded-[30px] [&_>_button]:p-[20px]">
              <span>과거</span>
              <button onClick={onPickPhoto}>다시 고르기</button>
              <span>지금</span>
            </div>
          </>
        ) : (
          <button
            type="button"
            className="absolute bottom-[16px] left-1/2 -translate-x-1/2 whitespace-nowrap rounded-full bg-[#ededed] px-5 py-3 text-xs"
            onClick={onPickPhoto}
          >
            사진 다시 고르기
          </button>
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
          onChange={(e) => onNoteChange(e.target.value)}
          maxLength={500}
        />
        {measuredDistance !== null ? (
          <div role="alert" className="mt-4 rounded-2xl border border-[#d4e6eb] bg-[#eff8fa] p-4 text-[#243a40]">
            <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
              <span className="flex items-center gap-1.5 font-medium">
                <MapPin size={15} aria-hidden="true" />
                퀘스트까지 측정 거리
              </span>
              <span className="rounded-full bg-white px-2.5 py-1">인증 범위 200m 이내</span>
            </div>
            <p className="mt-1 text-3xl font-semibold tabular-nums">
              <span className="mr-1 text-sm font-normal">약</span>
              {Math.round(measuredDistance).toLocaleString("ko-KR")}
              <span className="ml-1 text-base">m</span>
            </p>
            <p className="mt-1 text-xs leading-relaxed">{error}</p>
          </div>
        ) : error && <p role="alert">{error}</p>}
        {locationError && <p role="alert">{locationError}</p>}
        <div className={measuredDistance === null ? "mt-auto pt-[40px]" : "mt-auto pt-4"}>
          <SlideButton
            disabled={sending || !note.trim() || (!hasPhoto && !general) || quest.isMine || quest.myStatus === "PASSED"}
            onClick={onSubmit}
          >
            {quest.isMine ? "내 퀘스트는 인증할 수 없어요" : quest.myStatus === "PASSED" ? "이미 인증한 퀘스트예요" : !note.trim() ? "안부를 남겨주세요" : !hasPhoto && !general ? "사진을 골라주세요" : "인증 보내기"}
          </SlideButton>
        </div>
      </div>

      </SwipeSheet>
      {children}

    </section>
  );
}
