// Pipeline v2 Service Worker
const CACHE = 'pipeline-v2';
const ASSETS = [
  '/',
  '/index.html',
  '/sw.js',
  '/files-bundle.json.gz',
  'https://cdn.jsdelivr.net/npm/jszip@3/dist/jszip.min.js',
  'https://cdn.jsdelivr.net/npm/marked@9/marked.min.js'
];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(ASSETS)));
  self.skipWaiting();
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))));
  self.clients.claim();
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);

  // Bundle: cache-first
  if (url.pathname.endsWith('files-bundle.json.gz')) {
    e.respondWith(
      caches.match(e.request).then(r => {
        if (r) return r;
        return fetch(e.request).then(res => {
          if (res.ok) {
            const c = res.clone();
            caches.open(CACHE).then(cache => cache.put(e.request, c));
          }
          return res;
        });
      }).catch(() => new Response('', { status: 503 }))
    );
    return;
  }

  // CDN libs: cache-first
  if (url.hostname === 'cdn.jsdelivr.net') {
    e.respondWith(
      caches.match(e.request).then(r => {
        if (r) return r;
        return fetch(e.request).then(res => {
          if (res.ok) {
            const c = res.clone();
            caches.open(CACHE).then(cache => cache.put(e.request, c));
          }
          return res;
        });
      }).catch(() => new Response('', { status: 503 }))
    );
    return;
  }

  // Everything else: network-first, fallback to cache
  e.respondWith(
    fetch(e.request).then(res => {
      if (res.status === 200) {
        const c = res.clone();
        caches.open(CACHE).then(cache => cache.put(e.request, c));
      }
      return res;
    }).catch(() => caches.match(e.request))
  );
});
