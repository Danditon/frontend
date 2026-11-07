// 보호 화면 대신 인증 확인 중·오류·재시도 안내를 표시하는 컴포넌트입니다.
import { Link } from 'react-router'
import { Button } from '@/shared/components/ui/button'
import { Spinner } from '@/shared/components/ui/spinner'

type Props =
  | { status: 'checking' }
  | { status: 'error'; message: string; onRetry: () => void; loginHref: string }

export default function AuthStatusPanel(props: Props) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-[#444] p-6 max-[500px]:bg-white max-[500px]:p-0">
      <section
        aria-labelledby="auth-status-heading"
        aria-busy={props.status === 'checking'}
        className="flex min-h-[calc(100dvh_-_48px)] w-[390px] flex-col items-center justify-center bg-white px-6 py-10 text-center text-[#242624] max-[500px]:min-h-dvh max-[500px]:w-full"
        style={{ fontFamily: '"Pretendard", system-ui, sans-serif' }}
      >
        {props.status === 'checking' ? (
          <>
            <Spinner className="mb-4 size-6 motion-reduce:animate-none" aria-label="로그인 정보 확인 중" />
            <h1 id="auth-status-heading" className="text-lg font-semibold">
              로그인 정보를 확인하는 중이에요.
            </h1>
          </>
        ) : (
          <>
            <h1 id="auth-status-heading" className="text-lg font-semibold">
              로그인 정보를 확인하지 못했어요.
            </h1>
            <p role="alert" className="mt-3 text-sm leading-6 text-[#66757B]">
              {props.message}
            </p>
            <Button
              type="button"
              onClick={props.onRetry}
              className="mt-6 h-12 w-full rounded-full bg-[#D3E7F4] text-[#242624] hover:bg-[#C7E0F0]"
            >
              다시 확인
            </Button>
            <Link to={props.loginHref} replace className="mt-3 inline-flex min-h-11 items-center text-sm text-[#66757B] underline underline-offset-4">
              로그인 화면으로 이동
            </Link>
          </>
        )}
      </section>
    </div>
  )
}
