// Bali 2026 Service Worker – Offline-Cache fuer Dschungel/Funkloch
const CACHE = 'bali26-v1';
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
  const isPage = e.request.mode === 'navigate' || CORE.some(c => url.endsWith(c.replace('./', '')));

  // Seite + Bilder: cache-first, damit offline alles da ist
  if (isImg || isPage) {
    e.respondWith((async () => {
      const cache = await caches.open(CACHE);
      const hit = await cache.match(e.request, { ignoreSearch: true });
      if (hit) return hit;
      try {
        const res = await fetch(e.request);
        if (res && res.status === 200) cache.put(e.request, res.clone());
        return res;
      } catch (err) {
        const fallback = await cache.match('./index.html');
        return hit || fallback || Response.error();
      }
    })());
  }
});
