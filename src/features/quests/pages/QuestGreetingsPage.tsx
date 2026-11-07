import { useState } from 'react'
import { Link, useParams } from 'react-router'
import { useQuery } from '@tanstack/react-query'
import { Back } from '@/shared/components/WireUI'
import { RemotePhoto } from '@/shared/components/RemotePhoto'
import { getAccessToken, getQuestGreetings, isQuestId, verificationError } from '../api/verification'

export default function QuestGreetingsPage() {
  const { questId = '' } = useParams()
  const token = getAccessToken()
  const [index, setIndex] = useState(0)
  const query = useQuery({ queryKey: ['quest-greetings', questId, token], queryFn: ({ signal }) => getQuestGreetings(questId, signal), enabled: isQuestId(questId) && Boolean(token), retry: false })
  const submissions = query.data?.submissions.filter(item => item.verifyStatus === 'PASSED') ?? []
  const item = submissions[index % Math.max(1, submissions.length)]
  return <section className="memory-page min-h-full p-4 flex flex-col gap-5">
    <header className="flex items-center gap-4"><Back to={`/quests/${questId}/verify`} /><h1>도착한 안부 {item ? index % submissions.length + 1 : 0}/{submissions.length}</h1></header>
    {!token ? <p role="alert">로그인 후 안부를 확인할 수 있어요. <Link to="/login">로그인</Link></p>
      : !isQuestId(questId) ? <p role="alert">퀘스트를 다시 선택해 주세요.</p>
      : query.isPending ? <p role="status">안부를 불러오는 중이에요.</p>
      : query.isError ? <div role="alert"><p>{verificationError(query.error)}</p><button onClick={() => void query.refetch()}>다시 불러오기</button></div>
      : item ? <article className="greeting-api-card">
        <RemotePhoto className="postcard-photo" photoUrl={item.photoUrl} alt={`${item.performer.nickname} 님이 보낸 사진`} />
        <p className="whitespace-pre-line text-center text-xl my-8">{item.greeting}</p>
        <small>From. {item.performer.nickname} · {new Date(item.createdAt).toLocaleDateString('ko-KR')}</small>
        <p className="text-xs mt-4 text-neutral-500">{query.data?.viewerRole === 'PERFORMER' ? '내가 전한 안부예요.' : '이 장소에 도착한 안부예요.'}</p>
        <button className="mt-8 rounded-full bg-[#242624] text-white w-full p-4 disabled:opacity-50" disabled={submissions.length < 2} onClick={() => setIndex(value => (value + 1) % submissions.length)}>다음 안부 보기</button>
      </article> : <p role="status">아직 도착한 안부가 없어요.</p>}
  </section>
}
