import { ChevronRight, Dumbbell, Layers, Repeat, Search, Timer, Weight } from 'lucide-react'
import { useMemo, useState } from 'react'
import { findExercise } from '../lib/exercises'
import { addDays, dayMonth, duration, int, relDay, startOfDay } from '../lib/format'
import { fw1, fwi, toW, wBig, wNum1, wUnit } from '../lib/units'
import { go } from '../lib/router'
import { currentBodyweight, useApp } from '../lib/store'
import { WeightSheet } from './Profile'
import {
  LOAD_GROUPS,
  WEEKLY_AFTER_DAYS,
  exerciseCounts,
  lastRegionPR,
  muscleLoad,
  regionLoad,
  presetFrom,
  rangeBuckets,
  spanDays,
  totals,
  type LoadMetric,
  type Metric,
  type RangeDays,
} from '../lib/trends'
import { LineChart, Radar, VolumeBars } from '../ui/charts'
import { BodyMap } from '../ui/BodyMap'
import { MCAT_NAME } from '../lib/motra'
import { Seg, Sheet } from '../ui/kit'
import { t } from '../lib/i18n'

/** Seçili aralık: hazır (7/30/90) ya da kullanıcının seçtiği iki gün, uçlar dahil. */
type Range = { kind: 'preset'; days: RangeDays } | { kind: 'custom'; from: number; to: number }

const MAX_SPAN_DAYS = 366

/** Gün başlangıcı ↔ tarih alanı değeri (YYYY-AA-GG, yerel saat). */
const toInput = (ts: number) => {
  const d = new Date(ts)
  const p = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`
}
const fromInput = (v: string): number | null => {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v)
  return m ? new Date(+m[1], +m[2] - 1, +m[3]).getTime() : null
}

function RangeSheet({
  initial,
  today,
  onApply,
  onClose,
}: {
  initial: { from: number; to: number }
  today: number
  onApply: (from: number, to: number) => void
  onClose: () => void
}) {
  const [a, setA] = useState(toInput(initial.from))
  const [b, setB] = useState(toInput(initial.to))
  const from = fromInput(a)
  const to = fromInput(b)
  const error =
    from == null || to == null
      ? t('İki tarihi de seç.')
      : from > to
        ? t('Başlangıç, bitişten sonra olamaz.')
        : to > today
          ? t('Bitiş bugünden sonra olamaz.')
          : spanDays(from, to) > MAX_SPAN_DAYS
            ? t('En fazla bir yıllık aralık seçilebilir.')
            : null
  const quick = (n: number) => {
    setA(toInput(addDays(today, -(n - 1))))
    setB(toInput(today))
  }
  return (
    <Sheet title={t('Aralık seç')} onClose={onClose}>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault()
          if (!error && from != null && to != null) onApply(from, to)
        }}
      >
        <div className="dates">
          <label className="dates__item">
            <span className="label">{t('Başlangıç')}</span>
            <input
              className="input"
              type="date"
              value={a}
              max={toInput(today)}
              onChange={(e) => setA(e.target.value)}
            />
          </label>
          <label className="dates__item">
            <span className="label">{t('Bitiş')}</span>
            <input
              className="input"
              type="date"
              value={b}
              max={toInput(today)}
              onChange={(e) => setB(e.target.value)}
            />
          </label>
        </div>
        <div className="pills" role="group" aria-label={t('Hızlı seçim')}>
          {[14, 60, 180, 365].map((n) => (
            <button key={n} type="button" className="pill" onClick={() => quick(n)}>
              {n === 365 ? t('1 yıl') : n === 180 ? t('6 ay') : t('{0} gün', n)}
            </button>
          ))}
        </div>
        <p className={error ? 'hint hint--error' : 'hint'} aria-live="polite">
          {error ??
            t('{0} gün. {1} çizilir.', spanDays(from!, to!), spanDays(from!, to!) > WEEKLY_AFTER_DAYS ? t('Grafik hafta hafta') : t('Grafik gün gün'))}
        </p>
        <div className="btnrow">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            {t('Vazgeç')}
          </button>
          <button className="btn btn--primary" disabled={!!error}>
            {t('Uygula')}
          </button>
        </div>
      </form>
    </Sheet>
  )
}

const METRICS = (): { id: Metric; label: string; title: string; unit: string }[] => [
  { id: 'time', label: t('Süre'), title: t('Toplam süre'), unit: 'dk' },
  { id: 'volume', label: t('Hacim'), title: t('Toplam hacim'), unit: 'kg' },
  { id: 'sets', label: t('Set'), title: t('Toplam set'), unit: 'set' },
]

const kgShort = (kg: number) => wBig(kg)

export function Trends() {
  const s = useApp()
  const [today] = useState(() => startOfDay(Date.now()))
  const [range, setRange] = useState<Range>({ kind: 'preset', days: 7 })
  const [picking, setPicking] = useState(false)
  const [weighing, setWeighing] = useState(false)
  const [metric, setMetric] = useState<Metric>('time')
  const [load, setLoad] = useState<LoadMetric>('reps')
  const [region, setRegion] = useState<string | null>(null)

  const from = range.kind === 'preset' ? presetFrom(range.days, today) : range.from
  const to = range.kind === 'preset' ? today : range.to

  const data = useMemo(() => {
    const bs = rangeBuckets(s.workouts, s.customExercises, from, to)
    const end = addDays(to, 1)
    const inside = s.workouts.filter((w) => w.endedAt >= from && w.endedAt < end)
    return {
      bs,
      weekly: spanDays(from, to) > WEEKLY_AFTER_DAYS,
      sum: totals(inside, s.customExercises),
      groups: muscleLoad(inside, s.customExercises),
      regions: regionLoad(inside, s.customExercises),
      top: exerciseCounts(inside),
      totalMs: inside.reduce((a, w) => a + Math.max(0, w.endedAt - w.startedAt), 0),
    }
  }, [s.workouts, s.customExercises, from, to])

  // Vücut ağırlığı: aralıktaki kayıtlar; aralıkta tek kayıt varsa öncekiyle başlatılır.
  const bwEnd = addDays(to, 1)
  const bwIn = s.bodyweights.filter((b) => b.at >= from && b.at < bwEnd)
  const bwPrev = [...s.bodyweights].reverse().find((b) => b.at < from)
  const bwPoints = (bwIn.length < 2 && bwPrev ? [bwPrev, ...bwIn] : bwIn).map((b) => ({
    at: b.at,
    value: b.kg,
  }))
  const bwDelta = bwPoints.length > 1 ? bwPoints[bwPoints.length - 1].value - bwPoints[0].value : null

  const m = METRICS().find((x) => x.id === metric)!
  const pick = (b: { minutes: number; volume: number; sets: number }) =>
    metric === 'time' ? b.minutes : metric === 'volume' ? toW(b.volume) : b.sets
  // Hacim seçili birimde (kg ya da lb) gösterilir.
  const mUnit = m.unit === 'kg' ? wUnit() : m.unit
  // Altı civarı tarih etiketi: kalabalık olmasın.
  const every = Math.max(1, Math.ceil(data.bs.length / 6))
  const loadText = (v: number) => (load === 'volume' ? kgShort(v) : int(v))
  const yearOf = (ts: number) => new Date(ts).getFullYear()
  const showYear = yearOf(from) !== yearOf(today) || yearOf(to) !== yearOf(today)
  const label = (ts: number) => (showYear ? `${dayMonth(ts)} ${yearOf(ts)}` : dayMonth(ts))

  return (
    <>
      <header className="head">
        <div>
          <h1>{t('Trendler')}</h1>
          <p>
            {label(from)} – {label(to)}
          </p>
        </div>
      </header>

      <Seg
        label={t('Aralık')}
        value={range.kind === 'custom' ? 'custom' : String(range.days)}
        onChange={(v) => {
          if (v === 'custom') setPicking(true)
          else setRange({ kind: 'preset', days: Number(v) as RangeDays })
        }}
        options={[
          { value: '7', label: t('7 gün') },
          { value: '30', label: t('30 gün') },
          { value: '90', label: t('90 gün') },
          { value: 'custom', label: t('Özel') },
        ]}
      />
      {range.kind === 'custom' && (
        <button className="textbtn" style={{ alignSelf: 'flex-start' }} onClick={() => setPicking(true)}>
          {t('Aralığı değiştir')}
        </button>
      )}
      {picking && (
        <RangeSheet
          initial={{ from, to }}
          today={today}
          onClose={() => setPicking(false)}
          onApply={(f, until) => {
            setRange({ kind: 'custom', from: f, to: until })
            setPicking(false)
          }}
        />
      )}

      <div className="section">
        <h2>{t('İlerleme')}</h2>
      </div>
      <section className="card trend" aria-label={t('İlerleme grafiği')}>
        <div className="kpi__label">{m.title}</div>
        <div className="fig trend__fig">
          {int(pick(data.sum))}
          <span className="unit trend__unit">{mUnit}</span>
        </div>
        <VolumeBars
          label={`${m.title}, ${data.weekly ? t('haftalık') : t('günlük')}`}
          color="var(--accent)"
          bars={data.bs.map((b, i) => ({
            key: b.start,
            kg: pick(b),
            title: `${data.weekly ? t('{0} haftası', dayMonth(b.start)) : dayMonth(b.start)}: ${int(pick(b))} ${mUnit}`,
            tick: i % every === 0 || i === data.bs.length - 1 ? dayMonth(b.start) : undefined,
          }))}
        />
        <div className="pills" role="group" aria-label={t('Grafik ölçüsü')}>
          {METRICS().map((x) => (
            <button
              key={x.id}
              className="pill"
              aria-pressed={x.id === metric}
              onClick={() => setMetric(x.id)}
            >
              {x.label}
            </button>
          ))}
        </div>
      </section>

      <button className="libbtn" onClick={() => go('/exercises')}>
        <Search aria-hidden="true" />
        {t('Hareket kütüphanesi')}
      </button>

      <div className="section">
        <h2>{t('İstatistikler')}</h2>
      </div>
      <dl className="tiles">
        <div className="tile">
          <dt>
            <Dumbbell aria-hidden="true" />
            {t('Antrenman')}
          </dt>
          <dd className="fig">{int(data.sum.workouts)}</dd>
        </div>
        <div className="tile">
          <dt>
            <Timer aria-hidden="true" />
            {t('Süre')}
          </dt>
          <dd className="fig">{data.totalMs ? duration(data.totalMs) : t('0 dk')}</dd>
        </div>
        <div className="tile">
          <dt>
            <Layers aria-hidden="true" />
            {t('Set')}
          </dt>
          <dd className="fig">{int(data.sum.sets)}</dd>
        </div>
        <div className="tile">
          <dt>
            <Repeat aria-hidden="true" />
            {t('Tekrar')}
          </dt>
          <dd className="fig">{int(data.sum.reps)}</dd>
        </div>
        <div className="tile tile--wide">
          <dt>
            <Weight aria-hidden="true" />
            {t('Kaldırılan hacim')}
          </dt>
          <dd className="fig">{fwi(data.sum.volume)}</dd>
        </div>
      </dl>

      <div className="section">
        <h2>{t('Vücut ağırlığı')}</h2>
        <button className="link" onClick={() => setWeighing(true)}>
          {t('Kilo gir')}
        </button>
      </div>
      <section className="card trend" aria-label={t('Vücut ağırlığı grafiği')}>
        <div className="kpi__label">{t('Şu an')}</div>
        <div className="fig trend__fig">
          {wNum1(currentBodyweight(s))}
          <span className="unit trend__unit">{wUnit()}</span>
        </div>
        {bwDelta != null && (
          <div className="row__sub num">
            {t('Bu aralıkta')} {bwDelta >= 0 ? '+' : '−'}
            {wNum1(Math.abs(bwDelta))} {wUnit()}
          </div>
        )}
        {bwPoints.length > 1 ? (
          <LineChart
            points={bwPoints.map((p) => ({ ...p, value: toW(p.value) }))}
            unit={wUnit()}
            label={t('Vücut ağırlığı')}
          />
        ) : (
          <p className="hint">
            {t('En az iki tartım gir, değişimin burada çizilsin.')}
          </p>
        )}
        <button className="btn btn--ghost btn--sm" style={{ alignSelf: 'flex-start' }} onClick={() => setWeighing(true)}>
          {t('Bugünkü kilomu gir')}
        </button>
      </section>
      {weighing && (
        <WeightSheet current={currentBodyweight(s)} onClose={() => setWeighing(false)} />
      )}

      <div className="section">
        <h2>{t('Kas grupları')}</h2>
      </div>
      <Seg
        label={t('Kas grubu ölçüsü')}
        value={load}
        onChange={setLoad}
        options={[
          { value: 'reps', label: t('Tekrar') },
          { value: 'sets', label: t('Set') },
          { value: 'volume', label: t('Hacim') },
        ]}
      />
      <div className="card">
        <p className="note" style={{ marginBottom: 10 }}>
          {t('Koyu bölge en çok çalıştığın yer. Bir bölgeye dokun: hacim, set ve son PR.')}
        </p>
        <BodyMap
          load={(() => {
            const r = data.regions
            const max = Math.max(1, ...Object.values(r).map((x) => x[load]))
            return Object.fromEntries(Object.entries(r).map(([k, v]) => [k, v[load] / max]))
          })()}
          selected={region}
          onSelect={setRegion}
        />
        {region &&
          (() => {
            const v = data.regions[region]
            const pr = lastRegionPR(s.workouts, s.customExercises, region)
            return (
              <div className="regioncard">
                <div className="regioncard__name">{MCAT_NAME[region] ?? region}</div>
                <div className="row__sub">
                  {v
                    ? t('{0} · {1} set · {2} tekrar', fwi(v.volume), int(v.sets), int(v.reps))
                    : t('Bu aralıkta çalışmadın')}
                </div>
                <div className="note" style={{ marginTop: 6 }}>
                  {pr
                    ? t('Son PR: {0} {1} × {2} · {3}', pr.name, fw1(pr.kg), pr.reps, relDay(pr.at))
                    : t('Bu bölgede henüz PR yok')}
                </div>
              </div>
            )
          })()}
      </div>
      <div className="card">
        <Radar
          label={t('Kas gruplarına dağılım')}
          axes={LOAD_GROUPS.map((g, i) => ({
            name: g.name,
            value: data.groups[i][load],
            text: loadText(data.groups[i][load]),
          }))}
        />
      </div>

      <div className="section">
        <h2>{t('Hareket istatistikleri')}</h2>
        <button className="link" onClick={() => go('/exercises')}>
          {t('Tümü')}
        </button>
      </div>
      {data.top.length ? (
        <div className="card card--flush rows">
          {data.top.slice(0, 12).map((row) => (
            <button key={row.id} className="row" onClick={() => go(`/exercise/${row.id}`)}>
              <div className="row__main">
                <div className="row__title">{findExercise(row.id, s.customExercises).name}</div>
              </div>
              <span className="row__end num">{row.sets} {t('set')}</span>
              <ChevronRight className="chev" />
            </button>
          ))}
        </div>
      ) : (
        <p className="empty">{t('Bu aralıkta antrenman yok. Kaydettikçe hareketlerin burada sıralanır.')}</p>
      )}
    </>
  )
}
