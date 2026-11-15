import { ChevronRight, Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import { allExercises, fold } from '../lib/exercises'
import { useBoard } from '../lib/hooks'
import { MCATS, MCAT_NAME, MGEAR, MGEAR_NAME } from '../lib/motra'
import { rankFromRp } from '../lib/rank'
import { go } from '../lib/router'
import { useApp } from '../lib/store'
import type { Equipment, Exercise, MuscleId } from '../lib/types'
import { Emblem } from '../ui/Emblem'
import { NewExercise } from './Picker'
import { t } from '../lib/i18n'

// Kor kaba kas grubu → Motra ince kategori (Kor'un kendi hareketleri için).
const MUSCLE2CAT: Record<MuscleId, string> = {
  chest: 'chest',
  back: 'lats',
  shoulders: 'shoulders',
  biceps: 'biceps',
  triceps: 'triceps',
  quads: 'quads',
  posterior: 'glutes',
  core: 'abs',
  calves: 'calves',
  hyrox: 'hyrox',
  cardio: 'cardio',
}
// Kor ekipman → Motra ekipman id (Kor'un kendi hareketleri için).
const EQUIP2GEAR: Record<Equipment, string> = {
  barbell: 'barbell',
  dumbbell: 'dumbbell',
  machine: 'machine',
  cable: 'cable',
  bodyweight: 'bodyweight',
  station: 'other',
  other: 'other',
}
const CAT_ORDER = [...MCATS.map((c) => c.id), 'hyrox', 'cardio']
const catName = (id: string) =>
  MCAT_NAME[id] ?? (id === 'hyrox' ? 'Hyrox' : id === 'cardio' ? t('Kardiyo') : id)
const catsOf = (e: Exercise) => (e.cats?.length ? e.cats : [MUSCLE2CAT[e.muscle]])
const gearOf = (e: Exercise) => e.gear ?? EQUIP2GEAR[e.equipment]

/** Hareket kütüphanesi: Motra tarzı kategori sekmeleri, ekipman süzgeci ve arama. */
export function Library() {
  const s = useApp()
  const board = useBoard(s)
  const [q, setQ] = useState('')
  const [cat, setCat] = useState<string>('all')
  const [gear, setGear] = useState<string>('all')
  const [creating, setCreating] = useState(false)

  const all = useMemo(() => allExercises(s.customExercises), [s.customExercises])
  const customIds = useMemo(() => new Set(s.customExercises.map((e) => e.id)), [s.customExercises])

  // Hangi kategoriler ve ekipmanlar veride var — yalnızca onlar sekme/süzgeç olur.
  const cats = useMemo(() => {
    const present = new Set<string>()
    for (const e of all) for (const c of catsOf(e)) present.add(c)
    return CAT_ORDER.filter((c) => present.has(c))
  }, [all])
  const gears = useMemo(() => {
    const present = new Set<string>()
    for (const e of all) present.add(gearOf(e))
    return MGEAR.filter((g) => present.has(g.id))
  }, [all])

  const match = (e: Exercise, needle: string) =>
    (!needle || fold(e.name).includes(needle)) && (gear === 'all' || gearOf(e) === gear)

  const sections = useMemo(() => {
    const needle = fold(q.trim())
    const order = cat === 'all' ? cats : [cat]
    return order
      .map((c) => ({
        id: c,
        name: catName(c),
        items: all
          .filter((e) => catsOf(e).includes(c) && match(e, needle))
          .sort((a, b) => Number(!!b.std) - Number(!!a.std) || a.name.localeCompare(b.name, 'tr')),
      }))
      .filter((g) => g.items.length)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [all, q, cat, gear, cats])

  const shownIds = useMemo(() => {
    const ids = new Set<string>()
    for (const g of sections) for (const e of g.items) ids.add(e.id)
    return ids
  }, [sections])
  const ranked = all.filter((e) => e.std).length

  return (
    <>
      <header className="head">
        <div>
          <h1>{t('Hareketler')}</h1>
          <p>
            {all.length} {t('hareket,')} {ranked} {t('tanesi rank\'e sayılır')}
          </p>
        </div>
        <button className="btn btn--ghost btn--sm" onClick={() => setCreating(true)}>
          <Plus />
          {t('Yeni')}
        </button>
      </header>

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
        <button className="chip" aria-pressed={cat === 'all'} onClick={() => setCat('all')}>
          {t('Tümü')}
        </button>
        {cats.map((c) => (
          <button key={c} className="chip" aria-pressed={cat === c} onClick={() => setCat(c)}>
            {catName(c)}
          </button>
        ))}
      </div>

      <div className="libfilter">
        <select
          className="input"
          value={gear}
          onChange={(e) => setGear(e.target.value)}
          aria-label={t('Ekipman')}
        >
          <option value="all">{t('Tüm ekipmanlar')}</option>
          {gears.map((g) => (
            <option key={g.id} value={g.id}>
              {g.name}
            </option>
          ))}
        </select>
      </div>

      {sections.map((g) => (
        <section key={g.id} aria-label={g.name}>
          <div className="section">
            <h2>{g.name}</h2>
            <span className="row__sub num">{g.items.length}</span>
          </div>
          <div className="card card--flush rows" style={{ marginTop: 10 }}>
            {g.items.map((e) => {
              const lift = board.lifts.get(e.id)
              const sub = e.timed && e.target ? e.target : catsOf(e).map(catName).join(' · ')
              return (
                <button key={e.id} className="row" onClick={() => go(`/exercise/${e.id}`)}>
                  <div className="row__main">
                    <div className="row__title">{e.name}</div>
                    <div className="row__sub">
                      {sub}
                      {gearOf(e) !== 'bodyweight' ? ` · ${MGEAR_NAME[gearOf(e)] ?? ''}` : ''}
                      {customIds.has(e.id) ? t(' · senin eklediğin') : ''}
                    </div>
                  </div>
                  {lift ? (
                    <Emblem rank={rankFromRp(lift.rp)} size={30} />
                  ) : (
                    e.std && <span className="tag">{t('Rank\'li')}</span>
                  )}
                  <ChevronRight className="chev" />
                </button>
              )
            })}
          </div>
        </section>
      ))}

      {shownIds.size === 0 && (
        <div className="card">
          <h2>{t('Eşleşen hareket yok')}</h2>
          <p className="row__sub" style={{ whiteSpace: 'normal', margin: '4px 0 14px' }}>
            {t('Aradığın hareket listede yoksa kendin ekleyebilirsin.')}
          </p>
          <button className="btn btn--primary btn--sm" onClick={() => setCreating(true)}>
            {q.trim() ? t('"{0}" hareketini oluştur', q.trim()) : t('Yeni hareket oluştur')}
          </button>
        </div>
      )}

      {creating && (
        <NewExercise
          initialName={q.trim()}
          onClose={() => setCreating(false)}
          onCreated={(id) => {
            setCreating(false)
            setQ('')
            go(`/exercise/${id}`)
          }}
        />
      )}
    </>
  )
}
