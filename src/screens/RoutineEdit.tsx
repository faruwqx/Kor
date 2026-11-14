import { ArrowDown, ArrowLeft, ArrowUp, Plus, X } from 'lucide-react'
import { useState } from 'react'
import { usePremium } from '../lib/cloud'
import { FREE_ROUTINES } from '../lib/cloud-core'
import { EQUIPMENT_NAME, findExercise, muscleName } from '../lib/exercises'
import { uid } from '../lib/format'
import { back, go } from '../lib/router'
import { actions, useApp } from '../lib/store'
import type { RoutineItem } from '../lib/types'
import { Confirm, Stepper, toast } from '../ui/kit'
import { Picker } from './Picker'
import { t } from '../lib/i18n'

export function RoutineEdit({ id }: { id: string }) {
  const s = useApp()
  const existing = id === 'new' ? undefined : s.routines.find((r) => r.id === id)
  const [name, setName] = useState(existing?.name ?? '')
  const [items, setItems] = useState<RoutineItem[]>(existing?.items ?? [])
  const [picker, setPicker] = useState(false)
  const [del, setDel] = useState(false)
  const premium = usePremium()
  // Sınır ekran açılırken ölçülür: kaydettikten sonra geri dönerken kilit ekranı görünmesin.
  const [overLimit] = useState(() => id === 'new' && s.routines.length >= FREE_ROUTINES)

  const patch = (i: number, p: Partial<RoutineItem>) =>
    setItems((list) => list.map((it, j) => (j === i ? { ...it, ...p } : it)))
  const move = (i: number, dir: -1 | 1) =>
    setItems((list) => {
      const next = [...list]
      const j = i + dir
      if (j < 0 || j >= next.length) return list
      ;[next[i], next[j]] = [next[j], next[i]]
      return next
    })

  const valid = name.trim().length > 0 && items.length > 0
  const save = () => {
    if (!valid) return
    actions.saveRoutine({ id: existing?.id ?? uid(), name: name.trim(), items })
    toast(t('Program kaydedildi'))
    back('/profile')
  }

  if (id !== 'new' && !existing) {
    return (
      <>
        <div className="topbar">
          <button className="iconbtn" onClick={() => go('/profile', { replace: true })} aria-label={t('Geri')}>
            <ArrowLeft />
          </button>
        </div>
        <header className="head">
          <h1>{t('Program bulunamadı')}</h1>
        </header>
      </>
    )
  }

  if (overLimit && !premium) {
    return (
      <>
        <div className="topbar">
          <button className="iconbtn" onClick={() => back('/profile')} aria-label={t('Geri')}>
            <ArrowLeft />
          </button>
        </div>
        <header className="head">
          <div>
            <h1>{t('Program sınırı')}</h1>
            <p>
              {t('Ücretsiz planda')} {FREE_ROUTINES} {t('program tutabilirsin. Yenisini eklemek için birini sil ya da Premium\'a geç.')}
            </p>
          </div>
        </header>
        <button className="btn btn--primary btn--block" onClick={() => go('/premium', { replace: true })}>
          {t('Premium\'u gör')}
        </button>
      </>
    )
  }

  return (
    <>
      <div className="topbar">
        <button className="iconbtn" onClick={() => back('/profile')} aria-label={t('Geri')}>
          <ArrowLeft />
        </button>
        <span className="topbar__title" />
        <button className="btn btn--primary btn--sm" onClick={save} disabled={!valid}>
          {t('Kaydet')}
        </button>
      </div>

      <header className="head">
        <h1>{existing ? t('Programı düzenle') : t('Yeni program')}</h1>
      </header>

      <div>
        <label className="label" htmlFor="rt-name">
          {t('Program adı')}
        </label>
        <input
          id="rt-name"
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder={t('Örneğin: İtiş günü')}
          maxLength={32}
        />
      </div>

      <div className="section">
        <h2>{t('Hareketler')}</h2>
        <span className="row__sub num">{items.length} {t('hareket')}</span>
      </div>

      {items.length === 0 && (
        <p className="empty">{t('Programa en az bir hareket ekle. Set ve tekrar sayısını sonra ayarlarsın.')}</p>
      )}

      {items.map((it, i) => {
        const ex = findExercise(it.exerciseId, s.customExercises)
        return (
          <div className="card" key={it.exerciseId + i}>
            <div className="row" style={{ padding: 0, minHeight: 0, marginBottom: 12 }}>
              <div className="row__main">
                <div className="row__title">{ex.name}</div>
                <div className="row__sub">
                  {muscleName(ex.muscle)} · {EQUIPMENT_NAME[ex.equipment]}
                </div>
              </div>
              <button
                className="iconbtn"
                onClick={() => move(i, -1)}
                disabled={i === 0}
                style={{ opacity: i === 0 ? 0.3 : 1 }}
                aria-label={t('{0} yukarı taşı', ex.name)}
              >
                <ArrowUp />
              </button>
              <button
                className="iconbtn"
                onClick={() => move(i, 1)}
                disabled={i === items.length - 1}
                style={{ opacity: i === items.length - 1 ? 0.3 : 1 }}
                aria-label={t('{0} aşağı taşı', ex.name)}
              >
                <ArrowDown />
              </button>
              <button
                className="iconbtn"
                onClick={() => setItems((list) => list.filter((_, j) => j !== i))}
                aria-label={t('{0} kaldır', ex.name)}
              >
                <X />
              </button>
            </div>
            <div className="row" style={{ padding: 0, minHeight: 0, gap: 8, flexWrap: 'wrap' }}>
              <span className="muted">{t('Set')}</span>
              <Stepper
                small
                label={t('{0} set sayısı', ex.name)}
                value={it.sets}
                min={1}
                max={10}
                onChange={(sets) => patch(i, { sets })}
              />
              <span style={{ flex: 1 }} />
              <span className="muted">{t('Tekrar')}</span>
              <Stepper
                small
                label={t('{0} tekrar sayısı', ex.name)}
                value={it.reps}
                min={1}
                max={30}
                onChange={(reps) => patch(i, { reps })}
              />
            </div>
          </div>
        )
      })}

      <button className="btn btn--ghost btn--block" onClick={() => setPicker(true)}>
        <Plus /> {t('Hareket ekle')}
      </button>

      {existing && (
        <div style={{ textAlign: 'center' }}>
          <button className="textbtn" onClick={() => setDel(true)}>
            {t('Programı sil')}
          </button>
        </div>
      )}

      {picker && (
        <Picker
          onClose={() => setPicker(false)}
          exclude={items.map((it) => it.exerciseId)}
          onPick={(ids) =>
            setItems((list) => [...list, ...ids.map((exerciseId) => ({ exerciseId, sets: 3, reps: 8 }))])
          }
        />
      )}
      {del && existing && (
        <Confirm
          title={t('Program silinsin mi?')}
          body={t('Program silinir; bu programla yaptığın antrenmanlar geçmişte kalır.')}
          confirm={t('Sil')}
          danger
          onConfirm={() => {
            actions.deleteRoutine(existing.id)
            back('/profile')
          }}
          onClose={() => setDel(false)}
        />
      )}
    </>
  )
}
