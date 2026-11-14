/*
 * Kor servis çalışanı: uygulama kabuğunu önbelleğe alır, salonda internet
 * çekmediğinde de açılır. Veri zaten cihazda (localStorage) durur.
 * Sayfa gezintisi: önce ağ, olmazsa önbellek. Dosyalar: önce önbellek,
 * arkada yenile.
 */
const CACHE = 'kor-v2'
const SHELL = ['./', './manifest.webmanifest', './icon.svg', './icon-192.png']

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE)
      .then((cache) => cache.addAll(SHELL))
      .then(() => self.skipWaiting()),
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE).map((k) => caches.delete(k))))
      .then(() => self.clients.claim()),
  )
})

// İlk açılışta sayfa, çalışan devreye girmeden yüklediği dosyaları buraya bildirir.
self.addEventListener('message', (event) => {
  if (event.data?.type !== 'cache' || !Array.isArray(event.data.urls)) return
  const urls = event.data.urls.filter((u) => new URL(u).origin === self.location.origin)
  event.waitUntil(
    caches.open(CACHE).then((cache) =>
      Promise.all(
        urls.map((u) =>
          cache.match(u, { ignoreVary: true }).then((hit) => hit || cache.add(u).catch(() => undefined)),
        ),
      ),
    ),
  )
})

self.addEventListener('fetch', (event) => {
  const req = event.request
  if (req.method !== 'GET') return
  const url = new URL(req.url)
  if (url.origin !== self.location.origin) return

  if (req.mode === 'navigate') {
    event.respondWith(
      fetch(req)
        .then((res) => {
          const copy = res.clone()
          caches.open(CACHE).then((cache) => cache.put('./', copy))
          return res
        })
        .catch(() => caches.match('./', { ignoreVary: true }).then((hit) => hit || Response.error())),
    )
    return
  }

  event.respondWith(
    // ignoreVary: sunucu "Vary: Origin" gönderdiğinde, crossorigin ile istenen
    // betik ve stil dosyaları önbellekteki kopyayla eşleşmez; başlığı yok say.
    caches.match(req, { ignoreVary: true }).then((hit) => {
      const fresh = fetch(req)
        .then((res) => {
          if (res.ok) {
            const copy = res.clone()
            caches.open(CACHE).then((cache) => cache.put(req, copy))
          }
          return res
        })
        .catch(() => hit || Response.error())
      return hit || fresh
    }),
  )
})
