// 로그인 화면 상단의 서비스 로고 영역입니다.
export default function LoginHeader() {
  return (
    <header className="flex justify-center pt-[clamp(4rem,15dvh,8rem)]">
      {/* 실제 로고 에셋이 준비되면 이 영역에 연결합니다. */}
      <h1
        id="login-heading"
        className="text-2xl font-semibold tracking-tight"
      >
        <span aria-hidden="true">서비스 로고</span>
        <span className="sr-only">그리움 퀘스트 로그인</span>
      </h1>
    </header>
  )
}
