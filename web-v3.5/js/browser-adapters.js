(() => {
  // Install only under this package path. The worker's relative scope stays
  // under /web-v3.5/ and cannot control the production root.
  if (location.protocol !== 'file:' && 'serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {
      // Browsers or hosts may block offline support; the online app still works.
    });
  }
})();
