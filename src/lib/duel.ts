/**
 * Canlı şınav düellosu: iki oyuncu aynı oda koduyla bir yayın kanalına katılır.
 * Kanaldan YALNIZCA ad, rank puanı ve şınav sayısı geçer. Kamera görüntüsü ve poz
 * noktaları cihazdan hiç çıkmaz; sayım her oyuncunun kendi telefonunda yapılır.
 *
 * Sayılar oyuncunun cihazından bildirilir; hile koruması yoktur. Gelen her mesaj
 * biçim ve aralık olarak doğrulanır, geçersizi yok sayılır.
 */
import type { RealtimeChannel } from '@supabase/supabase-js'
import { realtimeClient } from './cloud'

export interface Peer {
  id: string
  name: string
  /** Şınav rank puanı. */
  rp: number
}

export interface DuelHandlers {
  onPeer: (p: Peer) => void
  onStart: () => void
  onScore: (id: string, reps: number, final: boolean) => void
  onLeave: (id: string) => void
  onStatus: (s: 'connecting' | 'open' | 'error') => void
}

export interface Duel {
  start: () => void
  score: (reps: number, final: boolean) => void
  close: () => void
}

/** Karışabilen harfler (O/0, I/1) yok. */
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
export const CODE_LENGTH = 6

export function newRoomCode(): string {
  const r = crypto.getRandomValues(new Uint32Array(CODE_LENGTH))
  return Array.from(r, (n) => ALPHABET[n % ALPHABET.length]).join('')
}

export const normalizeCode = (s: string) =>
  s
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, CODE_LENGTH)

export const isCode = (s: string) =>
  s.length === CODE_LENGTH && [...s].every((c) => ALPHABET.includes(c))

/** Gelen oyuncu bilgisini doğrular ve temizler. */
export function parsePeer(x: unknown): Peer | null {
  if (!x || typeof x !== 'object') return null
  const p = x as Record<string, unknown>
  if (typeof p.id !== 'string' || p.id.length < 4 || p.id.length > 64) return null
  if (typeof p.rp !== 'number' || !Number.isFinite(p.rp)) return null
  // Kontrol karakterleri bilerek silinir: ad ekranda tek satır, temiz görünsün.
  const name =
    // eslint-disable-next-line no-control-regex
    typeof p.name === 'string' ? p.name.replace(/[\u0000-\u001f]/g, '').trim().slice(0, 24) : ''
  return { id: p.id, name: name || 'Rakip', rp: Math.max(0, Math.min(2400, Math.round(p.rp))) }
}

export function parseReps(x: unknown): number | null {
  return typeof x === 'number' && Number.isInteger(x) && x >= 0 && x <= 500 ? x : null
}

export function openDuel(code: string, me: Peer, h: DuelHandlers): Duel | null {
  const sb = realtimeClient()
  if (!sb || !isCode(code)) return null
  h.onStatus('connecting')
  const ch: RealtimeChannel = sb.channel(`kor-duel-${code}`)
  const known = new Set<string>()

  const send = (event: string, payload: Record<string, unknown>) =>
    void ch.send({ type: 'broadcast', event, payload: { ...payload, from: me.id } })

  ch.on('broadcast', { event: 'hello' }, ({ payload }) => {
    const p = parsePeer(payload)
    if (!p || p.id === me.id) return
    const first = !known.has(p.id)
    known.add(p.id)
    h.onPeer(p)
    // Yeni gelene kendini tanıt; karşılıklı sonsuz döngü olmasın diye yalnızca ilk kez.
    if (first && payload?.reply === true) send('hello', { ...me, reply: false })
  })
  ch.on('broadcast', { event: 'start' }, ({ payload }) => {
    if (typeof payload?.from === 'string' && known.has(payload.from)) h.onStart()
  })
  ch.on('broadcast', { event: 'score' }, ({ payload }) => {
    const reps = parseReps(payload?.reps)
    if (reps == null || typeof payload?.from !== 'string' || !known.has(payload.from)) return
    h.onScore(payload.from, reps, payload.final === true)
  })
  ch.on('broadcast', { event: 'bye' }, ({ payload }) => {
    if (typeof payload?.from === 'string') h.onLeave(payload.from)
  })

  ch.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      h.onStatus('open')
      send('hello', { ...me, reply: true })
    } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') h.onStatus('error')
  })

  return {
    start: () => send('start', {}),
    score: (reps, final) => send('score', { reps, final }),
    close: () => {
      send('bye', {})
      void sb.removeChannel(ch)
    },
  }
}
