// 이메일·비밀번호 입력과 로그인 제출 UI를 담당하는 폼 컴포넌트입니다.
import { useState } from 'react'
import type { FormEventHandler } from 'react'
import { Link } from 'react-router'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'

export default function LoginForm() {
  const [message, setMessage] = useState('')

  const handleSubmit: FormEventHandler<HTMLFormElement> = (event) => {
    // 기본 제출로 페이지가 새로고침되는 것을 막습니다.
    event.preventDefault()

    // shortcut: 현재는 UI만 제공합니다. API 연결 단계에서 인증 요청으로 교체합니다.
    setMessage('로그인 기능은 아직 연결되지 않았어요.')
  }

  return (
    <form onSubmit={handleSubmit} className="w-full">
      <div className="space-y-3">
        <div>
          {/* placeholder와 별도로 입력란의 이름을 연결합니다. */}
          <label htmlFor="login-email" className="sr-only">
            이메일
          </label>

          <Input
            id="login-email"
            name="email"
            type="email"
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="이메일"
            required
            className="h-14 rounded-full border-0 bg-[#F4F4F4] px-6 text-base text-[#242624] shadow-none placeholder:text-[#ADB1B5] md:text-base"
          />
        </div>

        <div>
          <label htmlFor="login-password" className="sr-only">
            비밀번호
          </label>

          <Input
            id="login-password"
            name="password"
            type="password"
            autoComplete="current-password"
            placeholder="비밀번호"
            required
            className="h-14 rounded-full border-0 bg-[#F4F4F4] px-6 text-base text-[#242624] shadow-none placeholder:text-[#ADB1B5] md:text-base"
          />
        </div>
      </div>

      <Button
        type="submit"
        className="mt-6 h-14 w-full rounded-[22px] bg-[#D3E7F4] text-base font-medium text-[#242624] hover:bg-[#C7E0F0]"
      >
        로그인
      </Button>

      {/* 안내 영역의 높이를 확보해 문구가 생겨도 배치가 크게 흔들리지 않게 합니다. */}
      <p
        role="status"
        className="mt-3 min-h-5 text-center text-xs leading-5 text-[#66757B]"
      >
        {message}
      </p>

      <div className="mt-2 flex justify-center">
        {/* 약관 단계 없이 회원가입 입력 화면으로 이동합니다. */}
        <Link
          to="/signup"
          className="inline-flex min-h-11 items-center text-xs text-[#555D61]"
        >
          회원가입
        </Link>
      </div>
    </form>
  )
}
