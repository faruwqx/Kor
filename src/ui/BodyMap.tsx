/**
 * Çalışılan bölgeleri gösteren anatomik vücut haritası: ön ve arka görünüm, her kas
 * ayrı path ve anatomik biçimde çizilir; sol taraf çizilip sağ taraf aynalanır. Kas,
 * o bölgeyi bu dönemde ne kadar çalıştığına göre soluk kastan vurgu rengine ("kor")
 * doğru boyanır. Bir kasa dokununca o kasın tüm parçaları (sol+sağ, ön+arka) seçilir;
 * seçili bölge tam vurgu + kontur, diğerleri soluk. Ön başta yüz (Face) gösterilir.
 *
 * Path verisi tarayıcıda render edilip oran/simetri için düzeltildi (bkz. tmp/fig.html).
 */
import { MCAT_NAME } from '../lib/motra'
import { DEFAULT_FACE, FaceGlyph } from './Face'
import type { FaceConfig } from '../lib/types'

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

type P = { d: string; g?: string } // g yoksa nötr (baş, boyun, el, ayak)

// Sol-yarı şekiller (merkez x=60'ta birleşir); her biri bir kez çizilir, bir kez aynalanır.
// viewBox 0 0 120 244.
const FRONT: P[] = [
  { d: 'M60 9 a11 11 0 0 1 0 22 a11 11 0 0 1 0 -22 z' },
  { d: 'M55 30 q5 3 10 0 l1 7 q-6 4 -12 0 z' },
  { d: 'M60 33 Q50 35 41 43 Q51 37 60 37 Z', g: 'traps' },
  { d: 'M41 41 q-14 1 -17 16 q4 7 13 5 q8 -2 10 -10 q0 -8 -6 -11 z', g: 'shoulders' },
  { d: 'M60 40 Q44 40 37 50 Q42 57 52 57 Q59 56 60 50 Z', g: 'chest' },
  { d: 'M60 52 Q50 59 39 57 Q46 66 58 65 Q60 59 60 54 Z', g: 'chest' },
  { d: 'M31 55 q-10 2 -11 16 l3 20 q7 2 11 -3 l-1 -30 q-1 -4 -2 -3 z', g: 'biceps' },
  { d: 'M24 91 q-4 14 -1 28 q6 2 10 -1 l2 -26 q-6 -3 -11 -1 z', g: 'forearms' },
  { d: 'M24 119 q-3 9 2 14 q7 -1 9 -7 z' },
  { d: 'M49 58 q-6 11 -4 27 l5 -2 q-2 -14 2 -23 z', g: 'obliques' },
  { d: 'M50 62 q8 2 10 0 l0 9 q-5 2 -10 0 z', g: 'abs' },
  { d: 'M50 74 q8 2 10 0 l0 9 q-5 2 -10 0 z', g: 'abs' },
  { d: 'M50 86 q8 2 10 0 l0 12 q-5 3 -10 1 z', g: 'abs' },
  { d: 'M49 109 q-12 3 -11 21 l5 37 q7 2 11 -3 l-1 -52 q-2 -4 -4 -3 z', g: 'quads' },
  { d: 'M60 111 q-8 2 -10 18 l3 41 q5 2 7 -1 l0 -56 z', g: 'quads' },
  { d: 'M47 171 q-5 22 -1 45 q6 2 10 -1 l2 -43 q-6 -3 -12 -1 z', g: 'calves' },
  { d: 'M47 217 q-4 8 0 14 l14 0 q1 -6 -3 -12 z' },
]
const BACK: P[] = [
  { d: 'M60 9 a11 11 0 0 1 0 22 a11 11 0 0 1 0 -22 z' },
  { d: 'M55 30 q5 3 10 0 l1 7 q-6 4 -12 0 z' },
  { d: 'M60 8 Q48 9 46 18 Q54 11 60 12 Z' },
  { d: 'M60 34 Q47 37 41 46 Q52 44 60 44 Z', g: 'traps' },
  { d: 'M60 45 Q51 47 45 57 Q53 55 60 55 Z', g: 'traps' },
  { d: 'M41 44 q-14 1 -17 16 q4 7 13 5 q8 -2 10 -10 q0 -8 -6 -11 z', g: 'shoulders' },
  { d: 'M60 50 Q44 54 39 69 Q42 84 54 87 Q60 83 60 70 Z', g: 'lats' },
  { d: 'M31 55 q-10 2 -11 16 l3 20 q7 2 11 -3 l-1 -30 q-1 -4 -2 -3 z', g: 'triceps' },
  { d: 'M24 91 q-4 14 -1 28 q6 2 10 -1 l2 -26 q-6 -3 -11 -1 z', g: 'forearms' },
  { d: 'M24 119 q-3 9 2 14 q7 -1 9 -7 z' },
  { d: 'M51 88 q9 2 9 0 l0 18 q-5 2 -9 0 z', g: 'lowerback' },
  { d: 'M60 107 Q45 107 42 121 Q45 134 60 134 Z', g: 'glutes' },
  { d: 'M49 133 q-12 3 -10 19 l5 35 q7 2 11 -3 l-1 -48 q-2 -4 -5 -3 z', g: 'hamstrings' },
  { d: 'M47 187 q-5 20 -1 41 q6 2 10 -1 l2 -39 q-6 -3 -12 -1 z', g: 'calves' },
  { d: 'M47 228 q-4 6 0 10 l14 0 q1 -5 -3 -10 z' },
]

function Muscle({
  p,
  load,
  selected,
  onSelect,
  mirror,
}: {
  p: P
  load: BodyLoad
  selected?: string | null
  onSelect?: (g: string | null) => void
  mirror?: boolean
}) {
  const common = mirror ? { transform: 'translate(120,0) scale(-1,1)' } : {}
  if (!p.g)
    return (
      <path
        d={p.d}
        fill="var(--raised)"
        stroke="var(--ground)"
        strokeWidth={1}
        strokeLinejoin="round"
        {...common}
      />
    )
  const active = selected === p.g
  const dim = !!selected && !active
  return (
    <path
      d={p.d}
      role="button"
      tabIndex={0}
      aria-label={regionName(p.g)}
      aria-pressed={active}
      fill={active ? 'var(--accent)' : fill(load, p.g)}
      fillOpacity={dim ? 0.35 : 1}
      stroke={active ? 'var(--ground)' : 'var(--sep, var(--ground))'}
      strokeWidth={active ? 1.8 : 0.8}
      strokeLinejoin="round"
      style={{ cursor: 'pointer', pointerEvents: 'all' }}
      onClick={(e) => {
        e.stopPropagation()
        onSelect?.(active ? null : p.g!)
      }}
      {...common}
    />
  )
}

function Figure({
  load,
  parts,
  selected,
  onSelect,
  face,
}: {
  load: BodyLoad
  parts: P[]
  selected?: string | null
  onSelect?: (g: string | null) => void
  face?: FaceConfig | null
}) {
  return (
    <svg viewBox="0 0 120 244" width="100%" height="100%">
      {parts.map((p, i) => (
        <Muscle key={i} p={p} load={load} selected={selected} onSelect={onSelect} />
      ))}
      {parts.map((p, i) => (
        <Muscle key={'m' + i} p={p} load={load} selected={selected} onSelect={onSelect} mirror />
      ))}
      {face && (
        <svg x="48" y="7" width="24" height="24" viewBox="0 0 40 40">
          <FaceGlyph config={face} />
        </svg>
      )}
    </svg>
  )
}

export function BodyMap({
  load,
  selected,
  onSelect,
  face,
}: {
  load: BodyLoad
  selected?: string | null
  onSelect?: (g: string | null) => void
  face?: FaceConfig
}) {
  return (
    <div className="bodymap" onClick={() => onSelect?.(null)}>
      <div className="bodymap__fig">
        <Figure load={load} parts={FRONT} selected={selected} onSelect={onSelect} face={face ?? DEFAULT_FACE} />
      </div>
      <div className="bodymap__fig">
        <Figure load={load} parts={BACK} selected={selected} onSelect={onSelect} />
      </div>
    </div>
  )
}
