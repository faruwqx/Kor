/**
 * Çalışılan bölgeleri gösteren anatomik vücut haritası: ön ve arka görünüm, her kas
 * ayrı çizilir ve o kası bu dönemde ne kadar çalıştığına göre soluk griden vurgu
 * rengine ("kor") doğru boyanır. Bir kasa dokununca o kasın tüm parçaları (sol+sağ,
 * ön+arka) birlikte seçilir; seçili bölge tam vurgu + konturla, diğerleri soluk
 * görünür. Seçimi Trends ekranı dinler ve altında bir bilgi kartı açar.
 */
import { MCAT_NAME } from '../lib/motra'

/** İnce kas kimliği → 0..1 yoğunluk. */
export type BodyLoad = Record<string, number>

const regionName = (g: string) =>
  MCAT_NAME[g] ?? (g === 'hyrox' ? 'Hyrox' : g === 'cardio' ? 'Kardiyo' : g)

/** Kası yoğunluğa göre doldurur: 0 → nötr kas, 1 → tam vurgu. */
function fill(load: BodyLoad, g: string): string {
  const i = Math.max(0, Math.min(1, load[g] ?? 0))
  if (i <= 0.001) return 'var(--raised)'
  const pct = Math.round(22 + i * 70)
  return `color-mix(in srgb, var(--accent) ${pct}%, var(--control))`
}

type P = { d: string; g?: string } // g yoksa nötr (baş, boyun, el)

// viewBox 0 0 120 232, x=60 merkez.
const FRONT: P[] = [
  { d: 'M60 8 a12 12 0 0 1 0 24 a12 12 0 0 1 0 -24 z' },
  { d: 'M54 31 q6 4 12 0 l1 7 q-7 4 -14 0 z' },
  { d: 'M54 38 q-10 0 -17 6 q10 2 18 -1 z', g: 'shoulders' },
  { d: 'M66 38 q10 0 17 6 q-10 2 -18 -1 z', g: 'shoulders' },
  { d: 'M37 44 q-10 1 -12 15 q9 4 15 -2 q2 -9 -3 -13 z', g: 'shoulders' },
  { d: 'M83 44 q10 1 12 15 q-9 4 -15 -2 q-2 -9 3 -13 z', g: 'shoulders' },
  { d: 'M58 42 q-17 0 -22 9 q-1 11 7 15 q12 3 15 -5 z', g: 'chest' },
  { d: 'M62 42 q17 0 22 9 q1 11 -7 15 q-12 3 -15 -5 z', g: 'chest' },
  { d: 'M50 64 q10 4 20 0 l-2 20 q-8 4 -16 0 z', g: 'abs' },
  { d: 'M50 86 q10 4 20 0 l-3 22 q-7 4 -14 0 z', g: 'abs' },
  { d: 'M48 66 q-5 16 1 38 l3 -2 q-3 -18 -1 -34 z', g: 'obliques' },
  { d: 'M72 66 q5 16 -1 38 l-3 -2 q3 -18 1 -34 z', g: 'obliques' },
  { d: 'M24 60 q-7 2 -7 15 l3 21 q6 2 9 -3 l-1 -30 q-2 -5 -4 -3 z', g: 'biceps' },
  { d: 'M96 60 q7 2 7 15 l-3 21 q-6 2 -9 -3 l1 -30 q2 -5 4 -3 z', g: 'biceps' },
  { d: 'M20 97 q-3 15 1 29 q5 2 8 -1 l1 -27 q-5 -3 -10 -1 z', g: 'forearms' },
  { d: 'M100 97 q3 15 -1 29 q-5 2 -8 -1 l-1 -27 q5 -3 10 -1 z', g: 'forearms' },
  { d: 'M20 127 q-2 8 3 12 q5 -1 6 -6 z' },
  { d: 'M100 127 q2 8 -3 12 q-5 -1 -6 -6 z' },
  { d: 'M47 110 q-8 2 -9 18 l5 40 q8 3 12 -2 l-1 -54 q-3 -4 -7 -2 z', g: 'quads' },
  { d: 'M73 110 q8 2 9 18 l-5 40 q-8 3 -12 -2 l1 -54 q3 -4 7 -2 z', g: 'quads' },
  { d: 'M45 170 q-3 22 1 44 q6 2 9 -1 l1 -42 q-6 -3 -11 -1 z', g: 'calves' },
  { d: 'M75 170 q3 22 -1 44 q-6 2 -9 -1 l-1 -42 q6 -3 11 -1 z', g: 'calves' },
]

const BACK: P[] = [
  { d: 'M60 8 a12 12 0 0 1 0 24 a12 12 0 0 1 0 -24 z' },
  { d: 'M54 31 q6 4 12 0 l1 7 q-7 4 -14 0 z' },
  { d: 'M60 37 q-18 2 -24 9 q10 5 24 5 q14 0 24 -5 q-6 -7 -24 -9 z', g: 'traps' },
  { d: 'M37 45 q-10 1 -12 15 q9 4 15 -2 q2 -9 -3 -13 z', g: 'shoulders' },
  { d: 'M83 45 q10 1 12 15 q-9 4 -15 -2 q-2 -9 3 -13 z', g: 'shoulders' },
  { d: 'M58 52 q-16 2 -20 14 q-1 14 8 22 q11 -2 13 -12 z', g: 'lats' },
  { d: 'M62 52 q16 2 20 14 q1 14 -8 22 q-11 -2 -13 -12 z', g: 'lats' },
  { d: 'M50 90 q10 4 20 0 l-3 18 q-7 4 -14 0 z', g: 'lowerback' },
  { d: 'M24 60 q-7 2 -7 15 l3 21 q6 2 9 -3 l-1 -30 q-2 -5 -4 -3 z', g: 'triceps' },
  { d: 'M96 60 q7 2 7 15 l-3 21 q-6 2 -9 -3 l1 -30 q2 -5 4 -3 z', g: 'triceps' },
  { d: 'M20 97 q-3 15 1 29 q5 2 8 -1 l1 -27 q-5 -3 -10 -1 z', g: 'forearms' },
  { d: 'M100 97 q3 15 -1 29 q-5 2 -8 -1 l-1 -27 q5 -3 10 -1 z', g: 'forearms' },
  { d: 'M20 127 q-2 8 3 12 q5 -1 6 -6 z' },
  { d: 'M100 127 q2 8 -3 12 q-5 -1 -6 -6 z' },
  { d: 'M59 110 q-11 0 -14 10 q1 10 13 11 z', g: 'glutes' },
  { d: 'M61 110 q11 0 14 10 q-1 10 -13 11 z', g: 'glutes' },
  { d: 'M47 132 q-8 2 -9 16 l5 36 q8 3 12 -2 l-1 -48 q-3 -4 -7 -2 z', g: 'hamstrings' },
  { d: 'M73 132 q8 2 9 16 l-5 36 q-8 3 -12 -2 l1 -48 q3 -4 7 -2 z', g: 'hamstrings' },
  { d: 'M45 186 q-3 20 1 40 q6 2 9 -1 l1 -38 q-6 -3 -11 -1 z', g: 'calves' },
  { d: 'M75 186 q3 20 -1 40 q-6 2 -9 -1 l-1 -38 q6 -3 11 -1 z', g: 'calves' },
]

function Figure({
  load,
  parts,
  selected,
  onSelect,
}: {
  load: BodyLoad
  parts: P[]
  selected?: string | null
  onSelect?: (g: string | null) => void
}) {
  return (
    <svg viewBox="0 0 120 232" width="100%" height="100%">
      {parts.map((p, i) => {
        if (!p.g)
          return (
            <path
              key={i}
              d={p.d}
              fill="var(--raised)"
              stroke="var(--ground)"
              strokeWidth={1.2}
              strokeLinejoin="round"
            />
          )
        const active = selected === p.g
        const dim = !!selected && !active
        return (
          <path
            key={i}
            d={p.d}
            role="button"
            tabIndex={0}
            aria-label={regionName(p.g)}
            aria-pressed={active}
            fill={active ? 'var(--accent)' : fill(load, p.g)}
            fillOpacity={dim ? 0.35 : 1}
            stroke="var(--ground)"
            strokeWidth={active ? 2.4 : 1.2}
            strokeLinejoin="round"
            style={{ cursor: 'pointer', pointerEvents: 'all' }}
            onClick={(e) => {
              e.stopPropagation()
              onSelect?.(active ? null : p.g!)
            }}
          />
        )
      })}
    </svg>
  )
}

export function BodyMap({
  load,
  selected,
  onSelect,
}: {
  load: BodyLoad
  selected?: string | null
  onSelect?: (g: string | null) => void
}) {
  return (
    <div className="bodymap" onClick={() => onSelect?.(null)}>
      <div className="bodymap__fig">
        <Figure load={load} parts={FRONT} selected={selected} onSelect={onSelect} />
      </div>
      <div className="bodymap__fig">
        <Figure load={load} parts={BACK} selected={selected} onSelect={onSelect} />
      </div>
    </div>
  )
}
