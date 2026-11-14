import { ArrowLeft, ChevronRight } from 'lucide-react'
import { MUSCLE_COLOR, allExercises, muscleName } from '../lib/exercises'
import { int, relDayLower } from '../lib/format'
import { fw, wAdded, wNum, wUnit } from '../lib/units'
import { useBoard } from '../lib/hooks'
import { kgAtReps, kgForRp, rankFromRp } from '../lib/rank'
import { back, go } from '../lib/router'
import { currentBodyweight, useApp } from '../lib/store'
import type { Exercise, MuscleId } from '../lib/types'
import { Emblem } from '../ui/Emblem'
import { RankBar } from '../ui/kit'
import { t } from '../lib/i18n'

export function loadText(ex: Exercise, kg: number): string {
  if (ex.load === 'bodyweight') return kg === 0 ? 'VA' : `${wAdded(kg)} ${wUnit()}`
  return fw(kg)
}

/** Birimsiz gösterim: tablo hücreleri için. */
export function loadNum(ex: Exercise, kg: number): string {
  return ex.load === 'bodyweight' ? wAdded(kg) : wNum(kg)
}

export function MuscleDetail({ muscle }: { muscle: MuscleId }) {
  const s = useApp()
  const board = useBoard(s)
  const sex = s.profile?.sex ?? 'm'
  const bw = currentBodyweight(s)
  const entry = board.muscles.find((m) => m.muscle === muscle)
  const exercises = allExercises(s.customExercises).filter((e) => e.muscle === muscle)
  const ranked = exercises
    .filter((e) => e.std)
    .sort((a, b) => (board.lifts.get(b.id)?.rp ?? -1) - (board.lifts.get(a.id)?.rp ?? -1))
  const unranked = exercises.filter((e) => !e.std)
  const carrier = entry?.lift ? exercises.find((e) => e.id === entry.lift!.exerciseId) : undefined
  const rank = entry?.rank ?? null

  return (
    <>
      <div className="topbar">
        <button className="iconbtn" onClick={() => back('/rank')} aria-label={t('Geri')}>
          <ArrowLeft />
        </button>
        <span className="topbar__title">{t('Rank')}</span>
      </div>

      <header className="head">
        <div>
          <h1>
            <span className="dot dot--lg" style={{ background: MUSCLE_COLOR[muscle] }} />
            {muscleName(muscle)}
          </h1>
          <p>
            {carrier && entry?.lift
              ? t('Rank\'i {0} taşıyor: {1} × {2}, {3}.', carrier.name, loadText(carrier, entry.lift.kg), entry.lift.reps, relDayLower(entry.lift.at))
              : t('Bu grupta henüz rank\'li bir set yok.')}
          </p>
        </div>
      </header>

      <section
        className="card card--tint"
        style={{ ['--tint' as string]: rank?.color ?? 'var(--control)' }}
        aria-label={t('Kas grubu rank\'i')}
      >
        <div className="rankhero" style={{ marginBottom: rank ? 16 : 0 }}>
          <Emblem rank={rank} size={76} />
          <div className="rankhero__body">
            <div className="fig rankhero__label">{rank ? rank.label : t('Sıralanmadı')}</div>
            <div className="rankhero__rp">
              {rank
                ? t('{0} rank\'i', muscleName(muscle))
                : t('Aşağıdaki hareketlerden birinde tek çalışma seti yeter.')}
            </div>
          </div>
        </div>
        {rank && <RankBar rank={rank} />}
      </section>

      {carrier && rank && rank.nextAt != null && (
        <>
          <div className="section">
            <h2>{rank.nextLabel} {t('için')}</h2>
          </div>
          <div className="card">
            <table className="table">
              <thead>
                <tr>
                  <th>{carrier.name}</th>
                  <th>{carrier.load === 'bodyweight' ? t('Ek kilo') : t('Kilo')}</th>
                </tr>
              </thead>
              <tbody>
                {[1, 3, 5, 8].map((reps) => {
                  const need = kgForRp(carrier, rank.nextAt!, bw, sex)!
                  const kg = kgAtReps(carrier, need, reps, bw)
                  return (
                    <tr key={reps}>
                      <td className="muted">{reps === 1 ? t('Tek tekrar') : t('{0} tekrarla', reps)}</td>
                      <td className="fig">{loadText(carrier, kg)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <p className="note" style={{ marginTop: 10 }}>
              {fw(bw)} {t('vücut ağırlığına göre. Bu setlerden herhangi biri yeter.')}
            </p>
          </div>
        </>
      )}

      <div className="section">
        <h2>{t('Rank\'li hareketler')}</h2>
      </div>
      <div className="card card--flush rows">
        {ranked.map((ex) => {
          const lift = board.lifts.get(ex.id)
          const r = lift ? rankFromRp(lift.rp) : null
          const entryKg = kgAtReps(ex, kgForRp(ex, r?.nextAt ?? 300, bw, sex)!, 5, bw)
          return (
            <button key={ex.id} className="row" onClick={() => go(`/exercise/${ex.id}`)}>
              <Emblem rank={r} size={30} />
              <div className="row__main">
                <div className="row__title">{ex.name}</div>
                <div className="row__sub num">
                  {lift
                    ? t('{0} · en iyi {1} × {2}', r!.label, loadText(ex, lift.kg), lift.reps)
                    : t('Demir III için {0} × 5', loadText(ex, entryKg))}
                </div>
              </div>
              <div className="row__end">
                {lift ? (
                  <div className="fig">
                    {int(lift.rp)}
                    <span className="unit">{t('RP')}</span>
                  </div>
                ) : (
                  <ChevronRight className="chev" />
                )}
              </div>
            </button>
          )
        })}
      </div>

      {unranked.length > 0 && (
        <p className="note">
          {t('Rank\'e sayılmayanlar:')} {unranked.map((e) => e.name).join(', ')}{t('. Bu hareketlerde yük ekipmana göre çok değiştiği için ortak bir standart yok.')}
        </p>
      )}
    </>
  )
}
