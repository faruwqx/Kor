import { findExercise } from './exercises'
import { addDays, uid, weekStart } from './format'
import { PRESET_ROUTINES } from './presets'
import { plateStep } from './rank'
import type { AppState, BodyweightEntry, SetEntry, Workout } from './types'

/*
 * Örnek veri: 78 kg civarı bir sporcunun 14 haftalık itiş / çekiş / bacak / üst
 * vücut düzeni. Uygulamayı dolu görmek için. Gerçek kayıt değildir; Profil'den
 * silinir.
 */

function rng(seed: number) {
  let s = seed
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296
    return s / 4294967296
  }
}

/** hareket → [başlangıç 1TM, bitiş 1TM]. Vücut ağırlığı hareketlerinde toplam yük. */
const CURVES: Record<string, [number, number]> = {
  bench: [80, 96],
  ohp: [43, 50],
  'db-incline': [27, 33],
  'lateral-raise': [8, 10.5],
  pushdown: [46, 56],
  deadlift: [152, 186],
  pullup: [98, 112],
  row: [73, 88],
  'lat-pulldown': [60, 72],
  curl: [36, 43],
  squat: [102, 125],
  rdl: [92, 115],
  'leg-press': [165, 205],
  'leg-curl': [48, 60],
  'calf-raise': [90, 115],
  'db-bench': [31, 38],
  chinup: [101, 115],
  'db-shoulder-press': [19, 23],
  skullcrusher: [34, 42],
  'db-curl': [15, 19],
}

const WEEKS = 14
/** Pazartesi itiş, salı çekiş, perşembe bacak, cumartesi üst vücut. */
const PLAN: [dayOffset: number, routine: number, hour: number][] = [
  [0, 0, 18],
  [1, 1, 19],
  [3, 2, 18],
  [5, 3, 11],
]

export function demoState(now = Date.now()): AppState {
  const rand = rng(20261112)
  const thisWeek = weekStart(now)
  const workouts: Workout[] = []
  const bodyweights: BodyweightEntry[] = []

  for (let week = 0; week < WEEKS; week++) {
    const t = week / (WEEKS - 1)
    const ws = addDays(thisWeek, -7 * (WEEKS - 1 - week))
    const bw = Math.round((76.4 + 1.8 * t + (rand() - 0.5) * 0.4) * 10) / 10
    if (week % 2 === 0) bodyweights.push({ at: ws + 8 * 3600_000, kg: bw })

    // Altı hafta önce tatil: tek antrenman, seri orada kırılıyor.
    const holiday = week === WEEKS - 7
    for (const [offset, routineIndex, hour] of PLAN) {
      const start = addDays(ws, offset) + hour * 3600_000 + Math.floor(rand() * 40) * 60_000
      if (start > now - 3600_000) continue
      if (holiday && offset !== 0) continue
      if (!holiday && offset === 5 && rand() < 0.3) continue

      const routine = PRESET_ROUTINES[routineIndex]
      const exercises = routine.items.map((item) => {
        const ex = findExercise(item.exerciseId)
        const [from, to] = CURVES[item.exerciseId]
        const target = (from + (to - from) * t) * (0.985 + rand() * 0.03)
        const step = plateStep(ex)
        const total = target / (1 + item.reps / 30)
        const raw = ex.load === 'bodyweight' ? total - bw : total
        const kg = Math.max(0, Math.round(raw / step) * step)
        const sets: SetEntry[] = Array.from({ length: item.sets }, (_, i) => ({
          kg,
          // Son setlerde yorgunluk: bir iki tekrar düşer.
          reps: Math.max(1, item.reps - (i >= 2 && rand() < 0.55 ? 1 : 0) - (i >= 3 ? 1 : 0)),
          done: true,
        }))
        return { uid: uid(), exerciseId: item.exerciseId, sets }
      })
      const minutes = 52 + Math.floor(rand() * 26)
      workouts.push({
        id: uid(),
        name: routine.name,
        startedAt: start,
        endedAt: start + minutes * 60_000,
        bodyweight: bw,
        routineId: routine.id,
        exercises,
      })
    }
  }

  return {
    profile: {
      name: 'Deniz',
      sex: 'm',
      weeklyGoal: 3,
      createdAt: workouts[0]?.startedAt ?? now,
    },
    bodyweights,
    workouts,
    routines: PRESET_ROUTINES.map((r) => ({ ...r })),
    customExercises: [],
    active: null,
    settings: { restSec: 120, vibrate: true },
    demo: true,
  }
}
