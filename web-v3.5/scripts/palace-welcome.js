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
        <img class="v35-welcome-art" src="./palace-welcome-portrait.webp" alt="">
      </picture>
      <i class="v35-handle-glow v35-handle-left"></i>
      <i class="v35-handle-glow v35-handle-right"></i>
      <i class="v35-seam-glow"></i>
    </div>
    <div class="v35-welcome-controls">
      <button class="v35-sound-toggle" type="button" aria-pressed="false" aria-label="Sound effects off">♫</button>
      <button class="v35-skip" type="button">Skip</button>
    </div>
    <button class="v35-entrance" type="button" aria-label="Tap to Open the Magic!"><span class="v35-sr-only">Tap to Open the Magic!</span></button>
    <span class="v35-live v35-sr-only" aria-live="polite">Tap to Open the Magic!</span>
    <div class="v35-sparkles" aria-hidden="true"></div>
    <div class="v35-blast" aria-hidden="true"><i class="v35-blast-rays"></i><div class="v35-blast-sparks"></div></div>
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
  const stage = overlay.querySelector('.v35-welcome-stage');
  const entrance = overlay.querySelector('.v35-entrance');
  const skip = overlay.querySelector('.v35-skip');
  const soundToggle = overlay.querySelector('.v35-sound-toggle');
  const live = overlay.querySelector('.v35-live');
  const sparks = overlay.querySelector('.v35-sparkles');
  const blast = overlay.querySelector('.v35-blast');
  const rays = overlay.querySelector('.v35-blast-rays');
  const waiters = new Set();
  const activeAnimations = new Set();
  let phase = 'ready';
  let soundEnabled = false;
  let audioContext = null;
  let sequence = 0;
  const timers = new Set();
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)');

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

  const tone = (frequencies, duration = .42, type = 'sine') => {
    if (!soundEnabled) return;
    try {
      audioContext ??= new (window.AudioContext || window.webkitAudioContext)();
      audioContext.resume();
      const now = audioContext.currentTime;
      frequencies.forEach((entry, index) => {
        const oscillator = audioContext.createOscillator();
        const gain = audioContext.createGain();
        const start = now + index * .075;
        oscillator.type = type;
        oscillator.frequency.setValueAtTime(entry, start);
        if (index === frequencies.length - 1 && type === 'sine') {
          oscillator.frequency.exponentialRampToValueAtTime(Math.max(90, entry * .54), start + duration);
        }
        gain.gain.setValueAtTime(.0001, start);
        gain.gain.exponentialRampToValueAtTime(index === frequencies.length - 1 && type !== 'sine' ? .028 : .04, start + .025);
        gain.gain.exponentialRampToValueAtTime(.0001, start + duration);
        oscillator.connect(gain).connect(audioContext.destination);
        oscillator.start(start);
        oscillator.stop(start + duration + .02);
      });
    } catch {}
  };
  const chime = () => tone([523.25, 659.25, 783.99], .34);
  const burstSound = () => tone([987.77, 659.25, 392], .74, 'triangle');

  const delay = ms => new Promise(resolve => {
    let id;
    const cancel = () => { clearTimeout(id); timers.delete(id); waiters.delete(cancel); resolve(); };
    id = setTimeout(() => { timers.delete(id); waiters.delete(cancel); resolve(); }, ms);
    timers.add(id);
    waiters.add(cancel);
  });
  const animateNode = (node, frames, duration, easing, finalStyles) => {
    if (typeof node?.animate !== 'function') {
      Object.assign(node.style, finalStyles);
      return delay(duration);
    }
    const animation = node.animate(frames, { duration, easing, fill: 'forwards' });
    activeAnimations.add(animation);
    return animation.finished.then(() => {
      if (phase !== 'done') {
        Object.assign(node.style, finalStyles);
        animation.cancel();
      }
    }, () => {}).finally(() => activeAnimations.delete(animation));
  };
  const motionEnd = (node, eventName, property, timeout) => new Promise(resolve => {
    let id;
    const done = event => {
      if (event && (event.target !== node || (property && event.propertyName !== property))) return;
      node.removeEventListener(eventName, done);
      clearTimeout(id);
      timers.delete(id);
      waiters.delete(cancel);
      resolve();
    };
    const cancel = () => done();
    node.addEventListener(eventName, done);
    id = setTimeout(() => done(), timeout);
    timers.add(id);
    waiters.add(cancel);
  });

  const stopSequence = () => {
    sequence++;
    timers.forEach(clearTimeout);
    timers.clear();
    [...waiters].forEach(cancel => cancel());
    waiters.clear();
    activeAnimations.forEach(animation => animation.cancel());
    activeAnimations.clear();
  };

  const finish = withCover => {
    if (phase === 'done') return;
    phase = 'done';
    stopSequence();
    document.removeEventListener('keydown', keyboardMode, true);
    overlay.removeEventListener('pointerdown', pointerMode);
    window.removeEventListener('resize', fitViewport);
    window.visualViewport?.removeEventListener('resize', fitViewport);
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
      setTimeout(() => cover.remove(), reducedMotion.matches ? 200 : 900);
    }
  };

  const open = async () => {
    if (phase !== 'ready') return;
    phase = 'opening';
    entrance.disabled = true;
    const run = ++sequence;
    chime();
    if (reducedMotion.matches) {
      overlay.classList.add('v35-is-blasting');
      burstSound();
      await Promise.all([
        animateNode(blast, [{ transform: 'scale(.015)', opacity: 0 }, { transform: 'scale(1.42)', opacity: 1 }], 120, 'ease-out', { transform: 'scale(1.42)', opacity: '1' }),
        animateNode(rays, [{ transform: 'scale(.04) rotate(-15deg)', opacity: 0 }, { transform: 'scale(1.2) rotate(15deg)', opacity: .56 }], 120, 'ease-out', { transform: 'scale(1.2) rotate(15deg)', opacity: '.56' })
      ]);
      if (phase === 'opening' && sequence === run) finish(true);
      return;
    }
    overlay.classList.add('v35-unlocking');
    await delay(420);
    if (phase !== 'opening' || sequence !== run) return;
    overlay.classList.remove('v35-unlocking');
    overlay.classList.add('v35-door-active');
    await delay(260);
    if (phase !== 'opening' || sequence !== run) return;
    overlay.classList.add('v35-is-zooming');
    stage.style.transformOrigin = '50% 54%';
    await animateNode(stage, [{ transform: 'scale(1)' }, { transform: 'scale(1.3)' }], 850, 'ease-in-out', { transform: 'scale(1.3)' });
    if (phase !== 'opening' || sequence !== run) return;
    overlay.classList.add('v35-is-blasting');
    burstSound();
    await Promise.all([
      animateNode(blast, [{ transform: 'scale(.015)', opacity: 0 }, { transform: 'scale(.92)', opacity: 1, offset: .65 }, { transform: 'scale(1.42)', opacity: 1 }], 980, 'cubic-bezier(.12,.68,.16,1)', { transform: 'scale(1.42)', opacity: '1' }),
      animateNode(rays, [{ transform: 'scale(.04) rotate(-15deg)', opacity: 0, offset: 0 }, { transform: 'scale(1.2) rotate(15deg)', opacity: .56 }], 1050, 'cubic-bezier(.14,.74,.2,1)', { transform: 'scale(1.2) rotate(15deg)', opacity: '.56' })
    ]);
    if (phase === 'opening' && sequence === run) finish(true);
  };

  const keyboardMode = event => { if (event.key === 'Tab') overlay.classList.add('v35-keyboard-nav'); };
  const pointerMode = () => overlay.classList.remove('v35-keyboard-nav');
  document.addEventListener('keydown', keyboardMode, true);
  overlay.addEventListener('pointerdown', pointerMode, { passive: true });
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
  for (let i = 0; i < 28; i++) {
    const spark = document.createElement('i');
    spark.className = 'v35-spark';
    spark.style.left = `${4 + Math.random() * 92}%`;
    spark.style.top = `${5 + Math.random() * 88}%`;
    spark.style.setProperty('--spark-delay', `${-Math.random() * 5}s`);
    spark.style.setProperty('--spark-duration', `${2.8 + Math.random() * 3.8}s`);
    sparks.appendChild(spark);
  }
  const blastSparks = overlay.querySelector('.v35-blast-sparks');
  for (let i = 0; i < 30; i++) {
    const spark = document.createElement('i');
    const angle = Math.random() * Math.PI * 2;
    const distance = 45 + Math.random() * 65;
    spark.className = 'v35-blast-spark';
    spark.style.setProperty('--dx', `${Math.cos(angle) * distance}vw`);
    spark.style.setProperty('--dy', `${Math.sin(angle) * distance}vh`);
    spark.style.setProperty('--delay', `${Math.random() * .22}s`);
    spark.style.setProperty('--size', `${3 + Math.random() * 5}px`);
    blastSparks.appendChild(spark);
  }
  localize();
  try { history.pushState({ v35PalaceWelcome: true }, '', location.href); } catch {}
  entrance.focus({ preventScroll: true });
}
