import { afterEach, describe, expect, it } from 'vitest'
import { detectLang, setLang, t } from './i18n'
import { TIERS } from './rank'
import { MUSCLES, findExercise } from './exercises'

afterEach(() => setLang('tr'))

describe('i18n', () => {
  it('Türkçe anahtar seçili dile çevrilir, yer tutucu korunur', () => {
    setLang('tr')
    expect(t('Bugün')).toBe('Bugün')
    expect(t('{0} gün', 3)).toBe('3 gün')
    setLang('en')
    expect(t('Bugün')).toBe('Today')
    expect(t('{0} gün', 3)).toBe('3 days')
    setLang('es')
    expect(t('Bugün')).toBe('Hoy')
    expect(t('{0} gün', 3)).toBe('3 días')
  })

  it('bilinmeyen anahtar Türkçeye (anahtara) düşer', () => {
    setLang('en')
    expect(t('Böyle bir metin yok 123')).toBe('Böyle bir metin yok 123')
  })

  it('kademe ve kas grubu adları seçili dilde', () => {
    const chest = MUSCLES.find((m) => m.id === 'chest')!
    const kor = TIERS[TIERS.length - 1]
    setLang('tr')
    expect(chest.name).toBe('Göğüs')
    expect(TIERS[4].name).toBe('Altın')
    setLang('en')
    expect(chest.name).toBe('Chest')
    expect(kor.name).toBe('Kor')
    expect(TIERS[4].name).toBe('Gold')
    setLang('es')
    expect(chest.name).toBe('Pecho')
    expect(TIERS[4].name).toBe('Oro')
  })

  it('yerleşik hareket adları çevrilir, varyasyon kök+ek olarak', () => {
    setLang('en')
    expect(findExercise('bench').name).toBe('Bench press')
    expect(findExercise('pushup').name).toBe('Push-up')
    expect(findExercise('bench-v-paused').name).toBe('Bench press (paused)')
    setLang('es')
    expect(findExercise('squat').name).toBe('Sentadilla')
    expect(findExercise('bench-v-paused').name).toBe('Press de banca (con pausa)')
  })

  it('tarayıcı dilinden algılar; bilinmeyende İngilizce', () => {
    expect(detectLang(['tr-TR', 'en'])).toBe('tr')
    expect(detectLang(['es-ES'])).toBe('es')
    expect(detectLang(['de-DE', 'fr'])).toBe('en')
  })
})
