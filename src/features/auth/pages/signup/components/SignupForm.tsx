// 회원가입 입력값 검증과 입력란별 오류를 표시하는 폼 컴포넌트입니다.
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import { signupSchema } from '@/features/auth/schemas/signup'
import type { SignupValues } from '@/features/auth/schemas/signup'

export default function SignupForm() {
  const [message, setMessage] = useState('')
  const {
    register,
    handleSubmit,
    formState: { errors, touchedFields, isSubmitted, isValid, isSubmitting },
  } = useForm<SignupValues>({
    resolver: zodResolver(signupSchema),
    // 처음에는 입력란을 떠날 때, 이후에는 수정할 때마다 검사합니다.
    mode: 'onTouched',
    defaultValues: {
      email: '',
      password: '',
      passwordConfirm: '',
      nickname: '',
    },
  })

  const submit = handleSubmit(() => {
    // shortcut: 입력 검증까지 제공합니다. 이후 단계에서 회원가입 API를 연결합니다.
    setMessage('회원가입 기능은 아직 연결되지 않았어요.')
  })

  // 다른 입력란의 검증 결과가 생겨도 사용하지 않은 입력란에는 오류를 표시하지 않습니다.
  const emailError = touchedFields.email || isSubmitted ? errors.email?.message : undefined
  const passwordError = touchedFields.password || isSubmitted ? errors.password?.message : undefined
  const passwordConfirmError = touchedFields.passwordConfirm || isSubmitted
    ? errors.passwordConfirm?.message
    : undefined
  const nicknameError = touchedFields.nickname || isSubmitted ? errors.nickname?.message : undefined

  return (
    <form onSubmit={submit} noValidate className="w-full">
      <div className="space-y-5">
        <div className="space-y-2">
          <label htmlFor="signup-email" className="text-sm font-medium">
            이메일
          </label>
          <Input
            {...register('email')}
            id="signup-email"
            type="email"
            inputMode="email"
            autoComplete="username"
            autoCapitalize="none"
            spellCheck={false}
            placeholder="이메일을 입력해주세요"
            aria-invalid={Boolean(emailError)}
            aria-describedby={emailError ? 'signup-email-error' : undefined}
            required
            className="h-14 rounded-full border-0 bg-[#F4F4F4] px-6 text-base text-[#242624] shadow-none placeholder:text-[#ADB1B5] md:text-base"
          />
          {emailError && (
            <p id="signup-email-error" role="alert" className="px-2 text-xs text-red-600">
              {emailError}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="signup-password" className="text-sm font-medium">
            비밀번호
          </label>
          <Input
            // 원래 비밀번호를 수정해도 확인 입력란의 일치 여부를 다시 검사합니다.
            {...register('password', { deps: ['passwordConfirm'] })}
            id="signup-password"
            type="password"
            autoComplete="new-password"
            placeholder="비밀번호를 입력해주세요"
            aria-invalid={Boolean(passwordError)}
            aria-describedby={passwordError
              ? 'signup-password-hint signup-password-error'
              : 'signup-password-hint'}
            required
            className="h-14 rounded-full border-0 bg-[#F4F4F4] px-6 text-base text-[#242624] shadow-none placeholder:text-[#ADB1B5] md:text-base"
          />
          <p id="signup-password-hint" className="px-2 text-xs text-[#66757B]">
            8~24자
          </p>
          {passwordError && (
            <p id="signup-password-error" role="alert" className="px-2 text-xs text-red-600">
              {passwordError}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="signup-password-confirm" className="text-sm font-medium">
            비밀번호 확인
          </label>
          <Input
            {...register('passwordConfirm')}
            id="signup-password-confirm"
            type="password"
            autoComplete="new-password"
            placeholder="비밀번호를 다시 입력해주세요"
            aria-invalid={Boolean(passwordConfirmError)}
            aria-describedby={passwordConfirmError ? 'signup-password-confirm-error' : undefined}
            required
            className="h-14 rounded-full border-0 bg-[#F4F4F4] px-6 text-base text-[#242624] shadow-none placeholder:text-[#ADB1B5] md:text-base"
          />
          {passwordConfirmError && (
            <p id="signup-password-confirm-error" role="alert" className="px-2 text-xs text-red-600">
              {passwordConfirmError}
            </p>
          )}
        </div>

        <div className="space-y-2">
          <label htmlFor="signup-nickname" className="text-sm font-medium">
            닉네임
          </label>
          <Input
            {...register('nickname')}
            id="signup-nickname"
            type="text"
            autoComplete="nickname"
            placeholder="닉네임을 입력해주세요"
            aria-invalid={Boolean(nicknameError)}
            aria-describedby={nicknameError
              ? 'signup-nickname-hint signup-nickname-error'
              : 'signup-nickname-hint'}
            required
            className="h-14 rounded-full border-0 bg-[#F4F4F4] px-6 text-base text-[#242624] shadow-none placeholder:text-[#ADB1B5] md:text-base"
          />
          <p id="signup-nickname-hint" className="px-2 text-xs text-[#66757B]">
            2~20자
          </p>
          {nicknameError && (
            <p id="signup-nickname-error" role="alert" className="px-2 text-xs text-red-600">
              {nicknameError}
            </p>
          )}
        </div>
      </div>

      <Button
        type="submit"
        disabled={!isValid || isSubmitting}
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
