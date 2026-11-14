/**
 * Kurulum cevaplarından kişisel başlangıç planı. Ekrandaki her sayı buradan, kullanıcının
 * kendi cevaplarından hesaplanır; hazır ya da uydurma değer yoktur.
 */
import { BUILTIN } from './exercises'
import { PRESET_ROUTINES } from './presets'
import { KOR_RP, RP_PER_TIER, e1rm, kgAtReps, kgForRp, rankFromRp, setRp, type Rank } from './rank'
import type { Exercise, Profile } from './types'

export type Experience = NonNullable<Profile['experience']>
export type Goal = NonNullable<Profile['goal']>
export type Focus = NonNullable<Profile['focus']>
export type Obstacle = NonNullable<Profile['obstacle']>

export interface Answers {
  sex: Profile['sex']
  experience: Experience
  /** Haftada antrenman günü, 1-7. */
  days: number
  bodyweight: number
  goal: Goal
  focus: Focus
  obstacle: Obstacle
  /** Odak hareketinde bildirilen en iyi set; bilinmiyorsa yok. */
  lift?: { kg: number; reps: number }
}

export interface Plan {
  /** Haftanın program sırası (hazır program kimlikleri). */
  split: string[]
  splitNames: string[]
  /** İlk antrenman için önerilen program. */
  startId: string
  startName: string
  /** Rank hedefinin ölçüldüğü hareket. */
  exercise: Exercise
  /** Bildirilen setten hesaplanan şimdiki rank; set girilmediyse null. */
  current: Rank | null
  target: Rank
  /** Hedefe ulaştıran set. */
  targetKg: number
  targetReps: number
  tip: string
}

const FOCUS_LIFT: Record<Focus, string> = {
  chest: 'bench',
  back: 'row',
  legs: 'squat',
  shoulders: 'ohp',
  arms: 'curl',
  balanced: 'squat',
}

const FOCUS_START: Record<Focus, string | null> = {
  chest: 'preset-push',
  shoulders: 'preset-push',
  back: 'preset-pull',
  legs: 'preset-legs',
  arms: 'preset-upper',
  balanced: null,
}

/** Set girmeyenler için ilk hedef: deneyime göre bir kademe eşiği. */
const START_TARGET: Record<Experience, number> = {
  new: RP_PER_TIER, // Demir III
  mid: RP_PER_TIER * 2, // Bronz III
  adv: RP_PER_TIER * 3, // Gümüş III
}

/** İlk hedefin RP eşiği: set girildiyse bir sonraki kademe, girilmediyse deneyime göre. */
export function targetRpFor(rp: number | null, experience: Experience): number {
  return rp != null
    ? Math.min(KOR_RP, (Math.floor(rp / RP_PER_TIER) + 1) * RP_PER_TIER)
    : START_TARGET[experience]
}

export function liftFor(focus: Focus): Exercise {
  return BUILTIN.find((e) => e.id === FOCUS_LIFT[focus]) ?? BUILTIN.find((e) => e.id === 'bench')!
}

export function splitFor(days: number): string[] {
  if (days <= 2) return ['preset-upper', 'preset-legs']
  if (days === 3) return ['preset-push', 'preset-pull', 'preset-legs']
  return ['preset-push', 'preset-pull', 'preset-legs', 'preset-upper']
}

const routineName = (id: string) => PRESET_ROUTINES.find((r) => r.id === id)?.name ?? id

function tipFor(a: Answers): string {
  switch (a.obstacle) {
    case 'consistency':
      return `Haftalık hedefin ${a.days} gün. Hedefi tutturduğun her hafta serine eklenir.`
    case 'knowhow':
      return 'Programın hazır geliyor. Her harekette yapılış kareleri ve çalışan bölgeler var.'
    case 'time':
      return 'Her program beş hareket. Dinlenme süresini sayaç tutar, sen sete bakarsın.'
    case 'motivation':
      return 'Her rekor rank puanına yazılır. Terfini antrenman bitince görürsün.'
  }
}

export function buildPlan(a: Answers): Plan {
  const exercise = liftFor(a.focus)
  const split = splitFor(a.days)
  const preferred = FOCUS_START[a.focus]
  const startId = preferred && split.includes(preferred) ? preferred : split[0]

  const rp = a.lift ? setRp(exercise, a.lift.kg, a.lift.reps, a.bodyweight, a.sex) : null
  const current = rp != null ? rankFromRp(rp) : null
  const targetRp = targetRpFor(rp, a.experience)
  const targetReps = a.goal === 'strength' || a.goal === 'rank' ? 5 : 8
  const need = kgForRp(exercise, targetRp, a.bodyweight, a.sex) ?? 0

  return {
    split,
    splitNames: split.map(routineName),
    startId,
    startName: routineName(startId),
    exercise,
    current,
    target: rankFromRp(targetRp),
    targetKg: Math.max(0, kgAtReps(exercise, need, targetReps, a.bodyweight)),
    targetReps,
    tip: tipFor(a),
  }
}

/**
 * Haftalık tahmini 1TM artışı. Yeni başlayan hızlı, deneyimli yavaş ilerler.
 * Bir söz değil, tahmin: gerçek hız kayıtlardan görünür.
 */
export const WEEKLY_GAIN: Record<Experience, number> = { new: 0.025, mid: 0.01, adv: 0.005 }
export const MAX_PROJECTION_WEEKS = 52

export interface Projection {
  /** Hedefe tahmini hafta; zaten hedefteyse 0. */
  weeks: number
  fromKg: number
  toKg: number
  /** Hafta hafta tahmini 1TM, 0. hafta bugün. */
  points: { week: number; kg: number }[]
}

/** Bugünkü tahmini 1TM'den hedef 1TM'e, haftalık sabit oranlı artışla tahmini yol. */
export function projectLift(fromKg: number, toKg: number, experience: Experience): Projection {
  const r = WEEKLY_GAIN[experience]
  const weeks =
    fromKg <= 0 || toKg <= fromKg
      ? 0
      : Math.min(MAX_PROJECTION_WEEKS, Math.ceil(Math.log(toKg / fromKg) / Math.log(1 + r) - 1e-9))
  const points = Array.from({ length: weeks + 1 }, (_, w) => ({
    week: w,
    kg: Math.min(Math.max(toKg, fromKg), fromKg * (1 + r) ** w),
  }))
  return { weeks, fromKg, toKg, points }
}

/** Plan için tahmini yol: girilen set varsa ondan, yoksa merdivenin dibinden başlar. */
export function projectPlan(a: Answers, plan: Plan): Projection {
  const from = a.lift
    ? e1rm(a.lift.kg, a.lift.reps)
    : Math.max(1, kgForRp(plan.exercise, 0, a.bodyweight, a.sex) ?? 1)
  return projectLift(from, e1rm(plan.targetKg, plan.targetReps), a.experience)
}
