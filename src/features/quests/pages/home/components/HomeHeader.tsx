// 홈 지도 위에 지역명 배지와 알림·MY 버튼을 표시하는 상단 UI입니다.
import { Bell, MapPin } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'

export default function HomeHeader() {
  return (
    <header className="flex min-w-0 items-center justify-between gap-3 [font-family:Pretendard,system-ui,sans-serif]">
      {/* 지역명 조회 연결 전에는 실제 지역으로 오해하지 않도록 안내 문구를 표시합니다. */}
      <span className="inline-flex h-9 min-w-0 items-center gap-1.5 rounded-full border border-white/80 bg-white/90 px-3 text-[11px] font-semibold text-[#242624] shadow-sm backdrop-blur-sm">
        <MapPin
          className="size-3.5 shrink-0 fill-current [&_circle]:fill-white [&_circle]:stroke-white"
          strokeWidth={1.8}
          aria-hidden="true"
        />
        <span className="truncate">위치 확인</span>
      </span>

      <div className="flex shrink-0 items-center gap-1">
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

        {/* MY 이동 링크는 다음 작업에서 연결합니다. */}
        <Button
          type="button"
          size="icon"
          disabled
          aria-label="마이페이지, 준비 중"
          className="pointer-events-auto size-11 rounded-full bg-transparent p-0 disabled:opacity-100"
        >
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#F5E6AC] text-[10px] font-bold text-[#242624] shadow-sm">
            MY
          </span>
        </Button>
      </div>
    </header>
  )
}
