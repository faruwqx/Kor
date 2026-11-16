/**
 * Fotoğraftan (OCR) ya da yapıştırılan metinden antrenman programı çıkarır.
 * "Bench press 4x8", "3 x 8-12 Squat", "Lat pulldown 3 set 12 tekrar", "Plank 3x60 sn",
 * numaralı/madde işaretli satırlar ve "ad satırı + altında 4x8" düzeni okunur.
 * Saf fonksiyonlar: arayüzden bağımsız test edilir.
 *
 * Not: iOS 15 WebView'u regex lookbehind desteklemez; burada kullanılmaz.
 */
import { allExercises } from './exercises'
import { fold, matchExercise } from './importer'
import type { Exercise } from './types'

export const DEFAULT_SETS = 3
export const DEFAULT_REPS = 10

export interface PlanLine {
  /** Kaynak metin satırı (gösterim için). */
  source: string
  /** Hareket adı (temizlenmiş). */
  name: string
  /** Eşleşen Kor hareketi; yoksa null (yeni özel hareket olur). */
  exerciseId: string | null
  sets: number
  reps: number
  /** Set/tekrar metinde yazıyordu; değilse varsayılan 3×10. */
  explicit: boolean
  /** Varsayılan olarak programa eklensin mi. */
  pick: boolean
}

export interface ParsedPlan {
  title: string
  items: PlanLine[]
}

interface Nums {
  sets: number | null
  reps: number | null
  /** Eşleşen metin parçası: addan çıkarılır. */
  span: [number, number]
}

const REP_WORD = '(?:tekrar|reps?|kez)'
const SET_WORD = '(?:sets?|seri|tur|rounds?)'
const TIME_WORD = '(?:sn|sec|saniye|s|dk|dakika|min)'
const MAX_WORD = '(?:max|maks|amrap|failure)'
// Sayının önünde başka rakam/ondalık olmamalı ("100x5" → set 0 değil): lookbehind yerine grup.
const PRE = '(^|[^\\d.,])'

const RX = {
  // 4x8 · 3 x 8-12 · 4x10/8 · 3x60 sn · 3 x max
  cross: new RegExp(
    `${PRE}(\\d{1,2})\\s*x\\s*(?:(\\d{1,3})(?:\\s*[-–/]\\s*(\\d{1,3}))?\\s*(?:${TIME_WORD}|${REP_WORD})?\\b|${MAX_WORD}\\b)`,
    'i',
  ),
  // 100x5 · 60 kg x 8: ağırlık × tekrar (set sayısı yazmıyor)
  weightReps: new RegExp(`${PRE}(\\d{2,3}(?:[.,]\\d+)?)\\s*(?:kg|lbs?)?\\s*x\\s*(\\d{1,2})\\b`, 'i'),
  // 3 set 10 tekrar · 3 sets of 12 · 4 seri x 8-10
  setsReps: new RegExp(
    `${PRE}(\\d{1,2})\\s*${SET_WORD}\\b\\s*(?:of|x|,|:)?\\s*(\\d{1,3})(?:\\s*[-–]\\s*(\\d{1,3}))?\\s*(?:${REP_WORD}|${TIME_WORD})?\\b`,
    'i',
  ),
  // 10 tekrar 3 set · 12 reps x 3 sets
  repsSets: new RegExp(`${PRE}(\\d{1,3})(?:\\s*[-–]\\s*(\\d{1,3}))?\\s*${REP_WORD}\\b[\\s,x:]*(\\d{1,2})\\s*${SET_WORD}\\b`, 'i'),
  repsOnly: new RegExp(`${PRE}(\\d{1,3})(?:\\s*[-–]\\s*(\\d{1,3}))?\\s*${REP_WORD}\\b`, 'i'),
  setsOnly: new RegExp(`${PRE}(\\d{1,2})\\s*${SET_WORD}\\b`, 'i'),
}

/** Ağırlık, dinlenme, RPE gibi ada ait olmayan parçalar. */
const NOISE: RegExp[] = [
  /@?\s*\d+(?:[.,]\d+)?\s*(?:kg|kilo|lbs?|lb)\b/gi,
  /\(?\s*(?:dinlenme|rest|ara)\s*:?\s*\d+\s*(?:sn|s|sec|saniye|dk|min|dakika)?\s*\)?/gi,
  /\b(?:rpe|rir)\s*\d+(?:[.,]\d+)?/gi,
  /\btempo\s*[\d-]+/gi,
  // "tekrarlı", "tükeniş" gibi Türkçe harfle biten kelimelerde \b çalışmaz.
  /tekrarl[ıi]|t[uü]keni[sş]e?(?:\s*kadar)?/gi,
]

const BULLET = /^\s*(?:[-•*·▪●○◦–—>»✓✔☐□]+\s*|\(?\d{1,2}\s*[.)]\s+|[a-h]\s*[.)]\s+)/i

/** Başlık/bölüm sayılan, hareket olmayan satırlar (fold edilmiş metin üzerinde). */
const HEADING =
  /^(?:gun|day|hafta|week|antrenman|workout|program|plan|split|push|pull|legs?|bacak gunu|upper|lower|full ?body|isinma|warm ?up|cool ?down|soguma|pazartesi|sali|carsamba|persembe|cuma|cumartesi|pazar|monday|tuesday|wednesday|thursday|friday|saturday|sunday)\b/

/** "8-12" aralığında programın hedefi alt sınırdır; kullanıcı ekranda değiştirebilir. */
const low = (a: string) => +a

function findNums(s: string): Nums | null {
  const at = (m: RegExpExecArray): [number, number] => [m.index + m[1].length, m.index + m[0].length]
  let m = RX.cross.exec(s)
  if (m) return { sets: +m[2], reps: m[3] != null ? low(m[3]) : DEFAULT_REPS, span: at(m) }
  m = RX.weightReps.exec(s)
  if (m) return { sets: null, reps: low(m[3]), span: at(m) }
  m = RX.setsReps.exec(s)
  if (m) return { sets: +m[2], reps: low(m[3]), span: at(m) }
  m = RX.repsSets.exec(s)
  if (m) return { sets: +m[4], reps: low(m[2]), span: at(m) }
  m = RX.repsOnly.exec(s)
  if (m) return { sets: null, reps: low(m[2]), span: at(m) }
  m = RX.setsOnly.exec(s)
  if (m) return { sets: +m[2], reps: null, span: at(m) }
  return null
}

const clamp = (n: number | null, lo: number, hi: number, d: number) =>
  n == null || !Number.isFinite(n) || n < lo || n > hi ? d : Math.round(n)

function cleanName(s: string): string {
  let t = s
  for (const rx of NOISE) t = t.replace(rx, ' ')
  return t
    .replace(/[|_~=]+/g, ' ')
    .replace(/\s{2,}/g, ' ')
    .replace(/^[\s\-–—:;,.·•*>]+|[\s\-–—:;,.·•*>()]+$/g, '')
    .trim()
}

const letters = (s: string) => (s.match(/[a-zA-ZÇĞİÖŞÜçğıöşü]/g) ?? []).length

const STOP = new Set(['ile', 'with', 'the', 'on', 'de', 'da', 've', 'and'])
const words = (s: string) =>
  new Set(
    fold(s)
      .replace(/[^a-z0-9 ]+/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length >= 2 && !STOP.has(w)),
  )

/** Bulanık eşleme için hareket adlarının kelime kümeleri (dil ya da özel hareketler değişince yenilenir). */
let fuzzyCache: { key: string; list: { id: string; words: Set<string>; len: number }[] } | null = null

function fuzzy(name: string, custom: Exercise[]): string | null {
  const all = allExercises(custom)
  const key = `${all.length}|${all[0]?.name ?? ''}|${custom.map((c) => c.id).join(',')}`
  if (!fuzzyCache || fuzzyCache.key !== key)
    fuzzyCache = { key, list: all.map((e) => ({ id: e.id, words: words(e.name), len: e.name.length })) }
  const w = words(name)
  if (!w.size) return null
  let best: { id: string; score: number; len: number } | null = null
  for (const e of fuzzyCache.list) {
    if (!e.words.size) continue
    let inter = 0
    for (const x of w) if (e.words.has(x)) inter++
    if (!inter) continue
    const score = inter / (w.size + e.words.size - inter)
    if (!best || score > best.score || (score === best.score && e.len < best.len)) best = { id: e.id, score, len: e.len }
  }
  return best && best.score >= 0.6 ? best.id : null
}

/** Ad → Kor hareketi: önce kesin ad / takma ad, sonra kelime benzerliği (OCR harf hatalarına karşı). */
export function matchPlanName(name: string, custom: Exercise[] = []): string | null {
  return matchExercise(name, custom) ?? fuzzy(name, custom)
}

export function parsePlanText(text: string, custom: Exercise[] = []): ParsedPlan {
  const lines = text
    .replace(/\r/g, '')
    .replace(/[×✕✖хХ]/g, 'x')
    .split('\n')
    .map((l) => l.trim())
    .filter(Boolean)

  let title = ''
  const items: PlanLine[] = []
  // Adı yazılmış ama sayısı henüz gelmemiş son satır ("Bench press" ↵ "4x8").
  let pending: PlanLine | null = null

  lines.forEach((raw, i) => {
    const line = raw.replace(BULLET, '')
    if (letters(line) + (line.match(/\d/g) ?? []).length < 2) return
    const nums = findNums(line)
    const name = cleanName(nums ? line.slice(0, nums.span[0]) + ' ' + line.slice(nums.span[1]) : line)

    if (nums && letters(name) < 2) {
      // Yalnızca sayı satırı: bir önceki adın setleri.
      if (pending) {
        pending.sets = clamp(nums.sets, 1, 20, DEFAULT_SETS)
        pending.reps = clamp(nums.reps, 1, 300, DEFAULT_REPS)
        pending.explicit = true
        pending.pick = true
        pending.source += ' · ' + raw
        pending = null
      }
      return
    }
    if (letters(name) < 2) return

    const exerciseId = matchPlanName(name, custom)
    const isHeading = !nums && !exerciseId && (/:$/.test(line) || HEADING.test(fold(name)))
    if (isHeading || (!nums && !exerciseId && i === 0 && !title)) {
      if (!title) title = name.replace(/:$/, '').slice(0, 60)
      pending = null
      return
    }

    const item: PlanLine = {
      source: raw,
      name: name.slice(0, 60),
      exerciseId,
      sets: clamp(nums?.sets ?? null, 1, 20, DEFAULT_SETS),
      reps: clamp(nums?.reps ?? null, 1, 300, DEFAULT_REPS),
      explicit: !!nums,
      // Sayısı da eşleşmesi de olmayan satır büyük olasılıkla OCR gürültüsü: kullanıcı açarsa eklenir.
      pick: !!nums || !!exerciseId,
    }
    items.push(item)
    pending = nums ? null : item
  })

  return { title, items }
}
