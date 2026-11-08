// 퀘스트 장소·주소와 주소 복사, 현재 지도에서 위치 보기 동작을 제공하는 컴포넌트입니다.
import { useRef, useState } from 'react'
import { Copy, MapPin } from 'lucide-react'
import { Button } from '@/shared/components/ui/button'

type Props = {
  placeName: string
  address: string
  onViewOnMap: () => void
}

export default function QuestLocationCard({ placeName, address, onViewOnMap }: Props) {
  const [isCopying, setIsCopying] = useState(false)
  const [message, setMessage] = useState('')
  const copyingRef = useRef(false)
  const copyAddress = address.trim()

  async function handleCopy() {
    if (!copyAddress || copyingRef.current) return
    copyingRef.current = true
    setIsCopying(true)
    setMessage('')

    try {
      // HTTPS·브라우저 권한 등에 따라 복사가 불가능할 수 있어 직접 선택하는 방법도 안내합니다.
      if (!navigator.clipboard?.writeText) throw new Error('Clipboard unavailable')
      await navigator.clipboard.writeText(copyAddress)
      setMessage('주소를 복사했어요.')
    } catch {
      setMessage('복사하지 못했어요. 주소를 선택해 직접 복사해주세요.')
    } finally {
      copyingRef.current = false
      setIsCopying(false)
    }
  }

  return (
    <section className="space-y-4 rounded-2xl border border-[#E4E8E3] bg-[#F7F8F6] p-4 text-[#303B3C]">
      <div className="flex items-start gap-2">
        <MapPin className="mt-0.5 size-4 shrink-0 text-[#66757B]" aria-hidden="true" />
        <div className="min-w-0 space-y-1 text-sm leading-relaxed [overflow-wrap:anywhere]">
          <h3 className="font-semibold">위치</h3>
          <p className="font-medium">{placeName}</p>
          <p className="select-text text-[#66757B]">{copyAddress || '등록된 주소가 없어요.'}</p>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        <Button
          type="button"
          variant="outline"
          disabled={!copyAddress || isCopying}
          aria-busy={isCopying}
          onClick={() => { void handleCopy() }}
          className="h-11 basis-36 flex-1 rounded-xl bg-white text-xs"
        >
          <Copy className="size-3.5" aria-hidden="true" />
          {isCopying ? '복사 중…' : '주소 복사'}
        </Button>
        <Button
          type="button"
          variant="outline"
          onClick={onViewOnMap}
          className="h-11 basis-36 flex-1 rounded-xl bg-white text-xs"
        >
          <MapPin className="size-3.5" aria-hidden="true" />
          지도에서 위치 보기
        </Button>
      </div>

      {message && <p role="status" className="text-xs leading-relaxed text-[#66757B]">{message}</p>}
    </section>
  )
}
