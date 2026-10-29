// The old PokeJournal app registered a service worker at this path.
// This replacement clears its caches and unregisters itself so returning
// visitors get the current site.
self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', evt => {
  evt.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => caches.delete(k)));
    await self.registration.unregister();
    const clients = await self.clients.matchAll({ type: 'window' });
    clients.forEach(client => client.navigate(client.url));
  })());
});
