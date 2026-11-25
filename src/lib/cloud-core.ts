/**
 * Bulut hesabının ağ gerektirmeyen çekirdeği: neyin yedekleneceği, iki kopyanın nasıl
 * birleşeceği, eşitlemede hangi adımın atılacağı ve Premium hakkının nasıl okunacağı.
 * Ağ ve oturum işleri cloud.ts içindedir.
 */
import type { AppState } from './types'

/** Buluta giden belge: süren antrenman ve örnek veri bayrağı cihazda kalır. */
export type CloudDoc = Omit<AppState, 'active' | 'demo'>

export function toDoc(s: AppState): CloudDoc {
  return {
    profile: s.profile,
    bodyweights: s.bodyweights,
    workouts: s.workouts,
    routines: s.routines,
    customExercises: s.customExercises,
    settings: s.settings,
    ...(s.pushups?.length ? { pushups: s.pushups } : {}),
  }
}

/** Sunucudan gelen belgeyi körü körüne uygulama: beklenen biçimde değilse null. */
export function parseDoc(x: unknown): CloudDoc | null {
  if (!x || typeof x !== 'object') return null
  const d = x as Partial<CloudDoc>
  if (!Array.isArray(d.workouts) || !Array.isArray(d.routines)) return null
  if (!Array.isArray(d.bodyweights) || !Array.isArray(d.customExercises)) return null
  if (!d.settings || typeof d.settings !== 'object') return null
  if (d.profile != null && typeof d.profile !== 'object') return null
  return {
    profile: d.profile ?? null,
    bodyweights: d.bodyweights,
    workouts: d.workouts,
    routines: d.routines,
    customExercises: d.customExercises,
    settings: d.settings,
    // Eski belgelerde yok; varsa taşınır.
    ...(Array.isArray(d.pushups) ? { pushups: d.pushups } : {}),
  }
}

function unionById<T extends { id: string }>(local: T[], remote: T[]): T[] {
  const seen = new Set(local.map((x) => x.id))
  return [...local, ...remote.filter((x) => !seen.has(x.id))]
}

/**
 * İki kopyayı kayıpsız birleştirir: aynı kimlikte cihazdaki kazanır, yalnızca birinde
 * olan korunur. Silme bilgisi taşınmadığı için, bir cihazda silinen kayıt öbür cihazın
 * kopyasından geri gelebilir; veri kaybetmektense bu tercih edildi.
 */
export function mergeDocs(local: CloudDoc, remote: CloudDoc): CloudDoc {
  const ats = new Set(local.bodyweights.map((b) => b.at))
  return {
    profile:
      local.profile && remote.profile
        ? { ...local.profile, createdAt: Math.min(local.profile.createdAt, remote.profile.createdAt) }
        : (local.profile ?? remote.profile),
    bodyweights: [...local.bodyweights, ...remote.bodyweights.filter((b) => !ats.has(b.at))].sort(
      (a, b) => a.at - b.at,
    ),
    workouts: unionById(local.workouts, remote.workouts).sort((a, b) => a.startedAt - b.startedAt),
    routines: unionById(local.routines, remote.routines),
    customExercises: unionById(local.customExercises, remote.customExercises),
    settings: local.settings,
    ...(local.pushups?.length || remote.pushups?.length
      ? {
          pushups: unionById(local.pushups ?? [], remote.pushups ?? []).sort((a, b) => a.at - b.at),
        }
      : {}),
  }
}

export interface SyncMeta {
  /** Bu cihazdaki verinin en son bağlandığı hesap. null: henüz hesaba bağlanmadı. */
  userId: string | null
  /** Bu cihazın gördüğü son sunucu sürümü (updated_at). */
  remoteAt: string | null
  /** Sunucuya gitmemiş yerel değişiklik var. */
  dirty: boolean
}

export type SyncAction = 'pull' | 'push' | 'merge' | 'reset' | 'none'

/**
 * Giriş yapan kullanıcı için eşitleme adımı.
 * - Cihazdaki veri başka bir hesaba aitse asla birleştirilmez: o hesabın verisi yeni
 *   hesaba sızmasın diye sunucudaki kopya alınır, yoksa cihaz sıfırlanır.
 * - Cihaz hiç bağlanmadıysa (misafir verisi) hesapla birleştirilir.
 */
export function planSync(
  meta: SyncMeta,
  userId: string,
  hasLocal: boolean,
  remoteAt: string | null,
): SyncAction {
  const hasRemote = remoteAt != null
  if (meta.userId != null && meta.userId !== userId) return hasRemote ? 'pull' : 'reset'
  if (meta.userId == null) {
    if (hasRemote) return hasLocal ? 'merge' : 'pull'
    return hasLocal ? 'push' : 'none'
  }
  const remoteChanged = hasRemote && remoteAt !== meta.remoteAt
  if (remoteChanged) return meta.dirty && hasLocal ? 'merge' : 'pull'
  if (!hasLocal) return 'none'
  return meta.dirty || !hasRemote ? 'push' : 'none'
}

export interface Subscription {
  status: 'trialing' | 'active' | 'past_due' | 'canceled' | 'expired'
  plan: 'monthly' | 'yearly' | null
  trial_used: boolean
  /** ISO-8601 */
  current_period_end: string
}

/**
 * GEÇİCİ: lansman döneminde Premium herkese açık. Normale dönmek için bu bayrağı
 * false yap (tek satır) — altındaki gerçek abonelik mantığı olduğu gibi duruyor.
 */
export const PREMIUM_FOR_EVERYONE = true

/** Deneme, etkin abonelik veya iptal edilmiş ama süresi dolmamış abonelik Premium'dur. */
export function hasActiveSubscription(
  sub: Subscription | null | undefined,
  now: number = Date.now(),
): boolean {
  if (!sub) return false
  if (sub.status !== 'trialing' && sub.status !== 'active' && sub.status !== 'canceled') return false
  const end = Date.parse(sub.current_period_end)
  return Number.isFinite(end) && end > now
}

/** Premium hakkı. Lansman döneminde {@link PREMIUM_FOR_EVERYONE} ile herkese açık. */
export function isPremium(sub: Subscription | null | undefined, now: number = Date.now()): boolean {
  return PREMIUM_FOR_EVERYONE || hasActiveSubscription(sub, now)
}

/** Ücretsiz planda grafiklerin geriye baktığı süre (gün). */
export const FREE_HISTORY_DAYS = 30

/** Ücretsiz planda program sayısı: dört hazır program ve iki özel program. */
export const FREE_ROUTINES = 6

/** Yerel Premium kilidini açan kod. Güvenlik sınırı değildir; kişisel kullanım içindir. */
export const REDEEM_CODE = '8888F'

/** Ayarlardaki kod geçerli mi (büyük/küçük ve boşluk duyarsız). */
export function redeemed(settings: { redeem?: string } | null | undefined): boolean {
  return (settings?.redeem ?? '').trim().toUpperCase() === REDEEM_CODE
}
