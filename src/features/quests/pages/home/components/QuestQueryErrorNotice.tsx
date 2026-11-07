// 목록·카드·상세 Drawer에서 조회 오류와 재시도 또는 로그인 버튼을 표시하는 컴포넌트입니다.
import { Link } from 'react-router'
import type { QuestQueryErrorInfo } from '../utils/getQuestQueryError'

type Props = {
  info: QuestQueryErrorInfo
  isFetching: boolean
  onRetry: () => void
  showingPreviousData?: boolean
}

export default function QuestQueryErrorNotice({
  info,
  isFetching,
  onRetry,
  showingPreviousData = false,
}: Props) {
  return (
    <div role="alert" className="pointer-events-auto space-y-2 text-xs leading-5 text-[#303B3C]">
      <p>{info.message}</p>
      {showingPreviousData && info.keepPreviousData && (
        <p className="text-[#66757B]">이전에 불러온 결과를 표시하고 있어요.</p>
      )}

      {/* 로그인은 사용자가 선택해 이동하며, 여기서 토큰이나 인증 상태를 삭제하지 않습니다. */}
      {info.requiresLogin ? (
        <Link to="/login" className="inline-flex min-h-11 items-center font-medium underline underline-offset-4">
          로그인하기
        </Link>
      ) : (
        <button
          type="button"
          disabled={isFetching}
          aria-busy={isFetching}
          onClick={() => { if (!isFetching) onRetry() }}
          className="min-h-11 font-medium underline underline-offset-4 disabled:cursor-wait disabled:opacity-50"
        >
          {isFetching ? '다시 확인 중…' : '다시 시도'}
        </button>
      )}
    </div>
  )
}
