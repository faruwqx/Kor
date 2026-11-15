import { describe, expect, it } from 'vitest'
import { demoState } from './demo'
import { RANKED_MUSCLES, findExercise } from './exercises'
import { weekStart } from './format'
import { KOR_RP, e1rm, kgAtReps, kgForRp, personalRank, rankBoard, rankFromRp, setRp } from './rank'
import { streak, workoutPRs, workoutVolume } from './stats'
import type { Workout } from './types'

const bench = findExercise('bench')
const pullup = findExercise('pullup')
const squat = findExercise('squat')

describe('rankFromRp', () => {
  it('dipte Kömür III, her 100 RP bir basamak', () => {
    expect(rankFromRp(0).label).toBe('Kömür III')
    expect(rankFromRp(99).label).toBe('Kömür III')
    expect(rankFromRp(100).label).toBe('Kömür II')
    expect(rankFromRp(299).label).toBe('Kömür I')
    expect(rankFromRp(300).label).toBe('Demir III')
    expect(rankFromRp(1250).label).toBe('Altın III')
  })
  it('ilerleme ve bir sonraki basamak', () => {
    const r = rankFromRp(1250)
    expect(r.progress).toBeCloseTo(0.5)
    expect(r.nextAt).toBe(1300)
    expect(r.nextLabel).toBe('Altın II')
    expect(rankFromRp(2099).nextLabel).toBe('Kor')
  })
  it('2100 RP ve üstü Kor, basamaksız', () => {
    const r = rankFromRp(KOR_RP)
    expect(r.label).toBe('Kor')
    expect(r.nextAt).toBeNull()
    expect(rankFromRp(2600).label).toBe('Kor')
  })
})

describe('setRp', () => {
  it('Epley: tek tekrar kilonun kendisi', () => {
    expect(e1rm(100, 1)).toBe(100)
    expect(e1rm(100, 6)).toBeCloseTo(120)
  })
  it('vücut ağırlığının 1,3 katı bench Kor eşiğidir (standart 2,0 × 0,65 kolaylık)', () => {
    expect(setRp(bench, 104, 1, 80, 'm')).toBe(KOR_RP)
    expect(setRp(bench, 103, 1, 80, 'm')!).toBeLessThan(KOR_RP)
  })
  it('aynı kilo, daha hafif sporcuda daha yüksek RP', () => {
    expect(setRp(bench, 100, 5, 70, 'm')!).toBeGreaterThan(setRp(bench, 100, 5, 90, 'm')!)
  })
  it('kadın standardı daha düşük eşik kullanır', () => {
    expect(setRp(bench, 60, 5, 60, 'f')!).toBeGreaterThan(setRp(bench, 60, 5, 60, 'm')!)
  })
  it('12 tekrarın üstü ve standartsız hareket sayılmaz', () => {
    expect(setRp(bench, 60, 15, 80, 'm')).toBeNull()
    expect(setRp(findExercise('cable-fly'), 60, 8, 80, 'm')).toBeNull()
  })
  it('barfikste yük vücut ağırlığı + ek kilodur', () => {
    const plain = setRp(pullup, 0, 8, 80, 'm')!
    const weighted = setRp(pullup, 20, 8, 80, 'm')!
    expect(plain).toBeGreaterThan(0)
    expect(weighted).toBeGreaterThan(plain)
  })
  it('dibin altı 0 RP, eksiye düşmez', () => {
    expect(setRp(squat, 20, 5, 80, 'm')).toBe(0)
  })
})

describe('hedef kilo', () => {
  it('kgForRp, setRp ile tutarlı', () => {
    const kg = kgForRp(bench, 1200, 80, 'm')!
    expect(setRp(bench, kg, 1, 80, 'm')).toBe(1200)
  })
  it('önerilen kilo hedef basamağa gerçekten ulaşır', () => {
    for (const ex of [bench, pullup, squat]) {
      for (const reps of [1, 3, 5, 8]) {
        const target = kgForRp(ex, 1300, 80, 'm')!
        const kg = kgAtReps(ex, target, reps, 80)
        expect(setRp(ex, kg, reps, 80, 'm')!).toBeGreaterThanOrEqual(1300)
      }
    }
  })
})

function w(id: string, at: number, sets: [string, number, number][], bodyweight = 80): Workout {
  return {
    id,
    name: id,
    startedAt: at - 3600_000,
    endedAt: at,
    bodyweight,
    exercises: sets.map(([exerciseId, kg, reps], i) => ({
      uid: id + i,
      exerciseId,
      sets: [{ kg, reps, done: true }],
    })),
  }
}

describe('rankBoard', () => {
  const day = 86_400_000
  it('hiç sıralanmış grup yoksa genel rank yok', () => {
    const board = rankBoard([], 'm')
    expect(board.rankedCount).toBe(0)
    expect(board.overall).toBeNull()
  })
  it('bir grup bile sıralanınca genel rank var', () => {
    const board = rankBoard([w('a', day, [['bench', 100, 5]])], 'm')
    expect(board.rankedCount).toBe(1)
    const sum = board.muscles.filter((m) => m.rank).reduce((a, m) => a + m.rank!.rp, 0)
    expect(board.overall!.rp).toBe(Math.round(sum / RANKED_MUSCLES.length))
  })
  it('genel rank tüm sıralanabilir grupların (0 dahil) ortalamasıdır', () => {
    const board = rankBoard(
      [w('a', day, [['bench', 100, 5], ['row', 80, 5], ['squat', 120, 5], ['ohp', 60, 5]])],
      'm',
    )
    const sum = board.muscles.filter((m) => m.rank).reduce((a, m) => a + m.rank!.rp, 0)
    expect(board.overall!.rp).toBe(Math.round(sum / RANKED_MUSCLES.length))
  })
  it('daha fazla grup eklenince genel rank yükselir', () => {
    const one = rankBoard([w('a', day, [['bench', 100, 5]])], 'm')
    const two = rankBoard([w('a', day, [['bench', 100, 5], ['squat', 120, 5]])], 'm')
    expect(two.overall!.rp).toBeGreaterThan(one.overall!.rp)
  })
  it('kas grubunu en yüksek RP veren hareket taşır', () => {
    const board = rankBoard([w('a', day, [['bench', 60, 5], ['dips', 40, 5]])], 'm')
    expect(board.muscles.find((m) => m.muscle === 'chest')!.lift!.exerciseId).toBe('dips')
  })
})

describe('rekorlar ve seri', () => {
  const day = 86_400_000
  it('ilk kez yapılan hareket rekor değildir, sonraki artış rekordur', () => {
    const a = w('a', 10 * day, [['bench', 100, 5]])
    const b = w('b', 12 * day, [['bench', 102.5, 5]])
    expect(workoutPRs(a, [a, b])).toHaveLength(0)
    const prs = workoutPRs(b, [a, b])
    expect(prs).toHaveLength(1)
    expect(prs[0].kind).toBe('kg')
    expect(prs[0].previous).toBe(100)
  })
  it('aynı kiloda daha çok tekrar 1TM rekorudur', () => {
    const a = w('a', 10 * day, [['bench', 100, 5]])
    const b = w('b', 12 * day, [['bench', 100, 7]])
    expect(workoutPRs(b, [a, b])[0].kind).toBe('e1rm')
  })
  it('hacim: dambılda iki el sayılır', () => {
    expect(workoutVolume(w('a', day, [['db-curl', 10, 10]]))).toBe(200)
    expect(workoutVolume(w('a', day, [['bench', 100, 5]]))).toBe(500)
  })
  it('seri: hedefi tutan ardışık haftalar, bu hafta tutmadıysa kırılmaz', () => {
    const now = new Date(2026, 10, 12, 12).getTime() // perşembe
    const cur = weekStart(now)
    const mk = (weeksAgo: number, n: number) =>
      Array.from({ length: n }, (_, i) =>
        w(`w${weeksAgo}-${i}`, cur - weeksAgo * 7 * day + (i + 1) * day, [['bench', 100, 5]]),
      )
    const s = streak([...mk(3, 1), ...mk(2, 3), ...mk(1, 3), ...mk(0, 1)], 3, now)
    expect(s.weeks).toBe(2)
    expect(s.thisWeek).toBe(1)
    expect(s.days.filter(Boolean)).toHaveLength(1)
  })
})

describe('örnek veri', () => {
  it('tutarlı ve sıralı', () => {
    const now = new Date(2026, 10, 12, 9).getTime()
    const s = demoState(now)
    expect(s.workouts.length).toBeGreaterThan(30)
    for (let i = 1; i < s.workouts.length; i++)
      expect(s.workouts[i].endedAt).toBeGreaterThan(s.workouts[i - 1].endedAt)
    const board = rankBoard(s.workouts, 'm')
    expect(board.rankedCount).toBe(7)
    expect(board.overall).not.toBeNull()
    const st = streak(s.workouts, 3, now)
    console.log(
      `demo: ${s.workouts.length} antrenman, genel ${board.overall!.label} ${board.overall!.rp} RP, seri ${st.weeks}, haftalar ${st.history.map((h) => h.count).join(',')}`,
    )
    for (const m of board.muscles)
      console.log(` ${m.muscle}: ${m.rank?.label} ${m.rank?.rp} (${m.lift?.exerciseId} ${m.lift?.kg}x${m.lift?.reps})`)
  })
})

describe('personalRank', () => {
  const mk = (exId: string, rows: [number, number, number][]): Workout[] =>
    rows.map(([kg, reps, at], i) => ({
      id: 'w' + i,
      name: 'x',
      startedAt: at,
      endedAt: at,
      bodyweight: 80,
      exercises: [{ exerciseId: exId, sets: [{ done: true, kg, reps }] }],
    })) as unknown as Workout[]

  it('ilerleme arttıkça kişisel rp yükselir, tek set dipten başlar', () => {
    const low = personalRank(mk('cx', [[50, 5, 1]]), 'cx')!
    const high = personalRank(mk('cx', [[50, 5, 1], [100, 5, 2]]), 'cx')!
    expect(low.rank.rp).toBe(0)
    expect(high.rank.rp).toBeGreaterThan(low.rank.rp)
  })

  it('e1rm iki katına çıkınca Kor eşiğine ulaşır', () => {
    const pr = personalRank(mk('cx', [[50, 1, 1], [100, 1, 2]]), 'cx')!
    expect(pr.rank.rp).toBe(KOR_RP)
  })

  it('veri yoksa null döner', () => {
    expect(personalRank([], 'cx')).toBeNull()
  })
})
