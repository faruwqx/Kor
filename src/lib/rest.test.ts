import { describe, expect, it } from 'vitest'
import { BUILTIN, findExercise } from './exercises'
import {
  DEFAULT_REST_SEC,
  MIN_REST_SEC,
  digitsToSec,
  digitsToText,
  restView,
  secToDigits,
  shiftRestEnd,
} from './rest'
import { bestSeconds, exerciseSessions, volumePRs, workoutPRs, workoutVolume } from './stats'
import type { Workout } from './types'

describe('dinlenme sayacı', () => {
  const t0 = 1_000_000
  const end = t0 + DEFAULT_REST_SEC * 1000

  it('varsayılan hedef 1 dakika 30 saniye', () => {
    expect(DEFAULT_REST_SEC).toBe(90)
  })

  it('hedef dolmadan yukarı sayar', () => {
    const v = restView(t0, end, t0 + 30_000)
    expect(v).toMatchObject({ elapsed: 30, target: 90, over: false })
    expect(v.progress).toBeCloseTo(1 / 3)
  })

  it('hedef dolunca "doldu" olur ve saymayı sürdürür', () => {
    expect(restView(t0, end, end).over).toBe(true)
    const late = restView(t0, end, t0 + 200_000)
    expect(late).toMatchObject({ elapsed: 200, over: true, progress: 1 })
  })

  it('hedef kaydırılır ama başlangıca alt sınırdan fazla yaklaşmaz', () => {
    expect(shiftRestEnd(t0, end, 15)).toBe(end + 15_000)
    expect(shiftRestEnd(t0, end, -600)).toBe(t0 + MIN_REST_SEC * 1000)
  })
})

describe('süre alanı', () => {
  it('son iki hane saniyedir', () => {
    expect(digitsToSec('430')).toBe(270)
    expect(digitsToSec('45')).toBe(45)
    expect(digitsToSec('1000')).toBe(600)
    expect(digitsToSec('')).toBeNull()
    expect(digitsToSec('0')).toBeNull()
  })

  it('saniyeden rakama ve metne çevirir', () => {
    expect(secToDigits(270)).toBe('430')
    expect(digitsToText(secToDigits(270))).toBe('4:30')
    expect(digitsToText(secToDigits(45))).toBe('0:45')
    expect(digitsToSec(secToDigits(754))).toBe(754)
  })
})

describe('hareket kütüphanesi', () => {
  it('kimlikler ve adlar benzersiz', () => {
    expect(new Set(BUILTIN.map((e) => e.id)).size).toBe(BUILTIN.length)
    expect(new Set(BUILTIN.map((e) => e.name)).size).toBe(BUILTIN.length)
  })

  it('en az 550 hareket var; varyasyonlar ana hareketin kasını ve ölçekli standardını taşır', () => {
    expect(BUILTIN.length).toBeGreaterThanOrEqual(550)
    expect(findExercise('bench-v-paused')).toMatchObject({
      name: 'Bench press (duraklamalı)',
      muscle: 'chest',
      equipment: 'barbell',
      std: { start: 0.315, elite: 1.8 },
    })
    // Bantlı ve patlayıcı varyasyonlarda yük ölçülemez: rank dışı.
    expect(findExercise('bench-v-band').std).toBeUndefined()
    expect(findExercise('bench-v-explosive').std).toBeUndefined()
    // Rank'e sayılan hareket sayısı yüzlerce.
    expect(BUILTIN.filter((e) => e.std).length).toBeGreaterThan(250)
    expect(findExercise('row-v-smith')).toMatchObject({ name: 'Row (Smith)', equipment: 'machine' })
    expect(findExercise('db-bench-v-kb').name).toBe('Bench press (kettlebell)')
    // Ana hareketler listenin başında kalır.
    expect(BUILTIN[0].id).toBe('bench')
  })

  it('plank ve kardiyoda uzun süre daha iyidir', () => {
    expect(findExercise('plank')).toMatchObject({ timed: true, longer: true })
    expect(findExercise('cycling')).toMatchObject({ muscle: 'cardio', timed: true, longer: true })
    const sets = [
      { kg: 0, reps: 1, done: true, sec: 60 },
      { kg: 0, reps: 1, done: true, sec: 95 },
    ]
    expect(bestSeconds(sets, true)).toBe(95)
    expect(bestSeconds(sets)).toBe(60)
  })

  it('tek dambılla yapılan harekette kilo iki elle çarpılmaz', () => {
    expect(findExercise('goblet-squat').perHand).toBeUndefined()
    expect(findExercise('arnold-press').perHand).toBe(true)
  })
})

describe('hacim rekoru', () => {
  const lift = (id: string, at: number, sets: [number, number][]): Workout => ({
    id,
    name: 'Göğüs',
    startedAt: at - 1000,
    endedAt: at,
    bodyweight: 80,
    exercises: [
      { uid: id, exerciseId: 'bench', sets: sets.map(([kg, reps]) => ({ kg, reps, done: true })) },
    ],
  })

  it('ilk antrenman rekor sayılmaz; öncekini geçen toplam ve hareket hacmi rekordur', () => {
    const a = lift('a', 1000, [[60, 10]])
    const b = lift('b', 2000, [[60, 10], [60, 8]])
    const c = lift('c', 3000, [[60, 5]])
    expect(volumePRs(a, [a, b, c])).toEqual([])
    expect(volumePRs(b, [a, b, c])).toEqual([
      { exerciseId: null, value: 1080, previous: 600 },
      { exerciseId: 'bench', value: 1080, previous: 600 },
    ])
    expect(volumePRs(c, [a, b, c])).toEqual([])
  })
})

describe('Hyrox hareketleri', () => {
  const hyrox = BUILTIN.filter((e) => e.muscle === 'hyrox')

  it('sekiz istasyon ve koşu var, hepsi süreli ve rank dışı', () => {
    expect(hyrox).toHaveLength(9)
    for (const e of hyrox) {
      expect(e.timed).toBe(true)
      expect(e.target).toBeTruthy()
      expect(e.std).toBeUndefined()
    }
    expect(findExercise('hyrox-skierg').target).toBe('1000 m')
  })

  const workout = (id: string, at: number, sec: number): Workout => ({
    id,
    name: 'Hyrox',
    startedAt: at - 1000,
    endedAt: at,
    bodyweight: 80,
    exercises: [
      {
        uid: id,
        exerciseId: 'hyrox-sled-push',
        sets: [{ kg: 100, reps: 1, done: true, sec }],
      },
    ],
  })

  it('süreli setler hacme ve kilo rekoruna katılmaz, en iyi süre tutulur', () => {
    const a = workout('a', 1000, 150)
    const b = workout('b', 2000, 140)
    expect(workoutVolume(a)).toBe(0)
    expect(workoutPRs(b, [a, b])).toEqual([])
    expect(exerciseSessions('hyrox-sled-push', [a, b]).map((x) => x.bestSec)).toEqual([150, 140])
    expect(bestSeconds(b.exercises[0].sets)).toBe(140)
  })
})
