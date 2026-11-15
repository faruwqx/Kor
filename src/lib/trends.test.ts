import { describe, expect, it } from 'vitest'
import { startOfDay } from './format'
import {
  LOAD_GROUPS,
  buckets,
  exerciseCounts,
  lastRegionPR,
  muscleLoad,
  rangeBuckets,
  spanDays,
  totals,
} from './trends'
import type { Workout } from './types'

const DAY = 86_400_000
// Çarşamba öğlen: gün ve hafta sınırlarından uzak.
const NOW = new Date(2026, 10, 11, 12).getTime()

const workout = (id: string, endedAt: number, exerciseId: string, reps: number[]): Workout => ({
  id,
  name: 'Test',
  startedAt: endedAt - 45 * 60000,
  endedAt,
  bodyweight: 80,
  exercises: [
    { uid: id, exerciseId, sets: reps.map((r) => ({ kg: 50, reps: r, done: true })) },
  ],
})

const ws = [
  workout('a', NOW - 2 * DAY, 'bench', [10, 8]),
  workout('b', NOW - 1 * DAY, 'curl', [12]),
  workout('c', NOW - 40 * DAY, 'squat', [5]),
]

describe('lastRegionPR', () => {
  it('bölgedeki en son rekoru döner', () => {
    const prws = [
      workout('p1', NOW - 5 * DAY, 'bench', [5]),
      workout('p2', NOW - 1 * DAY, 'bench', [10]),
    ]
    const pr = lastRegionPR(prws, [], 'chest')
    expect(pr).not.toBeNull()
    expect(pr!.exerciseId).toBe('bench')
    expect(pr!.reps).toBe(10)
    expect(pr!.at).toBe(NOW - 1 * DAY)
  })
  it('o bölgede hareket yoksa null', () => {
    const prws = [
      workout('p1', NOW - 5 * DAY, 'bench', [5]),
      workout('p2', NOW - 1 * DAY, 'bench', [10]),
    ]
    expect(lastRegionPR(prws, [], 'calves')).toBeNull()
  })
  it('tek kayıtta rekor yok (kıyas geçmişi yok)', () => {
    const one = [workout('p1', NOW - 1 * DAY, 'bench', [10])]
    expect(lastRegionPR(one, [], 'chest')).toBeNull()
  })
})

describe('trendler', () => {
  it('toplamlar: süre, set, tekrar ve hacim', () => {
    expect(totals(ws.slice(0, 2))).toEqual({
      workouts: 2,
      minutes: 90,
      sets: 3,
      reps: 30,
      volume: 50 * 30,
    })
  })

  it('7 günde gün gün, 90 günde hafta hafta dilimler', () => {
    const week = buckets(ws, [], 7, NOW)
    expect(week).toHaveLength(7)
    expect(week.map((b) => b.workouts)).toEqual([0, 0, 0, 0, 1, 1, 0])
    const quarter = buckets(ws, [], 90, NOW)
    expect(quarter).toHaveLength(13)
    expect(quarter.reduce((a, b) => a + b.workouts, 0)).toBe(3)
  })

  it('özel aralık: iki uç dahil; kısa aralık gün gün, uzunu hafta hafta', () => {
    const day = (n: number) => startOfDay(NOW - n * DAY)
    const short = rangeBuckets(ws, [], day(3), day(1))
    expect(short).toHaveLength(3)
    expect(short.reduce((a, b) => a + b.workouts, 0)).toBe(2)
    const long = rangeBuckets(ws, [], day(60), day(0))
    expect(long.length).toBeLessThan(12)
    expect(long[0].start).toBe(day(60))
    expect(long.reduce((a, b) => a + b.workouts, 0)).toBe(3)
    expect(spanDays(day(6), day(0))).toBe(7)
  })

  it('kas dağılımı biceps ve triceps i kolda, bacakları tek eksende toplar', () => {
    const load = muscleLoad(ws)
    const at = (id: string) => load[LOAD_GROUPS.findIndex((g) => g.id === id)]
    expect(at('chest')).toMatchObject({ reps: 18, sets: 2 })
    expect(at('arms').reps).toBe(12)
    expect(at('legs').sets).toBe(1)
    expect(at('back').reps).toBe(0)
  })

  it('hareketler set sayısına göre sıralanır', () => {
    expect(exerciseCounts(ws)[0]).toEqual({ id: 'bench', sets: 2 })
  })
})
