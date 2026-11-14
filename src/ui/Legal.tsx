import { ArrowLeft, ChevronRight } from 'lucide-react'
import { Fragment, useState } from 'react'
import {
  LEGAL_EFFECTIVE,
  LEGAL_VERSION,
  legalDoc,
  legalDocs,
  type LegalDoc,
  type LegalId,
} from '../lib/legal'
import { back, go } from '../lib/router'
import { Sheet } from './kit'
import { t } from '../lib/i18n'

function DocBody({ doc, level }: { doc: LegalDoc; level: 'h2' | 'h3' }) {
  const H = level
  return (
    <div className="legal">
      <p className="note">
        {t('Yürürlük:')} {LEGAL_EFFECTIVE} {t('· Sürüm')} {LEGAL_VERSION}
      </p>
      {doc.sections.map((s) => (
        <section key={s.h}>
          <H>{s.h}</H>
          {s.p.map((para, i) => (
            <p key={i}>{para}</p>
          ))}
        </section>
      ))}
    </div>
  )
}

/** Bulunduğu ekrandan ayrılmadan tek bir metni gösterir (kurulum ve hesap formu için). */
export function LegalSheet({ id, onClose }: { id: LegalId; onClose: () => void }) {
  const doc = legalDoc(id)
  if (!doc) return null
  return (
    <Sheet title={doc.title} onClose={onClose}>
      <DocBody doc={doc} level="h3" />
    </Sheet>
  )
}

/**
 * Kabul cümlesi: "Devam ederek X, Y ve Z metinlerini kabul etmiş olursun."
 * Okumak isteğe bağlıdır; her ad, metni alttan açılan pencerede gösterir.
 */
export function LegalLinks({ lead, ids, tail }: { lead: string; ids: LegalId[]; tail: string }) {
  const [open, setOpen] = useState<LegalId | null>(null)
  return (
    <>
      <p className="legalline">
        {lead}{' '}
        {ids.map((id, i) => (
          <Fragment key={id}>
            {i > 0 && (i === ids.length - 1 ? ' ve ' : ', ')}
            <button type="button" className="legalline__a" onClick={() => setOpen(id)}>
              {legalDoc(id)?.title}
            </button>
          </Fragment>
        ))}{' '}
        {tail}
      </p>
      {open && <LegalSheet id={open} onClose={() => setOpen(null)} />}
    </>
  )
}

/** Yasal ekranı: #/legal metin listesi, #/legal/<id> tek metin. */
export function Legal({ id }: { id?: string }) {
  const doc = legalDoc(id)
  if (doc)
    return (
      <>
        <div className="topbar">
          <button className="iconbtn" onClick={() => back('/legal')} aria-label={t('Geri')}>
            <ArrowLeft />
          </button>
          <span className="topbar__title">{t('Yasal')}</span>
        </div>
        <header className="head">
          <div>
            <h1>{doc.title}</h1>
            <p>{doc.summary}</p>
          </div>
        </header>
        <div className="card">
          <DocBody doc={doc} level="h2" />
        </div>
      </>
    )

  return (
    <>
      <div className="topbar">
        <button className="iconbtn" onClick={() => back('/profile')} aria-label={t('Geri')}>
          <ArrowLeft />
        </button>
        <span className="topbar__title">{t('Yasal')}</span>
      </div>
      <header className="head">
        <div>
          <h1>{t('Sözleşmeler ve gizlilik')}</h1>
          <p>
            {t('Okumak zorunda değilsin; istediğin metni istediğin zaman buradan açabilirsin. Kor’u kullanarak bu metinleri kabul etmiş olursun.')}
          </p>
        </div>
      </header>
      <div className="card card--flush rows">
        {legalDocs().map((d) => (
          <button className="row" key={d.id} onClick={() => go('/legal/' + d.id)}>
            <div className="row__main">
              <div className="row__title">{d.title}</div>
              <div className="row__sub" style={{ whiteSpace: 'normal' }}>
                {d.summary}
              </div>
            </div>
            <ChevronRight aria-hidden="true" />
          </button>
        ))}
      </div>
      <p className="note">
        {t('Yürürlük:')} {LEGAL_EFFECTIVE} {t('· Sürüm')} {LEGAL_VERSION}
      </p>
    </>
  )
}
