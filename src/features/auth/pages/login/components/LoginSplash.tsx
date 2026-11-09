// 로그인 전에 서비스 로고·문구·인물 사진을 페이드로 보여주는 스플래시 컴포넌트입니다.
import { motion } from 'motion/react'
import splashPhoto from '@/assets/auth/login-splash.png'
import LoginLogo from './LoginLogo'

type LoginSplashProps = {
  visible: boolean
  reducedMotion: boolean
}

export default function LoginSplash({ visible, reducedMotion }: LoginSplashProps) {
  return (
    <motion.section
      role="status"
      aria-label="그립데이를 시작합니다."
      className="absolute inset-0 z-10 overflow-hidden bg-[#D9EDF5] text-[#242624]"
      style={{ fontFamily: '"Pretendard", system-ui, sans-serif' }}
      initial={{ opacity: 0 }}
      animate={{ opacity: visible ? 1 : 0 }}
      transition={{ duration: reducedMotion ? 0 : 0.75, ease: 'easeInOut' }}
    >
      {/* 사진과 문구를 분리해 화면 비율이 달라져도 글자가 잘리거나 흐려지지 않게 합니다. */}
      <header className="absolute inset-x-0 top-[17cqh] z-10 flex flex-col items-center px-4 text-center">
        <LoginLogo className="text-white" />
        <p className="mt-3 text-base font-medium text-[#83ACC3]">
          그리운 곳으로 가는 안부
        </p>
      </header>

      {/* 장식 사진이므로 대체 텍스트를 비우고, 실패 시에도 로고·문구는 그대로 표시합니다. */}
      <img
        src={splashPhoto}
        alt=""
        width={804}
        height={1230}
        draggable={false}
        loading="eager"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-[70%] w-full object-cover object-top select-none"
        onError={(event) => { event.currentTarget.hidden = true }}
      />
    </motion.section>
  )
}
