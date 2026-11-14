/**
 * Bölgesel fiyat tablosu.
 *
 * Burada hesaplanan fiyat yalnızca ekranda gösterilir. Gerçekte tahsil edilen tutarı
 * ödeme sağlayıcısı, kullanıcının fatura ülkesine göre belirler; aynı tablo orada da
 * tanımlanmalıdır. Tarayıcıdaki ülke tahmini kandırılabilir, bu yüzden ona güvenilmez.
 */

export type PriceTier = 'tr' | 'high' | 'low'
export type Plan = 'monthly' | 'yearly'
export type Currency = 'TRY' | 'USD' | 'EUR' | 'GBP'

export interface Price {
  tier: PriceTier
  currency: Currency
  monthly: number
  yearly: number
}

/** Ücretsiz deneme süresi (gün). Sunucudaki start_trial() ile aynı olmalı. */
export const TRIAL_DAYS = 7

/** Euro kullanan ülkeler. */
const EUROZONE = [
  'AT', 'BE', 'BG', 'HR', 'CY', 'EE', 'FI', 'FR', 'DE', 'GR', 'IE', 'IT', 'LV', 'LT', 'LU',
  'MT', 'NL', 'PT', 'SK', 'SI', 'ES', 'AD', 'MC', 'SM', 'VA',
]

/** AB/AEA'nın euro kullanmayan üyeleri ve İsviçre: yüksek fiyat, euro ile gösterilir. */
const EUROPE_OTHER = ['CZ', 'DK', 'HU', 'PL', 'RO', 'SE', 'IS', 'LI', 'NO', 'CH']

/** Birleşik Krallık ve bağlı adalar: yüksek fiyat, sterlin. */
const STERLING = ['GB', 'GI', 'JE', 'GG', 'IM']

/**
 * Avrupa ve ABD dışındaki yüksek gelirli ülkeler. Kullanıcı yalnızca "Avrupa ve ABD"
 * dedi; bunlar gelişmemiş sayılamayacağı için yüksek fiyata konuldu (varsayım).
 */
const HIGH_OTHER = ['US', 'CA', 'AU', 'NZ', 'JP', 'KR', 'SG', 'HK', 'TW', 'IL', 'AE', 'QA', 'KW', 'SA']

const HIGH_EUR = new Set([...EUROZONE, ...EUROPE_OTHER])
const HIGH_GBP = new Set(STERLING)
const HIGH_USD = new Set(HIGH_OTHER)

/**
 * Fiyatlar. "low", Türkiye fiyatının dolar karşılığıdır (yaklaşık 48 TL/USD, Kasım 2026);
 * kur belirgin değişirse güncellenmeli.
 */
const TABLE: Record<Currency, { monthly: number; yearly: number }> = {
  TRY: { monthly: 99, yearly: 699 },
  EUR: { monthly: 7.99, yearly: 49.99 },
  GBP: { monthly: 6.99, yearly: 44.99 },
  USD: { monthly: 7.99, yearly: 49.99 },
}
const LOW_USD = { monthly: 1.99, yearly: 14.99 }

export function tierForCountry(country: string | null | undefined): PriceTier {
  const cc = (country ?? '').toUpperCase()
  if (cc === 'TR') return 'tr'
  if (HIGH_EUR.has(cc) || HIGH_GBP.has(cc) || HIGH_USD.has(cc)) return 'high'
  return 'low'
}

/** Ülke bilinmiyorsa en düşük fiyat gösterilir; kimseye olduğundan pahalı görünmesin. */
export function priceFor(country: string | null | undefined): Price {
  const cc = (country ?? '').toUpperCase()
  const tier = tierForCountry(cc)
  if (tier === 'tr') return { tier, currency: 'TRY', ...TABLE.TRY }
  if (tier === 'low') return { tier, currency: 'USD', ...LOW_USD }
  const currency: Currency = HIGH_EUR.has(cc) ? 'EUR' : HIGH_GBP.has(cc) ? 'GBP' : 'USD'
  return { tier, currency, ...TABLE[currency] }
}

/** Yıllık paketin, on iki ay aylık ödemeye göre indirimi (yüzde, tam sayı). */
export function yearlySaving(p: Price): number {
  return Math.round((1 - p.yearly / (p.monthly * 12)) * 100)
}

export function formatPrice(amount: number, currency: Currency): string {
  return new Intl.NumberFormat('tr-TR', {
    style: 'currency',
    currency,
    minimumFractionDigits: Number.isInteger(amount) ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(amount)
}

/** Saat dilimi → ülke. Yalnızca fiyat katmanını ayırmaya yetecek kadar. */
const ZONES: Record<string, string> = {
  'Europe/Istanbul': 'TR',
  'Europe/London': 'GB', 'Europe/Belfast': 'GB', 'Europe/Gibraltar': 'GI', 'Europe/Jersey': 'JE',
  'Europe/Guernsey': 'GG', 'Europe/Isle_of_Man': 'IM',
  'Europe/Dublin': 'IE', 'Europe/Paris': 'FR', 'Europe/Berlin': 'DE', 'Europe/Busingen': 'DE',
  'Europe/Madrid': 'ES', 'Atlantic/Canary': 'ES', 'Africa/Ceuta': 'ES', 'Europe/Rome': 'IT',
  'Europe/Amsterdam': 'NL', 'Europe/Brussels': 'BE', 'Europe/Luxembourg': 'LU',
  'Europe/Vienna': 'AT', 'Europe/Zurich': 'CH', 'Europe/Lisbon': 'PT', 'Atlantic/Madeira': 'PT',
  'Atlantic/Azores': 'PT', 'Europe/Athens': 'GR', 'Europe/Stockholm': 'SE', 'Europe/Oslo': 'NO',
  'Europe/Copenhagen': 'DK', 'Europe/Helsinki': 'FI', 'Europe/Mariehamn': 'FI',
  'Europe/Warsaw': 'PL', 'Europe/Prague': 'CZ', 'Europe/Bratislava': 'SK',
  'Europe/Budapest': 'HU', 'Europe/Bucharest': 'RO', 'Europe/Sofia': 'BG',
  'Europe/Zagreb': 'HR', 'Europe/Ljubljana': 'SI', 'Europe/Tallinn': 'EE', 'Europe/Riga': 'LV',
  'Europe/Vilnius': 'LT', 'Europe/Malta': 'MT', 'Asia/Nicosia': 'CY', 'Asia/Famagusta': 'CY',
  'Atlantic/Reykjavik': 'IS', 'Europe/Vaduz': 'LI', 'Europe/Monaco': 'MC',
  'Europe/Andorra': 'AD', 'Europe/San_Marino': 'SM', 'Europe/Vatican': 'VA',
  'America/New_York': 'US', 'America/Detroit': 'US', 'America/Chicago': 'US',
  'America/Menominee': 'US', 'America/Denver': 'US', 'America/Boise': 'US',
  'America/Phoenix': 'US', 'America/Los_Angeles': 'US', 'America/Anchorage': 'US',
  'America/Juneau': 'US', 'America/Sitka': 'US', 'America/Metlakatla': 'US',
  'America/Yakutat': 'US', 'America/Nome': 'US', 'America/Adak': 'US', 'Pacific/Honolulu': 'US',
}
const US_PREFIXES = ['America/Indiana/', 'America/Kentucky/', 'America/North_Dakota/']

export function countryFromZone(zone: string | undefined): string | null {
  if (!zone) return null
  if (ZONES[zone]) return ZONES[zone]
  if (US_PREFIXES.some((p) => zone.startsWith(p))) return 'US'
  return null
}

/** "tr-TR" → "TR". Bölge yazmayan diller ("en") bir şey söylemez. */
export function countryFromLocale(tag: string | undefined): string | null {
  if (!tag) return null
  try {
    return new Intl.Locale(tag).region ?? null
  } catch {
    return null
  }
}

/**
 * Gösterim için ülke tahmini: önce saat dilimi (dil ayarından daha güvenilir), sonra
 * tarayıcı dillerinin bölgesi. Bulunamazsa null döner ve en düşük fiyat gösterilir.
 */
export function detectCountry(): string | null {
  let zone: string | undefined
  try {
    zone = Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    zone = undefined
  }
  const byZone = countryFromZone(zone)
  if (byZone) return byZone
  // Avrupa saat dilimi tanınmadıysa (Kiev, Belgrad vb.) dil ayarına bakıp yüksek fiyata
  // düşürme: dil bölgesi "en-US" olan biri oradan da bağlanabilir.
  if (zone?.startsWith('Europe/')) return null
  for (const tag of navigator.languages ?? [navigator.language]) {
    const cc = countryFromLocale(tag)
    if (cc) return cc
  }
  return null
}
