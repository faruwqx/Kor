/**
 * Birim sistemi: metrik (kg, m) ya da imperial (lb, ft/in, yd, mi).
 * Veri HER ZAMAN kg ve metre olarak saklanır; yalnızca gösterim ve giriş çevrilir.
 * Böylece rank hesabı, yedekler ve bulut eşitlemesi birimden etkilenmez.
 *
 * Seçili sistem App tarafından her çizimde setUnitSystem ile bildirilir; bu modül
 * depoya bağımlı değildir (döngüsel içe aktarma olmasın).
 */
import { int, num, num1 } from './format'

export type UnitSystem = 'metric' | 'imperial'

export const KG_PER_LB = 0.45359237
export const M_PER_FT = 0.3048
export const M_PER_YD = 0.9144
export const M_PER_MI = 1609.344

let system: UnitSystem = 'metric'
export const setUnitSystem = (u: UnitSystem | undefined) => {
  system = u ?? 'metric'
}
export const unitSystem = () => system
export const imperial = () => system === 'imperial'

/** Tarayıcı dili ABD, Liberya ya da Myanmar ise imperial öner. */
export function suggestedSystem(lang = typeof navigator !== 'undefined' ? navigator.language : ''): UnitSystem {
  return /^en-(US|LR|MM)$/i.test(lang) ? 'imperial' : 'metric'
}

// ---------------------------------------------------------------- Ağırlık

export const wUnit = () => (imperial() ? 'lb' : 'kg')
/** kg → gösterim birimi. */
export const toW = (kg: number) => (imperial() ? kg / KG_PER_LB : kg)
/** Gösterim birimi → kg. */
export const fromW = (v: number) => (imperial() ? v * KG_PER_LB : v)
const r2 = (n: number) => Math.round(n * 100) / 100
/** Giriş alanı için: kg → gösterim birimi, iki ondalığa yuvarlı (185 lb ↔ 83,91 kg geri 185 olur). */
export const toWField = (kg: number | null) => (kg == null ? null : r2(toW(kg)))
export const fromWField = (v: number | null) => (v == null ? null : fromW(v))

/** "82,5" (birimsiz) */
export const wNum = (kg: number) => num(r2(toW(kg)))
export const wNum1 = (kg: number) => num1(toW(kg))
export const wInt = (kg: number) => int(toW(kg))
/** "82,5 kg" / "182 lb" */
export const fw = (kg: number) => `${wNum(kg)} ${wUnit()}`
export const fw1 = (kg: number) => `${wNum1(kg)} ${wUnit()}`
export const fwi = (kg: number) => `${wInt(kg)} ${wUnit()}`
/** Vücut ağırlığı hareketinde ek yük: 0 → "VA", 10 → "+10", -15 → "−15" (gösterim biriminde). */
export const wAdded = (kg: number) => (kg === 0 ? 'VA' : kg > 0 ? `+${wNum(kg)}` : `−${wNum(-kg)}`)
/** Büyük hacimler: metrikte ton, imperialde bin lb. */
export const wBig = (kg: number) => {
  const v = toW(kg)
  return v >= 10000 ? (imperial() ? `${num1(v / 1000)}k lb` : `${num1(v / 1000)} t`) : `${int(v)} ${wUnit()}`
}

/** Plaka artışı (kg cinsinden): metrikte 2,5 kg (dambılda 1), imperialde 5 lb (dambılda 2,5 lb). */
export const plateStepKg = (dumbbell: boolean) =>
  imperial() ? (dumbbell ? 2.5 : 5) * KG_PER_LB : dumbbell ? 1 : 2.5

/** Vücut ağırlığı girişi için sınırlar (gösterim biriminde). */
export const bodyweightRange = () => (imperial() ? { min: 66, max: 550 } : { min: 30, max: 250 })

// ---------------------------------------------------------------- Uzunluk

/** Metre → "50 m" / "1 km" ya da "55 yd" / "0,6 mi". */
export function fmtLength(m: number): string {
  if (imperial()) return m >= M_PER_MI * 0.5 ? `${num1(m / M_PER_MI)} mi` : `${int(m / M_PER_YD)} yd`
  return m >= 1000 ? `${num1(m / 1000)} km` : `${int(m)} m`
}

/** Kısa mesafe (kurulum talimatı): "1 metre" → "yaklaşık 3 ft". */
export function fmtShort(m: number): string {
  return imperial() ? `${int(m / M_PER_FT)} ft` : `${num1(m)} m`
}

/** Hedef metni ("1000 m", "1 km", "100 tekrar") gösterim birimine çevrilir. */
export function fmtTarget(t: string): string {
  const m = /^([\d.,]+)\s*(km|m)$/i.exec(t.trim())
  if (!m) return t
  const meters = parseFloat(m[1].replace(',', '.')) * (m[2].toLowerCase() === 'km' ? 1000 : 1)
  return fmtLength(meters)
}
