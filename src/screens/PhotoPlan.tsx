import { ArrowLeft, Camera, RotateCcw } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { usePremium } from '../lib/cloud'
import { FREE_ROUTINES } from '../lib/cloud-core'
import { allExercises, findExercise } from '../lib/exercises'
import { uid } from '../lib/format'
import { t } from '../lib/i18n'
import { guessExercise } from '../lib/importer'
import { recognizeImage } from '../lib/ocr'
import { parsePlanText, type PlanLine } from '../lib/planText'
import { back, go } from '../lib/router'
import { actions, useApp } from '../lib/store'
import type { RoutineItem } from '../lib/types'
import { Stepper, toast } from '../ui/kit'

type Busy = { stage: 'load' | 'read'; progress: number } | null

/**
 * Fotoğraftan program: antrenman listesinin fotoğrafı (ya da yapıştırılan metin) cihazda
 * okunur, hareketler Kor kütüphanesine eşlenir; kullanıcı gözden geçirip programa kaydeder.
 */
export function PhotoPlan() {
  const s = useApp()
  const premium = usePremium()
  const file = useRef<HTMLInputElement>(null)
  const [img, setImg] = useState<string | null>(null)
  const [busy, setBusy] = useState<Busy>(null)
  const [error, setError] = useState('')
  const [text, setText] = useState('')
  const [name, setName] = useState('')
  const [items, setItems] = useState<PlanLine[]>([])
  const [editing, setEditing] = useState<number | null>(null)
  // Sınır ekran açılırken ölçülür: kaydettikten sonra kilit ekranı görünmesin.
  const [overLimit] = useState(() => s.routines.length >= FREE_ROUTINES)

  useEffect(() => () => void (img && URL.revokeObjectURL(img)), [img])

  const options = useMemo(
    () =>
      allExercises(s.customExercises)
        .map((e) => ({ id: e.id, name: e.name }))
        .sort((a, b) => a.name.localeCompare(b.name, 'tr')),
    [s.customExercises],
  )

  const parse = (raw: string) => {
    const p = parsePlanText(raw, s.customExercises)
    setItems(p.items)
    setEditing(null)
    if (p.title && !name.trim()) setName(p.title.slice(0, 32))
    setError(p.items.length ? '' : t('Listede hareket bulunamadı. Metni düzeltip "Yeniden çöz"e dokun.'))
  }

  const onPhoto = async (f: File) => {
    setError('')
    setItems([])
    setImg(URL.createObjectURL(f))
    setBusy({ stage: 'load', progress: 0 })
    try {
      const raw = await recognizeImage(f, (p) => setBusy(p))
      setText(raw.trim())
      parse(raw)
    } catch {
      setError(t('Fotoğraf okunamadı. Daha net, düz ve iyi ışıkta bir fotoğraf dene ya da listeyi aşağıya yaz.'))
    } finally {
      setBusy(null)
    }
  }

  const patch = (i: number, p: Partial<PlanLine>) =>
    setItems((list) => list.map((it, j) => (j === i ? { ...it, ...p } : it)))

  const picked = items.filter((i) => i.pick)
  const valid = name.trim().length > 0 && picked.length > 0

  const save = () => {
    if (!valid) return
    // Eşleşmeyenler yeni özel hareket olur; aynı ad iki kez eklenmez.
    const created = new Map<string, string>()
    const routineItems: RoutineItem[] = picked.map((it) => {
      let exerciseId = it.exerciseId
      if (!exerciseId) {
        const key = it.name.trim().toLocaleLowerCase('tr-TR')
        exerciseId = created.get(key) ?? null
        if (!exerciseId) {
          const g = guessExercise(it.name)
          exerciseId = actions.addCustomExercise({
            name: it.name.trim().slice(0, 60),
            muscle: g.muscle,
            equipment: g.equipment,
            load: g.equipment === 'bodyweight' ? 'bodyweight' : 'external',
            ...(g.timed ? { timed: true, longer: true } : {}),
          })
          created.set(key, exerciseId)
        }
      }
      return { exerciseId, sets: Math.min(10, Math.max(1, it.sets)), reps: Math.max(1, it.reps) }
    })
    const id = uid()
    actions.saveRoutine({ id, name: name.trim().slice(0, 32), items: routineItems })
    toast(t('Program kaydedildi'))
    go(`/routine/${id}`, { replace: true })
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
              {t('Ücretsiz planda')} {FREE_ROUTINES}{' '}
              {t('program tutabilirsin. Yenisini eklemek için birini sil ya da Premium\'a geç.')}
            </p>
          </div>
        </header>
        <button className="btn btn--primary btn--block" onClick={() => go('/premium', { replace: true })}>
          {t('Premium\'u gör')}
        </button>
      </>
    )
  }

  const pct = busy
    ? Math.round((busy.stage === 'load' ? busy.progress * 0.3 : 0.3 + busy.progress * 0.7) * 100)
    : 0

  return (
    <>
      <div className="topbar">
        <button className="iconbtn" onClick={() => back('/profile')} aria-label={t('Geri')}>
          <ArrowLeft />
        </button>
        <span className="topbar__title" />
        <button className="btn btn--primary btn--sm" onClick={save} disabled={!valid || !!busy}>
          {t('Kaydet')}
        </button>
      </div>

      <header className="head">
        <div>
          <h1>{t('Fotoğraftan program')}</h1>
          <p>
            {t('Antrenman listesinin fotoğrafını çek ya da seç; hareketler, set ve tekrarlar otomatik okunur. Fotoğraf telefondan çıkmaz.')}
          </p>
        </div>
      </header>

      <input
        ref={file}
        type="file"
        accept="image/*"
        hidden
        onChange={(e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (f) void onPhoto(f)
        }}
      />

      <button className="gen" onClick={() => file.current?.click()} disabled={!!busy}>
        <Camera aria-hidden="true" />
        <span className="gen__title">{img ? t('Başka fotoğraf') : t('Fotoğraf çek ya da seç')}</span>
        <span className="gen__sub">{t('Düz, net ve listenin tamamı görünecek şekilde')}</span>
      </button>

      {img && (
        <div className="card">
          <img className="photo-plan__img" src={img} alt={t('Seçilen antrenman listesi')} />
          {busy && (
            <>
              <div
                className="photo-plan__progress"
                role="progressbar"
                aria-valuemin={0}
                aria-valuemax={100}
                aria-valuenow={pct}
                aria-label={t('Okunuyor')}
              >
                <span style={{ width: `${pct}%` }} />
              </div>
              <p className="row__sub" aria-live="polite">
                {busy.stage === 'load' ? t('Metin tanıma hazırlanıyor…') : t('Liste okunuyor… {0}%', pct)}
              </p>
            </>
          )}
        </div>
      )}

      {error && (
        <p className="hint hint--error" role="alert">
          {error}
        </p>
      )}

      <details className="card">
        <summary className="row__title">
          {img ? t('Okunan metni gör / düzelt') : t('Ya da listeyi buraya yaz / yapıştır')}
        </summary>
        <textarea
          className="input paste"
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={t('Bench press 4x8\nSquat 5x5\nLat pulldown 3 set 12 tekrar')}
          aria-label={t('Antrenman listesi metni')}
          rows={7}
        />
        <button
          className="btn btn--ghost btn--sm"
          style={{ marginTop: 10 }}
          disabled={!text.trim() || !!busy}
          onClick={() => parse(text)}
        >
          <RotateCcw /> {items.length ? t('Yeniden çöz') : t('Oku')}
        </button>
      </details>

      {items.length > 0 && (
        <>
          <div>
            <label className="label" htmlFor="pp-name">
              {t('Program adı')}
            </label>
            <input
              id="pp-name"
              className="input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('Örneğin: İtiş günü')}
              maxLength={32}
            />
          </div>

          <div className="section">
            <h2>{t('Bulunan hareketler')}</h2>
            <span className="row__sub num">
              {picked.length}/{items.length} {t('seçili')}
            </span>
          </div>

          {items.map((it, i) => {
            const target = it.exerciseId ? findExercise(it.exerciseId, s.customExercises) : null
            return (
              <div className="card" key={i} style={{ opacity: it.pick ? 1 : 0.55 }}>
                <label className="row checkrow" style={{ minHeight: 0, marginBottom: it.pick ? 10 : 0 }}>
                  <input
                    type="checkbox"
                    checked={it.pick}
                    onChange={(e) => patch(i, { pick: e.target.checked })}
                  />
                  <span className="row__main">
                    <span className="row__title">{target ? target.name : it.name}</span>
                    <span className="row__sub" style={{ whiteSpace: 'normal' }}>
                      {target ? (
                        t('“{0}” olarak okundu', it.source)
                      ) : (
                        <b className="map__new">{t('yeni hareket olarak eklenecek')}</b>
                      )}
                    </span>
                  </span>
                </label>
                {it.pick && (
                  <>
                    <div className="photo-plan__nums">
                      <span className="photo-plan__num">
                        <span className="muted">{t('Set')}</span>
                        <Stepper
                          small
                          label={t('{0} set sayısı', it.name)}
                          value={Math.min(10, it.sets)}
                          min={1}
                          max={10}
                          onChange={(sets) => patch(i, { sets })}
                        />
                      </span>
                      <span className="photo-plan__num">
                        <span className="muted">{target?.timed ? t('Süre (sn)') : t('Tekrar')}</span>
                        <Stepper
                          small
                          label={t('{0} tekrar sayısı', it.name)}
                          value={it.reps}
                          min={1}
                          max={target?.timed ? 600 : 50}
                          onChange={(reps) => patch(i, { reps })}
                        />
                      </span>
                    </div>
                    {editing === i ? (
                      <select
                        className="input map__select"
                        value={it.exerciseId ?? 'new'}
                        aria-label={t('{0} için Kor hareketi', it.name)}
                        onChange={(ev) => {
                          patch(i, { exerciseId: ev.target.value === 'new' ? null : ev.target.value })
                          setEditing(null)
                        }}
                      >
                        <option value="new">{t('Yeni hareket olarak ekle')}</option>
                        {options.map((o) => (
                          <option key={o.id} value={o.id}>
                            {o.name}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <button className="textbtn" style={{ marginTop: 8 }} onClick={() => setEditing(i)}>
                        {t('Hareketi değiştir')}
                      </button>
                    )}
                  </>
                )}
              </div>
            )
          })}

          <button className="btn btn--primary btn--block" disabled={!valid || !!busy} onClick={save}>
            {t('{0} hareketle programı kaydet', picked.length)}
          </button>
          <p className="note">
            {t('Kaydettikten sonra program düzenleme ekranı açılır; sırayı ve sayıları orada da değiştirebilirsin.')}
          </p>
        </>
      )}
    </>
  )
}
