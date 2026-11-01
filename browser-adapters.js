(() => {
  if (location.protocol === 'file:' || !('serviceWorker' in navigator)) return;

  const UPDATE_CHECK_INTERVAL_MS = 15000;
  let registration;
  let registrationPromise;
  let lastUpdateCheck = 0;
  let inFlightUpdateCheck;
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
