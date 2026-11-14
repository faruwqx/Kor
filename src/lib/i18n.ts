/**
 * Arayüz dili. Kaynak dil Türkçe: t() anahtar olarak Türkçe metni alır, seçili dilin
 * sözlüğünde karşılığı yoksa Türkçesini döner. Veri (hareket kayıtları, kullanıcının
 * yazdığı adlar) çevrilmez; yalnızca arayüz metinleri.
 *
 * Yer tutucular: t('{0} antrenman', n). Çoğul: sözlük değeri "tekil|çoğul" ise ilk
 * sayısal argüman 1 olduğunda tekil kullanılır ("{0} workout|{0} workouts").
 */
import en from '../i18n/en'
import es from '../i18n/es'

export type Lang = 'tr' | 'en' | 'es'

export const LANGS: { id: Lang; name: string }[] = [
  { id: 'tr', name: 'Türkçe' },
  { id: 'en', name: 'English' },
  { id: 'es', name: 'Español' },
]

const DICT: Record<Lang, Record<string, string> | null> = { tr: null, en, es }
const LOCALE: Record<Lang, string> = { tr: 'tr-TR', en: 'en-US', es: 'es-ES' }

let cur: Lang = 'tr'

/** Tarayıcı dillerinden ilk desteklenen; hiçbiri değilse İngilizce. */
export function detectLang(langs?: readonly string[]): Lang {
  const list = langs ?? (typeof navigator !== 'undefined' ? navigator.languages : []) ?? []
  for (const l of list) {
    const p = l.slice(0, 2).toLowerCase()
    if (p === 'tr' || p === 'en' || p === 'es') return p
  }
  return 'en'
}

/** Ayardaki dil; ayar yoksa tarayıcıdan algılanır. Çizimden önce çağrılır. */
export function setLang(l?: Lang | null) {
  cur = l ?? detectLang()
  if (typeof document !== 'undefined') document.documentElement.lang = cur
}

export const lang = (): Lang => cur
export const locale = (): string => LOCALE[cur]

export function t(key: string, ...args: (string | number)[]): string {
  let s = DICT[cur]?.[key] ?? key
  if (s.includes('|') && !key.includes('|')) {
    const n = args.find((a) => typeof a === 'number')
    const [one, many] = s.split('|')
    s = n === 1 ? one : many
  }
  return args.length ? s.replace(/\{(\d+)\}/g, (_, i: string) => String(args[Number(i)] ?? '')) : s
}

/**
 * Modül düzeyindeki tabloların (TIERS, MUSCLES…) metin alanlarını okunduğu anda çevrilen
 * alanlara çevirir. Türkçe değer modül yüklenirken yakalanır; her okuma seçili dili kullanır.
 */
export function localize<T extends object>(items: readonly T[], ...fields: (keyof T)[]): void {
  for (const it of items)
    for (const f of fields) {
      const src = it[f]
      if (typeof src !== 'string') continue
      Object.defineProperty(it, f, { get: () => t(src), enumerable: true, configurable: true })
    }
}

/** Anahtar → Türkçe metin sözlüğünün değerlerini okunduğu anda çevirir. */
export function localizeRecord<R extends Record<string, string>>(rec: R): R {
  for (const k of Object.keys(rec)) {
    const src = rec[k]
    Object.defineProperty(rec, k, { get: () => t(src), enumerable: true, configurable: true })
  }
  return rec
}

/**
 * Modül düzeyindeki sabitler için işaret: metni olduğu gibi döner, çeviri çizim anında
 * t() ile yapılır. Anahtar çıkarıcı bu çağrıları da toplar.
 */
export const tk = (key: string): string => key
