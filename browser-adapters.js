(() => { if (location.protocol !== 'file:' && 'serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {}); })();
