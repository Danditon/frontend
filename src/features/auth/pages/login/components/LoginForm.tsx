// 이메일·비밀번호 입력과 로그인 제출 UI를 담당하는 폼 컴포넌트입니다.
import axios from 'axios'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Link } from 'react-router'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import { loginSchema } from '@/features/auth/schemas/login'
import type { LoginRequest } from '@/features/auth/types/auth'

type Props = {
  initialEmail: string
  signupHref: string
  disabled: boolean
  onSubmit: (values: LoginRequest) => Promise<void>
}

export default function LoginForm({ initialEmail, signupHref, disabled, onSubmit }: Props) {
  // 서버 오류 때문에 정상 입력값까지 무효가 되어 재시도가 막히지 않도록 분리합니다.
  const [message, setMessage] = useState('')
  const {
    register,
    handleSubmit,
    formState: { errors, touchedFields, isSubmitted, isValid, isSubmitting },
  } = useForm<LoginRequest>({
    resolver: zodResolver(loginSchema),
    mode: 'onTouched',
    defaultValues: { email: initialEmail, password: '' },
  })

  const submit = handleSubmit(async (values) => {
    if (disabled) return
    setMessage('')
    try {
      await onSubmit(values)
    } catch (error) {
      if (axios.isCancel(error)) return
      // 화면 컴포넌트에서 사용자용 문구로 변환한 오류만 전달받습니다.
      setMessage(error instanceof Error ? error.message : '로그인하지 못했어요. 다시 시도해주세요.')
    }
  })

  const emailError = touchedFields.email || isSubmitted ? errors.email?.message : undefined
  const passwordError = touchedFields.password || isSubmitted ? errors.password?.message : undefined

  return (
    <form onSubmit={submit} noValidate className="w-full">
      <fieldset disabled={disabled || isSubmitting} className="space-y-4">
        <div>
          {/* placeholder와 별도로 입력란의 이름을 연결합니다. */}
          <label htmlFor="login-email" className="sr-only">
            이메일
          </label>

          <Input
            {...register('email')}
            id="login-email"
            type="email"
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="이메일"
            aria-invalid={Boolean(emailError)}
            aria-describedby={emailError ? 'login-email-error' : undefined}
            required
            className="h-[68px] rounded-full border-0 bg-[#F4F4F4] px-6 text-base text-[#242624] shadow-none placeholder:text-[#ADB1B5] md:text-base"
          />
          {emailError && (
            <p id="login-email-error" role="alert" className="mt-2 px-2 text-xs text-red-600">
              {emailError}
            </p>
          )}
        </div>

        <div>
          <label htmlFor="login-password" className="sr-only">
            비밀번호
          </label>

          <Input
            {...register('password')}
            id="login-password"
            type="password"
            autoComplete="current-password"
            placeholder="비밀번호"
            aria-invalid={Boolean(passwordError)}
            aria-describedby={passwordError ? 'login-password-error' : undefined}
            required
            className="h-[68px] rounded-full border-0 bg-[#F4F4F4] px-6 text-base text-[#242624] shadow-none placeholder:text-[#ADB1B5] md:text-base"
          />
          {passwordError && (
            <p id="login-password-error" role="alert" className="mt-2 px-2 text-xs text-red-600">
              {passwordError}
            </p>
          )}
        </div>
      </fieldset>

      <Button
        type="submit"
        disabled={disabled || !isValid || isSubmitting}
        className="mt-7 h-[68px] w-full rounded-[24px] bg-[#D3E7F4] text-base font-medium text-[#242624] hover:bg-[#C7E0F0] disabled:opacity-100"
      >
        {isSubmitting ? '로그인하는 중…' : '로그인'}
      </Button>

      {/* 안내 영역의 높이를 확보해 문구가 생겨도 배치가 크게 흔들리지 않게 합니다. */}
      <p
        role={message ? 'alert' : 'status'}
        className={`mt-3 min-h-5 text-center text-xs leading-5 ${message ? 'text-red-600' : 'text-[#66757B]'}`}
      >
        {message || (initialEmail ? '회원가입이 완료됐어요. 로그인해주세요.' : '')}
      </p>

      <div className="mt-2 flex min-h-11 items-center justify-center text-xs">
        {/* 약관 단계 없이 회원가입 입력 화면으로 이동합니다. */}
        <Link
          to={signupHref}
          aria-disabled={disabled || isSubmitting}
          tabIndex={disabled || isSubmitting ? -1 : undefined}
          onClick={(event) => {
            if (disabled || isSubmitting) event.preventDefault()
          }}
          className="inline-flex min-h-11 items-center text-[#555D61]"
        >
          회원가입
        </Link>
      </div>
    </form>
  )
}
