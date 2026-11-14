import { describe, expect, it } from 'vitest'
import {
  LB,
  buildImport,
  matchExercise,
  parseCsv,
  parseDate,
  parseDuration,
  parseImport,
  summarizeExercises,
  toCsv,
  type Mapping,
  type ParsedImport,
} from './importer'
import type { Workout } from './types'

const ok = (text: string) => {
  const p = parseImport(text)
  if ('error' in p) throw new Error(p.error)
  return p
}

const plan = (p: ParsedImport, unit: 'kg' | 'lb' = p.unit ?? 'kg', existing: Workout[] = []) => {
  const mapping: Mapping = {}
  for (const e of summarizeExercises(p)) mapping[e.name] = e.suggested ?? 'new'
  return buildImport(p, { unit, mapping, existing, custom: [], bodyweightAt: () => 80 })
}

const STRONG = `Date,Workout Name,Duration,Exercise Name,Set Order,Weight,Reps,Distance,Seconds,Notes,Workout Notes,RPE
2024-01-15 08:30:00,"Push Day",1h 5m,Bench Press (Barbell),W,95,10,0,0,,,
2024-01-15 08:30:00,"Push Day",1h 5m,Bench Press (Barbell),1,185,5,0,0,,,
2024-01-15 08:30:00,"Push Day",1h 5m,Bench Press (Barbell),2,185,5,0,0,,,
2024-01-15 08:30:00,"Push Day",1h 5m,Triceps Pushdown (Cable - Straight Bar),1,60,12,0,0,,,
2024-01-15 08:30:00,"Push Day",1h 5m,Rest Timer,R,0,0,0,90,,,
2024-01-17 18:00:00,"Legs",45m,Squat (Barbell),1,225,5,0,0,,,
2024-01-17 18:00:00,"Legs",45m,Zercher Squat,1,135,8,0,0,,,`

const HEVY = `"title","start_time","end_time","description","exercise_title","superset_id","exercise_notes","set_index","set_type","weight_kg","reps","distance_km","duration_seconds","rpe"
"Upper","15 Jan 2024, 08:30","15 Jan 2024, 09:40","","Pull Up","","","0","warmup","","5","","",""
"Upper","15 Jan 2024, 08:30","15 Jan 2024, 09:40","","Pull Up","","","1","normal","10","8","","",""
"Upper","15 Jan 2024, 08:30","15 Jan 2024, 09:40","","Lateral Raise (Dumbbell)","","","0","normal","12.5","15","","",""
"Upper","15 Jan 2024, 08:30","15 Jan 2024, 09:40","","Plank","","","0","normal","","","","60",""`

const FITNOTES = `Date,Exercise,Category,Weight (kgs),Reps,Distance,Distance Unit,Time,Comment
2024-02-01,Deadlift,Back,140.0,5,,,,
2024-02-01,Deadlift,Back,140.0,5,,,,
2024-02-01,Running,Cardio,,,5,km,0:25:00,`

const GENERIC_TR = `Tarih;Antrenman;Hareket;Kilo;Tekrar
05.03.2024;Göğüs;Bench press;80,5;8
05.03.2024;Göğüs;Lat pulldown;55;10`

describe('CSV okuyucu ve biçimler', () => {
  it('tırnak, çift tırnak, noktalı virgül ve BOM', () => {
    expect(parseCsv('﻿a,b\n"x, y","say ""hi"""\n')).toEqual([
      ['a', 'b'],
      ['x, y', 'say "hi"'],
    ])
    expect(parseCsv('a;b\n1;2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })

  it('tarih ve süre biçimleri', () => {
    expect(parseDate('2024-01-15 08:30:00')).toBe(new Date(2024, 0, 15, 8, 30).getTime())
    expect(parseDate('15 Jan 2024, 08:30')).toBe(new Date(2024, 0, 15, 8, 30).getTime())
    expect(parseDate('05.03.2024')).toBe(new Date(2024, 2, 5, 12).getTime())
    expect(parseDate('03/25/2024')).toBe(new Date(2024, 2, 25, 12).getTime())
    expect(parseDate('dün')).toBeNull()
    expect(parseDuration('1h 5m')).toBe(3900)
    expect(parseDuration('45m')).toBe(2700)
    expect(parseDuration('0:25:00')).toBe(1500)
  })
})

describe('Strong', () => {
  it('biçim tanınır, birim sorulur, lb kg ye çevrilir, dinlenme satırı atlanır', () => {
    const p = ok(STRONG)
    expect(p.format).toBe('strong')
    expect(p.unit).toBeNull()
    const r = plan(p, 'lb')
    expect(r.workouts).toHaveLength(2)
    const push = r.workouts[0]
    expect(push.name).toBe('Push Day')
    expect(push.endedAt - push.startedAt).toBe(3900_000)
    const bench = push.exercises.find((e) => e.exerciseId === 'bench')!
    expect(bench.sets).toHaveLength(3)
    expect(bench.sets[0].warmup).toBe(true)
    expect(bench.sets[1].kg).toBeCloseTo(185 * LB, 1)
    expect(push.exercises.map((e) => e.exerciseId)).toContain('pushdown')
    // Bilinmeyen hareket yeni özel hareket olur, kas grubu tahmin edilir.
    expect(r.newExercises).toHaveLength(1)
    expect(r.newExercises[0]).toMatchObject({ name: 'Zercher Squat', muscle: 'quads', custom: true })
  })
})

describe('Hevy', () => {
  it('kg sütunu, ısınma, bitiş saati, süreli hareket', () => {
    const p = ok(HEVY)
    expect(p.format).toBe('hevy')
    expect(p.unit).toBe('kg')
    const w = plan(p).workouts[0]
    expect(w.endedAt - w.startedAt).toBe(70 * 60_000)
    const pull = w.exercises.find((e) => e.exerciseId === 'pullup')!
    expect(pull.sets.map((s) => [s.kg, s.reps, !!s.warmup])).toEqual([
      [0, 5, true],
      [10, 8, false],
    ])
    expect(w.exercises.find((e) => e.exerciseId === 'lateral-raise')!.sets[0].kg).toBe(12.5)
    expect(w.exercises.find((e) => e.exerciseId === 'plank')!.sets[0].sec).toBe(60)
  })
})

describe('FitNotes ve genel tablo', () => {
  it('FitNotes: gün tek antrenman, kardiyo süresi', () => {
    const p = ok(FITNOTES)
    expect(p.format).toBe('fitnotes')
    expect(p.unit).toBe('kg')
    const r = plan(p)
    expect(r.workouts).toHaveLength(1)
    expect(r.workouts[0].exercises.find((e) => e.exerciseId === 'deadlift')!.sets).toHaveLength(2)
    expect(r.workouts[0].exercises.find((e) => e.exerciseId === 'run')!.sets[0].sec).toBe(1500)
  })

  it('Türkçe başlıklı, noktalı virgüllü tablo; Kor adlarıyla eşleşir', () => {
    const p = ok(GENERIC_TR)
    expect(p.format).toBe('generic')
    const r = plan(p)
    expect(r.workouts).toHaveLength(1)
    expect(r.workouts[0].name).toBe('Göğüs')
    expect(r.workouts[0].exercises.map((e) => e.exerciseId)).toEqual(['bench', 'lat-pulldown'])
    expect(r.workouts[0].exercises[0].sets[0].kg).toBe(80.5)
  })

  it('tanınmayan tablo anlaşılır hata verir', () => {
    expect(parseImport('a,b\n1,2')).toMatchObject({ error: expect.stringContaining('Sütunlar') })
    expect(parseImport('')).toMatchObject({ error: 'Dosya boş.' })
  })
})

describe('geçiş güvenliği', () => {
  it('aynı dosya ikinci kez aktarılınca antrenman çoğalmaz', () => {
    const p = ok(HEVY)
    const first = plan(p)
    const again = plan(p, 'kg', first.workouts)
    expect(again.workouts).toHaveLength(0)
    expect(again.duplicates).toBe(1)
  })

  it('Kor CSV dışa aktarımı geri okunur', () => {
    const r = plan(ok(GENERIC_TR))
    const csv = toCsv(r.workouts)
    const back = plan(ok(csv))
    expect(back.workouts).toHaveLength(1)
    expect(back.sets).toBe(r.sets)
    expect(back.workouts[0].exercises[0].sets[0].kg).toBe(80.5)
  })

  it('Kor JSON yedeği birleştirilir, var olan kimlik atlanır', () => {
    const w: Workout = {
      id: 'w1',
      name: 'A',
      startedAt: 1_700_000_000_000,
      endedAt: 1_700_003_600_000,
      bodyweight: 80,
      exercises: [{ uid: 'u', exerciseId: 'bench', sets: [{ kg: 60, reps: 5, done: true }] }],
    }
    const p = ok(JSON.stringify({ workouts: [w], customExercises: [] }))
    expect(p.format).toBe('kor-json')
    expect(plan(p).workouts).toHaveLength(1)
    expect(plan(p, 'kg', [w]).duplicates).toBe(1)
  })

  it('yaygın İngilizce adlar eşleşir', () => {
    expect(matchExercise('Deadlift (Barbell)')).toBe('deadlift')
    expect(matchExercise('Incline Bench Press (Dumbbell)')).toBe('db-incline')
    expect(matchExercise('Seated Leg Curl (Machine)')).toBe('seated-leg-curl')
    expect(matchExercise('Hip Thrust (Barbell)')).toBe('hip-thrust')
    expect(matchExercise('Tamamen Uydurma Hareket')).toBeNull()
  })

  it('bloklu antrenman dışa aktarımı (lbs) tanınır ve setleri okunur', () => {
    const tsv = [
      'Tuesday Afternoon Walk',
      'Workout Start\t2026-01-27 11:55:41',
      'Workout End\t2026-01-27 12:05:52',
      'Total Sets\t0',
      '',
      'All Sets',
      'Exercise\tWeight (lbs)\tReps\tTime (seconds)\tDistance (m)\tRest Time (seconds)\tEffort\tPrimary Muscle Groups\tNote',
      '',
      'Monday Night Upper Body',
      'Workout Start\t2026-02-16 00:23:03',
      'Workout End\t2026-02-16 00:59:29',
      'Total Sets\t3',
      '',
      'All Sets',
      'Exercise\tWeight (lbs)\tReps\tTime (seconds)\tDistance (m)\tRest Time (seconds)\tEffort\tPrimary Muscle Groups\tNote',
      'Dumbbell Hammer Curl\t11.02\t18\t46.04\t0\t0\t\tbiceps\t',
      'Push-Up\t0\t19\t42.04\t0\t158\t\tchest\t',
      'Plank\t0\t0\t30\t0\t119\t\tabs\t',
      '',
    ].join('\n')
    const p = parseImport(tsv)
    if ('error' in p) throw new Error('tanınmadı: ' + p.error)
    expect(p.format).toBe('blocks')
    expect(p.unit).toBe('lb')
    // Yürüyüşte set yok; yalnızca ikinci antrenmanın 3 seti okunur.
    expect(p.rows.length).toBe(3)
    expect(p.rows[0]).toMatchObject({ workout: 'Monday Night Upper Body', exercise: 'Dumbbell Hammer Curl', reps: 18 })
    // Plank: tekrar 0, süre 30 → süreli set.
    const plank = p.rows.find((r) => r.exercise === 'Plank')!
    expect(plank.reps).toBeNull()
    expect(plank.sec).toBe(30)
  })
})
