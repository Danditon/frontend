// 홈 화면과 다른 페이지에서 수행 중인 퀘스트 ID를 공유하는 훅입니다.
import { createContext, useContext } from 'react'

type ActiveQuestContextValue = {
  activeQuestId: number | null // null이면 수행 중인 퀘스트가 없습니다.
  startQuest: (questId: number) => void // 수행 시작한 퀘스트의 ID를 저장합니다.
  clearQuest: (questId: number) => void // 완료한 ID가 현재 수행 중인 ID와 같을 때만 해제합니다.
}

export const ActiveQuestContext =
  createContext<ActiveQuestContextValue | null>(null)

export function useActiveQuest() {
  const context = useContext(ActiveQuestContext)

  if (!context) {
    throw new Error(
      'useActiveQuest는 ActiveQuestProvider 안에서 사용해야 합니다.',
    )
  }

  return context
}
