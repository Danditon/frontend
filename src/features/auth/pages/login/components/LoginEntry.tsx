// 로그인 진입 시 스플래시를 한 번 표시하고 기존 로그인 화면으로 전환하는 컴포넌트입니다.
import { useEffect, useState } from 'react'
import { motion, useReducedMotion } from 'motion/react'
import splashPhoto from '@/assets/auth/login-splash.png'
import LoginScreen from './LoginScreen'
import LoginSplash from './LoginSplash'

type SplashPhase = 'waiting' | 'visible' | 'exiting' | 'done'

// 인증 정보와 분리된 표시 기록으로, 같은 탭에서는 새로고침해도 다시 재생하지 않습니다.
const SPLASH_SEEN_KEY = 'loginSplashSeen'

export default function LoginEntry() {
  const reducedMotion = useReducedMotion()
  const [phase, setPhase] = useState<SplashPhase>(() => {
    try {
      return sessionStorage.getItem(SPLASH_SEEN_KEY) === 'true' ? 'done' : 'waiting'
    } catch {
      // 저장소가 차단돼도 스플래시와 로그인 전환 자체는 사용할 수 있습니다.
      return 'waiting'
    }
  })
  const showSplash = phase !== 'done'
  const showLogin = phase === 'exiting' || phase === 'done'

  useEffect(() => {
    if (!showSplash) return

    const image = new Image()
    let disposed = false
    let started = false
    let fadeTimer: number | undefined
    let finishTimer: number | undefined

    function startSplash() {
      // 캐시 완료·load·error·최대 대기가 겹쳐도 한 번만 전환을 시작합니다.
      if (disposed || started) return
      started = true
      window.clearTimeout(loadTimer)
      setPhase('visible')

      // 일반 모션은 등장 0.75초 + 유지 1.5초 + 퇴장 0.75초로 전체 3초입니다.
      // 모션 줄이기에서는 페이드 없이 짧게 표시하고 로그인으로 넘어갑니다.
      fadeTimer = window.setTimeout(() => setPhase('exiting'), reducedMotion ? 350 : 2250)
      finishTimer = window.setTimeout(() => {
        if (disposed) return
        try {
          sessionStorage.setItem(SPLASH_SEEN_KEY, 'true')
        } catch {
          // 표시 기록을 남기지 못해도 로그인 입력을 막지 않습니다.
        }
        setPhase('done')
      }, reducedMotion ? 350 : 3000)
    }

    // 사진을 기다리되, 로딩 실패나 느린 연결 때문에 로그인이 계속 가려지지 않게 합니다.
    const loadTimer = window.setTimeout(startSplash, 1500)
    image.onload = startSplash
    image.onerror = startSplash
    image.src = splashPhoto
    if (image.complete) queueMicrotask(startSplash)

    return () => {
      // 화면 이탈과 StrictMode 재실행 때 이전 타이머·이미지 콜백을 정리합니다.
      disposed = true
      image.onload = null
      image.onerror = null
      window.clearTimeout(loadTimer)
      window.clearTimeout(fadeTimer)
      window.clearTimeout(finishTimer)
    }
  }, [showSplash, reducedMotion])

  return (
    // cqh로 브라우저 전체가 아닌 실제 로그인 영역 높이에 맞춰 배치합니다.
    <div className={`relative isolate h-full [container-type:size] ${showSplash ? 'overflow-hidden' : ''} ${showLogin ? 'bg-white' : 'bg-[#D9EDF5]'}`}>
      {/* 폼은 유지해 인증 흐름을 보존하고, 스플래시가 끝날 때까지 클릭·탭 접근을 막습니다. */}
      <motion.div
        className="h-full"
        initial={false}
        animate={{ opacity: showLogin ? 1 : 0 }}
        transition={{ duration: reducedMotion ? 0 : 0.75 }}
        inert={showSplash}
        aria-hidden={showSplash}
      >
        <LoginScreen />
      </motion.div>

      {showSplash && (
        <LoginSplash
          visible={phase === 'visible'}
          reducedMotion={Boolean(reducedMotion)}
        />
      )}
    </div>
  )
}
