// PWA Service Worker — aggressive update strategy
const CACHE = 'ordering-v3'

self.addEventListener('install', () => {
  self.skipWaiting() // activate immediately, don't wait for old SW to die
})

self.addEventListener('activate', (e) => {
  // Delete ALL old caches
  e.waitUntil(
    caches.keys().then(keys => Promise.all(keys.map(k => caches.delete(k))))
  )
  self.clients.claim() // take control of all clients immediately
})

self.addEventListener('fetch', (e) => {
  if (e.request.method !== 'GET') return

  const url = new URL(e.request.url)
  // Never cache API calls or websocket
  if (url.pathname.startsWith('/api/') || url.pathname.startsWith('/ws/')) return

  // HTML: always network first, never serve stale
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(e.request))
    )
    return
  }

  // Static assets: cache-first with network update
  e.respondWith(
    caches.match(e.request).then(cached => {
      // Fetch latest in background
      const fetched = fetch(e.request).then(res => {
        if (res.ok) {
          const clone = res.clone()
          caches.open(CACHE).then(c => c.put(e.request, clone))
        }
        return res
      })
      return cached || fetched
    })
  )
})
