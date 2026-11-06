// 상세 Drawer에서 선택한 퀘스트의 수행 인증 화면으로 이동하는 버튼입니다.
import { useNavigate } from 'react-router'
import { Button } from '@/shared/components/ui/button'
import type { QuestDetail } from '@/features/quests/types/quest'

type Props = {
  quest: QuestDetail
}

export default function QuestStartButton({ quest }: Props) {
  const navigate = useNavigate()
  const disabled = quest.isMine || quest.myStatus === 'PASSED'

  function handleStart() {
    // 비활성 버튼 외에 함수에서도 수행 불가 조건을 확인합니다.
    if (disabled) return

    // 현재 수행 화면은 URL의 type으로 종류를 구분하므로 기존 화면에 맞춰 전달합니다.
    // 실제 GPS 검사·인증 제출은 이 버튼에서 처리하지 않습니다.
    const type = quest.questType === 'GENERAL' ? 'general' : 'image'
    navigate(`/quests/${quest.questId}/verify?type=${type}`)
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        disabled={disabled}
        onClick={handleStart}
        className="h-11 w-full rounded-full bg-[#242624] text-white hover:bg-[#242624]/90"
      >
        수행하기
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
