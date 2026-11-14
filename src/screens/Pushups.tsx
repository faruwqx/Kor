import { ArrowLeft, Camera, Lock, Ruler, Smartphone, Swords, Users } from 'lucide-react'
import { useEffect, useMemo, useRef, useState } from 'react'
import { cloudEnabled } from '../lib/cloud'
import { beep, primeSound } from '../lib/beep'
import { openDuel, isCode, newRoomCode, normalizeCode, type Duel, type Peer } from '../lib/duel'
import { relDay } from '../lib/format'
import { fmtShort } from '../lib/units'
import { useNow } from '../lib/hooks'
import { PUSH_COUNTDOWN, PUSH_SECONDS, pushBoard, pushRp } from '../lib/pushRank'
import { rankFromRp } from '../lib/rank'
import { back } from '../lib/router'
import { actions, useApp } from '../lib/store'
import { Emblem } from '../ui/Emblem'
import { Confetti, toast } from '../ui/kit'
import { PushCam } from '../ui/PushCam'
import { t } from '../lib/i18n'

type Phase = 'home' | 'setup' | 'live' | 'done'
type Net = 'connecting' | 'open' | 'error'

export function Pushups() {
  const s = useApp()
  const sex = s.profile?.sex ?? 'm'
  const myName = s.profile?.name.trim() || t('Sporcu')
  const board = pushBoard(s.pushups, sex)

  const [phase, setPhase] = useState<Phase>('home')
  const [mode, setMode] = useState<'solo' | 'duel'>('solo')
  const [camReady, setCamReady] = useState(false)
  const [reps, setReps] = useState(0)
  const [startAt, setStartAt] = useState(0)
  const [saved, setSaved] = useState<{ reps: number; best: boolean } | null>(null)

  // Düello
  const meId = useMemo(() => crypto.randomUUID(), [])
  const [code, setCode] = useState('')
  const [host, setHost] = useState(false)
  const [joinText, setJoinText] = useState('')
  const [net, setNet] = useState<Net | null>(null)
  const [peer, setPeer] = useState<Peer | null>(null)
  const [peerReps, setPeerReps] = useState(0)
  const [peerFinal, setPeerFinal] = useState(false)
  const duel = useRef<Duel | null>(null)
  const bestBefore = useRef(0)

  const now = useNow(phase === 'live' || (phase === 'done' && !saved), 200)
  const endAt = startAt + PUSH_SECONDS * 1000
  const counting = phase === 'live' && now >= startAt && now < endAt
  const countdown = phase === 'live' && now < startAt ? Math.ceil((startAt - now) / 1000) : 0
  const left = Math.max(0, Math.ceil((endAt - now) / 1000))

  const begin = () => {
    bestBefore.current = board.best?.reps ?? 0
    setReps(0)
    setPeerReps(0)
    setPeerFinal(false)
    setSaved(null)
    setStartAt(Date.now() + PUSH_COUNTDOWN * 1000)
    setPhase('live')
  }
  const beginRef = useRef(begin)
  useEffect(() => {
    beginRef.current = begin
  })

  const closeDuel = () => {
    duel.current?.close()
    duel.current = null
    setNet(null)
    setPeer(null)
    setCode('')
  }

  const connect = (room: string, asHost: boolean) => {
    primeSound()
    closeDuel()
    const d = openDuel(room, { id: meId, name: myName, rp: board.rank?.rp ?? 0 }, {
      onStatus: setNet,
      onPeer: (p) => setPeer(p),
      onStart: () => beginRef.current(),
      onScore: (_id, n, final) => {
        setPeerReps(n)
        if (final) setPeerFinal(true)
      },
      onLeave: () => {
        setPeer(null)
        toast(t('Rakip ayrıldı'))
      },
    })
    if (!d) {
      toast(t('Düello bağlantısı açılamadı'))
      return
    }
    duel.current = d
    setCode(room)
    setHost(asHost)
    setMode('duel')
    setPhase('setup')
  }

  // Ekran açıkken kapanmasın (destekleyen tarayıcılarda).
  useEffect(() => {
    if (phase !== 'setup' && phase !== 'live') return
    let lock: WakeLockSentinel | null = null
    navigator.wakeLock
      ?.request('screen')
      .then((l) => (lock = l))
      .catch(() => undefined)
    return () => void lock?.release().catch(() => undefined)
  }, [phase])

  // Sayfadan çıkınca kanalı kapat.
  useEffect(() => () => duel.current?.close(), [])

  // Geri sayım ve bitiş sesleri.
  const lastBeep = useRef(-1)
  useEffect(() => {
    if (phase !== 'live') return
    const mark = countdown > 0 ? countdown : counting ? 0 : -2
    if (mark === lastBeep.current) return
    lastBeep.current = mark
    if ((mark >= 1 && mark <= 3) || mark === 0) beep()
  }, [phase, countdown, counting])

  // Süre doldu: sonucu gönder, sonuç ekranına geç.
  useEffect(() => {
    if (phase === 'live' && now >= endAt && startAt > 0) {
      beep()
      duel.current?.score(reps, true)
      setPhase('done')
    }
  }, [phase, now, endAt, startAt, reps])

  // Kaydet: tek başına hemen; düelloda rakibin son sayısı gelince ya da 5 sn sonra.
  useEffect(() => {
    if (phase !== 'done' || saved) return
    if (mode === 'duel' && !peerFinal && now < endAt + 5000) return
    actions.addPushup({
      reps,
      seconds: PUSH_SECONDS,
      mode,
      ...(mode === 'duel' && peer ? { opponent: peer.name, opponentReps: peerReps } : {}),
    })
    setSaved({ reps, best: reps > bestBefore.current && bestBefore.current > 0 })
  }, [phase, saved, mode, peerFinal, now, endAt, reps, peer, peerReps])

  const onReps = (n: number) => {
    setReps(n)
    duel.current?.score(n, false)
  }

  const leave = () => {
    closeDuel()
    setPhase('home')
    setCamReady(false)
  }

  // ---------- Kamera aşamaları ----------
  if (phase === 'setup' || phase === 'live') {
    const duelOn = mode === 'duel'
    return (
      <>
        <div className="topbar">
          <button className="iconbtn" onClick={leave} aria-label={t('Çık')}>
            <ArrowLeft />
          </button>
          <span className="topbar__title">{duelOn ? t('Düello · {0}', code) : t('Tek başına · 60 sn')}</span>
        </div>

        {duelOn && (
          <div className="duelbar" aria-live="polite">
            <div>
              <div className="duelbar__name">{myName}</div>
              <div className="fig duelbar__n">{reps}</div>
            </div>
            <span className="duelbar__vs">{t('vs')}</span>
            <div>
              <div className="duelbar__name">{peer?.name ?? t('Rakip bekleniyor')}</div>
              <div className="fig duelbar__n">{peer ? peerReps : '–'}</div>
            </div>
          </div>
        )}

        <PushCam counting={counting} onReps={onReps} onReady={setCamReady}>
          {phase === 'live' && countdown > 0 && (
            <div className="pcam__big fig" key={countdown}>
              {countdown}
            </div>
          )}
          {phase === 'live' && countdown === 0 && (
            <>
              <div className="pcam__count fig">{reps}</div>
              <div className="pcam__time fig">{left} {t('sn')}</div>
            </>
          )}
        </PushCam>

        {phase === 'setup' && !duelOn && (
          <>
            <p className="note">
              {t('Başlat\'a dokun,')} {PUSH_COUNTDOWN} {t('saniyede şınav pozisyonuna geç. Süre')} {PUSH_SECONDS}{' '}
              {t('saniye; yalnızca gövde düz ve tam inip kalkılan tekrarlar sayılır.')}
            </p>
            <button
              className="btn btn--primary btn--block"
              disabled={!camReady}
              onClick={() => {
                primeSound()
                begin()
              }}
            >
              {camReady ? t('Başlat') : t('Kamera hazırlanıyor…')}
            </button>
          </>
        )}

        {phase === 'setup' && duelOn && (
          <section className="card room">
            <div className="kpi__label">{t('Oda kodu')}</div>
            <div className="fig room__code">{code}</div>
            <p className="row__sub" style={{ whiteSpace: 'normal' }}>
              {net === 'error'
                ? t('Bağlantı kurulamadı. İnternetini kontrol edip yeniden dene.')
                : net !== 'open'
                  ? t('Bağlanıyor…')
                  : peer
                    ? t('{0} odada. {1}', peer.name, host ? t('Hazır olunca başlat.') : t('Ev sahibinin başlatması bekleniyor.'))
                    : t('Rakibin bu kodu girsin. Görüntün gitmez, yalnızca şınav sayın paylaşılır.')}
            </p>
            {host && (
              <button
                className="btn btn--primary btn--block"
                style={{ marginTop: 12 }}
                disabled={!peer || !camReady || net !== 'open'}
                onClick={() => {
                  duel.current?.start()
                  begin()
                }}
              >
                {!camReady ? t('Kamera hazırlanıyor…') : peer ? t('Düelloyu başlat') : t('Rakip bekleniyor')}
              </button>
            )}
          </section>
        )}
      </>
    )
  }

  // ---------- Sonuç ----------
  if (phase === 'done') {
    const rank = rankFromRp(pushRp(reps, sex))
    const duelOn = mode === 'duel' && peer
    const verdict = !duelOn
      ? null
      : reps > peerReps
        ? t('Kazandın')
        : reps < peerReps
          ? t('Kaybettin')
          : t('Berabere')
    return (
      <>
        <div className="topbar">
          <button className="iconbtn" onClick={leave} aria-label={t('Kapat')}>
            <ArrowLeft />
          </button>
        </div>
        <section className="pr-hero" aria-label={t('Sonuç')}>
          {(saved?.best || verdict === 'Kazandın') && (
            <Confetti colors={['#ff5a1f', '#ffab00', '#10b8a6', '#f0389b', rank.color]} />
          )}
          <Emblem rank={rank} size={76} />
          <div className="fig pr-hero__title">
            {verdict ?? (saved?.best ? t('Yeni rekor!') : t('{0} şınav', reps))}
          </div>
          <p className="pr-hero__sub">
            {duelOn
              ? `${myName} ${reps} – ${peerReps} ${peer.name}${peerFinal ? '' : t(' (rakibin son bildirdiği sayı)')}`
              : t('{0} saniyede {1} temiz şınav · {2}', PUSH_SECONDS, reps, rank.label)}
          </p>
        </section>
        {!saved && <p className="note">{t('Rakibin sonucu bekleniyor…')}</p>}
        <div className="btnrow">
          <button className="btn btn--ghost" onClick={leave}>
            {t('Bitti')}
          </button>
          {mode === 'solo' && (
            <button
              className="btn btn--primary"
              onClick={() => {
                setCamReady(false)
                setPhase('setup')
              }}
            >
              {t('Tekrar')}
            </button>
          )}
        </div>
      </>
    )
  }

  // ---------- Ana ekran ----------
  const recent = [...(s.pushups ?? [])].reverse().slice(0, 5)
  return (
    <>
      <div className="topbar">
        <button className="iconbtn" onClick={() => back('/leaderboard')} aria-label={t('Geri')}>
          <ArrowLeft />
        </button>
      </div>
      <header className="head">
        <div>
          <h1>{t('Şınav düellosu')}</h1>
          <p>{t('Kamera şınavlarını sayar. Görüntü telefonundan çıkmaz.')}</p>
        </div>
      </header>

      <section
        className="card card--tint"
        style={{ ['--tint' as string]: board.rank?.color ?? 'var(--control)' }}
        aria-label={t('Şınav rank\'i')}
      >
        <div className="rankhero">
          <Emblem rank={board.rank} size={64} />
          <div className="rankhero__body">
            <div className="fig rankhero__label">{board.rank?.label ?? t('Rank yok')}</div>
            <div className="rankhero__rp">
              {t('Şınav rank\'i · kuvvet rank\'inden ayrı')}
              {board.best ? t(' · en iyi {0} şınav / {1} sn', board.best.reps, PUSH_SECONDS) : ''}
            </div>
          </div>
        </div>
        <p className="note" style={{ marginTop: 12 }}>
          {board.nextReps != null
            ? t('Sonraki basamak için {0} saniyede {1} şınav.', PUSH_SECONDS, board.nextReps)
            : t('Kor: en üst kademedesin.')}
          {board.duels.played > 0 && t(' Düellolar: {0} galibiyet / {1}.', board.duels.won, board.duels.played)}
        </p>
      </section>

      <ul className="card setup">
        <li>
          <Smartphone aria-hidden="true" />
          {t('Telefonu yere, yanına yaklaşık')} {fmtShort(1)} {t('uzağa koy; ekran sana dönük, yatay dursun.')}
        </li>
        <li>
          <Ruler aria-hidden="true" />
          {t('Kameraya yan profilden görün: baştan ayağa kadrajda ol, telefonla aynı seviyede.')}
        </li>
        <li>
          <Camera aria-hidden="true" />
          {t('Sayılan: gövde düz, dirsek 90°\'nin altına inip kollar tam açılarak kalkan tekrar.')}
        </li>
        <li>
          <Lock aria-hidden="true" />
          {t('Sayım telefonunda yapılır. Düelloda rakibe yalnızca adın ve şınav sayın gider.')}
        </li>
      </ul>

      <button
        className="btn btn--primary btn--block"
        onClick={() => {
          setMode('solo')
          setPhase('setup')
        }}
      >
        {t('Tek başına başla (')}{PUSH_SECONDS} {t('sn)')}
      </button>

      <div className="section">
        <h2>{t('Canlı düello')}</h2>
      </div>
      {cloudEnabled ? (
        <div className="card duelstart">
          <button className="btn btn--ghost btn--block" onClick={() => connect(newRoomCode(), true)}>
            <Swords aria-hidden="true" /> {t('Oda oluştur')}
          </button>
          <form
            className="duelstart__join"
            onSubmit={(e) => {
              e.preventDefault()
              const c = normalizeCode(joinText)
              if (isCode(c)) connect(c, false)
              else toast('Oda kodu 6 karakter')
            }}
          >
            <input
              className="input"
              value={joinText}
              onChange={(e) => setJoinText(normalizeCode(e.target.value))}
              placeholder={t('ODA KODU')}
              aria-label={t('Oda kodu')}
              autoCapitalize="characters"
              autoComplete="off"
              inputMode="text"
            />
            <button className="btn btn--primary" disabled={!isCode(joinText)}>
              <Users aria-hidden="true" /> {t('Katıl')}
            </button>
          </form>
        </div>
      ) : (
        <p className="empty">
          {t('Canlı düello, hesap ve sunucu bağlantısı (Supabase) açılınca çalışır. Şimdilik tek başına oynayıp şınav rank\'ini yükseltebilirsin.')}
        </p>
      )}

      {recent.length > 0 && (
        <>
          <div className="section">
            <h2>{t('Son seanslar')}</h2>
          </div>
          <div className="card card--flush rows">
            {recent.map((r) => (
              <div className="row" key={r.id}>
                <div className="row__main">
                  <div className="row__title">
                    {r.mode === 'duel' ? t('Düello · {0}', r.opponent ?? t('Rakip')) : t('Tek başına')}
                  </div>
                  <div className="row__sub">{relDay(r.at)}</div>
                </div>
                <div className="row__end">
                  <div className="fig">
                    {r.reps}
                    {r.opponentReps != null && <span className="unit">– {r.opponentReps}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </>
      )}
    </>
  )
}
