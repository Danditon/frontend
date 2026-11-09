// 로그인 화면 상단의 서비스 로고 영역입니다.
import gripdayLogo from '@/assets/auth/gripday-logo.svg'

export default function LoginHeader() {
  return (
    <header className="flex justify-center pt-[clamp(2rem,10dvh,5rem)]">
      <h1 id="login-heading">
        <img src={gripdayLogo} alt="" width={573} height={219} className="h-auto w-[clamp(9rem,48vw,12rem)]" />
        <span className="sr-only">그립데이 로그인</span>
      </h1>
    </header>
  )
}
