import { ChevronRight, Plus, Search } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  EQUIPMENT_NAME,
  MUSCLES,
  MUSCLE_COLOR,
  allExercises,
  fold,
} from '../lib/exercises'
import { useBoard } from '../lib/hooks'
import { rankFromRp } from '../lib/rank'
import { go } from '../lib/router'
import { useApp } from '../lib/store'
import type { MuscleId } from '../lib/types'
import { Emblem } from '../ui/Emblem'
import { NewExercise } from './Picker'
import { t } from '../lib/i18n'

/** Hareket kütüphanesi: tüm hareketler kas grubuna göre, arama ve süzgeçle. */
export function Library() {
  const s = useApp()
  const board = useBoard(s)
  const [q, setQ] = useState('')
  const [muscle, setMuscle] = useState<MuscleId | 'all'>('all')
  const [creating, setCreating] = useState(false)

  const all = useMemo(() => allExercises(s.customExercises), [s.customExercises])
  const customIds = useMemo(() => new Set(s.customExercises.map((e) => e.id)), [s.customExercises])

  const groups = useMemo(() => {
    const needle = fold(q.trim())
    return MUSCLES.filter((m) => muscle === 'all' || m.id === muscle)
      .map((m) => ({
        muscle: m,
        items: all
          .filter((e) => e.muscle === m.id && (!needle || fold(e.name).includes(needle)))
          .sort((a, b) => Number(!!b.std) - Number(!!a.std) || a.name.localeCompare(b.name, 'tr')),
      }))
      .filter((g) => g.items.length)
  }, [all, q, muscle])

  const shown = groups.reduce((a, g) => a + g.items.length, 0)
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
            <span className="dot" style={{ background: MUSCLE_COLOR[m.id] }} />
            {m.name}
          </button>
        ))}
      </div>

      {groups.map((g) => (
        <section key={g.muscle.id} aria-label={g.muscle.name}>
          <div className="section">
            <h2>
              <span className="dot" style={{ background: MUSCLE_COLOR[g.muscle.id] }} />
              {g.muscle.name}
            </h2>
            <span className="row__sub num">{g.items.length}</span>
          </div>
          <div className="card card--flush rows" style={{ marginTop: 10 }}>
            {g.items.map((e) => {
              const lift = board.lifts.get(e.id)
              return (
                <button key={e.id} className="row" onClick={() => go(`/exercise/${e.id}`)}>
                  <div className="row__main">
                    <div className="row__title">{e.name}</div>
                    <div className="row__sub">
                      {e.timed && e.target ? e.target : EQUIPMENT_NAME[e.equipment]}
                      {e.perHand ? t(' · tek el') : ''}
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

      {shown === 0 && (
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
