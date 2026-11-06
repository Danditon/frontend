// 서비스 로고와 로그인 폼의 배경·여백·배치를 담당하는 화면 컴포넌트입니다.
import LoginHeader from './LoginHeader'
import LoginForm from './LoginForm'

export default function LoginScreen() {
  return (
    <section
      aria-labelledby="login-heading"
      className="flex min-h-full flex-col bg-white px-6 pt-[calc(1rem+env(safe-area-inset-top,0px))] pb-[calc(2.5rem+env(safe-area-inset-bottom,0px))] text-[#242624]"
      style={{ fontFamily: '"Pretendard", system-ui, sans-serif' }}
    >
      <LoginHeader />

      {/* 작은 화면에서는 고정 배치 대신 페이지 스크롤로 폼에 접근합니다. */}
      <div className="mt-auto pt-24">
        <LoginForm />
      </div>
    </section>
  )
}
