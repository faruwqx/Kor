import { useRef, useState } from 'react'
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

/** Dokunulan yatay konumdan viewBox x'i; dokunma etkileşimi için ortak yardımcı. */
function useScrub(W: number) {
  const ref = useRef<SVGSVGElement>(null)
  const [sel, setSel] = useState<number | null>(null)
  const vxOf = (clientX: number): number | null => {
    const r = ref.current?.getBoundingClientRect()
    if (!r || r.width === 0) return null
    return ((clientX - r.left) / r.width) * W
  }
  return { ref, sel, setSel, vxOf }
}

/** Okunur etiket: arka planı ince bir halka (paint-order) ile ayrılır, taşmaması için x kıstırılır. */
function ScrubLabel({
  x,
  y,
  text,
  min,
  max,
}: {
  x: number
  y: number
  text: string
  min: number
  max: number
}) {
  const cx = Math.max(min, Math.min(max, x))
  const anchor = cx <= min + 2 ? 'start' : cx >= max - 2 ? 'end' : 'middle'
  return (
    <text
      x={cx}
      y={Math.max(10, y)}
      textAnchor={anchor}
      className="chart__scrub"
      style={{
        fill: 'var(--text)',
        fontWeight: 600,
        stroke: 'var(--bg)',
        strokeWidth: 3,
        paintOrder: 'stroke',
      }}
    >
      {text}
    </text>
  )
}

/** Tek seri, düz çizgi, dolgusuz. Son değer uçta; parmakla gezince o günün değeri çıkar. */
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
  const { ref, sel, setSel, vxOf } = useScrub(W)
  const values = points.map((p) => p.value)
  const { lo, hi, step } = niceScale(Math.min(...values), Math.max(...values))
  const t0 = points[0].at
  const t1 = points[points.length - 1].at
  const x = (at: number) => (t1 === t0 ? L + (W - L - R) / 2 : L + ((at - t0) / (t1 - t0)) * (W - L - R))
  const y = (v: number) => T + (1 - (v - lo) / (hi - lo)) * (H - T - B)
  const ticks: number[] = []
  for (let v = lo; v <= hi + 1e-9; v += step) ticks.push(v)
  const last = points[points.length - 1]

  const pick = (clientX: number) => {
    const vx = vxOf(clientX)
    if (vx == null) return
    let bi = 0
    let bd = Infinity
    points.forEach((p, i) => {
      const d = Math.abs(x(p.at) - vx)
      if (d < bd) {
        bd = d
        bi = i
      }
    })
    setSel(bi)
  }
  const cur = sel != null ? points[sel] : null

  return (
    <svg
      ref={ref}
      className="chart"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={label}
      style={{ touchAction: 'pan-y' }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        pick(e.clientX)
      }}
      onPointerMove={(e) => {
        if (sel != null) pick(e.clientX)
      }}
      onPointerUp={() => setSel(null)}
      onPointerCancel={() => setSel(null)}
    >
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
      {cur ? (
        <>
          <line className="chart__guide" x1={x(cur.at)} x2={x(cur.at)} y1={T} y2={H - B} />
          <circle cx={x(cur.at)} cy={y(cur.value)} r="4.5" fill="var(--accent)" />
          <ScrubLabel
            x={x(cur.at)}
            y={y(cur.value) - 9}
            text={`${shortDate(cur.at)} · ${num1(cur.value)} ${unit}`}
            min={L}
            max={W - R}
          />
        </>
      ) : (
        <circle cx={x(last.at)} cy={y(last.value)} r="4" fill="var(--accent)" />
      )}
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

/** Altı eksenli radar: bir eksene dokununca adı ve değeri vurgulanır. */
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
  const [sel, setSel] = useState<number | null>(null)
  const ref = useRef<SVGSVGElement>(null)
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
  const pick = (clientX: number, clientY: number) => {
    const box = ref.current?.getBoundingClientRect()
    if (!box || box.width === 0) return
    const px = ((clientX - box.left) / box.width) * 328
    const py = ((clientY - box.top) / box.height) * 264
    let bi = 0
    let bd = Infinity
    axes.forEach((_, i) => {
      const [ax, ay] = at(i, 1)
      const d = (ax - px) ** 2 + (ay - py) ** 2
      if (d < bd) {
        bd = d
        bi = i
      }
    })
    setSel(bi)
  }
  return (
    <svg
      ref={ref}
      className="ob__radar"
      viewBox="0 0 328 264"
      role="img"
      aria-label={`${label}: ${axes.map((a) => `${a.name} ${a.text}`).join(', ')}`}
      style={{ touchAction: 'pan-y' }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        pick(e.clientX, e.clientY)
      }}
      onPointerUp={() => setSel(null)}
      onPointerCancel={() => setSel(null)}
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
        const on = sel === i
        return (
          <g key={a.name}>
            <text
              x={x}
              y={y - 2}
              textAnchor={anchor}
              style={{ fill: 'var(--text)', fontWeight: on ? 700 : 400 }}
            >
              {a.name}
            </text>
            <text
              x={x}
              y={y + 15}
              textAnchor={anchor}
              className="ob__radar-on"
              style={on ? { fontWeight: 700 } : undefined}
            >
              {a.text}
            </text>
          </g>
        )
      })}
    </svg>
  )
}

/** Hacim sütunları (kg). Parmakla gezince o günün sütunu vurgulanır ve değeri çıkar. */
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
  const { ref, sel, setSel, vxOf } = useScrub(W)
  const { hi, step } = niceScale(0, Math.max(1, ...bars.map((b) => b.kg)))
  const slot = (W - L - R) / bars.length
  const bw = Math.max(4, Math.min(18, slot - 5))
  const y = (v: number) => T + (1 - v / hi) * (H - T - B)
  const ticks: number[] = []
  for (let v = 0; v <= hi + 1e-9; v += step) ticks.push(v)
  // Değerler gösterim biriminde gelir; büyükse metrikte ton, imperialde bin lb.
  const short = (v: number) => (v >= 10000 ? `${num1(v / 1000)}${imperial() ? 'k' : ' t'}` : int(v))
  const lastIdx = bars.length - 1
  const pick = (clientX: number) => {
    const vx = vxOf(clientX)
    if (vx == null) return
    setSel(Math.max(0, Math.min(bars.length - 1, Math.floor((vx - L) / slot))))
  }
  const hiIdx = sel ?? lastIdx
  return (
    <svg
      ref={ref}
      className="chart"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={label}
      style={{ touchAction: 'pan-y' }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        pick(e.clientX)
      }}
      onPointerMove={(e) => {
        if (sel != null) pick(e.clientX)
      }}
      onPointerUp={() => setSel(null)}
      onPointerCancel={() => setSel(null)}
    >
      {ticks.map((v) => (
        <g key={v}>
          <line className="grid" x1={L} x2={W - R} y1={y(v)} y2={y(v)} />
          <text x={L - 8} y={y(v) + 4} textAnchor="end">
            {short(v)}
          </text>
        </g>
      ))}
      {bars.map((b, i) => {
        const bcx = L + slot * i + slot / 2
        const on = i === hiIdx
        return (
          <g key={b.key}>
            {b.kg > 0 && (
              <rect
                x={bcx - bw / 2}
                y={y(b.kg)}
                width={bw}
                height={Math.max(2, y(0) - y(b.kg))}
                rx="3"
                fill={color}
                opacity={on ? 1 : 0.45}
              >
                <title>{b.title}</title>
              </rect>
            )}
            {b.tick && (
              <text x={bcx} y={H - 4} textAnchor={i === lastIdx ? 'end' : i === 0 ? 'start' : 'middle'} dx={i === lastIdx ? bw / 2 : i === 0 ? -bw / 2 : 0}>
                {b.tick}
              </text>
            )}
          </g>
        )
      })}
      {sel != null && bars[sel].kg > 0 ? (
        <ScrubLabel
          x={L + slot * sel + slot / 2}
          y={y(bars[sel].kg) - 6}
          text={bars[sel].title}
          min={L}
          max={W - R}
        />
      ) : (
        bars[lastIdx]?.kg > 0 && (
          <text
            x={L + slot * lastIdx + slot / 2 + bw / 2}
            y={y(bars[lastIdx].kg) - 5}
            textAnchor="end"
            style={{ fill: 'var(--text)', fontWeight: 600 }}
          >
            {int(bars[lastIdx].kg)}
          </text>
        )
      )}
    </svg>
  )
}

/** Haftalık antrenman sayısı. Hedefi tutan haftalar kor rengi; parmakla gezince o hafta çıkar. */
export function WeekBars({ weeks, goal }: { weeks: WeekInfo[]; goal: number }) {
  const W = 328
  const H = 150
  const L = 22
  const R = 4
  const T = 14
  const B = 22
  const { ref, sel, setSel, vxOf } = useScrub(W)
  const max = Math.max(goal + 1, ...weeks.map((w) => w.count))
  const slot = (W - L - R) / weeks.length
  const bw = Math.min(16, slot - 6)
  const y = (v: number) => T + (1 - v / max) * (H - T - B)
  const ticks = Array.from({ length: max + 1 }, (_, i) => i).filter(
    (v) => v === 0 || v === max || (max <= 5 ? true : v % 2 === 0),
  )
  const pick = (clientX: number) => {
    const vx = vxOf(clientX)
    if (vx == null) return
    setSel(Math.max(0, Math.min(weeks.length - 1, Math.floor((vx - L) / slot))))
  }
  const cur = sel != null ? weeks[sel] : null
  return (
    <svg
      ref={ref}
      className="chart"
      viewBox={`0 0 ${W} ${H}`}
      role="img"
      aria-label={t('Son {0} haftada haftalık antrenman sayısı, hedef {1}', weeks.length, goal)}
      style={{ touchAction: 'pan-y' }}
      onPointerDown={(e) => {
        e.currentTarget.setPointerCapture(e.pointerId)
        pick(e.clientX)
      }}
      onPointerMove={(e) => {
        if (sel != null) pick(e.clientX)
      }}
      onPointerUp={() => setSel(null)}
      onPointerCancel={() => setSel(null)}
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
        const wcx = L + slot * i + slot / 2
        return (
          <g key={w.start}>
            {w.count > 0 && (
              <rect
                x={wcx - bw / 2}
                y={y(w.count)}
                width={bw}
                height={y(0) - y(w.count)}
                rx="3"
                fill={w.met ? 'var(--accent)' : 'var(--control)'}
                opacity={sel == null || sel === i ? 1 : 0.5}
              >
                <title>{t('{0} haftası: {1} antrenman', shortDate(w.start), w.count)}</title>
              </rect>
            )}
            {(i % 4 === 0 || i === weeks.length - 1) && (
              <text x={wcx} y={H - 4} textAnchor={i === weeks.length - 1 ? 'end' : 'middle'} dx={i === weeks.length - 1 ? bw / 2 : 0}>
                {i === weeks.length - 1 ? t('Bu hafta') : shortDate(w.start)}
              </text>
            )}
          </g>
        )
      })}
      <line className="ref" x1={L} x2={W - R} y1={y(goal)} y2={y(goal)} />
      {cur && (
        <ScrubLabel
          x={L + slot * sel! + slot / 2}
          y={y(cur.count) - 6}
          text={t('{0} · {1} antrenman', shortDate(cur.start), cur.count)}
          min={L}
          max={W - R}
        />
      )}
    </svg>
  )
}
