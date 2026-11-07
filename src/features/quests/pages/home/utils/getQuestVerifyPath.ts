// 수행 시작 버튼·수행 중 카드·navbar가 함께 사용하는 수행 화면 경로입니다.
import type { QuestDetail } from '@/features/quests/types/quest'

type QuestTarget = Pick<QuestDetail, 'questId' | 'questType'>

export function getQuestVerifyPath(quest: QuestTarget): string {
  // 현재 수행 화면은 type 쿼리로 일반·이미지를 구분합니다.
  const type = quest.questType === 'GENERAL' ? 'general' : 'image'

  return `/quests/${quest.questId}/verify?type=${type}`
}
