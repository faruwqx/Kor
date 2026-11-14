import { ArrowLeft, Check } from 'lucide-react'
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { cloudEnabled, startTrial, useCloud } from '../lib/cloud'
import { FREE_HISTORY_DAYS, isPremium, redeemed } from '../lib/cloud-core'
import { demoState } from '../lib/demo'
import { num1, parseNum } from '../lib/format'
import { KG_PER_LB, bodyweightRange, fromW, fw1, fwi, toW, unitSystem, wInt, wUnit } from '../lib/units'
import {
  buildPlan,
  WEEKLY_GAIN,
  liftFor,
  projectPlan,
  splitFor,
  targetRpFor,
  type Answers,
  type Experience,
  type Focus,
  type Goal,
  type Obstacle,
} from '../lib/onboarding'
import { PRESET_ROUTINES } from '../lib/presets'
import { TRIAL_DAYS, detectCountry, formatPrice, priceFor } from '../lib/pricing'
import { MAX_RANK_REPS, RP_PER_TIER, TIERS, kgForRp, rankFromRp, setRp } from '../lib/rank'
import { actions, getState } from '../lib/store'
import { Emblem, Mark } from '../ui/Emblem'
import { LineChart } from '../ui/charts'
import { Seg, Stepper, toast } from '../ui/kit'
import { AuthSheet } from './Account'
import { LegalLinks } from '../ui/Legal'
import { t } from '../lib/i18n'

type StepId =
  | 'welcome'
  | 'sex'
  | 'experience'
  | 'days'
  | 'ladder'
  | 'weight'
  | 'goal'
  | 'focus'
  | 'map'
  | 'lift'
  | 'path'
  | 'obstacle'
  | 'honest'
  | 'name'
  | 'building'
  | 'plan'
  | 'save'
  | 'premium'

/** İlerleme çubuğunun saydığı adımlar. */
const QUESTIONS: StepId[] = [
  'sex',
  'experience',
  'days',
  'ladder',
  'weight',
  'goal',
  'focus',
  'map',
  'lift',
  'path',
  'obstacle',
  'honest',
  'name',
]
const ORDER: StepId[] = ['welcome', ...QUESTIONS, 'building', 'plan', 'save', 'premium']

interface Draft {
  step: StepId
  name: string
  sex: 'm' | 'f' | null
  experience: Experience | null
  days: number
  weight: string
  goal: Goal | null
  /** Seçilen bölgeler, seçim sırasıyla. İlki rank hedefini belirler. */
  focus: Focus[]
  liftKg: string
  liftReps: number
  obstacle: Obstacle | null
}

const EMPTY: Draft = {
  step: 'welcome',
  name: '',
  sex: null,
  experience: null,
  days: 3,
  weight: '',
  goal: null,
  focus: [],
  liftKg: '',
  liftReps: 5,
  obstacle: null,
}

// Google ile girişte sayfa yeniden yüklenir; cevaplar dönüşte kaybolmasın.
const KEY = 'kor:onboarding'

function restore(): Draft {
  try {
    const raw = sessionStorage.getItem(KEY)
    if (!raw) return EMPTY
    const d = { ...EMPTY, ...(JSON.parse(raw) as Partial<Draft>) }
    if (!ORDER.includes(d.step)) return EMPTY
    // Eski taslakta odak tek değerdi.
    const f = d.focus as Focus[] | Focus | null
    d.focus = Array.isArray(f) ? f : f ? [f] : []
    return d.step === 'building' ? { ...d, step: 'plan' } : d
  } catch {
    return EMPTY
  }
}

function Options<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: T | null
  onChange: (v: T) => void
  options: { value: T; title: string; sub?: string }[]
}) {
  return (
    <div className="opts" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className="opt"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.title}
          {o.sub && <span className="opt__sub">{o.sub}</span>}
        </button>
      ))}
    </div>
  )
}

/** Çoklu seçim. `exclusive` seçenek tek başına durur: seçilince diğerleri kalkar. */
function MultiOptions<T extends string>({
  label,
  value,
  onChange,
  options,
  exclusive,
  firstTag,
}: {
  label: string
  value: T[]
  onChange: (v: T[]) => void
  options: { value: T; title: string }[]
  exclusive?: T
  /** İlk seçilenin altında görünen not. */
  firstTag?: string
}) {
  const toggle = (v: T) => {
    if (value.includes(v)) onChange(value.filter((x) => x !== v))
    else if (v === exclusive) onChange([v])
    else onChange([...value.filter((x) => x !== exclusive), v])
  }
  return (
    <div className="opts" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          className="opt"
          aria-pressed={value.includes(o.value)}
          onClick={() => toggle(o.value)}
        >
          {o.title}
          {firstTag && value.length > 1 && value[0] === o.value && (
            <span className="opt__sub">{firstTag}</span>
          )}
        </button>
      ))}
    </div>
  )
}

/** Kas haritası: altı eksenli radar. Seçilen bölgeler öne çıkar. */
const RADAR_AXES = (): { id: string; name: string; deg: number; focus?: Focus }[] => [
  { id: 'back', name: t('Sırt'), deg: -120, focus: 'back' },
  { id: 'shoulders', name: t('Omuz'), deg: -60, focus: 'shoulders' },
  { id: 'core', name: t('Karın'), deg: 0 },
  { id: 'arms', name: t('Kol'), deg: 60, focus: 'arms' },
  { id: 'chest', name: t('Göğüs'), deg: 120, focus: 'chest' },
  { id: 'legs', name: t('Bacak'), deg: 180, focus: 'legs' },
]

function FocusRadar({ focus }: { focus: Focus[] }) {
  const cx = 160
  const cy = 130
  const r = 84
  const balanced = focus.includes('balanced')
  const at = (deg: number, k: number) => {
    const a = (deg * Math.PI) / 180
    return [cx + Math.cos(a) * r * k, cy + Math.sin(a) * r * k] as const
  }
  const on = (f?: Focus) => !!f && focus.includes(f)
  const shape = RADAR_AXES().map((a) => at(a.deg, balanced ? 0.8 : on(a.focus) ? 1 : 0.38))
    .map(([x, y]) => `${x.toFixed(1)},${y.toFixed(1)}`)
    .join(' ')
  return (
    <svg className="ob__radar" viewBox="0 0 320 260" aria-hidden="true">
      {[0.25, 0.5, 0.75, 1].map((k) => (
        <circle key={k} cx={cx} cy={cy} r={r * k} className="ob__radar-ring" />
      ))}
      {RADAR_AXES().map((a) => {
        const [x, y] = at(a.deg, 1)
        return <line key={a.id} x1={cx} y1={cy} x2={x} y2={y} className="ob__radar-ring" />
      })}
      <polygon points={shape} className="ob__radar-shape" />
      {RADAR_AXES().map((a) => {
        const [x, y] = at(a.deg, 1.24)
        const c = Math.cos((a.deg * Math.PI) / 180)
        return (
          <text
            key={a.id}
            x={x}
            y={y + 5}
            textAnchor={c > 0.3 ? 'start' : c < -0.3 ? 'end' : 'middle'}
            className={balanced || on(a.focus) ? 'ob__radar-on' : 'ob__radar-off'}
          >
            {a.name}
          </text>
        )
      })}
    </svg>
  )
}

const BUILD_LINES = () => [
  t('Standartlar vücut ağırlığına göre ayarlanıyor'),
  t('Haftalık program diziliyor'),
  t('İlk rank hedefin hesaplanıyor'),
]

function Building({ onDone }: { onDone: () => void }) {
  const [pct, setPct] = useState(0)
  const done = useRef(onDone)
  useEffect(() => {
    done.current = onDone
  })
  useEffect(() => {
    const still = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false
    if (still) {
      const timer = setTimeout(() => done.current(), 500)
      return () => clearTimeout(timer)
    }
    const timer = setInterval(() => setPct((p) => Math.min(100, p + 4)), 80)
    return () => clearInterval(timer)
  }, [])
  useEffect(() => {
    if (pct < 100) return
    const timer = setTimeout(() => done.current(), 350)
    return () => clearTimeout(timer)
  }, [pct])
  const stage = Math.floor(pct / 34)
  return (
    <div className="ob__center" role="status" aria-live="polite">
      <div className="fig ob__big">%{pct}</div>
      <h1>{t('Planın hazırlanıyor')}</h1>
      <div className="bar" style={{ width: '100%' }}>
        <div className="bar__fill" style={{ width: `${pct}%` }} />
      </div>
      <ul className="card ob__checks">
        {BUILD_LINES().map((l, i) => (
          <li key={l} data-done={i < stage || pct >= 100}>
            <span className="ob__tick" aria-hidden="true">
              {(i < stage || pct >= 100) && <Check />}
            </span>
            {l}
          </li>
        ))}
      </ul>
    </div>
  )
}

export function Onboarding() {
  const cloud = useCloud()
  const [d, setD] = useState<Draft>(restore)
  const [auth, setAuth] = useState(false)
  const [busy, setBusy] = useState(false)
  const heading = useRef<HTMLDivElement>(null)
  const patch = (p: Partial<Draft>) => setD((prev) => ({ ...prev, ...p }))

  useEffect(() => {
    try {
      sessionStorage.setItem(KEY, JSON.stringify(d))
    } catch {
      // Depolama kapalıysa akış yalnızca bu sayfa açıkken sürer.
    }
  }, [d])

  // Ekran değişince başlığa odaklan: ekran okuyucu yeni soruyu okusun.
  useEffect(() => {
    if (d.step !== 'welcome') heading.current?.querySelector('h1')?.focus()
    window.scrollTo(0, 0)
  }, [d.step])

  // Girişler seçili birimde; hesaplar kg ile yapılır.
  const range = bodyweightRange()
  const weightIn = parseNum(d.weight)
  // Geçersizken 0: weightOk sağlanmadan hiçbir hesapta kullanılmaz.
  const kg = weightIn == null ? 0 : fromW(weightIn)
  const weightOk = weightIn != null && weightIn >= range.min && weightIn <= range.max
  const liftIn = parseNum(d.liftKg)
  const liftKg = liftIn == null ? null : fromW(liftIn)
  const liftOk = liftKg != null && liftKg > 0 && liftKg <= 500

  const answers: Answers | null =
    d.sex && d.experience && d.goal && d.focus.length > 0 && d.obstacle && weightOk
      ? {
          sex: d.sex,
          experience: d.experience,
          days: d.days,
          bodyweight: kg,
          goal: d.goal,
          focus: d.focus[0],
          obstacle: d.obstacle,
          lift: liftOk ? { kg: liftKg, reps: d.liftReps } : undefined,
        }
      : null
  const plan = answers ? buildPlan(answers) : null
  const price = useMemo(() => priceFor(detectCountry()), [])

  const finish = () => {
    if (!answers || !plan) return
    try {
      sessionStorage.removeItem(KEY)
    } catch {
      // yok sayılır
    }
    actions.completeOnboarding(
      {
        name: d.name.trim(),
        sex: answers.sex,
        weeklyGoal: answers.days,
        createdAt: Date.now(),
        experience: answers.experience,
        goal: answers.goal,
        focus: answers.focus,
        focuses: d.focus,
        obstacle: answers.obstacle,
      },
      answers.bodyweight,
      plan.startId,
    )
  }

  /** Bu adım gösterilmeli mi: hesap ve Premium ekranları yalnızca anlamlıyken çıkar. */
  const shown = (s: StepId) => {
    if (s === 'save') return cloudEnabled && !cloud.user
    if (s === 'premium') return !(isPremium(cloud.sub) || redeemed(getState().settings))
    return true
  }

  const next = () => {
    let i = ORDER.indexOf(d.step) + 1
    while (i < ORDER.length && !shown(ORDER[i])) i++
    if (i >= ORDER.length) finish()
    else patch({ step: ORDER[i] })
  }

  const prev = () => {
    let i = ORDER.indexOf(d.step) - 1
    while (i > 0 && (ORDER[i] === 'building' || !shown(ORDER[i]))) i--
    patch({ step: ORDER[Math.max(0, i)] })
  }

  // "Planını kaydet" ekranında giriş tamamlanınca kendiliğinden ilerle.
  const signedIn = !!cloud.user
  useEffect(() => {
    if (d.step === 'save' && signedIn) {
      setAuth(false)
      next()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [d.step, signedIn])

  if (d.step === 'welcome')
    return (
      <main className="welcome">
        <div className="welcome__mark">
          <Mark size={30} />
          {t('Kor')}
        </div>

        <div>
          <h1>{t('Kaldırdığın kilo rank\'ini belirler.')}</h1>
          <p>
            {t('Setlerini kaydet. Kor, her kas grubunu vücut ağırlığına göre Kömür\'den Kor\'a uzanan merdivene yerleştirir.')}
          </p>
        </div>

        <div className="tiers" aria-hidden="true">
          {TIERS.map((tier, i) => (
            <Emblem key={tier.id} rank={{ tier: i, division: 2 }} size={30} />
          ))}
        </div>

        <div className="welcome__foot">
          <button className="btn btn--primary btn--block" onClick={next}>
            {t('Planımı oluştur')}
          </button>
          <p className="hint" style={{ textAlign: 'center' }}>
            {t('Dokuz kısa soru. Sonunda ilk rank hedefini görürsün.')}
          </p>
          <LegalLinks
            lead={t('Devam ederek')}
            ids={['terms', 'privacy', 'health']}
            tail={t('metinlerini kabul etmiş olursun.')}
          />
          <button className="textbtn" onClick={() => actions.replaceAll(demoState())}>
            {t('Önce örnek veriyle gez')}
          </button>
          {cloudEnabled && (
            <button className="textbtn" onClick={() => setAuth(true)}>
              {t('Hesabım var, giriş yap')}
            </button>
          )}
        </div>
        {auth && <AuthSheet onClose={() => setAuth(false)} />}
      </main>
    )

  const qi = QUESTIONS.indexOf(d.step)
  const progress = qi < 0 ? 1 : (qi + 1) / (QUESTIONS.length + 1)
  const lift = d.focus.length ? liftFor(d.focus[0]) : null
  const liftRp =
    lift && liftOk && weightOk && d.sex ? setRp(lift, liftKg, d.liftReps, kg, d.sex) : null
  const liftRank = liftRp != null ? rankFromRp(liftRp) : null
  // Kademe eşikleri: bu hareketin, bu vücut ağırlığındaki tek tekrar karşılıkları.
  const tierKgs =
    lift && weightOk && d.sex
      ? TIERS.slice(1).map((tier, i) => ({
          tier: i + 1,
          name: tier.name,
          color: tier.color,
          kg: Math.max(0, kgForRp(lift, (i + 1) * RP_PER_TIER, kg, d.sex!) ?? 0),
        }))
      : []
  const nextTier = Math.min(
    TIERS.length - 1,
    Math.round(targetRpFor(liftRp, d.experience ?? 'new') / RP_PER_TIER),
  )
  const nextKg = tierKgs.find((row) => row.tier === nextTier)?.kg ?? 0
  const topKg = tierKgs.length ? tierKgs[tierKgs.length - 1].kg : 1
  const names = splitFor(d.days).map((id) => PRESET_ROUTINES.find((r) => r.id === id)?.name ?? id)

  let body: ReactNode = null
  let canNext = true
  let cta = t('Devam')
  let onCta: () => void = next
  let secondary: ReactNode = null

  switch (d.step) {
    case 'sex':
      canNext = d.sex != null
      body = (
        <>
          <div>
            <h1 tabIndex={-1}>{t('Hangi standartlarla sıralanalım?')}</h1>
            <p>{t('Rank eşikleri buna göre seçilir. Profilden sonra değiştirebilirsin.')}</p>
          </div>
          <Options
            label={t('Standartlar')}
            value={d.sex}
            onChange={(sex) => patch({ sex })}
            options={[
              { value: 'm', title: t('Erkek') },
              { value: 'f', title: t('Kadın') },
            ]}
          />
        </>
      )
      break

    case 'experience':
      canNext = d.experience != null
      body = (
        <>
          <div>
            <h1 tabIndex={-1}>{t('Ne zamandır ağırlık çalışıyorsun?')}</h1>
            <p>{t('İlk rank hedefini buna göre koyacağız.')}</p>
          </div>
          <Options
            label={t('Deneyim')}
            value={d.experience}
            onChange={(experience) => patch({ experience })}
            options={[
              { value: 'new', title: t('Yeni başlıyorum'), sub: t('Altı aydan az') },
              { value: 'mid', title: t('Bir süredir'), sub: t('Altı ay ile iki yıl arası') },
              { value: 'adv', title: t('Uzun zamandır'), sub: t('İki yıldan fazla') },
            ]}
          />
        </>
      )
      break

    case 'days':
      body = (
        <>
          <div>
            <h1 tabIndex={-1}>{t('Haftada kaç gün çalışacaksın?')}</h1>
            <p>{t('Tutabileceğin sayıyı seç. Serin bu hedefe göre ilerler.')}</p>
          </div>
          <div className="card ob__days">
            <Stepper
              label={t('Haftalık antrenman günü')}
              value={d.days}
              onChange={(days) => patch({ days })}
              min={1}
              max={7}
            />
            <p className="muted" aria-live="polite">
              {t('Haftada')} {d.days} {t('gün:')} {names.join(', ')}
              {d.days > names.length ? t(' sırayla döner.') : '.'}
            </p>
          </div>
        </>
      )
      break

    case 'ladder':
      body = (
        <>
          <div>
            <h1 tabIndex={-1}>{t('Rank satın alınmaz, elde edilir.')}</h1>
            <p>
              {t('Sekiz kademe var. Her kas grubu kendi rank\'ini alır; ölçü, kaldırdığın kilonun vücut ağırlığına oranıdır.')}
            </p>
          </div>
          <ul className="card ob__ladder">
            {TIERS.map((tier, i) => (
              <li key={tier.id}>
                <Emblem rank={{ tier: i, division: 2 }} size={38} />
                {tier.name}
              </li>
            ))}
          </ul>
        </>
      )
      break

    case 'weight':
      canNext = weightOk
      body = (
        <>
          <div>
            <h1 tabIndex={-1}>{t('Vücut ağırlığın kaç?')}</h1>
            <p>{t('Aynı kiloyu kaldıran iki kişiden hafif olan daha yüksek rank alır.')}</p>
          </div>
          <div>
            <div className="affix">
              <input
                className="input input--fig"
                inputMode="decimal"
                value={d.weight}
                onChange={(e) => patch({ weight: e.target.value })}
                aria-label={t('Vücut ağırlığı, {0}', wUnit())}
                aria-describedby="ob-weight-hint"
              />
              <span>{wUnit()}</span>
            </div>
            <p className="hint" id="ob-weight-hint">
              {range.min} {t('ile')} {range.max} {wUnit()} {t('arası. Kilon değişince profilden güncellersin.')}
            </p>
          </div>
          <div>
            <div className="label">{t('Birimler')}</div>
            <Seg
              label={t('Birim sistemi')}
              value={unitSystem()}
              onChange={(u) => {
                // Yazılmış sayılar yeni birime çevrilir: 80 kg → 176,4 lb.
                const conv = (raw: string) => {
                  const n = parseNum(raw)
                  if (n == null) return raw
                  const k = fromW(n)
                  return num1(u === 'imperial' ? k / KG_PER_LB : k)
                }
                patch({ weight: conv(d.weight), liftKg: conv(d.liftKg) })
                actions.updateSettings({ units: u })
              }}
              options={[
                { value: 'metric', label: t('Metrik (kg, m)') },
                { value: 'imperial', label: t('Imperial (lb, ft)') },
              ]}
            />
          </div>
        </>
      )
      break

    case 'goal':
      canNext = d.goal != null
      body = (
        <>
          <div>
            <h1 tabIndex={-1}>{t('Asıl hedefin ne?')}</h1>
            <p>{t('Hedef setindeki tekrar sayısını buna göre seçeceğiz.')}</p>
          </div>
          <Options
            label={t('Hedef')}
            value={d.goal}
            onChange={(goal) => patch({ goal })}
            options={[
              { value: 'strength', title: t('Güçlenmek'), sub: t('Daha ağır kaldırmak') },
              { value: 'muscle', title: t('Kas kazanmak'), sub: t('Hacim ve görünüm') },
              { value: 'rank', title: t('Rank atlamak'), sub: t('Merdivende Kor\'a tırmanmak') },
              { value: 'fit', title: t('Formda kalmak'), sub: t('Düzenli çalışmak yeter') },
            ]}
          />
        </>
      )
      break

    case 'focus':
      canNext = d.focus.length > 0
      body = (
        <>
          <div>
            <h1 tabIndex={-1}>{t('En çok hangi bölgeyi geliştirmek istiyorsun?')}</h1>
            <p>
              {t('Birden fazla seçebilirsin. İlk seçtiğin bölge, ilk programını ve ilk rank hedefini belirler.')}
            </p>
          </div>
          <MultiOptions
            label={t('Odak bölgeler, birden fazla seçilebilir')}
            value={d.focus}
            onChange={(focus) => patch({ focus })}
            exclusive="balanced"
            firstTag={t('İlk hedef')}
            options={[
              { value: 'chest', title: t('Göğüs') },
              { value: 'back', title: t('Sırt') },
              { value: 'legs', title: t('Bacak') },
              { value: 'shoulders', title: t('Omuz') },
              { value: 'arms', title: t('Kol') },
              { value: 'balanced', title: t('Hepsi dengeli') },
            ]}
          />
        </>
      )
      break

    case 'map':
      body = (
        <>
          <div>
            <h1 tabIndex={-1}>{t('Her bölge kendi rank\'ini alır.')}</h1>
            <p>
              {d.focus.includes('balanced')
                ? t('Dengeli bir harita seçtin. Antrenman kaydettikçe her eksen kendi rank puanıyla dolar.')
                : t('Seçtiğin bölgeler haritada öne çıkıyor. Antrenman kaydettikçe her eksen kendi rank puanıyla dolar.')}
            </p>
          </div>
          <div className="card ob__chart">
            <div className="kpi__label">{t('Odak haritan')}</div>
            <FocusRadar focus={d.focus} />
            <p className="hint">
              {t('Bu, seçimlerinin önizlemesi. Gerçek haritan ilk antrenmanından sonra çizilir.')}
            </p>
          </div>
        </>
      )
      break

    case 'path':
      body = lift && (
        <>
          <div>
            <h1 tabIndex={-1}>
              {liftRank
                ? t('Şu an {0}. Sırada {1} var.', liftRank.label, TIERS[nextTier].name)
                : t('İlk hedefin {0}.', TIERS[nextTier].name)}
            </h1>
            <p>
              {lift.name} {t('hareketinde tek tekrar')} {fwi(nextKg)} {TIERS[nextTier].name}{' '}
              {t('kademesini açar. Eşikler')} {fw1(kg!)} {t('vücut ağırlığına göre hesaplandı.')}
            </p>
          </div>
          <div className="card ob__chart">
            <div className="kpi__label">{lift.name}{t(': kademe eşikleri,')} {wUnit()}</div>
            <ol className="tbars" aria-label={t('Kademe eşikleri')}>
              {tierKgs.map((row) => (
                <li key={row.tier} data-next={row.tier === nextTier}>
                  <span className="tbars__kg num">{wInt(row.kg)}</span>
                  <span
                    className="tbars__bar"
                    style={{ height: `${Math.max(6, (row.kg / topKg) * 100)}%`, background: row.color }}
                  />
                  <span className="tbars__name">{row.name}</span>
                </li>
              ))}
            </ol>
            <p className="hint">
              {t('İlk kademeler birbirine yakındır, çabuk açılır. Üst kademeler giderek daha çok güç ister.')}
            </p>
          </div>
        </>
      )
      break

    case 'lift':
      canNext = liftOk
      cta = t('Devam')
      secondary = (
        <button
          className="textbtn"
          onClick={() => {
            setD((prev) => ({ ...prev, liftKg: '', step: 'path' }))
          }}
        >
          {t('Bilmiyorum, geç')}
        </button>
      )
      body = lift && (
        <>
          <div>
            <h1 tabIndex={-1}>{lift.name} {t('hareketinde en iyi setin?')}</h1>
            <p>{t('Bugün temiz yapabildiğin bir set. Şimdiki rank\'ini hemen görürsün.')}</p>
          </div>
          <div className="affix">
            <input
              className="input input--fig"
              inputMode="decimal"
              value={d.liftKg}
              onChange={(e) => patch({ liftKg: e.target.value })}
              aria-label={`${lift.name}, ${wUnit()}`}
            />
            <span>{wUnit()}</span>
          </div>
          <div className="row" style={{ padding: 0, minHeight: 0 }}>
            <span className="row__main label" style={{ marginBottom: 0 }}>
              {t('Tekrar')}
            </span>
            <Stepper
              label={t('Tekrar sayısı')}
              value={d.liftReps}
              onChange={(liftReps) => patch({ liftReps })}
              min={1}
              max={MAX_RANK_REPS}
            />
          </div>
          <div className="card ob__preview" aria-live="polite">
            <Emblem rank={liftRank} size={52} />
            <div>
              <div className="fig ob__rank">{liftRank ? liftRank.label : t('Rank bekliyor')}</div>
              <div className="row__sub" style={{ whiteSpace: 'normal' }}>
                {liftRank
                  ? t('{0} × {1} bu rank\'e denk geliyor.', fw1(liftKg!), d.liftReps)
                  : t('Kiloyu yazınca rank burada görünür.')}
              </div>
            </div>
          </div>
        </>
      )
      break

    case 'obstacle':
      canNext = d.obstacle != null
      body = (
        <>
          <div>
            <h1 tabIndex={-1}>{t('Seni en çok ne durduruyor?')}</h1>
            <p>{t('Planına buna göre bir not düşeceğiz.')}</p>
          </div>
          <Options
            label={t('Engel')}
            value={d.obstacle}
            onChange={(obstacle) => patch({ obstacle })}
            options={[
              { value: 'consistency', title: t('Düzenli gidemiyorum') },
              { value: 'knowhow', title: t('Ne yapacağımı bilmiyorum') },
              { value: 'time', title: t('Zamanım az') },
              { value: 'motivation', title: t('İlerlediğimi göremiyorum') },
            ]}
          />
        </>
      )
      break

    case 'honest': {
      const proj = answers && plan ? projectPlan(answers, plan) : null
      const weekMs = 7 * 86_400_000
      const startNow = Date.now()
      body = (
        <>
          <div>
            <h1 tabIndex={-1}>{t('Merdivenin dibinden başlamak normal.')}</h1>
            <p>
              {t('Rank tek antrenmanda değil, haftalar içinde rekor kırdıkça yükselir. İlk hedefini ulaşılabilir bir yere koyduk; işte tahmini yolun.')}
            </p>
          </div>

          {proj && plan && answers && (
            <section className="card ob__chart" aria-label={t('Tahmini yol')}>
              <div className="kpi__label">
                {plan.exercise.name} {t('· tahmini 1TM')}
              </div>
              <div className="fig trend__fig">
                {proj.weeks === 0 ? t('Hedefe hazırsın') : t('~{0} hafta', proj.weeks)}
                {proj.weeks > 0 && <span className="unit trend__unit">{plan.target.label}</span>}
              </div>
              {proj.points.length > 1 && (
                <LineChart
                  label={t('{0} tahmini 1TM, {1} hafta', plan.exercise.name, proj.weeks)}
                  unit={wUnit()}
                  points={proj.points.map((pt) => ({ at: startNow + pt.week * weekMs, value: toW(pt.kg) }))}
                />
              )}
              <p className="hint">
                {answers.lift
                  ? t('Bugün ~{0}, hedef ~{1}.', fwi(proj.fromKg), fwi(proj.toKg))
                  : t('Set girmediğin için merdivenin dibinden (~{0}) başlattık; hedef ~{1}.', fwi(proj.fromKg), fwi(proj.toKg))}{' '}
                {t('Varsayım: haftada %')}{num1(WEEKLY_GAIN[answers.experience] * 100)} {t('ilerleme ve haftada')}{' '}
                {answers.days} {t('gün. Bu bir söz değil, tahmin; gerçek hızın kayıtlarından görünür.')}
              </p>
            </section>
          )}

          <ol className="card ob__timeline" aria-label={t('Yol haritası')}>
            <li>
              <b>{t('İlk antrenman')}</b>
              {t('Rank\'li bir hareketten tek temiz set, o kas grubunu merdivene yerleştirir.')}
            </li>
            <li>
              <b>{t('İlk rekor')}</b>
              {t('Daha ağır ya da daha çok tekrar: rekor RP\'ye yazılır, basamak dolar.')}
            </li>
            <li>
              <b>{t('Genel rank')}</b>
              {t('Dört kas grubu sıralanınca genel rank\'in açılır, sıralamaya girersin.')}
            </li>
            <li>
              <b>{plan ? plan.target.label : t('İlk hedef')}</b>
              {proj && proj.weeks > 0
                ? t('Tahminen {0} hafta içinde ilk hedefine ulaşırsın.', proj.weeks)
                : t('İlk hedefin hemen önünde.')}
            </li>
          </ol>

          <ul className="card feats">
            <li>
              <Check aria-hidden="true" />
              {t('Antrenman kaydı ve rank ücretsiz, sınırsız.')}
            </li>
            <li>
              <Check aria-hidden="true" />
              {t('Rank parayla alınmaz; yalnızca kaldırdığın kiloyla değişir.')}
            </li>
            <li>
              <Check aria-hidden="true" />
              {t('Her rekor ve terfi antrenman bitince kutlanır.')}
            </li>
            <li>
              <Check aria-hidden="true" />
              {t('Verin cihazında durur, internet olmadan da çalışır.')}
            </li>
          </ul>
        </>
      )
      break
    }

    case 'name':
      cta = t('Planımı hazırla')
      body = (
        <>
          <div>
            <h1 tabIndex={-1}>{t('Sana nasıl seslenelim?')}</h1>
            <p>{t('İstersen boş bırak.')}</p>
          </div>
          <input
            className="input"
            value={d.name}
            onChange={(e) => patch({ name: e.target.value })}
            aria-label={t('Adın')}
            autoComplete="given-name"
            maxLength={24}
          />
        </>
      )
      break

    case 'building':
      body = <Building onDone={() => patch({ step: 'plan' })} />
      break

    case 'plan':
      cta = t('Devam')
      body = plan && (
        <>
          <div>
            <h1 tabIndex={-1}>{d.name.trim() ? t('{0}, planın hazır.', d.name.trim()) : t('Planın hazır.')}</h1>
            <p>{t('Cevaplarından hesaplandı. Hepsini sonradan değiştirebilirsin.')}</p>
          </div>

          <section
            className="card card--tint"
            style={{ ['--tint' as string]: plan.target.color }}
            aria-label={t('İlk rank hedefi')}
          >
            <div className="kpi__label">{t('İlk hedefin')}</div>
            <div className="rankhero" style={{ marginTop: 8 }}>
              <Emblem rank={plan.target} size={64} />
              <div className="rankhero__body">
                <div className="fig rankhero__label">{plan.target.label}</div>
                <div className="rankhero__rp num">
                  {plan.exercise.name}: {fw1(plan.targetKg)} × {plan.targetReps}
                </div>
              </div>
            </div>
            {plan.current && (
              <p className="note" style={{ marginTop: 12 }}>
                {t('Girdiğin sete göre şu an')} {plan.current.label} {t('seviyesindesin.')}
              </p>
            )}
          </section>

          <dl className="tiles">
            <div className="tile">
              <dt>{t('Haftalık hedef')}</dt>
              <dd className="fig">{d.days} {t('gün')}</dd>
            </div>
            <div className="tile">
              <dt>{t('Hedef set')}</dt>
              <dd className="fig">
                {fw1(plan.targetKg)} × {plan.targetReps}
              </dd>
            </div>
            <div className="tile">
              <dt>{t('İlk antrenman')}</dt>
              <dd className="fig">{plan.startName}</dd>
            </div>
            <div className="tile">
              <dt>{t('Odak')}</dt>
              <dd className="fig">{plan.exercise.name}</dd>
            </div>
            <div className="tile tile--wide">
              <dt>{t('Program sırası')}</dt>
              <dd>{plan.splitNames.join(' · ')}</dd>
            </div>
          </dl>

          <p className="note">{plan.tip}</p>
        </>
      )
      break

    case 'save':
      cta = t('Hesap oluştur veya giriş yap')
      onCta = () => setAuth(true)
      secondary = (
        <button className="textbtn" onClick={next}>
          {t('Şimdilik geç')}
        </button>
      )
      body = (
        <>
          <div>
            <h1 tabIndex={-1}>{t('Planını kaydet.')}</h1>
            <p>
              {t('Hesap açarsan planın ve antrenmanların yedeklenir, telefon değiştirdiğinde geri gelir. Hesapsız da her şey çalışır.')}
            </p>
          </div>
        </>
      )
      break

    case 'premium':
      if (cloud.user) {
        cta = t('{0} gün ücretsiz dene', TRIAL_DAYS)
        canNext = !busy
        onCta = async () => {
          setBusy(true)
          const err = await startTrial()
          setBusy(false)
          toast(err ?? t('{0} günlük denemen başladı', TRIAL_DAYS))
          finish()
        }
        secondary = (
          <button className="btn btn--ghost btn--block" onClick={finish} disabled={busy}>
            {t('Ücretsiz devam et')}
          </button>
        )
      } else {
        // Hesap yokken deneme başlatılamaz: teklif bilgi olarak gösterilir.
        cta = t('Ücretsiz devam et')
        onCta = finish
      }
      body = (
        <>
          <div>
            <h1 tabIndex={-1}>{t('İstersen Premium\'u dene.')}</h1>
            <p>{t('Rank ve antrenman kaydı zaten ücretsiz. Premium şunları ekler:')}</p>
          </div>
          <ul className="card feats">
            <li>
              <Check aria-hidden="true" />
              {t('Hareket grafiklerinde tüm geçmiş (ücretsiz planda son')} {FREE_HISTORY_DAYS} {t('gün)')}
            </li>
            <li>
              <Check aria-hidden="true" />
              {t('Sınırsız özel program')}
            </li>
          </ul>
          <ol className="card ob__timeline" aria-label={t('Deneme nasıl işler')}>
            <li>
              <b>{t('Bugün')}</b>
              {cloud.user
                ? t('Denemeyi başlatırsın, Premium özellikleri açılır.')
                : t('Ücretsiz planla başlarsın: kayıt ve rank sınırsız.')}
            </li>
            <li>
              <b>{TRIAL_DAYS}{t('. gün')}</b>
              {t('Deneme biter. Kart istenmediği için ücret alınmaz.')}
            </li>
            <li>
              <b>{t('Sonra')}</b>
              {t('İstersen abone olursun. Olmazsan rank\'in ve kayıtların aynen kalır.')}
            </li>
          </ol>
          <p className="note">
            {cloud.user
              ? ''
              : cloudEnabled
                ? t('{0} günlük deneme hesap açınca başlar; Profil\'deki Premium bölümünden başlatabilirsin. ', TRIAL_DAYS)
                : t('Hesap ve ödeme bu sürümde henüz açık değil; fiyatlar bilgi içindir. ')}
            {t('Deneme kart istemez ve kendiliğinden ücrete dönmez. Sonrasında yıllık')}{' '}
            {formatPrice(price.yearly, price.currency)} {t('ya da aylık')}{' '}
            {formatPrice(price.monthly, price.currency)}.
          </p>
        </>
      )
      break
  }

  return (
    <main className="ob">
      {d.step !== 'building' && (
        <div className="ob__top">
          <button className="iconbtn" onClick={prev} aria-label={t('Geri')}>
            <ArrowLeft />
          </button>
          <div
            className="bar"
            role="progressbar"
            aria-label={t('Kurulum ilerlemesi')}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-valuenow={Math.round(progress * 100)}
          >
            <div className="bar__fill" style={{ width: `${progress * 100}%` }} />
          </div>
        </div>
      )}

      <div className="ob__body" key={d.step} ref={heading}>
        {body}
      </div>

      {d.step !== 'building' && (
        <div className="ob__foot">
          <button className="btn btn--primary btn--block" onClick={onCta} disabled={!canNext}>
            {cta}
          </button>
          {secondary}
        </div>
      )}
      {auth && <AuthSheet onClose={() => setAuth(false)} />}
    </main>
  )
}
