import { describe, expect, it } from 'vitest'
import {
  hasActiveSubscription,
  isPremium,
  PREMIUM_FOR_EVERYONE,
  mergeDocs,
  parseDoc,
  planSync,
  redeemed,
  toDoc,
  type CloudDoc,
  type SyncMeta,
} from './cloud-core'
import type { AppState, Workout } from './types'

const workout = (id: string, startedAt: number): Workout => ({
  id,
  name: id,
  startedAt,
  endedAt: startedAt + 1,
  bodyweight: 80,
  exercises: [],
})

const doc = (over: Partial<CloudDoc> = {}): CloudDoc => ({
  profile: { name: 'A', sex: 'm', weeklyGoal: 3, createdAt: 100 },
  bodyweights: [],
  workouts: [],
  routines: [],
  customExercises: [],
  settings: { restSec: 120, vibrate: true },
  ...over,
})

describe('toDoc', () => {
  it('süren antrenmanı ve örnek veri bayrağını buluta göndermez', () => {
    const s: AppState = {
      ...doc(),
      active: { name: 'x', startedAt: 1, exercises: [] },
      demo: true,
    }
    expect(toDoc(s)).not.toHaveProperty('active')
    expect(toDoc(s)).not.toHaveProperty('demo')
  })
})

describe('parseDoc', () => {
  it('geçerli belgeyi kabul eder', () => {
    expect(parseDoc(doc())).toEqual(doc())
  })
  it('bozuk belgeyi reddeder', () => {
    expect(parseDoc(null)).toBeNull()
    expect(parseDoc('x')).toBeNull()
    expect(parseDoc({ ...doc(), workouts: 'x' })).toBeNull()
    expect(parseDoc({ ...doc(), settings: null })).toBeNull()
  })
})

describe('mergeDocs', () => {
  it('iki taraftaki antrenmanları kayıpsız birleştirir, tarihe göre sıralar', () => {
    const m = mergeDocs(
      doc({ workouts: [workout('b', 20), workout('c', 30)] }),
      doc({ workouts: [workout('a', 10), workout('b', 20)] }),
    )
    expect(m.workouts.map((w) => w.id)).toEqual(['a', 'b', 'c'])
  })

  it('aynı kimlikte cihazdaki kopya kazanır', () => {
    const local = { ...workout('a', 10), name: 'cihaz' }
    const remote = { ...workout('a', 10), name: 'bulut' }
    expect(mergeDocs(doc({ workouts: [local] }), doc({ workouts: [remote] })).workouts[0].name).toBe('cihaz')
  })

  it('vücut ağırlığı kayıtlarını zamana göre tekilleştirir', () => {
    const m = mergeDocs(
      doc({ bodyweights: [{ at: 2, kg: 81 }] }),
      doc({ bodyweights: [{ at: 1, kg: 80 }, { at: 2, kg: 99 }] }),
    )
    expect(m.bodyweights).toEqual([{ at: 1, kg: 80 }, { at: 2, kg: 81 }])
  })

  it('profili olmayan cihaz buluttaki profili alır', () => {
    expect(mergeDocs(doc({ profile: null }), doc()).profile?.name).toBe('A')
  })
})

describe('planSync', () => {
  const meta = (over: Partial<SyncMeta> = {}): SyncMeta => ({ userId: null, remoteAt: null, dirty: false, ...over })

  it('misafir verisi hesaba bağlanırken birleştirilir ya da yüklenir', () => {
    expect(planSync(meta(), 'u1', true, 't1')).toBe('merge')
    expect(planSync(meta(), 'u1', true, null)).toBe('push')
    expect(planSync(meta(), 'u1', false, 't1')).toBe('pull')
    expect(planSync(meta(), 'u1', false, null)).toBe('none')
  })

  it('başka hesabın verisi yeni hesaba asla karışmaz', () => {
    expect(planSync(meta({ userId: 'u1', dirty: true }), 'u2', true, 't1')).toBe('pull')
    expect(planSync(meta({ userId: 'u1', dirty: true }), 'u2', true, null)).toBe('reset')
  })

  it('aynı hesapta: sunucu değiştiyse al, yerel değiştiyse gönder, ikisi de değiştiyse birleştir', () => {
    const m = { userId: 'u1', remoteAt: 't1' }
    expect(planSync(meta(m), 'u1', true, 't2')).toBe('pull')
    expect(planSync(meta({ ...m, dirty: true }), 'u1', true, 't1')).toBe('push')
    expect(planSync(meta({ ...m, dirty: true }), 'u1', true, 't2')).toBe('merge')
    expect(planSync(meta(m), 'u1', true, 't1')).toBe('none')
  })

  it('sunucudaki satır yoksa yerel veriyi yeniden yükler', () => {
    expect(planSync(meta({ userId: 'u1', remoteAt: 't1' }), 'u1', true, null)).toBe('push')
  })
})

describe('hasActiveSubscription', () => {
  const now = Date.parse('2026-11-12T12:00:00Z')
  const sub = (status: string, end: string) =>
    ({ status, plan: null, trial_used: true, current_period_end: end }) as Parameters<
      typeof hasActiveSubscription
    >[0]

  it('aboneliği olmayan ücretsizdir', () => {
    expect(hasActiveSubscription(null, now)).toBe(false)
  })
  it('süresi dolmamış deneme ve abonelik Premium', () => {
    expect(hasActiveSubscription(sub('trialing', '2026-11-19T12:00:00Z'), now)).toBe(true)
    expect(hasActiveSubscription(sub('active', '2026-12-12T12:00:00Z'), now)).toBe(true)
    expect(hasActiveSubscription(sub('canceled', '2026-11-13T12:00:00Z'), now)).toBe(true)
  })
  it('süresi dolmuş ya da ödenmemiş abonelik Premium değil', () => {
    expect(hasActiveSubscription(sub('trialing', '2026-11-12T11:59:00Z'), now)).toBe(false)
    expect(hasActiveSubscription(sub('expired', '2026-12-12T12:00:00Z'), now)).toBe(false)
    expect(hasActiveSubscription(sub('past_due', '2026-12-12T12:00:00Z'), now)).toBe(false)
    expect(hasActiveSubscription(sub('active', 'bozuk'), now)).toBe(false)
  })
})

describe('isPremium', () => {
  it('lansman bayrağı açıkken herkes Premium', () => {
    // PREMIUM_FOR_EVERYONE kapatıldığında bu test gerçek abonelik mantığına döner.
    if (PREMIUM_FOR_EVERYONE) {
      expect(isPremium(null)).toBe(true)
    } else {
      expect(isPremium(null)).toBe(false)
    }
  })
})

describe('redeemed', () => {
  it('doğru kod (büyük/küçük ve boşluk duyarsız) Premium açar', () => {
    expect(redeemed({ redeem: '8888F' })).toBe(true)
    expect(redeemed({ redeem: ' 8888f ' })).toBe(true)
  })
  it('yanlış ya da boş kod açmaz', () => {
    expect(redeemed({ redeem: '0000' })).toBe(false)
    expect(redeemed({ redeem: '' })).toBe(false)
    expect(redeemed({})).toBe(false)
    expect(redeemed(null)).toBe(false)
  })
})
