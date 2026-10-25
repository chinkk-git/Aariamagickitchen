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
  let suppressActivityClick = false;
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
    const crops = { calendar:[104,448], family:[306,448], friends:[520,448], world:[754,424] };
    const [x,y] = crops[item.kind];
    return `<span class="v34-activity-art" aria-hidden="true" style="background-position:-${(x/1024*100).toFixed(3)}vw -${(y/1024*100).toFixed(3)}vw"></span>`;
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
      <header class="v34-hero" aria-labelledby="v34-brand-title">
        <div class="v34-approved-scene" aria-hidden="true"></div>
        <h1 class="v34-visually-hidden" id="v34-brand-title">Aaria’s Magical Kitchen</h1>
        <button class="v34-settings" data-nav="settings" aria-label="${t('Settings', 'Configurações')}">⚙️</button>
        <button class="v34-globe-hit" data-v34-world aria-label="${t('Open the spinning World Map', 'Abrir o mapa-múndi giratório')}"><span class="v34-globe-orbit" aria-hidden="true"></span></button>
      </header>
      <section class="v34-activity-section" aria-label="${t('Choose a kitchen adventure', 'Escolha uma aventura na cozinha')}">
        <h2 class="v34-visually-hidden">${t('Kitchen adventures', 'Aventuras na cozinha')}</h2>
        <div class="v34-platform" aria-hidden="true"></div>
        <div class="v34-activity-viewport" data-v34-activity-viewport tabindex="0" aria-label="${t('Activity carousel. Swipe or use the arrows.', 'Carrossel de atividades. Deslize ou use as setas.')}"><div class="v34-activity-track">${items.map((item,index) => `<button type="button" class="v34-activity-card${index===active?' is-active':''}" data-v34-activity="${index}" aria-label="${item.title}. ${item.sub}">${activityArtwork(item)}<strong>${item.title}</strong></button>`).join('')}</div></div>
        <div class="v34-carousel-controls"><button type="button" data-v34-prev aria-label="${t('Previous activity', 'Atividade anterior')}">‹</button><button type="button" data-v34-next aria-label="${t('Next activity', 'Próxima atividade')}">›</button></div>
        <div class="v34-carousel-dots" aria-label="${t('Activity selection', 'Seleção de atividade')}">${items.map((item,index)=>`<button type="button" class="${index===active?'is-active':''}" data-v34-activity="${index}" aria-label="${t('Show', 'Mostrar')} ${item.title}"></button>`).join('')}</div>
      </section>
      <button class="v34-surprise" type="button" data-v34-surprise aria-label="${t('Surprise Me! Open a magical recipe just for you', 'Surpreenda-me! Abra uma receita mágica para você')}"><span class="v34-visually-hidden">${t('Surprise Me! Open a magical recipe just for you', 'Surpreenda-me! Abra uma receita mágica para você')}</span></button>
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

  function updateCarousel(index) {
    const cards = [...document.querySelectorAll('[data-v34-activity]')].filter(el => el.classList.contains('v34-activity-card'));
    if (!cards.length) return;
    activeActivity = (index + cards.length) % cards.length;
    cards.forEach((card, i) => card.classList.toggle('is-active', i === activeActivity));
    document.querySelectorAll('.v34-carousel-dots [data-v34-activity]').forEach((dot, i) => dot.classList.toggle('is-active', i === activeActivity));
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
      updateCarousel(activeActivity);
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
      if (activity.classList.contains('v34-activity-card') && suppressActivityClick) return;
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
  let activityPointerStart = null;
  document.addEventListener('pointerdown', event => {
    if (event.target.closest('[data-v34-activity-viewport]')) activityPointerStart = event.clientX;
  }, true);
  document.addEventListener('pointerup', event => {
    if (activityPointerStart === null) return;
    const delta = event.clientX - activityPointerStart;
    activityPointerStart = null;
    if (Math.abs(delta) < 32) return;
    suppressActivityClick = true;
    updateCarousel(activeActivity + (delta < 0 ? 1 : -1));
    setTimeout(() => { suppressActivityClick = false; }, 350);
  }, true);

  const v34Style = `
  .app.v34-home-active #screen{width:100%;max-width:1200px;margin:0 auto;padding:0 0 calc(92px + env(safe-area-inset-bottom));overflow-x:hidden}
  .app.v34-magical #nav{position:fixed!important;left:50%!important;right:auto!important;bottom:calc(6px + env(safe-area-inset-bottom))!important;transform:translateX(-50%)!important;width:min(96vw,900px)!important;max-width:none!important;grid-template-columns:repeat(5,minmax(0,1fr))!important;padding:6px 9px!important;border:2px solid #fff!important;border-radius:27px!important;background:linear-gradient(115deg,#fff9ffed,#fff8e6ed)!important;box-shadow:0 6px 22px #49356c44!important;backdrop-filter:blur(9px);z-index:200!important;opacity:1!important;pointer-events:auto!important}
  .app.v34-magical #nav .tab{display:grid;justify-items:center;align-content:center;gap:3px;min-width:0;min-height:56px;padding:3px 2px;border:0;border-radius:18px;background:transparent;color:#71538e;font-size:clamp(9px,2.5vw,14px);font-weight:900;line-height:1.1;text-align:center}
  .app.v34-magical #nav .tab b{font-size:22px;line-height:1}.app.v34-magical #nav .tab.active{background:linear-gradient(145deg,#f3c7ff,#ffe1f6);color:#6729a0;box-shadow:0 3px 9px #ac5cbd45}
  .app.v34-magical #nav .tab:focus-visible,.v34-home button:focus-visible,.v34-home-style button:focus-visible{outline:3px solid #6729a0;outline-offset:2px}
  .v34-visually-hidden{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}
  .v34-home{--v34-purple:#7625b5;--v34-pink:#f33f9f;position:relative;display:grid;gap:0;max-width:1024px;margin:0 auto;padding:0 0 24px;overflow:hidden;background:linear-gradient(180deg,#ffe8fa,#fff4ff 68%,#ffe7f2);color:#4d176f}
  .v34-hero{position:relative;isolation:isolate;width:100%;height:clamp(185px,46vw,500px);overflow:hidden;background:#592bb0}
  .v34-approved-scene{position:absolute;inset:0;background-image:url("${V31_HOME_WORLD_ART.v34ApprovedHome}");background-position:center top;background-size:100% auto;background-repeat:no-repeat}
  .v34-settings{position:absolute;z-index:6;top:max(10px,env(safe-area-inset-top));right:12px;width:44px;height:44px;border:2px solid #fff;border-radius:50%;background:#fffdf1ed;color:#702c9d;font-size:22px;box-shadow:0 3px 12px #45256d66}
  .v34-globe-hit{position:absolute;z-index:5;left:68%;top:14%;width:30%;height:64%;padding:0;border:0;border-radius:50%;background:transparent}
  .v34-globe-orbit{position:absolute;inset:4%;border:2px solid #ffe08a99;border-radius:50%;box-shadow:0 0 16px #fff5a6aa;animation:v34-orbit 14s linear infinite}
  .v34-globe-orbit:after{content:"✦";position:absolute;top:0;left:50%;transform:translate(-50%,-50%);color:#fff4b5;font-size:clamp(14px,3vw,28px);text-shadow:0 0 9px #fff}
  .v34-activity-section{position:relative;isolation:isolate;min-width:0;height:clamp(155px,39vw,268px);padding:0 clamp(31px,4vw,46px) 20px;overflow:hidden;background:radial-gradient(ellipse at 50% 24%,#fff5c255,transparent 64%)}
  .v34-platform{position:absolute;z-index:-1;left:4%;right:4%;bottom:23px;height:47%;border:3px solid #ffe67d;border-radius:50%;background:radial-gradient(ellipse at 50% 2%,#fff5dd9c 0 20%,#f45ac145 45%,#8d27d555 100%);box-shadow:0 0 0 5px #ffb6e688,0 0 23px 10px #f4a4ff9c,inset 0 -13px 18px #f8d15b70;transform:perspective(260px) rotateX(22deg)}
  .v34-platform:before,.v34-platform:after{content:"";position:absolute;inset:5px 1%;border:2px solid #fff5b9;border-radius:50%;box-shadow:0 0 12px #fff9}.v34-platform:after{inset:14px 5%;border-color:#ff99de;opacity:.72}
  .v34-activity-viewport{position:relative;z-index:2;width:100%;height:100%;overflow:hidden;touch-action:pan-y;user-select:none;-webkit-user-select:none}
  .v34-activity-track{display:flex;align-items:flex-end;justify-content:center;gap:clamp(1px,1vw,12px);width:100%;height:100%;padding:0 2px 6px}
  .v34-activity-card{position:relative;display:grid;flex:1 1 0;grid-template-rows:1fr auto;justify-items:center;align-content:end;gap:0;min-width:0;max-width:176px;height:92%;min-height:116px;padding:0 1px 5px;border:0;border-radius:0;background:transparent;color:#511575;opacity:.94;transform:translateY(7px) scale(.91);transform-origin:center bottom;transition:transform .22s ease,filter .22s ease;filter:drop-shadow(0 2px 1px #57286a33);cursor:pointer}
  .v34-activity-card.is-active{z-index:3;opacity:1;transform:translateY(-3px) scale(1.055);filter:drop-shadow(0 0 8px #fff4a3) drop-shadow(0 4px 2px #57286a55)}
  .v34-activity-art{display:block;align-self:end;width:100%;height:clamp(54px,16vw,140px);min-height:0;background-image:url("${V31_HOME_WORLD_ART.v34ApprovedHome}");background-size:100vw auto;background-repeat:no-repeat}
  .v34-activity-card strong{position:relative;z-index:2;display:grid;place-items:center;width:100%;min-height:29px;margin-top:-2px;padding:4px 2px;border:2px solid #fff8da;border-radius:999px;background:linear-gradient(180deg,#fff9dc,#ffe4a5);box-shadow:0 3px 0 #e58a22,0 5px 10px #64265b48;color:#4d176f;font-family:Georgia,serif;font-size:clamp(8px,2.45vw,19px);font-weight:950;line-height:1.05;text-align:center}
  .v34-activity-card.is-active strong{border-color:#fff;background:linear-gradient(180deg,#fffbe9,#fff0bc);box-shadow:0 3px 0 #de861a,0 0 12px #fff6a9}
  .v34-carousel-controls{position:absolute;z-index:5;inset:39% 3% auto;display:flex;justify-content:space-between;pointer-events:none}
  .v34-carousel-controls button{display:grid;place-items:center;width:clamp(31px,8vw,48px);height:clamp(31px,8vw,48px);padding:0;border:2px solid #fff;border-radius:50%;background:linear-gradient(145deg,#d83bdf,#7918c3);color:white;font-size:clamp(25px,6vw,39px);font-weight:900;line-height:1;box-shadow:0 3px 0 #62168f,0 0 12px #fc8bff;pointer-events:auto}
  .v34-carousel-dots{position:absolute;z-index:4;left:0;right:0;bottom:9px;display:flex;justify-content:center;gap:7px}.v34-carousel-dots button{width:9px;height:9px;padding:0;border:1px solid #fff;border-radius:50%;background:#ffd2f4;box-shadow:0 1px 4px #702c9d77}.v34-carousel-dots button.is-active{width:21px;border-radius:99px;background:#f354b6}
  .v34-surprise{position:relative;display:block;width:100%;height:clamp(86px,22vw,190px);min-height:86px;padding:0;border:0;border-radius:0;background-color:transparent;background-image:url("${V31_HOME_WORLD_ART.v34ApprovedHome}");background-repeat:no-repeat;background-size:100% auto;background-position:center -66.4vw;filter:drop-shadow(0 5px 7px #8c327426);cursor:pointer;animation:v34-chest-glow 3s ease-in-out infinite}
  .v34-surprise:active{transform:scale(.985);filter:drop-shadow(0 0 14px #ffde67)}
  .v34-section-heading{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}.v34-section-heading h2{margin:0;color:#771eb5;font-family:Georgia,serif;font-size:clamp(18px,4.6vw,31px);font-weight:1000;line-height:1.05;text-shadow:0 1px #fff}
  .v34-section-heading p{margin:3px 0 0;color:#865da5;font-size:clamp(10px,2.5vw,15px);font-weight:800}.v34-section-heading>span{flex:none;color:#8963a6;font-size:clamp(9px,2vw,13px);font-weight:900}
  .v34-rail-section{position:relative;min-width:0;margin:8px clamp(8px,2.6vw,28px) 0;padding:12px 12px 9px;border:2px solid #fff;border-radius:25px;background:linear-gradient(115deg,#fff1fbf5,#fff8fff5 55%,#fff0f7f5);box-shadow:0 5px 0 #f5bfdc,0 9px 18px #87368124;overflow:hidden}
  .v34-rail{display:flex;gap:clamp(8px,2vw,16px);min-width:0;overflow-x:auto;overscroll-behavior-x:contain;scrollbar-width:none;scroll-snap-type:x mandatory;padding:2px 2px 7px}.v34-rail::-webkit-scrollbar{display:none}
  .v34-recipe-card,.v34-country-card{position:relative;display:flex;flex:0 0 clamp(136px,34vw,220px);flex-direction:column;gap:4px;min-width:0;padding:6px;border:1px solid #f5d3e7;border-radius:20px;background:#fff;color:#421362;text-align:center;box-shadow:0 3px 0 #f3c1df,0 5px 12px #55226e22;scroll-snap-align:start}
  .v34-recipe-card .home-thumb,.v34-country-art{display:block;width:100%;height:clamp(92px,23vw,150px);overflow:hidden;border-radius:15px;background:linear-gradient(135deg,#ffdfef,#fff0bb)}.v34-recipe-card .home-thumb img,.v34-country-art img{width:100%;height:100%;object-fit:cover}
  .v34-recipe-card strong,.v34-country-card strong{font-family:Georgia,serif;font-size:clamp(12px,3vw,16px);font-weight:950;line-height:1.15}
  .v34-card-badge{position:absolute;top:10px;right:9px;padding:4px 8px;border:1px solid #fff;border-radius:999px;background:#f33f9f;color:#fff;font-size:10px;font-weight:950;box-shadow:0 2px 6px #4c164d55}
  .v34-home-photo{display:block;width:100%;height:clamp(92px,23vw,150px);object-fit:cover;border-radius:15px}.v34-country-art{display:grid;place-items:center}.v34-country-card small{color:#76548d;font-size:11px;font-weight:850}
  .v34-empty-creations{display:grid;justify-items:start;align-content:center;gap:6px;flex:0 0 min(88%,390px);min-height:118px;padding:14px;border:2px dashed #db9dd7;border-radius:20px;background:#fffafde8;color:#552277}.v34-empty-creations>span{font-size:27px}.v34-empty-creations strong{font-family:Georgia,serif;font-size:15px}.v34-empty-creations p{margin:0;color:#806492;font-size:12px}.v34-empty-creations button{min-height:40px;padding:7px 14px;border:0;border-radius:14px;background:#853dae;color:white;font-weight:900}
  .v34-modal-backdrop{position:fixed;z-index:10000;inset:0;display:grid;place-items:center;padding:18px;background:#281239aa}
  .v34-surprise-dialog{position:relative;width:min(100%,410px);max-height:88dvh;overflow:auto;padding:22px;border:3px solid #fff;border-radius:28px;background:linear-gradient(145deg,#fff2fc,#fff8df);box-shadow:0 16px 50px #20122d66;text-align:center}
  .v34-modal-close{position:absolute;top:10px;right:10px;width:42px;height:42px;border:0;border-radius:50%;background:#f3dcff;color:#602580;font-size:27px}
  .v34-chest-open{font-size:45px;animation:v34-chest-pop .45s ease-out}.v34-surprise-dialog h2{margin:5px 0 12px;color:#702894}.v34-surprise-art .home-thumb{height:180px;overflow:hidden;border-radius:18px}.v34-surprise-art .home-thumb img{width:100%;height:100%;object-fit:cover}.v34-surprise-art .home-thumb:not(:has(img)){display:grid;place-items:center;background:#fae8f7;font-size:80px}
  .v34-surprise-actions{display:grid;gap:8px;margin-top:14px}.v34-primary,.v34-secondary{min-height:48px;border:0;border-radius:15px;font:inherit;font-weight:950}.v34-primary{background:linear-gradient(100deg,#ea4caa,#9145c2);color:white}.v34-secondary{background:#f0e2f7;color:#653884}
  .v34-country-dialog{position:relative;width:min(100%,650px);max-height:88dvh;overflow:auto;padding:22px;border:3px solid #fff;border-radius:26px;background:linear-gradient(145deg,#fff6ff,#fff9e6);box-shadow:0 16px 50px #20122d66}.v34-country-dialog h2{margin:4px 0 14px;color:#702894}.v34-country-recipes{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:10px;max-height:65dvh;overflow:auto}.v34-country-recipes .v34-recipe-card{width:100%;flex:none}
  .v34-home-style{margin:16px 8px;padding:16px;border:2px solid #fff;border-radius:22px;background:linear-gradient(115deg,#fff8fe,#fff7e7);box-shadow:0 4px 0 #e2c9e8}.v34-home-style h2{margin:0;color:#702894;font-size:20px}.v34-home-style>p{color:#70587f}.v34-style-options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.v34-style-option{display:grid;justify-items:start;gap:6px;min-height:134px;padding:10px;border:2px solid #e7d6ed;border-radius:17px;background:#fff;color:#513563;text-align:left}.v34-style-option.is-selected{border-color:#9c4ec1;background:#fcf2ff;box-shadow:0 0 0 2px #e6c5f2}.v34-style-preview{display:grid;place-items:center;width:100%;height:53px;border-radius:12px;font-size:24px}.classic-preview{background:linear-gradient(110deg,#fff3dc,#e5f4e7)}.magical-preview{background:linear-gradient(110deg,#f5dcff,#ffe9b8)}.v34-style-option strong{font-size:14px}.v34-style-option small{color:#786588;font-size:11px}.v34-style-status{font-size:12px}.v34-country-card .home-thumb{width:100%;height:100%;margin:0}
  @keyframes v34-orbit{to{transform:rotate(360deg)}}@keyframes v34-chest-glow{0%,100%{filter:drop-shadow(0 4px 5px #8c327426)}50%{filter:drop-shadow(0 0 12px #ffde7799)}}@keyframes v34-chest-pop{0%{transform:scale(.6) rotate(-10deg);opacity:.3}65%{transform:scale(1.15) rotate(5deg)}100%{transform:scale(1)}}
  @media(min-width:700px){.v34-activity-section{height:clamp(230px,23vw,300px);padding-inline:62px}.v34-activity-card{max-width:206px}.v34-activity-card strong{font-size:clamp(14px,1.65vw,20px)}.v34-rail-section{margin-inline:auto;width:calc(100% - 40px)}.v34-recipe-card,.v34-country-card{flex-basis:clamp(190px,21vw,230px)}}
  @media(max-width:420px){.app.v34-home-active #screen{padding-bottom:calc(82px + env(safe-area-inset-bottom))}.v34-hero{height:clamp(185px,47vw,230px)}.v34-activity-section{height:158px;padding-inline:30px;padding-bottom:21px}.v34-activity-track{gap:1px}.v34-activity-card{min-height:119px}.v34-activity-art{height:clamp(54px,16vw,65px)}.v34-activity-card strong{min-height:28px;font-size:clamp(8px,2.7vw,11px)}.v34-carousel-controls{inset:38% 1% auto}.v34-carousel-controls button{width:30px;height:30px;font-size:24px}.v34-carousel-dots{bottom:7px}.v34-surprise{height:22vw;min-height:82px}.v34-rail-section{margin-inline:7px;padding:10px 9px 8px;border-radius:20px}.v34-section-heading p{font-size:10px}.v34-recipe-card,.v34-country-card{flex-basis:clamp(128px,37vw,154px)}.v34-recipe-card .home-thumb,.v34-country-art,.v34-home-photo{height:clamp(87px,25vw,106px)}.v34-style-options{grid-template-columns:1fr}.v34-style-option{min-height:108px}.v34-style-preview{height:42px}.app.v34-magical #nav{width:calc(100vw - 10px)!important;padding:4px 3px!important;border-radius:20px!important}.app.v34-magical #nav .tab{min-height:49px;font-size:9px}.app.v34-magical #nav .tab b{font-size:19px}}
  @media(max-height:520px) and (orientation:landscape){.v34-hero{height:min(43vh,360px)}.v34-activity-section{height:190px;padding-inline:54px}.v34-activity-art{min-height:100px}.v34-activity-card{min-height:145px}.v34-surprise{height:clamp(90px,13vw,155px)}.v34-rail-section{margin-top:4px;padding:8px 10px}.v34-recipe-card .home-thumb,.v34-country-art,.v34-home-photo{height:88px}.app.v34-home-active #screen{padding-bottom:78px}}
  @media(prefers-reduced-motion:reduce){.v34-home *,.v34-home *:before,.v34-home *:after{scroll-behavior:auto!important;animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}.v34-activity-viewport{scroll-behavior:auto}}
  `;
  document.head.insertAdjacentHTML('beforeend', `<style id="v34-dual-home-style">
${v34Style}
</style>`);
  document.addEventListener('DOMContentLoaded', () => {
    v34SyncNavigation(homeStyle() === 'magical');
    if (view === 'home') render();
  }, { once: true });
})();
