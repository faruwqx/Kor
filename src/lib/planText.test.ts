import { describe, expect, it } from 'vitest'
import { DEFAULT_REPS, DEFAULT_SETS, matchPlanName, parsePlanText } from './planText'

const pick = (text: string) =>
  parsePlanText(text)
    .items.filter((i) => i.pick)
    .map((i) => [i.exerciseId ?? i.name, i.sets, i.reps])

describe('metinden program', () => {
  it('yaygın set×tekrar yazımları', () => {
    const r = parsePlanText(`PUSH DAY
1. Bench Press 4x8
2) Incline Dumbbell Press 3 x 8-12
- Lateral raise 3 set 15 tekrar
• Triceps pushdown 3 sets of 12
Cable fly 12 reps x 3 sets
Dips 3×max`)
    expect(r.title).toBe('PUSH DAY')
    expect(r.items.map((i) => [i.exerciseId, i.sets, i.reps])).toEqual([
      ['bench', 4, 8],
      ['db-incline', 3, 8],
      ['lateral-raise', 3, 15],
      ['pushdown', 3, 12],
      ['cable-fly', 3, 12],
      ['dips', 3, DEFAULT_REPS],
    ])
    expect(r.items.every((i) => i.explicit && i.pick)).toBe(true)
  })

  it('sayı önde, ağırlık/dinlenme/RPE addan atılır', () => {
    expect(pick('3x10 Squat @ 100kg (dinlenme 90 sn) RPE 8')).toEqual([['squat', 3, 10]])
    // "100x5" ağırlık×tekrardır: 100 set değil, 5 tekrar; set sayısı varsayılan.
    expect(pick('Deadlift 100x5')).toEqual([['deadlift', DEFAULT_SETS, 5]])
    expect(pick('Bench press 60 kg x 8')).toEqual([['bench', DEFAULT_SETS, 8]])
  })

  it('ad bir satırda, sayılar altındaki satırda', () => {
    expect(pick('Bench press\n4x6\nSquat\n5 x 5')).toEqual([
      ['bench', 4, 6],
      ['squat', 5, 5],
    ])
  })

  it('süreli hareket ve sayısız ama tanınan hareket', () => {
    expect(pick('Plank 3x60 sn')).toEqual([['plank', 3, 60]])
    // Sayı yok ama hareket tanınıyor: varsayılan 3×10 ile seçili gelir.
    const r = parsePlanText('Antrenman A\nLat pulldown')
    expect(r.items[0]).toMatchObject({ exerciseId: 'lat-pulldown', sets: DEFAULT_SETS, reps: DEFAULT_REPS, explicit: false, pick: true })
  })

  it('başlıklar ve OCR gürültüsü harekete dönüşmez', () => {
    const r = parsePlanText(`Pazartesi - Göğüs
Isınma:
|||
~~
Qwrtzx blorp
Bench press 4x8`)
    expect(r.title).toBe('Pazartesi - Göğüs')
    // Tanınmayan, sayısız satır listede kalır ama seçili gelmez.
    expect(r.items.map((i) => [i.name, i.pick])).toEqual([
      ['Qwrtzx blorp', false],
      ['Bench press', true],
    ])
  })

  it('tanınmayan ama sayılı satır yeni hareket olarak seçili gelir', () => {
    const r = parsePlanText('Zercher carry walk 3x40 m')
    expect(r.items[0]).toMatchObject({ exerciseId: null, sets: 3, pick: true })
  })

  it('Türkçe salon adları dil ayarından bağımsız eşleşir', () => {
    expect(matchPlanName('Barfiks')).toBe('pullup')
    expect(matchPlanName('Şınav')).toBe('pushup')
    expect(matchPlanName('Mekik')).toBe('situp')
  })

  it('OCR harf hatasına rağmen bulanık eşleşir', () => {
    expect(matchPlanName('Dumbbell Incline Bench Press')).not.toBeNull()
    expect(matchPlanName('Tamamen uydurma xyz')).toBeNull()
  })

  it('makul olmayan sayılar varsayılana düşer', () => {
    const r = parsePlanText('Squat 0x0')
    expect(r.items[0]).toMatchObject({ sets: DEFAULT_SETS, reps: DEFAULT_REPS })
  })
})
