import { describe, expect, it } from 'vitest'
import {
  countryFromLocale,
  countryFromZone,
  formatPrice,
  priceFor,
  tierForCountry,
  yearlySaving,
} from './pricing'

describe('fiyat katmanı', () => {
  it('Türkiye kendi katmanında, lira ile', () => {
    expect(priceFor('TR')).toEqual({ tier: 'tr', currency: 'TRY', monthly: 99, yearly: 699 })
  })

  it('Avrupa ve ABD yüksek katmanda', () => {
    for (const cc of ['DE', 'FR', 'NL', 'SE', 'CH', 'GB', 'US']) expect(tierForCountry(cc)).toBe('high')
    expect(priceFor('DE').currency).toBe('EUR')
    expect(priceFor('GB').currency).toBe('GBP')
    expect(priceFor('US').currency).toBe('USD')
  })

  it('gelişmemiş ülkeler Türkiye fiyatının dolar karşılığını öder', () => {
    for (const cc of ['IN', 'BR', 'EG', 'PK', 'NG', 'ID', 'UA', 'RS']) {
      const p = priceFor(cc)
      expect(p.tier).toBe('low')
      expect(p.currency).toBe('USD')
      expect(p.monthly).toBeLessThan(priceFor('US').monthly)
    }
  })

  it('yüksek katman Türkiye katmanından pahalı', () => {
    // 99 TL yaklaşık 2 USD eder; yüksek katman bunun birkaç katı olmalı.
    expect(priceFor('US').monthly).toBeGreaterThan(priceFor('IN').monthly * 3)
    expect(priceFor('DE').yearly).toBeGreaterThan(priceFor('IN').yearly * 3)
  })

  it('bilinmeyen ülke en düşük fiyatı görür', () => {
    expect(priceFor(null).tier).toBe('low')
    expect(priceFor('').tier).toBe('low')
    expect(priceFor('tr').tier).toBe('tr')
  })

  it('yıllık paket her katmanda aylıktan ucuz', () => {
    for (const cc of ['TR', 'US', 'DE', 'GB', 'IN']) {
      const p = priceFor(cc)
      expect(p.yearly).toBeLessThan(p.monthly * 12)
      expect(yearlySaving(p)).toBeGreaterThan(0)
    }
    expect(yearlySaving(priceFor('TR'))).toBe(41)
  })
})

describe('ülke tahmini', () => {
  it('saat diliminden ülke', () => {
    expect(countryFromZone('Europe/Istanbul')).toBe('TR')
    expect(countryFromZone('Europe/Berlin')).toBe('DE')
    expect(countryFromZone('America/Indiana/Indianapolis')).toBe('US')
    expect(countryFromZone('Europe/Kyiv')).toBeNull()
    expect(countryFromZone(undefined)).toBeNull()
  })

  it('dil etiketinden bölge', () => {
    expect(countryFromLocale('tr-TR')).toBe('TR')
    expect(countryFromLocale('en')).toBeNull()
    expect(countryFromLocale('!!')).toBeNull()
  })
})

describe('fiyat yazımı', () => {
  it('tam sayıda kuruş yazmaz, küsuratta yazar', () => {
    expect(formatPrice(99, 'TRY')).toBe('₺99')
    expect(formatPrice(7.99, 'USD')).toContain('7,99')
  })
})
