import QuestMap from './components/QuestMap.tsx'

export default function QuestMapPage() {
  return (

    <section>
      <h1 className="text-2xl font-semibold">
        홈·퀘스트 지도
      </h1>

      {/* 지도 영역을 담당하는 컴포넌트 */}
      <QuestMap />
    </section>
  )
}
