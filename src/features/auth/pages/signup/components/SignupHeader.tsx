// 회원가입 화면의 제목과 로그인 화면으로 돌아가는 버튼을 표시합니다.
import { ChevronLeft } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'

type Props = {
  onBack: () => void
  disabled: boolean
}

export default function SignupHeader({ onBack, disabled }: Props) {
  return (
    <header className="grid grid-cols-[44px_1fr_44px] items-center gap-2">
      <Button
        type="button"
        variant="ghost"
        onClick={onBack}
        disabled={disabled}
        aria-label="로그인으로 돌아가기"
        className="size-11 rounded-full"
      >
        <ChevronLeft aria-hidden="true" className="size-5" />
      </Button>

      <h1
        id="signup-heading"
        className="text-center text-xl font-semibold tracking-tight"
      >
        그립데이 회원가입
      </h1>

      {/* 뒤로가기 버튼과 같은 폭을 확보해 제목을 가운데에 둡니다. */}
      <span aria-hidden="true" />
    </header>
  )
}
