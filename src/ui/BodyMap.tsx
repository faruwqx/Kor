/**
 * Vücut haritası: Luma AI figürü (public/body/body-front.webp, body-back.webp) <img> ile
 * gösterilir; üstüne aynı viewBox'ta şeffaf bir SVG katmanı konur. Her kas için görseldeki
 * kasa oturan elips(ler) vardır; çalışılan kas o bölgenin yoğunluğuna göre var(--accent)
 * ile parlar (feGaussianBlur dış parlama), çalışılmayan kas şeffaf kalır (figür aynen görünür).
 * Dokununca seçme, bölge bilgi kartı, aria etiketleri ve yoğunluk hesabı korunur.
 *
 * Elips konumları figürün üstüne render edilip ekran görüntüsüyle hizalandı (tmp/align.html).
 */
import { MCAT_NAME } from '../lib/motra'

/** İnce kas kimliği → 0..1 yoğunluk. */
export type BodyLoad = Record<string, number>

const regionName = (g: string) =>
  MCAT_NAME[g] ?? (g === 'hyrox' ? 'Hyrox' : g === 'cardio' ? 'Kardiyo' : g)

const asset = (f: string) => `${import.meta.env.BASE_URL}body/${f}`

type E = [cx: number, cy: number, rx: number, ry: number]
type Region = { g: string; center?: boolean; e: E[] }

// viewBox ön 426×748, arka 425×748. Merkez olmayan elipsler x'=W-cx ile aynalanır.
const FRONT: Region[] = [
  { g: 'traps', center: true, e: [[213, 205, 40, 16]] },
  { g: 'shoulders', e: [[95, 250, 34, 40]] },
  { g: 'chest', e: [[150, 238, 34, 30], [158, 278, 30, 22]] },
  { g: 'biceps', e: [[72, 335, 24, 46]] },
  { g: 'forearms', e: [[48, 445, 20, 44]] },
  { g: 'abs', center: true, e: [[213, 320, 30, 20], [213, 360, 30, 20], [213, 405, 32, 26]] },
  { g: 'obliques', e: [[158, 372, 16, 46]] },
  { g: 'quads', e: [[168, 560, 34, 80]] },
  { g: 'calves', e: [[150, 700, 22, 40]] },
]
const BACK: Region[] = [
  { g: 'traps', center: true, e: [[213, 222, 55, 26], [213, 265, 34, 22]] },
  { g: 'shoulders', e: [[92, 252, 34, 40]] },
  { g: 'lats', e: [[150, 300, 40, 56]] },
  { g: 'triceps', e: [[70, 335, 24, 46]] },
  { g: 'forearms', e: [[45, 445, 20, 44]] },
  { g: 'lowerback', center: true, e: [[213, 390, 30, 30]] },
  { g: 'glutes', e: [[160, 450, 40, 40]] },
  { g: 'hamstrings', e: [[165, 560, 34, 78]] },
  { g: 'calves', e: [[150, 700, 22, 40]] },
]

function Ellipses({ region, w }: { region: Region; w: number }) {
  return (
    <>
      {region.e.map(([cx, cy, rx, ry], i) => (
        <ellipse key={i} cx={cx} cy={cy} rx={rx} ry={ry} />
      ))}
      {!region.center &&
        region.e.map(([cx, cy, rx, ry], i) => (
          <ellipse key={'m' + i} cx={w - cx} cy={cy} rx={rx} ry={ry} />
        ))}
    </>
  )
}

function Overlay({
  regions,
  w,
  img,
  load,
  selected,
  onSelect,
}: {
  regions: Region[]
  w: number
  img: string
  load: BodyLoad
  selected?: string | null
  onSelect?: (g: string | null) => void
}) {
  return (
    <div className="bodyfig">
      <img src={img} alt="" />
      <svg viewBox={`0 0 ${w} 748`} preserveAspectRatio="xMidYMin meet">
        <defs>
          <filter id="mglow" x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="5" />
          </filter>
        </defs>
        {regions.map((region) => {
          const active = selected === region.g
          const i = Math.max(0, Math.min(1, load[region.g] ?? 0))
          const op = active ? 0.95 : i <= 0.001 ? 0 : 0.25 + i * 0.6
          return (
            <g
              key={region.g}
              role="button"
              tabIndex={0}
              aria-label={regionName(region.g)}
              aria-pressed={active}
              style={{ cursor: 'pointer', pointerEvents: 'all' }}
              onClick={(e) => {
                e.stopPropagation()
                onSelect?.(active ? null : region.g)
              }}
            >
              {/* görünmez tıklama alanı (şeffaf olsa da yakalasın) */}
              <g fill="#000" fillOpacity={0.001}>
                <Ellipses region={region} w={w} />
              </g>
              {op > 0 && (
                <>
                  <g fill="var(--accent)" fillOpacity={op * 0.55} filter="url(#mglow)">
                    <Ellipses region={region} w={w} />
                  </g>
                  <g fill="var(--accent)" fillOpacity={op}>
                    <Ellipses region={region} w={w} />
                  </g>
                </>
              )}
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
        <Overlay regions={FRONT} w={426} img={asset('body-front.webp')} load={load} selected={selected} onSelect={onSelect} />
      </div>
      <div className="bodymap__fig">
        <Overlay regions={BACK} w={425} img={asset('body-back.webp')} load={load} selected={selected} onSelect={onSelect} />
      </div>
    </div>
  )
}
