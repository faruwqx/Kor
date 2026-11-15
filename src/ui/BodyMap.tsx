/**
 * Vücut haritası: Luma AI figürünün karelerinden üretilen katmanlar.
 *  - base-front/back.webp: sönük (normal) figür.
 *  - g-{kas}-{view}.webp: o kasın glow'u (yalnızca ışık; base'ten farkı). Çalışılan kasın
 *    glow'u base üstüne screen ile bindirilir, opaklık yoğunlukla artar (seçiliyse tam).
 * Üstte şeffaf bir SVG dokunma katmanı seçimi, bölge kartını, aria'yı ve yoğunluğu sağlar.
 * Görseller tmp/glow.cjs ile üretildi (14 glow render'ı → base = piksel-min, diff = glow).
 */
import { MCAT_NAME } from '../lib/motra'

/** İnce kas kimliği → 0..1 yoğunluk. */
export type BodyLoad = Record<string, number>

const regionName = (g: string) =>
  MCAT_NAME[g] ?? (g === 'hyrox' ? 'Hyrox' : g === 'cardio' ? 'Kardiyo' : g)
const asset = (f: string) => `${import.meta.env.BASE_URL}body/${f}`

type E = [cx: number, cy: number, rx: number, ry: number]
type Region = { g: string; center?: boolean; hit: E[] }

// Hangi (kas, görünüm) için glow görseli var.
const GLOW = new Set([
  'chest-front', 'abs-front', 'obliques-front', 'quads-front', 'biceps-front',
  'shoulders-front', 'forearms-front', 'calves-front',
  'traps-back', 'lats-back', 'triceps-back', 'hamstrings-back', 'glutes-back',
  'lowerback-back', 'shoulders-back', 'forearms-back', 'calves-back',
])

// Dokunma elipsleri (görünmez). base-front 440×783, base-back 440×802; merkez x=220.
const FRONT: Region[] = [
  { g: 'traps', center: true, hit: [[220, 195, 42, 18]] },
  { g: 'shoulders', hit: [[120, 236, 38, 42]] },
  { g: 'chest', hit: [[176, 256, 42, 42]] },
  { g: 'biceps', hit: [[92, 336, 28, 52]] },
  { g: 'forearms', hit: [[62, 452, 24, 50]] },
  { g: 'abs', center: true, hit: [[220, 372, 42, 80]] },
  { g: 'obliques', hit: [[178, 376, 20, 54]] },
  { g: 'quads', hit: [[178, 560, 44, 96]] },
  { g: 'calves', hit: [[186, 715, 28, 62]] },
]
const BACK: Region[] = [
  { g: 'traps', center: true, hit: [[220, 236, 62, 50]] },
  { g: 'shoulders', hit: [[120, 240, 38, 42]] },
  { g: 'lats', hit: [[178, 322, 46, 66]] },
  { g: 'triceps', hit: [[92, 336, 28, 52]] },
  { g: 'forearms', hit: [[62, 452, 24, 50]] },
  { g: 'lowerback', center: true, hit: [[220, 402, 38, 38]] },
  { g: 'glutes', hit: [[180, 456, 44, 44]] },
  { g: 'hamstrings', hit: [[180, 576, 44, 94]] },
  { g: 'calves', hit: [[186, 715, 28, 62]] },
]

function Hit({ region, w }: { region: Region; w: number }) {
  return (
    <>
      {region.hit.map(([cx, cy, rx, ry], i) => (
        <ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry} />
      ))}
      {!region.center &&
        region.hit.map(([cx, cy, rx, ry], i) => (
          <ellipse key={'m' + i} cx={w - cx} cy={cy} rx={rx} ry={ry} />
        ))}
    </>
  )
}

function Figure({
  view,
  vb,
  regions,
  load,
  selected,
  onSelect,
}: {
  view: 'front' | 'back'
  vb: [number, number]
  regions: Region[]
  load: BodyLoad
  selected?: string | null
  onSelect?: (g: string | null) => void
}) {
  return (
    <div className="bodyfig">
      <img className="bodybase" src={asset(`base-${view}.webp`)} alt="" />
      {regions.map((r) => {
        if (!GLOW.has(`${r.g}-${view}`)) return null
        const active = selected === r.g
        const i = Math.max(0, Math.min(1, load[r.g] ?? 0))
        const op = active ? 1 : i <= 0.001 ? 0 : 0.35 + i * 0.65
        if (op <= 0) return null
        return (
          <img
            key={r.g}
            className="bodyglow"
            src={asset(`g-${r.g}-${view}.webp`)}
            alt=""
            style={{ opacity: op }}
            loading="lazy"
          />
        )
      })}
      <svg className="bodyhit" viewBox={`0 0 ${vb[0]} ${vb[1]}`} preserveAspectRatio="none">
        {regions.map((r) => {
          const active = selected === r.g
          return (
            <g
              key={r.g}
              role="button"
              tabIndex={0}
              aria-label={regionName(r.g)}
              aria-pressed={active}
              fill="#000"
              fillOpacity={0.001}
              style={{ cursor: 'pointer', pointerEvents: 'all' }}
              onClick={(e) => {
                e.stopPropagation()
                onSelect?.(active ? null : r.g)
              }}
            >
              <Hit region={r} w={vb[0]} />
            </g>
          )
        })}
      </svg>
    </div>
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
        <Figure view="front" vb={[440, 783]} regions={FRONT} load={load} selected={selected} onSelect={onSelect} />
      </div>
      <div className="bodymap__fig">
        <Figure view="back" vb={[440, 802]} regions={BACK} load={load} selected={selected} onSelect={onSelect} />
      </div>
    </div>
  )
}
