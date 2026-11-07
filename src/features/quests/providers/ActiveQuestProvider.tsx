// 화면을 이동해도 수행 중인 퀘스트 ID를 유지하는 Provider입니다.
import { useState, type ReactNode } from 'react'
import { ActiveQuestContext } from '../hooks/useActiveQuest'

type Props = {
  children: ReactNode
}

export function ActiveQuestProvider({ children }: Props) {
  // 처음에는 카드가 없고, 수행 시작 시 전달된 ID로 바뀝니다.
  // 메모리에만 보관하므로 페이지 이동 중에는 유지되고 새로고침하면 초기화됩니다.
  const [activeQuestId, setActiveQuestId] = useState<number | null>(null)

  function clearQuest(questId: number) {
    // 이전 퀘스트의 늦은 완료 응답이 새 수행 상태를 지우지 않게 합니다.
    setActiveQuestId((currentId) => (
      currentId === questId ? null : currentId
    ))
  }

  return (
    <ActiveQuestContext.Provider
      value={{
        activeQuestId,
        startQuest: setActiveQuestId,
        clearQuest,
      }}
    >
      {children}
    </ActiveQuestContext.Provider>
  )
}
