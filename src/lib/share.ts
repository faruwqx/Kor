/**
 * Dosyayı kullanıcıya verir: destekleniyorsa paylaşım sayfası (iPhone: Dosyalar'a kaydet,
 * AirDrop, WhatsApp…), değilse tarayıcı indirmesi. Kullanıcı paylaşımı iptal ederse sessizce biter.
 */
export type SaveResult = 'shared' | 'downloaded' | 'cancelled'

export async function saveFile(name: string, mime: string, content: string): Promise<SaveResult> {
  const blob = new Blob([content], { type: mime })
  try {
    const file = new File([blob], name, { type: mime })
    if (typeof navigator.canShare === 'function' && navigator.canShare({ files: [file] })) {
      await navigator.share({ files: [file], title: name })
      return 'shared'
    }
  } catch (e) {
    if (e instanceof DOMException && e.name === 'AbortError') return 'cancelled'
    // Paylaşım başarısızsa indirmeye düş.
  }
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  document.body.appendChild(a)
  a.click()
  a.remove()
  setTimeout(() => URL.revokeObjectURL(url), 1000)
  return 'downloaded'
}
