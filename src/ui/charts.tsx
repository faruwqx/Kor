import { int, num1, shortDate } from '../lib/format'
import { imperial } from '../lib/units'
import type { WeekInfo } from '../lib/stats'
import { t } from '../lib/i18n'

/** Yuvarlak, eşit adımlı eksen: en üst çizgi verinin üstünde kalır. */
function niceScale(min: number, max: number, count = 3): { lo: number; hi: number; step: number } {
  if (max <= min) {
    max = min + 1
  }
  const raw = (max - min) / count
  const mag = 10 ** Math.floor(Math.log10(raw))
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw
  const lo = Math.floor(min / step) * step
  const hi = Math.ceil(max / step + 1e-9) * step
  return { lo, hi: hi === max ? hi + step : hi, step }
}

/** Tek seri, düz çizgi, dolgusuz. Son değer uçta yazılır. */
export function LineChart({
  points,
  unit,
  label,
}: {
  points: { at: number; value: number }[]
  unit: string
  label: string
}) {
  const W = 328
  const H = 168
  const L = 34
  const R = 12
  const T = 12
  const B = 22
  const values = points.map((p) => p.value)
  const { lo, hi, step } = niceScale(Math.min(...values), Math.max(...values))
  const t0 = points[0].at
  const t1 = points[points.length - 1].at
  const x = (at: number) => (t1 === t0 ? L + (W - L - R) / 2 : L + ((at - t0) / (t1 - t0)) * (W - L - R))
  const y = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B)
  const ticks: number[] = []
  for (let v = lo; v <= hi + 1e-9; v += step) ticks.push(v)
  const last = points[points.length - 1]
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      {ticks.map((v) => (
        <g key={v}>
          <line className="grid" x1={L} x2={W - R} y1={y(v)} y2={y(v)} />
          <text x={L - 8} y={y(v) + 4} textAnchor="end">
            {num1(v)}
          </text>
        </g>
      ))}
      {points.length > 1 && (
        <polyline
          points={points.map((p) => `${x(p.at).toFixed(1)},${y(p.value).toFixed(1)}`).join(' ')}
          fill="none"
          stroke="var(--accent)"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
      )}
      <circle cx={x(last.at)} cy={y(last.value)} r="4" fill="var(--accent)" />
      <text x={L} y={H - 4}>
        {shortDate(t0)}
      </text>
      {t1 !== t0 && (
        <text x={W - R} y={H - 4} textAnchor="end">
          {shortDate(t1)}
        </text>
      )}
      <title>{`${label}: ${num1(last.value)} ${unit}`}</title>
    </svg>
  )
}

/** Altı eksenli radar: her eksenin adı ve değeri köşesinde yazar. */
export function Radar({
  axes,
  label,
}: {
  axes: { name: string; value: number; text: string }[]
  label: string
}) {
  const cx = 164
  const cy = 132
  const r = 82
  const max = Math.max(1e-9, ...axes.map((a) => a.value))
  const at = (i: number, k: number) => {
    const a = ((-120 + (360 / axes.length) * i) * Math.PI) / 180
    return [cx + Math.cos(a) * r * k, cy + Math.sin(a) * r * k] as const
  }
  const any = axes.some((a) => a.value > 0)
  const shape = axes
    .map((a, i) => at(i, Math.max(0.03, a.value / max)))
    .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ')
  return (
    <svg
      className="ob__radar"
      viewBox="0 0 328 264"
      role="img"
      aria-label={`${label}: ${axes.map((a) => `${a.name} ${a.text}`).join(', ')}`}
    >
      {[0.25, 0.5, 0.75, 1].map((k) => (
        <circle key={k} cx={cx} cy={cy} r={r * k} className="ob__radar-ring" />
      ))}
      {axes.map((a, i) => {
        const [x, y] = at(i, 1)
        return <line key={a.name} x1={cx} y1={cy} x2={x} y2={y} className="ob__radar-ring" />
      })}
      {any && <polygon points={shape} className="ob__radar-shape" />}
      {axes.map((a, i) => {
        const [x, y] = at(i, 1.22)
        const dx = x - cx
        const anchor = dx > 20 ? 'start' : dx < -20 ? 'end' : 'middle'
        return (
          <g key={a.name}>
            <text x={x} y={y - 2} textAnchor={anchor} style={{ fill: 'var(--text)' }}>
              {a.name}
            </text>
            <text x={x} y={y + 15} textAnchor={anchor} className="ob__radar-on">
              {a.text}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

/** Hacim sütunları (kg). Son sütun vurgulu, değeri üstünde yazar. */
export function VolumeBars({
  bars,
  label,
  color = 'var(--positive)',
}: {
  bars: { key: string | number; kg: number; title: string; tick?: string }[]
  label: string
  color?: string
}) {
  const W = 328
  const H = 160
  const L = 38
  const R = 4
  const T = 18
  const B = 22
  const { hi, step } = niceScale(0, Math.max(1, ...bars.map((b) => b.kg)))
  const slot = (W - L - R) / bars.length
  const bw = Math.max(4, Math.min(18, slot - 5))
  const y = (v: number) => T + (1 - v / hi) * (H - T - B)
  const ticks: number[] = []
  for (let v = 0; v <= hi + 1e-9; v += step) ticks.push(v)
  // Değerler gösterim biriminde gelir; büyükse metrikte ton, imperialde bin lb.
  const short = (v: number) => (v >= 10000 ? `${num1(v / 1000)}${imperial() ? 'k' : ' t'}` : int(v))
  const lastIdx = bars.length - 1
  return (
    <svg className="chart" viewBox={`0 0 ${W} ${H}`} role="img" aria-label={label}>
      {ticks.map((v) => (
        <g key={v}>
          <line className="grid" x1={L} x2={W - R} y1={y(v)} y2={y(v)} />
          <text x={L - 8} y={y(v) + 4} textAnchor="end">
            {short(v)}
          </text>
        </g>
      ))}
      {bars.map((b, i) => {
        const cx = L + slot * i + slot / 2
        const isLast = i === lastIdx
        return (
          <g key={b.key}>
            {b.kg > 0 && (
              <rect
                x={cx - bw / 2}
                y={y(b.kg)}
                width={bw}
                height={Math.max(2, y(0) - y(b.kg))}
                rx="3"
                fill={color}
                opacity={isLast ? 1 : 0.45}
              >
                <title>{b.title}</title>
              </rect>
            )}
            {isLast && b.kg > 0 && (
              <text x={cx + bw / 2} y={y(b.kg) - 5} textAnchor="end" style={{ fill: 'var(--text)', fontWeight: 600 }}>
                {int(b.kg)}
              </text>
            )}
            {b.tick && (
              <text x={cx} y={H - 4} textAnchor={isLast ? 'end' : i === 0 ? 'start' : 'middle'} dx={isLast ? bw / 2 : i === 0 ? -bw / 2 : 0}>
                {b.tick}
              </text>
            )}
          </g>
        )
      })}
    </svg>
  )
}

/** Haftalık antrenman sayısı. Hedefi tutan haftalar kor rengi, tutmayanlar gri. */
export function WeekBars({ weeks, goal }: { weeks: WeekInfo[]; goal: number }) {
  const W = 328
  const H = 150
  const L = 22
  const R = 4
  const T = 14
  const B = 22
  const max = Math.max(goal + 1, ...weeks.map((w) => w.count))
  const slot = (W - L - R) / weeks.length
  const bw = Math.min(16, slot - 6)
  const y = (v: number) => T + (1 - v / max) * (H - T - B)
  const ticks = Array.from({ length: max + 1 }, (_, i) => i).filter(
    (v) => v === 0 || v === max || (max <= 5 ? true : v % 2 === 0),
  )
  return (
    <svg
      className="chart"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={t('Son {0} haftada haftalık antrenman sayısı, hedef {1}', weeks.length, goal)}
    >
      {ticks.map((v) => (
        <g key={v}>
          <line className="grid" x1={L} x2={W - R} y1={y(v)} y2={y(v)} />
          <text x={L - 8} y={y(v) + 4} textAnchor="end">
            {int(v)}
          </text>
        </g>
      ))}
      {weeks.map((w, i) => {
        const cx = L + slot * i + slot / 2
        return (
          <g key={w.start}>
            {w.count > 0 && (
              <rect
                x={cx - bw / 2}
                y={y(w.count)}
                width={bw}
                height={y(0) - y(w.count)}
                rx="3"
                fill={w.met ? 'var(--accent)' : 'var(--control)'}
              >
                <title>{t('{0} haftası: {1} antrenman', shortDate(w.start), w.count)}</title>
              </rect>
            )}
            {(i % 4 === 0 || i === weeks.length - 1) && (
              <text x={cx} y={H - 4} textAnchor={i === weeks.length - 1 ? 'end' : 'middle'} dx={i === weeks.length - 1 ? bw / 2 : 0}>
                {i === weeks.length - 1 ? t('Bu hafta') : shortDate(w.start)}
              </text>
            )}
          </g>
        )
      })}
      <line className="ref" x1={L} x2={W - R} y1={y(goal)} y2={y(goal)} />
    </svg>
  )
}
