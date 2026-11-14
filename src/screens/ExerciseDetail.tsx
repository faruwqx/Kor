import { ArrowLeft, ExternalLink, Pause, Play } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { usePremium } from '../lib/cloud'
import { FREE_HISTORY_DAYS } from '../lib/cloud-core'
import {
  REGION_NAME,
  demoFrames,
  exerciseMeta,
  findExercise,
  hasDemo,
  targets,
} from '../lib/exercises'
import { int, relDay, relDayLower, shortDate, timer } from '../lib/format'
import { fw1, fwi, toW, wNum1, wUnit } from '../lib/units'
import { useBoard } from '../lib/hooks'
import { RP_PER_TIER, TIERS, kgAtReps, kgForRp, rankFromRp } from '../lib/rank'
import { back, go } from '../lib/router'
import { exerciseSessions } from '../lib/stats'
import { currentBodyweight, useApp } from '../lib/store'
import { LineChart, VolumeBars } from '../ui/charts'
import { Emblem } from '../ui/Emblem'
import { RankBar, Seg, toast } from '../ui/kit'
import { loadNum, loadText } from './MuscleDetail'
import { t } from '../lib/i18n'

type Span = '30' | '180' | '365' | 'all'
const SPAN_DAYS: Record<Span, number | null> = { '30': 30, '180': 180, '365': 365, all: null }
const SPAN_OPTIONS = (): { value: Span; label: string }[] => [
  { value: '30', label: t('30 gün') },
  { value: '180', label: t('6 ay') },
  { value: '365', label: t('1 yıl') },
  { value: 'all', label: t('Tümü') },
]

/** Yapılış döngüsü: başlangıç ve bitiş karesi arasında gidip gelir. Dokununca durur. */
function MoveDemo({ id, name }: { id: string; name: string }) {
  const [a, b] = demoFrames(id)
  const still = useMemo(
    () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false,
    [],
  )
  const [playing, setPlaying] = useState(!still)
  const [end, setEnd] = useState(false)
  const [broken, setBroken] = useState(false)

  useEffect(() => {
    if (!playing) return
    const timer = setInterval(() => setEnd((v) => !v), 1100)
    return () => clearInterval(timer)
  }, [playing])

  if (broken) return null
  return (
    <section className="card card--flush demo" aria-label={t('Nasıl yapılır')}>
      <button
        className="demo__stage"
        onClick={() => setPlaying((p) => !p)}
        aria-label={playing ? t('Yapılış döngüsünü durdur') : t('Yapılış döngüsünü oynat')}
        aria-pressed={playing}
      >
        <img src={a} alt={t('{0}: başlangıç pozisyonu', name)} onError={() => setBroken(true)} />
        <img
          src={b}
          alt={t('{0}: bitiş pozisyonu', name)}
          className="demo__end"
          style={{ opacity: end ? 1 : 0 }}
          onError={() => setBroken(true)}
        />
        <span className="demo__phase">{end ? t('Bitiş') : t('Başlangıç')}</span>
        <span className="demo__ctl">{playing ? <Pause /> : <Play />}</span>
      </button>
      <div className="demo__foot">
        <span>{t('Nasıl yapılır')}</span>
        <a
          className="link"
          href={`https://www.youtube.com/results?search_query=${encodeURIComponent(name + ' nasıl yapılır')}`}
          target="_blank"
          rel="noreferrer"
        >
          {t('Videosunu YouTube\'da ara')}
          <ExternalLink />
        </a>
      </div>
    </section>
  )
}

export function ExerciseDetail({ id }: { id: string }) {
  const s = useApp()
  const board = useBoard(s)
  const ex = findExercise(id, s.customExercises)
  const sex = s.profile?.sex ?? 'm'
  const bw = currentBodyweight(s)
  const sessions = useMemo(
    () => exerciseSessions(id, s.workouts, s.customExercises),
    [id, s.workouts, s.customExercises],
  )
  const lift = board.lifts.get(id)
  const rank = lift ? rankFromRp(lift.rp) : null
  const best = sessions.length ? Math.max(...sessions.map((x) => x.e1rm)) : 0
  const heaviest = sessions.length ? Math.max(...sessions.map((x) => x.topKg)) : 0
  const first = sessions[0]
  const lastS = sessions[sessions.length - 1]
  const allPoints = sessions.filter((x) => x.e1rm > 0).map((x) => ({ at: x.at, value: x.e1rm }))
  // Ücretsiz planda grafik son 30 güne bakar; daha uzun aralıklar Premium'dadır.
  const premium = usePremium()
  const [span, setSpan] = useState<Span>('all')
  const days = premium ? SPAN_DAYS[span] : FREE_HISTORY_DAYS
  const [now] = useState(() => Date.now())
  const from = days == null ? 0 : now - days * 86_400_000
  const points = allPoints.filter((p) => p.at >= from)

  const zones = targets(id)
  const recent = sessions.slice(-12)
  const volBars = recent.map((x, i) => ({
    key: x.workoutId,
    kg: toW(x.volume),
    title: `${shortDate(x.at)}: ${fwi(x.volume)}`,
    tick: i === 0 || i === recent.length - 1 ? shortDate(x.at) : undefined,
  }))
  const volBest = recent.length ? Math.max(...recent.map((x) => x.volume)) : 0
  const volLast = recent.length ? recent[recent.length - 1].volume : 0
  const volFinding =
    volLast >= volBest
      ? t('Son antrenman {0} ile bu dönemin en yüksek hacmi.', fwi(volLast))
      : t('Son antrenman {0}, en yükseği {1}.', fwi(volLast), fwi(volBest))

  let finding: string
  if (!sessions.length) finding = t('Henüz bu hareketi kaydetmedin.')
  else if (points.length > 1 && lastS.e1rm > first.e1rm)
    finding = t('Tahmini 1TM {0} antrenmanda {1} → {2} oldu.', sessions.length, fw1(first.e1rm), fw1(lastS.e1rm))
  else finding = t('{0} antrenmanda yapıldı, son olarak {1}.', sessions.length, relDayLower(lastS.at))

  // Süreli hareket (Hyrox): kilo yerine süre izlenir, kısa olan iyidir.
  const times = sessions.map((x) => x.bestSec).filter((x): x is number => x != null)
  const bestSec = times.length ? (ex.longer ? Math.max(...times) : Math.min(...times)) : null
  const lastSec = times.length ? times[times.length - 1] : null
  if (ex.timed && bestSec != null)
    finding = t('{0} antrenmanda yapıldı. En iyi süren {1}.', sessions.length, timer(bestSec))

  return (
    <>
      <div className="topbar">
        <button className="iconbtn" onClick={() => back('/exercises')} aria-label={t('Geri')}>
          <ArrowLeft />
        </button>
        <span className="topbar__title">
          {exerciseMeta(ex)}
        </span>
      </div>

      <header className="head">
        <div>
          <h1>{ex.name}</h1>
          <p>{finding}</p>
        </div>
      </header>

      {hasDemo(ex.id) && <MoveDemo id={ex.id} name={ex.name} />}

      {zones && (
        <section className="card zones" aria-label={t('Çalışan bölgeler')}>
          <div className="zones__row">
            <span className="zones__label">{t('Ana')}</span>
            <div className="zones__list">
              {zones.main.map((r) => (
                <span key={r} className="zone zone--main">
                  {REGION_NAME[r]}
                </span>
              ))}
            </div>
          </div>
          {zones.assist.length > 0 && (
            <div className="zones__row">
              <span className="zones__label">{t('Yardımcı')}</span>
              <div className="zones__list">
                {zones.assist.map((r) => (
                  <span key={r} className="zone">
                    {REGION_NAME[r]}
                  </span>
                ))}
              </div>
            </div>
          )}
        </section>
      )}

      {ex.std ? (
        <section
          className="card card--tint"
          style={{ ['--tint' as string]: rank?.color ?? 'var(--control)' }}
          aria-label={t('Hareket rank\'i')}
        >
          <div className="rankhero" style={{ marginBottom: rank ? 16 : 0 }}>
            <Emblem rank={rank} size={64} />
            <div className="rankhero__body">
              <div className="fig rankhero__label">{rank ? rank.label : t('Sıralanmadı')}</div>
              <div className="rankhero__rp num">
                {lift
                  ? t('En iyi set {0} × {1}', loadText(ex, lift.kg), lift.reps)
                  : t('İlk çalışma setinle rank alır.')}
              </div>
            </div>
          </div>
          {rank && <RankBar rank={rank} />}
        </section>
      ) : (
        <p className="note">
          {ex.timed
            ? t('Bu hareket süreyle kaydedilir{0} ve rank\'e sayılmaz. {1} süren rekorun olur.', ex.target ? t(' (yarış standardı {0})', ex.target) : '', ex.longer ? t('En uzun') : t('En kısa'))
            : t('Bu hareket rank\'e sayılmaz: ortak bir standardı yok. Setlerin, hacmin ve rekorların yine kaydedilir.')}
        </p>
      )}

      {ex.timed ? (
        <div className="kpis">
          <div className="kpi">
            <div className="kpi__label">{t('En iyi süre')}</div>
            <div className="fig kpi__value">
              {bestSec != null ? timer(bestSec) : <span className="faint">–</span>}
            </div>
          </div>
          <div className="kpi">
            <div className="kpi__label">{t('Son süre')}</div>
            <div className="fig kpi__value">
              {lastSec != null ? timer(lastSec) : <span className="faint">–</span>}
            </div>
          </div>
          <div className="kpi">
            <div className="kpi__label">{t('Antrenman')}</div>
            <div className="fig kpi__value">{sessions.length}</div>
          </div>
        </div>
      ) : (
      <div className="kpis">
        <div className="kpi">
          <div className="kpi__label">{t('Tahmini 1TM')}</div>
          <div className="fig kpi__value">
            {best ? wNum1(best) : <span className="faint">–</span>}
            {best > 0 && <span className="unit">{wUnit()}</span>}
          </div>
        </div>
        <div className="kpi">
          <div className="kpi__label">{ex.load === 'bodyweight' ? t('En çok ek kilo') : t('En ağır set')}</div>
          <div className="fig kpi__value">
            {sessions.length ? (
              ex.load === 'bodyweight' && heaviest === 0 ? (
                'VA'
              ) : (
                <>
                  {loadNum(ex, heaviest)}
                  <span className="unit">{wUnit()}</span>
                </>
              )
            ) : (
              <span className="faint">–</span>
            )}
          </div>
        </div>
        <div className="kpi">
          <div className="kpi__label">{t('Antrenman')}</div>
          <div className="fig kpi__value">{sessions.length}</div>
        </div>
      </div>
      )}

      {allPoints.length > 1 && (
        <section className="card" aria-label={t('Tahmini 1TM grafiği')}>
          <h2 style={{ marginBottom: 12 }}>
            {t('Tahmini 1TM')} <span className="faint" style={{ fontWeight: 400 }}>· {wUnit()}</span>
          </h2>
          <div style={{ marginBottom: 12 }}>
            <Seg
              label={t('Grafik aralığı')}
              value={premium ? span : '30'}
              onChange={(v) => {
                if (premium) setSpan(v)
                else if (v !== '30') {
                  toast('Uzun dönem grafikleri Premium\'da')
                  go('/premium')
                }
              }}
              options={SPAN_OPTIONS()}
            />
          </div>
          {points.length > 1 ? (
            <LineChart
              points={points.map((p) => ({ ...p, value: toW(p.value) }))}
              unit={wUnit()}
              label={t('{0} tahmini 1TM', ex.name)}
            />
          ) : (
            <p className="empty">{t('Bu aralıkta grafik çizecek kadar antrenman yok.')}</p>
          )}
          {ex.load === 'bodyweight' && (
            <p className="note" style={{ marginTop: 8 }}>
              {t('Vücut ağırlığı hareketlerinde yük, vücut ağırlığın artı ek kilodur.')}
            </p>
          )}
        </section>
      )}

      {!ex.timed && volBars.length > 1 && (
        <section className="card" aria-label={t('Hacim grafiği')}>
          <h2 style={{ marginBottom: 4 }}>
            {t('Hacim')} <span className="faint" style={{ fontWeight: 400 }}>· {wUnit()}</span>
          </h2>
          <p className="row__sub num" style={{ whiteSpace: 'normal', marginBottom: 12 }}>
            {volFinding}
          </p>
          <VolumeBars bars={volBars} label={t('{0} antrenman başına hacim', ex.name)} />
          <p className="note" style={{ marginTop: 8 }}>
            {t('Hacim = kilo × tekrar, çalışma setlerinin toplamı.')}
            {ex.perHand ? t(' Dambılda iki el birlikte sayılır.') : ''}
          </p>
        </section>
      )}

      {ex.std && (
        <>
          <div className="section">
            <h2>{t('Kademe eşikleri')}</h2>
          </div>
          <div className="card">
            <table className="table">
              <thead>
                <tr>
                  <th>{t('Kademe')}</th>
                  <th>{t('Tek tekrar,')} {wUnit()}</th>
                  <th>{t('5 tekrarla,')} {wUnit()}</th>
                </tr>
              </thead>
              <tbody>
                {TIERS.map((tier, i) => {
                  if (i === 0) return null
                  const need = kgForRp(ex, i * RP_PER_TIER, bw, sex)!
                  const reached = lift != null && lift.rp >= i * RP_PER_TIER
                  const isNext = !reached && (lift == null ? i === 1 : rank!.tier + 1 === i)
                  return (
                    <tr key={tier.id} className={isNext ? 'is-next' : undefined}>
                      <td className={reached ? 'muted' : undefined}>
                        {tier.name}
                        {reached && <span className="sr"> {t('(ulaşıldı)')}</span>}
                      </td>
                      <td className="fig">{loadNum(ex, kgAtReps(ex, need, 1, bw))}</td>
                      <td className="fig">{loadNum(ex, kgAtReps(ex, need, 5, bw))}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <p className="note" style={{ marginTop: 10 }}>
              {fw1(bw)} {t('vücut ağırlığına göre. Sıradaki kademe kor renginde.')}
            </p>
          </div>
        </>
      )}

      <div className="section">
        <h2>{t('Geçmiş')}</h2>
      </div>
      {sessions.length ? (
        <div className="card card--flush rows">
          {[...sessions]
            .reverse()
            .slice(0, 12)
            .map((x) => (
              <button key={x.workoutId} className="row" onClick={() => go(`/workout/${x.workoutId}`)}>
                <div className="row__main">
                  <div className="row__title">{relDay(x.at)}</div>
                  <div className="row__sub num">
                    {x.sets
                      .map((st) =>
                        ex.timed
                          ? st.sec
                            ? timer(st.sec)
                            : '–'
                          : `${loadNum(ex, st.kg ?? 0)} × ${st.reps}`,
                      )
                      .join(' · ')}
                  </div>
                </div>
                {x.bestSec != null && (
                  <div className="row__end">
                    <div className="fig">{timer(x.bestSec)}</div>
                    <div className="row__sub">{t('en iyi')}</div>
                  </div>
                )}
                {x.e1rm > 0 && (
                  <div className="row__end">
                    <div className="fig">
                      {wNum1(x.e1rm)}
                      <span className="unit">{wUnit()}</span>
                    </div>
                    <div className="row__sub">{t('1TM')}</div>
                  </div>
                )}
              </button>
            ))}
        </div>
      ) : (
        <p className="empty">{t('Bu hareketi bir antrenmana eklediğinde setlerin burada birikir.')}</p>
      )}
      {sessions.length > 12 && (
        <p className="note num">{t('Son 12 antrenman gösteriliyor, toplam')} {int(sessions.length)}.</p>
      )}
    </>
  )
}
