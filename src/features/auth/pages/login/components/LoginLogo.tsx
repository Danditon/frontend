import logo from '@/assets/auth/login-logo.svg'

type Props = {
  className?: string
}

export default function LoginLogo({ className = '' }: Props) {
  return (
    <span
      aria-hidden="true"
      className={`block aspect-[444/134] w-[184px] max-w-full shrink-0 bg-current ${className}`}
      style={{
        // SVG 도형은 공유하고 화면별 색상은 currentColor로 지정합니다.
        mask: `url("${logo}") center / contain no-repeat`,
        WebkitMask: `url("${logo}") center / contain no-repeat`,
      }}
    />
  )
}
