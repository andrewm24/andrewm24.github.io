const CACHE = 'pokejournal-v6';
const ASSETS = [
  './',
  './index.html',
  './style.css?v=6',
  './script.js?v=6',
  './pokemon-data.json'
];

self.addEventListener('install', evt => {
  evt.waitUntil(
    caches.open(CACHE).then(cache => cache.addAll(ASSETS))
  );
  self.skipWaiting();
});

self.addEventListener('activate', evt => {
  evt.waitUntil(
    caches.keys().then(keys =>
      Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', evt => {
  evt.respondWith(
    fetch(evt.request)
      .then(resp => {
        const clone = resp.clone();
        caches.open(CACHE).then(cache => cache.put(evt.request, clone));
        return resp;
      })
      .catch(() => caches.match(evt.request))
  );
});

