import { describe, expect, it } from 'vitest'
import { LEGAL_VERSION, legalDoc, legalDocs, operatorIncomplete } from './legal'
import { setLang } from './i18n'

describe('hukuki metinler', () => {
  it('her dildeki her metnin benzersiz kimliği, başlığı ve dolu bölümleri var', () => {
    for (const l of ['tr', 'en', 'es'] as const) {
      setLang(l)
      const docs = legalDocs()
      const ids = docs.map((d) => d.id)
      expect(new Set(ids).size).toBe(ids.length)
      for (const d of docs) {
        expect(d.title.trim()).not.toBe('')
        expect(d.summary.trim()).not.toBe('')
        expect(d.sections.length).toBeGreaterThan(0)
        for (const s of d.sections) {
          expect(s.h.trim()).not.toBe('')
          expect(s.p.length).toBeGreaterThan(0)
          for (const p of s.p) expect(p.trim().length).toBeGreaterThan(20)
        }
      }
    }
    setLang('tr')
  })

  it('İngilizce ve Türkçe aynı kimlik kümesini kapsar', () => {
    setLang('tr')
    const tr = legalDocs()
      .map((d) => d.id)
      .sort()
    setLang('en')
    const en = legalDocs()
      .map((d) => d.id)
      .sort()
    setLang('tr')
    expect(en).toEqual(tr)
  })

  it('arayüzün bağlandığı metinler mevcut', () => {
    for (const id of ['terms', 'privacy', 'kvkk', 'consent', 'health', 'subscription'])
      expect(legalDoc(id)).toBeDefined()
    expect(legalDoc('yok')).toBeUndefined()
    expect(LEGAL_VERSION).toMatch(/^\d+\.\d+$/)
  })

  it('İngilizce seçiliyken metin İngilizce gelir', () => {
    setLang('en')
    expect(legalDoc('terms')?.title).toBe('Terms of Use')
    setLang('tr')
    expect(legalDoc('terms')?.title).toBe('Kullanım Koşulları')
  })

  it('şirket bilgileri doldurulana kadar eksik olarak işaretlenir', () => {
    // Yayından önce OPERATOR doldurulunca bu beklenti false olmalı ve test güncellenmeli.
    expect(operatorIncomplete()).toBe(true)
  })
})
