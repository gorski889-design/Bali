// Bali 2026 Service Worker v2 – network-first fuer die Seite, damit keine alte Version haengenbleibt
const CACHE = 'bali26-v2';
const CORE = ['./', './index.html'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;
  const url = e.request.url;
  const isImg = url.includes('upload.wikimedia.org');

  // Bilder: cache-first (aendern sich nie), spart Daten offline
  if (isImg) {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(e.request);
      if (hit) return hit;
      try {
        const res = await fetch(e.request);
        if (res && res.status === 200) cache.put(e.request, res.clone());
        return res;
      } catch (err) { return hit || Response.error(); }
    })());
    return;
  }

  // Seite/HTML: network-first, damit immer die aktuelle Version kommt; Cache nur offline
  if (e.request.mode === 'navigate' || url.endsWith('/') || url.endsWith('index.html')) {
    e.respondWith((async () => {
      try {
        const res = await fetch(e.request);
        const cache = await caches.open(CACHE);
        cache.put('./index.html', res.clone());
        return res;
      } catch (err) {
        const cache = await caches.open(CACHE);
        return (await cache.match('./index.html')) || (await cache.match('./')) || Response.error();
      }
    })());
  }
});
