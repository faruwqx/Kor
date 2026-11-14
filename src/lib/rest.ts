/**
 * Dinlenme sayacı: son set tamamlanınca başlar ve yukarı sayar. Hedef süre dolunca
 * "süre doldu" durumuna geçer ve bir sonraki set tamamlanana kadar saymayı sürdürür.
 */

/** Yeni kurulumda dinlenme hedefi (saniye): 1 dakika 30 saniye. */
export const DEFAULT_REST_SEC = 90

/** Hedef, sayaç başladıktan en az bu kadar sonraya çekilebilir (saniye). */
export const MIN_REST_SEC = 15

export interface RestView {
  /** Son setten beri geçen süre (saniye). */
  elapsed: number
  /** Hedef dinlenme süresi (saniye). */
  target: number
  /** Hedef doldu: sete başlama zamanı. */
  over: boolean
  /** Hedefe doğru ilerleme, 0-1. */
  progress: number
}

export function restView(startedAt: number, endsAt: number, now: number): RestView {
  const span = Math.max(1000, endsAt - startedAt)
  return {
    elapsed: Math.max(0, Math.floor((now - startedAt) / 1000)),
    target: Math.round(span / 1000),
    over: now >= endsAt,
    progress: Math.min(1, Math.max(0, (now - startedAt) / span)),
  }
}

/** Hedefi `deltaSec` kadar kaydırır; başlangıçtan en az MIN_REST_SEC sonrasında kalır. */
export function shiftRestEnd(startedAt: number, endsAt: number, deltaSec: number): number {
  return Math.max(startedAt + MIN_REST_SEC * 1000, endsAt + deltaSec * 1000)
}

/** Süre alanına yazılan rakamlar: son iki hane saniye. "430" → 270 sn, "45" → 45 sn. */
export function digitsToSec(digits: string): number | null {
  if (!/^\d+$/.test(digits)) return null
  const sec = Number(digits.slice(0, -2) || '0') * 60 + Number(digits.slice(-2))
  return sec > 0 ? sec : null
}

/** 270 sn → "430"; alan bunu "4:30" diye gösterir. */
export function secToDigits(sec: number): string {
  const s = Math.max(0, Math.round(sec))
  return `${Math.floor(s / 60)}${String(s % 60).padStart(2, '0')}`
}

/** Yazılan rakamları sayaç biçiminde gösterir: "430" → "4:30", "45" → "45". */
export function digitsToText(digits: string): string {
  return digits.length > 2 ? `${digits.slice(0, -2)}:${digits.slice(-2)}` : digits
}
