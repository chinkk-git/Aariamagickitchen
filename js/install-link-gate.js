(() => {
  const params = new URLSearchParams(window.location.search);
  if (params.get('install') !== '1') return;

  const root = document.documentElement;
  root.classList.add('install-gate-active');

  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone === true;
  const ios = /iPad|iPhone|iPod/i.test(navigator.userAgent) ||
    (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1);
  const inApp = /FBAN|FBAV|Instagram|WhatsApp|Line\\/|TikTok|Twitter/i.test(navigator.userAgent);
  let deferredPrompt = null;

  function removeInstallQuery() {
    const url = new URL(window.location.href);
    url.searchParams.delete('install');
    const next = url.pathname + url.search + url.hash;
    window.history.replaceState(window.history.state, '', next);
  }

  function continueToApp(gate) {
    removeInstallQuery();
    root.classList.remove('install-gate-active');
    gate.hidden = true;
  }

  function instructionsText() {
    if (inApp) {
      if (ios) return 'This in-app browser may not support installation. Open this page in Safari, then tap Share → Add to Home Screen.';
      return 'This in-app browser may not support installation. Open this page in Chrome (use the browser menu and choose Open in browser), then tap ⋮ → Install app or Add to Home screen.';
    }
    if (ios) return 'In Safari, tap Share → Add to Home Screen.';
    if (/Android/i.test(navigator.userAgent)) return 'In Chrome, tap ⋮ → Install app or Add to Home screen.';
    return 'Open your browser menu and choose Install app or Add to Home screen.';
  }

  function initialize() {
    const gate = document.getElementById('install-link-gate');
    const installButton = document.getElementById('install-link-install');
    const continueButton = document.getElementById('install-link-continue');
    const instructions = document.getElementById('install-link-instructions');
    if (!gate || !installButton || !continueButton || !instructions) return;

    gate.hidden = false;
    instructions.textContent = '';
    if (standalone) {
      installButton.textContent = 'Open App';
      installButton.addEventListener('click', () => continueToApp(gate));
    } else {
      installButton.addEventListener('click', async () => {
        if (!deferredPrompt) {
          instructions.textContent = instructionsText();
          instructions.hidden = false;
          return;
        }
        const promptEvent = deferredPrompt;
        deferredPrompt = null;
        try {
          await promptEvent.prompt();
          const choice = await promptEvent.userChoice;
          if (choice?.outcome === 'dismissed') {
            instructions.textContent = instructionsText();
            instructions.hidden = false;
          }
        } catch (error) {
          instructions.textContent = instructionsText();
          instructions.hidden = false;
        }
      });
    }
    continueButton.addEventListener('click', () => continueToApp(gate));
  }

  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    deferredPrompt = event;
  });
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, {once: true});
  } else {
    initialize();
  }
})();
