// 수행 중인 퀘스트의 인증 화면으로 이동하는 공용 navbar 메뉴입니다.
import { BadgeCheck } from 'lucide-react'
import { useNavigate } from 'react-router'
import { useActiveQuest } from '../hooks/useActiveQuest'
import { useQuestDetail } from '../hooks/useQuestDetail'
import { getQuestVerifyPath } from '../pages/home/utils/getQuestVerifyPath'
import { getQuestQueryError } from '../pages/home/utils/getQuestQueryError'

export default function QuestVerifyNavItem() {
  const navigate = useNavigate()
  const { activeQuestId } = useActiveQuest()
  const query = useQuestDetail(activeQuestId)
  const queryError = query.isError ? getQuestQueryError(query.error, 'detail') : null
  const quest = queryError?.keepPreviousData === false ? undefined : query.data
  const isLoading = activeQuestId !== null && query.isPending

  function handleClick() {
    if (activeQuestId === null) {
      window.alert('먼저 수행할 퀘스트를 선택해주세요.')
      navigate('/')
      return
    }

    if (!quest) {
      window.alert(
        queryError?.message ?? '퀘스트 정보를 확인하는 중이에요.',
      )
      return
    }

    // 카드·Drawer와 같은 ID와 경로 규칙을 사용합니다. 수행 상태를 새로 지정하지 않습니다.
    navigate(getQuestVerifyPath(quest))
  }

  return (
    <button
      type="button"
      className="nav-item"
      disabled={isLoading}
      aria-busy={isLoading}
      onClick={handleClick}
    >
      <span className="nav-icon">
        <BadgeCheck size={20} strokeWidth={1.6} aria-hidden="true" />
      </span>
      <span>수행 인증</span>
    </button>
  )
}
