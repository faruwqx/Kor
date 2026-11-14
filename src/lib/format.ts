const nf1 = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 1 })
const nf2 = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 2 })
const nf0 = new Intl.NumberFormat('tr-TR', { maximumFractionDigits: 0 })

/** 82.5 → "82,5", 100 → "100" */
export const num = (n: number) => nf2.format(n)
export const num1 = (n: number) => nf1.format(n)
export const int = (n: number) => nf0.format(Math.round(n))

/** Vücut ağırlığı hareketlerinde ek kilo: 0 → "VA", 10 → "+10", -15 → "−15" */
export function addedKg(n: number): string {
  if (n === 0) return 'VA'
  return n > 0 ? `+${num(n)}` : `−${num(-n)}`
}

const DAY = 86_400_000

export function startOfDay(ts: number): number {
  const d = new Date(ts)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

/** Haftanın pazartesi 00:00'ı. */
export function weekStart(ts: number): number {
  const d = new Date(startOfDay(ts))
  const dow = (d.getDay() + 6) % 7
  d.setDate(d.getDate() - dow)
  return d.getTime()
}

export function addDays(ts: number, days: number): number {
  const d = new Date(ts)
  d.setDate(d.getDate() + days)
  return d.getTime()
}

const dfDayMonth = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'long' })
const dfShort = new Intl.DateTimeFormat('tr-TR', { day: 'numeric', month: 'short' })
const dfWeekday = new Intl.DateTimeFormat('tr-TR', { weekday: 'long' })
const dfMonthYear = new Intl.DateTimeFormat('tr-TR', { month: 'long', year: 'numeric' })
const dfTime = new Intl.DateTimeFormat('tr-TR', { hour: '2-digit', minute: '2-digit' })

export const dayMonth = (ts: number) => dfDayMonth.format(ts)
export const shortDate = (ts: number) => dfShort.format(ts)
export const weekday = (ts: number) => cap(dfWeekday.format(ts))
export const monthYear = (ts: number) => cap(dfMonthYear.format(ts))
export const clock = (ts: number) => dfTime.format(ts)

function cap(s: string) {
  return s.charAt(0).toLocaleUpperCase('tr') + s.slice(1)
}

/** "Bugün", "Dün", "3 gün önce", sonra tarih. */
export function relDay(ts: number, now = Date.now()): string {
  const diff = Math.round((startOfDay(now) - startOfDay(ts)) / DAY)
  if (diff <= 0) return 'Bugün'
  if (diff === 1) return 'Dün'
  if (diff < 7) return `${diff} gün önce`
  return dayMonth(ts)
}

/** Cümle içinde: "bugün", "3 gün önce", ama "31 Ekim" büyük harfle kalır. */
export function relDayLower(ts: number, now = Date.now()): string {
  const diff = Math.round((startOfDay(now) - startOfDay(ts)) / DAY)
  return diff < 7 ? relDay(ts, now).toLocaleLowerCase('tr') : relDay(ts, now)
}

/** Süre: 3 720 000 ms → "1 sa 2 dk" */
export function duration(ms: number): string {
  const min = Math.max(0, Math.round(ms / 60_000))
  if (min < 60) return `${min} dk`
  const h = Math.floor(min / 60)
  const m = min % 60
  return m ? `${h} sa ${m} dk` : `${h} sa`
}

/** Sayaç: 125 sn → "2:05", bir saatten sonra "1:02:05" */
export function timer(sec: number): string {
  const s = Math.max(0, Math.floor(sec))
  const h = Math.floor(s / 3600)
  const m = Math.floor((s % 3600) / 60)
  const r = s % 60
  const mm = h ? String(m).padStart(2, '0') : String(m)
  return `${h ? h + ':' : ''}${mm}:${String(r).padStart(2, '0')}`
}

/** "82,5" veya "82.5" → 82.5; boş veya geçersiz → null */
export function parseNum(raw: string): number | null {
  const t = raw.trim().replace(',', '.')
  if (t === '' || t === '-' || t === '+') return null
  const n = Number(t)
  return Number.isFinite(n) ? n : null
}

export function uid(): string {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
}
