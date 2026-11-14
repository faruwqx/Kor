import '@fontsource-variable/inter'
import '@fontsource/barlow-condensed/600.css'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import App from './App.tsx'
import { initCloud } from './lib/cloud'
import { demoState } from './lib/demo'
import { BUILTIN, demoFrames } from './lib/exercises'
import { actions, getState } from './lib/store'
import './styles.css'

// ?demo=1: kurulum yapılmamışsa örnek veriyle açar (tanıtım ve test için).
if (new URLSearchParams(location.search).has('demo') && !getState().profile) {
  actions.replaceAll(demoState())
}

// Hesap ve yedekleme: Supabase anahtarları tanımlı değilse hiçbir şey yapmaz.
initCloud()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)

// Çevrimdışı çalışma: yalnızca derlenmiş sürümde. Kayıt başarısız olursa
// uygulama çevrimiçi çalışmaya devam eder.
// iPhone uygulamasında (capacitor://) dosyalar zaten cihazda: servis çalışanı gerekmez.
if (import.meta.env.PROD && 'serviceWorker' in navigator && location.protocol.startsWith('http')) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('./sw.js')
      .then(() => navigator.serviceWorker.ready)
      .then((reg) => {
        const urls = performance
          .getEntriesByType('resource')
          .map((r) => r.name)
          .filter((u) => u.startsWith(location.origin))
        // Yapılış kareleri de salonda internetsiz açılsın (yaklaşık 2 MB).
        const moves = BUILTIN.flatMap((e) => demoFrames(e.id)).map(
          (u) => new URL(u, location.href).href,
        )
        reg.active?.postMessage({ type: 'cache', urls: [...urls, ...moves] })
      })
      .catch((err) => console.warn('Servis çalışanı kaydedilemedi:', err))
  })
}
