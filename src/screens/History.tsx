import { duration, monthYear, relDay, shortDate } from '../lib/format'
import { fwi, toW, wInt, wUnit } from '../lib/units'
import { go } from '../lib/router'
import { streak, weeklyVolume, workoutSetCount, workoutVolume } from '../lib/stats'
import { useApp } from '../lib/store'
import type { Workout } from '../lib/types'
import { VolumeBars, WeekBars } from '../ui/charts'
import { t } from '../lib/i18n'

export function History() {
  const s = useApp()
  const goal = s.profile!.weeklyGoal
  const st = streak(s.workouts, goal)
  const met = st.history.filter((w) => w.met).length
  const active = st.history.filter((w) => w.count > 0).length

  const vol = weeklyVolume(s.workouts, s.customExercises)
  const volNow = vol[vol.length - 1].kg
  const volPrev = vol[vol.length - 2].kg
  const volNote =
    volPrev > 0
      ? t('Bu hafta {0}, geçen hafta {1}.', fwi(volNow), fwi(volPrev))
      : t('Bu hafta {0}.', fwi(volNow))

  const groups: { key: string; items: Workout[] }[] = []
  for (const w of [...s.workouts].reverse()) {
    const key = monthYear(w.endedAt)
    const g = groups[groups.length - 1]
    if (g && g.key === key) g.items.push(w)
    else groups.push({ key, items: [w] })
  }

  return (
    <>
      <header className="head">
        <div>
          <h1>{t('Geçmiş')}</h1>
          <p>
            {s.workouts.length === 0
              ? t('Bitirdiğin antrenmanlar burada birikir.')
              : active === 0
                ? t('Son 12 haftada antrenman yok. Toplam {0} antrenman.', s.workouts.length)
                : t('Son 12 haftanın {0} tanesinde haftalık hedefi tutturdun.', met)}
          </p>
        </div>
      </header>

      <section className="card" aria-label={t('Haftalık antrenman sayısı')}>
        <div className="row" style={{ padding: 0, minHeight: 0, marginBottom: 12 }}>
          <h2 className="row__main">{t('Haftalık antrenman')}</h2>
          <span className="row__sub">{t('Kesik çizgi: hedef')} {goal}</span>
        </div>
        <WeekBars weeks={st.history} goal={goal} />
      </section>

      {vol.some((v) => v.kg > 0) && (
        <section className="card" aria-label={t('Haftalık hacim')}>
          <h2 style={{ marginBottom: 4 }}>
            {t('Haftalık hacim')} <span className="faint" style={{ fontWeight: 400 }}>· {wUnit()}</span>
          </h2>
          <p className="row__sub num" style={{ whiteSpace: 'normal', marginBottom: 12 }}>
            {volNote}
          </p>
          <VolumeBars
            label={t('Son 12 haftada haftalık toplam hacim')}
            bars={vol.map((v, i) => ({
              key: v.start,
              kg: toW(v.kg),
              title: t('{0} haftası: {1}', shortDate(v.start), fwi(v.kg)),
              tick: i === vol.length - 1 ? t('Bu hafta') : i % 4 === 0 ? shortDate(v.start) : undefined,
            }))}
          />
        </section>
      )}

      {groups.length === 0 && (
        <p className="empty">{t('Henüz antrenman yok. Bugün sekmesinden ilkini başlat.')}</p>
      )}

      {groups.map((g) => (
        <section key={g.key} aria-label={g.key}>
          <div className="section" style={{ marginBottom: 12 }}>
            <h2>{g.key}</h2>
            <span className="row__sub num">{g.items.length} {t('antrenman')}</span>
          </div>
          <div className="card card--flush rows">
            {g.items.map((w) => (
              <button key={w.id} className="row" onClick={() => go(`/workout/${w.id}`)}>
                <div className="row__main">
                  <div className="row__title">{w.name}</div>
                  <div className="row__sub num">
                    {relDay(w.endedAt)} · {duration(w.endedAt - w.startedAt)} ·{' '}
                    {workoutSetCount(w)} {t('set')}
                  </div>
                </div>
                <div className="row__end">
                  <div className="fig">
                    {wInt(workoutVolume(w, s.customExercises))}
                    <span className="unit">{wUnit()}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </section>
      ))}
    </>
  )
}
