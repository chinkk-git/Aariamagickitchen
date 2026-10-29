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
      <div class="v35-doorway" aria-hidden="true"></div>
      <svg class="v35-mask-defs" width="0" height="0" aria-hidden="true">
        <defs>
          <mask id="v35-door-left-mask" x="0" y="0" width="1" height="1" maskUnits="objectBoundingBox" maskContentUnits="objectBoundingBox"><rect width="1" height="1" fill="black"></rect><path data-door-mask="left" fill="white"></path><path data-figure-mask="left" fill="black"></path></mask>
          <mask id="v35-door-right-mask" x="0" y="0" width="1" height="1" maskUnits="objectBoundingBox" maskContentUnits="objectBoundingBox"><rect width="1" height="1" fill="black"></rect><path data-door-mask="right" fill="white"></path><path data-figure-mask="right" fill="black"></path></mask>
          <mask id="v35-doorway-mask" x="0" y="0" width="1" height="1" maskUnits="objectBoundingBox" maskContentUnits="objectBoundingBox"><rect width="1" height="1" fill="black"></rect><path data-door-mask="portal" fill="white"></path><path data-figure-mask="portal" fill="black"></path></mask>
        </defs>
      </svg>
      <div class="v35-door-panel v35-door-left" aria-hidden="true"><picture><source media="(orientation: landscape)" srcset="./palace-welcome-landscape.webp"><img src="./palace-welcome-portrait.webp" alt=""></picture></div>
      <div class="v35-door-panel v35-door-right" aria-hidden="true"><picture><source media="(orientation: landscape)" srcset="./palace-welcome-landscape.webp"><img src="./palace-welcome-portrait.webp" alt=""></picture></div>
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
  const panels = [...overlay.querySelectorAll('.v35-door-panel')];
  const blast = overlay.querySelector('.v35-blast');
  const waiters = new Set();
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

  const artPoints = {
    landscape: {
      left: [[.5,.232],[.465,.253],[.427,.277],[.389,.301],[.352,.324],[.325,.35],[.307,.38],[.307,.725],[.5,.727]],
      hinge: [.307,.55],
      figures: [
        [[.39,.48],[.405,.45],[.43,.45],[.45,.48],[.466,.5],[.482,.49],[.507,.51],[.514,.54],[.538,.57],[.557,.59],[.55,.62],[.58,.64],[.565,.67],[.546,.69],[.535,.75],[.526,.81],[.505,.86],[.474,.88],[.444,.86],[.432,.82],[.412,.78],[.401,.75],[.385,.72],[.398,.69],[.382,.66],[.393,.62],[.38,.59],[.397,.55]],
        [[.495,.69],[.508,.66],[.531,.66],[.55,.68],[.568,.72],[.59,.76],[.596,.82],[.585,.87],[.56,.9],[.531,.9],[.508,.87],[.49,.83],[.483,.78]]
      ]
    },
    portrait: {
      left: [[.5,.346],[.463,.36],[.424,.375],[.387,.389],[.35,.405],[.318,.425],[.297,.45],[.286,.478],[.286,.722],[.5,.724]],
      hinge: [.286,.55],
      figures: [
        [[.286,.49],[.303,.466],[.334,.463],[.363,.476],[.385,.497],[.398,.523],[.422,.539],[.432,.565],[.455,.584],[.464,.607],[.49,.617],[.514,.63],[.506,.65],[.477,.66],[.493,.682],[.471,.7],[.465,.745],[.454,.783],[.43,.81],[.396,.824],[.354,.819],[.32,.8],[.306,.77],[.285,.75],[.27,.722],[.25,.705],[.258,.679],[.244,.652],[.259,.622],[.256,.586],[.268,.55]],
        [[.12,.735],[.132,.704],[.15,.685],[.175,.678],[.198,.688],[.223,.692],[.244,.704],[.266,.71],[.29,.729],[.322,.744],[.336,.772],[.326,.809],[.3,.832],[.267,.842],[.23,.837],[.196,.845],[.16,.832],[.135,.808],[.12,.777]]
      ]
    }
  };
  const positionFraction = (raw, fallback) => {
    const n = Number.parseFloat(raw);
    return Number.isFinite(n) ? (raw.includes('%') ? n / 100 : n) : fallback;
  };
  const fitDoorLayers = () => {
    const img = overlay.querySelector('.v35-welcome-art');
    const w = stage.clientWidth, h = stage.clientHeight;
    if (!img?.naturalWidth || !img.naturalHeight || !w || !h) return;
    const style = getComputedStyle(img);
    const [pxRaw='50%', pyRaw='50%'] = style.objectPosition.split(/\s+/);
    const px = positionFraction(pxRaw, .5), py = positionFraction(pyRaw, .5);
    const scale = Math.max(w / img.naturalWidth, h / img.naturalHeight);
    const renderedW = img.naturalWidth * scale, renderedH = img.naturalHeight * scale;
    const offsetX = (w - renderedW) * px, offsetY = (h - renderedH) * py;
    const orientation = matchMedia('(orientation: landscape)').matches ? 'landscape' : 'portrait';
    const layout = artPoints[orientation];
    const map = ([x,y]) => [((x * renderedW + offsetX) / w) * 100, ((y * renderedH + offsetY) / h) * 100];
    const toPath = points => `M${points.map(([x,y]) => `${(x/100).toFixed(5)},${(y/100).toFixed(5)}`).join(' L')} Z`;
    const left = layout.left.map(map);
    const right = layout.left.map(([x,y]) => map([1 - x,y]));
    const clip = points => `polygon(${points.map(([x,y]) => `${x.toFixed(3)}% ${y.toFixed(3)}%`).join(',')})`;
    const figures = layout.figures.map(points => points.map(map));
    panels[0].style.clipPath = clip(left);
    panels[1].style.clipPath = clip(right);
    panels[0].style.transformOrigin = `${map(layout.hinge)[0].toFixed(3)}% 55%`;
    panels[1].style.transformOrigin = `${map([1-layout.hinge[0],layout.hinge[1]])[0].toFixed(3)}% 55%`;
    const doorway = [ ...left, ...right.slice(1,-1).reverse() ];
    overlay.querySelector('.v35-doorway').style.mask = 'url(#v35-doorway-mask)';
    overlay.querySelector('.v35-doorway').style.webkitMask = 'url(#v35-doorway-mask)';
    const masks = overlay.querySelector('.v35-mask-defs');
    const paths = {
      left: left,
      right: right,
      portal: doorway
    };
    for (const name of ['left','right','portal']) {
      masks.querySelector(`[data-door-mask="${name}"]`)?.setAttribute('d',toPath(paths[name]));
      masks.querySelector(`[data-figure-mask="${name}"]`)?.setAttribute('d',figures.map(toPath).join(' '));
    }
    panels[0].style.mask = 'url(#v35-door-left-mask)';
    panels[0].style.webkitMask = 'url(#v35-door-left-mask)';
    panels[1].style.mask = 'url(#v35-door-right-mask)';
    panels[1].style.webkitMask = 'url(#v35-door-right-mask)';
    overlay.querySelector('.v35-doorway').style.clipPath = clip(doorway);
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
      await delay(120);
      if (phase === 'opening' && sequence === run) finish(true);
      return;
    }
    overlay.classList.add('v35-unlocking');
    await delay(340);
    if (phase !== 'opening' || sequence !== run) return;
    overlay.classList.add('v35-door-active');
    await delay(180);
    if (phase !== 'opening' || sequence !== run) return;
    overlay.classList.add('v35-doors-opening');
    await Promise.all(panels.map(panel => motionEnd(panel, 'transitionend', 'transform', 1120)));
    if (phase !== 'opening' || sequence !== run) return;
    overlay.classList.add('v35-is-zooming');
    await motionEnd(stage, 'transitionend', 'transform', 1150);
    if (phase !== 'opening' || sequence !== run) return;
    overlay.classList.add('v35-is-blasting');
    burstSound();
    await motionEnd(blast, 'animationend', null, 1300);
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
    fitDoorLayers();
  };
  fitViewport();
  overlay.querySelector('.v35-welcome-art').addEventListener('load', fitDoorLayers, { passive: true });
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
