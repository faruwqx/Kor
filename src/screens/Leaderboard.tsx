import { ArrowLeft, Swords } from 'lucide-react'
import { useEffect, useState } from 'react'
import {
  cloudEnabled,
  fetchLeaderboard,
  leaveLeaderboard,
  publishScore,
  useCloud,
} from '../lib/cloud'
import { int } from '../lib/format'
import { useBoard } from '../lib/hooks'
import { SAMPLE_BOARD, placeBoard, type BoardEntry } from '../lib/leaderboard'
import { rankFromRp } from '../lib/rank'
import { back, go } from '../lib/router'
import { actions, useApp } from '../lib/store'
import { Emblem } from '../ui/Emblem'
import { toast } from '../ui/kit'
import { AuthSheet } from './Account'
import { t } from '../lib/i18n'

export function Leaderboard() {
  const s = useApp()
  const c = useCloud()
  const board = useBoard(s)
  const myRp = board.overall?.rp ?? null
  const myName = s.profile?.name.trim() || t('Sen')
  const userId = c.user?.id ?? null
  const live = cloudEnabled && userId != null
  const joined = s.settings.leaderboard === true

  const [remote, setRemote] = useState<BoardEntry[] | null>(null)
  const [failed, setFailed] = useState(false)
  const [auth, setAuth] = useState(false)
  const [busy, setBusy] = useState(false)

  // Giriş yapılmışsa: katıldıysan önce kendi puanını gönder, sonra listeyi oku.
  useEffect(() => {
    if (!userId) return
    let off = false
    void (async () => {
      if (joined && myRp != null) await publishScore(myName, myRp)
      const rows = await fetchLeaderboard()
      if (off) return
      setFailed(rows == null)
      setRemote(
        rows?.map((r) => ({ id: r.user_id, name: r.name, rp: r.rp, me: r.user_id === userId })) ??
          null,
      )
    })()
    return () => {
      off = true
    }
  }, [userId, joined, myRp, myName])

  const { rows, mine } = live
    ? placeBoard(remote ?? [], null)
    : placeBoard(SAMPLE_BOARD, myRp != null ? { name: myName, rp: myRp } : null)
  const loading = live && remote == null && !failed

  let finding: string
  if (loading) finding = t('Sıralama yükleniyor.')
  else if (live && failed) finding = t('Sıralama şu an okunamadı. İnternetini kontrol edip tekrar dene.')
  else if (mine)
    finding = live
      ? t('{0} sporcu arasında {1}. sıradasın.', int(rows.length), mine.place)
      : t('Örnek listede {0}. sıraya denk geliyorsun.', mine.place)
  else if (myRp == null)
    finding = t('Rank\'li bir hareket kaydet, listeye genel rank\'inle girersin.')
  else finding = t('Katılırsan genel rank\'inle listede görünürsün.')

  const join = async () => {
    setBusy(true)
    const err = myRp != null ? await publishScore(myName, myRp) : null
    setBusy(false)
    if (err) toast(err)
    else {
      actions.updateSettings({ leaderboard: true })
      toast(t('Sıralamaya katıldın'))
    }
  }

  const leave = async () => {
    setBusy(true)
    const err = await leaveLeaderboard()
    setBusy(false)
    if (err) toast(err)
    else {
      actions.updateSettings({ leaderboard: false })
      toast(t('Sıralamadan çıktın'))
    }
  }

  return (
    <>
      <div className="topbar">
        <button className="iconbtn" onClick={() => back('/rank')} aria-label={t('Geri')}>
          <ArrowLeft />
        </button>
        <span className="topbar__title">{live ? t('Genel rank') : t('Örnek sıralama')}</span>
      </div>

      <header className="head">
        <div>
          <h1>{t('Sıralama')}</h1>
          <p role="status">{finding}</p>
        </div>
      </header>

      <button className="gen" onClick={() => go('/pushup')}>
        <Swords aria-hidden="true" />
        <span className="gen__title">{t('Şınav düellosu')}</span>
        <span className="gen__sub">{t('Kamera sayar, canlı rakibe karşı · ayrı şınav rank\'i')}</span>
      </button>

      {!live && (
        <div className="card">
          <h2>{t('Bu bir örnek liste')}</h2>
          <p className="row__sub" style={{ whiteSpace: 'normal', margin: '4px 0 0' }}>
            {t('Buradaki adlar gerçek kişiler değil; sıralamanın nasıl görüneceğini gösterir. Senin satırın gerçek genel rank\'inle yerleştirilir.')}{' '}
            {cloudEnabled
              ? t('Gerçek sıralamayı görmek için giriş yap.')
              : t('Gerçek sıralama hesap özelliği açılınca çalışır.')}
          </p>
          {cloudEnabled && (
            <button
              className="btn btn--primary btn--sm"
              style={{ marginTop: 14 }}
              onClick={() => setAuth(true)}
              disabled={!c.ready}
            >
              {t('Giriş yap veya hesap oluştur')}
            </button>
          )}
        </div>
      )}

      {live && !joined && (
        <div className="card">
          <h2>{t('Sıralamaya katıl')}</h2>
          <p className="row__sub" style={{ whiteSpace: 'normal', margin: '4px 0 14px' }}>
            {t('Katılırsan adın (')}{myName}{t(') ve genel RP\'n giriş yapmış diğer kullanıcılara görünür. Antrenmanların ve kilon görünmez. İstediğin zaman çıkabilirsin.')}
          </p>
          <button className="btn btn--primary btn--sm" onClick={join} disabled={busy}>
            {t('Katıl')}
          </button>
        </div>
      )}

      {rows.length > 0 ? (
        <ol className="card card--flush rows lb">
          {rows.map((e) => {
            const r = rankFromRp(e.rp)
            return (
              <li key={e.id} className={'row' + (e.me ? ' lb__me' : '')}>
                <span className="fig lb__place">{e.place}</span>
                <Emblem rank={r} size={32} />
                <div className="row__main">
                  <div className="row__title">
                    {e.name}
                    {e.me && <span className="here">{t('Sen')}</span>}
                  </div>
                  <div className="row__sub">{r.label}</div>
                </div>
                <span className="fig">
                  {int(e.rp)}
                  <span className="unit">{t('RP')}</span>
                </span>
              </li>
            )
          })}
        </ol>
      ) : (
        !loading && <p className="empty">{t('Henüz kimse katılmadı. İlk sen ol.')}</p>
      )}

      <p className="note">
        {t('Sıralama genel rank\'e göredir: sıralanmış kas gruplarının RP ortalaması. Rank satın alınamaz; yalnızca kaldırdığın kiloyla değişir.')}
      </p>

      {live && joined && (
        <div style={{ textAlign: 'center' }}>
          <button className="textbtn" onClick={leave} disabled={busy}>
            {t('Sıralamadan çık')}
          </button>
        </div>
      )}

      {auth && <AuthSheet onClose={() => setAuth(false)} />}
    </>
  )
}
