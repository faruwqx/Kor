import { ArrowLeft, ListPlus, MoreHorizontal, Trash2, Trophy } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { usePremium } from '../lib/cloud'
import { FREE_ROUTINES } from '../lib/cloud-core'
import { MUSCLE_COLOR, findExercise, muscleName } from '../lib/exercises'
import { clock, dayMonth, duration, int, timer, weekday } from '../lib/format'
import { fw1, fwi, wInt, wNum1, wUnit } from '../lib/units'
import { e1rm, rankBoard, setLoad, setRp, MAX_RANK_REPS } from '../lib/rank'
import { back, go } from '../lib/router'
import { isWorkSet, volumePRs, workoutPRs, workoutSetCount, workoutVolume } from '../lib/stats'
import { actions, useApp } from '../lib/store'
import { Emblem } from '../ui/Emblem'
import { Confetti, Confirm, Sheet, toast } from '../ui/kit'
import { loadNum, loadText } from './MuscleDetail'
import { t } from '../lib/i18n'

export function WorkoutDetail({ id, fresh }: { id: string; fresh?: boolean }) {
  const s = useApp()
  const w = s.workouts.find((x) => x.id === id)
  const sex = s.profile?.sex ?? 'm'
  const [menu, setMenu] = useState(false)
  const [del, setDel] = useState(false)
  const premium = usePremium()

  const diff = useMemo(() => {
    if (!w) return null
    const before = rankBoard(
      s.workouts.filter((x) => x.endedAt < w.endedAt),
      sex,
      s.customExercises,
    )
    const after = rankBoard(
      s.workouts.filter((x) => x.endedAt <= w.endedAt),
      sex,
      s.customExercises,
    )
    const rows = after.muscles
      .map((m, i) => ({ muscle: m.muscle, after: m.rank, before: before.muscles[i].rank }))
      .filter((r) => r.after && (!r.before || r.after.rp > r.before.rp))
    return { before, after, rows }
  }, [w, s.workouts, sex, s.customExercises])

  const records = useMemo(
    () =>
      w
        ? {
            prs: workoutPRs(w, s.workouts, s.customExercises),
            volume: volumePRs(w, s.workouts, s.customExercises),
          }
        : { prs: [], volume: [] },
    [w, s.workouts, s.customExercises],
  )
  const recordCount = records.prs.length + records.volume.length
  const celebrate = !!fresh && recordCount > 0

  // Rekor kutlaması: titreşim açıksa kısa bir zafer titreşimi.
  useEffect(() => {
    if (celebrate && s.settings.vibrate) navigator.vibrate?.([30, 60, 30, 60, 90])
    // Yalnızca bitiş ekranı açılınca bir kez.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [celebrate])

  if (!w || !diff) {
    return (
      <>
        <div className="topbar">
          <button className="iconbtn" onClick={() => go('/history', { replace: true })} aria-label={t('Geri')}>
            <ArrowLeft />
          </button>
        </div>
        <header className="head">
          <h1>{t('Antrenman bulunamadı')}</h1>
        </header>
        <p className="empty">{t('Bu antrenman silinmiş olabilir.')}</p>
      </>
    )
  }

  const { prs, volume } = records
  const totalPR = volume.find((v) => v.exerciseId == null)
  const exerciseVolumePRs = volume.filter((v) => v.exerciseId != null)
  const promos = diff.rows.filter(
    (r) => !r.before || r.after!.tier > r.before.tier || r.after!.division > r.before.division,
  )
  const overallUp =
    diff.after.overall &&
    (!diff.before.overall ||
      diff.after.overall.tier > diff.before.overall.tier ||
      (diff.after.overall.tier === diff.before.overall.tier &&
        diff.after.overall.division > diff.before.overall.division))

  return (
    <>
      <div className="topbar">
        {fresh ? (
          <span style={{ width: 8 }} />
        ) : (
          <button className="iconbtn" onClick={() => back('/history')} aria-label={t('Geri')}>
            <ArrowLeft />
          </button>
        )}
        <span className="topbar__title">{fresh ? '' : t('Antrenman')}</span>
        <button className="iconbtn" onClick={() => setMenu(true)} aria-label={t('Antrenman seçenekleri')}>
          <MoreHorizontal />
        </button>
      </div>

      <header className="head">
        <div>
          <h1>{fresh ? t('Antrenman tamam') : w.name}</h1>
          <p>
            {fresh ? `${w.name} · ` : ''}
            {weekday(w.endedAt)}, {dayMonth(w.endedAt)} · {clock(w.startedAt)}
          </p>
        </div>
      </header>

      {celebrate && (
        <section className="pr-hero" aria-label={t('Yeni rekorlar')}>
          <Confetti colors={['#ff5a1f', '#ffab00', '#10b8a6', '#f0389b', '#b478f0']} />
          <div className="pr-hero__badge" aria-hidden="true">
            <Trophy />
          </div>
          <div className="fig pr-hero__title">
            {recordCount === 1 ? t('Yeni rekor!') : t('{0} yeni rekor!', recordCount)}
          </div>
          <p className="pr-hero__sub">
            {[
              prs.length > 0 && t('{0} ağırlık rekoru', prs.length),
              totalPR && t('en yüksek antrenman hacmin: {0}', fwi(totalPR.value)),
              exerciseVolumePRs.length > 0 && t('{0} hareket hacim rekoru', exerciseVolumePRs.length),
            ]
              .filter(Boolean)
              .join(' · ')}
          </p>
        </section>
      )}

      {fresh && overallUp && (
        <div className="promo" style={{ ['--tint' as string]: diff.after.overall!.color }}>
          <Confetti
            colors={[diff.after.overall!.color, '#ff5a1f', '#10b8a6', '#ffab00', '#f0389b']}
          />
          <Emblem rank={diff.after.overall} size={72} className="promo__emblem" />
          <div>
            <div className="fig promo__title">{diff.after.overall!.label}</div>
            <p className="muted">
              {diff.before.overall
                ? t('Genel rank\'in {0} basamağından yükseldi.', diff.before.overall.label)
                : t('Yerleştirme tamam: genel rank\'in açıldı.')}
            </p>
          </div>
        </div>
      )}

      {fresh &&
        promos.map((r) => (
          <div className="promo" key={r.muscle} style={{ ['--tint' as string]: r.after!.color }}>
            <Confetti
              colors={[r.after!.color, MUSCLE_COLOR[r.muscle], '#ffab00', '#10b8a6', '#f0389b']}
            />
            <Emblem rank={r.after} size={56} className="promo__emblem" />
            <div>
              <div className="fig promo__title">
                {muscleName(r.muscle)}: {r.after!.label}
              </div>
              <p className="muted">
                {r.before ? t('{0} basamağından yükseldin.', r.before.label) : t('Bu kas grubu ilk kez sıralandı.')}
              </p>
            </div>
          </div>
        ))}

      <div className="kpis">
        <div className="kpi">
          <div className="kpi__label">{t('Süre')}</div>
          <div className="fig kpi__value">{duration(w.endedAt - w.startedAt)}</div>
        </div>
        <div className="kpi">
          <div className="kpi__label">{t('Hacim')}</div>
          <div className="fig kpi__value">
            {wInt(workoutVolume(w, s.customExercises))}
            <span className="unit">{wUnit()}</span>
          </div>
        </div>
        <div className="kpi">
          <div className="kpi__label">{t('Set')}</div>
          <div className="fig kpi__value">{workoutSetCount(w)}</div>
        </div>
      </div>

      {diff.rows.length > 0 && (
        <>
          <div className="section">
            <h2>{t('Rank\'e etkisi')}</h2>
          </div>
          <div className="card card--flush rows">
            {diff.rows.map((r) => (
              <button key={r.muscle} className="row" onClick={() => go(`/rank/${r.muscle}`)}>
                <Emblem rank={r.after} size={30} />
                <div className="row__main">
                  <div className="row__title">{muscleName(r.muscle)}</div>
                  <div className="row__sub num">
                    {r.before
                      ? r.before.label === r.after!.label
                        ? r.after!.label
                        : `${r.before.label} → ${r.after!.label}`
                      : t('İlk sıralama: {0}', r.after!.label)}
                  </div>
                </div>
                <div className="row__end">
                  <div className="fig accent">
                    +{int(r.after!.rp - (r.before?.rp ?? 0))}
                    <span className="unit">{t('RP')}</span>
                  </div>
                </div>
              </button>
            ))}
          </div>
        </>
      )}

      {recordCount > 0 && (
        <>
          <div className="section">
            <h2>{t('Rekorlar')}</h2>
          </div>
          <div className="card card--flush rows">
            {totalPR && (
              <div className="row">
                <div className="row__main">
                  <div className="row__title">{t('Antrenman hacmi')}</div>
                  <div className="row__sub num">
                    {t('Tüm antrenmanların en yükseği, önceki')} {fwi(totalPR.previous)}
                  </div>
                </div>
                <div className="row__end">
                  <div className="fig accent">
                    +{wInt(totalPR.value - totalPR.previous)}
                    <span className="unit">{wUnit()}</span>
                  </div>
                </div>
              </div>
            )}
            {exerciseVolumePRs.map((v) => {
              const ex = findExercise(v.exerciseId!, s.customExercises)
              return (
                <button
                  key={'v-' + ex.id}
                  className="row"
                  onClick={() => go(`/exercise/${ex.id}`)}
                >
                  <div className="row__main">
                    <div className="row__title">{ex.name}</div>
                    <div className="row__sub num">
                      {t('Hacim rekoru:')} {fwi(v.value)}{t(', önceki')} {fwi(v.previous)}
                    </div>
                  </div>
                  <div className="row__end">
                    <div className="fig accent">
                      +{wInt(v.value - v.previous)}
                      <span className="unit">{wUnit()}</span>
                    </div>
                  </div>
                </button>
              )
            })}
            {prs.map((pr) => {
              const ex = findExercise(pr.exerciseId, s.customExercises)
              return (
                <button key={pr.exerciseId} className="row" onClick={() => go(`/exercise/${ex.id}`)}>
                  <div className="row__main">
                    <div className="row__title">{ex.name}</div>
                    <div className="row__sub num">
                      {pr.kind === 'kg'
                        ? t('En ağır set: {0} × {1}, önceki {2}', loadText(ex, pr.kg), pr.reps, loadText(ex, pr.previous))
                        : t('Tahmini 1TM: {0} × {1}, önceki {2}', loadText(ex, pr.kg), pr.reps, fw1(pr.previous))}
                    </div>
                  </div>
                  <div className="row__end">
                    <div className="fig accent">
                      {pr.kind === 'kg' ? (
                        <>+{wNum1(pr.value - pr.previous)}</>
                      ) : (
                        <>{wNum1(pr.value)}</>
                      )}
                      <span className="unit">{wUnit()}</span>
                    </div>
                  </div>
                </button>
              )
            })}
          </div>
        </>
      )}

      <div className="section">
        <h2>{t('Hareketler')}</h2>
      </div>
      {w.exercises.map((we) => {
        const ex = findExercise(we.exerciseId, s.customExercises)
        let n = 0
        return (
          <div className="card" key={we.uid}>
            <button
              className="row"
              style={{ padding: 0, minHeight: 0, marginBottom: 10 }}
              onClick={() => go(`/exercise/${ex.id}`)}
            >
              <h3 className="row__main">{ex.name}</h3>
            </button>
            <table className="table">
              <thead>
                <tr>
                  <th>{t('Set')}</th>
                  <th>{ex.load === 'bodyweight' ? t('Ek kilo') : t('Kilo')}</th>
                  <th>{ex.timed ? t('Süre') : t('Tekrar')}</th>
                  {!ex.timed && <th>{t('1TM')}</th>}
                  {ex.std && <th>{t('RP')}</th>}
                </tr>
              </thead>
              <tbody>
                {we.sets.map((st, i) => {
                  const work = isWorkSet(st)
                  if (work) n++
                  const kg = st.kg ?? 0
                  const reps = st.reps ?? 0
                  const rp = work ? setRp(ex, kg, reps, w.bodyweight, sex) : null
                  const est =
                    work && reps <= MAX_RANK_REPS ? e1rm(setLoad(ex, kg, w.bodyweight), reps) : 0
                  return (
                    <tr key={i}>
                      <td className="muted">{st.warmup ? t('Isınma') : n}</td>
                      <td className="fig">
                        {ex.timed && !kg ? <span className="dash">–</span> : loadNum(ex, kg)}
                      </td>
                      <td className="fig">
                        {ex.timed ? st.sec ? timer(st.sec) : <span className="dash">–</span> : reps}
                      </td>
                      {!ex.timed && <td>{est ? wNum1(est) : <span className="dash">–</span>}</td>}
                      {ex.std && <td>{rp != null ? int(rp) : <span className="dash">–</span>}</td>}
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )
      })}

      {fresh && (
        <button className="btn btn--primary btn--block" onClick={() => go('/', { replace: true })}>
          {t('Tamam')}
        </button>
      )}

      {menu && (
        <Sheet title={w.name} onClose={() => setMenu(false)}>
          <div className="rows menu">
            <button
              className="row"
              onClick={() => {
                if (!premium && s.routines.length >= FREE_ROUTINES) {
                  setMenu(false)
                  toast(`Ücretsiz planda ${FREE_ROUTINES} program tutabilirsin`)
                  go('/premium')
                  return
                }
                actions.routineFromWorkout(w)
                setMenu(false)
                toast('Program olarak kaydedildi')
              }}
            >
              <ListPlus />
              <div className="row__main">
                <div>{t('Program olarak kaydet')}</div>
                <div className="row__sub">{t('Aynı hareketlerle tekrar başlatabilirsin')}</div>
              </div>
            </button>
            <button
              className="row row--danger"
              onClick={() => {
                setMenu(false)
                setDel(true)
              }}
            >
              <Trash2 />
              <span className="row__main">{t('Antrenmanı sil')}</span>
            </button>
          </div>
        </Sheet>
      )}
      {del && (
        <Confirm
          title={t('Antrenman silinsin mi?')}
          body={t('Bu antrenmanın setleri, rekorları ve rank\'e katkısı geri alınamaz şekilde silinir.')}
          confirm={t('Sil')}
          danger
          onConfirm={() => {
            actions.deleteWorkout(w.id)
            go('/history', { replace: true })
          }}
          onClose={() => setDel(false)}
        />
      )}
    </>
  )
}
