import { Minus, Plus } from 'lucide-react'
import { useEffect, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { int } from '../lib/format'
import type { Rank } from '../lib/rank'
import { t } from '../lib/i18n'

export function Sheet({
  title,
  onClose,
  children,
  full,
  action,
}: {
  title?: string
  onClose: () => void
  children: ReactNode
  full?: boolean
  action?: ReactNode
}) {
  const ref = useRef<HTMLDivElement>(null)
  // onClose her çizimde yeni bir fonksiyon olabilir (üst ekran saniyede iki kez
  // yeniden çizilir). Ref'te tutulur ki sayfa yalnızca açılırken odak alsın ve
  // içindeki giriş alanından odağı çalmasın.
  const close = useRef(onClose)
  useEffect(() => {
    close.current = onClose
  })
  useEffect(() => {
    const prev = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && close.current()
    // Klavye açılınca odaklanan giriş görünür kalsın.
    const onFocus = (e: FocusEvent) => {
      const el = e.target as HTMLElement | null
      if (el && ref.current?.contains(el))
        setTimeout(() => el.scrollIntoView({ block: 'center', behavior: 'smooth' }), 60)
    }
    window.addEventListener('keydown', onKey)
    window.addEventListener('focusin', onFocus)
    if (!ref.current?.contains(document.activeElement)) ref.current?.focus()
    return () => {
      document.body.style.overflow = prev
      window.removeEventListener('keydown', onKey)
      window.removeEventListener('focusin', onFocus)
    }
  }, [])
  return createPortal(
    <div className="scrim" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <div
        className={'sheet' + (full ? ' sheet--full' : '')}
        role="dialog"
        aria-modal="true"
        aria-label={title}
        tabIndex={-1}
        ref={ref}
        style={{ outline: 'none' }}
      >
        {(title || action) && (
          <div className="sheet__head">
            <h2>{title}</h2>
            {action}
          </div>
        )}
        {full ? children : <div className="sheet__body">{children}</div>}
      </div>
    </div>,
    document.body,
  )
}

export function Confirm({
  title,
  body,
  confirm,
  danger,
  onConfirm,
  onClose,
}: {
  title: string
  body?: string
  confirm: string
  danger?: boolean
  onConfirm: () => void
  onClose: () => void
}) {
  return (
    <Sheet title={title} onClose={onClose}>
      {body && <p className="muted">{body}</p>}
      <div className="btnrow" style={{ marginTop: 8 }}>
        <button className="btn btn--ghost" onClick={onClose}>
          {t('Vazgeç')}
        </button>
        <button
          className={'btn ' + (danger ? 'btn--danger' : 'btn--primary')}
          onClick={() => {
            onConfirm()
            onClose()
          }}
        >
          {confirm}
        </button>
      </div>
    </Sheet>
  )
}

export function Stepper({
  value,
  onChange,
  min = 0,
  max = 99,
  step = 1,
  small,
  label,
  format = String,
}: {
  value: number
  onChange: (v: number) => void
  min?: number
  max?: number
  step?: number
  small?: boolean
  label: string
  format?: (v: number) => string
}) {
  return (
    <div className={'stepper' + (small ? ' stepper--sm' : '')} role="group" aria-label={label}>
      <button
        type="button"
        aria-label={t('{0} azalt', label)}
        disabled={value <= min}
        onClick={() => onChange(Math.max(min, value - step))}
      >
        <Minus />
      </button>
      <output className="fig">{format(value)}</output>
      <button
        type="button"
        aria-label={t('{0} artır', label)}
        disabled={value >= max}
        onClick={() => onChange(Math.min(max, value + step))}
      >
        <Plus />
      </button>
    </div>
  )
}

export function Seg<T extends string>({
  value,
  options,
  onChange,
  label,
}: {
  value: T
  options: { value: T; label: string }[]
  onChange: (v: T) => void
  label: string
}) {
  return (
    <div className="seg" role="group" aria-label={label}>
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          aria-pressed={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  )
}

export function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean
  onChange: (v: boolean) => void
  label: string
}) {
  return (
    <button
      type="button"
      className="switch"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
    />
  )
}

/** Terfi anında kartın üstünden dökülen konfeti. Hareket azaltma açıkken çizilmez. */
export function Confetti({ colors }: { colors: string[] }) {
  const bits = Array.from({ length: 26 }, (_, i) => {
    // Sabit sözde rastgele dağılım: her çizimde aynı kalır.
    const r = (n: number) => (((Math.sin((i + 1) * 12.9898 * n) * 43758.5453) % 1) + 1) % 1
    return {
      left: 4 + r(1) * 92,
      delay: r(2) * 0.5,
      dur: 1.3 + r(3) * 0.9,
      rot: Math.round(r(4) * 360),
      w: 6 + Math.round(r(5) * 5),
      color: colors[i % colors.length],
    }
  })
  return (
    <div className="confetti" aria-hidden="true">
      {bits.map((b, i) => (
        <i
          key={i}
          style={{
            left: b.left + '%',
            width: b.w,
            height: b.w * 0.45,
            background: b.color,
            animationDelay: b.delay + 's',
            animationDuration: b.dur + 's',
            ['--rot' as string]: b.rot + 'deg',
          }}
        />
      ))}
    </div>
  )
}

/** Basamak içi ilerleme: solda mevcut RP, sağda bir sonraki basamağa kalan. */
export function RankBar({ rank }: { rank: Rank }) {
  return (
    <div>
      <div
        className="bar"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={Math.round(rank.progress * 100)}
      >
        <div className="bar__fill" style={{ width: `${rank.progress * 100}%` }} />
      </div>
      <div className="bar__ends num">
        <span>{int(rank.rp)} {t('RP')}</span>
        {rank.nextAt != null ? (
          <span>
            <b>{rank.nextLabel}</b> {t('için')} {int(rank.nextAt - rank.rp)} {t('RP')}
          </span>
        ) : (
          <span>{t('Merdivenin tepesi')}</span>
        )}
      </div>
    </div>
  )
}

let toastTimer: ReturnType<typeof setTimeout> | undefined
let pushToast: ((msg: string) => void) | null = null

export function toast(msg: string) {
  pushToast?.(msg)
}

export function ToastHost() {
  const [msg, setMsg] = useState<string | null>(null)
  useEffect(() => {
    pushToast = (m) => {
      setMsg(m)
      clearTimeout(toastTimer)
      toastTimer = setTimeout(() => setMsg(null), 2600)
    }
    return () => {
      pushToast = null
    }
  }, [])
  return msg ? (
    <div className="toast" role="status">
      {msg}
    </div>
  ) : null
}
