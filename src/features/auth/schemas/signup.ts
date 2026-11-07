// 회원가입 입력 형식·길이·비밀번호 일치 여부를 검사하는 스키마입니다.
import { z } from 'zod'

export const signupSchema = z.object({
  email: z.string().trim()
    .min(1, '이메일을 입력해주세요.')
    .pipe(z.email({ error: '이메일 형식을 확인해주세요. 예: user@naver.com' })),

  // shortcut: 바이트 기준이 미확정이므로 현재는 8~24글자로 제한합니다. BE 기준 확정 시 조정합니다.
  // 비밀번호는 공백을 자동 제거하거나 초과 입력을 잘라내지 않습니다.
  password: z.string()
    .min(1, '비밀번호를 입력해주세요.')
    .min(8, '비밀번호는 8자 이상 입력해주세요.')
    .max(24, '비밀번호는 24자 이하로 입력해주세요.'),

  passwordConfirm: z.string()
    .min(1, '비밀번호를 다시 입력해주세요.'),

  nickname: z.string().trim()
    .min(1, '닉네임을 입력해주세요.')
    .min(2, '닉네임은 2자 이상 입력해주세요.')
    .max(20, '닉네임은 20자 이하로 입력해주세요.'),
}).refine(
  (values) => values.password === values.passwordConfirm,
  {
    path: ['passwordConfirm'],
    message: '비밀번호가 일치하지 않아요.',
  },
)

export type SignupValues = z.infer<typeof signupSchema>
