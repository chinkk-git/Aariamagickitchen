const CACHE_NAME = 'aaria-web-v3.5-85f537591449-r3';
const CACHE_PREFIX = 'aaria-web-v3.5-';
const CORE_FILES = ["./","./index.html","./welcome-scene-1-landscape.webp","./welcome-scene-2-landscape.webp","./welcome-scene-3-landscape.webp","./palace-welcome-portrait.webp","./palace-welcome-landscape.webp","./food-wonderland-portrait.webp","./food-wonderland-landscape.webp","./food-wonderland-landscape-standard.webp","./food-wonderland-portrait-clean.webp","./food-wonderland-landscape-clean.webp","./food-wonderland-landscape-standard-clean.webp","./food-wonderland-globe.webp","./food-wonderland-wheel.webp","./food-wonderland-chest-lid.png","./food-wonderland-dish-photo.png","./manifest.webmanifest","./aaria-pwa-icon-192.png","./aaria-pwa-icon-512.png","./aaria-pwa-icon-maskable-512.png","./aaria-apple-touch-icon-180.png","./aaria-apple-touch-icon-167.png","./aaria-apple-touch-icon-152.png","./aaria-apple-touch-icon-120.png","./aaria-favicon-32.png","./app.0aea31c69c3f4eb2.css","./aaria-accessibility-text-size.css","./magical-updates.css","./install-link-gate.css","./js/install-link-gate.js","./js/magical-updates.js?rev=20261101","./js/01-inline-script-1.9718845f1331.js?rev=official-app-name-20261030","./js/02-scrolling-bottom-menu.450ef23d1482.js","./js/03-aaria-v3-layer.c2c6fc71d8ad.js?rev=official-app-name-20261030","./js/v35-recipe-data-corrections.js","./js/04-aaria-bottom-nav-scroll-controller.8f6ab76bf7ab.js","./js/05-food-wonderland-runtime.7e7cb86154e0.js","./js/accessibility-text-size.js?rev=20261031","./browser-adapters.js"];
self.addEventListener('install', event => event.waitUntil(
  caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_FILES)).then(() => self.skipWaiting())
));
self.addEventListener('activate', event => event.waitUntil((async () => {
  const keys = await caches.keys();
  const obsolete = keys.filter(key => key.startsWith(CACHE_PREFIX) && key !== CACHE_NAME);
  await Promise.all(obsolete.map(key => caches.delete(key)));
  const clients = await self.clients.matchAll({type:'window', includeUncontrolled:true});
  await Promise.all(clients.map(client =>
    typeof client.navigate === 'function' ? client.navigate(client.url).catch(() => {}) : Promise.resolve()
  ));
})()));
self.addEventListener('fetch', event => {
  const request = event.request, url = new URL(request.url);
  if (request.method !== 'GET' || url.origin !== self.location.origin) return;
  event.respondWith(fetch(new Request(request, {cache:'no-store'})).catch(async () =>
    (await caches.match(request)) || (request.mode === 'navigate' ? await caches.match('./index.html') : Response.error())
  ));
});
