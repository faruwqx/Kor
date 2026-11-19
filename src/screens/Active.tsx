import {
  ArrowDown,
  ArrowUp,
  Check,
  ChevronDown,
  Expand,
  Flame,
  MoreHorizontal,
  Play,
  Plus,
  Square,
  Trash2,
  X,
} from 'lucide-react'
import { Fragment, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { beep, primeSound } from '../lib/beep'
import { MUSCLE_COLOR, exerciseMeta, findExercise } from '../lib/exercises'
import { num, parseNum, timer } from '../lib/format'
import { fromWField, fw, fw1, toWField, wAdded, wNum, wNum1, wUnit } from '../lib/units'
import { useBoard, useNow, useWakeLock } from '../lib/hooks'
import { MAX_RANK_REPS, e1rm, kgAtReps, kgForRp, rankFromRp, setLoad, setRp } from '../lib/rank'
import { go } from '../lib/router'
import { digitsToSec, digitsToText, restView, secToDigits } from '../lib/rest'
import { bestSeconds, exerciseSessions, isWorkSet, lastSets } from '../lib/stats'
import { actions, currentBodyweight, useApp } from '../lib/store'
import type { AppState, Exercise, SetEntry, WorkoutExercise } from '../lib/types'
import { Confirm, Sheet, toast } from '../ui/kit'
import { Picker } from './Picker'
import { t } from '../lib/i18n'

export function Active() {
  const s = useApp()
  const a = s.active
  const now = useNow(!!a, 500)
  const [picker, setPicker] = useState(false)
  const [exMenu, setExMenu] = useState<string | null>(null)
  const [setMenu, setSetMenu] = useState<{ uid: string; index: number } | null>(null)
  const [confirm, setConfirm] = useState<'finish' | 'finishClean' | 'discard' | 'empty' | null>(
    null,
  )
  const [aod, setAod] = useState(false)

  // Antrenman açıkken ekran uyumasın (dinlenmede telefonu bırakınca sönmesin).
  useWakeLock(!!a)

  useEffect(() => {
    if (!a) go('/', { replace: true })
  }, [a])

  // Dinlenme hedefi dolunca bir kez titret ve bip çal. Sayaç kapanmaz: bir sonraki
  // set tamamlanana kadar kırmızı olarak saymayı sürdürür.
  const restStartedAt = a?.restStartedAt
  const restEndsAt = a?.restEndsAt
  const { vibrate, sound } = s.settings
  useEffect(() => {
    if (!restEndsAt) return
    const ms = restEndsAt - Date.now()
    // Uygulama yeniden açıldığında çoktan dolmuş bir hedef için yeniden uyarma.
    if (ms < 0) return
    const id = setTimeout(() => {
      if (vibrate) navigator.vibrate?.([200, 100, 200, 100, 200])
      if (sound !== false) beep()
    }, ms)
    return () => clearTimeout(id)
  }, [restEndsAt, vibrate, sound])

  if (!a) return null

  const undone = a.exercises.reduce((n, we) => n + we.sets.filter((x) => !x.done).length, 0)
  const doneCount = a.exercises.reduce((n, we) => n + we.sets.filter(isWorkSet).length, 0)

  const finish = () => {
    const id = actions.finishWorkout()
    if (id) go(`/workout/${id}/yeni`, { replace: true })
  }
  const onFinish = () => {
    if (doneCount === 0) setConfirm('empty')
    else if (undone > 0) setConfirm('finish')
    else setConfirm('finishClean')
  }

  const rest = restStartedAt && restEndsAt ? restView(restStartedAt, restEndsAt, now) : null

  // Always-on ekranda gösterilecek hareket: ilk tamamlanmamış seti olan hareket,
  // yoksa ilk hareket; hiç hareket yoksa antrenman adı.
  const currentWe = a.exercises.find((we) => we.sets.some((x) => !x.done)) ?? a.exercises[0]
  const currentName = currentWe
    ? findExercise(currentWe.exerciseId, s.customExercises).name
    : a.name
  const menuEx = a.exercises.find((we) => we.uid === exMenu)
  const menuIndex = a.exercises.findIndex((we) => we.uid === exMenu)
  const menuSet = setMenu
    ? a.exercises.find((we) => we.uid === setMenu.uid)?.sets[setMenu.index]
    : undefined

  return (
    <main className="logger">
      <div className="logger__bar">
        <button className="iconbtn" onClick={() => go('/')} aria-label={t('Antrenmanı küçült')}>
          <ChevronDown />
        </button>
        <input
          className="logger__name"
          value={a.name}
          onChange={(e) => actions.renameActive(e.target.value)}
          aria-label={t('Antrenman adı')}
          maxLength={40}
        />
        <span className="fig logger__time" aria-label={t('Geçen süre')}>
          {timer((now - a.startedAt) / 1000)}
        </span>
        <button
          className="iconbtn"
          onClick={() => setAod(true)}
          aria-label={t('Ekranı açık tut (always-on)')}
        >
          <Expand />
        </button>
        <button className="btn btn--primary btn--sm" onClick={onFinish}>
          {t('Bitir')}
        </button>
      </div>

      <h1 className="sr">{a.name}</h1>

      {a.exercises.length === 0 && (
        <p className="empty" style={{ marginTop: 12 }}>
          {t('Bu antrenmanda henüz hareket yok. İlk hareketini ekle, setlerini yazdıkça rank\'in güncellenir.')}
        </p>
      )}

      {a.exercises.map((we) => {
        const Card = findExercise(we.exerciseId, s.customExercises).timed ? TimedCard : ExerciseCard
        return (
          <Card
            key={we.uid}
            we={we}
            state={s}
            now={now}
            onMenu={() => setExMenu(we.uid)}
            onSetMenu={(index) => setSetMenu({ uid: we.uid, index })}
          />
        )
      })}

      <button className="btn btn--ghost btn--block" onClick={() => setPicker(true)}>
        <Plus /> {t('Hareket ekle')}
      </button>
      <div style={{ textAlign: 'center' }}>
        <button className="textbtn" onClick={() => setConfirm('discard')}>
          {t('Antrenmanı sil')}
        </button>
      </div>

      <p className="sr" role="status">
        {rest?.over ? t('Dinlenme süresi doldu. Sete başla.') : ''}
      </p>
      {rest && (
        <div className="rest">
          <div
            className={'rest__box' + (rest.over ? ' rest__box--over' : '')}
            role="timer"
            aria-label={t('Dinlenme sayacı')}
          >
            <div style={{ flex: 1 }}>
              <div className="rest__label">
                {rest.over ? t('Süre doldu, sete başla') : t('Dinlenme · hedef {0}', timer(rest.target))}
              </div>
              <div className="fig rest__time">{timer(rest.elapsed)}</div>
            </div>
            <button
              className="chipbtn"
              onClick={() => actions.adjustRest(-15)}
              aria-label={t('Hedefi 15 saniye kısalt')}
            >
              −15
            </button>
            <button
              className="chipbtn"
              onClick={() => actions.adjustRest(15)}
              aria-label={t('Hedefi 15 saniye uzat')}
            >
              +15
            </button>
            <button className="chipbtn" onClick={() => actions.clearRest()}>
              {t('Kapat')}
            </button>
            <div className="rest__line" style={{ width: `${rest.progress * 100}%` }} />
          </div>
        </div>
      )}

      {picker && <Picker onClose={() => setPicker(false)} onPick={(ids) => actions.addExercises(ids)} />}

      {menuEx && (
        <Sheet
          title={findExercise(menuEx.exerciseId, s.customExercises).name}
          onClose={() => setExMenu(null)}
        >
          <div className="rows menu">
            <button
              className="row"
              onClick={() => {
                setExMenu(null)
                go(`/exercise/${menuEx.exerciseId}`)
              }}
            >
              <Flame />
              <span className="row__main">{t('Geçmişi ve rank\'i gör')}</span>
            </button>
            {menuIndex > 0 && (
              <button
                className="row"
                onClick={() => {
                  actions.moveExercise(menuEx.uid, -1)
                  setExMenu(null)
                }}
              >
                <ArrowUp />
                <span className="row__main">{t('Yukarı taşı')}</span>
              </button>
            )}
            {menuIndex < a.exercises.length - 1 && (
              <button
                className="row"
                onClick={() => {
                  actions.moveExercise(menuEx.uid, 1)
                  setExMenu(null)
                }}
              >
                <ArrowDown />
                <span className="row__main">{t('Aşağı taşı')}</span>
              </button>
            )}
            <button
              className="row row--danger"
              onClick={() => {
                actions.removeExercise(menuEx.uid)
                setExMenu(null)
              }}
            >
              <Trash2 />
              <span className="row__main">{t('Hareketi kaldır')}</span>
            </button>
          </div>
        </Sheet>
      )}

      {setMenu && menuSet && (
        <Sheet title={t('Set {0}', setMenu.index + 1)} onClose={() => setSetMenu(null)}>
          <div className="rows menu">
            <button
              className="row"
              onClick={() => {
                actions.updateSet(setMenu.uid, setMenu.index, { warmup: !menuSet.warmup })
                setSetMenu(null)
              }}
            >
              <Flame />
              <div className="row__main">
                <div>{menuSet.warmup ? t('Çalışma seti yap') : t('Isınma seti yap')}</div>
                <div className="row__sub">{t('Isınma setleri hacme, rekora ve rank\'e sayılmaz')}</div>
              </div>
            </button>
            <button
              className="row row--danger"
              onClick={() => {
                actions.removeSet(setMenu.uid, setMenu.index)
                setSetMenu(null)
              }}
            >
              <Trash2 />
              <span className="row__main">{t('Seti sil')}</span>
            </button>
          </div>
        </Sheet>
      )}

      {confirm === 'finishClean' && (
        <Confirm
          title={t('Antrenmanı bitir')}
          body={t('Tamamladığın {0} set kaydedilecek. Antrenmanı bitirmek istediğine emin misin?', doneCount)}
          confirm={t('Bitir')}
          onConfirm={finish}
          onClose={() => setConfirm(null)}
        />
      )}
      {confirm === 'finish' && (
        <Confirm
          title={t('Antrenmanı bitir')}
          body={t('{0} set işaretlenmedi. Bitirince yalnızca tamamladığın {1} set kaydedilir.', undone, doneCount)}
          confirm={t('Bitir')}
          onConfirm={finish}
          onClose={() => setConfirm(null)}
        />
      )}
      {confirm === 'empty' && (
        <Confirm
          title={t('Tamamlanmış set yok')}
          body={t('Kaydedilecek bir set olmadığı için antrenman silinir. Devam etmek istersen vazgeç.')}
          confirm={t('Antrenmanı sil')}
          danger
          onConfirm={() => actions.discardWorkout()}
          onClose={() => setConfirm(null)}
        />
      )}
      {confirm === 'discard' && (
        <Confirm
          title={t('Antrenman silinsin mi?')}
          body={t('Bu antrenmanda yazdığın setler kaydedilmeden silinir.')}
          confirm={t('Sil')}
          danger
          onConfirm={() => actions.discardWorkout()}
          onClose={() => setConfirm(null)}
        />
      )}

      {aod && (
        <AodView
          name={currentName}
          rest={rest}
          elapsed={(now - a.startedAt) / 1000}
          onExit={() => setAod(false)}
        />
      )}
    </main>
  )
}

/**
 * Always-on ekran: telefonu antrenman sırasında dik bırakınca okunacak sade, koyu
 * görünüm. Dinlenme sayacı varsa geri sayımı, yoksa geçen süreyi büyük gösterir;
 * üstte o anki hareketin adı. Ekran açık kalır (useWakeLock). Dokununca kapanır.
 */
function AodView({
  name,
  rest,
  elapsed,
  onExit,
}: {
  name: string
  rest: { target: number; elapsed: number; over: boolean } | null
  elapsed: number
  onExit: () => void
}) {
  const resting = rest != null
  const big = resting ? (rest.over ? rest.elapsed : Math.max(0, rest.target - rest.elapsed)) : elapsed
  const label = resting ? (rest.over ? t('Dinlenme doldu · sete başla') : t('Dinlenme')) : t('Süre')
  return (
    <div
      className={'aod' + (resting && rest.over ? ' aod--over' : '')}
      role="button"
      tabIndex={0}
      aria-label={t('Always-on ekranı kapat')}
      onClick={onExit}
      onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ' || e.key === 'Escape') && onExit()}
    >
      <button className="aod__close iconbtn" onClick={onExit} aria-label={t('Kapat')}>
        <X />
      </button>
      <div className="aod__name">{name}</div>
      <div className="fig aod__time" role="timer" aria-label={label}>
        {timer(big)}
      </div>
      <div className="aod__label">{label}</div>
      <div className="aod__hint">{t('Çıkmak için dokun')}</div>
    </div>
  )
}

function fmtLoad(ex: Exercise, kg: number): string {
  return ex.load === 'bodyweight' ? wAdded(kg) : wNum(kg)
}

function ExerciseCard({
  we,
  state,
  onMenu,
  onSetMenu,
}: {
  we: WorkoutExercise
  state: AppState
  /** Yalnızca süreli kart kullanır; iki kart aynı çağrıyla çizilebilsin diye burada da var. */
  now?: number
  onMenu: () => void
  onSetMenu: (index: number) => void
}) {
  const ex = findExercise(we.exerciseId, state.customExercises)
  const sex = state.profile?.sex ?? 'm'
  const bw = currentBodyweight(state)
  const board = useBoard(state)
  const prev = useMemo(() => lastSets(ex.id, state.workouts), [ex.id, state.workouts])
  const histBest = useMemo(() => {
    const sessions = exerciseSessions(ex.id, state.workouts, state.customExercises)
    return sessions.length ? Math.max(...sessions.map((x) => x.e1rm)) : null
  }, [ex.id, state.workouts, state.customExercises])

  // Yer tutucu: geçen antrenmanın aynı seti, yoksa bu antrenmanda bir önceki dolu set.
  const hintFor = (i: number): { kg: number | null; reps: number | null } => {
    for (let j = i - 1; j >= 0; j--) {
      const p = we.sets[j]
      if (p.done && p.reps != null && !p.warmup) return { kg: p.kg ?? 0, reps: p.reps }
    }
    const p = prev[i] ?? prev[prev.length - 1]
    return p ? { kg: p.kg, reps: p.reps } : { kg: null, reps: null }
  }

  // Bu antrenmanın rekoru: geçmişin en iyi tahmini 1TM'ini geçen en iyi set.
  let prIndex = -1
  let prValue = 0
  if (histBest != null) {
    we.sets.forEach((x, i) => {
      if (!isWorkSet(x) || x.reps > MAX_RANK_REPS) return
      const e = e1rm(setLoad(ex, x.kg, bw), x.reps)
      if (e > histBest + 0.05 && e > prValue) {
        prValue = e
        prIndex = i
      }
    })
  }

  const sessionRp = we.sets.reduce((m, x) => {
    if (!isWorkSet(x)) return m
    return Math.max(m, setRp(ex, x.kg, x.reps, bw, sex) ?? -1)
  }, -1)
  const bestRp = Math.max(sessionRp, board.lifts.get(ex.id)?.rp ?? -1)

  let goal: ReactNode = null
  if (ex.std) {
    const firstOpen = we.sets.findIndex((x) => !x.done)
    const reps = Math.min(
      Math.max(hintFor(firstOpen < 0 ? we.sets.length : firstOpen).reps ?? 5, 1),
      10,
    )
    if (bestRp < 0) {
      goal = <>{t('İlk setinle rank alır')}</>
    } else {
      const rank = rankFromRp(bestRp)
      if (rank.nextAt == null) goal = <b>{rank.label}</b>
      else {
        const need = kgForRp(ex, rank.nextAt, bw, sex)!
        const kg = kgAtReps(ex, need, reps, bw)
        goal = (
          <>
            {rank.label} · <b>{rank.nextLabel}</b> {t('için')} {fmtLoad(ex, kg)}
            {ex.load === 'bodyweight' && kg === 0 ? '' : ` ${wUnit()}`} × {reps}
          </>
        )
      }
    }
  }

  let workNo = 0
  return (
    <section className="ex" aria-label={ex.name}>
      <div className="ex__head">
        <div className="ex__title">
          <h2>{ex.name}</h2>
          <p>
            <span className="dot" style={{ background: MUSCLE_COLOR[ex.muscle] }} />
            {exerciseMeta(ex)}
          </p>
        </div>
        <button className="iconbtn" onClick={onMenu} aria-label={t('{0} seçenekleri', ex.name)}>
          <MoreHorizontal />
        </button>
      </div>

      <div className="sets">
        <div className="sets__h">{t('Set')}</div>
        <div className="sets__h">{t('Önceki')}</div>
        <div className="sets__h">{ex.load === 'bodyweight' ? `+ ${wUnit()}` : wUnit()}</div>
        <div className="sets__h">{t('Tekrar')}</div>
        <div className="sets__h">
          <span className="sr">{t('Tamamla')}</span>
        </div>
        {we.sets.map((set, i) => {
          if (!set.warmup) workNo++
          const hint = hintFor(i)
          const p = prev[i]
          return (
            <SetRow
              key={i}
              ex={ex}
              set={set}
              label={set.warmup ? t('Isı') : String(workNo)}
              hint={hint}
              prevText={p ? `${fmtLoad(ex, p.kg ?? 0)} × ${p.reps}` : '–'}
              isPr={i === prIndex}
              prText={
                i === prIndex
                  ? t('Rekor · tahmini 1TM {0} (+{1})', fw1(prValue), wNum1(prValue - histBest!))
                  : ''
              }
              onNumber={() => onSetMenu(i)}
              onChange={(patch) => actions.updateSet(we.uid, i, patch)}
              onToggle={() => {
                if (set.done) {
                  actions.uncompleteSet(we.uid, i)
                  return
                }
                const kg = set.kg ?? hint.kg ?? (ex.load === 'bodyweight' ? 0 : null)
                const reps = set.reps ?? hint.reps
                if (kg == null || reps == null || reps <= 0) {
                  toast('Önce kilo ve tekrarı yaz')
                  return
                }
                if (state.settings.vibrate) navigator.vibrate?.(12)
                // Dokunuş anında sesi aç: dinlenme dolunca bip çalabilsin.
                primeSound()
                actions.completeSet(we.uid, i, kg, reps)
              }}
            />
          )
        })}
      </div>

      <div className="ex__foot">
        <button className="textbtn" onClick={() => actions.addSet(we.uid)}>
          <Plus /> {t('Set ekle')}
        </button>
        {goal && <p className="ex__goal num">{goal}</p>}
      </div>
    </section>
  )
}

/** Süreli hareket (Hyrox): her set bir kronometreyle tutulur ya da süre elle yazılır. */
function TimedCard({
  we,
  state,
  now,
  onMenu,
  onSetMenu,
}: {
  we: WorkoutExercise
  state: AppState
  now: number
  onMenu: () => void
  onSetMenu: (index: number) => void
}) {
  const ex = findExercise(we.exerciseId, state.customExercises)
  const prev = useMemo(() => lastSets(ex.id, state.workouts), [ex.id, state.workouts])
  const histBest = useMemo(() => {
    const secs = exerciseSessions(ex.id, state.workouts, state.customExercises)
      .map((x) => x.bestSec)
      .filter((x): x is number => x != null)
    return secs.length ? (ex.longer ? Math.max(...secs) : Math.min(...secs)) : null
  }, [ex.id, ex.longer, state.workouts, state.customExercises])

  // Bu antrenmanın rekoru: geçmişin en iyisini geçen set (plank ve kardiyoda uzun, diğerlerinde kısa).
  const sessionBest = bestSeconds(we.sets, ex.longer)
  const prIndex =
    histBest != null &&
    sessionBest != null &&
    (ex.longer ? sessionBest > histBest : sessionBest < histBest)
      ? we.sets.findIndex((x) => x.done && !x.warmup && x.sec === sessionBest)
      : -1

  const kgHint = (i: number): number | null => {
    for (let j = i - 1; j >= 0; j--) {
      const p = we.sets[j]
      if (p.done && p.kg) return p.kg
    }
    const p = prev[i] ?? prev[prev.length - 1]
    return p?.kg ? p.kg : null
  }

  let workNo = 0
  return (
    <section className="ex" aria-label={ex.name}>
      <div className="ex__head">
        <div className="ex__title">
          <h2>{ex.name}</h2>
          <p>
            <span className="dot" style={{ background: MUSCLE_COLOR[ex.muscle] }} />
            {exerciseMeta(ex)}
          </p>
        </div>
        <button className="iconbtn" onClick={onMenu} aria-label={t('{0} seçenekleri', ex.name)}>
          <MoreHorizontal />
        </button>
      </div>

      <div className="sets sets--timed">
        <div className="sets__h">{t('Set')}</div>
        <div className="sets__h">{t('Önceki')}</div>
        <div className="sets__h">{wUnit()}</div>
        <div className="sets__h">{t('Süre')}</div>
        <div className="sets__h">
          <span className="sr">{t('Sayaç')}</span>
        </div>
        {we.sets.map((set, i) => {
          if (!set.warmup) workNo++
          const label = set.warmup ? t('Isı') : String(workNo)
          const p = prev[i]
          const hint = kgHint(i)
          const running = set.startedAt != null && !set.done
          const cls = (set.done ? 'set--done ' : '') + (i === prIndex ? 'set--pr' : '')
          const complete = (sec: number) => {
            if (state.settings.vibrate) navigator.vibrate?.(12)
            primeSound()
            actions.completeSet(we.uid, i, set.kg ?? hint ?? 0, 1, sec)
          }
          const onToggle = () => {
            if (set.done) actions.uncompleteSet(we.uid, i)
            else if (running)
              complete(Math.max(1, Math.round((Date.now() - set.startedAt!) / 1000)))
            else if (set.sec) complete(set.sec)
            else {
              primeSound()
              actions.startSetTimer(we.uid, i)
            }
          }
          return (
            <Fragment key={i}>
              <button
                className={'fig setno' + (set.warmup ? ' setno--warm' : '')}
                onClick={() => onSetMenu(i)}
                aria-label={t('Set {0} seçenekleri', label)}
              >
                {label}
              </button>
              <div className="prev num">
                {p?.sec ? timer(p.sec) + (p.kg ? ` · ${fw(p.kg)}` : '') : '–'}
              </div>
              <div className={cls}>
                <NumField
                  value={toWField(set.kg)}
                  placeholder={hint != null ? wNum(hint) : ''}
                  decimal
                  label={t('Set {0} kilo, isteğe bağlı', label)}
                  onChange={(v) => actions.updateSet(we.uid, i, { kg: fromWField(v) })}
                />
              </div>
              <div className={cls}>
                {running ? (
                  <div className="field field--live" role="timer" aria-label={t('Set {0} süresi', label)}>
                    {timer((now - set.startedAt!) / 1000)}
                  </div>
                ) : (
                  <TimeField
                    value={set.sec ?? null}
                    label={t('Set {0} süre, dakika ve saniye', label)}
                    onChange={(sec) => actions.updateSet(we.uid, i, { sec: sec ?? undefined })}
                  />
                )}
              </div>
              <div className={cls}>
                <button
                  className={'check' + (running ? ' check--stop' : '')}
                  style={{ width: '100%' }}
                  onClick={onToggle}
                  aria-pressed={set.done}
                  aria-label={
                    set.done
                      ? t('Set {0} tamamlandı', label)
                      : running
                        ? t('Set {0} sayacını durdur ve kaydet', label)
                        : set.sec
                          ? t('Set {0} süresini kaydet', label)
                          : t('Set {0} sayacını başlat', label)
                  }
                >
                  {running ? <Square /> : set.done || set.sec ? <Check strokeWidth={3} /> : <Play />}
                </button>
              </div>
              {i === prIndex && (
                <div className="sets__flag num">{t('Rekor · önceki en iyi')} {timer(histBest!)}</div>
              )}
            </Fragment>
          )
        })}
      </div>

      <div className="ex__foot">
        <button className="textbtn" onClick={() => actions.addSet(we.uid)}>
          <Plus /> {t('Set ekle')}
        </button>
        <p className="ex__goal num">
          {histBest != null ? (
            <>
              {t('En iyi süren')} <b>{timer(histBest)}</b>
            </>
          ) : (
            t('Oynat ile sayacı başlat ya da süreyi yaz')
          )}
        </p>
      </div>
    </section>
  )
}

/** Süre alanı: yalnızca rakam yazılır, son iki hane saniyedir ("430" → 4:30). */
function TimeField({
  value,
  label,
  onChange,
}: {
  value: number | null
  label: string
  onChange: (sec: number | null) => void
}) {
  const [digits, setDigits] = useState(value == null ? '' : secToDigits(value))
  const last = useRef(value)
  if (value !== last.current) {
    last.current = value
    if (digitsToSec(digits) !== value) setDigits(value == null ? '' : secToDigits(value))
  }
  return (
    <input
      className="field"
      inputMode="numeric"
      enterKeyHint="done"
      value={digitsToText(digits)}
      placeholder="0:00"
      aria-label={label}
      onFocus={(e) => e.target.select()}
      onChange={(e) => {
        const raw = e.target.value.replace(/\D/g, '').slice(0, 4)
        setDigits(raw)
        const n = digitsToSec(raw)
        last.current = n
        onChange(n)
      }}
    />
  )
}

function SetRow({
  ex,
  set,
  label,
  hint,
  prevText,
  isPr,
  prText,
  onNumber,
  onChange,
  onToggle,
}: {
  ex: Exercise
  set: SetEntry
  label: string
  hint: { kg: number | null; reps: number | null }
  prevText: string
  isPr: boolean
  prText: string
  onNumber: () => void
  onChange: (patch: Partial<SetEntry>) => void
  onToggle: () => void
}) {
  const cls = (set.done ? 'set--done ' : '') + (isPr ? 'set--pr' : '')
  return (
    <>
      <button
        className={'fig setno' + (set.warmup ? ' setno--warm' : '')}
        onClick={onNumber}
        aria-label={t('Set {0} seçenekleri', label)}
      >
        {label}
      </button>
      <div className="prev num">{prevText}</div>
      <div className={cls}>
        <NumField
          value={toWField(set.kg)}
          placeholder={hint.kg != null ? (ex.load === 'bodyweight' ? wAdded(hint.kg) : wNum(hint.kg)) : ''}
          decimal
          allowNegative={ex.load === 'bodyweight'}
          label={t('Set {0} kilo', label)}
          onChange={(v) => onChange({ kg: fromWField(v) })}
        />
      </div>
      <div className={cls}>
        <NumField
          value={set.reps}
          placeholder={hint.reps != null ? String(hint.reps) : ''}
          label={t('Set {0} tekrar', label)}
          onChange={(reps) => onChange({ reps: reps == null ? null : Math.round(reps) })}
        />
      </div>
      <div className={cls}>
        <button
          className="check"
          style={{ width: '100%' }}
          onClick={onToggle}
          aria-pressed={set.done}
          aria-label={t('Set {0} tamamlandı', label)}
        >
          <Check strokeWidth={3} />
        </button>
      </div>
      {isPr && <div className="sets__flag num">{prText}</div>}
    </>
  )
}

/** Sayı alanı: yazarken ham metni korur ("82," silinmez), dışarıya sayı verir. */
function NumField({
  value,
  placeholder,
  decimal,
  allowNegative,
  label,
  onChange,
}: {
  value: number | null
  placeholder: string
  decimal?: boolean
  allowNegative?: boolean
  label: string
  onChange: (v: number | null) => void
}) {
  const [text, setText] = useState(value == null ? '' : num(value))
  const last = useRef(value)
  if (value !== last.current) {
    last.current = value
    if (parseNum(text) !== value) setText(value == null ? '' : num(value))
  }
  return (
    <input
      className="field"
      inputMode={decimal ? (allowNegative ? 'text' : 'decimal') : 'numeric'}
      enterKeyHint="done"
      value={text}
      placeholder={placeholder}
      aria-label={label}
      onFocus={(e) => e.target.select()}
      onChange={(e) => {
        const pattern = decimal ? (allowNegative ? /[^0-9.,-]/g : /[^0-9.,]/g) : /[^0-9]/g
        const raw = e.target.value.replace(pattern, '').slice(0, 6)
        setText(raw)
        const n = parseNum(raw)
        last.current = n
        onChange(n)
      }}
    />
  )
}
