/**
 * Çalışılan bölgeleri gösteren anatomik vücut haritası: ön ve arka görünüm, her kas
 * grubu ayrı çizilir ve o grubu bu dönemde ne kadar çalıştığına göre soluk griden
 * vurgu rengine ("kor") doğru boyanır. Yoğunluk, grup hacminin en yüksek gruba
 * oranıdır (0–1). Trends ekranı besler.
 *
 * Her kas şekli bir LOAD_GROUPS kimliğine bağlıdır: back, shoulders, core, arms,
 * chest, legs. İnce kaslar (pec, delt, quad, baldır…) ait oldukları grubun
 * yoğunluğuyla boyanır.
 */

/** LOAD_GROUPS kimliği → 0..1 yoğunluk. */
export type BodyLoad = Record<string, number>

/** Grubu yoğunluğa göre doldurur: 0 → nötr kas, 1 → tam vurgu. */
function fill(load: BodyLoad, g: string): string {
  const i = Math.max(0, Math.min(1, load[g] ?? 0))
  if (i <= 0.001) return 'var(--raised)'
  const pct = Math.round(22 + i * 70)
  return `color-mix(in srgb, var(--accent) ${pct}%, var(--control))`
}

type P = { d: string; g?: string } // g yoksa nötr (baş, boyun, el)

// viewBox 0 0 120 280, x=60 merkez. Soldaki kaslar; sağ taraf x'=120-x ile aynalanır.
const FRONT: P[] = [
  // Baş + boyun (nötr)
  { d: 'M60 8 a12 12 0 0 1 0 24 a12 12 0 0 1 0 -24 z' },
  { d: 'M54 31 q6 4 12 0 l1 7 q-7 4 -14 0 z' },
  // Trapez üstü (omuz grubu, boyun yanı)
  { d: 'M54 38 q-10 0 -17 6 q10 2 18 -1 z', g: 'shoulders' },
  { d: 'M66 38 q10 0 17 6 q-10 2 -18 -1 z', g: 'shoulders' },
  // Deltalar (omuz)
  { d: 'M37 44 q-10 1 -12 15 q9 4 15 -2 q2 -9 -3 -13 z', g: 'shoulders' },
  { d: 'M83 44 q10 1 12 15 q-9 4 -15 -2 q-2 -9 3 -13 z', g: 'shoulders' },
  // Göğüs (pecs)
  { d: 'M58 42 q-17 0 -22 9 q-1 11 7 15 q12 3 15 -5 z', g: 'chest' },
  { d: 'M62 42 q17 0 22 9 q1 11 -7 15 q-12 3 -15 -5 z', g: 'chest' },
  // Karın (core) — orta panel + 6-pack hissi stroke ile
  { d: 'M50 64 q10 4 20 0 l-2 20 q-8 4 -16 0 z', g: 'core' },
  { d: 'M50 86 q10 4 20 0 l-3 22 q-7 4 -14 0 z', g: 'core' },
  // Oblikler (core, yan)
  { d: 'M48 66 q-5 16 1 38 l3 -2 q-3 -18 -1 -34 z', g: 'core' },
  { d: 'M72 66 q5 16 -1 38 l-3 -2 q3 -18 1 -34 z', g: 'core' },
  // Üst kol / biceps (arms)
  { d: 'M24 60 q-7 2 -7 15 l3 21 q6 2 9 -3 l-1 -30 q-2 -5 -4 -3 z', g: 'arms' },
  { d: 'M96 60 q7 2 7 15 l-3 21 q-6 2 -9 -3 l1 -30 q2 -5 4 -3 z', g: 'arms' },
  // Ön kol (arms)
  { d: 'M20 97 q-3 15 1 29 q5 2 8 -1 l1 -27 q-5 -3 -10 -1 z', g: 'arms' },
  { d: 'M100 97 q3 15 -1 29 q-5 2 -8 -1 l-1 -27 q5 -3 10 -1 z', g: 'arms' },
  // Eller (nötr)
  { d: 'M20 127 q-2 8 3 12 q5 -1 6 -6 z' },
  { d: 'M100 127 q2 8 -3 12 q-5 -1 -6 -6 z' },
  // Üst bacak / quadriceps (legs)
  { d: 'M47 110 q-8 2 -9 18 l5 40 q8 3 12 -2 l-1 -54 q-3 -4 -7 -2 z', g: 'legs' },
  { d: 'M73 110 q8 2 9 18 l-5 40 q-8 3 -12 -2 l1 -54 q3 -4 7 -2 z', g: 'legs' },
  // Alt bacak / baldır önü (legs)
  { d: 'M45 170 q-3 22 1 44 q6 2 9 -1 l1 -42 q-6 -3 -11 -1 z', g: 'legs' },
  { d: 'M75 170 q3 22 -1 44 q-6 2 -9 -1 l-1 -42 q6 -3 11 -1 z', g: 'legs' },
]

const BACK: P[] = [
  // Baş + boyun (nötr)
  { d: 'M60 8 a12 12 0 0 1 0 24 a12 12 0 0 1 0 -24 z' },
  { d: 'M54 31 q6 4 12 0 l1 7 q-7 4 -14 0 z' },
  // Trapez (back) — üst sırt elması
  { d: 'M60 37 q-18 2 -24 9 q10 5 24 5 q14 0 24 -5 q-6 -7 -24 -9 z', g: 'back' },
  // Deltalar arka (omuz)
  { d: 'M37 45 q-10 1 -12 15 q9 4 15 -2 q2 -9 -3 -13 z', g: 'shoulders' },
  { d: 'M83 45 q10 1 12 15 q-9 4 -15 -2 q-2 -9 3 -13 z', g: 'shoulders' },
  // Lat kanatları (back)
  { d: 'M58 52 q-16 2 -20 14 q-1 14 8 22 q11 -2 13 -12 z', g: 'back' },
  { d: 'M62 52 q16 2 20 14 q1 14 -8 22 q-11 -2 -13 -12 z', g: 'back' },
  // Bel / alt sırt (back)
  { d: 'M50 90 q10 4 20 0 l-3 18 q-7 4 -14 0 z', g: 'back' },
  // Triceps (arms)
  { d: 'M24 60 q-7 2 -7 15 l3 21 q6 2 9 -3 l-1 -30 q-2 -5 -4 -3 z', g: 'arms' },
  { d: 'M96 60 q7 2 7 15 l-3 21 q-6 2 -9 -3 l1 -30 q2 -5 4 -3 z', g: 'arms' },
  // Ön kol arka (arms)
  { d: 'M20 97 q-3 15 1 29 q5 2 8 -1 l1 -27 q-5 -3 -10 -1 z', g: 'arms' },
  { d: 'M100 97 q3 15 -1 29 q-5 2 -8 -1 l-1 -27 q5 -3 10 -1 z', g: 'arms' },
  // Eller (nötr)
  { d: 'M20 127 q-2 8 3 12 q5 -1 6 -6 z' },
  { d: 'M100 127 q2 8 -3 12 q-5 -1 -6 -6 z' },
  // Kalça / glutes (legs)
  { d: 'M59 110 q-11 0 -14 10 q1 10 13 11 z', g: 'legs' },
  { d: 'M61 110 q11 0 14 10 q-1 10 -13 11 z', g: 'legs' },
  // Arka bacak / hamstring (legs)
  { d: 'M47 132 q-8 2 -9 16 l5 36 q8 3 12 -2 l-1 -48 q-3 -4 -7 -2 z', g: 'legs' },
  { d: 'M73 132 q8 2 9 16 l-5 36 q-8 3 -12 -2 l1 -48 q3 -4 7 -2 z', g: 'legs' },
  // Baldır arka (legs)
  { d: 'M45 186 q-3 20 1 40 q6 2 9 -1 l1 -38 q-6 -3 -11 -1 z', g: 'legs' },
  { d: 'M75 186 q3 20 -1 40 q-6 2 -9 -1 l-1 -38 q6 -3 11 -1 z', g: 'legs' },
]

function Figure({ load, parts }: { load: BodyLoad; parts: P[] }) {
  return (
    <svg viewBox="0 0 120 232" width="100%" height="100%" aria-hidden="true">
      {parts.map((p, i) => (
        <path
          key={i}
          d={p.d}
          fill={p.g ? fill(load, p.g) : 'var(--raised)'}
          stroke="var(--ground)"
          strokeWidth={1.2}
          strokeLinejoin="round"
        />
      ))}
    </svg>
  )
}

export function BodyMap({ load }: { load: BodyLoad }) {
  return (
    <div className="bodymap">
      <div className="bodymap__fig">
        <Figure load={load} parts={FRONT} />
      </div>
      <div className="bodymap__fig">
        <Figure load={load} parts={BACK} />
      </div>
    </div>
  )
}
