import { useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { Check, ChevronLeft, LoaderCircle, MailOpen, Plus, X } from 'lucide-react'
import { QuestPlacePicker } from '../components/QuestPlacePicker'
import {
  previewQuest, registerQuest, registrationError,
  type RegistrationPlace, type RegistrationPreview,
} from '../api/questRegistration'
import { decodeQuestPhoto } from '../lib/questPhoto'

type Stage = 'details' | 'photo' | 'generating' | 'preview' | 'previewError' | 'registering' | 'registerError' | 'done'
type QuestType = 'GENERAL' | 'IMAGE'

const primary = 'min-h-11 flex-1 rounded-full bg-[#242624] px-4 py-3 text-center text-sm font-medium text-white disabled:bg-neutral-200 disabled:text-neutral-500'
const secondary = 'min-h-11 rounded-full bg-neutral-100 px-4 py-3 text-sm'

export default function QuestCreatePage() {
  const queryClient = useQueryClient()
  const [stage, setStage] = useState<Stage>('details')
  const [questType, setQuestType] = useState<QuestType>('GENERAL')
  const [place, setPlace] = useState<RegistrationPlace | null>(null)
  const [reason, setReason] = useState('')
  const [photo, setPhoto] = useState<{ file: File; url: string } | null>(null)
  const [readingPhoto, setReadingPhoto] = useState(false)
  const [preview, setPreview] = useState<RegistrationPreview | null>(null)
  const [error, setError] = useState('')
  const input = useRef<HTMLInputElement>(null)
  const request = useRef<AbortController | null>(null)
  const photoRequest = useRef(0)
  const stageTop = useRef<HTMLElement>(null)
  const photoUrl = photo?.url
  const busy = stage === 'generating' || stage === 'registering'
  const step = stage === 'details' ? 1 : stage === 'photo' || stage === 'generating' ? 2 : 3
  const general = questType === 'GENERAL'

  useEffect(() => () => { if (photoUrl) URL.revokeObjectURL(photoUrl) }, [photoUrl])
  useEffect(() => () => {
    request.current?.abort()
    photoRequest.current += 1
  }, [])
  useEffect(() => { stageTop.current?.scrollIntoView({ block: 'start' }) }, [stage])

  function move(next: Stage) {
    setError('')
    setStage(next)
  }

  async function choosePhoto(file: File) {
    const id = ++photoRequest.current
    setReadingPhoto(true)
    setError('')
    try {
      const url = await decodeQuestPhoto(file)
      if (id !== photoRequest.current) {
        URL.revokeObjectURL(url)
        return
      }
      setPhoto({ file, url })
    } catch (cause) {
      if (id === photoRequest.current) {
        setError(cause instanceof Error ? cause.message : '사진을 열 수 없어요.')
      }
    } finally {
      if (id === photoRequest.current) setReadingPhoto(false)
    }
  }

  async function generate() {
    if (!place || !reason.trim() || (!general && !photo) || readingPhoto || request.current) return
    const controller = new AbortController()
    request.current = controller
    move('generating')
    try {
      const result = await previewQuest({ ...place, questType, longingText: reason.trim() }, controller.signal)
      if (controller.signal.aborted) return
      setPreview(result)
      setStage('preview')
    } catch (cause) {
      if (controller.signal.aborted) return
      setError(registrationError(cause, 'preview'))
      setStage('previewError')
    } finally {
      if (request.current === controller) request.current = null
    }
  }

  async function register() {
    if (!place || !preview || !preview.questTitle.trim() || !preview.questDescription.trim() || request.current) return
    const controller = new AbortController()
    request.current = controller
    move('registering')
    try {
      await registerQuest({ ...place, questType, longingText: reason.trim() }, preview, photo?.file ?? null, controller.signal)
      void queryClient.invalidateQueries({ queryKey: ['my-quests'] })
      if (!controller.signal.aborted) setStage('done')
    } catch (cause) {
      if (controller.signal.aborted) return
      setError(registrationError(cause, 'register'))
      setStage('registerError')
    } finally {
      if (request.current === controller) request.current = null
    }
  }

  const hasResultCard = stage === 'preview' || stage === 'registerError'
  return (
    <section ref={stageTop} aria-label="그리움 등록"
      className={`flex min-h-full flex-col gap-5 px-4 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))] ${busy || stage === 'done' || stage === 'previewError' ? 'bg-gradient-to-b from-[#d1ecf4] to-white' : 'bg-white'}`}>
      {stage !== 'done' && (
        <header className="relative flex h-10 shrink-0 items-center">
          {stage === 'details' ? (
            <Link to="/" aria-label="홈으로 돌아가기" className="grid size-10 place-items-center rounded-full bg-[#242624] text-white">
              <ChevronLeft size={20} />
            </Link>
          ) : !busy && (
            <button type="button" aria-label="이전 단계" className="grid size-10 place-items-center rounded-full bg-[#242624] text-white"
              onClick={() => move(stage === 'photo' ? 'details' : stage === 'registerError' ? 'preview' : 'photo')}>
              <ChevronLeft size={20} />
            </button>
          )}
          <div className="pointer-events-none absolute inset-x-12 flex justify-center gap-2" aria-label={`등록 ${step}/3단계`}>
            {[1, 2, 3].map(index => <span key={index} className={`h-1 w-9 rounded-full ${index <= step ? 'bg-[#bfe6f4]' : 'bg-neutral-100'}`} />)}
          </div>
        </header>
      )}

      {stage === 'details' && (
        <>
          <h1 className="text-2xl font-semibold leading-tight">어떤 그리움을<br />남길까요?</h1>
          <fieldset className="grid grid-cols-2 gap-2">
            <legend className="sr-only">퀘스트 유형</legend>
            {(['GENERAL', 'IMAGE'] as const).map(type => (
              <label key={type} className={`relative flex min-h-28 cursor-pointer flex-col justify-end rounded-2xl p-3 ${questType === type ? 'bg-[#c8e8f4]' : 'bg-neutral-100'}`}>
                <input className="peer sr-only" type="radio" name="quest-type" value={type}
                  checked={questType === type} onChange={() => setQuestType(type)} />
                <span aria-hidden="true" className={`absolute right-3 top-3 grid size-6 place-items-center rounded-full peer-focus-visible:ring-2 ${questType === type ? 'bg-[#242624] text-white' : 'bg-neutral-200'}`}>
                  {questType === type && <Check size={14} />}
                </span>
                <strong className="text-sm">{type === 'GENERAL' ? '일반' : '이미지'}</strong>
                <small className="mt-1 text-[11px]">{type === 'GENERAL' ? '글 필수 · 사진 선택' : '글 · 사진 필수'}</small>
              </label>
            ))}
          </fieldset>
          <QuestPlacePicker value={place} onChange={setPlace} />
          <label className="block text-sm font-semibold">
            그리운 이유
            <textarea value={reason} maxLength={500} rows={4}
              placeholder="이 장소가 그리운 이유를 적어주세요."
              className="mt-2 block w-full resize-none rounded-2xl bg-neutral-100 p-4 text-sm font-normal"
              onChange={event => setReason(event.target.value)} />
          </label>
          <button type="button" className={`${primary} mt-auto flex-none`} disabled={!place || !reason.trim()}
            onClick={() => move('photo')}>다음</button>
        </>
      )}

      {stage === 'photo' && (
        <>
          <span className="w-fit rounded-full bg-[#ffe9a9] px-3 py-1 text-xs">{general ? '일반' : '이미지'} 퀘스트</span>
          <h1 className="text-2xl font-semibold leading-tight">{general ? <>사진이 있다면<br />함께 올려주세요</> : <>그때 찍은 사진을<br />올려주세요</>}</h1>
          <p className="text-sm text-neutral-600">{general ? '사진 없이 글만으로도 퀘스트를 만들 수 있어요.' : '수행자가 같은 장소를 찾고 비교할 수 있는 사진을 골라주세요.'}</p>
          <input ref={input} type="file" accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp" hidden
            onChange={event => {
              const file = event.target.files?.[0]
              event.currentTarget.value = ''
              if (file) void choosePhoto(file)
            }} />
          {photoUrl ? (
            <div className="relative h-[min(42dvh,340px)] min-h-48 overflow-hidden rounded-3xl bg-neutral-100">
              <img src={photoUrl} alt="선택한 그리움 사진" className="size-full object-cover" />
              <button type="button" aria-label="선택한 사진 지우기" className="absolute right-3 top-3 grid size-9 place-items-center rounded-full bg-white"
                disabled={readingPhoto} onClick={() => { setPhoto(null); setError('') }}><X size={18} /></button>
              <button type="button" className="absolute bottom-3 left-3 rounded-full bg-white px-3 py-2 text-xs"
                disabled={readingPhoto} onClick={() => input.current?.click()}>다시 고르기</button>
            </div>
          ) : (
            <button type="button" className="grid h-[min(42dvh,340px)] min-h-48 place-content-center justify-items-center gap-3 rounded-3xl bg-neutral-100 text-sm"
              disabled={readingPhoto} onClick={() => input.current?.click()}>
              <span className="grid size-12 place-items-center rounded-full bg-[#c8e8f4]"><Plus size={22} /></span>
              {readingPhoto ? '사진을 확인하는 중…' : general ? '사진 추가하기' : '갤러리에서 고르기'}
            </button>
          )}
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <button type="button" className={`${primary} mt-auto flex-none`} disabled={readingPhoto || (!general && !photo)}
            onClick={() => void generate()}>{!general && !photo ? '사진을 골라주세요' : 'AI로 퀘스트 만들기'}</button>
        </>
      )}

      {busy && (
        <div className="flex flex-1 flex-col items-center justify-center gap-8 py-10 text-center" role="status">
          <h1 className="text-2xl font-semibold">{stage === 'generating' ? <>그리움을 퀘스트로<br />바꾸는 중…</> : '그리움을 등록하는 중…'}</h1>
          {photoUrl ? <img src={photoUrl} alt="선택한 사진" className="size-44 rounded-full border-4 border-white object-cover" />
            : <MailOpen className="size-28 text-[#6794a3]" strokeWidth={1} />}
          <LoaderCircle className="animate-spin text-[#9d781e]" aria-hidden="true" />
          <p className="text-sm text-neutral-600">잠시만 기다려 주세요.</p>
        </div>
      )}

      {stage === 'previewError' && (
        <>
          <MailOpen className="mx-auto mt-10 size-32 text-[#6794a3]" strokeWidth={1} aria-hidden="true" />
          <h1 className="mt-6 text-2xl font-semibold">퀘스트를<br />만들지 못했어요</h1>
          <p role="alert" className="text-sm text-neutral-700">{error}</p>
          <div className="mt-auto flex gap-2">
            <button type="button" className={secondary} onClick={() => move('details')}>수정하기</button>
            <button type="button" className={primary} onClick={() => void generate()}>다시 만들기</button>
          </div>
        </>
      )}

      {hasResultCard && preview && (
        <>
          <h1 className="text-2xl font-semibold leading-tight">{stage === 'preview' ? <>이런 퀘스트가<br />만들어졌어요</> : <>아직 등록되지<br />않았어요</>}</h1>
          {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
          <div className="grid grid-cols-[2fr_1fr] gap-2">
            <div className="relative flex min-h-28 items-end overflow-hidden rounded-2xl bg-neutral-100 p-3">
              {photoUrl && <img src={photoUrl} alt="퀘스트 사진" className="absolute inset-0 size-full object-cover" />}
              <span className={`relative text-sm font-medium ${photoUrl ? 'rounded bg-black/65 px-2 py-1 text-white' : ''}`}>{place?.placeName}</span>
            </div>
            <div className="rounded-2xl bg-[#c8e8f4] p-3">
              <small>난이도</small>
              <p className="my-1 text-3xl">{preview.difficulty}</p>
              <p className="text-xs">{preview.difficultyReason}</p>
            </div>
          </div>
          {stage === 'preview' ? (
            <div className="space-y-3 rounded-2xl bg-neutral-100 p-3">
              <label className="block text-xs font-semibold">퀘스트 제목
                <input value={preview.questTitle} className="mt-1 w-full rounded-lg bg-white p-2 text-sm font-normal"
                  onChange={event => setPreview({ ...preview, questTitle: event.target.value })} />
              </label>
              <label className="block text-xs font-semibold">퀘스트 설명
                <textarea value={preview.questDescription} rows={3} className="mt-1 w-full rounded-lg bg-white p-2 text-sm font-normal"
                  onChange={event => setPreview({ ...preview, questDescription: event.target.value })} />
              </label>
            </div>
          ) : (
            <div className="rounded-2xl bg-neutral-100 p-4 text-sm">
              <strong>{preview.questTitle}</strong>
              <p className="mt-2 whitespace-pre-line">{preview.questDescription}</p>
            </div>
          )}
          <div className="mt-auto flex gap-2">
            {stage === 'registerError' && <button type="button" className={secondary} onClick={() => move('preview')}>문구 수정</button>}
            <button type="button" className={primary} disabled={!preview.questTitle.trim() || !preview.questDescription.trim()}
              onClick={() => void register()}>{stage === 'preview' ? '이대로 등록하기' : '다시 등록하기'}</button>
          </div>
        </>
      )}

      {stage === 'done' && (
        <>
          <MailOpen className="mx-auto mt-24 size-40 text-[#6794a3]" strokeWidth={1} aria-hidden="true" />
          <h1 className="mt-8 text-2xl font-semibold">등록 완료</h1>
          <p className="text-sm text-neutral-600">누군가 다녀오면 안부가 도착해요.</p>
          <Link to="/" className={`${primary} mt-auto flex-none`}>지도에서 보기</Link>
        </>
      )}
    </section>
  )
}
