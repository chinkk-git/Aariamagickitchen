/* V3.4 APK-only home experience. This file is appended after the shared V3 layer. */
(() => {
  'use strict';
  const STYLE_KEY = 'aaria.v34.homeStyle';
  const PHOTO_DB = 'aaria-v34-local-creation-photos';
  const PHOTO_STORE = 'photos';
  const reduced = () => Boolean(state.reducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const pt = () => state.language === 'pt-BR';
  const t = (en, br) => pt() ? br : en;
  const homeStyle = () => {
    try { return localStorage.getItem(STYLE_KEY) === 'magical' ? 'magical' : 'classic'; }
    catch { return 'classic'; }
  };
  const writeHomeStyle = value => {
    try { localStorage.setItem(STYLE_KEY, value === 'magical' ? 'magical' : 'classic'); }
    catch { notice(t('Home style could not be saved on this device.', 'Não foi possível salvar o estilo da página neste dispositivo.')); }
  };
  const creationIds = () => [...new Set([
    ...(Array.isArray(state.myCreations) ? state.myCreations.map(item => Number(typeof item === 'object' ? item.recipeId : item)) : []),
    ...(Array.isArray(state.done) ? state.done.map(Number) : [])
  ])].filter(id => find(id));
  let activeActivity = 0;
  let lastSurprise = null;
  let photoUrls = [];
  let photoDbPromise;

  function openPhotoDb() {
    if (!window.indexedDB) return Promise.resolve(null);
    if (!photoDbPromise) photoDbPromise = new Promise(resolve => {
      const request = indexedDB.open(PHOTO_DB, 1);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(PHOTO_STORE)) db.createObjectStore(PHOTO_STORE, { keyPath: 'recipeId' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    });
    return photoDbPromise;
  }
  async function storeCreationPhoto(recipeId, blob) {
    const db = await openPhotoDb();
    if (!db || !blob) return;
    await new Promise(resolve => {
      const transaction = db.transaction(PHOTO_STORE, 'readwrite');
      transaction.objectStore(PHOTO_STORE).put({ recipeId: Number(recipeId), blob, savedAt: Date.now() });
      transaction.oncomplete = transaction.onerror = transaction.onabort = resolve;
    });
  }
  async function listCreationPhotos() {
    const db = await openPhotoDb();
    if (!db) return [];
    return new Promise(resolve => {
      const request = db.transaction(PHOTO_STORE, 'readonly').objectStore(PHOTO_STORE).getAll();
      request.onsuccess = () => resolve(Array.isArray(request.result) ? request.result : []);
      request.onerror = () => resolve([]);
    });
  }
  function activityAction(index) {
    if (index === 0) openWheel('week');
    else if (index === 1) goto('family');
    else if (index === 2) goto('friends');
    else { v31SelectedCountry = 'IND'; goto('world'); }
  }
  const activities = () => [
    { title: t('Spin My Week', 'Monte minha semana'), sub: t('Pick seven tasty adventures', 'Escolha sete aventuras saborosas'), art: '📅', kind: 'calendar' },
    { title: t('Cook with Family', 'Cozinhar com a família'), sub: t('Make something together', 'Preparem algo juntos'), art: 'family', kind: 'family' },
    { title: t('Cook with Friends', 'Cozinhar com amigos'), sub: t('Share a kitchen adventure', 'Compartilhe uma aventura na cozinha'), art: 'friends', kind: 'friends' },
    { title: t('World Recipes', 'Receitas do mundo'), sub: t('Explore recipes by country', 'Explore receitas por país'), art: 'globe', kind: 'world' }
  ];
  function activityArtwork(item) {
    if (item.kind === 'family') return `<div class="v34-activity-people"><img src="${V31_HOME_WORLD_ART.avatars.mommy}" alt=""><img src="${V31_HOME_WORLD_ART.aaria}" alt=""><img src="${V31_HOME_WORLD_ART.avatars.daddy}" alt=""></div>`;
    if (item.kind === 'friends') return `<div class="v34-activity-people"><img src="${V31_HOME_WORLD_ART.avatars.rohan}" alt=""><img src="${V31_HOME_WORLD_ART.avatars.isha}" alt=""><img src="${V31_HOME_WORLD_ART.avatars.meera}" alt=""></div>`;
    if (item.kind === 'globe') return `<span class="v34-activity-globe" aria-hidden="true">🌍</span>`;
    return `<span class="v34-activity-icon" aria-hidden="true">${item.art}</span>`;
  }
  function recipeTitle(recipe) { return safe(translateText(recipe.title)); }
  function recipeCard(recipe, badge = '') {
    return `<button class="v34-recipe-card" type="button" data-open="${recipe.id}" aria-label="${t('Open', 'Abrir')} ${recipeTitle(recipe)}">${homeDishThumb(recipe)}<span class="v34-card-badge">${badge || recipe.emoji}</span><strong>${recipeTitle(recipe)}</strong></button>`;
  }
  function countryRows() {
    const rows = [
      { code: 'IND', en: 'India', br: 'Índia', flag: '🇮🇳', ids: [51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,69,72,74] },
      { code: 'ITA', en: 'Italy', br: 'Itália', flag: '🇮🇹', ids: [96] },
      { code: 'CHN', en: 'China', br: 'China', flag: '🇨🇳', ids: [99] }
    ];
    return rows.map(row => ({ ...row, recipes: row.ids.map(find).filter(Boolean) })).filter(row => row.recipes.length);
  }
  function section(title, subtitle, content, id) {
    return `<section class="v34-rail-section" aria-labelledby="${id}"><div class="v34-section-heading"><div><h2 id="${id}">${title}</h2><p>${subtitle}</p></div><span aria-hidden="true">${t('Swipe to explore →', 'Deslize para explorar →')}</span></div>${content}</section>`;
  }
  function rail(items, label) {
    return `<div class="v34-rail" role="region" aria-label="${label}" tabindex="0">${items}</div>`;
  }
  function surpriseDialog() {
    const pool = RECIPES.filter(recipe => recipe.active !== false && Array.isArray(recipe.steps) && recipe.steps.length > 0);
    if (!pool.length) return;
    let recipe = pool[Math.floor(Math.random() * pool.length)];
    if (pool.length > 1 && recipe.id === lastSurprise) recipe = pool[(pool.findIndex(item => item.id === recipe.id) + 1) % pool.length];
    lastSurprise = recipe.id;
    document.querySelector('#v34-surprise-dialog')?.remove();
    document.body.insertAdjacentHTML('beforeend', `<div class="v34-modal-backdrop" id="v34-surprise-dialog"><section class="v34-surprise-dialog" role="dialog" aria-modal="true" aria-labelledby="v34-surprise-title"><button class="v34-modal-close" data-v34-close aria-label="${t('Close', 'Fechar')}">×</button><div class="v34-chest-open" aria-hidden="true">✨🎁✨</div><p class="v34-eyebrow">${t('A little kitchen magic', 'Um pouquinho de magia na cozinha')}</p><h2 id="v34-surprise-title">${recipeTitle(recipe)}</h2><div class="v34-surprise-art">${homeDishThumb(recipe)}</div><div class="v34-surprise-actions"><button class="v34-primary" data-v34-cook="${recipe.id}">${t('Let’s cook!', 'Vamos cozinhar!')} ✨</button><button class="v34-secondary" data-v34-again>${t('Try another surprise', 'Tentar outra surpresa')} 🎲</button></div></section></div>`);
    document.querySelector('#v34-surprise-dialog [data-v34-cook]')?.focus({ preventScroll: true });
  }
  function worldCard(row) {
    const lead = row.recipes[0];
    const src = lead ? homeDishThumb(lead) : '';
    return `<button class="v34-country-card" type="button" data-v34-country="${row.code}" aria-label="${t('Explore recipes from', 'Explore receitas de')} ${pt() ? row.br : row.en}"><span class="v34-country-art">${src || '<span>🌎</span>'}</span><strong>${row.flag} ${pt() ? row.br : row.en}</strong><small>${row.recipes.length} ${t('approved recipes', 'receitas aprovadas')}</small></button>`;
  }
  function openCountryRecipes(code) {
    const row = countryRows().find(country => country.code === code);
    if (!row) return;
    const title = pt() ? row.br : row.en;
    document.querySelector('#v34-country-dialog')?.remove();
    document.body.insertAdjacentHTML('beforeend', `<div class="v34-modal-backdrop" id="v34-country-dialog"><section class="v34-country-dialog" role="dialog" aria-modal="true" aria-labelledby="v34-country-title"><button class="v34-modal-close" data-v34-country-close aria-label="${t('Close','Fechar')}">×</button><p class="v34-eyebrow">${t('APPROVED COUNTRY RECIPES','RECEITAS APROVADAS DO PAÍS')}</p><h2 id="v34-country-title">${row.flag} ${title}</h2><div class="v34-country-recipes">${row.recipes.map(recipe => recipeCard(recipe, row.flag)).join('')}</div></section></div>`);
    document.querySelector('#v34-country-dialog [data-open]')?.focus({ preventScroll: true });
  }
  function magicalHome() {
    const ptMode = pt();
    const recipeList = [...RECIPES].filter(r => r.active !== false).sort((a, b) => b.id - a.id).slice(0, 12).reverse();
    const made = creationIds();
    const items = activities();
    const active = Math.min(activeActivity, items.length - 1);
    const createdCards = made.length
      ? made.slice().reverse().map(id => recipeCard(find(id), '💖')).join('')
      : `<div class="v34-empty-creations"><span aria-hidden="true">📸</span><strong>${t('Your kitchen memories will appear here', 'Suas memórias da cozinha aparecerão aqui')}</strong><p>${t('Finish a recipe and save a photo to start your gallery.', 'Conclua uma receita e salve uma foto para começar sua galeria.')}</p><button type="button" data-nav="library">${t('Choose a recipe', 'Escolher uma receita')} →</button></div>`;
    const countries = countryRows();
    return `<div class="v34-home" data-v34-home>
      <header class="v34-hero">
        <button class="v34-settings" data-nav="settings" aria-label="${t('Settings', 'Configurações')}">⚙️</button>
        <div class="v34-hero-copy"><span class="v34-kicker">${t('Cook · Create · Explore · Shine', 'Cozinhe · Crie · Explore · Brilhe')}</span><h1>Aaria’s<br><em>Magical Kitchen</em></h1><p>${t('Let’s make a little magic today!', 'Vamos fazer uma magia hoje!')}</p></div>
        <img class="v34-hero-avatar" src="${V31_HOME_WORLD_ART.aaria}" alt="Aaria, ready for a kitchen adventure">
        <button class="v34-globe-card" data-v34-world aria-label="${t('Open the spinning World Map', 'Abrir o mapa-múndi giratório')}"><span class="v34-globe-art"><img src="${V31_HOME_WORLD_ART.worldMap}" alt=""><span aria-hidden="true">✨</span></span><strong>🌍 ${t('World Map', 'Mapa-múndi')}</strong><small>${t('Spin and explore!', 'Gire e explore!')}</small></button>
      </header>
      <section class="v34-activity-section" aria-label="${t('Choose a kitchen adventure', 'Escolha uma aventura na cozinha')}"><div class="v34-section-heading"><div><h2>✨ ${t('Pick an adventure', 'Escolha uma aventura')}</h2><p>${t('Swipe to see what we can do!', 'Deslize para ver o que podemos fazer!')}</p></div><div class="v34-carousel-controls"><button type="button" data-v34-prev aria-label="${t('Previous activity', 'Atividade anterior')}">‹</button><button type="button" data-v34-next aria-label="${t('Next activity', 'Próxima atividade')}">›</button></div></div>
        <div class="v34-activity-viewport" data-v34-activity-viewport tabindex="0" aria-label="${t('Activity carousel. Swipe or use the arrows.', 'Carrossel de atividades. Deslize ou use as setas.')}"><div class="v34-activity-track">${items.map((item,index) => `<button type="button" class="v34-activity-card${index===active?' is-active':''}" data-v34-activity="${index}" aria-label="${item.title}. ${item.sub}">${activityArtwork(item)}<strong>${item.title}</strong><small>${item.sub}</small></button>`).join('')}</div></div>
        <div class="v34-carousel-dots" aria-label="${t('Activity selection', 'Seleção de atividade')}">${items.map((item,index)=>`<button type="button" class="${index===active?'is-active':''}" data-v34-activity="${index}" aria-label="${t('Show', 'Mostrar')} ${item.title}"></button>`).join('')}</div>
      </section>
      <button class="v34-surprise" type="button" data-v34-surprise><span class="v34-chest" aria-hidden="true">🎁</span><span><strong>${t('Surprise Me!', 'Surpreenda-me!')}</strong><small>${t('Open a magical recipe just for you', 'Abra uma receita mágica só para você')}</small></span><b aria-hidden="true">✨</b></button>
      ${section('⭐ '+t('New Recipes', 'Receitas novas'),t('Fresh ideas from Aaria’s recipe book', 'Novas ideias do livro de receitas da Aaria'),rail(recipeList.map(r=>recipeCard(r, r.id>95?'NEW':'✨')).join(''),t('New recipes, horizontal list', 'Receitas novas, lista horizontal')),'v34-new-title')}
      ${section('💖 '+t('What I Made!', 'O que eu fiz!'),t('Kitchen memories saved on this device', 'Memórias da cozinha salvas neste dispositivo'),`<div class="v34-rail" role="region" aria-label="${t('My creations, horizontal list', 'Minhas criações, lista horizontal')}" tabindex="0" data-v34-photo-rail>${createdCards}</div>`,'v34-made-title')}
      ${section('🌎 '+t('Recipes Around the World', 'Receitas pelo mundo'),t('Visit countries with recipes in this kitchen', 'Visite países com receitas nesta cozinha'),rail(countries.map(worldCard).join(''),t('Countries with approved recipes', 'Países com receitas aprovadas')),'v34-world-title')}
    </div>`;
  }
  function v34SettingsPage() {
    const original = v34OriginalSettingsPage();
    const choice = homeStyle();
    const panel = `<section class="v34-home-style" aria-labelledby="v34-style-title"><h2 id="v34-style-title">🏠 ${t('My Home Style', 'Meu estilo de página inicial')}</h2><p>${t('Choose how your kitchen home looks. Your choice stays on this device.', 'Escolha como será a página inicial da sua cozinha. Sua escolha fica salva neste dispositivo.')}</p><div class="v34-style-options"><button type="button" class="v34-style-option ${choice==='classic'?'is-selected':''}" data-v34-style="classic" aria-pressed="${choice==='classic'}"><span class="v34-style-preview classic-preview">📖 ⭐ 🧺</span><strong>${t('Classic Kitchen', 'Cozinha clássica')}</strong><small>${t('The current V3.3 home', 'A página inicial atual da V3.3')}</small></button><button type="button" class="v34-style-option ${choice==='magical'?'is-selected':''}" data-v34-style="magical" aria-pressed="${choice==='magical'}"><span class="v34-style-preview magical-preview">✨ 🌍 🎁</span><strong>${t('Magical Adventure', 'Aventura mágica')}</strong><small>${t('Explore a new magical home', 'Explore uma nova página inicial mágica')}</small></button></div><p class="v34-style-status" role="status">${t('Current style:', 'Estilo atual:')} <strong>${choice==='magical'?t('Magical Adventure','Aventura mágica'):t('Classic Kitchen','Cozinha clássica')}</strong></p></section>`;
    return original.replace('<section class="home-subpage">', `<section class="home-subpage">${panel}`);
  }
  const v34OriginalHome = home;
  const v34OriginalSettingsPage = settingsPage;
  const classicNavigationHTML = document.getElementById('nav')?.innerHTML || '';
  home = function v34HomeSelector() { return homeStyle() === 'magical' ? magicalHome() : v34OriginalHome(); };
  settingsPage = v34SettingsPage;

  function updateCarousel(index, shouldScroll = true) {
    const cards = [...document.querySelectorAll('[data-v34-activity]')].filter(el => el.classList.contains('v34-activity-card'));
    if (!cards.length) return;
    activeActivity = (index + cards.length) % cards.length;
    cards.forEach((card, i) => card.classList.toggle('is-active', i === activeActivity));
    document.querySelectorAll('.v34-carousel-dots [data-v34-activity]').forEach((dot, i) => dot.classList.toggle('is-active', i === activeActivity));
    if (shouldScroll) cards[activeActivity].scrollIntoView({ behavior: reduced() ? 'auto' : 'smooth', block: 'nearest', inline: 'center' });
  }
  async function hydratePhotoRail() {
    photoUrls.forEach(url => URL.revokeObjectURL(url)); photoUrls = [];
    const railNode = document.querySelector('[data-v34-photo-rail]');
    if (!railNode) return;
    const photos = await listCreationPhotos();
    if (!photos.length || !railNode.isConnected) return;
    for (const record of photos) {
      const recipe = find(Number(record.recipeId));
      if (!recipe || !(record.blob instanceof Blob)) continue;
      const card = railNode.querySelector(`[data-open="${Number(record.recipeId)}"]`);
      if (!card) continue;
      const url = URL.createObjectURL(record.blob); photoUrls.push(url);
      card.querySelector('.home-thumb')?.remove();
      let image = card.querySelector('.v34-home-photo');
      if (!image) { image = document.createElement('img'); image.className = 'v34-home-photo'; image.alt = t(`Photo of ${recipe.title} made by Aaria`, `Foto de ${recipe.title} preparada pela Aaria`); card.prepend(image); }
      image.src = url;
    }
  }
  const v34BaseRender = render;
  render = function v34RenderHome() {
    const result = v34BaseRender.apply(this, arguments);
    const app = document.querySelector('.app');
    const magical = homeStyle() === 'magical';
    app?.classList.toggle('v34-magical', magical);
    app?.classList.toggle('v34-home-active', magical && view === 'home');
    v34SyncNavigation(magical);
    if (magical && view === 'home') {
      updateCarousel(activeActivity, false);
      void hydratePhotoRail();
    }
    return result;
  };
  function v34SyncNavigation(magical) {
    const nav = document.getElementById('nav');
    if (!nav) return;
    if (!magical) {
      if (nav.dataset.v34Magical === 'true') {
        nav.innerHTML = classicNavigationHTML;
        delete nav.dataset.v34Magical;
        const labels = pt() ? ['Início','Receitas','Aventura','Despensa','Planejar','Criações'] : ['Home','Recipes','World Adventure','Magic Pantry','Planner','My Creations'];
        labels.forEach((label,index) => {
          const tab = nav.querySelectorAll('.tab')[index]; if (tab?.lastChild?.nodeType === Node.TEXT_NODE) tab.lastChild.textContent = label;
        });
      }
      return;
    }
    if (nav.dataset.v34Magical !== 'true') {
      nav.dataset.v34Magical = 'true';
      nav.innerHTML = `<button class="tab" data-nav="home"><b>🏠</b>${t('Home','Início')}</button><button class="tab" data-nav="library"><b>📖</b>${t('All Recipes','Todas')}</button><button class="tab" data-nav="world"><b>🌍</b>${t('World','Mundo')}</button><button class="tab" data-nav="creations"><b>💖</b>${t('My Creations','Criações')}</button><button class="tab" data-nav="groceries"><b>🧺</b>${t('Magic Pantry','Despensa')}</button>`;
    } else {
      const labels = pt() ? ['Início','Todas','Mundo','Criações','Despensa'] : ['Home','All Recipes','World','My Creations','Magic Pantry'];
      nav.querySelectorAll('.tab').forEach((tab,index) => { if (tab.lastChild?.nodeType === Node.TEXT_NODE) tab.lastChild.textContent = labels[index] || ''; });
    }
  }
  document.addEventListener('click', event => {
    const styleButton = event.target.closest('[data-v34-style]');
    if (styleButton) { event.preventDefault(); writeHomeStyle(styleButton.dataset.v34Style); goto('home'); return; }
    const activity = event.target.closest('[data-v34-activity]');
    if (activity) {
      event.preventDefault(); event.stopImmediatePropagation();
      const index = Number(activity.dataset.v34Activity); updateCarousel(index);
      if (activity.classList.contains('v34-activity-card')) activityAction(index);
      return;
    }
    if (event.target.closest('[data-v34-prev]')) { event.preventDefault(); updateCarousel(activeActivity - 1); return; }
    if (event.target.closest('[data-v34-next]')) { event.preventDefault(); updateCarousel(activeActivity + 1); return; }
    if (event.target.closest('[data-v34-world]')) { event.preventDefault(); v31SelectedCountry='IND'; goto('world'); return; }
    if (event.target.closest('[data-v34-surprise]')) { event.preventDefault(); surpriseDialog(); return; }
    if (event.target.closest('[data-v34-again]')) { event.preventDefault(); surpriseDialog(); return; }
    if (event.target.closest('[data-v34-close]')) { event.preventDefault(); document.querySelector('#v34-surprise-dialog')?.remove(); return; }
    if (event.target.closest('[data-v34-country-close]')) { event.preventDefault(); document.querySelector('#v34-country-dialog')?.remove(); return; }
    const cook = event.target.closest('[data-v34-cook]');
    if (cook) { event.preventDefault(); document.querySelector('#v34-surprise-dialog')?.remove(); openRecipe(Number(cook.dataset.v34Cook)); return; }
    const country = event.target.closest('[data-v34-country]');
    if (country) { event.preventDefault(); openCountryRecipes(country.dataset.v34Country); return; }
  }, true);
  document.addEventListener('change', event => {
    const input = event.target.closest('[data-share-photo]');
    const file = input?.files?.[0];
    if (file && file.type.startsWith('image/')) void storeCreationPhoto(Number(input.dataset.sharePhoto), file).then(() => { if (view === 'home' && homeStyle() === 'magical') void hydratePhotoRail(); });
  }, true);
  document.addEventListener('keydown', event => {
    const viewport = event.target.closest('[data-v34-activity-viewport]');
    if (viewport && ['ArrowLeft','ArrowRight'].includes(event.key)) { event.preventDefault(); updateCarousel(activeActivity + (event.key === 'ArrowRight' ? 1 : -1)); }
  });
  document.addEventListener('scroll', event => {
    const viewport = event.target.closest?.('[data-v34-activity-viewport]');
    if (!viewport || viewport.__v34ScrollQueued) return;
    viewport.__v34ScrollQueued = true;
    requestAnimationFrame(() => {
      viewport.__v34ScrollQueued = false;
      const center = viewport.getBoundingClientRect().left + viewport.clientWidth / 2;
      const cards = [...viewport.querySelectorAll('.v34-activity-card')];
      const nearest = cards.reduce((best, card, index) => {
        const rect = card.getBoundingClientRect();
        return Math.abs(rect.left + rect.width / 2 - center) < best.distance ? { index, distance: Math.abs(rect.left + rect.width / 2 - center) } : best;
      }, { index: 0, distance: Infinity });
      updateCarousel(nearest.index, false);
    });
  }, true);

  document.head.insertAdjacentHTML('beforeend', `<style id="v34-dual-home-style">
  .app.v34-home-active #screen{max-width:1200px;padding-top:10px;padding-bottom:calc(92px + env(safe-area-inset-bottom))}
  .app.v34-magical #nav{position:fixed!important;left:50%!important;right:auto!important;bottom:calc(7px + env(safe-area-inset-bottom))!important;transform:translateX(-50%)!important;width:min(96vw,900px)!important;max-width:none!important;grid-template-columns:repeat(5,minmax(0,1fr))!important;padding:6px 9px!important;border:2px solid #fff!important;border-radius:24px!important;background:linear-gradient(115deg,#fff7ff,#fff8e6)!important;box-shadow:0 6px 22px #49356c38!important;z-index:200!important;opacity:1!important;pointer-events:auto!important}
  .app.v34-magical #nav .tab{display:grid;justify-items:center;align-content:center;gap:3px;min-width:0;min-height:55px;padding:3px 2px;border:0;border-radius:16px;background:transparent;color:#71538e;font-size:clamp(9px,2.5vw,13px);font-weight:900;line-height:1.1;text-align:center}
  .app.v34-magical #nav .tab b{font-size:22px;line-height:1}.app.v34-magical #nav .tab.active{background:#f2d8ff;color:#6729a0}.app.v34-magical #nav .tab:focus-visible,.v34-home button:focus-visible,.v34-home-style button:focus-visible{outline:3px solid #6729a0;outline-offset:2px}
  .v34-home{--v34-purple:#6d2c9b;--v34-pink:#ed4aa8;display:grid;gap:16px;color:#442455;padding:4px 3px 18px}
  .v34-hero{position:relative;isolation:isolate;display:grid;grid-template-columns:minmax(0,1fr) minmax(120px,30%);align-items:center;min-height:265px;overflow:hidden;padding:24px clamp(18px,4vw,38px);border:2px solid #fff;border-radius:30px;background:radial-gradient(circle at 12% 25%,#fff3b5 0 5px,transparent 7px),radial-gradient(circle at 72% 13%,#fff 0 3px,transparent 5px),linear-gradient(120deg,#fff1df 0%,#f5dafa 50%,#d8f2ff 100%);box-shadow:0 9px 0 #d2ace5,0 15px 30px #58336a21}
  .v34-hero:before{content:'';position:absolute;z-index:-1;inset:0;background-image:linear-gradient(#fff8 0 0),url('${V31_HOME_WORLD_ART.kitchen}');background-size:cover;background-position:center;opacity:.27}
  .v34-hero-copy{position:relative;z-index:2;max-width:680px}.v34-kicker,.v34-eyebrow{display:block;color:#7a5397;font-size:clamp(11px,1.4vw,15px);font-weight:950;letter-spacing:.04em}.v34-hero h1{margin:5px 0;color:#74239a;font-family:Georgia,serif;font-size:clamp(34px,6vw,64px);font-weight:1000;line-height:.96;text-shadow:0 2px #fff,0 4px #f8cbee}.v34-hero h1 em{color:#e3429e;font-style:normal}.v34-hero-copy p{margin:8px 0 0;color:#613875;font-size:clamp(14px,2vw,19px);font-weight:850}
  .v34-hero-avatar{z-index:2;width:min(100%,220px);height:245px;justify-self:center;align-self:end;object-fit:contain;object-position:center bottom;filter:drop-shadow(0 9px 8px #69446b35)}.v34-settings{position:absolute;z-index:5;top:12px;right:12px;width:46px;height:46px;border:2px solid #fff;border-radius:16px;background:#fff9;color:#63257f;font-size:23px;box-shadow:0 4px 10px #603d6e32}
  .v34-globe-card{position:absolute;z-index:4;right:12px;top:58px;display:grid;justify-items:center;width:clamp(106px,16vw,156px);padding:8px 8px 10px;border:1.5px solid #fff;border-radius:19px;background:#ffffffd9;color:#57306d;box-shadow:0 4px 13px #57306d26}.v34-globe-art{position:relative;display:block;width:clamp(72px,11vw,112px);aspect-ratio:1;overflow:hidden;border:4px solid #fff;border-radius:50%;background:radial-gradient(circle at 30% 25%,#a5e5ff,#37a8db 55%,#1c72b5);box-shadow:inset -12px -7px 18px #0c427a66,0 4px 9px #4230523b}.v34-globe-art img{width:140%;height:100%;object-fit:cover;object-position:center;mix-blend-mode:screen;opacity:.88;animation:v34-globe-turn 24s linear infinite}.v34-globe-art>span{position:absolute;right:12%;top:15%;font-size:18px;animation:v34-glint 1.8s ease-in-out infinite alternate}.v34-globe-card strong{font-size:clamp(11px,1.5vw,15px)}.v34-globe-card small{color:#755b85;font-size:10px;font-weight:800}
  .v34-activity-section,.v34-rail-section{min-width:0;padding:13px 14px;border:1.5px solid #fff;border-radius:23px;background:linear-gradient(110deg,#fffafd,#fff9e9);box-shadow:0 5px 0 #e6c8ec,0 8px 18px #643d6b14}
  .v34-section-heading{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:10px}.v34-section-heading h2{margin:0;color:#702894;font-size:clamp(18px,3.6vw,26px);line-height:1.05}.v34-section-heading p{margin:4px 0 0;color:#775c86;font-size:clamp(10px,2vw,13px);font-weight:750}.v34-section-heading>span{flex:none;color:#8a70a1;font-size:10px;font-weight:850}.v34-carousel-controls{display:flex;gap:6px}.v34-carousel-controls button{width:40px;height:40px;border:1px solid #fff;border-radius:50%;background:linear-gradient(145deg,#e4c4ff,#ffa7d8);color:#63227f;font-size:30px;font-weight:950;line-height:1}
  .v34-activity-viewport{overflow-x:auto;overscroll-behavior-x:contain;scrollbar-width:none;scroll-snap-type:x mandatory;padding:5px max(8px,calc((100% - 238px)/2)) 9px}.v34-activity-viewport::-webkit-scrollbar,.v34-rail::-webkit-scrollbar{display:none}.v34-activity-track{display:flex;align-items:stretch;gap:12px;width:max-content}.v34-activity-card{display:grid;grid-template-rows:90px auto auto;justify-items:center;align-content:start;gap:4px;width:238px;min-height:155px;padding:8px;border:2px solid #fff;border-radius:21px;background:linear-gradient(150deg,#f5e7ff,#fff4d9);color:#512d67;box-shadow:0 4px 0 #d6b8e4;scroll-snap-align:center;opacity:.72;transform:scale(.91);transition:transform .2s,opacity .2s,border-color .2s,box-shadow .2s}.v34-activity-card.is-active{border-color:#f8bb3d;box-shadow:0 5px 0 #df9d31,0 8px 16px #9b5d9b35;opacity:1;transform:scale(1)}.v34-activity-card strong{font-size:16px;line-height:1.15}.v34-activity-card small{color:#80638e;font-size:11px;font-weight:800}.v34-activity-icon{display:grid;place-items:center;width:82px;height:82px;border-radius:22px;background:linear-gradient(145deg,#ffe9a3,#fff8e1);font-size:52px;box-shadow:inset 0 0 0 3px #fff}.v34-activity-people{display:flex;align-items:center;justify-content:center;width:100%;height:90px}.v34-activity-people img{width:66px;height:78px;object-fit:contain;filter:drop-shadow(0 3px 3px #65467535)}.v34-activity-people img+img{margin-left:-14px}.v34-activity-globe{display:grid;place-items:center;width:82px;height:82px;border:4px solid #fff;border-radius:50%;background:radial-gradient(circle at 28% 23%,#b7ecff,#48b3e6 53%,#2877b6);font-size:54px;box-shadow:inset -10px -6px 13px #174b794d}
  .v34-carousel-dots{display:flex;justify-content:center;gap:8px;margin:2px auto}.v34-carousel-dots button{width:10px;height:10px;padding:0;border:0;border-radius:99px;background:#d6c0df}.v34-carousel-dots button.is-active{width:27px;background:#9d55c6}
  .v34-surprise{display:flex;align-items:center;justify-content:center;gap:14px;width:100%;min-height:92px;padding:12px 18px;border:2px solid #fff;border-radius:23px;background:linear-gradient(105deg,#f4c7ff,#ffd9a2 48%,#ffb9df);color:#63257e;text-align:left;box-shadow:0 6px 0 #c477bb,0 10px 18px #5c35651d}.v34-surprise .v34-chest{display:grid;place-items:center;width:64px;height:64px;border-radius:20px;background:#ffffff8c;font-size:43px}.v34-surprise strong{display:block;font-size:clamp(20px,4vw,28px)}.v34-surprise small{display:block;color:#74467f;font-size:13px;font-weight:800}.v34-surprise>b{font-size:25px}.v34-surprise:active .v34-chest{animation:v34-chest-pop .35s ease-out}
  .v34-rail{display:flex;gap:10px;min-width:0;overflow-x:auto;overscroll-behavior-x:contain;scrollbar-width:none;scroll-snap-type:x proximity;padding:3px 1px 8px}.v34-recipe-card,.v34-country-card{position:relative;display:flex;flex:0 0 clamp(142px,29vw,206px);flex-direction:column;gap:6px;min-width:0;padding:7px;border:1px solid #f1d4eb;border-radius:18px;background:#fff;color:#4b2b5e;text-align:left;box-shadow:0 3px 10px #573a6617;scroll-snap-align:start}.v34-recipe-card .home-thumb,.v34-country-art{display:block;width:100%;height:clamp(95px,18vw,140px);overflow:hidden;border-radius:13px;background:#f9eefa}.v34-recipe-card .home-thumb img,.v34-country-art img{width:100%;height:100%;object-fit:cover}.v34-recipe-card strong,.v34-country-card strong{font-size:13px;line-height:1.2}.v34-card-badge{position:absolute;top:12px;right:12px;padding:4px 7px;border:1px solid #fff;border-radius:11px;background:#ed51a9;color:#fff;font-size:10px;font-weight:950}.v34-home-photo{display:block;width:100%;height:clamp(95px,18vw,140px);object-fit:cover;border-radius:13px}.v34-country-art{display:grid;place-items:center}.v34-country-card small{color:#755e83;font-size:10px;font-weight:800}.v34-empty-creations{display:grid;justify-items:start;align-content:center;gap:5px;flex:0 0 min(88%,360px);min-height:122px;padding:14px;border:1.5px dashed #d2a6dc;border-radius:17px;background:#fff;color:#68417a}.v34-empty-creations>span{font-size:24px}.v34-empty-creations strong{font-size:13px}.v34-empty-creations p{margin:0;color:#806a8e;font-size:11px}.v34-empty-creations button{min-height:38px;padding:7px 13px;border:0;border-radius:12px;background:#853dae;color:white;font-weight:900}
  .v34-modal-backdrop{position:fixed;z-index:10000;inset:0;display:grid;place-items:center;padding:18px;background:#281239aa}.v34-surprise-dialog{position:relative;width:min(100%,410px);max-height:88dvh;overflow:auto;padding:22px;border:3px solid #fff;border-radius:28px;background:linear-gradient(145deg,#fff2fc,#fff8df);box-shadow:0 16px 50px #20122d66;text-align:center}.v34-modal-close{position:absolute;top:10px;right:10px;width:42px;height:42px;border:0;border-radius:50%;background:#f3dcff;color:#602580;font-size:27px}.v34-chest-open{font-size:45px;animation:v34-chest-pop .45s ease-out}.v34-surprise-dialog h2{margin:5px 0 12px;color:#702894}.v34-surprise-art .home-thumb{height:180px;overflow:hidden;border-radius:18px}.v34-surprise-art .home-thumb img{width:100%;height:100%;object-fit:cover}.v34-surprise-art .home-thumb:not(:has(img)){display:grid;place-items:center;background:#fae8f7;font-size:80px}.v34-surprise-actions{display:grid;gap:8px;margin-top:14px}.v34-primary,.v34-secondary{min-height:48px;border:0;border-radius:15px;font:inherit;font-weight:950}.v34-primary{background:linear-gradient(100deg,#ea4caa,#9145c2);color:white}.v34-secondary{background:#f0e2f7;color:#653884}
  .v34-country-dialog{position:relative;width:min(100%,650px);max-height:88dvh;overflow:auto;padding:22px;border:3px solid #fff;border-radius:26px;background:linear-gradient(145deg,#fff6ff,#fff9e6);box-shadow:0 16px 50px #20122d66}.v34-country-dialog h2{margin:4px 0 14px;color:#702894}.v34-country-recipes{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:10px;max-height:65dvh;overflow:auto}.v34-country-recipes .v34-recipe-card{width:100%;flex:none}
  .v34-home-style{margin:16px 0;padding:16px;border:2px solid #fff;border-radius:22px;background:linear-gradient(115deg,#fff8fe,#fff7e7);box-shadow:0 4px 0 #e2c9e8}.v34-home-style h2{margin:0;color:#702894;font-size:20px}.v34-home-style>p{color:#70587f}.v34-style-options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.v34-style-option{display:grid;justify-items:start;gap:6px;min-height:134px;padding:10px;border:2px solid #e7d6ed;border-radius:17px;background:#fff;color:#513563;text-align:left}.v34-style-option.is-selected{border-color:#9c4ec1;background:#fcf2ff;box-shadow:0 0 0 2px #e6c5f2}.v34-style-preview{display:grid;place-items:center;width:100%;height:53px;border-radius:12px;font-size:24px}.classic-preview{background:linear-gradient(110deg,#fff3dc,#e5f4e7)}.magical-preview{background:linear-gradient(110deg,#f5dcff,#ffe9b8)}.v34-style-option strong{font-size:14px}.v34-style-option small{color:#786588;font-size:11px}.v34-style-status{font-size:12px}.v34-country-card .home-thumb{width:100%;height:100%;margin:0}
  @keyframes v34-globe-turn{to{transform:translateX(-28%)}}@keyframes v34-glint{to{transform:scale(1.25) rotate(15deg);opacity:.65}}@keyframes v34-chest-pop{0%{transform:scale(.6) rotate(-10deg);opacity:.3}65%{transform:scale(1.15) rotate(5deg)}100%{transform:scale(1)}}
  @media(max-width:600px){.app.v34-home-active #screen{padding:6px 8px calc(83px + env(safe-area-inset-bottom))}.v34-home{gap:12px}.v34-hero{grid-template-columns:minmax(0,1fr) 100px;min-height:210px;padding:17px 12px;border-radius:22px}.v34-hero h1{font-size:clamp(27px,8vw,38px)}.v34-hero-avatar{width:110px;height:160px;align-self:end;margin-bottom:0}.v34-settings{top:8px;right:8px;width:39px;height:39px;font-size:19px}.v34-globe-card{top:auto;right:8px;bottom:9px;width:95px;padding:5px}.v34-globe-art{width:59px;border-width:3px}.v34-globe-card strong{font-size:10px}.v34-globe-card small{font-size:9px}.v34-hero-copy{align-self:start;padding-top:21px}.v34-hero-copy p{font-size:12px}.v34-activity-section,.v34-rail-section{padding:10px;border-radius:18px}.v34-activity-card{width:220px;grid-template-rows:78px auto auto;min-height:142px}.v34-activity-people{height:78px}.v34-activity-people img{width:57px;height:69px}.v34-activity-icon,.v34-activity-globe{width:70px;height:70px;font-size:44px}.v34-section-heading>span{font-size:9px}.v34-carousel-controls button{width:34px;height:34px}.v34-surprise{min-height:77px}.v34-surprise .v34-chest{width:52px;height:52px;font-size:35px}.v34-surprise small{font-size:11px}.v34-style-options{grid-template-columns:1fr}.v34-style-option{min-height:108px}.v34-style-preview{height:42px}.app.v34-magical #nav{width:calc(100vw - 12px)!important;bottom:calc(5px + env(safe-area-inset-bottom))!important;padding:4px 3px!important;border-radius:19px!important}.app.v34-magical #nav .tab{min-height:49px;font-size:9px}.app.v34-magical #nav .tab b{font-size:19px}}
  @media(max-height:520px) and (orientation:landscape){.app.v34-home-active #screen{max-width:1320px;padding:8px 16px 78px}.v34-hero{grid-template-columns:minmax(0,1fr) 160px;min-height:180px}.v34-hero-avatar{height:165px;width:155px}.v34-activity-card{grid-template-rows:62px auto auto;min-height:112px;width:205px}.v34-activity-people{height:62px}.v34-activity-people img{height:58px}.v34-activity-icon,.v34-activity-globe{width:58px;height:58px;font-size:37px}.v34-rail-section{padding:9px}.v34-recipe-card{flex-basis:170px}.v34-recipe-card .home-thumb,.v34-home-photo,.v34-country-art{height:84px}}
  @media(prefers-reduced-motion:reduce){.v34-home *,.v34-home *:before,.v34-home *:after{scroll-behavior:auto!important;animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}.v34-activity-viewport{scroll-behavior:auto}}
  </style>`);
  document.addEventListener('DOMContentLoaded', () => {
    v34SyncNavigation(homeStyle() === 'magical');
    if (view === 'home') render();
  }, { once: true });
})();
