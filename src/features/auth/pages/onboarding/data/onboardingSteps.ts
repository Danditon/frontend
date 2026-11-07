// 온보딩의 화면별 문구와 그림을 관리합니다. 추후 visual만 레이어 컴포넌트로 교체합니다.
import memoryImage from '@/assets/onboarding/memory.png'
import visitImage from '@/assets/onboarding/visit.png'
import greetingImage from '@/assets/onboarding/greeting.png'
import type { OnboardingStep } from '@/features/auth/types/onboarding'

export const onboardingSteps: OnboardingStep[] = [
  {
    id: 'leave-memory',
    title: '그리운 곳을\n남겨요',
    description: '잊지 못한 장소와\n그곳의 이야기를 남겨주세요.',
    visual: {
      kind: 'image',
      src: memoryImage,
      alt: '그리운 동네 가게의 사진과 종이에 남긴 추억',
    },
  },
  {
    id: 'visit-place',
    title: '누군가 대신\n다녀와요',
    description: '그곳 가까이에 있는 누군가가\n당신의 그리움에 발걸음을 보태요.',
    visual: {
      kind: 'image',
      src: visitImage,
      alt: '점선 길을 따라 그리운 가게로 걸어가는 사람',
    },
  },
  {
    id: 'receive-greeting',
    title: '지금 모습이\n안부로 도착해요',
    description: '사진 한 장, 짧은 인사로\n그리운 곳의 오늘을 만나보세요.',
    visual: {
      kind: 'image',
      src: greetingImage,
      alt: '가게의 현재 사진이 담긴 하늘색 안부 편지',
    },
  },
]
