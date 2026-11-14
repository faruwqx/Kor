import { describe, expect, it } from 'vitest'
import { buildPlan, liftFor, projectLift, splitFor, type Answers } from './onboarding'
import { RP_PER_TIER, e1rm, setRp } from './rank'

const base: Answers = {
  sex: 'm',
  experience: 'new',
  days: 3,
  bodyweight: 80,
  goal: 'strength',
  focus: 'chest',
  obstacle: 'consistency',
}

describe('splitFor', () => {
  it('gün sayısına göre program sırası', () => {
    expect(splitFor(1)).toEqual(['preset-upper', 'preset-legs'])
    expect(splitFor(3)).toEqual(['preset-push', 'preset-pull', 'preset-legs'])
    expect(splitFor(6)).toHaveLength(4)
  })
})

describe('buildPlan', () => {
  it('odak bölgeye göre hareket ve ilk program seçer', () => {
    expect(buildPlan(base).exercise.id).toBe('bench')
    expect(buildPlan(base).startId).toBe('preset-push')
    expect(buildPlan({ ...base, focus: 'legs' }).exercise.id).toBe('squat')
    expect(buildPlan({ ...base, focus: 'legs' }).startId).toBe('preset-legs')
    expect(buildPlan({ ...base, focus: 'back' }).startId).toBe('preset-pull')
  })

  it('önerilen program haftanın sırasında yoksa sıradaki ilk programı verir', () => {
    const p = buildPlan({ ...base, days: 2, focus: 'chest' })
    expect(p.split).not.toContain('preset-push')
    expect(p.startId).toBe(p.split[0])
  })

  it('set girilmediyse hedef deneyime göre kademe eşiğidir', () => {
    expect(buildPlan(base).current).toBeNull()
    expect(buildPlan(base).target.label).toBe('Demir III')
    expect(buildPlan({ ...base, experience: 'mid' }).target.label).toBe('Bronz III')
    expect(buildPlan({ ...base, experience: 'adv' }).target.label).toBe('Gümüş III')
  })

  it('hedef set gerçekten hedef rank puanına ulaştırır', () => {
    for (const a of [base, { ...base, sex: 'f' as const, bodyweight: 60, focus: 'legs' as const, goal: 'muscle' as const }]) {
      const p = buildPlan(a)
      const rp = setRp(p.exercise, p.targetKg, p.targetReps, a.bodyweight, a.sex)!
      expect(rp).toBeGreaterThanOrEqual(p.target.rp)
      // Bir alt plaka adımı hedefin altında kalır: gereğinden ağır önerilmiyor.
      const below = setRp(p.exercise, p.targetKg - 2.5, p.targetReps, a.bodyweight, a.sex)!
      expect(below).toBeLessThan(p.target.rp)
    }
  })

  it('set girildiyse şimdiki rank hesaplanır ve hedef bir üst kademedir', () => {
    const p = buildPlan({ ...base, lift: { kg: 80, reps: 5 } })
    const rp = setRp(liftFor('chest'), 80, 5, 80, 'm')!
    expect(p.current?.rp).toBe(rp)
    expect(p.target.rp).toBe((Math.floor(rp / RP_PER_TIER) + 1) * RP_PER_TIER)
    expect(p.target.rp).toBeGreaterThan(rp)
    expect(e1rm(p.targetKg, p.targetReps)).toBeGreaterThan(e1rm(80, 5))
  })

  it('güç ve rank hedefinde 5, diğerlerinde 8 tekrar önerir', () => {
    expect(buildPlan(base).targetReps).toBe(5)
    expect(buildPlan({ ...base, goal: 'rank' }).targetReps).toBe(5)
    expect(buildPlan({ ...base, goal: 'muscle' }).targetReps).toBe(8)
    expect(buildPlan({ ...base, goal: 'fit' }).targetReps).toBe(8)
  })

  it('ipucu seçilen engele göre değişir ve haftalık günü kullanır', () => {
    expect(buildPlan({ ...base, days: 4 }).tip).toContain('4 gün')
    const tips = (['consistency', 'knowhow', 'time', 'motivation'] as const).map(
      (obstacle) => buildPlan({ ...base, obstacle }).tip,
    )
    expect(new Set(tips).size).toBe(4)
  })
})

describe('tahmini yol', () => {
  it('yeni başlayan haftada %2,5 ilerler; hedefe varınca durur', () => {
    const p = projectLift(100, 110, 'new')
    expect(p.weeks).toBe(4)
    expect(p.points[0]).toEqual({ week: 0, kg: 100 })
    expect(p.points[p.points.length - 1].kg).toBeCloseTo(110)
    expect(projectLift(100, 110, 'adv').weeks).toBe(20)
  })

  it('zaten hedefteyse sıfır hafta; çok uzaksa bir yılla sınırlanır', () => {
    expect(projectLift(120, 110, 'mid').weeks).toBe(0)
    expect(projectLift(10, 1000, 'adv').weeks).toBe(52)
  })
})

