export function getQuestPhotoError(file: File): string | null {
  const supportedTypes = ['image/jpeg', 'image/png', 'image/webp']
  const supportedExtension = /\.(jpe?g|png|webp)$/i.test(file.name)
  if (file.size === 0 || file.size > 10 * 1024 * 1024 || !supportedExtension ||
      (file.type && !supportedTypes.includes(file.type))) {
    return '10MB 이하 JPG, PNG, WEBP 사진을 선택해 주세요.'
  }
  return null
}

export async function decodeQuestPhoto(file: File): Promise<string> {
  const error = getQuestPhotoError(file)
  if (error) throw new Error(error)
  const url = URL.createObjectURL(file)
  try {
    const image = new Image()
    image.src = url
    await image.decode()
    return url
  } catch {
    URL.revokeObjectURL(url)
    throw new Error('사진을 열 수 없어요. 다른 사진을 골라 주세요.')
  }
}
