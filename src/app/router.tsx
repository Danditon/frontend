import { createBrowserRouter } from "react-router";
import { RootLayout } from "@/app/layouts/RootLayout";
import RequireAuth from "@/features/auth/components/RequireAuth";
import LoginPage from "@/features/auth/pages/login/LoginPage";
import SignupPage from "@/features/auth/pages/signup/SignupPage";
import OnboardingPage from "@/features/auth/pages/onboarding/OnboardingPage";
import QuestMapPage from "@/features/quests/pages/home/QuestMapPage";
import QuestCreatePage from "@/features/quests/pages/QuestCreatePage";
import QuestDetailPage from "@/features/quests/pages/QuestDetailPage";
import QuestGreetingsPage from "@/features/quests/pages/QuestGreetingsPage";
import QuestVerifyPage from "@/features/quests/pages/QuestVerifyPage";
import MemoriesPage from "@/features/memories/pages/MemoriesPage";
import MyPage from "@/features/memories/pages/MyPage";
import HistoryPage from "@/features/history/pages/HistoryPage";
import NotFoundPage from "@/shared/components/NotFoundPage";

export const router = createBrowserRouter([
  {
    element: <RootLayout />,
    children: [
      { path: "/login", Component: LoginPage },
      { path: "/signup", Component: SignupPage },
    ],
  },
  {
    element: <RequireAuth />,
    children: [
      // 온보딩은 인증이 필요하지만 공통 navbar는 표시하지 않습니다.
      { path: "/onboarding", Component: OnboardingPage },
      {
        element: <RootLayout />,
        children: [
          { path: "/", Component: QuestMapPage },
          { path: "/quests/new", Component: QuestCreatePage },
          { path: "/quests/:questId", Component: QuestDetailPage },
          { path: "/quests/:questId/verify", Component: QuestVerifyPage },
          { path: "/quests/:questId/greetings", Component: QuestGreetingsPage },
          { path: "/me", Component: MyPage },
          { path: "/me/logout", Component: MyPage },
          { path: "/me/memories", Component: MemoriesPage },
          { path: "/me/history", Component: HistoryPage },
          { path: "*", Component: NotFoundPage },
        ],
      },
    ],
  },
]);
