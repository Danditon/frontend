import { Link } from 'react-router'
import { MapPin } from 'lucide-react'
import type { NearbyNavigation } from '../types/nearbyNavigation'

export default function NearbyQuestNavItem({ count, isLoading }: NearbyNavigation) {
  return (
    <Link
      to="/"
      state={{ openQuestList: true }}
      className="nav-item"
      aria-label={count === null ? '주변 퀘스트 목록 열기' : `주변 퀘스트 ${count}개 목록 열기`}
      aria-busy={isLoading}
    >
      <span className="nav-icon relative">
        <MapPin size={21} strokeWidth={1.6} aria-hidden="true" />
        {count !== null && (
          <span className="absolute -right-7 -top-1 rounded-full bg-[#D5EAF4] px-1.5 py-0.5 text-[10px] leading-3 text-[#242624] tabular-nums">
            {count}개
          </span>
        )}
      </span>
      <span>주변 퀘스트</span>
    </Link>
  )
}
