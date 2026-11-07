// 로그인 이메일 형식과 비밀번호 필수 입력을 검사합니다.
import { z } from 'zod'

// 가입 시 길이 정책이 바뀌어도 기존 계정의 로그인을 막지 않도록 길이 제한은 적용하지 않습니다.
export const loginSchema = z.object({
  email: z.string().trim()
    .min(1, '이메일을 입력해주세요.')
    .pipe(z.email({ error: '이메일 형식을 확인해주세요.' })),
  password: z.string().min(1, '비밀번호를 입력해주세요.'),
})
