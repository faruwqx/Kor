import { ArrowLeft, FileUp } from 'lucide-react'
import { useMemo, useRef, useState } from 'react'
import { allExercises, findExercise } from '../lib/exercises'
import { dayMonth, int } from '../lib/format'
import {
  FORMAT_NAME,
  bodyweightLookup,
  buildImport,
  parseImport,
  summarizeExercises,
  type Mapping,
  type ParsedImport,
  type Unit,
} from '../lib/importer'
import { back, go } from '../lib/router'
import { DEFAULT_BODYWEIGHT, actions, useApp } from '../lib/store'
import { imperial } from '../lib/units'
import { tableToCsv, xlsxToTable } from '../lib/xlsx'
import { Seg, toast } from '../ui/kit'
import { t } from '../lib/i18n'
import type { Workout } from '../lib/types'

const SOURCES = () => [
  { name: t('Strong'), how: t('Profil → Ayarlar (dişli) → Export Strong Data → CSV dosyasını kaydet.') },
  { name: t('Hevy'), how: t('Profile → Settings → Export & Import Data → Export Workouts → CSV.') },
  { name: t('FitNotes'), how: t('Settings → Spreadsheet Export → CSV dosyasını paylaş/kaydet.') },
  {
    name: t('Diğer uygulamalar, Excel, Google Sheets'),
    how: t('Tarih, Hareket, Kilo, Tekrar sütunlu bir tabloyu CSV olarak kaydet. Türkçe ya da İngilizce başlık olur.'),
  },
  {
    name: t('Motra'),
    how: t('Motra’nın antrenman dışa aktarımı (.xlsx) olduğu gibi okunur; yürüyüş, yüzme gibi setsiz antrenmanlar da süresiyle gelir.'),
  },
  {
    name: t('Kor antrenmanı'),
    how: t('Bir antrenmanda ⋯ → Antrenmanı paylaş ile aldığın .json dosyası; tek tek antrenman taşımak için.'),
  },
  { name: t('Kor yedeği'), how: t('Profil → Yedeği indir ile aldığın .json dosyası; mevcut verinle birleştirilir.') },
]

/** Seçim anahtarı: plan her hesaplandığında kimlikler yenilenir, başlangıç+ad sabittir. */
const pickKey = (w: Workout) => `${w.startedAt}|${w.name}`

const year = (ts: number) => new Date(ts).getFullYear()
const dateText = (ts: number) => `${dayMonth(ts)} ${year(ts)}`

export function Import() {
  const s = useApp()
  const file = useRef<HTMLInputElement>(null)
  const [parsed, setParsed] = useState<ParsedImport | null>(null)
  const [fileName, setFileName] = useState('')
  const [error, setError] = useState('')
  const [paste, setPaste] = useState('')
  const [unit, setUnit] = useState<Unit>(imperial() ? 'lb' : 'kg')
  const [mapping, setMapping] = useState<Mapping>({})
  const [editing, setEditing] = useState<string | null>(null)
  /** Kullanıcının aktarmamayı seçtiği antrenmanlar (pickKey). */
  const [off, setOff] = useState<Set<string>>(new Set())

  const load = (text: string, name: string) => {
    const p = parseImport(text)
    if ('error' in p) {
      setError(p.error)
      setParsed(null)
      return
    }
    setError('')
    setOff(new Set())
    setFileName(name)
    setParsed(p)
    if (p.unit) setUnit(p.unit)
    const m: Mapping = {}
    for (const e of summarizeExercises(p, s.customExercises)) m[e.name] = e.suggested ?? 'new'
    setMapping(m)
  }

  const summary = useMemo(
    () => (parsed ? summarizeExercises(parsed, s.customExercises) : []),
    [parsed, s.customExercises],
  )
  const plan = useMemo(
    () =>
      parsed
        ? buildImport(parsed, {
            unit,
            mapping,
            existing: s.workouts,
            custom: s.customExercises,
            bodyweightAt: bodyweightLookup(s.bodyweights, DEFAULT_BODYWEIGHT),
          })
        : null,
    [parsed, unit, mapping, s.workouts, s.customExercises, s.bodyweights],
  )
  const options = useMemo(
    () =>
      allExercises(s.customExercises)
        .map((e) => ({ id: e.id, name: e.name }))
        .sort((a, b) => a.name.localeCompare(b.name, 'tr')),
    [s.customExercises],
  )
  const matched = summary.filter((e) => mapping[e.name] && mapping[e.name] !== 'new').length
  const chosen = useMemo(() => (plan ? plan.workouts.filter((w) => !off.has(pickKey(w))) : []), [plan, off])
  const chosenSets = chosen.reduce((a, w) => a + w.exercises.reduce((b, e) => b + e.sets.length, 0), 0)
  const isKor = parsed?.format === 'kor-json' || parsed?.format === 'kor-workout'
  const toggle = (w: Workout) =>
    setOff((prev) => {
      const next = new Set(prev)
      const k = pickKey(w)
      if (next.has(k)) next.delete(k)
      else next.add(k)
      return next
    })

  const commit = () => {
    if (!plan || !chosen.length) return
    const used = new Set(chosen.flatMap((w) => w.exercises.map((e) => e.exerciseId)))
    actions.importData(
      chosen,
      plan.newExercises.filter((e) => used.has(e.id)),
    )
    toast(t('{0} antrenman aktarıldı', chosen.length))
    go('/history', { replace: true })
  }

  return (
    <>
      <div className="topbar">
        <button className="iconbtn" onClick={() => back('/profile')} aria-label={t('Geri')}>
          <ArrowLeft />
        </button>
        <span className="topbar__title">{t('İçe aktar')}</span>
      </div>
      <header className="head">
        <div>
          <h1>{t('Başka uygulamadan geç')}</h1>
          <p>
            {t('Geçmişin seninle gelsin: antrenmanların, rekorların ve rank\'in bir dakikada hazır. Mevcut verin silinmez; aynı antrenman iki kez eklenmez.')}
          </p>
        </div>
      </header>

      {s.demo && (
        <p className="note">
          {t('Şu an örnek veriyle geziyorsun. Önce Profil → "Örnek veriyi sil ve başla" ile kendi kaydına geç, sonra aktar.')}
        </p>
      )}

      <input
        ref={file}
        type="file"
        accept=".csv,.tsv,.txt,.json,.xlsx,text/csv,text/plain,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (!f) return
          if (f.size > 20 * 1024 * 1024) {
            setError(t('Dosya 20 MB’tan büyük.'))
            return
          }
          if (/\.xlsx$/i.test(f.name)) {
            try {
              const table = await xlsxToTable(await f.arrayBuffer())
              load(tableToCsv(table), f.name)
            } catch {
              setError(t('Excel dosyası okunamadı. .xlsx olduğundan emin ol (.xls desteklenmez).'))
            }
            return
          }
          load(await f.text(), f.name)
        }}
      />

      {!parsed && (
        <>
          <button className="gen" onClick={() => file.current?.click()}>
            <FileUp aria-hidden="true" />
            <span className="gen__title">{t('Dosya seç')}</span>
            <span className="gen__sub">{t('CSV, Excel (.xlsx), TSV ya da Kor yedeği (.json)')}</span>
          </button>
          {error && (
            <p className="hint hint--error" role="alert">
              {error}
            </p>
          )}

          <div className="section">
            <h2>{t('Dosyayı nereden alırım?')}</h2>
          </div>
          <div className="card card--flush rows">
            {SOURCES().map((src) => (
              <div className="row" key={src.name}>
                <div className="row__main">
                  <div className="row__title">{src.name}</div>
                  <div className="row__sub" style={{ whiteSpace: 'normal' }}>
                    {src.how}
                  </div>
                </div>
              </div>
            ))}
          </div>

          <details className="card">
            <summary className="row__title">{t('Ya da tabloyu buraya yapıştır')}</summary>
            <textarea
              className="input paste"
              value={paste}
              onChange={(e) => setPaste(e.target.value)}
              placeholder={t('Tarih;Hareket;Kilo;Tekrar\n05.03.2024;Bench press;80;8')}
              aria-label={t('CSV metni')}
              rows={6}
            />
            <button
              className="btn btn--primary btn--sm"
              style={{ marginTop: 10 }}
              disabled={!paste.trim()}
              onClick={() => load(paste, 'Yapıştırılan tablo')}
            >
              {t('Oku')}
            </button>
          </details>
        </>
      )}

      {parsed && plan && (
        <>
          <section className="card">
            <div className="kpi__label">
              {FORMAT_NAME[parsed.format]} · {fileName}
            </div>
            <div className="fig trend__fig">
              {int(chosen.length)}
              {chosen.length !== plan.workouts.length && (
                <span className="unit trend__unit">/ {int(plan.workouts.length)}</span>
              )}
              <span className="unit trend__unit">{t('antrenman')}</span>
            </div>
            <p className="row__sub num" style={{ whiteSpace: 'normal' }}>
              {int(chosenSets)} {t('set')}
              {plan.from != null && plan.to != null && ` · ${dateText(plan.from)} – ${dateText(plan.to)}`}
              {plan.duplicates > 0 && t(' · {0} antrenman zaten kayıtlı, atlanacak', plan.duplicates)}
              {parsed.skipped > 0 && t(' · {0} satır okunamadı', parsed.skipped)}
            </p>
            <button
              className="textbtn"
              style={{ marginTop: 6 }}
              onClick={() => {
                setParsed(null)
                setPaste('')
              }}
            >
              {t('Başka dosya seç')}
            </button>
          </section>

          {plan.workouts.length > 1 && (
            <details className="card pick-list">
              <summary className="row__title">
                {t('Antrenmanları tek tek seç')}{' '}
                <span className="muted num">
                  {int(chosen.length)}/{int(plan.workouts.length)}
                </span>
              </summary>
              <div className="pick-list__bar">
                <button className="textbtn" onClick={() => setOff(new Set())}>
                  {t('Tümünü seç')}
                </button>
                <button className="textbtn" onClick={() => setOff(new Set(plan.workouts.map(pickKey)))}>
                  {t('Hiçbirini seçme')}
                </button>
              </div>
              <div className="rows">
                {[...plan.workouts].reverse().map((w) => {
                  const n = w.exercises.reduce((a, e) => a + e.sets.length, 0)
                  return (
                    <label className="row checkrow" key={pickKey(w)}>
                      <input type="checkbox" checked={!off.has(pickKey(w))} onChange={() => toggle(w)} />
                      <span className="row__main">
                        <span className="row__title">{w.name}</span>
                        <span className="row__sub num">
                          {dateText(w.startedAt)} · {n} {t('set')}
                        </span>
                      </span>
                    </label>
                  )
                })}
              </div>
            </details>
          )}

          {!isKor && (
            <>
              {!parsed.unit && (
                <>
                  <div className="section">
                    <h2>{t('Dosyadaki ağırlık birimi')}</h2>
                  </div>
                  <Seg
                    label={t('Dosyadaki ağırlık birimi')}
                    value={unit}
                    onChange={setUnit}
                    options={[
                      { value: 'kg', label: 'kg' },
                      { value: 'lb', label: t('lb (pound)') },
                    ]}
                  />
                  <p className="hint">
                    {FORMAT_NAME[parsed.format]} {t('dosyası birimi yazmıyor; o uygulamada hangi birimi kullandıysan onu seç. Kor veriyi kg olarak saklar, gösterim Profil → Birimler\'e göre.')}
                  </p>
                </>
              )}

              <div className="section">
                <h2>{t('Hareketler')}</h2>
                <span className="muted num">
                  {matched}/{summary.length} {t('eşleşti')}
                </span>
              </div>
              <div className="card card--flush rows">
                {summary.map((e) => {
                  const target = mapping[e.name] ?? 'new'
                  const isNew = target === 'new'
                  const open = editing === e.name
                  return (
                    <div className="row map" key={e.name}>
                      <div className="row__main">
                        <div className="row__title">{e.name}</div>
                        <div className="row__sub" style={{ whiteSpace: 'normal' }}>
                          {e.sets} {t('set →')}{' '}
                          {isNew ? (
                            <b className="map__new">{t('yeni hareket olarak eklenecek')}</b>
                          ) : (
                            <b>{findExercise(target, s.customExercises).name}</b>
                          )}
                        </div>
                        {open && (
                          <select
                            className="input map__select"
                            value={target}
                            aria-label={t('{0} için Kor hareketi', e.name)}
                            onChange={(ev) => {
                              setMapping((m) => ({ ...m, [e.name]: ev.target.value }))
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
                        )}
                      </div>
                      {!open && (
                        <button className="textbtn" onClick={() => setEditing(e.name)}>
                          {t('Değiştir')}
                        </button>
                      )}
                    </div>
                  )
                })}
              </div>
            </>
          )}

          <button
            className="btn btn--primary btn--block"
            disabled={!chosen.length}
            onClick={commit}
          >
            {chosen.length
              ? t('{0} antrenmanı aktar', int(chosen.length))
              : plan.workouts.length
                ? t('Aktarılacak antrenman seç')
                : t('Aktarılacak yeni antrenman yok')}
          </button>
          <p className="note">
            {t('Rank ve rekorlar aktarılan setlerden hemen yeniden hesaplanır. Yanlış giderse antrenmanları Geçmiş\'ten tek tek silebilirsin.')}
          </p>
        </>
      )}
    </>
  )
}
