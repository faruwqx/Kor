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
  { g: 'traps', center: true, e: [[213, 200, 38, 15]] },
  { g: 'shoulders', e: [[92, 236, 30, 34]] },
  { g: 'chest', e: [[152, 252, 30, 26], [160, 290, 26, 20]] },
  { g: 'biceps', e: [[72, 322, 22, 44]] },
  { g: 'forearms', e: [[50, 430, 19, 42]] },
  { g: 'abs', center: true, e: [[213, 312, 28, 18], [213, 352, 28, 18], [213, 394, 30, 24]] },
  { g: 'obliques', e: [[160, 362, 15, 44]] },
  { g: 'quads', e: [[168, 548, 33, 80]] },
  { g: 'calves', e: [[158, 740, 24, 54]] },
]
const BACK: Region[] = [
  { g: 'traps', center: true, e: [[213, 214, 52, 24], [213, 258, 32, 20]] },
  { g: 'shoulders', e: [[92, 240, 30, 34]] },
  { g: 'lats', e: [[152, 296, 38, 54]] },
  { g: 'triceps', e: [[70, 322, 22, 44]] },
  { g: 'forearms', e: [[47, 430, 19, 42]] },
  { g: 'lowerback', center: true, e: [[213, 382, 28, 28]] },
  { g: 'glutes', e: [[160, 442, 38, 38]] },
  { g: 'hamstrings', e: [[165, 556, 33, 78]] },
  { g: 'calves', e: [[158, 740, 24, 54]] },
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
      <svg viewBox={`0 0 ${w} 832`} preserveAspectRatio="xMidYMin meet">
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
