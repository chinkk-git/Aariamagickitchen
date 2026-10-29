(() => {
  const HOME_KEY = 'aaria.v35.homeExperience';
  const MUTE_KEY = 'aaria.v35.wonderlandMuted';
  const storage = {
    get(key) { try { return localStorage.getItem(key); } catch { return null; } },
    set(key, value) { try { localStorage.setItem(key, value); } catch {} }
  };
  const homeChoice = () => {
    const saved = storage.get(HOME_KEY);
    if (saved === 'magical' || saved === 'wonderland') return saved;
    return storage.get('aaria.v34.homeStyle') === 'magical' ? 'magical' : 'wonderland';
  };
  const isPortuguese = () => typeof state !== 'undefined' && state.language === 'pt-BR';
  const translate = (en, pt) => isPortuguese() ? pt : en;
  const previousHome = typeof home === 'function' ? home : window.home;
  if (typeof previousHome !== 'function') return;

  function mapMarkup() {
    const pt = isPortuguese();
    const destinations = [
      ['recipes','Explore All Recipes','Explorar todas as receitas','page','recipes'],
      ['world','Explore Recipes Around the World','Explorar Receitas pelo Mundo','travel','world'],
      ['week','Spin My Week','Gire Minha Semana','wheel','week'],
      ['family','Cook with Family','Cozinhar com a Família','welcome','family'],
      ['friends','Cook with Friends','Cozinhar com Amigos','friends','friends'],
      ['surprise','Surprise Me','Surpreenda-me','chest','surprise'],
      ['creations','My Creations','Minhas Criações','camera','creations'],
      ['planner','Planner','Planejador','calendar','planner'],
      ['settings','Settings','Configurações','sparkle','settings']
    ];
    const buttons = destinations.map(([id,en,br,effect,route]) =>
      `<button class="fw-hotspot fw-dest-${id}" type="button" data-fw="${route}" data-effect="${effect}" aria-label="${pt?br:en}" title="${pt?br:en}"><span class="fw-hotspot-copy" aria-hidden="true">${pt?br:en}</span></button>`).join('');
    const imageAlt = pt
      ? 'Mapa ilustrado do País das Maravilhas da Comida, com Aaria, seu gatinho, castelos de comida, globo, pontes e cachoeiras.'
      : 'Illustrated Food Wonderland map with Aaria, her kitten, food castles, a globe, bridges and waterfalls.';
    return `<main class="fw-shell" aria-label="${translate('Magical Food Wonderland','País das Maravilhas da Comida')}">
      <h1 class="fw-visually-hidden">${translate('Magical Food Wonderland','País das Maravilhas da Comida')}</h1>
      <div class="fw-world" id="foodWonderland" data-language="${pt?'pt':'en'}">
        <div class="fw-artwork-plane"><picture class="fw-scene-art"><source media="(orientation: landscape) and (max-aspect-ratio: 7/4)" srcset="./food-wonderland-landscape-standard-clean.webp"><source media="(orientation: landscape)" srcset="./food-wonderland-landscape-clean.webp"><img src="./food-wonderland-portrait-clean.webp" alt="${imageAlt}" draggable="false"></picture>
        <div class="fw-atmosphere" aria-hidden="true"><i class="fw-cloud fw-cloud-a"></i><i class="fw-cloud fw-cloud-b"></i><i class="fw-water-glint"></i><i class="fw-window-glow fw-window-family"></i><i class="fw-window-glow fw-window-friends"></i><div class="fw-globe-frame v34-hero-globe" role="img" aria-label="The spinning World Map globe"><span class="v34-globe-orbit" aria-hidden="true"></span></div><img class="fw-wheel" src="./food-wonderland-wheel.webp" alt="" draggable="false"><i class="fw-chest-light"></i><img class="fw-chest-lid" src="./food-wonderland-chest-lid.png" alt="" draggable="false"><i class="fw-camera-flash"></i><span class="fw-polaroid"><img src="./food-wonderland-dish-photo.png" alt="" draggable="false"></span><i class="fw-book-page"></i><i class="fw-cottage-door fw-door-family"></i><i class="fw-cottage-door fw-door-friends"></i><i class="fw-calendar-flip"></i><span class="fw-sparkles"></span><span class="fw-coins"></span><span class="fw-butterfly fw-butterfly-a"><svg viewBox="0 0 30 24"><g class="fw-wings"><ellipse cx="9" cy="8" rx="8" ry="7" fill="#bea4ff"/><ellipse cx="22" cy="8" rx="8" ry="7" fill="#a8e8ff"/><ellipse cx="10" cy="17" rx="6" ry="5" fill="#efb2f8"/><ellipse cx="21" cy="17" rx="6" ry="5" fill="#ffe0a1"/></g><path d="M15 4v17" stroke="#573e69" stroke-width="2"/></svg></span><span class="fw-butterfly fw-butterfly-b"><svg viewBox="0 0 30 24"><g class="fw-wings"><ellipse cx="9" cy="8" rx="8" ry="7" fill="#ffb8d5"/><ellipse cx="22" cy="8" rx="8" ry="7" fill="#b8f0d7"/><ellipse cx="10" cy="17" rx="6" ry="5" fill="#ffd6a1"/><ellipse cx="21" cy="17" rx="6" ry="5" fill="#d9c4ff"/></g><path d="M15 4v17" stroke="#573e69" stroke-width="2"/></svg></span><span class="fw-arrival" role="status" aria-live="polite"></span></div>
        <div class="fw-hotspots" aria-label="${translate('Choose a destination','Escolha um destino')}">${buttons}</div>
        </div>
        <button class="fw-mute" type="button" aria-label="${translate('Mute sound effects','Silenciar efeitos sonoros')}" aria-pressed="false"><span aria-hidden="true">♪</span></button>
        <div class="fw-proxies" aria-hidden="true">
          <button type="button" data-nav="library"></button><button type="button" data-nav="settings"></button><button type="button" data-nav="week"></button><button type="button" data-nav="family"></button><button type="button" data-nav="friends"></button><button type="button" data-nav="creations"></button><button type="button" data-nav="groceries"></button><button type="button" data-nav="stories"></button><button type="button" data-nav="rewards"></button><button type="button" data-action="open-week-wheel"></button><button type="button" data-action="open-wheel"></button><button type="button" data-action="favorites"></button>
        </div>
      </div>
      <nav class="fw-more" aria-label="${translate('Home tools','Ferramentas da página inicial')}">
        <button class="fw-favorites-button" type="button" data-fw="favorites" aria-label="${translate('Favourites','Favoritos')}" title="${translate('Favourites','Favoritos')}"><span aria-hidden="true">☆</span></button>
        <button class="fw-utility-toggle" type="button" aria-expanded="false" aria-controls="fw-utility-links" aria-label="${translate('Open home tools','Abrir ferramentas da página inicial')}" title="${translate('More home tools','Mais ferramentas da página inicial')}"><span aria-hidden="true">✦</span></button>
        <div class="fw-utility-links" id="fw-utility-links" role="group" aria-label="${translate('More home tools','Mais ferramentas da página inicial')}" hidden>
          <button type="button" data-fw="settings">${translate('Settings','Configurações')}</button>
          <button type="button" data-fw="planner">${translate('Planner','Planejador')}</button>
          <button type="button" data-fw="pantry">${translate('Kitchen basket','Cesta da cozinha')}</button>
          <button type="button" data-fw="stories">${translate('Stories & Music','Histórias e Música')}</button>
          <button type="button" data-fw="awards">${translate('Awards','Prêmios')}</button>
        </div>
      </nav>
    </main>`;
  }

  const foodWonderlandHome = function foodWonderlandHome() {
    if (homeChoice() === 'magical') return previousHome();
    return mapMarkup();
  };
  try { home = foodWonderlandHome; } catch { window.home = foodWonderlandHome; }

  const reducedMotion = () => matchMedia('(prefers-reduced-motion: reduce)').matches;
  let audioContext = null;
  let lastSoundAt = 0;
  const muted = () => storage.get(MUTE_KEY) === 'true';
  function sound(kind) {
    if (muted() || Date.now() - lastSoundAt < 180) return;
    lastSoundAt = Date.now();
    try {
      audioContext ||= new (window.AudioContext || window.webkitAudioContext)();
      if (audioContext.state === 'suspended') audioContext.resume().catch(() => {});
      const ctx = audioContext;
      const plans = {
        sparkle: [[720,.12,0,'sine',.018],[1010,.14,.07,'sine',.015]],
        wheel: [[330,.14,0,'triangle',.018],[450,.15,.12,'triangle',.018],[620,.2,.24,'sine',.016],[940,.32,.4,'sine',.014]],
        chest: [[280,.18,0,'triangle',.022],[440,.22,.11,'sine',.02],[720,.25,.24,'sine',.017],[1050,.32,.38,'sine',.014]],
        camera: [[1180,.055,0,'triangle',.014],[760,.15,.08,'sine',.014]],
        page: [[540,.12,0,'sine',.015],[690,.17,.09,'sine',.013]],
        travel: [[240,.35,0,'triangle',.016],[360,.42,.08,'sine',.014],[610,.38,.2,'sine',.012]],
        cottage: [[360,.22,0,'sine',.018],[510,.22,.12,'sine',.016]],
        friends: [[520,.18,0,'triangle',.018],[690,.18,.09,'sine',.016],[890,.2,.18,'sine',.013]]
      };
      for (const [frequency,duration,delay,wave,volume] of plans[kind] || plans.sparkle) {
        const start=ctx.currentTime+delay, oscillator=ctx.createOscillator(), gain=ctx.createGain();
        oscillator.type=wave; oscillator.frequency.setValueAtTime(frequency,start);
        gain.gain.setValueAtTime(.0001,start); gain.gain.exponentialRampToValueAtTime(volume,start+.018); gain.gain.exponentialRampToValueAtTime(.0001,start+duration);
        oscillator.connect(gain); gain.connect(ctx.destination); oscillator.start(start); oscillator.stop(start+duration+.025);
      }
    } catch { /* Browsers may block audio; navigation and animations still work. */ }
  }

  function updateMuteButton() {
    const button=document.querySelector('.fw-mute'); if(!button)return;
    const isMuted=muted(); button.setAttribute('aria-pressed',String(isMuted));
    button.setAttribute('aria-label',translate(isMuted?'Turn sound effects on':'Mute sound effects',isMuted?'Ativar efeitos sonoros':'Silenciar efeitos sonoros'));
    button.innerHTML=`<span aria-hidden="true">${isMuted?'♪̸':'♪'}</span>`;
  }
  function addParticles(kind='sparkle',count=18) {
    const world=document.getElementById('foodWonderland'); if(!world)return;
    const layer=world.querySelector('.fw-sparkles'); if(!layer)return;
    const rect=world.getBoundingClientRect();
    for(let i=0;i<count;i++){
      const dot=document.createElement('i'); dot.className=kind==='coin'?'fw-coin':'fw-burst';
      const cx=kind==='coin'?78:50,cy=kind==='coin'?49:50;
      dot.style.left=(cx+(Math.random()-.5)*8)+'%'; dot.style.top=cy+'%';
      dot.style.setProperty('--dx',((Math.random()-.5)*(kind==='coin'?210:150))+'px');
      dot.style.setProperty('--dy',(kind==='coin'?(35+Math.random()*150):((Math.random()-.5)*160))+'px');
      dot.style.setProperty('--delay',(Math.random()*.25)+'s'); layer.appendChild(dot);
      setTimeout(()=>dot.remove(),kind==='coin'?1900:1100);
    }
  }
  function destinationAction(route) {
    const world=document.getElementById('foodWonderland');
    const proxy=key=>world?.querySelector(`[data-nav="${key}"]`)?.click();
    const action=key=>world?.querySelector(`[data-action="${key}"]`)?.click();
    if(route==='settings') return proxy('settings');
    if(route==='world') { if(typeof window.v34EnterGlobeFirst==='function') window.v34EnterGlobeFirst(true); else goto('world'); return; }
    if(route==='recipes') return proxy('library');
    if(route==='week') return action('open-week-wheel');
    if(route==='family'||route==='friends'||route==='creations') return proxy(route);
    if(route==='surprise') return action('open-wheel');
    if(route==='planner') return proxy('week');
    if(route==='favorites') return action('favorites');
    if(route==='pantry') return proxy('groceries');
    if(route==='stories') return proxy('stories');
    if(route==='awards') return proxy('rewards');
  }
  const timing={week:reducedMotion()?50:1450, surprise:reducedMotion()?50:1050, creations:reducedMotion()?50:1000, recipes:reducedMotion()?50:850, world:reducedMotion()?50:950, family:reducedMotion()?50:720, friends:reducedMotion()?50:720, planner:reducedMotion()?50:800, favorites:reducedMotion()?50:620, settings:reducedMotion()?50:250, pantry:reducedMotion()?50:250, stories:reducedMotion()?50:250, awards:reducedMotion()?50:250};
  const sounds={week:'wheel',surprise:'chest',creations:'camera',recipes:'page',world:'travel',family:'cottage',friends:'friends',planner:'page',favorites:'sparkle',settings:'sparkle',pantry:'page',stories:'sparkle',awards:'sparkle'};
  let busy=false;
  function animateHotspot(button) {
    if(busy)return; busy=true;
    const world=document.getElementById('foodWonderland'),route=button.dataset.fw,effect=button.dataset.effect;
    world?.classList.add('fw-action-'+effect);
    button.classList.add('is-active'); sound(sounds[route]||'sparkle');
    if(route==='surprise')addParticles('coin',30); else addParticles('sparkle',route==='week'?22:16);
    const status=world?.querySelector('.fw-arrival'); if(status)status.textContent=button.getAttribute('aria-label')||'';
    setTimeout(()=>{
      world?.classList.remove('fw-action-'+effect); button.classList.remove('is-active'); busy=false;
      destinationAction(route);
    },timing[route]||500);
  }
  document.addEventListener('click',event=>{
    const toggle=event.target.closest('.fw-utility-toggle');
    const toolsNav=toggle?.closest('.fw-more');
    const menu=toolsNav?.querySelector('.fw-utility-links');
    if(toggle&&menu){event.preventDefault();const open=toggle.getAttribute('aria-expanded')!=='true';toggle.setAttribute('aria-expanded',String(open));menu.hidden=!open;toggle.setAttribute('aria-label',translate(open?'Close home tools':'Open home tools',open?'Fechar ferramentas da página inicial':'Abrir ferramentas da página inicial'));return;}
    const moreMenu=document.querySelector('.fw-utility-links');
    if(moreMenu&&!event.target.closest('.fw-more')&&!moreMenu.hidden)closeUtilityMenu();
    const mute=event.target.closest('.fw-mute');
    if(mute){event.preventDefault();storage.set(MUTE_KEY,String(!muted()));updateMuteButton();if(!muted())sound('sparkle');return;}
    const hotspot=event.target.closest('[data-fw]');
    if(hotspot){event.preventDefault();if(hotspot.closest('.fw-utility-links'))closeUtilityMenu();animateHotspot(hotspot);}
  },true);
  function closeUtilityMenu(){const menu=document.querySelector('.fw-utility-links'),toggle=document.querySelector('.fw-utility-toggle');if(!menu||menu.hidden)return;menu.hidden=true;toggle?.setAttribute('aria-expanded','false');toggle?.setAttribute('aria-label',translate('Open home tools','Abrir ferramentas da página inicial'));}
  document.addEventListener('keydown',event=>{if(event.key==='Escape'){const toggle=document.querySelector('.fw-utility-toggle');closeUtilityMenu();toggle?.focus({preventScroll:true});}});

  let activeArtWorld=null,artResizeObserver=null;
  const px=(value,fallback)=>{const n=Number.parseFloat(value);return Number.isFinite(n)?n:fallback;};
  function fitArtPlane(){
    const world=activeArtWorld;
    const image=world?.querySelector('.fw-scene-art img');
    const plane=world?.querySelector('.fw-artwork-plane');
    if(!world||!image?.naturalWidth||!image.naturalHeight||!plane)return;
    const viewportWidth=world.clientWidth,viewportHeight=world.clientHeight;
    if(!viewportWidth||!viewportHeight)return;
    const scale=Math.max(viewportWidth/image.naturalWidth,viewportHeight/image.naturalHeight);
    const planeWidth=image.naturalWidth*scale,planeHeight=image.naturalHeight*scale;
    plane.style.width=planeWidth+'px';
    plane.style.height=planeHeight+'px';
    const globe=world.querySelector('.fw-globe-frame.v34-hero-globe');
    if(globe){
      globe.style.removeProperty('background-size');
      globe.style.removeProperty('background-position');
      const globeStyle=getComputedStyle(globe),factor=planeWidth/viewportWidth;
      const sizes=globeStyle.backgroundSize.split(/\s+/);
      const positions=globeStyle.backgroundPosition.split(/\s+/);
      const sw=px(sizes[0],viewportWidth),sh=px(sizes[1],sw);
      const x=px(positions[0],0),y=px(positions[1],0);
      globe.style.backgroundSize=(sw*factor)+'px '+(sh*factor)+'px';
      globe.style.backgroundPosition=(x*factor)+'px '+(y*factor)+'px';
    }
  }
  window.addEventListener('resize',fitArtPlane,{passive:true});
  window.visualViewport?.addEventListener('resize',fitArtPlane,{passive:true});
  if('ResizeObserver' in window)artResizeObserver=new ResizeObserver(fitArtPlane);
  function syncHome() {
    const app=document.querySelector('.app'),active=typeof view!=='undefined'&&view==='home'&&homeChoice()==='wonderland';
    app?.classList.toggle('food-wonderland-active',active);
    if(active) { const screen=document.getElementById('screen'); if(screen?.scrollTop) screen.scrollTop=0; }
    document.querySelector('#nav.bottom')?.removeAttribute('data-scroll-hidden');
    const world=document.getElementById('foodWonderland');
    if(world){
      activeArtWorld=world;
      const artImage=world.querySelector('.fw-scene-art img');
      if(artImage&&!artImage.dataset.artFitBound){
        artImage.dataset.artFitBound='true';
        artImage.addEventListener('load',fitArtPlane,{passive:true});
      }
      artResizeObserver?.disconnect();
      if(artResizeObserver)artResizeObserver.observe(world);
      fitArtPlane();
    }
    if(world&&!world.dataset.ambientReady){
      world.dataset.ambientReady='true';
      const layer=world.querySelector('.fw-sparkles');
      for(let i=0;i<14;i++){const star=document.createElement('i');star.className='fw-twinkle';star.style.left=(8+Math.random()*84)+'%';star.style.top=(5+Math.random()*82)+'%';star.style.setProperty('--twinkle-delay',(-Math.random()*5)+'s');star.style.setProperty('--twinkle-duration',(2.5+Math.random()*3.5)+'s');layer?.appendChild(star);}
      if('IntersectionObserver' in window){const observer=new IntersectionObserver(entries=>world.classList.toggle('fw-paused',!entries[0]?.isIntersecting));observer.observe(world);}
    }
    updateMuteButton();
  }
  const previousRender=typeof render==='function'?render:window.render;
  if(typeof previousRender==='function'){
    const enhancedRender=function(...args){const value=previousRender.apply(this,args);syncHome();return value;};
    try { render = enhancedRender; } catch { window.render = enhancedRender; }
  }
  syncHome();
  if(typeof view!=='undefined'&&view==='home'){
    if(typeof render==='function')render(); else window.render?.();
  }
})();
