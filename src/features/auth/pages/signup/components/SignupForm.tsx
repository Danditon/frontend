// 이메일·비밀번호·비밀번호 확인·닉네임을 입력하는 회원가입 UI입니다.
import { useState } from 'react'
import type { FormEventHandler } from 'react'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'

export default function SignupForm() {
  const [message, setMessage] = useState('')

  const handleSubmit: FormEventHandler<HTMLFormElement> = (event) => {
    event.preventDefault()

    // shortcut: UI 단계입니다. 이후 입력 검증과 회원가입 API를 연결합니다.
    // 검증 예정: 닉네임 2~20자, 비밀번호 최소 8자·최대 한글 기준 24자.
    setMessage('회원가입 기능은 아직 연결되지 않았어요.')
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="space-y-5">
        <div className="space-y-2">
          <label htmlFor="signup-email" className="text-sm font-medium">
            이메일
          </label>
          <Input
            id="signup-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="이메일을 입력해주세요"
            required
            className="h-14 rounded-full border-0 bg-[#F4F4F4] px-6 text-base text-[#242624] shadow-none placeholder:text-[#ADB1B5] md:text-base"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="signup-password" className="text-sm font-medium">
            비밀번호
          </label>
          <Input
            id="signup-password"
            name="password"
            type="password"
            autoComplete="new-password"
            placeholder="비밀번호를 입력해주세요"
            aria-describedby="signup-password-hint"
            required
            className="h-14 rounded-full border-0 bg-[#F4F4F4] px-6 text-base text-[#242624] shadow-none placeholder:text-[#ADB1B5] md:text-base"
          />
          <p id="signup-password-hint" className="px-2 text-xs text-[#66757B]">
            8자 이상, 최대 한글 기준 24자
          </p>
        </div>

        <div className="space-y-2">
          <label htmlFor="signup-password-confirm" className="text-sm font-medium">
            비밀번호 확인
          </label>
          <Input
            id="signup-password-confirm"
            name="passwordConfirm"
            type="password"
            autoComplete="new-password"
            placeholder="비밀번호를 다시 입력해주세요"
            required
            className="h-14 rounded-full border-0 bg-[#F4F4F4] px-6 text-base text-[#242624] shadow-none placeholder:text-[#ADB1B5] md:text-base"
          />
        </div>

        <div className="space-y-2">
          <label htmlFor="signup-nickname" className="text-sm font-medium">
            닉네임
          </label>
          <Input
            id="signup-nickname"
            name="nickname"
            type="text"
            autoComplete="nickname"
            placeholder="닉네임을 입력해주세요"
            aria-describedby="signup-nickname-hint"
            required
            className="h-14 rounded-full border-0 bg-[#F4F4F4] px-6 text-base text-[#242624] shadow-none placeholder:text-[#ADB1B5] md:text-base"
          />
          <p id="signup-nickname-hint" className="px-2 text-xs text-[#66757B]">
            2~20자
          </p>
        </div>
      </div>

      <Button
        type="submit"
        className="mt-7 h-14 w-full rounded-[22px] bg-[#D3E7F4] text-base font-medium text-[#242624] hover:bg-[#C7E0F0]"
      >
        회원가입
      </Button>

      {/* 실제 가입 성공을 표시하지 않고 API 미연결 상태만 안내합니다. */}
      <p
        role="status"
        className="mt-3 min-h-5 text-center text-xs leading-5 text-[#66757B]"
      >
        {message}
      </p>
    </form>
  )
}
