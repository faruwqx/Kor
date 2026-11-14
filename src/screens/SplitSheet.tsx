import { ArrowLeft, ChevronRight, Play } from 'lucide-react'
import { useState } from 'react'
import { findExercise } from '../lib/exercises'
import { SPLITS, splitRoutines, type Split } from '../lib/splits'
import { actions, useApp } from '../lib/store'
import type { Routine } from '../lib/types'
import { Sheet, toast } from '../ui/kit'
import { t } from '../lib/i18n'

/** "Program oluştur": hazır split seçilir, bir günü başlatılır ya da hepsi programlara eklenir. */
export function SplitSheet({
  onClose,
  onStart,
}: {
  onClose: () => void
  onStart: (r: Routine) => void
}) {
  const s = useApp()
  const [pick, setPick] = useState<Split | null>(null)

  if (!pick)
    return (
      <Sheet title={t('Program oluştur')} onClose={onClose}>
        <p className="row__sub" style={{ whiteSpace: 'normal', marginBottom: 12 }}>
          {t('En bilinen on split. Birini seç, bir gününü hemen başlat ya da tüm haftayı programlarına ekle.')}
        </p>
        <div className="card card--flush rows">
          {SPLITS.map((sp) => (
            <button key={sp.id} className="row" onClick={() => setPick(sp)}>
              <div className="row__main">
                <div className="row__title">{sp.name}</div>
                <div className="row__sub">
                  {t('Haftada')} {sp.days} {t('gün ·')} {sp.level}
                </div>
              </div>
              <ChevronRight className="chev" />
            </button>
          ))}
        </div>
      </Sheet>
    )

  const routines = splitRoutines(pick)
  const added = routines.every((r) => s.routines.some((x) => x.id === r.id))
  return (
    <Sheet title={pick.name} onClose={onClose}>
      <button className="textbtn" onClick={() => setPick(null)} style={{ marginBottom: 8 }}>
        <ArrowLeft aria-hidden="true" style={{ width: 16, height: 16, verticalAlign: -3 }} /> {t('Tüm split\'ler')}
      </button>
      <p className="row__sub" style={{ whiteSpace: 'normal', marginBottom: 12 }}>
        {pick.summary} {t('Haftada')} {pick.days} {t('gün,')} {pick.level.toLocaleLowerCase('tr-TR')} {t('seviye.')}
      </p>
      <div className="card card--flush rows">
        {routines.map((r, i) => (
          <button key={r.id} className="row" onClick={() => onStart(r)}>
            <div className="row__main">
              <div className="row__title">
                {i + 1}. {pick.workouts[i].name}
              </div>
              <div className="row__sub" style={{ whiteSpace: 'normal' }}>
                {r.items
                  .map((it) => `${findExercise(it.exerciseId).name} ${it.sets}×${it.reps}`)
                  .join(' · ')}
              </div>
            </div>
            <Play className="chev" aria-label={t('Başlat')} />
          </button>
        ))}
      </div>
      <button
        className="btn btn--primary btn--block"
        style={{ marginTop: 14 }}
        disabled={added}
        onClick={() => {
          routines.forEach((r) => actions.saveRoutine(r))
          toast(`${pick.name} programlarına eklendi`)
          onClose()
        }}
      >
        {added ? t('Programlarında zaten var') : t('Tüm günleri programlarıma ekle')}
      </button>
    </Sheet>
  )
}
