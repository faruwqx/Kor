/**
 * Başka uygulamalardan geçiş: Strong, Hevy, FitNotes CSV'leri, genel CSV/TSV ve Kor'un
 * kendi JSON yedeği. Ayrıştırma ve eşleştirme saf fonksiyonlardır (test edilebilir);
 * mevcut veri silinmez, aynı antrenman ikinci kez eklenmez.
 *
 * Ayrıca Kor'dan CSV dışa aktarma: kullanıcı verisini istediği zaman götürebilir.
 */
import { BUILTIN, findExercise } from './exercises'
import { startOfDay, uid } from './format'
import type { Equipment, Exercise, MuscleId, SetEntry, Workout } from './types'

export type ImportFormat = 'strong' | 'hevy' | 'fitnotes' | 'generic' | 'blocks' | 'kor-json' | 'kor-workout'
export type Unit = 'kg' | 'lb'

export const FORMAT_NAME: Record<ImportFormat, string> = {
  strong: 'Strong',
  hevy: 'Hevy',
  fitnotes: 'FitNotes',
  generic: 'Genel tablo (CSV)',
  blocks: 'Antrenman dışa aktarımı',
  'kor-json': 'Kor yedeği',
  'kor-workout': 'Kor antrenmanı',
}

/** Antrenman dosyasının türü: tam yedekten ayırmak için. */
export const WORKOUT_FILE_KIND = 'kor-workouts'

export const LB = 0.45359237
const DAY = 86_400_000
/** Süresi bilinmeyen antrenman için varsayılan süre. */
const DEFAULT_MINUTES = 60
/** Bu kadar yakın başlayan antrenman, zaten kayıtlı sayılır. */
const DUPLICATE_MS = 2 * 60_000

// ---------------------------------------------------------------- CSV

/** RFC 4180 uyumlu CSV okuyucu. Ayraç ilk satırdan seçilir: virgül, noktalı virgül ya da sekme. */
export function parseCsv(text: string): string[][] {
  const src = text.replace(/^﻿/, '')
  const firstLine = src.slice(0, src.search(/\r?\n|$/))
  const count = (d: string) => {
    let n = 0
    let q = false
    for (const c of firstLine) {
      if (c === '"') q = !q
      else if (c === d && !q) n++
    }
    return n
  }
  const delim = [',', ';', '\t'].reduce((a, d) => (count(d) > count(a) ? d : a), ',')

  const rows: string[][] = []
  let row: string[] = []
  let cell = ''
  let q = false
  for (let i = 0; i < src.length; i++) {
    const c = src[i]
    if (q) {
      if (c === '"') {
        if (src[i + 1] === '"') {
          cell += '"'
          i++
        } else q = false
      } else cell += c
    } else if (c === '"') q = true
    else if (c === delim) {
      row.push(cell)
      cell = ''
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && src[i + 1] === '\n') i++
      row.push(cell)
      cell = ''
      if (row.some((x) => x.trim() !== '')) rows.push(row)
      row = []
    } else cell += c
  }
  row.push(cell)
  if (row.some((x) => x.trim() !== '')) rows.push(row)
  return rows
}

const csvCell = (v: string | number) => {
  const s = String(v)
  return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s
}

// ---------------------------------------------------------------- Ayrıştırma yardımcıları

/** Türkçe karakterleri ve aksanları sadeleştirir, küçük harfe çevirir. */
export function fold(s: string): string {
  return s
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ş/g, 's')
    .replace(/ğ/g, 'g')
    .replace(/ü/g, 'u')
    .replace(/ö/g, 'o')
    .replace(/ç/g, 'c')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .trim()
}

/** "72,5" ve "72.5" ikisini de okur; boş ya da geçersizse null. */
export function num(raw: string | undefined): number | null {
  if (raw == null) return null
  const s = raw.trim().replace(/\s/g, '')
  if (!s) return null
  const n = Number(s.includes(',') && !s.includes('.') ? s.replace(',', '.') : s.replace(/,/g, ''))
  return Number.isFinite(n) ? n : null
}

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5, jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
  oca: 0, sub: 1, nis: 3, haz: 5, tem: 6, agu: 7, eyl: 8, eki: 9, kas: 10, ara: 11,
}

/** Bilinen tarih biçimleri; yerel saatle. Tanınmazsa null. */
export function parseDate(raw: string): number | null {
  const s = raw.trim()
  if (!s) return null
  // Saat dilimi bilgisi olan ISO: tarayıcıya bırak.
  if (/^\d{4}-\d{2}-\d{2}T.*(Z|[+-]\d{2}:?\d{2})$/.test(s)) {
    const t = Date.parse(s)
    return Number.isFinite(t) ? t : null
  }
  let m = /^(\d{4})-(\d{1,2})-(\d{1,2})(?:[ T](\d{1,2}):(\d{2})(?::(\d{2}))?)?/.exec(s)
  if (m) return new Date(+m[1], +m[2] - 1, +m[3], +(m[4] ?? 12), +(m[5] ?? 0), +(m[6] ?? 0)).getTime()
  m = /^(\d{1,2})\s+([A-Za-zÇĞİÖŞÜçğıöşü]{3,})\.?\s+(\d{4}),?\s*(?:(\d{1,2}):(\d{2}))?/.exec(s)
  if (m) {
    const mon = MONTHS[fold(m[2]).slice(0, 3)]
    if (mon == null) return null
    return new Date(+m[3], mon, +m[1], +(m[4] ?? 12), +(m[5] ?? 0)).getTime()
  }
  m = /^(\d{1,2})[./-](\d{1,2})[./-](\d{4})(?:[ T,]+(\d{1,2}):(\d{2}))?/.exec(s)
  if (m) {
    // Varsayılan gün.ay; ikinci sayı 12'den büyükse ay.gün (ABD) biçimidir.
    let [d, mo] = [+m[1], +m[2]]
    if (mo > 12 && d <= 12) [d, mo] = [mo, d]
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return null
    return new Date(+m[3], mo - 1, d, +(m[4] ?? 12), +(m[5] ?? 0)).getTime()
  }
  return null
}

/** "1h 5m", "45m", "1:02:00", "3600" (saniye) → saniye. */
export function parseDuration(raw: string | undefined): number | null {
  const s = (raw ?? '').trim().toLowerCase()
  if (!s) return null
  const hms = /^(\d+):(\d{1,2})(?::(\d{1,2}))?$/.exec(s)
  if (hms) return hms[3] != null ? +hms[1] * 3600 + +hms[2] * 60 + +hms[3] : +hms[1] * 60 + +hms[2]
  const h = /(\d+(?:\.\d+)?)\s*(h|sa)/.exec(s)
  const mi = /(\d+(?:\.\d+)?)\s*(m(?!s)|dk)/.exec(s)
  const se = /(\d+(?:\.\d+)?)\s*(s|sn)\b/.exec(s)
  if (h || mi || se) return Math.round((h ? +h[1] * 3600 : 0) + (mi ? +mi[1] * 60 : 0) + (se ? +se[1] : 0))
  const n = num(s)
  return n != null && n > 0 ? Math.round(n) : null
}

// ---------------------------------------------------------------- Satır modeli

export interface ImportRow {
  /** Antrenmanın başlangıcı (ms). */
  start: number
  /** Bitiş biliniyorsa (ms). */
  end?: number
  workout: string
  exercise: string
  /** Dosyadaki birimle ağırlık. */
  weight: number | null
  reps: number | null
  sec?: number
  warmup: boolean
  /** Setsiz antrenmandan türetilen tek süre kaydı (yürüyüş, yüzme…). */
  session?: boolean
}

export interface ParsedImport {
  format: ImportFormat
  /** Ağırlık birimi dosyadan anlaşıldı mı; anlaşılmadıysa kullanıcıya sorulur. */
  unit: Unit | null
  rows: ImportRow[]
  /** Okunamayan satır sayısı. */
  skipped: number
  /** Kor JSON yedeği: doğrudan antrenmanlar. */
  json?: { workouts: Workout[]; customExercises: Exercise[] }
}

type Header = (names: string[]) => number

/** Başlık satırından sütun bulucu: ilk eşleşen eş anlamlının sırası. */
function headerFinder(head: string[]): Header {
  const h = head.map((x) => fold(x).replace(/[_\s]+/g, ' '))
  return (names) => {
    for (const n of names) {
      const i = h.indexOf(n)
      if (i >= 0) return i
    }
    for (const n of names) {
      const i = h.findIndex((x) => x.startsWith(n))
      if (i >= 0) return i
    }
    return -1
  }
}

const unitFromHeader = (h: string): Unit | null =>
  /\b(lb|lbs|pound)/.test(fold(h)) ? 'lb' : /\b(kg|kgs|kilo)/.test(fold(h)) ? 'kg' : null

/** Bir satırı hücrelere böler: sekme varsa sekmeyle, yoksa 2+ boşlukla. */
function blockCells(line: string): string[] {
  const parts = line.includes('\t') ? line.split('\t') : line.split(/ {2,}/)
  return parts.map((x) => x.trim())
}

/**
 * Bloklu antrenman dışa aktarımı: her antrenman ayrı bir blok (başlık, "Workout Start/End",
 * isteğe bağlı "Heart Rate Zones", sonra "All Sets" başlığı ve set satırları). Düz CSV değil.
 * Tanınmazsa null döner; parseImport genel tabloya düşer.
 */
function parseBlocks(text: string): ParsedImport | null {
  const src = ('\n' + text.replace(/\r\n/g, '\n').replace(/^﻿/, ''))
  if (!/\nWorkout Start[\t ]/.test(src) || !/\nAll Sets\b/.test(src)) return null
  const lines = src.slice(1).split('\n')
  const startIdx: number[] = []
  lines.forEach((l, i) => {
    if (blockCells(l)[0] === 'Workout Start') startIdx.push(i)
  })
  if (!startIdx.length) return null

  const rows: ImportRow[] = []
  let unit: Unit | null = null
  for (let b = 0; b < startIdx.length; b++) {
    const si = startIdx[b]
    const blockEnd = b + 1 < startIdx.length ? startIdx[b + 1] : lines.length
    // Antrenman adı: Workout Start'tan önceki en yakın boş olmayan satır.
    let name = 'Antrenman'
    for (let k = si - 1; k >= 0; k--) {
      const t = (lines[k] ?? '').trim()
      if (t) {
        name = blockCells(lines[k])[0] || 'Antrenman'
        break
      }
    }
    let start: number | null = null
    let end: number | undefined
    let total: number | null = null
    let header = -1
    for (let k = si; k < blockEnd; k++) {
      const c = blockCells(lines[k])
      if (c[0] === 'Workout Start') start = parseDate(c[1] ?? '')
      else if (c[0] === 'Workout End') end = parseDate(c[1] ?? '') ?? undefined
      else if (/^Total Duration/i.test(c[0] ?? '')) total = parseDuration(c[1])
      else if (c[0] === 'All Sets') {
        header = k + 1
        break
      }
    }
    if (start == null) continue
    const t0 = start
    const before = rows.length
    // Setsiz antrenman (yürüyüş, yüzme, koşu…): tek bir süreli kardiyo seti olarak korunur.
    const pushCardio = () => {
      const sec = total ?? (end && end > t0 ? Math.round((end - t0) / 1000) : null)
      rows.push({
        start: t0,
        end,
        workout: name,
        exercise: activityName(name),
        weight: null,
        reps: null,
        sec: sec && sec > 0 ? sec : DEFAULT_MINUTES * 60,
        warmup: false,
        session: true,
      })
    }
    if (header < 0) {
      pushCardio()
      continue
    }
    const head = blockCells(lines[header] ?? '')
    const col = headerFinder(head)
    const ie = col(['exercise'])
    const iw = col(['weight', 'lbs', 'lb', 'kg'])
    const ir = col(['reps'])
    const it = col(['time', 'seconds'])
    if (iw >= 0 && unit == null) unit = unitFromHeader(head[iw] ?? '')
    for (let k = header + 1; k < blockEnd; k++) {
      const line = lines[k]
      if (line == null || line.trim() === '') continue
      const c = blockCells(line)
      if (c.length < 2) continue // sonraki bloğun tek hücreli ad satırı
      const ex = (ie >= 0 ? c[ie] : c[0]) ?? ''
      if (!ex) continue
      const reps = num(ir >= 0 ? (c[ir] ?? '') : '')
      const tsec = it >= 0 ? num(c[it] ?? '') : null
      rows.push({
        start,
        end,
        workout: name,
        exercise: ex,
        weight: num(iw >= 0 ? (c[iw] ?? '') : ''),
        reps: reps && reps > 0 ? reps : null,
        sec: (!reps || reps <= 0) && tsec && tsec > 0 ? Math.round(tsec) : undefined,
        warmup: false,
      })
    }
    if (rows.length === before) pushCardio()
  }
  if (!rows.length) return null
  return { format: 'blocks', unit, rows, skipped: 0 }
}

const LEAD_WORDS = new Set([
  'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday',
  'early', 'late', 'morning', 'afternoon', 'evening', 'night', 'midday', 'lunch',
  'pazartesi', 'sali', 'carsamba', 'persembe', 'cuma', 'cumartesi', 'pazar',
  'sabah', 'ogle', 'ogleden', 'sonra', 'aksam', 'gece',
])

/** "Friday Evening Swim Session" → "Swim Session": baştaki gün ve gün dilimi kelimeleri atılır. */
export function activityName(title: string): string {
  const words = title.trim().split(/\s+/)
  let i = 0
  while (i < words.length - 1 && LEAD_WORDS.has(fold(words[i]))) i++
  return words.slice(i).join(' ') || 'Kardiyo'
}

export function parseImport(text: string): ParsedImport | { error: string } {
  const trimmed = text.trim()
  if (!trimmed) return { error: 'Dosya boş.' }

  if (trimmed.startsWith('{')) {
    try {
      const d = JSON.parse(trimmed) as Partial<{ kind: string; workouts: Workout[]; customExercises: Exercise[] }>
      if (!Array.isArray(d.workouts)) return { error: 'Bu JSON bir Kor yedeği değil.' }
      const ok = d.workouts.filter(
        (w) =>
          w &&
          typeof w.id === 'string' &&
          typeof w.startedAt === 'number' &&
          typeof w.endedAt === 'number' &&
          Array.isArray(w.exercises),
      )
      return {
        format: d.kind === WORKOUT_FILE_KIND ? 'kor-workout' : 'kor-json',
        unit: 'kg',
        rows: [],
        skipped: d.workouts.length - ok.length,
        json: { workouts: ok, customExercises: Array.isArray(d.customExercises) ? d.customExercises : [] },
      }
    } catch {
      return { error: 'JSON dosyası okunamadı.' }
    }
  }

  const blocks = parseBlocks(trimmed)
  if (blocks) return blocks

  const table = parseCsv(trimmed)
  if (table.length < 2) return { error: 'Tabloda başlık ve en az bir satır olmalı.' }
  const head = table[0]
  const col = headerFinder(head)
  const at = (r: string[], i: number) => (i >= 0 ? (r[i] ?? '').trim() : '')
  const rows: ImportRow[] = []
  let skipped = 0

  // Strong: Date, Workout Name, Duration, Exercise Name, Set Order, Weight, Reps, Distance, Seconds
  if (col(['exercise name']) >= 0 && col(['set order']) >= 0) {
    const c = {
      date: col(['date']),
      name: col(['workout name']),
      dur: col(['duration']),
      ex: col(['exercise name']),
      order: col(['set order']),
      w: col(['weight']),
      reps: col(['reps']),
      sec: col(['seconds']),
    }
    for (const r of table.slice(1)) {
      const start = parseDate(at(r, c.date))
      const ex = at(r, c.ex)
      if (start == null || !ex) {
        skipped++
        continue
      }
      const dur = parseDuration(at(r, c.dur))
      // Strong'da "Rest Timer" satırları set değildir.
      const order = at(r, c.order).toUpperCase()
      if (order.startsWith('R')) continue
      rows.push({
        start,
        end: dur ? start + dur * 1000 : undefined,
        workout: at(r, c.name) || 'Antrenman',
        exercise: ex,
        weight: num(at(r, c.w)),
        reps: num(at(r, c.reps)),
        sec: num(at(r, c.sec)) || undefined,
        warmup: order === 'W',
      })
    }
    return { format: 'strong', unit: unitFromHeader(head[c.w] ?? ''), rows, skipped }
  }

  // Hevy: title, start_time, end_time, exercise_title, set_index, set_type, weight_kg/weight_lbs, reps, duration_seconds
  if (col(['exercise title']) >= 0 && col(['start time']) >= 0) {
    const kg = col(['weight kg'])
    const lb = col(['weight lbs', 'weight lb'])
    const c = {
      title: col(['title']),
      start: col(['start time']),
      end: col(['end time']),
      ex: col(['exercise title']),
      type: col(['set type']),
      reps: col(['reps']),
      sec: col(['duration seconds']),
    }
    for (const r of table.slice(1)) {
      const start = parseDate(at(r, c.start))
      const ex = at(r, c.ex)
      if (start == null || !ex) {
        skipped++
        continue
      }
      const end = parseDate(at(r, c.end)) ?? undefined
      rows.push({
        start,
        end: end && end > start ? end : undefined,
        workout: at(r, c.title) || 'Antrenman',
        exercise: ex,
        weight: kg >= 0 ? num(at(r, kg)) : num(at(r, lb)),
        reps: num(at(r, c.reps)),
        sec: num(at(r, c.sec)) || undefined,
        warmup: fold(at(r, c.type)) === 'warmup',
      })
    }
    return { format: 'hevy', unit: kg >= 0 ? 'kg' : lb >= 0 ? 'lb' : null, rows, skipped }
  }

  // FitNotes: Date, Exercise, Category, Weight (kgs|lbs), Reps, Distance, Distance Unit, Time
  if (col(['category']) >= 0 && col(['exercise']) >= 0 && col(['weight (']) >= 0) {
    const w = col(['weight ('])
    const c = { date: col(['date']), ex: col(['exercise']), reps: col(['reps']), time: col(['time']) }
    for (const r of table.slice(1)) {
      const start = parseDate(at(r, c.date))
      const ex = at(r, c.ex)
      if (start == null || !ex) {
        skipped++
        continue
      }
      rows.push({
        start,
        workout: 'Antrenman',
        exercise: ex,
        weight: num(at(r, w)),
        reps: num(at(r, c.reps)),
        sec: parseDuration(at(r, c.time)) || undefined,
        warmup: false,
      })
    }
    return { format: 'fitnotes', unit: unitFromHeader(head[w] ?? ''), rows, skipped }
  }

  // Genel: Türkçe ya da İngilizce sütun adları.
  const g = {
    date: col(['date', 'tarih', 'datetime', 'day', 'gun', 'start']),
    ex: col(['exercise', 'hareket', 'egzersiz', 'exercise name', 'movement', 'lift']),
    w: col(['weight', 'kilo', 'agirlik', 'load', 'kg', 'lbs', 'lb']),
    reps: col(['reps', 'tekrar', 'repetitions', 'rep']),
    workout: col(['workout', 'antrenman', 'workout name', 'routine', 'program', 'session']),
    dur: col(['duration', 'sure (s)', 'workout duration']),
    sec: col(['seconds', 'sn', 'time', 'sure']),
    warm: col(['warmup', 'isinma', 'warm up']),
  }
  if (g.date < 0 || g.ex < 0 || (g.reps < 0 && g.sec < 0))
    return {
      error:
        'Sütunlar tanınmadı. Tabloda en az tarih, hareket ve tekrar (ya da süre) sütunu olmalı; örneğin "Tarih, Hareket, Kilo, Tekrar".',
    }
  for (const r of table.slice(1)) {
    const start = parseDate(at(r, g.date))
    const ex = at(r, g.ex)
    if (start == null || !ex) {
      skipped++
      continue
    }
    const dur = parseDuration(at(r, g.dur))
    const warm = fold(at(r, g.warm))
    rows.push({
      start,
      end: dur ? start + dur * 1000 : undefined,
      workout: at(r, g.workout) || 'Antrenman',
      exercise: ex,
      weight: num(at(r, g.w)),
      reps: num(at(r, g.reps)),
      sec: g.sec !== g.dur ? num(at(r, g.sec)) || undefined : undefined,
      warmup: ['1', 'true', 'evet', 'yes', 'x', 'w'].includes(warm),
    })
  }
  return { format: 'generic', unit: g.w >= 0 ? unitFromHeader(head[g.w]) : 'kg', rows, skipped }
}

// ---------------------------------------------------------------- Hareket eşleme

/** Strong ve Hevy'deki yaygın adlar → Kor hareketi. Anahtar: "ad|ekipman" ya da "ad". */
const ALIASES: Record<string, string> = {
  // Göğüs
  'bench press|barbell': 'bench', 'bench press': 'bench', 'flat bench press': 'bench',
  'bench press|dumbbell': 'db-bench', 'dumbbell bench press': 'db-bench',
  'incline bench press|barbell': 'incline-bench', 'incline bench press': 'incline-bench',
  'incline bench press|dumbbell': 'db-incline', 'incline dumbbell press': 'db-incline',
  'decline bench press|barbell': 'decline-bench', 'decline bench press': 'decline-bench',
  'decline bench press|dumbbell': 'db-decline',
  'chest press|machine': 'chest-press', 'chest press': 'chest-press', 'seated chest press': 'chest-press',
  'chest fly|cable': 'cable-fly', 'cable fly': 'cable-fly', 'cable crossover': 'cable-fly', 'cable fly crossovers': 'cable-fly',
  'chest fly|machine': 'pec-deck', 'pec deck': 'pec-deck', 'butterfly|pec deck': 'pec-deck', 'butterfly': 'pec-deck',
  'chest dip': 'dips', 'dip': 'dips', 'dips': 'dips', 'triceps dip': 'dips', 'chest dip|weighted': 'dips',
  'push up': 'pushup', 'pushup': 'pushup', 'push ups': 'pushup',
  // Türkçe salon adları: arayüz İngilizce olsa da Türkçe liste eşleşsin.
  'sinav': 'pushup', 'barfiks': 'pullup', 'genis barfiks': 'pullup', 'ters barfiks': 'chinup', 'mekik': 'situp',
  'ayakta calf raise': 'calf-raise', 'ayakta baldir': 'calf-raise', 'oturarak baldir': 'seated-calf',
  // Sırt
  'bent over row|barbell': 'row', 'barbell row': 'row', 'bent over row': 'row',
  'bent over one arm row|dumbbell': 'db-row', 'dumbbell row': 'db-row', 'one arm row|dumbbell': 'db-row', 'dumbbell row|dumbbell': 'db-row',
  'pull up': 'pullup', 'pullup': 'pullup', 'pull up|weighted': 'pullup', 'pull ups': 'pullup',
  'chin up': 'chinup', 'chinup': 'chinup', 'chin up|weighted': 'chinup',
  'lat pulldown|cable': 'lat-pulldown', 'lat pulldown': 'lat-pulldown', 'lat pulldown|machine': 'lat-pulldown',
  'seated row|cable': 'seated-row', 'seated cable row': 'seated-row', 'seated row': 'seated-row', 'seated cable row|v grip cable': 'seated-row',
  't bar row': 'tbar-row', 't bar row|barbell': 'tbar-row',
  'face pull|cable': 'face-pull', 'face pull': 'face-pull',
  'shrug|barbell': 'shrug', 'shrug': 'shrug', 'shrug|dumbbell': 'shrug',
  'pendlay row|barbell': 'pendlay-row', 'pendlay row': 'pendlay-row',
  'deadlift|barbell': 'deadlift', 'deadlift': 'deadlift', 'conventional deadlift': 'deadlift',
  'sumo deadlift|barbell': 'sumo-deadlift', 'sumo deadlift': 'sumo-deadlift',
  'romanian deadlift|barbell': 'rdl', 'romanian deadlift': 'rdl', 'romanian deadlift|dumbbell': 'rdl',
  'stiff leg deadlift|barbell': 'stiff-leg-deadlift', 'stiff leg deadlift': 'stiff-leg-deadlift',
  'rack pull|barbell': 'rack-pull', 'rack pull': 'rack-pull',
  'back extension': 'back-extension', 'hyperextension': 'back-extension',
  // Omuz
  'overhead press|barbell': 'ohp', 'overhead press': 'ohp', 'ohp': 'ohp', 'shoulder press|barbell': 'ohp',
  'strict military press|barbell': 'military-press', 'military press': 'military-press', 'military press|barbell': 'military-press',
  'shoulder press|dumbbell': 'db-shoulder-press', 'overhead press|dumbbell': 'db-shoulder-press',
  'seated overhead press|dumbbell': 'db-shoulder-press', 'dumbbell shoulder press': 'db-shoulder-press',
  'shoulder press|machine': 'shoulder-press-machine', 'shoulder press machine': 'shoulder-press-machine',
  'arnold press|dumbbell': 'arnold-press', 'arnold press': 'arnold-press',
  'lateral raise|dumbbell': 'lateral-raise', 'lateral raise': 'lateral-raise', 'side lateral raise': 'lateral-raise',
  'lateral raise|cable': 'cable-lateral', 'cable lateral raise': 'cable-lateral',
  'front raise|dumbbell': 'front-raise', 'front raise': 'front-raise',
  'reverse fly|dumbbell': 'rear-delt-fly', 'rear delt reverse fly|dumbbell': 'rear-delt-fly', 'rear delt fly': 'rear-delt-fly',
  'reverse fly|machine': 'reverse-pec-deck', 'rear delt reverse fly|machine': 'reverse-pec-deck', 'reverse pec deck': 'reverse-pec-deck',
  'upright row|barbell': 'upright-row', 'upright row': 'upright-row',
  'push press|barbell': 'push-press', 'push press': 'push-press',
  // Kol
  'bicep curl|barbell': 'curl', 'biceps curl|barbell': 'curl', 'barbell curl': 'curl',
  'bicep curl|dumbbell': 'db-curl', 'biceps curl|dumbbell': 'db-curl', 'dumbbell curl': 'db-curl',
  'hammer curl|dumbbell': 'hammer-curl', 'hammer curl': 'hammer-curl',
  'preacher curl|barbell': 'preacher-curl', 'preacher curl': 'preacher-curl', 'preacher curl|ez bar': 'preacher-curl',
  'bicep curl|cable': 'cable-curl', 'biceps curl|cable': 'cable-curl', 'cable curl': 'cable-curl',
  'ez bar curl': 'ez-curl', 'bicep curl|ez bar': 'ez-curl', 'ez bar biceps curl': 'ez-curl',
  'concentration curl|dumbbell': 'concentration-curl', 'concentration curl': 'concentration-curl',
  'incline curl|dumbbell': 'incline-curl', 'incline dumbbell curl': 'incline-curl',
  'triceps pushdown|cable': 'pushdown', 'triceps pushdown': 'pushdown', 'tricep pushdown': 'pushdown',
  'triceps pushdown|cable straight bar': 'pushdown', 'triceps pushdown|cable bar': 'pushdown',
  'triceps rope pushdown': 'rope-pushdown', 'triceps pushdown|cable rope': 'rope-pushdown', 'rope pushdown': 'rope-pushdown',
  'skullcrusher|barbell': 'skullcrusher', 'skullcrusher': 'skullcrusher', 'skull crusher': 'skullcrusher',
  'lying triceps extension|barbell': 'skullcrusher', 'skullcrusher|ez bar': 'ez-skullcrusher',
  'triceps extension|dumbbell': 'overhead-ext', 'overhead triceps extension|dumbbell': 'overhead-ext',
  'overhead triceps extension|cable': 'overhead-rope-ext', 'triceps extension|cable': 'overhead-rope-ext',
  'close grip bench press|barbell': 'cg-bench', 'close grip bench press': 'cg-bench',
  'triceps kickback|dumbbell': 'kickback', 'triceps kickback': 'kickback',
  // Bacak
  'squat|barbell': 'squat', 'squat': 'squat', 'back squat': 'squat', 'back squat|barbell': 'squat',
  'front squat|barbell': 'front-squat', 'front squat': 'front-squat',
  'goblet squat|kettlebell': 'goblet-squat', 'goblet squat|dumbbell': 'goblet-squat', 'goblet squat': 'goblet-squat',
  'hack squat|machine': 'hack-squat', 'hack squat': 'hack-squat',
  'leg press|machine': 'leg-press', 'leg press': 'leg-press', 'leg press horizontal|machine': 'leg-press',
  'leg extension|machine': 'leg-extension', 'leg extension': 'leg-extension',
  'lunge|dumbbell': 'lunge', 'lunge': 'lunge', 'lunge|barbell': 'lunge',
  'walking lunge|dumbbell': 'walking-lunge', 'walking lunge': 'walking-lunge',
  'bulgarian split squat|dumbbell': 'split-squat', 'bulgarian split squat': 'split-squat',
  'step up|dumbbell': 'step-up', 'step up': 'step-up',
  'lying leg curl|machine': 'leg-curl', 'leg curl|machine': 'leg-curl', 'leg curl': 'leg-curl', 'lying leg curl': 'leg-curl',
  'seated leg curl|machine': 'seated-leg-curl', 'seated leg curl': 'seated-leg-curl',
  'hip thrust|barbell': 'hip-thrust', 'hip thrust': 'hip-thrust',
  'glute bridge': 'glute-bridge', 'glute bridge|barbell': 'hip-thrust',
  'standing calf raise|machine': 'calf-raise', 'standing calf raise': 'calf-raise', 'calf raise': 'calf-raise', 'calf raise|machine': 'calf-raise',
  'seated calf raise|machine': 'seated-calf', 'seated calf raise': 'seated-calf',
  // Karın
  'plank': 'plank', 'side plank': 'side-plank', 'crunch': 'crunch', 'sit up': 'situp', 'situp': 'situp',
  'hanging leg raise': 'hanging-leg-raise', 'hanging knee raise': 'hanging-knee-raise',
  'cable crunch': 'cable-crunch', 'ab wheel': 'ab-wheel', 'ab wheel rollout': 'ab-wheel', 'russian twist': 'russian-twist',
  // Kardiyo
  'running': 'run', 'running|treadmill': 'run', 'treadmill': 'run', 'run': 'run', 'jogging': 'jog', 'jog': 'jog',
  'walking': 'walk', 'walk': 'walk', 'hike': 'walk', 'hiking': 'walk', 'yuruyus': 'walk',
  'swim': 'swimming', 'swim session': 'swimming', 'pool swim': 'swimming', 'open water swim': 'swimming', 'yuzme': 'swimming',
  'ride': 'cycling', 'bike ride': 'cycling', 'outdoor ride': 'cycling', 'indoor ride': 'cycling', 'cycle': 'cycling',
  'cycling': 'cycling', 'stationary bike': 'cycling', 'bike': 'cycling', 'bisiklet': 'cycling', 'kosu': 'run',
  'rowing|machine': 'rowing', 'rowing machine': 'rowing', 'rowing': 'rowing',
  'elliptical trainer': 'elliptical', 'elliptical': 'elliptical', 'stair climber': 'stair-climber',
  'jump rope': 'jump-rope', 'swimming': 'swimming', 'burpee': 'burpee', 'box jump': 'box-jump',
}

/** "Bench Press (Barbell)" → { base: "bench press", eq: "barbell" }. */
function splitName(name: string): { base: string; eq: string } {
  const f = fold(name)
  const m = /^(.*?)\s*\(([^)]*)\)\s*$/.exec(f)
  const clean = (s: string) =>
    s
      .replace(/[-_/]+/g, ' ')
      .replace(/[^a-z0-9 ]/g, '')
      .replace(/\s+/g, ' ')
      .trim()
  return m ? { base: clean(m[1]), eq: clean(m[2]) } : { base: clean(f), eq: '' }
}

/** Kor adlarının sade hali → kimlik; kullanıcı Kor'un kendi adlarını yazdıysa da tutar. */
function nameIndex(custom: Exercise[]): Map<string, string> {
  const idx = new Map<string, string>()
  for (const e of [...BUILTIN, ...custom]) {
    const { base, eq } = splitName(e.name)
    idx.set(eq ? `${base} ${eq}` : base, e.id)
  }
  return idx
}

/** Dosyadaki hareket adını Kor hareketine eşler; eşleşme yoksa null (yeni özel hareket önerilir). */
export function matchExercise(name: string, custom: Exercise[] = []): string | null {
  const { base, eq } = splitName(name)
  const eqFirst = eq.split(' ')[0] ?? ''
  const idx = nameIndex(custom)
  // Motra/Liftoff tarzı: ekipman başta ("Dumbbell Lateral Raise" = "Lateral Raise (Dumbbell)").
  const lead = /^(smith machine|ez bar|dumbbell|barbell|cable|machine|kettlebell|bodyweight)\s+(.+)$/.exec(base)
  const leadAlias = lead
    ? ALIASES[`${lead[2]}|${lead[1]}`] ||
      ALIASES[`${lead[2].replace(/s$/, '')}|${lead[1]}`] ||
      (lead[1] === 'bodyweight' ? ALIASES[lead[2]] : undefined)
    : undefined
  return (
    (eq && ALIASES[`${base}|${eq}`]) ||
    (eqFirst && ALIASES[`${base}|${eqFirst}`]) ||
    ALIASES[base] ||
    leadAlias ||
    idx.get(eq ? `${base} ${eq}` : base) ||
    idx.get(base) ||
    null
  )
}

/** Kardiyo / spor etkinliği sözcükleri (tam kelime: "crunch" içindeki "run" sayılmaz). */
const CARDIO_WORDS =
  /\b(run|running|jog\w*|sprint\w*|bike|biking|cycl\w*|ride|riding|treadmill|ellipt\w*|walk\w*|hike|hiking|swim\w*|cardio|rowing|stair\w*|diving|dive|scuba|snorkel\w*|basketball|football|soccer|tennis|padel|squash|volleyball|badminton|handball|boxing|kickboxing|martial|yoga|pilates|dance|dancing|ski\w*|snowboard\w*|skat\w*|surf\w*|climb\w*|bouldering|golf|hiit|kosu|bisiklet|yuruyus|yuzme|dalis|basketbol|futbol|voleybol|tenis)\b/

/** Eşleşmeyen hareket için kas grubu ve ekipman tahmini (kullanıcı değiştirebilir). */
export function guessExercise(name: string): { muscle: MuscleId; equipment: Equipment; timed: boolean } {
  const { base, eq } = splitName(name)
  const s = `${base} ${eq}`
  // Kelime başından eşleşir: "machine" içindeki "chin" sırt sayılmaz.
  const has = (...w: string[]) => w.some((x) => (' ' + s).includes(' ' + x))
  const muscle: MuscleId = CARDIO_WORDS.test(s) && !/lunge|carry|farmer/.test(s)
    ? 'cardio'
    : has('calf', 'baldir')
      ? 'calves'
      : has('crunch', 'plank', 'abs', 'sit up', 'leg raise', 'oblique', 'karin', 'core')
        ? 'core'
        : has('deadlift', 'rdl', 'hip thrust', 'glute', 'hamstring', 'leg curl', 'good morning', 'kalca')
          ? 'posterior'
          : has('squat', 'lunge', 'leg press', 'leg extension', 'step up', 'quad', 'bacak')
            ? 'quads'
            : has('tricep', 'pushdown', 'skull', 'kickback', 'extension', 'dip')
              ? 'triceps'
              : has('curl', 'bicep')
                ? 'biceps'
                : has('shoulder', 'lateral', 'raise', 'delt', 'overhead', 'military', 'arnold', 'omuz')
                  ? 'shoulders'
                  : has('row', 'pull', 'lat ', 'chin', 'shrug', 'back', 'sirt')
                    ? 'back'
                    : has('bench', 'chest', 'fly', 'pec', 'push up', 'gogus')
                      ? 'chest'
                      : 'core'
  const equipment: Equipment = has('barbell', 'halter', 'ez bar')
    ? 'barbell'
    : has('dumbbell', 'dambil')
      ? 'dumbbell'
      : has('cable', 'kablo')
        ? 'cable'
        : has('machine', 'makine', 'smith')
          ? 'machine'
          : has('bodyweight', 'weighted', 'push up', 'pull up', 'chin up', 'dip', 'plank')
            ? 'bodyweight'
            : 'other'
  return { muscle, equipment, timed: muscle === 'cardio' }
}

// ---------------------------------------------------------------- Plan

/** Eşleme: dosyadaki ad → Kor hareket kimliği, ya da "new" (yeni özel hareket). */
export type Mapping = Record<string, string>

export interface ExerciseSummary {
  name: string
  /** Kaç sette geçiyor. */
  sets: number
  suggested: string | null
}

export function summarizeExercises(p: ParsedImport, custom: Exercise[] = []): ExerciseSummary[] {
  const counts = new Map<string, number>()
  for (const r of p.rows) counts.set(r.exercise, (counts.get(r.exercise) ?? 0) + 1)
  return [...counts]
    .map(([name, sets]) => ({ name, sets, suggested: matchExercise(name, custom) }))
    .sort((a, b) => b.sets - a.sets)
}

export interface ImportPlan {
  workouts: Workout[]
  newExercises: Exercise[]
  /** Zaten kayıtlı olduğu için atlanan antrenman sayısı. */
  duplicates: number
  sets: number
  from: number | null
  to: number | null
}

export interface BuildOptions {
  unit: Unit
  mapping: Mapping
  existing: Workout[]
  custom: Exercise[]
  /** O tarihteki vücut ağırlığı (kg). */
  bodyweightAt: (ts: number) => number
}

const round2 = (n: number) => Math.round(n * 100) / 100

export function buildImport(p: ParsedImport, o: BuildOptions): ImportPlan {
  /** Yakın başlayan ve zaman aralığı örtüşen antrenman aynı sayılır; art arda iki koşu ayrı kalır. */
  const isDup = (start: number, end: number, list: Workout[]) =>
    list.some(
      (w) => Math.abs(w.startedAt - start) < DUPLICATE_MS && w.startedAt < end && start < w.endedAt,
    )

  if (p.json) {
    const ids = new Set(o.existing.map((w) => w.id))
    const fresh = p.json.workouts.filter((w) => !ids.has(w.id) && !isDup(w.startedAt, w.endedAt, o.existing))
    const customIds = new Set(o.custom.map((e) => e.id))
    const used = new Set(fresh.flatMap((w) => w.exercises.map((e) => e.exerciseId)))
    return {
      workouts: fresh,
      newExercises: p.json.customExercises.filter((e) => !customIds.has(e.id) && used.has(e.id)),
      duplicates: p.json.workouts.length - fresh.length,
      sets: fresh.reduce((a, w) => a + w.exercises.reduce((b, e) => b + e.sets.length, 0), 0),
      from: fresh.length ? Math.min(...fresh.map((w) => w.startedAt)) : null,
      to: fresh.length ? Math.max(...fresh.map((w) => w.startedAt)) : null,
    }
  }

  // Yeni özel hareketler: eşlemede "new" seçilenler.
  const newExercises: Exercise[] = []
  const idFor = new Map<string, string>()
  const timedOnly = new Map<string, boolean>()
  const sessionOnly = new Map<string, boolean>()
  for (const r of p.rows) {
    const t = r.reps == null && (r.sec ?? 0) > 0
    timedOnly.set(r.exercise, (timedOnly.get(r.exercise) ?? true) && t)
    sessionOnly.set(r.exercise, (sessionOnly.get(r.exercise) ?? true) && !!r.session)
  }
  for (const name of new Set(p.rows.map((r) => r.exercise))) {
    const target = o.mapping[name]
    if (target && target !== 'new') {
      idFor.set(name, target)
      continue
    }
    const g = guessExercise(name)
    // Yalnızca süreyle kaydedilmiş (tekrarsız) hareket süreli olmalı; yoksa setleri düşer.
    const timed = g.timed || timedOnly.get(name) === true
    // Setsiz oturum ("Strength Training", "Core Session") bir etkinlik kaydıdır: kas grubuna yazılmaz.
    const session = sessionOnly.get(name) === true
    const ex: Exercise = {
      id: 'custom-' + uid(),
      name: name.trim().slice(0, 60),
      muscle: session ? 'cardio' : g.muscle,
      equipment: session ? 'other' : g.equipment,
      load: g.equipment === 'bodyweight' ? 'bodyweight' : 'external',
      custom: true,
      ...(timed ? { timed: true, longer: true } : {}),
    }
    newExercises.push(ex)
    idFor.set(name, ex.id)
  }
  const allCustom = [...o.custom, ...newExercises]

  // Antrenmanlara grupla: aynı başlangıç ve ad bir antrenmandır. Yalnızca gün bilinen
  // biçimlerde (FitNotes, saatsiz tablolar) aynı gün tek antrenman olur.
  const groups = new Map<string, ImportRow[]>()
  for (const r of p.rows) {
    const key = `${r.start}|${r.workout}`
    const g = groups.get(key)
    if (g) g.push(r)
    else groups.set(key, [r])
  }

  const workouts: Workout[] = []
  let duplicates = 0
  let sets = 0
  for (const rows of groups.values()) {
    const start = rows[0].start
    const end = Math.max(rows.find((r) => r.end)?.end ?? start + DEFAULT_MINUTES * 60_000, start + 60_000)
    if (isDup(start, end, o.existing) || isDup(start, end, workouts)) {
      duplicates++
      continue
    }
    const exercises: Workout['exercises'] = []
    for (const r of rows) {
      const exerciseId = idFor.get(r.exercise)!
      const ex = findExercise(exerciseId, allCustom)
      const kg = r.weight == null ? null : round2(o.unit === 'lb' ? r.weight * LB : r.weight)
      const set: SetEntry = ex.timed
        ? { kg: kg ?? 0, reps: 1, done: true, ...(r.sec ? { sec: r.sec } : {}) }
        : { kg: kg ?? 0, reps: r.reps != null ? Math.max(0, Math.round(r.reps)) : null, done: true }
      if (r.warmup) set.warmup = true
      if (!ex.timed && (set.reps == null || set.reps <= 0)) continue
      const same = exercises.find((e) => e.exerciseId === exerciseId)
      if (same) same.sets.push(set)
      else exercises.push({ uid: uid(), exerciseId, sets: [set] })
      sets++
    }
    if (!exercises.length) continue
    workouts.push({
      id: uid(),
      name: rows[0].workout.slice(0, 60),
      startedAt: start,
      endedAt: end,
      bodyweight: o.bodyweightAt(start),
      exercises,
    })
  }
  workouts.sort((a, b) => a.startedAt - b.startedAt)
  const used = new Set(workouts.flatMap((w) => w.exercises.map((e) => e.exerciseId)))
  return {
    workouts,
    newExercises: newExercises.filter((e) => used.has(e.id)),
    duplicates,
    sets,
    from: workouts[0]?.startedAt ?? null,
    to: workouts[workouts.length - 1]?.startedAt ?? null,
  }
}

/** Vücut ağırlığı kayıtlarından o güne en yakın önceki değer; yoksa ilk kayıt ya da varsayılan. */
export function bodyweightLookup(entries: { at: number; kg: number }[], fallback: number) {
  const sorted = [...entries].sort((a, b) => a.at - b.at)
  return (ts: number) => {
    let kg = sorted[0]?.kg ?? fallback
    for (const e of sorted) {
      if (e.at > startOfDay(ts) + DAY) break
      kg = e.kg
    }
    return kg
  }
}

// ---------------------------------------------------------------- Dışa aktarma

/**
 * Seçili antrenman(lar)ı tek başına taşınabilir bir Kor dosyasına çevirir: kullandıkları özel
 * hareketler de içindedir, başka bir cihazda İçe aktar ile birebir geri gelir.
 */
export function workoutFile(workouts: Workout[], custom: Exercise[] = []): string {
  const used = new Set(workouts.flatMap((w) => w.exercises.map((e) => e.exerciseId)))
  return JSON.stringify(
    {
      kind: WORKOUT_FILE_KIND,
      version: 1,
      workouts,
      customExercises: custom.filter((e) => used.has(e.id)),
    },
    null,
    2,
  )
}

/** Dosya adı için güvenli parça: "Push Day #2" → "push-day-2". */
export function fileSlug(s: string): string {
  return (
    fold(s)
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'antrenman'
  )
}

/** Kor verisini her uygulamanın okuyabileceği düz CSV'ye çevirir (bir satır = bir set). */
export function toCsv(workouts: Workout[], custom: Exercise[] = []): string {
  const pad = (n: number) => String(n).padStart(2, '0')
  const iso = (t: number) => {
    const d = new Date(t)
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`
  }
  const lines = [['Date', 'Workout', 'Duration (s)', 'Exercise', 'Set', 'Weight (kg)', 'Reps', 'Seconds', 'Warmup'].join(',')]
  for (const w of [...workouts].sort((a, b) => a.startedAt - b.startedAt)) {
    const dur = Math.round((w.endedAt - w.startedAt) / 1000)
    for (const we of w.exercises) {
      const ex = findExercise(we.exerciseId, custom)
      we.sets
        .filter((s) => s.done)
        .forEach((s, i) => {
          lines.push(
            [iso(w.startedAt), w.name, dur, ex.name, i + 1, s.kg ?? 0, s.reps ?? '', s.sec ?? '', s.warmup ? 1 : 0]
              .map(csvCell)
              .join(','),
          )
        })
    }
  }
  return lines.join('\n') + '\n'
}
