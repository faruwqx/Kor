import { useSyncExternalStore } from 'react'

/** Hash tabanlı küçük yönlendirici: telefonun geri tuşu ve sayfa yenileme çalışır. */

function read(): string {
  const h = window.location.hash.replace(/^#/, '')
  return h.startsWith('/') ? h : '/'
}

function subscribe(cb: () => void) {
  window.addEventListener('hashchange', cb)
  return () => window.removeEventListener('hashchange', cb)
}

export function usePath(): string {
  return useSyncExternalStore(subscribe, read)
}

export function go(path: string, opts: { replace?: boolean } = {}) {
  if (opts.replace) {
    const url = window.location.pathname + window.location.search + '#' + path
    window.history.replaceState(null, '', url)
    window.dispatchEvent(new HashChangeEvent('hashchange'))
  } else {
    window.location.hash = path
  }
  window.scrollTo(0, 0)
}

export function back(fallback = '/') {
  if (window.history.length > 1) window.history.back()
  else go(fallback, { replace: true })
}

/** "/rank/chest" → ["rank", "chest"] */
export function segments(path: string): string[] {
  return path.split('/').filter(Boolean).map(decodeURIComponent)
}
