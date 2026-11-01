import { Link } from 'react-router'

export default function NotFoundPage() {
  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-semibold">페이지를 찾을 수 없습니다</h1>
      <Link to="/">홈으로 돌아가기</Link>
    </section>
  )
}
