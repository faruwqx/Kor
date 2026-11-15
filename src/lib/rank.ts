import { RANKED_MUSCLES, findExercise } from './exercises'
import type { Exercise, MuscleId, Profile, Workout } from './types'
import { plateStepKg } from './units'

/*
 * Rank nasıl hesaplanır
 * ---------------------
 * 1. Her çalışma setinden tahmini 1TM çıkar (Epley). 12 tekrarın üstü sayılmaz;
 *    yüksek tekrarda formül şişer.
 * 2. 1TM vücut ağırlığına bölünür. Vücut ağırlığı hareketlerinde yük,
 *    vücut ağırlığı + eklenen kilodur.
 * 3. Oran, hareketin kendi standardında 0-1 arasına oturtulur
 *    (start = merdivenin dibi, elite = Kor eşiği), RANK_CURVE eğrisinden geçer
 *    ve 2100 RP'ye çevrilir. Eğri ilk kademeleri kolaylaştırır.
 * 4. Yedi kademe, her biri üç basamak, her basamak 100 RP. 2100 RP ve üstü Kor.
 * 5. Kas grubunun rank'i, o grubu çalıştıran hareketlerden en yükseğidir.
 *    Genel rank, sıralanmış grupların ortalamasıdır ve en az dört grup ister.
 */

import { localize } from './i18n'

export const TIERS = [
  { id: 'komur', name: 'Kömür', color: '#8b929c' },
  { id: 'demir', name: 'Demir', color: '#5d6b7e' },
  { id: 'bronz', name: 'Bronz', color: '#d2783a' },
  { id: 'gumus', name: 'Gümüş', color: '#9db2c9' },
  { id: 'altin', name: 'Altın', color: '#f7b500' },
  { id: 'platin', name: 'Platin', color: '#14c4b0' },
  { id: 'elmas', name: 'Elmas', color: '#b478f0' },
  { id: 'kor', name: 'Kor', color: '#ff5a1f' },
] as const
localize(TIERS as unknown as { name: string }[], 'name')

export const RP_PER_DIVISION = 100
export const DIVISIONS_PER_TIER = 3
export const RP_PER_TIER = RP_PER_DIVISION * DIVISIONS_PER_TIER
export const KOR_RP = RP_PER_TIER * (TIERS.length - 1) // 2100
export const MAX_RP = KOR_RP + RP_PER_TIER // gösterim tavanı
/**
 * İlerleme eğrisi. 1 = doğrusal. 1'den küçük değer alt ve orta kademeleri öne çeker:
 * yeni başlayan ilk terfilerini çabuk görür, Kor eşiği ise yerinde kalır.
 * 0,7 ile Demir, standardın %14'ü yerine %6'sında; Altın %57 yerine %45'inde açılır.
 */
export const RANK_CURVE = 0.7
/**
 * Genel kolaylık çarpanı: tüm standartlar bununla çarpılır. 0,65 = her kademe,
 * Kor dahil, ham standarttan %35 daha az kiloyla açılır.
 */
export const RANK_EASE = 0.65
export const PLACEMENT_GROUPS = 4
export const MAX_RANK_REPS = 12

const ROMAN = ['III', 'II', 'I']

export interface Rank {
  rp: number
  tier: number
  /** 0 = III, 1 = II, 2 = I. Kor'da basamak yok. */
  division: number
  tierName: string
  label: string
  color: string
  /** Basamak içindeki ilerleme, 0-1. */
  progress: number
  /** Bir sonraki basamağın RP eşiği; Kor'da null. */
  nextAt: number | null
  nextLabel: string | null
}

export function rankFromRp(rpRaw: number): Rank {
  const rp = Math.max(0, Math.round(rpRaw))
  if (rp >= KOR_RP) {
    const t = TIERS[TIERS.length - 1]
    return {
      rp,
      tier: TIERS.length - 1,
      division: 0,
      tierName: t.name,
      label: t.name,
      color: t.color,
      progress: 1,
      nextAt: null,
      nextLabel: null,
    }
  }
  const tier = Math.floor(rp / RP_PER_TIER)
  const division = Math.floor((rp % RP_PER_TIER) / RP_PER_DIVISION)
  const t = TIERS[tier]
  const nextAt = (Math.floor(rp / RP_PER_DIVISION) + 1) * RP_PER_DIVISION
  return {
    rp,
    tier,
    division,
    tierName: t.name,
    label: `${t.name} ${ROMAN[division]}`,
    color: t.color,
    progress: (rp % RP_PER_DIVISION) / RP_PER_DIVISION,
    nextAt,
    nextLabel: rankFromRp(nextAt).label,
  }
}

export function e1rm(kg: number, reps: number): number {
  if (reps <= 0 || kg <= 0) return 0
  if (reps === 1) return kg
  return kg * (1 + reps / 30)
}

/** Kadınlarda standartlar: üst vücut ×0,60, alt vücut ×0,75. */
const LOWER: MuscleId[] = ['quads', 'posterior', 'calves']
export function sexFactor(ex: Exercise, sex: Profile['sex']): number {
  if (sex === 'm') return 1
  return LOWER.includes(ex.muscle) ? 0.75 : 0.6
}

/** Bir setin kaldırılan toplam yükü (vücut ağırlığı hareketlerinde VA + ek kilo). */
export function setLoad(ex: Exercise, kg: number, bodyweight: number): number {
  return ex.load === 'bodyweight' ? bodyweight + kg : kg
}

/** Bir setin RP değeri. Standardı olmayan hareket veya geçersiz set için null. */
export function setRp(
  ex: Exercise,
  kg: number,
  reps: number,
  bodyweight: number,
  sex: Profile['sex'],
): number | null {
  if (!ex.std || reps < 1 || reps > MAX_RANK_REPS || bodyweight <= 0) return null
  const load = setLoad(ex, kg, bodyweight)
  if (load <= 0) return null
  const ratio = e1rm(load, reps) / bodyweight
  const f = sexFactor(ex, sex) * RANK_EASE
  const start = ex.std.start * f
  const elite = ex.std.elite * f
  const score = Math.max(0, (ratio - start) / (elite - start))
  return Math.round(Math.pow(score, RANK_CURVE) * KOR_RP)
}

/** Verilen RP için gereken 1TM (kg). Vücut ağırlığı hareketinde eklenecek kilo döner. */
export function kgForRp(
  ex: Exercise,
  rp: number,
  bodyweight: number,
  sex: Profile['sex'],
): number | null {
  if (!ex.std) return null
  const f = sexFactor(ex, sex) * RANK_EASE
  const start = ex.std.start * f
  const elite = ex.std.elite * f
  const ratio = start + Math.pow(Math.max(0, rp) / KOR_RP, 1 / RANK_CURVE) * (elite - start)
  const load = ratio * bodyweight
  return ex.load === 'bodyweight' ? load - bodyweight : load
}

export function plateStep(ex: Exercise): number {
  if (ex.equipment === 'dumbbell') return 1
    return 2.5
}

/** Hedef 1TM'e `reps` tekrarla ulaşmak için gereken kilo, yukarı yuvarlanmış. */
export function kgAtReps(ex: Exercise, target1rm: number, reps: number, bodyweight: number): number {
  // Seçili birimde gerçek plaka adımına yuvarlanır (2,5 kg ya da 5 lb).
  const step = plateStepKg(ex.equipment === 'dumbbell')
  const total = ex.load === 'bodyweight' ? target1rm + bodyweight : target1rm
  const perRep = reps === 1 ? total : total / (1 + reps / 30)
  const kg = ex.load === 'bodyweight' ? perRep - bodyweight : perRep
  return Math.ceil(kg / step - 1e-9) * step
}

export interface BestLift {
  exerciseId: string
  rp: number
  kg: number
  reps: number
  at: number
  bodyweight: number
  workoutId: string
}

/** Her hareket için en yüksek RP'yi veren set. */
export function bestLifts(
  workouts: Workout[],
  sex: Profile['sex'],
  custom: Exercise[] = [],
): Map<string, BestLift> {
  const best = new Map<string, BestLift>()
  for (const w of workouts) {
    for (const we of w.exercises) {
      const ex = findExercise(we.exerciseId, custom)
      if (!ex.std) continue
      for (const s of we.sets) {
        if (!s.done || s.warmup || s.kg == null || s.reps == null) continue
        const rp = setRp(ex, s.kg, s.reps, w.bodyweight, sex)
        if (rp == null) continue
        const cur = best.get(ex.id)
        if (!cur || rp > cur.rp) {
          best.set(ex.id, {
            exerciseId: ex.id,
            rp,
            kg: s.kg,
            reps: s.reps,
            at: w.endedAt,
            bodyweight: w.bodyweight,
            workoutId: w.id,
          })
        }
      }
    }
  }
  return best
}

export interface MuscleRank {
  muscle: MuscleId
  rank: Rank | null
  lift: BestLift | null
}

export interface RankBoard {
  muscles: MuscleRank[]
  rankedCount: number
  /** En az PLACEMENT_GROUPS grup sıralanınca dolar. */
  overall: Rank | null
  lifts: Map<string, BestLift>
}

export function rankBoard(
  workouts: Workout[],
  sex: Profile['sex'],
  custom: Exercise[] = [],
): RankBoard {
  const lifts = bestLifts(workouts, sex, custom)
  const top = new Map<MuscleId, BestLift>()
  for (const lift of lifts.values()) {
    const m = findExercise(lift.exerciseId, custom).muscle
    const cur = top.get(m)
    if (!cur || lift.rp > cur.rp) top.set(m, lift)
  }
  const muscles: MuscleRank[] = RANKED_MUSCLES.map((muscle) => {
    const lift = top.get(muscle) ?? null
    return { muscle, lift, rank: lift ? rankFromRp(lift.rp) : null }
  })
  const ranked = muscles.filter((m) => m.rank)
  const overall =
    ranked.length >= PLACEMENT_GROUPS
      ? rankFromRp(ranked.reduce((a, m) => a + m.rank!.rp, 0) / ranked.length)
      : null
  return { muscles, rankedCount: ranked.length, overall, lifts }
}

export interface PersonalRank {
  rank: Rank
  firstE1rm: number
  bestE1rm: number
  bestSet: { kg: number; reps: number }
}

/**
 * Ortak standardı olmayan hareketler için kişisel rank: kişinin kendi ilerlemesine
 * dayanır. İlk çalışma setinin tahmini 1TM'sine göre en iyinin oranı; ikiye katlamak
 * Kor eşiğine çıkarır. Tek set / ilerleme yoksa merdivenin dibindedir ve PR'larla yükselir.
 */
export function personalRank(workouts: Workout[], exId: string): PersonalRank | null {
  let firstE1rm = 0
  let firstAt = Infinity
  let bestE1rm = 0
  let bestSet: { kg: number; reps: number } | null = null
  for (const w of workouts) {
    for (const we of w.exercises) {
      if (we.exerciseId !== exId) continue
      for (const s of we.sets) {
        if (!s.done || s.warmup || s.kg == null || s.reps == null) continue
        if (s.reps < 1 || s.reps > MAX_RANK_REPS) continue
        const v = e1rm(s.kg, s.reps)
        if (v <= 0) continue
        if (w.endedAt < firstAt || (w.endedAt === firstAt && v > firstE1rm)) {
          firstAt = w.endedAt
          firstE1rm = v
        }
        if (v > bestE1rm) {
          bestE1rm = v
          bestSet = { kg: s.kg, reps: s.reps }
        }
      }
    }
  }
  if (!bestSet || firstE1rm <= 0) return null
  const improve = Math.max(0, bestE1rm / firstE1rm - 1)
  const score = Math.min(1, improve)
  const rp = Math.round(Math.pow(score, RANK_CURVE) * KOR_RP)
  return { rank: rankFromRp(rp), firstE1rm, bestE1rm, bestSet }
}

