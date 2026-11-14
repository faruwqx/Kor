import { useEffect, useMemo, useState } from 'react'
import { findExercise } from './exercises'
import { kgAtReps, kgForRp, rankBoard, rankFromRp, type BestLift, type RankBoard } from './rank'
import { currentBodyweight } from './store'
import type { AppState, Exercise, MuscleId, Routine } from './types'

export function useBoard(s: AppState): RankBoard {
  const sex = s.profile?.sex ?? 'm'
  return useMemo(
    () => rankBoard(s.workouts, sex, s.customExercises),
    [s.workouts, sex, s.customExercises],
  )
}

/** Saniyede bir yeniden çizer; sayaçlar için. */
export function useNow(enabled = true, ms = 1000): number {
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => {
    if (!enabled) return
    setNow(Date.now())
    const id = setInterval(() => setNow(Date.now()), ms)
    return () => clearInterval(id)
  }, [enabled, ms])
  return now
}

export interface Target {
  exercise: Exercise
  muscle: MuscleId
  fromLabel: string
  toLabel: string
  rpLeft: number
  kg: number
  reps: number
}

/** Bir kaldırışı bir sonraki basamağa taşıyacak kilo, aynı tekrar sayısıyla. */
export function targetFor(lift: BestLift, s: AppState): Target | null {
  const ex = findExercise(lift.exerciseId, s.customExercises)
  const rank = rankFromRp(lift.rp)
  if (rank.nextAt == null || !s.profile) return null
  const bw = currentBodyweight(s)
  const need = kgForRp(ex, rank.nextAt, bw, s.profile.sex)
  if (need == null) return null
  const reps = Math.min(Math.max(lift.reps, 1), 10)
  return {
    exercise: ex,
    muscle: ex.muscle,
    fromLabel: rank.label,
    toLabel: rank.nextLabel!,
    rpLeft: rank.nextAt - lift.rp,
    kg: kgAtReps(ex, need, reps, bw),
    reps,
  }
}

/** Terfiye en yakın kas grubu. */
export function nearestPromotion(board: RankBoard, s: AppState): Target | null {
  let best: Target | null = null
  for (const m of board.muscles) {
    if (!m.lift) continue
    const t = targetFor(m.lift, s)
    if (t && (!best || t.rpLeft < best.rpLeft)) best = t
  }
  return best
}

export function routineLastAt(s: AppState, id: string): number | null {
  let lastAt: number | null = null
  for (const w of s.workouts) if (w.routineId === id) lastAt = w.endedAt
  return lastAt
}

/** Sıradaki program: en uzun süredir yapılmayan, hiç yapılmayan önce. */
export function nextRoutine(s: AppState): { routine: Routine; lastAt: number | null } | null {
  let pick: { routine: Routine; lastAt: number | null } | null = null
  for (const routine of s.routines) {
    if (!routine.items.length) continue
    const lastAt = routineLastAt(s, routine.id)
    if (!pick || (lastAt ?? 0) < (pick.lastAt ?? 0)) pick = { routine, lastAt }
  }
  return pick
}

export function routineSummary(routine: Routine, custom: Exercise[], max = 3): string {
  const names = routine.items.map((it) => findExercise(it.exerciseId, custom).name)
  if (!names.length) return 'Henüz hareket yok'
  const head = names.slice(0, max).join(', ')
  return names.length > max ? `${head} +${names.length - max}` : head
}
