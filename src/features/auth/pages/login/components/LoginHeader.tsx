// 로그인 화면 상단의 서비스 로고 영역입니다.
import LoginLogo from './LoginLogo'

export default function LoginHeader() {
  return (
    <header className="flex shrink-0 justify-center">
      <h1 id="login-heading">
        <LoginLogo className="text-[#D3E7F4]" />
        <span className="sr-only">그립데이 로그인</span>
      </h1>
    </header>
  )
}
