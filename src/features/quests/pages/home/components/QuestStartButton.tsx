// 상세 Drawer에서 선택한 퀘스트의 수행 인증 화면으로 이동하는 버튼입니다.
import { useNavigate } from 'react-router'
import { Button } from '@/shared/components/ui/button'
import type { QuestDetail } from '@/features/quests/types/quest'
import { getQuestVerifyPath } from '../utils/getQuestVerifyPath'

type Props = {
  quest: QuestDetail
}

export default function QuestStartButton({ quest }: Props) {
  const navigate = useNavigate()
  const disabled = quest.isMine || quest.myStatus === 'PASSED'

  function handleStart() {
    // 비활성 버튼 외에 함수에서도 수행 불가 조건을 확인합니다.
    if (disabled) return

    navigate(getQuestVerifyPath(quest))
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        disabled={disabled}
        onClick={handleStart}
        className="h-11 w-full rounded-full bg-[#242624] text-white hover:bg-[#242624]/90"
      >
        수행 인증하기
      </Button>

      {quest.isMine && (
        <p className="text-sm text-neutral-500">
          내가 등록한 퀘스트는 수행할 수 없어요.
        </p>
      )}

      {quest.myStatus === 'PASSED' && (
        <p className="text-sm text-neutral-500">
          이미 수행을 완료한 퀘스트예요.
        </p>
      )}
    </div>
  )
}
