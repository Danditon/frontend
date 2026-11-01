import { Link, Outlet } from 'react-router'

export function RootLayout() {
  return (
    <div className="mx-auto min-h-screen max-w-5xl p-6">
      <header className="mb-8 space-y-4">
        <Link to="/" className="text-xl font-semibold">그리움 퀘스트</Link>
        <nav aria-label="주 메뉴" className="flex flex-wrap gap-4">
          <Link to="/">퀘스트 지도</Link>
          <Link to="/quests/new">그리움 등록</Link>
          <Link to="/me/memories">내 그리움·안부</Link>
          <Link to="/me/history">수행 기록</Link>
          <Link to="/login">로그인</Link>
        </nav>
      </header>
      <main><Outlet /></main>
    </div>
  )
}
