import {
  BookOpen,
  CalendarDays,
  ChartNoAxesColumn,
  ChevronRight,
  ClipboardList,
  Download,
  Scale,
  FileDown,
  FileUp,
  Dumbbell,
  Medal,
  Pencil,
  Trash2,
  Trophy,
  Upload,
} from 'lucide-react'
import { useRef, useState } from 'react'
import { useCloud, usePremium } from '../lib/cloud'
import { int, parseNum, relDay, timer } from '../lib/format'
import { bodyweightRange, fromW, toW, wBig, wNum1, wUnit } from '../lib/units'
import { routineSummary, useBoard } from '../lib/hooks'
import { toCsv } from '../lib/importer'
import { redeemed } from '../lib/cloud-core'
import { go } from '../lib/router'
import { streak, workoutVolume } from '../lib/stats'
import { actions, currentBodyweight, getState, parseBackup, useApp } from '../lib/store'
import { LineChart } from '../ui/charts'
import { Confirm, Seg, Sheet, Stepper, Switch, toast } from '../ui/kit'
import { LANGS, lang } from '../lib/i18n'
import { AccountSection } from './Account'
import { t } from '../lib/i18n'

export function Profile() {
  const s = useApp()
  const premium = usePremium()
  const [redeemCode, setRedeemCode] = useState('')
  const applyRedeem = () => {
    const c = redeemCode.trim().toUpperCase()
    if (redeemed({ redeem: c })) {
      actions.updateSettings({ redeem: c })
      setRedeemCode('')
      toast(t('Premium açıldı'))
    } else toast(t('Kod geçersiz'))
  }
  const cloud = useCloud()
  const p = s.profile!
  const bw = currentBodyweight(s)
  const [weightSheet, setWeightSheet] = useState(false)
  const [nameSheet, setNameSheet] = useState(false)
  const [reset, setReset] = useState(false)
  const [restore, setRestore] = useState<string | null>(null)
  const file = useRef<HTMLInputElement>(null)
  const photoInput = useRef<HTMLInputElement>(null)
  const pickPhoto = (f: File) => {
    const img = new Image()
    const url = URL.createObjectURL(f)
    img.onload = () => {
      URL.revokeObjectURL(url)
      const size = 256
      const c = document.createElement('canvas')
      c.width = size
      c.height = size
      const ctx = c.getContext('2d')
      if (!ctx) return
      const m = Math.min(img.width, img.height)
      ctx.drawImage(img, (img.width - m) / 2, (img.height - m) / 2, m, m, 0, 0, size, size)
      try {
        actions.updateProfile({ photo: c.toDataURL('image/jpeg', 0.82) })
        toast(t('Fotoğraf güncellendi'))
      } catch {
        toast(t('Fotoğraf çok büyük'))
      }
    }
    img.onerror = () => URL.revokeObjectURL(url)
    img.src = url
  }

  const totalVolume = s.workouts.reduce((a, w) => a + workoutVolume(w, s.customExercises), 0)
  const lastBw = s.bodyweights[s.bodyweights.length - 1]
  const firstBw = s.bodyweights[0]
  const bwDelta = lastBw && firstBw ? lastBw.kg - firstBw.kg : 0

  const board = useBoard(s)
  const st = streak(s.workouts, p.weeklyGoal)
  const tasks = [
    {
      id: 'first',
      title: t('İlk antrenmanını kaydet.'),
      cta: t('Başla'),
      icon: Dumbbell,
      done: s.workouts.length > 0,
      to: '/',
    },
    {
      id: 'rank',
      title: t('Dört kas grubunu sırala, genel rank\'ini aç.'),
      cta: t('Rank\'e bak'),
      icon: Trophy,
      done: !!board.overall,
      to: '/rank',
    },
    {
      id: 'week',
      title: t('Haftalık hedefini bir kez tuttur.'),
      cta: t('Trendlere bak'),
      icon: ChartNoAxesColumn,
      done: st.weeks > 0,
      to: '/trends',
    },
    {
      id: 'routine',
      title: t('Kendi programını oluştur.'),
      cta: t('Oluştur'),
      icon: ClipboardList,
      done: s.routines.some((r) => !r.id.startsWith('preset-') && !r.id.startsWith('split-')),
      to: '/routine/new',
    },
  ]
  const doneCount = tasks.filter((task) => task.done).length

  const downloadCsv = () => {
    // Başındaki BOM, Excel'in Türkçe karakterleri doğru açması için.
    const blob = new Blob(['\uFEFF' + toCsv(s.workouts, s.customExercises)], {
      type: 'text/csv;charset=utf-8',
    })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kor-antrenmanlar-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast(t('CSV indirildi'))
  }

  const download = () => {
    const blob = new Blob([JSON.stringify(getState(), null, 2)], { type: 'application/json' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `kor-yedek-${new Date().toISOString().slice(0, 10)}.json`
    a.click()
    URL.revokeObjectURL(url)
    toast(t('Yedek indirildi'))
  }

  return (
    <>
      <header className="head">
        <div>
          <h1>{t('Profil')}</h1>
        </div>
      </header>

      <section className="card pcard" aria-label={t('Profil özeti')}>
        <div className="pcard__top">
          <button
            className="avatar avatar--btn"
            onClick={() => photoInput.current?.click()}
            aria-label={t('Fotoğraf ekle')}
          >
            {p.photo ? <img src={p.photo} alt="" /> : <img src={`${import.meta.env.BASE_URL}body/body-head.webp`} alt="" />}
          </button>
          <input
            ref={photoInput}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              const f = e.target.files?.[0]
              e.target.value = ''
              if (f) pickPhoto(f)
            }}
          />
          <div className="row__main">
            <div className="pcard__name">{p.name || t('Sporcu')}</div>
            <div className="row__sub" style={{ whiteSpace: 'normal' }}>
              {board.overall ? board.overall.label : t('İlk rank\'li setinle genel rankın açılır')}
            </div>
          </div>
          <button className="iconbtn" onClick={() => setNameSheet(true)} aria-label={t('Adı düzenle')}>
            <Pencil />
          </button>
        </div>
        <dl className="pstats">
          <div>
            <dt>{t('Antrenman')}</dt>
            <dd className="fig">{int(s.workouts.length)}</dd>
          </div>
          <div>
            <dt>{t('Seri')}</dt>
            <dd className="fig">{st.weeks} {t('hafta')}</dd>
          </div>
          <div>
            <dt>{t('Toplam')}</dt>
            <dd className="fig">{wBig(totalVolume)}</dd>
          </div>
        </dl>
      </section>

      {doneCount < tasks.length && (
        <>
          <div className="section">
            <h2>{t('Başlarken')}</h2>
            <span className="muted num">
              {doneCount} / {tasks.length}
            </span>
          </div>
          <ul className="starts">
            {tasks
              .filter((task) => !task.done)
              .map((task) => (
                <li key={task.id} className="start">
                  <span className="start__icon" aria-hidden="true">
                    <task.icon />
                  </span>
                  <p>{task.title}</p>
                  <button className="btn btn--primary btn--sm" onClick={() => go(task.to)}>
                    {task.cta}
                  </button>
                </li>
              ))}
          </ul>
        </>
      )}

      <div className="section">
        <h2>{t('Pano')}</h2>
      </div>
      <div className="card card--flush rows menu" style={{ padding: '4px 12px' }}>
        <button className="row" onClick={() => go('/history')}>
          <CalendarDays />
          <span className="row__main">{t('Antrenmanlar')}</span>
          <ChevronRight className="chev" />
        </button>
        <button className="row" onClick={() => go('/trends')}>
          <ChartNoAxesColumn />
          <span className="row__main">{t('Trendler')}</span>
          <ChevronRight className="chev" />
        </button>
        <button className="row" onClick={() => go('/exercises')}>
          <BookOpen />
          <span className="row__main">{t('Hareket kütüphanesi')}</span>
          <ChevronRight className="chev" />
        </button>
        <button className="row" onClick={() => go('/leaderboard')}>
          <Medal />
          <span className="row__main">{t('Sıralama')}</span>
          <ChevronRight className="chev" />
        </button>
      </div>

      {s.demo && (
        <div className="card">
          <h2>{t('Örnek veriyle geziyorsun')}</h2>
          <p className="row__sub" style={{ whiteSpace: 'normal', margin: '4px 0 14px' }}>
            {t('Bu antrenmanlar gerçek değil. Kendi kaydına başlamak için örnek veriyi sil.')}
          </p>
          <button className="btn btn--primary btn--sm" onClick={() => actions.resetAll()}>
            {t('Örnek veriyi sil ve başla')}
          </button>
        </div>
      )}

      <section className="card" aria-label={t('Vücut ağırlığı')}>
        <div className="row" style={{ padding: 0, minHeight: 0 }}>
          <div className="row__main">
            <div className="kpi__label">{t('Vücut ağırlığı')}</div>
            <div className="fig" style={{ fontSize: 34, lineHeight: 1.1 }}>
              {wNum1(bw)}
              <span className="unit">{wUnit()}</span>
            </div>
            <div className="row__sub num" style={{ whiteSpace: 'normal' }}>
              {lastBw ? t('{0} güncellendi', relDay(lastBw.at)) : t('Henüz girilmedi')}
              {s.bodyweights.length > 1 &&
                t(' · ilk kayıttan beri {0}{1} {2}', bwDelta >= 0 ? '+' : '−', wNum1(Math.abs(bwDelta)), wUnit())}
            </div>
          </div>
          <button className="btn btn--ghost btn--sm" onClick={() => setWeightSheet(true)}>
            {t('Güncelle')}
          </button>
        </div>
        {s.bodyweights.length > 1 && (
          <div style={{ marginTop: 16 }}>
            <LineChart
              points={s.bodyweights.map((b) => ({ at: b.at, value: toW(b.kg) }))}
              unit={wUnit()}
              label={t('Vücut ağırlığı')}
            />
          </div>
        )}
        <p className="note" style={{ marginTop: 12 }}>
          {t('Kilon değişince güncelle; eski antrenmanlar etkilenmez.')}
        </p>
      </section>

      <div className="section">
        <h2>{t('Ayarlar')}</h2>
      </div>
      <div className="card card--flush rows">
        <div className="row">
          <div className="row__main">
            <div className="row__title">{t('Haftalık hedef')}</div>
            <div className="row__sub">{t('Seri bu sayıya göre ilerler')}</div>
          </div>
          <Stepper
            small
            label={t('Haftalık antrenman hedefi')}
            value={p.weeklyGoal}
            min={1}
            max={7}
            onChange={(weeklyGoal) => actions.updateProfile({ weeklyGoal })}
          />
        </div>
        <div className="row">
          <div className="row__main">
            <div className="row__title">{t('Dinlenme süresi')}</div>
            <div className="row__sub">
              {s.settings.restSec === 0 ? t('Sayaç kapalı') : t('Set bitince başlar, dolunca kırmızıya döner')}
            </div>
          </div>
          <Stepper
            small
            label={t('Dinlenme süresi')}
            value={s.settings.restSec}
            min={0}
            max={600}
            step={15}
            format={(v) => (v === 0 ? '–' : timer(v))}
            onChange={(restSec) => actions.updateSettings({ restSec })}
          />
        </div>
        <div className="row">
          <div className="row__main">
            <div className="row__title">{t('Titreşim')}</div>
            <div className="row__sub">{t('Set tamamlanınca ve dinlenme dolunca')}</div>
          </div>
          <Switch
            label={t('Titreşim')}
            checked={s.settings.vibrate}
            onChange={(vibrate) => actions.updateSettings({ vibrate })}
          />
        </div>
        <div className="row">
          <div className="row__main">
            <div className="row__title">{t('Uyarı sesi')}</div>
            <div className="row__sub">{t('Dinlenme dolunca kısa bip')}</div>
          </div>
          <Switch
            label={t('Uyarı sesi')}
            checked={s.settings.sound !== false}
            onChange={(sound) => actions.updateSettings({ sound })}
          />
        </div>
        <div className="row" style={{ flexWrap: 'wrap' }}>
          <div className="row__main" style={{ flexBasis: '100%' }}>
            <div className="row__title">{t('Rank standartları')}</div>
            <div className="row__sub">{t('Değiştirince tüm rank\'ler yeniden hesaplanır')}</div>
          </div>
          <div style={{ flexBasis: '100%' }}>
            <Seg
              label={t('Rank standartları')}
              value={p.sex}
              onChange={(sex) => actions.updateProfile({ sex })}
              options={[
                { value: 'm', label: t('Erkek') },
                { value: 'f', label: t('Kadın') },
              ]}
            />
          </div>
        </div>
        <div className="row" style={{ flexWrap: 'wrap' }}>
          <div className="row__main" style={{ flexBasis: '100%' }}>
            <div className="row__title">{t('Dil')}</div>
          </div>
          <div style={{ flexBasis: '100%' }}>
            <Seg
              label={t('Dil')}
              value={s.settings.lang ?? lang()}
              onChange={(l) => actions.updateSettings({ lang: l })}
              options={LANGS.map((x) => ({ value: x.id, label: x.name }))}
            />
          </div>
        </div>
        <div className="row" style={{ flexWrap: 'wrap' }}>
          <div className="row__main" style={{ flexBasis: '100%' }}>
            <div className="row__title">{t('Birimler')}</div>
            <div className="row__sub">{t('Veri kg olarak saklanır; yalnızca gösterim değişir')}</div>
          </div>
          <div style={{ flexBasis: '100%' }}>
            <Seg
              label={t('Birim sistemi')}
              value={s.settings.units ?? 'metric'}
              onChange={(units) => actions.updateSettings({ units })}
              options={[
                { value: 'metric', label: t('Metrik (kg, m)') },
                { value: 'imperial', label: t('Imperial (lb, ft)') },
              ]}
            />
          </div>
        </div>
        <div className="row" style={{ flexWrap: 'wrap' }}>
          <div className="row__main" style={{ flexBasis: '100%' }}>
            <div className="row__title">{t('Tema')}</div>
          </div>
          <div style={{ flexBasis: '100%' }}>
            <Seg
              label={t('Tema')}
              value={s.settings.theme ?? 'dark'}
              onChange={(theme) => actions.updateSettings({ theme })}
              options={[
                { value: 'light', label: t('Açık') },
                { value: 'dark', label: t('Koyu') },
                { value: 'blue', label: t('Mavi') },
              ]}
            />
          </div>
        </div>
        <button className="row" onClick={() => setNameSheet(true)}>
          <div className="row__main">
            <div className="row__title">{t('Ad, boy, yaş')}</div>
            <div className="row__sub">
              {[
                p.name || t('Girilmedi'),
                p.heightCm ? `${p.heightCm} cm` : null,
                p.age ? t('{0} yaş', p.age) : null,
              ]
                .filter(Boolean)
                .join(' · ')}
            </div>
          </div>
          <ChevronRight className="chev" />
        </button>
      </div>

      <div className="section">
        <h2>{t('Premium')}</h2>
      </div>
      <div className="card card--flush rows menu" style={{ padding: '4px 12px' }}>
        {premium ? (
          <div className="row">
            <div className="row__main">
              <div>{t('Premium etkin')}</div>
              <div className="row__sub">{t('Tüm özellikler açık')}</div>
            </div>
          </div>
        ) : (
          <div className="row" style={{ flexWrap: 'wrap' }}>
            <div className="row__main" style={{ flexBasis: '100%' }}>
              <div className="row__title">{t('Premium kodu')}</div>
              <div className="row__sub">{t('Kodun varsa gir, Premium açılsın')}</div>
            </div>
            <div style={{ display: 'flex', gap: 8, flexBasis: '100%' }}>
              <input
                className="input"
                style={{ flex: 1 }}
                value={redeemCode}
                onChange={(e) => setRedeemCode(e.target.value)}
                placeholder={t('Kodu gir')}
                aria-label={t('Premium kodu')}
                autoCapitalize="characters"
                autoCorrect="off"
                spellCheck={false}
              />
              <button
                className="btn btn--primary btn--sm"
                disabled={!redeemCode.trim()}
                onClick={applyRedeem}
              >
                {t('Kullan')}
              </button>
            </div>
          </div>
        )}
      </div>

      <div className="section">
        <h2>{t('Programlar')}</h2>
        <button className="link" onClick={() => go('/routine/new')}>
          {t('Yeni program')}
        </button>
      </div>
      {s.routines.length ? (
        <div className="card card--flush rows">
          {s.routines.map((r) => (
            <button key={r.id} className="row" onClick={() => go(`/routine/${r.id}`)}>
              <div className="row__main">
                <div className="row__title">{r.name}</div>
                <div className="row__sub">{routineSummary(r, s.customExercises)}</div>
              </div>
              <ChevronRight className="chev" />
            </button>
          ))}
        </div>
      ) : (
        <p className="empty">{t('Programın yok. Sık yaptığın antrenmanı program olarak kaydet.')}</p>
      )}

      <AccountSection />

      <div className="section">
        <h2>{t('Yasal')}</h2>
      </div>
      <div className="card card--flush rows menu" style={{ padding: '4px 12px' }}>
        <button className="row" onClick={() => go('/legal')}>
          <Scale />
          <div className="row__main">
            <div>{t('Sözleşmeler ve gizlilik')}</div>
            <div className="row__sub">{t('Kullanım koşulları, KVKK, sağlık uyarısı')}</div>
          </div>
        </button>
      </div>

      <div className="section">
        <h2>{t('Veri')}</h2>
      </div>
      <div className="card card--flush rows menu" style={{ padding: '4px 12px' }}>
        <button className="row" onClick={download}>
          <Download />
          <div className="row__main">
            <div>{t('Yedeği indir')}</div>
            <div className="row__sub">{t('Tüm antrenmanların tek dosyada')}</div>
          </div>
        </button>
        <button className="row" onClick={() => go('/import')}>
          <FileUp />
          <div className="row__main">
            <div>{t('Başka uygulamadan aktar')}</div>
            <div className="row__sub">{t('Strong, Hevy, FitNotes, CSV tablosu')}</div>
          </div>
        </button>
        <button className="row" onClick={downloadCsv}>
          <FileDown />
          <div className="row__main">
            <div>{t('CSV olarak dışa aktar')}</div>
            <div className="row__sub">{t('Her set bir satır; Excel ve diğer uygulamalar açar')}</div>
          </div>
        </button>
        <button className="row" onClick={() => file.current?.click()}>
          <Upload />
          <div className="row__main">
            <div>{t('Yedekten geri yükle')}</div>
            <div className="row__sub">{t('Daha önce indirdiğin dosyayı seç')}</div>
          </div>
        </button>
        <button className="row row--danger" onClick={() => setReset(true)}>
          <Trash2 />
          <span className="row__main">{t('Tüm veriyi sil')}</span>
        </button>
      </div>
      <input
        ref={file}
        type="file"
        accept="application/json,.json"
        hidden
        onChange={async (e) => {
          const f = e.target.files?.[0]
          e.target.value = ''
          if (!f) return
          const text = await f.text()
          if (parseBackup(text)) setRestore(text)
          else toast('Bu dosya bir Kor yedeği değil')
        }}
      />
      <p className="note">
        {cloud.user
          ? t('Verilerin bu cihazda durur ve hesabına yedeklenir. Yedek dosyası yine de elinin altında olsun.')
          : t('Verilerin yalnızca bu cihazda, tarayıcının deposunda durur. Tarayıcı verisini temizlersen silinir; ara sıra yedek al.')}
      </p>

      {weightSheet && <WeightSheet current={bw} onClose={() => setWeightSheet(false)} />}
      {nameSheet && <NameSheet profile={p} onClose={() => setNameSheet(false)} />}
      {reset && (
        <Confirm
          title={t('Tüm veri silinsin mi?')}
          body={t('Antrenmanların, programların ve rank\'in bu cihazdan silinir. Yedeğin yoksa geri getirilemez.')}
          confirm={t('Hepsini sil')}
          danger
          onConfirm={() => actions.resetAll()}
          onClose={() => setReset(false)}
        />
      )}
      {restore && (
        <Confirm
          title={t('Yedek geri yüklensin mi?')}
          body={t('Bu cihazdaki mevcut veri, yedekteki veriyle değiştirilir.')}
          confirm={t('Geri yükle')}
          onConfirm={() => {
            const data = parseBackup(restore)
            if (data) {
              actions.replaceAll(data)
              toast('Yedek geri yüklendi')
            }
          }}
          onClose={() => setRestore(null)}
        />
      )}
    </>
  )
}

export function WeightSheet({ current, onClose }: { current: number; onClose: () => void }) {
  const [text, setText] = useState(wNum1(current))
  const v = parseNum(text)
  const range = bodyweightRange()
  const valid = v != null && v >= range.min && v <= range.max
  const kg = v == null ? null : fromW(v)
  return (
    <Sheet title={t('Vücut ağırlığı')} onClose={onClose}>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault()
          if (!valid || kg == null) return
          actions.logBodyweight(kg)
          onClose()
          toast('Vücut ağırlığı güncellendi')
        }}
      >
        <div className="affix">
          <input
            className="input input--fig"
            inputMode="decimal"
            value={text}
            onChange={(e) => setText(e.target.value)}
            aria-label={t('Vücut ağırlığı, {0}', wUnit())}
            autoFocus
            onFocus={(e) => e.target.select()}
          />
          <span>{wUnit()}</span>
        </div>
        <div className="btnrow">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            {t('Vazgeç')}
          </button>
          <button className="btn btn--primary" disabled={!valid}>
            {t('Kaydet')}
          </button>
        </div>
      </form>
    </Sheet>
  )
}

function NameSheet({
  profile,
  onClose,
}: {
  profile: { name: string; heightCm?: number; age?: number }
  onClose: () => void
}) {
  const [name, setName] = useState(profile.name)
  const [height, setHeight] = useState(profile.heightCm ? String(profile.heightCm) : '')
  const [age, setAge] = useState(profile.age ? String(profile.age) : '')
  const onlyNum = (v: string) => v.replace(/[^0-9]/g, '')
  return (
    <Sheet title={t('Profil')} onClose={onClose}>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault()
          const h = parseInt(height, 10)
          const a = parseInt(age, 10)
          actions.updateProfile({
            name: name.trim(),
            heightCm: Number.isFinite(h) && h > 0 ? h : undefined,
            age: Number.isFinite(a) && a > 0 ? a : undefined,
          })
          onClose()
        }}
      >
        <label className="label">{t('Ad')}</label>
        <input
          className="input"
          value={name}
          onChange={(e) => setName(e.target.value)}
          aria-label={t('Ad')}
          maxLength={24}
          autoFocus
        />
        <label className="label">{t('Boy (cm)')}</label>
        <input
          className="input"
          value={height}
          onChange={(e) => setHeight(onlyNum(e.target.value))}
          inputMode="numeric"
          maxLength={3}
          aria-label={t('Boy (cm)')}
          placeholder="175"
        />
        <label className="label">{t('Yaş')}</label>
        <input
          className="input"
          value={age}
          onChange={(e) => setAge(onlyNum(e.target.value))}
          inputMode="numeric"
          maxLength={3}
          aria-label={t('Yaş')}
          placeholder="25"
        />
        <div className="btnrow">
          <button type="button" className="btn btn--ghost" onClick={onClose}>
            {t('Vazgeç')}
          </button>
          <button className="btn btn--primary">{t('Kaydet')}</button>
        </div>
      </form>
    </Sheet>
  )
}
