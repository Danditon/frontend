import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { ActiveQuestProvider } from '@/features/quests/providers/ActiveQuestProvider'

const queryClient = new QueryClient()

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      {/* 라우터보다 위에서 수행 중 상태를 관리해 화면 이동 중에도 유지합니다. */}
      <ActiveQuestProvider>
        {children}
      </ActiveQuestProvider>
    </QueryClientProvider>
  )
}
