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

  return (
    <ActiveQuestContext.Provider
      value={{
        activeQuestId,
        startQuest: setActiveQuestId,
      }}
    >
      {children}
    </ActiveQuestContext.Provider>
  )
}
