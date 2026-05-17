/**
 * Service worker — split caching strategy.
 *
 * Navigation requests (HTML pages) use network-first so that cross-document
 * view transitions always fire — some browsers (Safari) skip @view-transition
 * when a SW serves a page directly from cache. Falls back to cache offline.
 *
 * Asset requests (JS, CSS, fonts, JSON) use cache-first for instant loads.
 *
 * BUILD_TIMESTAMP is replaced by the pipeline at build time. Every build
 * produces a new cache version, triggering a full cache refresh.
 */

const VERSION = '2026-05-17T11:25:15.524Z'
const CACHE   = `slide-engine-${VERSION}`

self.addEventListener('install', (event) => {
  event.waitUntil(
    fetch('./manifest.json')
      .then(r => r.json())
      .then(async (manifest) => {
        const cache = await caches.open(CACHE)
        const urls  = [
          './manifest.json',
          './print.html',
          './assets/components.js',
          './assets/runtime.js',
          ...manifest.slides,
        ]
        // Only cache responses that are genuinely OK — never cache redirects
        await Promise.all(
          urls.map(async url => {
            const res = await fetch(url)
            if (res.ok) await cache.put(url, res)
          })
        )
        await self.skipWaiting()
      })
  )
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', (event) => {
  // Navigation requests: network-first so view transitions fire normally.
  // On success, update the cache. On network failure, serve cached version.
  if (event.request.mode === 'navigate') {
    event.respondWith(
      fetch(event.request)
        .then(res => {
          if (res.ok) caches.open(CACHE).then(c => c.put(event.request, res.clone()))
          return res
        })
        .catch(() => caches.match(event.request))
    )
    return
  }

  // Assets: cache-first for instant loads
  event.respondWith(
    caches.match(event.request).then(cached => {
      if (cached?.ok) return cached
      return fetch(event.request).then(res => {
        if (res.ok) caches.open(CACHE).then(c => c.put(event.request, res.clone()))
        return res
      })
    })
  )
})
