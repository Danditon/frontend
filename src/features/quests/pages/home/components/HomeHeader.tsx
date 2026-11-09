// 홈 지도 위에 지역명 배지와 알림·MY 버튼을 표시하는 상단 UI입니다.
import loginLogo from '@/assets/auth/login-logo.svg'
import { Bell, MapPin } from 'lucide-react'
import { Link } from 'react-router'
import { Button } from '@/shared/components/ui/button'

type Props = {
  regionLabel: string // 위치·지역 조회 상태에 맞는 문구를 홈에서 전달합니다.
}

export default function HomeHeader({ regionLabel }: Props) {
  return (
    <header className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-2 [font-family:Pretendard,system-ui,sans-serif]">
      {/* 지역명 조회는 훅이 담당하고, Header는 전달받은 문구만 표시합니다. */}
      <span className="inline-flex h-9 min-w-0 justify-self-start items-center gap-1.5 rounded-full border border-white/80 bg-white/90 px-3 text-[11px] font-semibold text-[#242624] shadow-sm backdrop-blur-sm">
        <MapPin
          className="size-3.5 shrink-0 fill-current [&_circle]:fill-white [&_circle]:stroke-white"
          strokeWidth={1.8}
          aria-hidden="true"
        />
        <span className="truncate" aria-live="polite">{regionLabel}</span>
      </span>

      <span
        role="img"
        aria-label="그립데이"
        className="block aspect-[444/134] w-[88px] bg-black"
        style={{
          // 로그인과 같은 그림자 없는 SVG를 사용하고 홈 크기만 따로 지정합니다.
          mask: `url("${loginLogo}") center / contain no-repeat`,
          WebkitMask: `url("${loginLogo}") center / contain no-repeat`,
        }}
      />

      <div className="flex shrink-0 items-center gap-1 justify-self-end">
        {/* 알림은 UI만 표시합니다. 읽지 않은 알림 표시나 팝업은 추가하지 않습니다. */}
        <Button
          type="button"
          size="icon"
          disabled
          aria-label="알림, 준비 중"
          className="pointer-events-auto size-11 rounded-full bg-transparent p-0 disabled:opacity-100"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#242624] text-white shadow-sm">
            <Bell className="size-4 fill-current" strokeWidth={1.6} aria-hidden="true" />
          </span>
        </Button>

        {/* 기존 마이페이지로 이동하며 원형 디자인은 유지합니다. */}
        <Link
          to="/me"
          viewTransition
          aria-label="마이페이지"
          className="pointer-events-auto grid size-11 place-items-center rounded-full"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#F5E6AC] text-[10px] font-bold text-[#242624] shadow-sm">
            MY
          </span>
        </Link>
      </div>
    </header>
  )
}
