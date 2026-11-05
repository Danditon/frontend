import { useState } from 'react'

/** photoUrl from the API. A missing photo is valid for GENERAL quests. */
export function RemotePhoto({ photoUrl, alt, className = '' }: {
  photoUrl?: string | null; alt: string; className?: string
}) {
  const [failedUrl, setFailedUrl] = useState<string | null>(null)
  const src = photoUrl?.trim()
  const valid = src && (/^https?:\/\//i.test(src) || /^\/(?!\/)/.test(src))
  return <div className={`remote-photo ${className}`}>
    {valid && failedUrl !== src
      ? <img src={src} alt={alt} loading="lazy" onError={() => setFailedUrl(src)} />
      : <span role="img" aria-label={alt}>{src ? '사진을 불러오지 못했어요' : '등록된 사진이 없어요'}</span>}
  </div>
}
