const CACHE_NAME = 'aaria-web-v3.5-2026-10-28';
const CORE_FILES = [
  './', './index.html', './manifest.webmanifest',
  './css/recipe-experience.css', './css/v34-interface.css', './css/v34-runtime.css',
  './js/recipe-data.js', './js/app.js', './js/bottom-menu.js', './js/v34-runtime.js',
  './data/recipes.json', './assets/brand/aaria-launcher-icon.svg', './assets/characters/aaria.jpg'
];
self.addEventListener('install', event => {
  event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', event => {
  event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('aaria-web-v3.5-') && key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET' || new URL(request.url).origin !== self.location.origin) return;
  event.respondWith(caches.match(request).then(cached => cached || fetch(request).then(response => {
    if (response.ok && new URL(request.url).pathname.startsWith(new URL('./', self.registration.scope).pathname)) {
      const copy = response.clone();
      caches.open(CACHE_NAME).then(cache => cache.put(request, copy));
    }
    return response;
  })));
});
