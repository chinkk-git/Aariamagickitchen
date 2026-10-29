  function v35ShowPalaceWelcome() {
    const app = document.querySelector('.app');
    if (!app || document.getElementById('v35-palace-welcome')) return;
    welcomeOverlay = document.createElement('section');
    welcomeOverlay.id = 'v35-palace-welcome';
    welcomeOverlay.className = 'v35-welcome-root';
    welcomeOverlay.setAttribute('role', 'dialog');
    welcomeOverlay.setAttribute('aria-modal', 'true');
    welcomeOverlay.setAttribute('aria-labelledby', 'v35-welcome-heading');
    welcomeOverlay.innerHTML = `
      <h1 id="v35-welcome-heading" class="v35-sr-only">Aaria’s Magical Kitchen</h1>
      <div class="v35-welcome-stage" aria-hidden="true">
        <picture class="v35-welcome-picture">
          <source media="(orientation: landscape)" srcset="./palace-welcome-landscape.webp">
          <img src="./palace-welcome-portrait.webp" alt="">
        </picture>
        <span class="v35-door-halo"></span>
        <span class="v35-door-light"></span>
      </div>
      <div class="v35-welcome-controls">
        <button class="v35-sound-toggle" type="button" aria-pressed="false" aria-label="Sound effects off">♫</button>
        <button class="v35-skip" type="button">Skip</button>
      </div>
      <button class="v35-entrance" type="button" aria-label="Tap to Open the Magic!">
        <span class="v35-sr-only">Tap to Open the Magic!</span>
      </button>
      <span class="v35-live v35-sr-only" aria-live="polite">Tap to Open the Magic!</span>
      <div class="v35-sparkles" aria-hidden="true"></div>
      <div class="v35-legacy-bridge" aria-hidden="true" hidden>
        <div class="v34-welcome-frame"></div><div class="v34-welcome-live"></div>
        <button class="v34-welcome-skip"></button><button class="v34-welcome-next"></button>
        <button class="v34-welcome-back"></button><button class="v34-welcome-enter"></button>
        <div class="v34-welcome-enter-wrap"></div><div class="v34-welcome-status"></div>
        <div class="v34-welcome-top"><span></span></div>
      </div>`;
    document.body.appendChild(welcomeOverlay);
    document.getElementById('v34-welcome-boot')?.remove();
    app.setAttribute('inert', '');

    const overlay = welcomeOverlay;
    const entrance = overlay.querySelector('.v35-entrance');
    const skip = overlay.querySelector('.v35-skip');
    const soundToggle = overlay.querySelector('.v35-sound-toggle');
    const live = overlay.querySelector('.v35-live');
    const sparks = overlay.querySelector('.v35-sparkles');
    const onKeyboardMode = event => { if (event.key === 'Tab') overlay.classList.add('v35-keyboard-nav'); };
    const onPointerMode = () => overlay.classList.remove('v35-keyboard-nav');
    document.addEventListener('keydown', onKeyboardMode, true);
    overlay.addEventListener('pointerdown', onPointerMode, { passive: true });
    let phase = 'ready';
    let soundEnabled = false;
    let audioContext = null;
    let timers = [];
    const localize = () => {
      const portuguese = state.language === 'pt-BR';
      skip.textContent = portuguese ? 'Pular' : 'Skip';
      skip.setAttribute('aria-label', portuguese ? 'Pular a abertura e entrar na página inicial selecionada' : 'Skip the opening and enter the selected Home');
      soundToggle.setAttribute('aria-label', soundEnabled
        ? (portuguese ? 'Desativar efeitos sonoros' : 'Sound effects on')
        : (portuguese ? 'Ativar efeitos sonoros' : 'Sound effects off'));
      entrance.setAttribute('aria-label', portuguese ? 'Toque para abrir a magia!' : 'Tap to Open the Magic!');
      live.textContent = portuguese ? 'Toque para abrir a magia!' : 'Tap to Open the Magic!';
    };

    const chime = () => {
      if (!soundEnabled) return;
      try {
        audioContext ??= new (window.AudioContext || window.webkitAudioContext)();
        audioContext.resume();
        const now = audioContext.currentTime;
        [523.25, 659.25, 783.99].forEach((frequency, index) => {
          const oscillator = audioContext.createOscillator();
          const gain = audioContext.createGain();
          const start = now + index * 0.095;
          oscillator.type = 'sine';
          oscillator.frequency.setValueAtTime(frequency, start);
          gain.gain.setValueAtTime(0.0001, start);
          gain.gain.exponentialRampToValueAtTime(0.04, start + 0.035);
          gain.gain.exponentialRampToValueAtTime(0.0001, start + 0.34);
          oscillator.connect(gain).connect(audioContext.destination);
          oscillator.start(start);
          oscillator.stop(start + 0.36);
        });
      } catch {}
    };

    const finish = (withCover) => {
      if (phase === 'done') return;
      phase = 'done';
      timers.forEach(clearTimeout);
      timers = [];
      document.removeEventListener('keydown', onKeyboardMode, true);
      overlay.removeEventListener('pointerdown', onPointerMode);
      let cover = null;
      if (withCover) {
        cover = document.createElement('div');
        cover.className = 'v35-transition-cover';
        cover.setAttribute('aria-hidden', 'true');
        document.body.appendChild(cover);
      }
      v34FinishWelcome();
      if (cover) {
        requestAnimationFrame(() => cover.classList.add('v35-fade-away'));
        setTimeout(() => cover.remove(), matchMedia('(prefers-reduced-motion: reduce)').matches ? 180 : 760);
      }
    };

    const open = () => {
      if (phase !== 'ready') return;
      phase = 'opening';
      entrance.disabled = true;
      overlay.classList.add('v35-is-zooming');
      chime();
      if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
        timers.push(setTimeout(() => finish(true), 120));
        return;
      }
      timers.push(setTimeout(() => overlay.classList.add('v35-doors-opening'), 520));
      timers.push(setTimeout(() => overlay.classList.add('v35-is-blasting'), 900));
      timers.push(setTimeout(() => finish(true), 1510));
    };

    entrance.addEventListener('click', open);
    skip.addEventListener('click', () => finish(false));
    soundToggle.addEventListener('click', () => {
      soundEnabled = !soundEnabled;
      soundToggle.setAttribute('aria-pressed', String(soundEnabled));
      localize();
      if (soundEnabled) chime();
    });
    document.getElementById('languageSelect')?.addEventListener('change', localize);
    overlay.addEventListener('keydown', event => {
      if (event.key === 'Escape') { event.preventDefault(); finish(false); }
      if ((event.key === 'Enter' || event.key === ' ') && event.target === overlay) { event.preventDefault(); open(); }
    });
    const fitViewport = () => {
      const height = window.visualViewport?.height || window.innerHeight;
      overlay.style.setProperty('--v35-viewport-height', `${height}px`);
    };
    fitViewport();
    window.visualViewport?.addEventListener('resize', fitViewport, { passive: true });
    window.addEventListener('resize', fitViewport, { passive: true });
    for (let i = 0; i < 26; i++) {
      const spark = document.createElement('i');
      spark.className = 'v35-spark';
      spark.style.left = `${4 + Math.random() * 92}%`;
      spark.style.top = `${5 + Math.random() * 88}%`;
      spark.style.setProperty('--spark-delay', `${-Math.random() * 5}s`);
      spark.style.setProperty('--spark-duration', `${2.8 + Math.random() * 3.8}s`);
      sparks.appendChild(spark);
    }
    localize();
    try { history.pushState({ v35PalaceWelcome: true }, '', location.href); } catch {}
  }
