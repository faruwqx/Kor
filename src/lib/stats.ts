import { findExercise } from './exercises'
import { addDays, weekStart } from './format'
import { MAX_RANK_REPS, e1rm, setLoad } from './rank'
import type { Exercise, SetEntry, Workout, WorkoutExercise } from './types'

export function isWorkSet(s: SetEntry): s is SetEntry & { kg: number; reps: number } {
  return s.done && !s.warmup && s.kg != null && s.reps != null && s.reps > 0
}

/** Toplam hacim (kg × tekrar). Dambılda iki el, vücut ağırlığında VA + ek kilo. */
export function exerciseVolume(we: WorkoutExercise, ex: Exercise, bodyweight: number): number {
  // Süreli harekette kilo × tekrar anlamsız: hacme katılmaz.
  if (ex.timed) return 0
  let v = 0
  for (const s of we.sets) {
    if (!isWorkSet(s)) continue
    const load = setLoad(ex, s.kg, bodyweight) * (ex.perHand ? 2 : 1)
    v += Math.max(0, load) * s.reps
  }
  return v
}

export function workoutVolume(w: Workout, custom: Exercise[] = []): number {
  return w.exercises.reduce(
    (a, we) => a + exerciseVolume(we, findExercise(we.exerciseId, custom), w.bodyweight),
    0,
  )
}

export function workoutSetCount(w: { exercises: WorkoutExercise[] }): number {
  return w.exercises.reduce((a, we) => a + we.sets.filter(isWorkSet).length, 0)
}

/** Bir hareketin tek antrenmandaki en iyi tahmini 1TM'i (toplam yük üzerinden). */
export function bestE1rm(we: WorkoutExercise, ex: Exercise, bodyweight: number): number {
  if (ex.timed) return 0
  let best = 0
  for (const s of we.sets) {
    if (!isWorkSet(s) || s.reps > MAX_RANK_REPS) continue
    best = Math.max(best, e1rm(setLoad(ex, s.kg, bodyweight), s.reps))
  }
  return best
}

export interface ExerciseSession {
  workoutId: string
  at: number
  bodyweight: number
  sets: SetEntry[]
  e1rm: number
  topKg: number
  /** Bu hareketin o antrenmandaki toplam hacmi (kg × tekrar). */
  volume: number
  /** Süreli harekette o antrenmanın en kısa seti (saniye); değilse null. */
  bestSec: number | null
}

/** Setlerdeki en iyi süre (saniye): varsayılan en kısa, `longer` ise en uzun. Süre yoksa null. */
export function bestSeconds(sets: SetEntry[], longer = false): number | null {
  const secs = sets.filter((s) => s.done && !s.warmup && s.sec != null && s.sec > 0).map((s) => s.sec!)
  return secs.length ? (longer ? Math.max(...secs) : Math.min(...secs)) : null
}

/** Son `n` haftanın toplam hacmi, eskiden yeniye. Hafta pazartesi başlar. */
export function weeklyVolume(
  workouts: Workout[],
  custom: Exercise[] = [],
  n = 12,
  now = Date.now(),
): { start: number; kg: number }[] {
  const sums = new Map<number, number>()
  for (const w of workouts) {
    const ws = weekStart(w.endedAt)
    sums.set(ws, (sums.get(ws) ?? 0) + workoutVolume(w, custom))
  }
  const cur = weekStart(now)
  return Array.from({ length: n }, (_, i) => {
    const start = addDays(cur, -7 * (n - 1 - i))
    return { start, kg: sums.get(start) ?? 0 }
  })
}

/** Hareketin geçmişi, eskiden yeniye. */
export function exerciseSessions(
  exerciseId: string,
  workouts: Workout[],
  custom: Exercise[] = [],
): ExerciseSession[] {
  const ex = findExercise(exerciseId, custom)
  const out: ExerciseSession[] = []
  for (const w of workouts) {
    const sets = w.exercises.filter((we) => we.exerciseId === exerciseId).flatMap((we) => we.sets)
    const work = sets.filter(isWorkSet)
    if (!work.length) continue
    out.push({
      workoutId: w.id,
      at: w.endedAt,
      bodyweight: w.bodyweight,
      sets: work,
      e1rm: bestE1rm({ uid: '', exerciseId, sets: work }, ex, w.bodyweight),
      topKg: Math.max(...work.map((s) => s.kg)),
      volume: exerciseVolume({ uid: '', exerciseId, sets: work }, ex, w.bodyweight),
      bestSec: ex.timed ? bestSeconds(work, ex.longer) : null,
    })
  }
  return out.sort((a, b) => a.at - b.at)
}

/** Bir önceki antrenmanda bu hareketin çalışma setleri (yer tutucu olarak gösterilir). */
export function lastSets(exerciseId: string, workouts: Workout[]): SetEntry[] {
  for (let i = workouts.length - 1; i >= 0; i--) {
    const sets = workouts[i].exercises
      .filter((we) => we.exerciseId === exerciseId)
      .flatMap((we) => we.sets)
      .filter(isWorkSet)
    if (sets.length) return sets
  }
  return []
}

export interface PR {
  exerciseId: string
  kind: 'e1rm' | 'kg'
  value: number
  previous: number
  /** Rekoru getiren set. */
  kg: number
  reps: number
}

interface Bests {
  e1rm: number
  kg: number
}

function bestsBefore(
  exerciseId: string,
  workouts: Workout[],
  before: number,
  custom: Exercise[],
): Bests | null {
  const ex = findExercise(exerciseId, custom)
  let found = false
  const b: Bests = { e1rm: 0, kg: -Infinity }
  for (const w of workouts) {
    if (w.endedAt >= before) continue
    for (const we of w.exercises) {
      if (we.exerciseId !== exerciseId) continue
      for (const s of we.sets) {
        if (!isWorkSet(s)) continue
        found = true
        b.kg = Math.max(b.kg, s.kg)
        if (s.reps <= MAX_RANK_REPS)
          b.e1rm = Math.max(b.e1rm, e1rm(setLoad(ex, s.kg, w.bodyweight), s.reps))
      }
    }
  }
  return found ? b : null
}

/**
 * Antrenmandaki kişisel rekorlar. Bir hareket ilk kez yapıldıysa rekor sayılmaz:
 * kıyaslanacak geçmişi yoktur.
 */
export function workoutPRs(w: Workout, workouts: Workout[], custom: Exercise[] = []): PR[] {
  const prs: PR[] = []
  const seen = new Set<string>()
  for (const we of w.exercises) {
    if (seen.has(we.exerciseId)) continue
    seen.add(we.exerciseId)
    const prev = bestsBefore(we.exerciseId, workouts, w.endedAt, custom)
    if (!prev) continue
    const ex = findExercise(we.exerciseId, custom)
    // Süreli harekette kilo rekoru aranmaz.
    if (ex.timed) continue
    const sets = w.exercises
      .filter((x) => x.exerciseId === we.exerciseId)
      .flatMap((x) => x.sets)
      .filter(isWorkSet)
    let top: (typeof sets)[number] | null = null
    let topE = 0
    let heavy: (typeof sets)[number] | null = null
    for (const s of sets) {
      if (s.reps <= MAX_RANK_REPS) {
        const e = e1rm(setLoad(ex, s.kg, w.bodyweight), s.reps)
        if (e > topE) {
          topE = e
          top = s
        }
      }
      if (!heavy || s.kg > heavy.kg) heavy = s
    }
    if (heavy && heavy.kg > prev.kg + 1e-9) {
      prs.push({
        exerciseId: ex.id,
        kind: 'kg',
        value: heavy.kg,
        previous: prev.kg,
        kg: heavy.kg,
        reps: heavy.reps,
      })
    } else if (top && prev.e1rm > 0 && topE > prev.e1rm + 0.05) {
      prs.push({
        exerciseId: ex.id,
        kind: 'e1rm',
        value: topE,
        previous: prev.e1rm,
        kg: top.kg,
        reps: top.reps,
      })
    }
  }
  return prs
}

export interface VolumePR {
  /** Hareket rekoru için hareket kimliği; antrenman toplamı için null. */
  exerciseId: string | null
  value: number
  previous: number
}

/**
 * Hacim rekorları: antrenmanın toplam hacmi ve hareket başına seans hacmi, öncekilerin
 * en iyisini geçtiyse. Kıyaslanacak geçmiş yoksa rekor sayılmaz; süreli hareketler hariç.
 */
export function volumePRs(w: Workout, workouts: Workout[], custom: Exercise[] = []): VolumePR[] {
  const before = workouts.filter((x) => x.endedAt < w.endedAt)
  const out: VolumePR[] = []

  const total = workoutVolume(w, custom)
  const prevTotal = Math.max(0, ...before.map((x) => workoutVolume(x, custom)))
  if (before.length && prevTotal > 0 && total > prevTotal + 1e-9)
    out.push({ exerciseId: null, value: total, previous: prevTotal })

  const seen = new Set<string>()
  for (const we of w.exercises) {
    if (seen.has(we.exerciseId)) continue
    seen.add(we.exerciseId)
    const ex = findExercise(we.exerciseId, custom)
    if (ex.timed) continue
    const sessionVolume = (x: Workout) =>
      x.exercises
        .filter((e) => e.exerciseId === we.exerciseId)
        .reduce((a, e) => a + exerciseVolume(e, ex, x.bodyweight), 0)
    const now = sessionVolume(w)
    const prev = Math.max(0, ...before.map(sessionVolume))
    if (prev > 0 && now > prev + 1e-9) out.push({ exerciseId: ex.id, value: now, previous: prev })
  }
  return out
}

export interface WeekInfo {
  start: number
  count: number
  met: boolean
}

export interface Streak {
  /** Hedefi tutturulan ardışık hafta sayısı. İçinde bulunulan hafta tuttuysa dahildir. */
  weeks: number
  thisWeek: number
  goal: number
  /** Bu haftanın yedi günü: o gün antrenman var mı. */
  days: boolean[]
  /** Son 12 hafta, eskiden yeniye. */
  history: WeekInfo[]
}

export function streak(workouts: Workout[], goal: number, now = Date.now()): Streak {
  const counts = new Map<number, number>()
  for (const w of workouts) {
    const ws = weekStart(w.endedAt)
    counts.set(ws, (counts.get(ws) ?? 0) + 1)
  }
  const cur = weekStart(now)
  const thisWeek = counts.get(cur) ?? 0
  let weeks = thisWeek >= goal ? 1 : 0
  for (let ws = addDays(cur, -7); (counts.get(ws) ?? 0) >= goal; ws = addDays(ws, -7)) weeks++

  const days = Array.from({ length: 7 }, (_, i) => {
    const from = addDays(cur, i)
    const to = addDays(cur, i + 1)
    return workouts.some((w) => w.endedAt >= from && w.endedAt < to)
  })
  const history: WeekInfo[] = []
  for (let i = 11; i >= 0; i--) {
    const start = addDays(cur, -7 * i)
    const count = counts.get(start) ?? 0
    history.push({ start, count, met: count >= goal })
  }
  return { weeks, thisWeek, goal, days, history }
}
