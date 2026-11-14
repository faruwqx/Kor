/**
 * Şınav rank'i: kuvvet rank'inden ayrı. Ölçü, 60 saniyede yapılan temiz şınav sayısıdır.
 * Kademeler aynı (Kömür → Kor), eğri aynı (RANK_CURVE): ilk kademeler çabuk açılır.
 */
import { KOR_RP, MAX_RP, RANK_CURVE, rankFromRp, type Rank } from './rank'
import type { Profile, PushupResult } from './types'

export const PUSH_SECONDS = 60
/** Hazırlık geri sayımı: telefona dokunup pozisyona geçme süresi. */
export const PUSH_COUNTDOWN = 8

/** Kor eşiği: bir dakikada temiz şınav. Kadınlarda üst vücut standardı (×0,6, bkz. sexFactor). */
export const KOR_REPS: Record<Profile['sex'], number> = { m: 52, f: 31 }

export function pushRp(reps: number, sex: Profile['sex']): number {
  if (reps <= 0) return 0
  return Math.min(MAX_RP, Math.round(Math.pow(reps / KOR_REPS[sex], RANK_CURVE) * KOR_RP))
}

/** Bir RP eşiği için gereken tekrar, yukarı yuvarlanmış. */
export function repsForRp(rp: number, sex: Profile['sex']): number {
  return Math.ceil(Math.pow(Math.max(0, rp) / KOR_RP, 1 / RANK_CURVE) * KOR_REPS[sex] - 1e-9)
}

export interface PushBoard {
  best: PushupResult | null
  rank: Rank | null
  /** Bir sonraki basamak için gereken tekrar; Kor'da null. */
  nextReps: number | null
  duels: { played: number; won: number }
}

export function pushBoard(results: PushupResult[] = [], sex: Profile['sex']): PushBoard {
  const best = results.reduce<PushupResult | null>((a, r) => (!a || r.reps > a.reps ? r : a), null)
  const rank = best ? rankFromRp(pushRp(best.reps, sex)) : null
  const duels = results.filter((r) => r.mode === 'duel' && r.opponentReps != null)
  return {
    best,
    rank,
    nextReps: rank?.nextAt != null ? repsForRp(rank.nextAt, sex) : best ? null : repsForRp(100, sex),
    duels: { played: duels.length, won: duels.filter((r) => r.reps > r.opponentReps!).length },
  }
}
