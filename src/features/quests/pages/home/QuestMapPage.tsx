import QuestMap from './components/QuestMap.tsx'

export default function QuestMapPage() {
  return (

  <div className="fixed inset-0 z-10 h-dvh w-full overflow-hidden bg-neutral-100">
    <section className="relative h-full w-full overflow-hidden">
      <h1 className="sr-only">
        홈·퀘스트 지도
      </h1>

      {/* 지도 영역을 담당하는 컴포넌트 */}
      <QuestMap />

      {/* 지도 위 상단 UI */}
      <div className="absolute inset-x-0 top-0 z-10 p-4">
        {/* 지역명·벨·MY 컴포넌트 */}
      </div>

      {/* 지도 위 현위치 버튼 */}
      <div className="absolute bottom-40 right-4 z-10">
        {/* 현위치 버튼 컴포넌트 */}
      </div>

      {/* 지도 위 하단 UI */}
      <div className="absolute inset-x-0 bottom-0 z-10 p-4">
        {/* 퀘스트 카드·하단 메뉴 컴포넌트 */}
      </div>
    </section>
  </div>
  )
}
