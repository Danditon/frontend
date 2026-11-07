// 회원가입 입력값 검증과 입력란별 오류를 표시하는 폼 컴포넌트입니다.
import axios from 'axios'
import { useState } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { Input } from '@/shared/components/ui/input'
import { Button } from '@/shared/components/ui/button'
import { signupSchema } from '@/features/auth/schemas/signup'
import type { SignupValues } from '@/features/auth/schemas/signup'
import type { ApiErrorResponse, SignupRequest } from '@/features/auth/types/auth'
import { getAuthErrorMessage } from '@/features/auth/utils/getAuthErrorMessage'

type Props = {
  onSubmit: (values: SignupRequest) => Promise<void>
  disabled: boolean
}

export default function SignupForm({ onSubmit, disabled }: Props) {
  // 서버 연결 오류는 입력값의 유효성과 분리해 같은 값으로 재시도할 수 있게 합니다.
  const [message, setMessage] = useState('')
  const {
    register,
    handleSubmit,
    setError,
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

  const submit = handleSubmit(async (values) => {
    if (disabled) return
    setMessage('')

    try {
      // 확인용 비밀번호는 제외하고 검증된 값만 화면의 요청 함수에 전달합니다.
      await onSubmit({
        email: values.email,
        password: values.password,
        nickname: values.nickname,
      })
    } catch (error) {
      // 화면을 떠나 취소된 요청은 실패 안내를 표시하지 않습니다.
      if (axios.isCancel(error)) return

      const message = getAuthErrorMessage(error, 'signup')
      if (
        axios.isAxiosError<ApiErrorResponse>(error) &&
        error.response?.status === 409 &&
        error.response.data?.code === 'DUPLICATE_EMAIL'
      ) {
        setError('email', { type: 'server', message }, { shouldFocus: true })
      } else {
        setMessage(message)
      }
    }
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
      <fieldset disabled={disabled || isSubmitting} className="space-y-5">
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
      </fieldset>

      <Button
        type="submit"
        disabled={disabled || !isValid || isSubmitting}
        className="mt-7 h-14 w-full rounded-[22px] bg-[#D3E7F4] text-base font-medium text-[#242624] hover:bg-[#C7E0F0]"
      >
        {isSubmitting ? '가입하는 중…' : '회원가입'}
      </Button>

      {/* 성공은 화면 이동으로 처리하고, 서버 오류는 폼 아래에 표시합니다. */}
      <p
        role={message ? 'alert' : 'status'}
        className="mt-3 min-h-5 text-center text-xs leading-5 text-red-600"
      >
        {message}
      </p>
    </form>
  )
}
