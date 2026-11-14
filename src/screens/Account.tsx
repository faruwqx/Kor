import { ArrowLeft, Check, ChevronRight, Cloud, Crown, LogOut, Trash2 } from 'lucide-react'
import { useMemo, useState } from 'react'
import {
  appleEnabled,
  checkout,
  checkoutEnabled,
  cloudEnabled,
  deleteAccount,
  dismissRecovery,
  sendPasswordReset,
  setNewPassword,
  signInEmail,
  signInWith,
  signOut,
  signUpEmail,
  startTrial,
  syncNow,
  useCloud,
} from '../lib/cloud'
import { FREE_HISTORY_DAYS, FREE_ROUTINES, isPremium } from '../lib/cloud-core'
import {
  TRIAL_DAYS,
  detectCountry,
  formatPrice,
  priceFor,
  yearlySaving,
  type Plan,
} from '../lib/pricing'
import { back, go } from '../lib/router'
import { Confirm, Sheet, toast } from '../ui/kit'
import { LegalLinks } from '../ui/Legal'
import { t } from '../lib/i18n'

const longDate = (iso: string) =>
  new Date(iso).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', year: 'numeric' })

/** Giriş ve kayıt: Google, Apple (açıksa) ve e-posta. */
export function AuthSheet({ onClose }: { onClose: () => void }) {
  const [mode, setMode] = useState<'in' | 'up' | 'reset'>('in')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [sent, setSent] = useState<string | null>(null)

  const emailOk = /^\S+@\S+\.\S+$/.test(email.trim())
  const valid = emailOk && (mode === 'reset' || password.length >= 8)

  const oauth = async (provider: 'google' | 'apple') => {
    setBusy(true)
    setError(null)
    // Başarılıysa tarayıcı sağlayıcının sayfasına gider; buraya yalnızca hata döner.
    const err = await signInWith(provider)
    if (err) {
      setError(err)
      setBusy(false)
    }
  }

  const submit = async () => {
    if (!valid || busy) return
    setBusy(true)
    setError(null)
    const mail = email.trim()
    if (mode === 'in') {
      const err = await signInEmail(mail, password)
      if (err) setError(err)
      else {
        toast(t('Giriş yapıldı'))
        onClose()
      }
    } else if (mode === 'up') {
      const res = await signUpEmail(mail, password)
      if (res.error) setError(res.error)
      else if (res.confirm) setSent(t('{0} adresine doğrulama bağlantısı gönderdik. Bağlantıya tıklayınca giriş yapılır.', mail))
      else {
        toast(t('Hesabın açıldı'))
        onClose()
      }
    } else {
      const err = await sendPasswordReset(mail)
      if (err) setError(err)
      else setSent(t('{0} kayıtlıysa şifre sıfırlama bağlantısı gönderildi.', mail))
    }
    setBusy(false)
  }

  const switchTo = (next: 'in' | 'up' | 'reset') => {
    setMode(next)
    setError(null)
  }

  if (sent)
    return (
      <Sheet title={t('E-postanı kontrol et')} onClose={onClose}>
        <p className="muted">{sent}</p>
        <div className="btnrow" style={{ marginTop: 8 }}>
          <button className="btn btn--primary" onClick={onClose}>
            {t('Tamam')}
          </button>
        </div>
      </Sheet>
    )

  return (
    <Sheet
      title={mode === 'in' ? t('Giriş yap') : mode === 'up' ? t('Hesap oluştur') : t('Şifreni sıfırla')}
      onClose={onClose}
    >
      {mode !== 'reset' && (
        <>
          <div className="authbtns">
            <button className="btn btn--ghost btn--block" disabled={busy} onClick={() => oauth('google')}>
              {t('Google ile devam et')}
            </button>
            {appleEnabled && (
              <button className="btn btn--ghost btn--block" disabled={busy} onClick={() => oauth('apple')}>
                {t('Apple ile devam et')}
              </button>
            )}
          </div>
          <div className="or" role="separator">
            {t('ya da e-postayla')}
          </div>
        </>
      )}

      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault()
          void submit()
        }}
      >
        <div>
          <label className="label" htmlFor="au-email">
            {t('E-posta')}
          </label>
          <input
            id="au-email"
            className="input"
            type="email"
            inputMode="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        {mode !== 'reset' && (
          <div>
            <label className="label" htmlFor="au-pass">
              {t('Şifre')}
            </label>
            <input
              id="au-pass"
              className="input"
              type="password"
              autoComplete={mode === 'up' ? 'new-password' : 'current-password'}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              minLength={8}
              required
              aria-describedby={mode === 'up' ? 'au-pass-hint' : undefined}
            />
            {mode === 'up' && (
              <p className="hint" id="au-pass-hint">
                {t('En az 8 karakter.')}
              </p>
            )}
          </div>
        )}

        {error && (
          <p className="formerror" role="alert">
            {error}
          </p>
        )}

        {mode !== 'reset' && (
          <LegalLinks
            lead={mode === 'up' ? t('Hesap oluşturarak') : t('Giriş yaparak')}
            ids={['terms', 'privacy', 'kvkk', 'consent']}
            tail={t('metinlerini kabul etmiş olursun.')}
          />
        )}
        <button className="btn btn--primary btn--block" disabled={!valid || busy}>
          {mode === 'in' ? t('Giriş yap') : mode === 'up' ? t('Hesap oluştur') : t('Bağlantı gönder')}
        </button>
      </form>

      <div className="authlinks">
        {mode === 'in' ? (
          <>
            <button className="textbtn" onClick={() => switchTo('up')}>
              {t('Hesabın yok mu? Oluştur')}
            </button>
            <button className="textbtn" onClick={() => switchTo('reset')}>
              {t('Şifremi unuttum')}
            </button>
          </>
        ) : (
          <button className="textbtn" onClick={() => switchTo('in')}>
            {t('Hesabın var mı? Giriş yap')}
          </button>
        )}
      </div>
    </Sheet>
  )
}

/** Şifre sıfırlama bağlantısından dönünce yeni şifreyi sorar. */
export function RecoverySheet() {
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  return (
    <Sheet title={t('Yeni şifre')} onClose={dismissRecovery}>
      <form
        className="form"
        onSubmit={async (e) => {
          e.preventDefault()
          if (password.length < 8 || busy) return
          setBusy(true)
          const err = await setNewPassword(password)
          setBusy(false)
          if (err) setError(err)
          else toast('Şifren değiştirildi')
        }}
      >
        <div>
          <label className="label" htmlFor="rc-pass">
            {t('Yeni şifre')}
          </label>
          <input
            id="rc-pass"
            className="input"
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            autoFocus
          />
          <p className="hint">{t('En az 8 karakter.')}</p>
        </div>
        {error && (
          <p className="formerror" role="alert">
            {error}
          </p>
        )}
        <button className="btn btn--primary btn--block" disabled={password.length < 8 || busy}>
          {t('Şifreyi kaydet')}
        </button>
      </form>
    </Sheet>
  )
}

/** Profil ekranındaki hesap bölümü. */
export function AccountSection() {
  const c = useCloud()
  const [auth, setAuth] = useState(false)
  const [del, setDel] = useState(false)
  const premium = isPremium(c.sub)

  // Premium girişi hesap olmasa da görünür: paketlere ve fiyatlara herkes bakabilsin.
  const premiumCard = (sub: string) => (
    <div className="card card--flush rows menu" style={{ padding: '4px 12px' }}>
      <button className="row" onClick={() => go('/premium')}>
        <Crown />
        <div className="row__main">
          <div>{t('Kor Premium')}</div>
          <div className="row__sub">{sub}</div>
        </div>
        <ChevronRight className="chev" />
      </button>
    </div>
  )

  if (!cloudEnabled)
    return (
      <>
        <div className="section">
          <h2>{t('Premium')}</h2>
        </div>
        {premiumCard(t('Paketlere ve fiyatlara bak'))}
      </>
    )

  if (!c.user)
    return (
      <>
        <div className="section">
          <h2>{t('Premium')}</h2>
        </div>
        {premiumCard(t('{0} gün ücretsiz dene', TRIAL_DAYS))}
        <div className="section">
          <h2>{t('Hesap')}</h2>
        </div>
        <div className="card">
          <h2>{t('Verini yedekle')}</h2>
          <p className="row__sub" style={{ whiteSpace: 'normal', margin: '4px 0 14px' }}>
            {t('Giriş yapınca antrenmanların hesabına yedeklenir ve telefon değiştirdiğinde geri gelir. Giriş yapmadan da her şey çalışır.')}
          </p>
          <button className="btn btn--primary btn--sm" onClick={() => setAuth(true)} disabled={!c.ready}>
            {t('Giriş yap veya hesap oluştur')}
          </button>
        </div>
        {auth && <AuthSheet onClose={() => setAuth(false)} />}
      </>
    )

  const syncText =
    c.sync === 'syncing'
      ? t('Eşitleniyor…')
      : c.sync === 'error'
        ? t('Eşitlenemedi. Dokun, tekrar dene.')
        : c.syncedAt
          ? t('Yedek güncel')
          : t('Yedekleme açık')

  return (
    <>
      <div className="section">
        <h2>{t('Hesap')}</h2>
      </div>
      <div className="card card--flush rows menu" style={{ padding: '4px 12px' }}>
        <button className="row" onClick={() => void syncNow()}>
          <Cloud />
          <div className="row__main">
            <div>{c.user.email || t('Hesabın')}</div>
            <div className="row__sub" role="status">
              {syncText}
            </div>
          </div>
        </button>
        <button className="row" onClick={() => go('/premium')}>
          <Crown />
          <div className="row__main">
            <div>{t('Premium')}</div>
            <div className="row__sub">
              {premium
                ? c.sub!.status === 'trialing'
                  ? t('Deneme {0} günü biter', longDate(c.sub!.current_period_end))
                  : t('Etkin, {0} tarihine kadar', longDate(c.sub!.current_period_end))
                : t('Ücretsiz plandasın')}
            </div>
          </div>
          <ChevronRight className="chev" />
        </button>
        <button
          className="row"
          onClick={async () => {
            await signOut()
            toast('Çıkış yapıldı')
          }}
        >
          <LogOut />
          <span className="row__main">{t('Çıkış yap')}</span>
        </button>
        <button className="row row--danger" onClick={() => setDel(true)}>
          <Trash2 />
          <span className="row__main">{t('Hesabı sil')}</span>
        </button>
      </div>
      {del && (
        <Confirm
          title={t('Hesap silinsin mi?')}
          body={t('Hesabın ve sunucudaki yedeğin kalıcı olarak silinir. Bu cihazdaki antrenmanların durur. Etkin bir aboneliğin varsa önce onu iptal et.')}
          confirm={t('Hesabı sil')}
          danger
          onConfirm={async () => {
            const err = await deleteAccount()
            toast(err ?? 'Hesabın silindi')
          }}
          onClose={() => setDel(false)}
        />
      )}
    </>
  )
}

const INCLUDED = () => [
  t('Hareket grafiklerinde tüm geçmiş: 6 ay, 1 yıl, hepsi (ücretsiz planda son {0} gün)', FREE_HISTORY_DAYS),
  t('Sınırsız özel program (ücretsiz planda toplam {0} program)', FREE_ROUTINES),
]
const COMING = () => [
  t('Kas grubu dengesi ve ihmal uyarısı'),
  t('Otomatik ilerleme: sıradaki antrenman için kilo ve tekrar önerisi'),
  t('Toparlanma skoru'),
  t('Özel ligler ve rakip karşılaştırması'),
  t('Temalar, rozetler ve rank kartı şablonları'),
]
const FREE = () => [
  t('Sınırsız antrenman kaydı'),
  t('Rank sistemi ve kişisel rekorlar'),
  t('Hazır programlar'),
  t('Hesabına yedekleme'),
]

export function Premium() {
  const c = useCloud()
  const price = useMemo(() => priceFor(detectCountry()), [])
  const [plan, setPlan] = useState<Plan>('yearly')
  const [auth, setAuth] = useState(false)
  const [busy, setBusy] = useState(false)
  const premium = isPremium(c.sub)
  const trialLeft = !c.sub
  const saving = yearlySaving(price)

  const trial = async () => {
    setBusy(true)
    const err = await startTrial()
    setBusy(false)
    toast(err ?? t('{0} günlük denemen başladı', TRIAL_DAYS))
  }

  const buy = () => {
    if (!checkout(plan, price))
      toast(checkoutEnabled ? t('Önce giriş yap') : t('Ödeme henüz açılmadı. Yakında.'))
  }

  return (
    <>
      <div className="topbar">
        <button className="iconbtn" onClick={() => back('/profile')} aria-label={t('Geri')}>
          <ArrowLeft />
        </button>
      </div>

      <header className="head">
        <div>
          <h1>{t('Kor Premium')}</h1>
          <p>{t('Rank ve antrenman kaydı herkese ücretsiz. Premium derinlik ve kolaylık ekler; rank satılmaz.')}</p>
        </div>
      </header>

      {premium && (
        <div className="card">
          <h2>{c.sub!.status === 'trialing' ? t('Deneme sürüyor') : t('Premium etkin')}</h2>
          <p className="row__sub" style={{ whiteSpace: 'normal', marginTop: 4 }}>
            {c.sub!.status === 'trialing'
              ? t('{0} günü biter. Devam etmek için bir paket seç.', longDate(c.sub!.current_period_end))
              : t('{0} tarihine kadar geçerli.', longDate(c.sub!.current_period_end))}
          </p>
        </div>
      )}

      <div className="plans" role="group" aria-label={t('Paket')}>
        <button className="plan" aria-pressed={plan === 'yearly'} onClick={() => setPlan('yearly')}>
          <span className="plan__name">
            {t('Yıllık')} <span className="plan__tag">%{saving} {t('indirim')}</span>
          </span>
          <span className="fig plan__price">{formatPrice(price.yearly, price.currency)}</span>
          <span className="plan__sub">{t('ayda')} {formatPrice(price.yearly / 12, price.currency)}</span>
        </button>
        <button className="plan" aria-pressed={plan === 'monthly'} onClick={() => setPlan('monthly')}>
          <span className="plan__name">{t('Aylık')}</span>
          <span className="fig plan__price">{formatPrice(price.monthly, price.currency)}</span>
          <span className="plan__sub">{t('her ay')}</span>
        </button>
      </div>

      {!cloudEnabled ? (
        <p className="note">{t('Hesap ve ödeme bu sürümde henüz açık değil.')}</p>
      ) : !c.user ? (
        <button className="btn btn--primary btn--block" onClick={() => setAuth(true)} disabled={!c.ready}>
          {t('Giriş yap ve')} {TRIAL_DAYS} {t('gün ücretsiz dene')}
        </button>
      ) : (
        <div className="authbtns">
          {trialLeft && (
            <button className="btn btn--primary btn--block" onClick={trial} disabled={busy}>
              {TRIAL_DAYS} {t('gün ücretsiz dene')}
            </button>
          )}
          {(!premium || c.sub!.status === 'trialing') && (
            <button
              className={'btn btn--block ' + (trialLeft ? 'btn--ghost' : 'btn--primary')}
              onClick={buy}
            >
              {plan === 'yearly' ? t('Yıllık pakete geç') : t('Aylık pakete geç')}
            </button>
          )}
        </div>
      )}
      <LegalLinks
        lead={t('Denemeyi başlatarak ya da satın alarak')}
        ids={['subscription', 'terms']}
        tail={t('metinlerini kabul etmiş olursun.')}
      />
      <p className="note">
        {t('Deneme için kart gerekmez ve kendiliğinden ücrete dönmez. Fiyat bölgene göre gösterilir; kesin tutar ödeme sayfasında, fatura ülkene göre belirlenir.')}
      </p>

      <div className="section">
        <h2>{t('Premium\'da')}</h2>
      </div>
      <ul className="card feats">
        {INCLUDED().map((f) => (
          <li key={f}>
            <Check aria-hidden="true" />
            {f}
          </li>
        ))}
      </ul>

      <div className="section">
        <h2>{t('Yolda')}</h2>
      </div>
      <ul className="card feats feats--soon">
        {COMING().map((f) => (
          <li key={f}>{f}</li>
        ))}
      </ul>
      <p className="note">{t('Bunlar henüz yok; çıktıkça Premium\'a eklenecek.')}</p>

      <div className="section">
        <h2>{t('Her zaman ücretsiz')}</h2>
      </div>
      <ul className="card feats">
        {FREE().map((f) => (
          <li key={f}>
            <Check aria-hidden="true" />
            {f}
          </li>
        ))}
      </ul>

      {auth && <AuthSheet onClose={() => setAuth(false)} />}
    </>
  )
}
