import { useCallback, useEffect, useRef, useState } from 'react'
import { Link } from 'react-router'
import { useQueryClient } from '@tanstack/react-query'
import { MailOpen } from 'lucide-react'
import { AnimatePresence, useReducedMotion } from 'motion/react'
import CreationHeader from '../components/creation/CreationHeader'
import CreationDetailsStep from '../components/creation/CreationDetailsStep'
import CreationPhotoStep from '../components/creation/CreationPhotoStep'
import CreationPreviewStep from '../components/creation/CreationPreviewStep'
import CreationGeneratingStep from '../components/creation/CreationGeneratingStep'
import CreationScreen from '../components/creation/CreationScreen'
import { useCreationTransition } from '../components/creation/useCreationTransition'
import type { CreationDirection, CreationStage } from '../components/creation/questCreationMotion'
import { creationScreenKey } from '../components/creation/questCreationMotion'
import '../components/creation/questCreation.css'
import {
  previewQuest, registerQuest, registrationError,
  type RegistrationPlace, type RegistrationPreview,
} from '../api/questRegistration'
import { decodeQuestPhoto } from '../lib/questPhoto'

type QuestType = 'GENERAL' | 'IMAGE'

export default function QuestCreatePage() {
  const queryClient = useQueryClient()
  const { screen, isTransitioning, move: moveScreen, show, complete } = useCreationTransition()
  const { stage } = screen
  const reducedMotion = Boolean(useReducedMotion())
  const [questType, setQuestType] = useState<QuestType>('GENERAL')
  const [place, setPlace] = useState<RegistrationPlace | null>(null)
  const [reason, setReason] = useState('')
  const [photo, setPhoto] = useState<{ file: File; url: string } | null>(null)
  const [readingPhoto, setReadingPhoto] = useState(false)
  const [preview, setPreview] = useState<RegistrationPreview | null>(null)
  const [error, setError] = useState('')
  const request = useRef<AbortController | null>(null)
  const generating = useRef(false)
  const photoRequest = useRef(0)
  const photoUrl = photo?.url
  const busy = stage === 'generating' || stage === 'registering'
  const step = stage === 'details' ? 1 : stage === 'photo' || stage === 'generating' ? 2 : 3
  const general = questType === 'GENERAL'

  useEffect(() => () => { if (photoUrl) URL.revokeObjectURL(photoUrl) }, [photoUrl])
  useEffect(() => () => {
    generating.current = false
    request.current?.abort()
    photoRequest.current += 1
  }, [])

  const finishGeneration = useCallback(() => {
    if (!generating.current || !preview || request.current) return
    generating.current = false
    show('preview', 'fade')
  }, [preview, show])

  function move(next: CreationStage, direction: CreationDirection = 1) {
    if (!moveScreen(next, direction)) return false
    setError('')
    return true
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
    if (!place || !reason.trim() || (!general && !photo) || readingPhoto || request.current || generating.current) return
    if (!move('generating')) return
    generating.current = true
    setPreview(null)
    const controller = new AbortController()
    request.current = controller
    try {
      const result = await previewQuest({ ...place, questType, longingText: reason.trim() }, controller.signal)
      if (controller.signal.aborted) return
      setPreview(result)
    } catch (cause) {
      generating.current = false
      if (controller.signal.aborted) return
      setError(registrationError(cause, 'preview'))
      show('previewError')
    } finally {
      if (controller.signal.aborted) generating.current = false
      if (request.current === controller) request.current = null
    }
  }

  async function register() {
    if (!place || !preview || !preview.questTitle.trim() || !preview.questDescription.trim() || request.current) return
    if (!move('registering')) return
    const controller = new AbortController()
    request.current = controller
    try {
      await registerQuest({ ...place, questType, longingText: reason.trim() }, preview, photo?.file ?? null, controller.signal)
      void queryClient.invalidateQueries({ queryKey: ['my-quests'] })
      if (!controller.signal.aborted) show('done')
    } catch (cause) {
      if (controller.signal.aborted) return
      setError(registrationError(cause, 'register'))
      show('registerError')
    } finally {
      if (request.current === controller) request.current = null
    }
  }

  return (
    <section
      aria-label="그리움 등록"
      className="quest-create-page"
      data-result={stage === 'generating' || stage === 'done' || stage === 'previewError'}
      data-generating={stage === 'generating'}
    >
      <CreationHeader
        step={step}
        backToHome={stage === 'details'}
        busy={busy}
        hidden={stage === 'done'}
        isTransitioning={isTransitioning}
        reducedMotion={reducedMotion}
        onBack={() => move(stage === 'photo' ? 'details' : stage === 'registerError' ? 'preview' : 'photo', -1)}
      />

      <div className="creation-content" aria-busy={isTransitioning}>
        <AnimatePresence initial={false} mode="sync" custom={{ direction: screen.direction, kind: screen.kind, reducedMotion }}>
          <CreationScreen
            key={creationScreenKey(stage)}
            screen={screen}
            isTransitioning={isTransitioning}
            reducedMotion={reducedMotion}
            onComplete={complete}
          >
            {/* 상태를 페이지에 보관해 화면이 바뀌어도 입력과 사진을 유지합니다. */}
            {stage === 'details' && (
              <CreationDetailsStep
                questType={questType}
                place={place}
                reason={reason}
                onQuestTypeChange={setQuestType}
                onPlaceChange={setPlace}
                onReasonChange={setReason}
                onNext={() => move('photo')}
              />
            )}

            {stage === 'photo' && (
              <CreationPhotoStep
                questType={questType}
                photoUrl={photoUrl ?? null}
                readingPhoto={readingPhoto}
                error={error}
                onChoose={file => { void choosePhoto(file) }}
                onRemove={() => { setPhoto(null); setError('') }}
                onGenerate={() => { void generate() }}
              />
            )}

            {stage === 'generating' && (
              <CreationGeneratingStep
                photoUrl={photoUrl ?? null}
                ready={preview !== null}
                active={!isTransitioning}
                reducedMotion={reducedMotion}
                onComplete={finishGeneration}
              />
            )}

            {stage === 'previewError' && (
              <div className="creation-step">
                <MailOpen className="mx-auto mt-10 size-32 text-[#6794a3]" strokeWidth={1} aria-hidden="true" />
                <h1 className="creation-title">퀘스트를<br />만들지 못했어요</h1>
                <p role="alert" className="creation-description">{error}</p>
                <div className="creation-actions">
                  <button type="button" className="creation-secondary" onClick={() => move('details', -1)}>수정하기</button>
                  <button type="button" className="creation-primary" onClick={() => void generate()}>다시 만들기</button>
                </div>
              </div>
            )}

            {(stage === 'preview' || stage === 'registering' || stage === 'registerError') && preview && (
              <CreationPreviewStep
                preview={preview}
                photoUrl={photoUrl ?? null}
                placeName={place?.placeName ?? ''}
                registrationFailed={stage === 'registerError'}
                registering={stage === 'registering'}
                error={error}
                onChange={setPreview}
                onEdit={() => move('preview', -1)}
                onRegister={() => { void register() }}
              />
            )}

            {stage === 'done' && (
              <div className="creation-step">
                <MailOpen className="mx-auto mt-24 size-40 text-[#6794a3]" strokeWidth={1} aria-hidden="true" />
                <h1 className="creation-title">등록 완료</h1>
                <p className="creation-description">누군가 다녀오면 안부가 도착해요.</p>
                <div className="creation-actions">
                  <Link to="/" className="creation-primary">지도에서 보기</Link>
                </div>
              </div>
            )}
          </CreationScreen>
        </AnimatePresence>
      </div>
    </section>
  )
}
