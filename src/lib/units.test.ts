import { afterEach, describe, expect, it } from 'vitest'
import { kgAtReps } from './rank'
import { findExercise } from './exercises'
import {
  KG_PER_LB,
  fmtShort,
  fmtTarget,
  fromWField,
  fw,
  setUnitSystem,
  suggestedSystem,
  toWField,
  wAdded,
  wBig,
} from './units'

afterEach(() => setUnitSystem('metric'))

describe('birim sistemi', () => {
  it('metrikte kg ve metre aynen gösterilir', () => {
    expect(fw(82.5)).toBe('82,5 kg')
    expect(fmtTarget('1000 m')).toBe('1 km')
    expect(fmtTarget('50 m')).toBe('50 m')
    expect(fmtTarget('100 tekrar')).toBe('100 tekrar')
    expect(wBig(12500)).toBe('12,5 t')
  })

  it('imperialde lb, yard, mil ve feet', () => {
    setUnitSystem('imperial')
    expect(fw(100)).toBe('220,46 lb')
    expect(wAdded(10)).toBe('+22,05')
    expect(fmtTarget('50 m')).toBe('55 yd')
    expect(fmtTarget('1 km')).toBe('0,6 mi')
    expect(fmtShort(1)).toBe('3 ft')
  })

  it('giriş alanı gidiş-dönüşte sayıyı korur: 185 lb yazılınca 185 kalır', () => {
    setUnitSystem('imperial')
    const kg = fromWField(185)!
    expect(kg).toBeCloseTo(185 * KG_PER_LB)
    expect(toWField(kg)).toBe(185)
    expect(toWField(null)).toBeNull()
  })

  it('hedef kilolar seçili birimin plakasına yuvarlanır', () => {
    const bench = findExercise('bench')
    expect(kgAtReps(bench, 101, 1, 80)).toBe(102.5)
    setUnitSystem('imperial')
    const kg = kgAtReps(bench, 101, 1, 80)
    expect(Math.round(kg / KG_PER_LB)).toBe(225)
  })

  it('ABD dilinde imperial önerilir', () => {
    expect(suggestedSystem('en-US')).toBe('imperial')
    expect(suggestedSystem('tr-TR')).toBe('metric')
    expect(suggestedSystem('en-GB')).toBe('metric')
  })
})
