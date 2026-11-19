import { Check, ChevronRight, FileUp, Flame, Plus, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { SPLITS } from '../lib/splits'
import { SplitSheet } from './SplitSheet'
import { MUSCLE_COLOR, muscleName } from '../lib/exercises'
import { dayMonth, duration, int, relDay, weekday } from '../lib/format'
import { fw, wAdded, wInt, wUnit } from '../lib/units'
import {
  nearestPromotion,
  nextRoutine,
  routineLastAt,
  routineSummary,
  useBoard,
} from '../lib/hooks'
import { go } from '../lib/router'
import { streak, workoutSetCount, workoutVolume } from '../lib/stats'
import { actions, useApp } from '../lib/store'
import type { Routine } from '../lib/types'
import { Emblem } from '../ui/Emblem'
import { RankBar } from '../ui/kit'
import { t } from '../lib/i18n'

const DAYS = () => [t('Pzt'), t('Sal'), t('Çar'), t('Per'), t('Cum'), t('Cmt'), t('Paz')]

export function Today() {
  const s = useApp()
  const board = useBoard(s)
  const now = Date.now()
  const goal = s.profile!.weeklyGoal
  const st = streak(s.workouts, goal, now)
  const todayIndex = (new Date(now).getDay() + 6) % 7
  const daysLeft = 7 - todayIndex
  const remaining = Math.max(0, goal - st.thisWeek)
  const next = nextRoutine(s)
  const promo = nearestPromotion(board, s)
  const last = s.workouts[s.workouts.length - 1]
  const [splits, setSplits] = useState(false)

  const start = (routine?: Routine) => {
    if (!s.active) actions.startWorkout(routine)
    go('/active')
  }

  let finding: string
  if (remaining === 0) finding = t('Bu haftanın hedefi tamam: {0} antrenman.', st.thisWeek)
  else if (remaining > daysLeft)
    finding = t('Bu hafta {0}/{1}. Hedefe {2} antrenman kaldı, {3} gün var.', st.thisWeek, goal, remaining, daysLeft)
  else
    finding = t('Hedefe {0} antrenman kaldı. Pazar gecesine kadar {1} gün var.', remaining, daysLeft)

  return (
    <>
      <header className="head">
        <div>
          <h1>{t('Bugün')}</h1>
          <p>
            {weekday(now)}, {dayMonth(now)}
          </p>
        </div>
      </header>

      <section className="card" aria-label={t('Haftalık seri')}>
        <div className="streakline">
          <div>
            <Flame className={'flame' + (st.weeks > 0 ? ' flame--on' : '')} aria-hidden="true" />
            <span className="fig">{st.weeks}</span> <span className="muted">{t('hafta seri')}</span>
          </div>
          <span className="muted num">
            {t('Bu hafta')} {st.thisWeek}/{goal}
          </span>
        </div>
        <div className="week">
          {DAYS().map((d, i) => (
            <div
              key={d}
              className={
                'day' + (st.days[i] ? ' day--done' : '') + (i === todayIndex ? ' day--today' : '')
              }
            >
              <div className="day__dot">{st.days[i] && <Check strokeWidth={3} />}</div>
              <span>
                {d}
                {st.days[i] && <span className="sr"> {t('antrenman yapıldı')}</span>}
              </span>
            </div>
          ))}
        </div>
        <p className="note" style={{ marginTop: 14 }}>
          {finding}
        </p>
      </section>

      <div className="section">
        <h2>{t('Antrenman')}</h2>
      </div>

      {!s.active && (
        <div className="quick">
          <button className="gen" onClick={() => setSplits(true)}>
            <Sparkles aria-hidden="true" />
            <span className="gen__title">{t('Program oluştur')}</span>
            <span className="gen__sub">
              {SPLITS.length} {t('hazır split:')} {SPLITS.slice(0, 3).map((x) => x.name).join(', ')}…
            </span>
          </button>
          <button className="btn btn--ghost btn--block quick__empty" onClick={() => start()}>
            <Plus aria-hidden="true" />
            {t('Boş antrenman başlat')}
          </button>
        </div>
      )}

      {s.active ? (
        <button className="btn btn--primary btn--block" onClick={() => go('/active')}>
          {t('Antrenmana dön')}
        </button>
      ) : next ? (
        <section className="card card--hero" aria-label={t('Sıradaki antrenman')}>
          <div className="row" style={{ padding: 0, minHeight: 0, marginBottom: 14 }}>
            <div className="row__main">
              <h2>{t('Sıradaki:')} {next.routine.name}</h2>
              <p className="row__sub">{routineSummary(next.routine, s.customExercises)}</p>
            </div>
            <span className="row__sub">
              {next.lastAt ? relDay(next.lastAt, now) : t('İlk kez')}
            </span>
          </div>
          <button className="btn btn--onhero btn--block" onClick={() => start(next.routine)}>
            {next.routine.name} {t('antrenmanına başla')}
          </button>
        </section>
      ) : null}

      <div className="section">
        <h2>{t('İlerleme')}</h2>
      </div>

      <button
        className="card card--tint"
        style={{ ['--tint' as string]: board.overall?.color ?? 'var(--control)' }}
        onClick={() => go('/rank')}
        aria-label={t('Rank ayrıntılarını aç')}
      >
        {board.overall ? (
          <>
            <div className="rankhero" style={{ marginBottom: 14 }}>
              <Emblem rank={board.overall} size={56} />
              <div className="rankhero__body">
                <div className="fig rankhero__label">{board.overall.label}</div>
                <div className="rankhero__rp">{t('Genel rank')}</div>
              </div>
              <ChevronRight className="chev" />
            </div>
            <RankBar rank={board.overall} />
          </>
        ) : (
          <div className="rankhero">
            <Emblem rank={null} size={56} />
            <div className="rankhero__body">
              <h2>{t('Genel rankını başlat')}</h2>
              <p className="row__sub" style={{ whiteSpace: 'normal' }}>
                {t('Rank\'li bir harekette tek set, genel rankını başlatır.')}
              </p>
            </div>
            <ChevronRight className="chev" />
          </div>
        )}
      </button>

      {promo && (
        <button
          className="card card--edge"
          style={{ ['--tint' as string]: MUSCLE_COLOR[promo.muscle] }}
          onClick={() => go(`/rank/${promo.muscle}`)}
          aria-label={t('{0} rank ayrıntısı', muscleName(promo.muscle))}
        >
          <div className="row" style={{ padding: 0, minHeight: 0 }}>
            <div className="row__main">
              <h2>
                {t('En yakın terfi:')} {muscleName(promo.muscle)}, {promo.toLabel}
              </h2>
              <p className="row__sub" style={{ whiteSpace: 'normal' }}>
                {promo.exercise.name},{' '}
                {promo.exercise.load === 'bodyweight'
                  ? wAdded(promo.kg) + (promo.kg === 0 ? '' : ` ${wUnit()}`)
                  : fw(promo.kg)}{' '}
                × {promo.reps} {t('yeter.')}
              </p>
            </div>
            <div className="row__end">
              <div className="fig accent">{int(promo.rpLeft)}</div>
              <div className="row__sub">{t('RP kaldı')}</div>
            </div>
          </div>
        </button>
      )}

      {!s.active && s.routines.length > 0 && (
        <>
          <div className="section">
            <h2>{t('Programlar')}</h2>
            <span className="section__links">
              <button className="link" onClick={() => go('/routine/photo')}>
                {t('Fotoğraftan')}
              </button>
              <button className="link" onClick={() => go('/routine/new')}>
                {t('Yeni program')}
              </button>
            </span>
          </div>
          <div className="card card--flush rows">
            {s.routines.map((r) => {
              const lastAt = routineLastAt(s, r.id)
              return (
                <button key={r.id} className="row" onClick={() => start(r)}>
                  <div className="row__main">
                    <div className="row__title">{r.name}</div>
                    <div className="row__sub">{routineSummary(r, s.customExercises)}</div>
                  </div>
                  <span className="row__sub">{lastAt ? relDay(lastAt, now) : t('Yapılmadı')}</span>
                </button>
              )
            })}
          </div>
        </>
      )}

      {!s.active && s.workouts.length === 0 && (
        <button className="card import-cta" onClick={() => go('/import')}>
          <FileUp aria-hidden="true" />
          <div>
            <h2>{t('Başka uygulamadan mı geliyorsun?')}</h2>
            <p className="row__sub" style={{ whiteSpace: 'normal' }}>
              {t('Strong, Hevy, FitNotes ya da herhangi bir tablodan geçmişini getir; rank\'in hemen hesaplansın.')}
            </p>
          </div>
        </button>
      )}

      <div className="section">
        <h2>{t('Son antrenman')}</h2>
        {s.workouts.length > 1 && (
          <button className="link" onClick={() => go('/history')}>
            {t('Tümü (')}{s.workouts.length})
          </button>
        )}
      </div>
      {last ? (
        <button className="card" onClick={() => go(`/workout/${last.id}`)}>
          <div className="row" style={{ padding: 0, minHeight: 0 }}>
            <div className="row__main">
              <div className="row__title">{last.name}</div>
              <div className="row__sub">
                {relDay(last.endedAt, now)} · {duration(last.endedAt - last.startedAt)} ·{' '}
                {workoutSetCount(last)} {t('set')}
              </div>
            </div>
            <div className="row__end">
              <div className="fig">
                {wInt(workoutVolume(last, s.customExercises))}
                <span className="unit">{wUnit()}</span>
              </div>
              <div className="row__sub">{t('hacim')}</div>
            </div>
          </div>
        </button>
      ) : (
        <p className="empty">{t('İlk antrenmanını bitirdiğinde burada görünür.')}</p>
      )}
      {splits && (
        <SplitSheet
          onClose={() => setSplits(false)}
          onStart={(r) => {
            setSplits(false)
            start(r)
          }}
        />
      )}
    </>
  )
}
