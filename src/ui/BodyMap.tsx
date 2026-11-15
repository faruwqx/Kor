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
  { g: 'traps', center: true, e: [[213, 198, 46, 16]] },
  { g: 'shoulders', e: [[90, 238, 34, 38]] },
  { g: 'chest', e: [[150, 268, 40, 44]] },
  { g: 'biceps', e: [[70, 330, 26, 52]] },
  { g: 'forearms', e: [[48, 432, 22, 48]] },
  { g: 'abs', center: true, e: [[213, 352, 40, 84]] },
  { g: 'obliques', e: [[162, 360, 18, 52]] },
  { g: 'quads', e: [[166, 548, 40, 92]] },
  { g: 'calves', e: [[158, 735, 26, 58]] },
]
const BACK: Region[] = [
  { g: 'traps', center: true, e: [[213, 236, 60, 48]] },
  { g: 'shoulders', e: [[90, 242, 34, 38]] },
  { g: 'lats', e: [[150, 312, 44, 66]] },
  { g: 'triceps', e: [[70, 330, 26, 52]] },
  { g: 'forearms', e: [[47, 432, 22, 48]] },
  { g: 'lowerback', center: true, e: [[213, 388, 34, 34]] },
  { g: 'glutes', e: [[158, 446, 42, 44]] },
  { g: 'hamstrings', e: [[165, 560, 40, 90]] },
  { g: 'calves', e: [[158, 735, 26, 58]] },
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
          const op = active ? 0.95 : i <= 0.001 ? 0 : 0.4 + i * 0.5
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
