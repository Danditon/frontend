// 상세 Drawer의 퀘스트를 수행 중인 퀘스트로 지정하는 버튼입니다.
import { Button } from '@/shared/components/ui/button'
import { useActiveQuest } from '@/features/quests/hooks/useActiveQuest'
import type { QuestDetail } from '@/features/quests/types/quest'

type Props = {
  quest: QuestDetail
  onStarted: () => void // 수행 중 ID를 저장한 뒤 상세 Drawer를 닫습니다.
}

export default function QuestStartButton({ quest, onStarted }: Props) {
  const { activeQuestId, startQuest } = useActiveQuest()
  const disabled = quest.isMine || quest.myStatus === 'PASSED'

  function handleStart() {
    // 비활성 버튼 외에 함수에서도 수행 불가 조건을 확인합니다.
    if (disabled) return

    // 다른 마커를 구경하는 것만으로는 수행 중 퀘스트를 바꾸지 않습니다.
    if (
      activeQuestId !== null &&
      activeQuestId !== quest.questId &&
      !window.confirm('수행 중인 퀘스트를 변경할까요?')
    ) {
      return
    }

    // 현재는 mock 선택만 처리합니다. 실제 GPS 검사·인증 제출은 연결하지 않습니다.
    startQuest(quest.questId)
    onStarted()
  }

  return (
    <div className="space-y-2">
      <Button
        type="button"
        disabled={disabled}
        onClick={handleStart}
        className="h-11 w-full rounded-full bg-[#242624] text-white hover:bg-[#242624]/90"
      >
        {activeQuestId === quest.questId
          ? '수행 중인 퀘스트 보기'
          : '수행 시작'}
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
