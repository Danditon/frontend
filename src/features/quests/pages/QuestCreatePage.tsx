import { useCallback, useEffect, useRef, useState } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { AnimatePresence, useReducedMotion } from 'motion/react'
import CreationHeader from '../components/creation/CreationHeader'
import CreationDetailsStep from '../components/creation/CreationDetailsStep'
import CreationPhotoStep from '../components/creation/CreationPhotoStep'
import CreationPreviewStep from '../components/creation/CreationPreviewStep'
import CreationGeneratingStep from '../components/creation/CreationGeneratingStep'
import CreationResultStep from '../components/creation/CreationResultStep'
import CreationScreen from '../components/creation/CreationScreen'
import { useCreationTransition } from '../components/creation/useCreationTransition'
import type { CreationDirection, CreationStage } from '../components/creation/questCreationMotion'
import { creationScreenKey } from '../components/creation/questCreationMotion'
import '../components/creation/questCreation.css'
import {
  previewQuest, registerQuest, registrationError, isRegistrationUncertain,
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
  const [registrationUncertain, setRegistrationUncertain] = useState(false)
  const request = useRef<AbortController | null>(null)
  const generating = useRef(false)
  const photoRequest = useRef(0)
  const photoUrl = photo?.url
  const busy = stage === 'generating' || stage === 'registering'
  const step = stage === 'details' ? 1 : stage === 'photo' || stage === 'generating' ? 2 : 3
  const general = questType === 'GENERAL'
  const failed = stage === 'previewError' || stage === 'registerError'

  function invalidateQuestLists() {
    void queryClient.invalidateQueries({ queryKey: ['my-quests'] })
    void queryClient.invalidateQueries({ queryKey: ['quests'] })
  }

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

  function goBack() {
    if (stage === 'photo') move('details', -1)
    else if (stage === 'registerError') move('preview', -1)
    else if (stage === 'preview' && registrationUncertain) move('registerError', -1)
    else move('photo', -1)
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
    if (registrationUncertain || !place || !reason.trim() || (!general && !photo) || readingPhoto || request.current || generating.current) return
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
    if (registrationUncertain || !place || !preview || !preview.questTitle.trim() || !preview.questDescription.trim() || request.current) return
    if (!move('registering')) return
    const controller = new AbortController()
    request.current = controller
    try {
      await registerQuest({ ...place, questType, longingText: reason.trim() }, preview, photo?.file ?? null, controller.signal)
      if (controller.signal.aborted) return
      invalidateQuestLists()
      show('done')
    } catch (cause) {
      if (controller.signal.aborted) return
      const uncertain = isRegistrationUncertain(cause)
      setRegistrationUncertain(uncertain)
      if (uncertain) invalidateQuestLists()
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
      data-result={stage === 'generating' || stage === 'done' || failed}
      data-failed={failed}
      data-generating={stage === 'generating'}
    >
      <div className="creation-failure-backdrop" aria-hidden="true" />
      <CreationHeader
        step={step}
        backToHome={stage === 'details'}
        busy={busy}
        hidden={stage === 'done'}
        hideSteps={failed}
        isTransitioning={isTransitioning}
        reducedMotion={reducedMotion}
        onBack={goBack}
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
                reducedMotion={reducedMotion}
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

            {(stage === 'preview' || stage === 'registering') && preview && (
              <CreationPreviewStep
                preview={preview}
                photoUrl={photoUrl ?? null}
                placeName={place?.placeName ?? ''}
                registering={stage === 'registering'}
                registrationUncertain={registrationUncertain}
                error={error}
                onChange={setPreview}
                onRegister={() => { void register() }}
              />
            )}

            {(stage === 'done' || stage === 'previewError' || stage === 'registerError') && (
              <CreationResultStep
                outcome={stage}
                error={error}
                uncertain={registrationUncertain}
                active={!isTransitioning}
                reducedMotion={reducedMotion}
                onEdit={() => move(stage === 'previewError' ? 'details' : 'preview', -1)}
                onRetry={() => { if (stage === 'previewError') void generate(); else void register() }}
              />
            )}
          </CreationScreen>
        </AnimatePresence>
      </div>
    </section>
  )
}
