/**
 * Kamerayla şınav sayma: poz noktalarından (MediaPipe Pose, 33 nokta) dirsek açısı ve
 * gövde düzlüğü çıkarılır, basit bir durum makinesiyle tam tekrarlar sayılır.
 *
 * Kurulum: telefon yerde, sporcuyla aynı seviyede, yaklaşık 1 m yanda; sporcu kameraya
 * yan profilden görünür. Bu modül görüntü görmez, yalnızca nokta koordinatlarıyla çalışır;
 * görüntü işleme tamamen cihazda yapılır (bkz. PushCam).
 */

export interface Pt {
  x: number
  y: number
  visibility?: number
}

/** MediaPipe Pose nokta sıraları: [omuz, dirsek, bilek, kalça, diz, ayak bileği]. */
const LEFT = [11, 13, 15, 23, 25, 27] as const
const RIGHT = [12, 14, 16, 24, 26, 28] as const

/** Kol bu açının üstündeyse yukarıda (kilitli) sayılır. */
export const UP_DEG = 150
/** Kol bu açının altına inince tekrar "aşağı" sayılır. */
export const DOWN_DEG = 100
/** Omuz-kalça-ayak açısı bunun altındaysa kalça düşmüş ya da kalkmıştır. */
export const STRAIGHT_DEG = 145
/** Gövde yataydan bu kadar eğikse şınav pozisyonunda değildir. */
export const MAX_TILT_DEG = 45
export const MIN_VIS = 0.5

export interface Pose {
  /** Dirsek açısı, derece. 180 = kol düz. */
  elbow: number
  /** Omuz-kalça-ayak açısı, derece. 180 = gövde dümdüz. */
  body: number
  /** Omuz-ayak çizgisinin yataydan sapması, 0-90 derece. */
  tilt: number
  /** Çizim için seçilen yanın noktaları (görüntüye göre normalize). */
  points: Pt[]
}

/** b köşesindeki açı, derece. */
export function angle(a: Pt, b: Pt, c: Pt): number {
  const v1x = a.x - b.x
  const v1y = a.y - b.y
  const v2x = c.x - b.x
  const v2y = c.y - b.y
  const n = Math.hypot(v1x, v1y) * Math.hypot(v2x, v2y)
  if (n === 0) return 0
  const cos = Math.min(1, Math.max(-1, (v1x * v2x + v1y * v2y) / n))
  return (Math.acos(cos) * 180) / Math.PI
}

const vis = (p: Pt | undefined) => p?.visibility ?? 0

/**
 * Noktalardan pozu okur. Kameraya daha iyi görünen yan seçilir. Gerekli noktalar
 * görünmüyorsa null. `aspect` görüntünün genişlik/yükseklik oranıdır: normalize
 * koordinatlarda açıların doğru çıkması için x bununla ölçeklenir.
 */
export function readPose(lm: Pt[], aspect: number): Pose | null {
  if (lm.length < 29) return null
  const score = (ids: readonly number[]) => ids.slice(0, 4).reduce((a, i) => a + vis(lm[i]), 0)
  const ids = score(LEFT) >= score(RIGHT) ? LEFT : RIGHT
  const [sh, el, wr, hip, knee, ank] = ids.map((i) => lm[i])
  if ([sh, el, wr, hip].some((p) => vis(p) < MIN_VIS)) return null
  const leg = vis(ank) >= 0.4 ? ank : vis(knee) >= 0.4 ? knee : null
  if (!leg) return null
  const s = (p: Pt): Pt => ({ x: p.x * aspect, y: p.y, visibility: p.visibility })
  const dx = Math.abs(s(leg).x - s(sh).x)
  const dy = Math.abs(s(leg).y - s(sh).y)
  return {
    elbow: angle(s(sh), s(el), s(wr)),
    body: angle(s(sh), s(hip), s(leg)),
    tilt: (Math.atan2(dy, dx) * 180) / Math.PI,
    points: [sh, el, wr, hip, leg],
  }
}

export type Feedback =
  /** Vücut kadrajda görünmüyor. */
  | 'nobody'
  /** Şınav pozisyonunda değil (ayakta, oturuyor). */
  | 'position'
  /** Gövde düz değil: kalça düşük ya da yüksek. */
  | 'straight'
  /** Yeterince inmedi: yarım tekrar sayılmadı. */
  | 'lower'
  | 'ok'

export interface PushState {
  reps: number
  phase: 'up' | 'down'
  /** Yumuşatılmış dirsek açısı. */
  smooth: number | null
  /** Bu tekrarda inilen en düşük açı. */
  minAngle: number
  /** Bu tekrar boyunca gövde düz kaldı mı. */
  formOk: boolean
  feedback: Feedback
}

export function initPush(): PushState {
  return { reps: 0, phase: 'up', smooth: null, minAngle: 180, formOk: true, feedback: 'nobody' }
}

/** Bir kare işler, yeni durumu döner. Saf fonksiyon: test edilebilir. */
export function stepPush(s: PushState, pose: Pose | null): PushState {
  if (!pose) return { ...s, feedback: 'nobody' }
  if (pose.tilt > MAX_TILT_DEG) return { ...s, feedback: 'position', formOk: false }

  // Hafif yumuşatma: titremeyi alır, hızlı tekrarı kaçırmaz (yeni kare %60 ağırlıkta).
  const smooth = s.smooth == null ? pose.elbow : s.smooth * 0.4 + pose.elbow * 0.6
  const straight = pose.body >= STRAIGHT_DEG
  const minAngle = Math.min(s.minAngle, smooth)

  if (s.phase === 'up') {
    if (smooth <= DOWN_DEG)
      return { ...s, smooth, phase: 'down', minAngle: smooth, formOk: straight, feedback: straight ? 'ok' : 'straight' }
    // Biraz inip inmeden geri kalktı: yarım tekrar.
    if (smooth >= UP_DEG && s.minAngle < UP_DEG - 20)
      return { ...s, smooth, minAngle: 180, formOk: true, feedback: 'lower' }
    return {
      ...s,
      smooth,
      minAngle,
      feedback: !straight ? 'straight' : s.feedback === 'lower' && smooth >= UP_DEG ? 'lower' : 'ok',
    }
  }

  // Aşağıda: gövde inişin tamamında düz kalmalı.
  const formOk = s.formOk && straight
  if (smooth >= UP_DEG)
    return {
      ...s,
      smooth,
      phase: 'up',
      minAngle: 180,
      formOk: true,
      reps: formOk ? s.reps + 1 : s.reps,
      feedback: formOk ? 'ok' : 'straight',
    }
  return { ...s, smooth, minAngle, formOk, feedback: straight ? 'ok' : 'straight' }
}

export const FEEDBACK_TEXT: Record<Feedback, string> = {
  nobody: 'Tüm vücudun kadrajda görünsün',
  position: 'Şınav pozisyonuna geç',
  straight: 'Gövdeni düz tut',
  lower: 'Daha aşağı in',
  ok: 'İyi gidiyor',
}
