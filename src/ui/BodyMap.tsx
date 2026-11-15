/**
 * Vücut haritası: Luma AI figürü (public/body/body-front.webp, body-back.webp) <img> ile
 * gösterilir; üstüne aynı viewBox'ta şeffaf bir SVG katmanı konur. Her kas için görseldeki
 * kasın sınırına oturan path(ler) vardır; çalışılan kas o bölgenin yoğunluğuna göre
 * var(--accent) ile parlar (feGaussianBlur dış parlama), çalışılmayan kas şeffaf kalır.
 * Sol taraf çizilip sağ taraf aynalanır. Dokununca seçme, bölge kartı, aria ve yoğunluk korunur.
 *
 * Path'ler figürün üstüne render edilip ekran görüntüsüyle kas çizgilerine hizalandı
 * (bkz. tmp/align.html).
 */
import { MCAT_NAME } from '../lib/motra'

/** İnce kas kimliği → 0..1 yoğunluk. */
export type BodyLoad = Record<string, number>

const regionName = (g: string) =>
  MCAT_NAME[g] ?? (g === 'hyrox' ? 'Hyrox' : g === 'cardio' ? 'Kardiyo' : g)

const asset = (f: string) => `${import.meta.env.BASE_URL}body/${f}`

type Region = { g: string; center?: boolean; d: string[] }

// Sol-yarı kas konturları (merkez olmayanlar x'=W-x ile aynalanır). viewBox ön 426×832, arka 425×832.
const FRONT: Region[] = [
  { g: 'traps', center: true, d: ['M170 210 Q213 198 256 210 Q249 223 213 223 Q177 223 170 210 Z'] },
  { g: 'chest', d: ['M211 230 Q150 228 126 251 Q119 287 151 301 Q197 303 211 291 Z'] },
  { g: 'shoulders', d: ['M127 247 Q95 243 85 269 Q84 294 105 299 Q123 295 129 276 Z'] },
  { g: 'biceps', d: ['M96 301 Q77 307 75 335 Q77 368 96 376 Q113 369 112 340 Q112 312 96 301 Z'] },
  { g: 'forearms', d: ['M76 378 Q61 390 59 418 Q61 455 80 464 Q97 457 94 420 Q90 393 76 378 Z'] },
  { g: 'abs', center: true, d: ['M186 306 Q213 300 240 306 L238 432 Q213 444 188 432 Z'] },
  { g: 'obliques', d: ['M184 322 Q167 332 165 362 Q165 402 184 426 L191 421 Q176 390 179 331 Z'] },
  { g: 'quads', d: ['M151 462 Q127 471 125 521 L140 632 Q167 650 183 633 L187 500 Q181 468 151 462 Z'] },
  { g: 'calves', d: ['M146 690 Q129 700 129 741 L140 800 Q161 810 173 797 L175 730 Q168 698 146 690 Z'] },
]
const BACK: Region[] = [
  { g: 'traps', center: true, d: ['M213 205 Q150 214 136 250 Q170 272 213 272 Q256 272 290 250 Q276 214 213 205 Z'] },
  { g: 'shoulders', d: ['M127 250 Q95 246 85 272 Q84 297 105 302 Q123 298 129 279 Z'] },
  { g: 'lats', d: ['M208 268 Q160 274 142 316 Q148 360 186 372 Q206 360 210 322 Z'] },
  { g: 'triceps', d: ['M96 301 Q77 307 75 335 Q77 368 96 376 Q113 369 112 340 Q112 312 96 301 Z'] },
  { g: 'forearms', d: ['M76 378 Q61 390 59 418 Q61 455 80 464 Q97 457 94 420 Q90 393 76 378 Z'] },
  { g: 'lowerback', center: true, d: ['M188 360 Q213 354 238 360 L236 418 Q213 428 190 418 Z'] },
  { g: 'glutes', d: ['M211 428 Q170 428 160 458 Q162 490 200 494 Q210 480 211 456 Z'] },
  { g: 'hamstrings', d: ['M150 500 Q128 508 127 556 L140 648 Q166 664 182 648 L186 536 Q180 505 150 500 Z'] },
  { g: 'calves', d: ['M146 690 Q129 700 129 741 L140 800 Q161 810 173 797 L175 730 Q168 698 146 690 Z'] },
]

function Shapes({ region, w }: { region: Region; w: number }) {
  return (
    <>
      {region.d.map((d, i) => (
        <path key={i} d={d} />
      ))}
      {!region.center && (
        <g transform={`translate(${w},0) scale(-1,1)`}>
          {region.d.map((d, i) => (
            <path key={i} d={d} />
          ))}
        </g>
      )}
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
          <filter id="mglow" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="6" />
          </filter>
        </defs>
        {regions.map((region) => {
          const active = selected === region.g
          const i = Math.max(0, Math.min(1, load[region.g] ?? 0))
          const op = active ? 0.9 : i <= 0.001 ? 0 : 0.4 + i * 0.5
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
              <g fill="#000" fillOpacity={0.001}>
                <Shapes region={region} w={w} />
              </g>
              {op > 0 && (
                <>
                  <g fill="var(--accent)" fillOpacity={op * 0.5} filter="url(#mglow)">
                    <Shapes region={region} w={w} />
                  </g>
                  <g fill="var(--accent)" fillOpacity={op}>
                    <Shapes region={region} w={w} />
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
