(() => {
  if (location.protocol === 'file:' || !('serviceWorker' in navigator)) return;

  const RELOAD_KEY = 'aaria.serviceWorker.reloadedCache.v1';
  const UPDATE_CHECK_INTERVAL_MS = 15000;
  let registration;
  let registrationPromise;
  let lastUpdateCheck = 0;
  let inFlightUpdateCheck;
  let reloadPending = false;

  function reloadOnceForVersion(version) {
    if (typeof version !== 'string' || !version.startsWith('aaria-web-v3.5-')) return;
    if (reloadPending) return;

    try {
      if (sessionStorage.getItem(RELOAD_KEY) === version) return;
      sessionStorage.setItem(RELOAD_KEY, version);
    } catch {}

    reloadPending = true;
    location.reload();
  }

  async function checkForUpdates() {
    if (!navigator.onLine) return;
    if (inFlightUpdateCheck) return inFlightUpdateCheck;
    if (Date.now() - lastUpdateCheck < UPDATE_CHECK_INTERVAL_MS) return;

    lastUpdateCheck = Date.now();
    inFlightUpdateCheck = (async () => {
      try {
        const activeRegistration = registration || await registrationPromise;
        await activeRegistration?.update();
      } catch {}
    })().finally(() => { inFlightUpdateCheck = null; });
    return inFlightUpdateCheck;
  }

  navigator.serviceWorker.addEventListener('message', event => {
    if (event.data?.type === 'AARIA_APP_UPDATED') {
      reloadOnceForVersion(event.data.cacheName);
    }
  });

  registrationPromise = navigator.serviceWorker.register('./sw.js', {
    scope: './',
    updateViaCache: 'none'
  }).then(activeRegistration => {
    registration = activeRegistration;
    checkForUpdates();
    return activeRegistration;
  }).catch(() => null);

  window.addEventListener('online', checkForUpdates);
  window.addEventListener('focus', checkForUpdates);
  window.addEventListener('pageshow', checkForUpdates);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') checkForUpdates();
  });
})();
