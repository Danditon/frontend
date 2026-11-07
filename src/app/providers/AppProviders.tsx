import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import type { ReactNode } from 'react'
import { ActiveQuestProvider } from '@/features/quests/providers/ActiveQuestProvider'
import { AuthProvider } from '@/features/auth/providers/AuthProvider'

const queryClient = new QueryClient()

export function AppProviders({ children }: { children: ReactNode }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        {/* 수행 중 ID는 라우터보다 위에 보관해 화면 이동 중에도 유지합니다. */}
        <ActiveQuestProvider>
          {children}
        </ActiveQuestProvider>
      </AuthProvider>
    </QueryClientProvider>
  )
}
