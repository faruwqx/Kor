import { Check, Search, X } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  EQUIPMENT_NAME,
  MUSCLES,
  MUSCLE_COLOR,
  allExercises,
  CUSTOM_EQUIPMENT,
  CUSTOM_MUSCLES,
  fold,
  muscleName,
} from '../lib/exercises'
import { actions, useApp } from '../lib/store'
import type { Equipment, MuscleId } from '../lib/types'
import { Sheet } from '../ui/kit'
import { t } from '../lib/i18n'

/** Hareket seçici: arama, kas grubu süzgeci, çoklu seçim, yeni hareket oluşturma. */
export function Picker({
  onPick,
  onClose,
  exclude = [],
}: {
  onPick: (ids: string[]) => void
  onClose: () => void
  exclude?: string[]
}) {
  const s = useApp()
  const [q, setQ] = useState('')
  const [muscle, setMuscle] = useState<MuscleId | 'all'>('all')
  const [picked, setPicked] = useState<string[]>([])
  const [creating, setCreating] = useState(false)

  const list = useMemo(() => {
    const needle = fold(q.trim())
    return allExercises(s.customExercises)
      .filter((e) => !exclude.includes(e.id))
      .filter((e) => muscle === 'all' || e.muscle === muscle)
      .filter((e) => !needle || fold(e.name).includes(needle))
      // Rank'e sayılan hareketler önce, sonra alfabetik.
      .sort((a, b) => Number(!!b.std) - Number(!!a.std) || a.name.localeCompare(b.name, 'tr'))
  }, [q, muscle, s.customExercises, exclude])

  const toggle = (id: string) =>
    setPicked((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p, id]))

  if (creating)
    return (
      <NewExercise
        initialName={q.trim()}
        onClose={() => setCreating(false)}
        onCreated={(id) => {
          setPicked((p) => [...p, id])
          setQ('')
          setCreating(false)
        }}
      />
    )

  return (
    <Sheet
      title={t('Hareket ekle')}
      onClose={onClose}
      full
      action={
        <button className="iconbtn" onClick={onClose} aria-label={t('Kapat')}>
          <X />
        </button>
      }
    >
      <div className="search">
        <Search />
        <input
          className="input"
          placeholder={t('Hareket ara')}
          value={q}
          onChange={(e) => setQ(e.target.value)}
          aria-label={t('Hareket ara')}
        />
      </div>
      <div className="chips" role="group" aria-label={t('Kas grubu')}>
        <button className="chip" aria-pressed={muscle === 'all'} onClick={() => setMuscle('all')}>
          {t('Tümü')}
        </button>
        {MUSCLES.map((m) => (
          <button
            key={m.id}
            className="chip"
            aria-pressed={muscle === m.id}
            onClick={() => setMuscle(m.id)}
          >
            {m.name}
          </button>
        ))}
      </div>
      <div className="sheet__scroll rows">
        {list.map((e) => (
          <button
            key={e.id}
            className="row"
            aria-pressed={picked.includes(e.id)}
            onClick={() => toggle(e.id)}
          >
            <span className="pick">
              <Check strokeWidth={3} />
            </span>
            <div className="row__main">
              <div className="row__title">{e.name}</div>
              <div className="row__sub">
                <span className="dot" style={{ background: MUSCLE_COLOR[e.muscle] }} />
                {muscleName(e.muscle)} · {e.timed && e.target ? e.target : EQUIPMENT_NAME[e.equipment]}
              </div>
            </div>
            {e.std && <span className="tag">{t('Rank\'li')}</span>}
          </button>
        ))}
        <button className="row" onClick={() => setCreating(true)}>
          <div className="row__main">
            <div className="row__title">
              {list.length === 0 && q.trim() ? t('"{0}" hareketini oluştur', q.trim()) : t('Yeni hareket oluştur')}
            </div>
            <div className="row__sub">{t('Listede yoksa kendin ekle')}</div>
          </div>
        </button>
      </div>
      <div className="sheet__dock">
        <button
          className="btn btn--primary btn--block"
          disabled={!picked.length}
          onClick={() => {
            onPick(picked)
            onClose()
          }}
        >
          {picked.length ? t('{0} hareket ekle', picked.length) : t('Hareket seç')}
        </button>
      </div>
    </Sheet>
  )
}

export function NewExercise({
  initialName,
  onClose,
  onCreated,
}: {
  initialName: string
  onClose: () => void
  onCreated: (id: string) => void
}) {
  const [name, setName] = useState(initialName)
  const [muscle, setMuscle] = useState<MuscleId>('chest')
  const [equipment, setEquipment] = useState<Equipment>('machine')
  return (
    <Sheet title={t('Yeni hareket')} onClose={onClose}>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault()
          if (!name.trim()) return
          onCreated(
            actions.addCustomExercise({
              name: name.trim(),
              muscle,
              equipment,
              load: equipment === 'bodyweight' ? 'bodyweight' : 'external',
              perHand: equipment === 'dumbbell' || undefined,
            }),
          )
        }}
      >
        <div>
          <label className="label" htmlFor="nx-name">
            {t('Ad')}
          </label>
          <input
            id="nx-name"
            className="input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={40}
            autoFocus
          />
        </div>
        <div>
          <span className="label">{t('Kas grubu')}</span>
          <div className="chips" role="group" aria-label={t('Kas grubu')}>
            {CUSTOM_MUSCLES.map((m) => (
              <button
                type="button"
                key={m.id}
                className="chip"
                aria-pressed={muscle === m.id}
                onClick={() => setMuscle(m.id)}
              >
                {m.name}
              </button>
            ))}
          </div>
        </div>
        <div>
          <span className="label">{t('Ekipman')}</span>
          <div className="chips" role="group" aria-label={t('Ekipman')}>
            {CUSTOM_EQUIPMENT.map((eq) => (
              <button
                type="button"
                key={eq}
                className="chip"
                aria-pressed={equipment === eq}
                onClick={() => setEquipment(eq)}
              >
                {EQUIPMENT_NAME[eq]}
              </button>
            ))}
          </div>
          <p className="hint">
            {t('Kendi eklediğin hareketler kaydedilir ama rank\'e sayılmaz: karşılaştırılacak bir standardı yok.')}
          </p>
        </div>
        <div className="btnrow">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            {t('Vazgeç')}
          </button>
          <button className="btn btn--primary" disabled={!name.trim()}>
            {t('Oluştur')}
          </button>
        </div>
      </form>
    </Sheet>
  )
}
