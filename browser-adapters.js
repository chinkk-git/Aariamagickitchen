(() => {
  if (location.protocol === 'file:' || !('serviceWorker' in navigator)) return;
  const currentCache = 'aaria-web-v3.5-85f537591449-r2';
  const retireOldCaches = async () => {
    if (!('caches' in window)) return;
    const keys = await caches.keys();
    const obsolete = keys.filter(key => key.startsWith('aaria-web-v3.5-') && key !== currentCache);
    await Promise.all(obsolete.map(key => caches.delete(key)));
  };
  navigator.serviceWorker.addEventListener('controllerchange', () => {
    retireOldCaches().catch(() => {});
  });
  navigator.serviceWorker.register('./sw.js', { scope: './' }).then(() => {
    retireOldCaches().catch(() => {});
  }).catch(() => {});
})();
