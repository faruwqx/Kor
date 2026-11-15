/**
 * Trendler ekranının hesapları: seçilen aralıkta süre, hacim, set ve tekrar;
 * kas gruplarına dağılım ve en çok yapılan hareketler.
 */
import { findExercise } from './exercises'
import { localize } from './i18n'
import { addDays, startOfDay, weekStart } from './format'
import { exerciseVolume, isWorkSet } from './stats'
import type { Exercise, MuscleId, Workout } from './types'

export type RangeDays = 7 | 30 | 90
export type Metric = 'time' | 'volume' | 'sets'
export type LoadMetric = 'reps' | 'sets' | 'volume'

export interface Totals {
  workouts: number
  /** Antrenmanların toplam süresi, dakika. */
  minutes: number
  sets: number
  reps: number
  /** kg × tekrar. */
  volume: number
}

export interface Bucket extends Totals {
  start: number
  end: number
}

const ZERO: Totals = { workouts: 0, minutes: 0, sets: 0, reps: 0, volume: 0 }

export function totals(workouts: Workout[], custom: Exercise[] = []): Totals {
  const t = { ...ZERO }
  for (const w of workouts) {
    t.workouts++
    t.minutes += Math.max(0, w.endedAt - w.startedAt) / 60000
    for (const we of w.exercises) {
      const ex = findExercise(we.exerciseId, custom)
      t.volume += exerciseVolume(we, ex, w.bodyweight)
      for (const s of we.sets) {
        if (!isWorkSet(s)) continue
        t.sets++
        // Süreli harekette tekrar alanı anlamsızdır.
        if (!ex.timed) t.reps += s.reps
      }
    }
  }
  return t
}

/** Bu kadar günden uzun aralıklar hafta hafta dilimlenir. */
export const WEEKLY_AFTER_DAYS = 45

/** İki gün başlangıcı arasındaki gün sayısı, iki uç dahil. */
export function spanDays(from: number, to: number): number {
  let n = 1
  for (let d = from; d < to; d = addDays(d, 1)) n++
  return n
}

/**
 * Seçilen aralığın dilimleri, eskiden yeniye. `from` ve `to` gün başlangıcıdır,
 * iki uç dahil. Kısa aralıkta gün gün, WEEKLY_AFTER_DAYS günden uzunsa hafta hafta.
 */
export function rangeBuckets(
  workouts: Workout[],
  custom: Exercise[],
  from: number,
  to: number,
): Bucket[] {
  const weekly = spanDays(from, to) > WEEKLY_AFTER_DAYS
  const last = addDays(to, 1)
  const out: Bucket[] = []
  for (let start = weekly ? weekStart(from) : from; start < last; ) {
    const next = addDays(start, weekly ? 7 : 1)
    // Uçlardaki yarım haftalar aralığın dışına taşmaz.
    const s = Math.max(start, from)
    const e = Math.min(next, last)
    const inside = workouts.filter((w) => w.endedAt >= s && w.endedAt < e)
    out.push({ start: s, end: e, ...totals(inside, custom) })
    start = next
  }
  return out
}

/** Hazır aralıkların başlangıcı: 7 ve 30 günde bugün dahil son N gün, 90 günde son 13 hafta. */
export function presetFrom(days: RangeDays, now = Date.now()): number {
  return days === 90 ? addDays(weekStart(now), -7 * 12) : addDays(startOfDay(now), -(days - 1))
}

/** Hazır aralığın dilimleri. */
export function buckets(
  workouts: Workout[],
  custom: Exercise[],
  days: RangeDays,
  now = Date.now(),
): Bucket[] {
  return rangeBuckets(workouts, custom, presetFrom(days, now), startOfDay(now))
}

/** Radar eksenleri: altı bölge, kas gruplarından toplanır. */
export const LOAD_GROUPS: { id: string; name: string; muscles: MuscleId[] }[] = [
  { id: 'back', name: 'Sırt', muscles: ['back'] },
  { id: 'shoulders', name: 'Omuz', muscles: ['shoulders'] },
  { id: 'core', name: 'Karın', muscles: ['core'] },
  { id: 'arms', name: 'Kol', muscles: ['biceps', 'triceps'] },
  { id: 'chest', name: 'Göğüs', muscles: ['chest'] },
  { id: 'legs', name: 'Bacak', muscles: ['quads', 'posterior', 'calves'] },
]
localize(LOAD_GROUPS, 'name')

/** Her bölgenin tekrar, set ve hacmi; LOAD_GROUPS sırasıyla. */
export function muscleLoad(
  workouts: Workout[],
  custom: Exercise[] = [],
): Record<LoadMetric, number>[] {
  const out = LOAD_GROUPS.map(() => ({ reps: 0, sets: 0, volume: 0 }))
  for (const w of workouts) {
    for (const we of w.exercises) {
      const ex = findExercise(we.exerciseId, custom)
      const gi = LOAD_GROUPS.findIndex((g) => g.muscles.includes(ex.muscle))
      if (gi < 0) continue
      out[gi].volume += exerciseVolume(we, ex, w.bodyweight)
      for (const s of we.sets) {
        if (!isWorkSet(s)) continue
        out[gi].sets++
        if (!ex.timed) out[gi].reps += s.reps
      }
    }
  }
  return out
}

/** Kor kaba kas → ince kas haritası (Motra kategorisi olmayan Kor hareketleri için). */
const MUSCLE2FINE: Record<MuscleId, string> = {
  chest: 'chest',
  back: 'lats',
  shoulders: 'shoulders',
  biceps: 'biceps',
  triceps: 'triceps',
  quads: 'quads',
  posterior: 'glutes',
  core: 'abs',
  calves: 'calves',
  hyrox: '',
  cardio: '',
}

/** İnce kas bazında tekrar/set/hacim. Vücut haritası bununla boyanır. */
export function regionLoad(
  workouts: Workout[],
  custom: Exercise[] = [],
): Record<string, Record<LoadMetric, number>> {
  const out: Record<string, { reps: number; sets: number; volume: number }> = {}
  const add = (c: string, m: 'reps' | 'sets' | 'volume', v: number) => {
    if (!c) return
    ;(out[c] ??= { reps: 0, sets: 0, volume: 0 })[m] += v
  }
  for (const w of workouts) {
    for (const we of w.exercises) {
      const ex = findExercise(we.exerciseId, custom)
      const cats = ex.cats?.length ? ex.cats : [MUSCLE2FINE[ex.muscle]]
      let sets = 0
      let reps = 0
      for (const s of we.sets) {
        if (!isWorkSet(s)) continue
        sets++
        if (!ex.timed) reps += s.reps
      }
      const volume = exerciseVolume(we, ex, w.bodyweight)
      cats.forEach((c, idx) => {
        const k = idx === 0 ? 1 : 0.5
        add(c, 'sets', sets * k)
        add(c, 'reps', reps * k)
        add(c, 'volume', volume * k)
      })
    }
  }
  return out as Record<string, Record<LoadMetric, number>>
}

/** Aralıkta yapılan hareketler, set sayısına göre çoktan aza. */
export function exerciseCounts(workouts: Workout[]): { id: string; sets: number }[] {
  const counts = new Map<string, number>()
  for (const w of workouts)
    for (const we of w.exercises) {
      const n = we.sets.filter(isWorkSet).length
      if (n) counts.set(we.exerciseId, (counts.get(we.exerciseId) ?? 0) + n)
    }
  return [...counts].map(([id, sets]) => ({ id, sets })).sort((a, b) => b.sets - a.sets)
}
