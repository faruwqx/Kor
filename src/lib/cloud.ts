/**
 * Bulut hesabı: oturum (Google, Apple, e-posta), veri yedeği ve Premium hakkı.
 *
 * Supabase anahtarları tanımlı değilse (bkz. .env.example) bu modül hiçbir ağ isteği
 * yapmaz ve uygulama eskisi gibi yalnızca cihazda çalışır.
 *
 * Tarayıcıya gömülen anahtar herkese açıktır. Veriyi koruyan şey sunucudaki satır
 * düzeyi güvenlik kurallarıdır (supabase/schema.sql); buradaki hiçbir kontrol güvenlik
 * sınırı sayılmaz.
 */
import { createClient, type SupabaseClient } from '@supabase/supabase-js'
import { useSyncExternalStore } from 'react'
import {
  isPremium,
  redeemed,
  mergeDocs,
  parseDoc,
  planSync,
  toDoc,
  type CloudDoc,
  type Subscription,
  type SyncMeta,
} from './cloud-core'
import type { Plan, Price } from './pricing'
import { actions, getState, onChange, useApp } from './store'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string | undefined
const SUPABASE_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY as string | undefined
const CHECKOUT_URL = import.meta.env.VITE_CHECKOUT_URL as string | undefined

export const cloudEnabled = Boolean(SUPABASE_URL && SUPABASE_KEY)
export const appleEnabled = import.meta.env.VITE_AUTH_APPLE === '1'
export const checkoutEnabled = Boolean(CHECKOUT_URL)

// PKCE: giriş dönüşünde kod "?code=" ile gelir; uygulamanın "#/..." yönlendiricisiyle çakışmaz.
const sb: SupabaseClient | null = cloudEnabled
  ? createClient(SUPABASE_URL!, SUPABASE_KEY!, {
      auth: { flowType: 'pkce', detectSessionInUrl: true, persistSession: true, autoRefreshToken: true },
    })
  : null

/** Canlı düello kanalı için istemci; bulut kapalıysa null. */
export const realtimeClient = (): SupabaseClient | null => sb

export interface CloudUser {
  id: string
  email: string
}

export interface CloudState {
  /** Oturum durumu öğrenildi (ya da bulut kapalı). */
  ready: boolean
  user: CloudUser | null
  sub: Subscription | null
  sync: 'idle' | 'syncing' | 'error'
  /** Son başarılı eşitleme (ms). */
  syncedAt: number | null
  /** Şifre sıfırlama bağlantısıyla gelindi: yeni şifre sorulmalı. */
  recovery: boolean
}

let state: CloudState = {
  ready: !cloudEnabled,
  user: null,
  sub: null,
  sync: 'idle',
  syncedAt: null,
  recovery: false,
}
const listeners = new Set<() => void>()

function patch(p: Partial<CloudState>) {
  state = { ...state, ...p }
  listeners.forEach((l) => l())
}

export function useCloud(): CloudState {
  return useSyncExternalStore(
    (l) => {
      listeners.add(l)
      return () => listeners.delete(l)
    },
    () => state,
  )
}

export function usePremium(): boolean {
  return isPremium(useCloud().sub) || redeemed(useApp().settings)
}

// ---------- Yerel kayıtlar ----------

const META_KEY = 'kor:sync'
const SUB_KEY = 'kor:sub'

function readJson<T>(key: string): T | null {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : null
  } catch {
    return null
  }
}

function writeJson(key: string, value: unknown) {
  try {
    if (value == null) localStorage.removeItem(key)
    else localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Depolama kapalıysa eşitleme bir sonraki açılışta baştan değerlendirilir.
  }
}

function readMeta(): SyncMeta {
  return { userId: null, remoteAt: null, dirty: false, ...readJson<Partial<SyncMeta>>(META_KEY) }
}

// ---------- Oturum ----------

function redirectUrl(): string {
  return window.location.origin + window.location.pathname
}

const ERRORS: [RegExp, string][] = [
  [/invalid login credentials/i, 'E-posta veya şifre hatalı.'],
  [/already registered|already been registered/i, 'Bu e-postayla bir hesap zaten var. Giriş yapmayı dene.'],
  [/email not confirmed/i, 'E-postanı henüz doğrulamadın. Gelen kutundaki bağlantıya tıkla.'],
  [/password should be at least|weak password/i, 'Şifre çok kısa veya zayıf. En az 8 karakter kullan.'],
  [/rate limit|too many/i, 'Çok fazla deneme yapıldı. Birkaç dakika sonra tekrar dene.'],
  [/unable to validate email|invalid email/i, 'E-posta adresi geçerli görünmüyor.'],
  [/failed to fetch|network/i, 'Bağlantı kurulamadı. İnternetini kontrol et.'],
  [/provider is not enabled|unsupported provider/i, 'Bu giriş yöntemi henüz açılmadı.'],
]

function explain(message: string | undefined): string {
  const m = message ?? ''
  return ERRORS.find(([re]) => re.test(m))?.[1] ?? 'İşlem tamamlanamadı. Biraz sonra tekrar dene.'
}

/** Başarıda null, hatada kullanıcıya gösterilecek mesaj döner. */
export async function signInWith(provider: 'google' | 'apple'): Promise<string | null> {
  if (!sb) return 'Hesap özelliği bu sürümde kapalı.'
  const { error } = await sb.auth.signInWithOAuth({ provider, options: { redirectTo: redirectUrl() } })
  return error ? explain(error.message) : null
}

export async function signInEmail(email: string, password: string): Promise<string | null> {
  if (!sb) return 'Hesap özelliği bu sürümde kapalı.'
  const { error } = await sb.auth.signInWithPassword({ email, password })
  return error ? explain(error.message) : null
}

/** confirm: hesap açıldı ama e-posta doğrulaması bekleniyor. */
export async function signUpEmail(
  email: string,
  password: string,
): Promise<{ error: string | null; confirm: boolean }> {
  if (!sb) return { error: 'Hesap özelliği bu sürümde kapalı.', confirm: false }
  const { data, error } = await sb.auth.signUp({
    email,
    password,
    options: { emailRedirectTo: redirectUrl() },
  })
  if (error) return { error: explain(error.message), confirm: false }
  // E-posta doğrulaması açıkken, kayıtlı bir adres için sunucu kimliksiz bir kullanıcı döner.
  if (data.user && data.user.identities?.length === 0)
    return { error: explain('already registered'), confirm: false }
  return { error: null, confirm: !data.session }
}

export async function sendPasswordReset(email: string): Promise<string | null> {
  if (!sb) return 'Hesap özelliği bu sürümde kapalı.'
  const { error } = await sb.auth.resetPasswordForEmail(email, { redirectTo: redirectUrl() })
  return error ? explain(error.message) : null
}

export async function setNewPassword(password: string): Promise<string | null> {
  if (!sb) return 'Hesap özelliği bu sürümde kapalı.'
  const { error } = await sb.auth.updateUser({ password })
  if (error) return explain(error.message)
  patch({ recovery: false })
  return null
}

export function dismissRecovery() {
  patch({ recovery: false })
}

/** Çıkıştan önce bekleyen değişiklikleri gönderir. Veri cihazda kalır. */
export async function signOut(): Promise<void> {
  if (!sb) return
  if (readMeta().dirty) await syncNow()
  await sb.auth.signOut({ scope: 'local' })
}

/** Hesabı ve sunucudaki tüm veriyi kalıcı olarak siler. Cihazdaki veri kalır. */
export async function deleteAccount(): Promise<string | null> {
  if (!sb || !state.user) return 'Önce giriş yapmalısın.'
  const { error } = await sb.rpc('delete_account')
  if (error) return explain(error.message)
  // Cihazdaki veri artık hiçbir hesaba bağlı değil: sonraki girişte o hesapla birleşir.
  writeJson(META_KEY, null)
  writeJson(SUB_KEY, null)
  await sb.auth.signOut({ scope: 'local' })
  return null
}

// ---------- Premium ----------

async function loadSub(user: CloudUser) {
  const cached = readJson<{ userId: string; sub: Subscription }>(SUB_KEY)
  // Salonda internet yokken son bilinen hak geçerli sayılır; bitiş tarihi yine denetlenir.
  if (cached?.userId === user.id) patch({ sub: cached.sub })
  if (!sb) return
  const { data, error } = await sb
    .from('subscriptions')
    .select('status, plan, trial_used, current_period_end')
    .eq('user_id', user.id)
    .maybeSingle()
  if (error || state.user?.id !== user.id) return
  const sub = (data as Subscription | null) ?? null
  patch({ sub })
  writeJson(SUB_KEY, sub ? { userId: user.id, sub } : null)
}

export async function refreshSubscription(): Promise<void> {
  if (state.user) await loadSub(state.user)
}

/** 7 günlük denemeyi başlatır. Hesap başına bir kez; kuralı sunucu uygular. */
export async function startTrial(): Promise<string | null> {
  if (!sb || !state.user) return 'Denemeyi başlatmak için giriş yap.'
  const { error } = await sb.rpc('start_trial')
  if (error)
    return /trial_used/.test(error.message)
      ? 'Ücretsiz denemeni daha önce kullandın.'
      : explain(error.message)
  await loadSub(state.user)
  return null
}

/**
 * Ödeme sayfasını açar. Tutarı burada gönderilen değerler değil, ödeme sağlayıcısındaki
 * fiyat tablosu ve kullanıcının fatura ülkesi belirler. Açılamadıysa false döner.
 */
export function checkout(plan: Plan, price: Price): boolean {
  if (!CHECKOUT_URL || !state.user) return false
  const url = new URL(CHECKOUT_URL)
  url.searchParams.set('plan', plan)
  url.searchParams.set('tier', price.tier)
  url.searchParams.set('uid', state.user.id)
  window.location.assign(url.toString())
  return true
}

// ---------- Sıralama ----------

export interface BoardRow {
  user_id: string
  name: string
  rp: number
}

/** En yüksek genel RP'li 100 kişi. Giriş yapılmadıysa veya okunamadıysa null. */
export async function fetchLeaderboard(): Promise<BoardRow[] | null> {
  if (!sb || !state.user) return null
  const { data, error } = await sb
    .from('leaderboard')
    .select('user_id, name, rp')
    .order('rp', { ascending: false })
    .limit(100)
  return error ? null : ((data as BoardRow[] | null) ?? [])
}

/**
 * Kullanıcının adını ve genel RP'sini sıralamaya yazar. RP'yi istemci bildirir:
 * sunucu yalnızca aralığı ve satırın sahibini denetler, kaldırışı doğrulamaz.
 */
export async function publishScore(name: string, rp: number): Promise<string | null> {
  if (!sb || !state.user) return 'Sıralamaya katılmak için giriş yap.'
  const { error } = await sb.from('leaderboard').upsert({
    user_id: state.user.id,
    name: name.trim().slice(0, 24) || 'Sporcu',
    rp: Math.max(0, Math.round(rp)),
  })
  return error ? explain(error.message) : null
}

export async function leaveLeaderboard(): Promise<string | null> {
  if (!sb || !state.user) return null
  const { error } = await sb.from('leaderboard').delete().eq('user_id', state.user.id)
  return error ? explain(error.message) : null
}

// ---------- Eşitleme ----------

/** Sunucudan gelen veri uygulanırken oluşan değişiklik "yerel değişiklik" sayılmaz. */
let applying = false
/** Yerel değişiklik sayacı: gönderim sürerken yeni değişiklik oldu mu diye bakılır. */
let changes = 0
let busy = false
let again = false
let timer: ReturnType<typeof setTimeout> | undefined

function apply(doc: CloudDoc) {
  applying = true
  try {
    actions.replaceAll({ ...doc, active: getState().active })
  } finally {
    applying = false
  }
}

async function push(userId: string, doc: CloudDoc): Promise<string> {
  const { data, error } = await sb!
    .from('user_data')
    .upsert({ user_id: userId, data: doc })
    .select('updated_at')
    .single()
  if (error) throw error
  return (data as { updated_at: string }).updated_at
}

export async function syncNow(): Promise<void> {
  const user = state.user
  if (!sb || !user) return
  if (busy) {
    again = true
    return
  }
  busy = true
  clearTimeout(timer)
  patch({ sync: 'syncing' })
  try {
    const { data: row, error } = await sb
      .from('user_data')
      .select('data, updated_at')
      .eq('user_id', user.id)
      .maybeSingle()
    if (error) throw error
    const remote = row ? parseDoc((row as { data: unknown }).data) : null
    const remoteAt = remote ? (row as { updated_at: string }).updated_at : null

    // Yerel durum ve bayraklar, ağ isteğinden sonra okunur: beklerken yapılan değişiklik kaçmasın.
    const local = getState()
    const hasLocal = local.profile != null && !local.demo
    const meta = readMeta()
    const action = planSync(meta, user.id, hasLocal, remoteAt)
    const seen = changes
    let nextAt = remoteAt

    if (action === 'pull') apply(remote!)
    else if (action === 'reset') {
      applying = true
      try {
        actions.resetAll()
      } finally {
        applying = false
      }
    } else if (action === 'push') nextAt = await push(user.id, toDoc(local))
    else if (action === 'merge') {
      const merged = mergeDocs(toDoc(local), remote!)
      apply(merged)
      nextAt = await push(user.id, merged)
    }

    writeJson(META_KEY, { userId: user.id, remoteAt: nextAt, dirty: changes !== seen } satisfies SyncMeta)
    patch({ sync: 'idle', syncedAt: Date.now() })
  } catch {
    patch({ sync: 'error' })
  } finally {
    busy = false
    if (again || (readMeta().dirty && state.sync !== 'error')) {
      again = false
      schedule()
    }
  }
}

function schedule(delay = 2500) {
  clearTimeout(timer)
  timer = setTimeout(() => void syncNow(), delay)
}

let started = false

/** Uygulama açılışında bir kez çağrılır. */
export function initCloud() {
  if (started || !sb) return
  started = true

  sb.auth.onAuthStateChange((event, session) => {
    const prev = state.user?.id
    const user = session?.user ? { id: session.user.id, email: session.user.email ?? '' } : null
    patch({
      ready: true,
      user,
      sub: user ? state.sub : null,
      recovery: state.recovery || event === 'PASSWORD_RECOVERY',
    })
    // Bu geri çağrının içinde Supabase çağrısı beklenmez (kilitlenir); sonraya ertelenir.
    if (user && user.id !== prev)
      setTimeout(() => {
        void loadSub(user)
        void syncNow()
      }, 0)
  })

  onChange(() => {
    if (applying) return
    changes++
    if (!state.user) {
      // Çıkış yapılmışken de işaretle: aynı hesaba dönünce değişiklikler gönderilsin.
      const meta = readMeta()
      if (meta.userId && !meta.dirty) writeJson(META_KEY, { ...meta, dirty: true })
      return
    }
    const meta = readMeta()
    if (!meta.dirty) writeJson(META_KEY, { ...meta, dirty: true })
    schedule()
  })

  window.addEventListener('online', () => void syncNow())
  document.addEventListener('visibilitychange', () => {
    if (!state.user) return
    // Arka plana geçerken bekleyeni hemen gönder; öne gelince öbür cihazın değişikliğini al.
    if (document.visibilityState === 'hidden') {
      if (readMeta().dirty) void syncNow()
    } else {
      void syncNow()
      void loadSub(state.user)
    }
  })
}
