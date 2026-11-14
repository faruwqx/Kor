import { describe, expect, it } from 'vitest'
import { BUILTIN } from './exercises'
import { SPLITS, splitRoutines } from './splits'

describe('hazır splitler', () => {
  it('on split var, kimlikleri benzersiz', () => {
    expect(SPLITS).toHaveLength(10)
    expect(new Set(SPLITS.map((s) => s.id)).size).toBe(10)
    expect(SPLITS[0].name).toBe('Bro split')
  })

  it('her hareket kütüphanede var ve set/tekrar geçerli', () => {
    const ids = new Set(BUILTIN.map((e) => e.id))
    for (const s of SPLITS)
      for (const w of s.workouts) {
        expect(w.items.length).toBeGreaterThan(0)
        for (const it of w.items) {
          expect(ids.has(it.exerciseId), `${s.id}/${w.name}: ${it.exerciseId}`).toBe(true)
          expect(it.sets).toBeGreaterThan(0)
          expect(it.reps).toBeGreaterThan(0)
        }
      }
  })

  it('programa çevrilince kimlik sabit kalır', () => {
    const bro = SPLITS[0]
    expect(splitRoutines(bro).map((r) => r.id)).toEqual(splitRoutines(bro).map((r) => r.id))
    expect(splitRoutines(bro)[0]).toMatchObject({ id: 'split-bro-0', name: 'Göğüs · Bro split' })
  })
})
