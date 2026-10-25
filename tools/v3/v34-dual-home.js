/* V3.4 APK-only home experience. This file is appended after the shared V3 layer. */
(() => {
  'use strict';
  const STYLE_KEY = 'aaria.v34.homeStyle';
  const PHOTO_DB = 'aaria-v34-local-creation-photos';
  const PHOTO_STORE = 'photoRecords';
  const LEGACY_PHOTO_STORE = 'photos';
  const reduced = () => Boolean(state.reducedMotion || window.matchMedia('(prefers-reduced-motion: reduce)').matches);
  const pt = () => state.language === 'pt-BR';
  const t = (en, br) => pt() ? br : en;
  const homeStyle = () => {
    try { return localStorage.getItem(STYLE_KEY) === 'classic' ? 'classic' : 'magical'; }
    catch { return 'magical'; }
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
  let suppressActivityClick = false;
  let photoUrls = [];
  let photoDbPromise;

  function openPhotoDb() {
    if (!window.indexedDB) return Promise.resolve(null);
    if (!photoDbPromise) photoDbPromise = new Promise(resolve => {
      const request = indexedDB.open(PHOTO_DB, 2);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(PHOTO_STORE)) db.createObjectStore(PHOTO_STORE, { keyPath: 'photoId' });
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => resolve(null);
    });
    return photoDbPromise;
  }
  async function storeCreationPhoto(recipeId, blob) {
    const db = await openPhotoDb();
    if (!db || !blob) throw new Error('Persistent photo storage is unavailable.');
    const record = { photoId: 'photo-' + Date.now() + '-' + Math.random().toString(36).slice(2), recipeId: Number(recipeId), blob, savedAt: Date.now() };
    await new Promise((resolve, reject) => {
      const transaction = db.transaction(PHOTO_STORE, 'readwrite');
      transaction.objectStore(PHOTO_STORE).add(record);
      transaction.oncomplete = () => resolve();
      transaction.onerror = transaction.onabort = () => reject(transaction.error || new Error('Photo storage failed.'));
    });
    return record;
  }
  async function listCreationPhotos() {
    const db = await openPhotoDb();
    if (!db) return [];
    return new Promise(resolve => {
      const stores = [PHOTO_STORE];
      if (db.objectStoreNames.contains(LEGACY_PHOTO_STORE)) stores.push(LEGACY_PHOTO_STORE);
      const transaction = db.transaction(stores, 'readonly');
      const requests = stores.map(name => {
        const request = transaction.objectStore(name).getAll();
        return new Promise(done => {
          request.onsuccess = () => done(Array.isArray(request.result) ? request.result : []);
          request.onerror = () => done([]);
        });
      });
      Promise.all(requests).then(groups => resolve(groups.flat().sort((a, b) => Number(a.savedAt || 0) - Number(b.savedAt || 0))));
    });
  }
  function rememberCreation(recipeId, photoUrl = '') {
    state.myCreations = Array.isArray(state.myCreations) ? state.myCreations : [];
    if (photoUrl) {
      if (!state.myCreations.some(item => Number(item?.recipeId) === Number(recipeId) && item?.photoUrl === photoUrl)) {
        state.myCreations.push({ recipeId: Number(recipeId), photoUrl, createdAt: Date.now() });
      }
    } else if (!state.myCreations.some(item => Number(typeof item === 'object' ? item.recipeId : item) === Number(recipeId))) {
      state.myCreations.push({ recipeId: Number(recipeId), createdAt: Date.now() });
    }
    save();
  }
  function activityAction(index) {
    if (index === 0) openWheel('week');
    else if (index === 1) goto('family');
    else if (index === 2) goto('friends');
    else if (window.v34EnterGlobeFirst) window.v34EnterGlobeFirst(false);
    else { window.v31WorldOpenedFromNav = false; goto('world'); }
  }
  const activities = () => [
    { title: t('Spin My Week', 'Monte minha semana'), sub: t('Pick seven tasty adventures', 'Escolha sete aventuras saborosas'), art: '📅', kind: 'calendar' },
    { title: t('Cook with Family', 'Cozinhar com a família'), sub: t('Make something together', 'Preparem algo juntos'), art: 'family', kind: 'family' },
    { title: t('Cook with Friends', 'Cozinhar com amigos'), sub: t('Share a kitchen adventure', 'Compartilhe uma aventura na cozinha'), art: 'friends', kind: 'friends' },
    { title: t('World Recipes', 'Receitas do mundo'), sub: t('Explore recipes by country', 'Explore receitas por país'), art: 'globe', kind: 'world' }
  ];
  function activityArtwork(item) {
    if (item.kind === 'world') return '<span class="v34-activity-art v34-world-activity-art" aria-hidden="true"><span class="v34-carousel-globe"></span></span>';
    const crops = { calendar:[104,448], family:[306,448], friends:[520,448], world:[754,424] };
    const [x,y] = crops[item.kind];
    return `<span class="v34-activity-art" aria-hidden="true" style="background-position:-${(x/1024*100).toFixed(3)}vw -${(y/1024*100).toFixed(3)}vw"></span>`;
  }
  function recipeTitle(recipe) { return safe(translateText(recipe.title)); }
  function creationPhotoUrl(recipeId) {
    const entries = Array.isArray(state.myCreations) ? state.myCreations : [];
    const saved = entries.slice().reverse().find(item => item && typeof item === 'object' && Number(item.recipeId) === Number(recipeId) && typeof item.photoUrl === 'string' && item.photoUrl.startsWith('https://appassets.androidplatform.net/dish-photo/'));
    return saved?.photoUrl || '';
  }
  function recipeCard(recipe, badge = '', showCreationPhoto = false) {
    const photoUrl = showCreationPhoto ? creationPhotoUrl(recipe.id) : '';
    const thumb = photoUrl
      ? `<img class="v34-home-photo" src="${safe(photoUrl)}" alt="${t(`Photo of ${recipe.title} made by Aaria`, `Foto de ${recipe.title} preparada pela Aaria`)}" loading="lazy" decoding="async">`
      : homeDishThumb(recipe);
    return `<button class="v34-recipe-card" type="button" data-open="${recipe.id}" aria-label="${t('Open', 'Abrir')} ${recipeTitle(recipe)}">${thumb}<span class="v34-card-badge">${badge || recipe.emoji}</span><strong>${recipeTitle(recipe)}</strong></button>`;
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
  function worldCard(row) {
    const artwork = V31_HOME_WORLD_ART.destinations?.[row.code];
    const artworkAlt = V31_HOME_WORLD_ART.destinationAlt?.[row.code] || (row.en + ' recipe artwork');
    const food = row.code === 'IND' ? '🥪' : row.code === 'ITA' ? '🍝' : '🥡';
    const image = artwork
      ? `<img src="${artwork}" alt="${safe(artworkAlt)}" loading="lazy" decoding="async">`
      : `<span class="v34-country-art-fallback" role="img" aria-label="${safe(artworkAlt)}">${food}</span>`;
    return `<button class="v34-country-card" type="button" data-v34-country="${row.code}" aria-label="${t('Explore recipes from', 'Explore receitas de')} ${pt() ? row.br : row.en}"><span class="v34-country-art v34-country-art-${row.code.toLowerCase()}">${image}<span class="v34-country-food" aria-hidden="true">${food}</span></span><strong>${row.flag} ${pt() ? row.br : row.en}</strong><small>${row.recipes.length} ${t('approved recipes', 'receitas aprovadas')}</small></button>`;
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
      ? made.slice().reverse().map(id => recipeCard(find(id), '💖', true)).join('')
      : `<div class="v34-empty-creations"><span aria-hidden="true">📸</span><strong>${t('Your kitchen memories will appear here', 'Suas memórias da cozinha aparecerão aqui')}</strong><p>${t('Finish a recipe and save a photo to start your gallery.', 'Conclua uma receita e salve uma foto para começar sua galeria.')}</p><button type="button" data-nav="library">${t('Choose a recipe', 'Escolher uma receita')} →</button></div>`;
    const countries = countryRows();
    return `<div class="v34-home" data-v34-home>
      <header class="v34-hero" aria-labelledby="v34-brand-title">
        <div class="v34-approved-scene" aria-hidden="true"></div>
        <h1 class="v34-hero-title" id="v34-brand-title">Aaria’s Magical Kitchen</h1>
        <img class="v34-hero-aaria" src="${V33_WORLD_ARTWORK.pointingAaria}" alt="${t('Aaria, your cooking guide', 'Aaria, sua guia de cozinha')}" />
        <div class="v34-hero-globe" role="img" aria-label="${t('The spinning World Map globe', 'O globo giratório do Mapa-múndi')}"><span class="v34-globe-orbit" aria-hidden="true"></span></div>
      </header>
      <div class="v34-home-utility"><button class="v34-settings" data-nav="settings">⚙️ ${t('Settings', 'Configurações')}</button></div>
      <section class="v34-activity-section" aria-label="${t('Choose a kitchen adventure', 'Escolha uma aventura na cozinha')}">
        <h2 class="v34-visually-hidden">${t('Kitchen adventures', 'Aventuras na cozinha')}</h2>
        <div class="v34-platform" aria-hidden="true"></div>
        <div class="v34-activity-viewport" data-v34-activity-viewport tabindex="0" aria-label="${t('Activity carousel. Swipe or use the arrows.', 'Carrossel de atividades. Deslize ou use as setas.')}"><div class="v34-activity-track">${items.map((item,index) => `<button type="button" class="v34-activity-card${index===active?' is-active':''}" data-v34-activity="${index}" aria-label="${item.title}. ${item.sub}">${activityArtwork(item)}<strong>${item.title}</strong></button>`).join('')}</div></div>
        <div class="v34-carousel-controls"><button type="button" data-v34-prev aria-label="${t('Previous activity', 'Atividade anterior')}">‹</button><button type="button" data-v34-next aria-label="${t('Next activity', 'Próxima atividade')}">›</button></div>
        <div class="v34-carousel-dots" aria-label="${t('Activity selection', 'Seleção de atividade')}">${items.map((item,index)=>`<button type="button" class="${index===active?'is-active':''}" data-v34-activity="${index}" aria-label="${t('Show', 'Mostrar')} ${item.title}"></button>`).join('')}</div>
      </section>
      <button class="v34-surprise" type="button" data-action="open-wheel" aria-label="${t('Surprise Me! Open the original recipe surprise screen', 'Surpreenda-me! Abra a tela original de surpresa de receitas')}"><span class="v34-surprise-label" aria-hidden="true">✨ ${t('Surprise Me!', 'Surpreenda-me!')} ✨</span><span class="v34-visually-hidden">${t('Surprise Me!', 'Surpreenda-me!')}</span></button>
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
  home = function v34HomeSelector() {
    if (homeStyle() === 'magical') return magicalHome();
    return v34OriginalHome();
  };
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
    const statePhotos = (Array.isArray(state.myCreations) ? state.myCreations : []).filter(item => item && typeof item === 'object' && item.photoUrl).map(item => ({ recipeId: Number(item.recipeId), url: item.photoUrl, savedAt: item.createdAt || 0 }));
    const photos = [...await listCreationPhotos(), ...statePhotos].sort((a, b) => Number(a.savedAt || 0) - Number(b.savedAt || 0));
    if (!photos.length || !railNode.isConnected) return;
    for (const record of photos) {
      const recipe = find(Number(record.recipeId));
      if (!recipe || (!record.url && !(record.blob instanceof Blob))) continue;
      const card = railNode.querySelector(`[data-open="${Number(record.recipeId)}"]`);
      if (!card) continue;
      const url = record.url || URL.createObjectURL(record.blob); if (!record.url) photoUrls.push(url);
      card.querySelector('.home-thumb')?.remove();
      let image = card.querySelector('.v34-home-photo');
      if (!image) { image = document.createElement('img'); image.className = 'v34-home-photo'; image.alt = t(`Photo of ${recipe.title} made by Aaria`, `Foto de ${recipe.title} preparada pela Aaria`); card.prepend(image); }
      image.src = url;
    }
  }
  async function hydrateRecipePhoto() {
    const id = Number(selected?.id);
    if (!id || view !== 'recipe') return;
    const records = await listCreationPhotos();
    const stored = records.slice().reverse().find(item => Number(item.recipeId) === id && item.blob instanceof Blob);
    const fallback = [...(Array.isArray(state.myCreations) ? state.myCreations : [])].reverse().find(item => item && typeof item === 'object' && Number(item.recipeId) === id && item.photoUrl);
    let source = stored?.blob || null;
    if (!source && fallback?.photoUrl) {
      try { const response = await fetch(fallback.photoUrl, { cache: 'no-store' }); if (response.ok) source = await response.blob(); } catch {}
    }
    if (!(source instanceof Blob) || !source.type.startsWith('image/')) return;
    if (!sharePostBlobs[id]) {
      const post = await makeCookPost(find(id), source);
      shareSourcePhotos[id] = source;
      sharePostBlobs[id] = post;
      sharePostUrls[id] = URL.createObjectURL(post);
    }
    if (view !== 'recipe' || Number(selected?.id) !== id) return;
    const preview = document.querySelector('#screen .cook-post-preview img');
    const wait = document.querySelector('#screen .cook-photo-wait');
    if (preview) preview.src = sharePostUrls[id];
    else if (wait) wait.outerHTML = `<div class="cook-post-preview"><img src="${sharePostUrls[id]}" alt="${safe(find(id)?.title || 'Recipe')} ready-to-share cooking post with saved photo"></div>`;
    const shareButton = document.querySelector('#screen .cook-post-share');
    if (shareButton) shareButton.disabled = !sharePostBlobs[id];
    const hint = document.querySelector('#screen .cook-share-hint');
    if (hint) hint.textContent = t('Share your saved cooking photo and post with a parent or guardian.', 'Compartilhe sua foto e publicação salva com um adulto.');
  }
  async function saveCreationPhoto(recipeId, source) {
    const id = Number(recipeId), recipe = find(id);
    if (!recipe || (!source && !window.AariaNative)) throw new Error('Recipe or photo is unavailable.');
    let blob = source;
    let photoUrl = '';
    if (typeof source === 'string') {
      photoUrl = source;
      const response = await fetch(source, { cache: 'no-store' });
      if (!response.ok) throw new Error('The captured photo could not be read.');
      blob = await response.blob();
    }
    if (!(blob instanceof Blob) || !blob.type.startsWith('image/')) throw new Error('The captured file is not an image.');
    await storeCreationPhoto(id, blob);
    rememberCreation(id, photoUrl);
    const post = await makeCookPost(recipe, blob);
    if (sharePostUrls[id]) URL.revokeObjectURL(sharePostUrls[id]);
    shareSourcePhotos[id] = blob; sharePostBlobs[id] = post; sharePostUrls[id] = URL.createObjectURL(post);
    render(); notice(t('Photo saved to My Creations!', 'Foto salva em Minhas criações!'));
    if (view === 'home' || view === 'creations') void hydratePhotoRail();
  }
  window.v34SaveCreationPhoto = saveCreationPhoto;
  function v34CreationsPage() {
    const ids = creationIds();
    const cards = ids.length ? ids.slice().reverse().map(id => recipeCard(find(id), '💖', true)).join('') : `<div class="v34-empty-creations"><span aria-hidden="true">📸</span><strong>${t('Your saved creations will appear here', 'Suas criações salvas aparecerão aqui')}</strong><p>${t('Take a photo while cooking to keep the memory.', 'Tire uma foto enquanto cozinha para guardar essa memória.')}</p><button type="button" data-nav="library">${t('Choose a recipe', 'Escolher uma receita')} →</button></div>`;
    return `<div class="v34-home v34-creations-page"><h1>${t('My Creations', 'Minhas criações')}</h1><p>${t('Your saved cooking photos on this device', 'Suas fotos de cozinha salvas neste dispositivo')}</p><div class="v34-rail" role="region" aria-label="${t('My creations, horizontal list', 'Minhas criações, lista horizontal')}" tabindex="0" data-v34-photo-rail>${cards}</div></div>`;
  }
  const v34BaseRender = render;
  render = function v34RenderHome() {
    const result = v34BaseRender.apply(this, arguments);
    const screen = document.getElementById('screen');
    if (homeStyle() === 'magical' && view === 'creations' && screen) screen.innerHTML = v34CreationsPage();
    const app = document.querySelector('.app');
    const magical = homeStyle() === 'magical';
    app?.classList.toggle('v34-magical', magical);
    app?.classList.toggle('v34-home-active', magical && view === 'home');
    v34SyncNavigation(magical);
    if (magical && view === 'home') updateCarousel(activeActivity);
    if (magical && (view === 'home' || view === 'creations')) void hydratePhotoRail();
    if (magical && view === 'recipe') void hydrateRecipePhoto();
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
    const worldTab = event.target.closest('#nav [data-nav="world"]');
    if (worldTab && window.v34EnterGlobeFirst) { event.preventDefault(); event.stopImmediatePropagation(); window.v34EnterGlobeFirst(true); return; }
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
    const countryRecipe = event.target.closest('#v34-country-dialog [data-open]');
    if (countryRecipe) { event.preventDefault(); const recipeId = Number(countryRecipe.dataset.open); document.querySelector('#v34-country-dialog')?.remove(); openRecipe(recipeId); return; }
    if (event.target.closest('[data-v34-country-close]')) { event.preventDefault(); document.querySelector('#v34-country-dialog')?.remove(); return; }
    const country = event.target.closest('[data-v34-country]');
    if (country) { event.preventDefault(); openCountryRecipes(country.dataset.v34Country); return; }
  }, true);
  document.addEventListener('change', async event => {
    const input = event.target.closest('[data-share-photo]');
    const file = input?.files?.[0];
    if (!input || !file) return;
    event.preventDefault(); event.stopImmediatePropagation();
    if (!file.type.startsWith('image/')) { notice(t('Please choose an image.', 'Escolha uma imagem.')); return; }
    const id = Number(input.dataset.sharePhoto);
    try {
      await saveCreationPhoto(id, file);
    } catch (error) {
      console.error('Could not save the creation photo.', error);
      notice(t('Could not save that photo. Please try again.', 'Não foi possível salvar essa foto. Tente novamente.'));
    } finally { input.value = ''; }
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
  .app.v34-magical.v31-world-active #nav{left:0!important;right:0!important;transform:none!important;width:100vw!important;box-sizing:border-box!important;padding-left:calc(5px + env(safe-area-inset-left))!important;padding-right:calc(5px + env(safe-area-inset-right))!important;grid-template-columns:repeat(5,minmax(0,1fr))!important;border-radius:19px 19px 0 0!important}
  .app.v34-magical #screen{padding-bottom:calc(88px + env(safe-area-inset-bottom))}
  .app.v34-magical #nav .tab{display:grid;justify-items:center;align-content:center;gap:3px;min-width:0;min-height:56px;padding:3px 2px;border:0;border-radius:18px;background:transparent;color:#71538e;font-size:clamp(9px,2.5vw,14px);font-weight:900;line-height:1.1;text-align:center}
  .app.v34-magical #nav .tab b{font-size:22px;line-height:1}.app.v34-magical #nav .tab.active{background:linear-gradient(145deg,#f3c7ff,#ffe1f6);color:#6729a0;box-shadow:0 3px 9px #ac5cbd45}
  .app.v34-magical #nav .tab:focus-visible,.v34-home button:focus-visible,.v34-home-style button:focus-visible{outline:3px solid #6729a0;outline-offset:2px}
  .v34-visually-hidden{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}
  .v34-home{--v34-pink:#FF6FB6;--v34-purple:#8B5CF6;--v34-gold:#FFB347;--v34-blue:#00C2FF;--v34-ink:#1F1B3A;--v34-ui-font:'Nunito','Arial Rounded MT Bold','Trebuchet MS',system-ui,sans-serif;position:relative;display:grid;gap:0;max-width:1024px;margin:0 auto;padding:0 0 24px;overflow:hidden;background:linear-gradient(180deg,#FFF8FF,#FFEAF6 52%,#F3E8FF);color:var(--v34-ink);font-family:var(--v34-ui-font)}
  .v34-hero{position:relative;isolation:isolate;width:100%;height:clamp(292px,76vw,430px);overflow:hidden;background:#592bb0}
  .v34-approved-scene{position:absolute;inset:0;background-image:linear-gradient(180deg,#fff4ff12,#54247740),url("${V31_HOME_WORLD_ART.v34BackgroundPortrait}");background-position:center 48%;background-size:cover;background-repeat:no-repeat}
  .v34-hero-title{position:absolute;z-index:5;top:clamp(12px,3vw,30px);left:5%;width:75%;max-width:670px;margin:0;color:#7b24c7;font-family:'Arial Rounded MT Bold','Trebuchet MS',system-ui,sans-serif;font-size:clamp(27px,6.8vw,58px);font-weight:1000;line-height:.98;letter-spacing:-.04em;text-shadow:0 2px 0 #fff8ff,0 5px 12px #fff9;filter:drop-shadow(0 1px 3px #fff)}
  .v34-hero-aaria{position:absolute;z-index:2;left:0;bottom:-4%;height:79%;width:60%;max-width:540px;object-fit:contain;object-position:left bottom;filter:drop-shadow(0 6px 12px #4b245b55);pointer-events:none}
  .v34-hero-globe{position:absolute;z-index:3;left:65%;top:39%;width:32%;height:43%;border:3px solid #fff4b8;border-radius:50%;background-image:url("${V31_HOME_WORLD_ART.v34ApprovedHome}");background-repeat:no-repeat;background-size:100vw auto;background-position:-73vw -10vw;box-shadow:0 0 0 5px #ffb34766,0 0 24px 8px #ffcf676e,inset 0 0 20px #fff9;animation:v34-globe-float 4.5s ease-in-out infinite;pointer-events:none}
  .v34-hero-globe:before{content:"";position:absolute;inset:-8%;border:2px solid #fff8d9c9;border-radius:50%;box-shadow:0 0 16px #fff4a4;transform:rotate(-12deg) scaleY(.25);}
  .v34-hero-globe:after{content:"✦";position:absolute;right:-8%;top:3%;color:#fff9a9;font-size:clamp(18px,5vw,34px);text-shadow:0 0 10px #fff}
  .v34-home-utility{display:flex;justify-content:flex-end;padding:4px 14px 0}
  .v34-settings{min-height:42px;padding:5px 15px;border:2px solid #fff;border-radius:999px;background:#fffdf1ed;color:#702c9d;font:inherit;font-size:14px;font-weight:900;box-shadow:0 3px 12px #45256d33}
  .v34-globe-orbit{position:absolute;inset:-10%;border:2px dashed #fff8d9d6;border-radius:50%;box-shadow:0 0 16px #fff5a6aa;transform:rotate(-18deg) scaleY(.34);animation:v34-orbit 18s linear infinite;pointer-events:none}
  .v34-globe-orbit:after{content:"✦";position:absolute;top:0;left:50%;transform:translate(-50%,-50%);color:#fff4b5;font-size:clamp(14px,3vw,28px);text-shadow:0 0 9px #fff}
  .v34-activity-section{position:relative;isolation:isolate;min-width:0;height:clamp(155px,39vw,268px);padding:0 clamp(31px,4vw,46px) 20px;overflow:hidden;background:radial-gradient(ellipse at 50% 24%,#fff5c255,transparent 64%)}
  .v34-platform{position:absolute;z-index:-1;left:4%;right:4%;bottom:23px;height:47%;border:3px solid #FFB347;border-radius:50%;background:radial-gradient(ellipse at 50% 2%,#fff4e6e8 0 18%,#ff6fb655 42%,#8b5cf666 72%,#00c2ff55 100%);box-shadow:0 0 0 5px #ffb6e688,0 0 23px 10px #f4a4ff9c,inset 0 -13px 18px #f8d15b70;transform:perspective(260px) rotateX(22deg)}
  .v34-platform:before,.v34-platform:after{content:"";position:absolute;inset:5px 1%;border:2px solid #fff5b9;border-radius:50%;box-shadow:0 0 12px #fff9}.v34-platform:after{inset:14px 5%;border-color:#ff99de;opacity:.72}
  .v34-activity-viewport{position:relative;z-index:2;width:100%;height:100%;overflow:hidden;touch-action:pan-y;user-select:none;-webkit-user-select:none}
  .v34-activity-track{display:flex;align-items:flex-end;justify-content:center;gap:clamp(1px,1vw,12px);width:100%;height:100%;padding:0 2px 6px}
  .v34-activity-card{position:relative;display:grid;flex:1 1 0;grid-template-rows:1fr auto;justify-items:center;align-content:end;gap:0;min-width:0;max-width:150px;height:84%;min-height:110px;padding:0 1px 5px;border:0;border-radius:0;background:transparent;color:#511575;opacity:.94;transform:translateY(7px) scale(.91);transform-origin:center bottom;transition:transform .22s ease,filter .22s ease;filter:drop-shadow(0 2px 1px #57286a33);cursor:pointer}
  .v34-activity-card.is-active{z-index:3;opacity:1;transform:translateY(-3px) scale(1.055);filter:drop-shadow(0 0 8px #fff4a3) drop-shadow(0 4px 2px #57286a55)}
  .v34-activity-art{display:block;align-self:end;width:100%;height:clamp(48px,14vw,124px);min-height:0;background-image:url("${V31_HOME_WORLD_ART.v34ApprovedHome}");background-size:100vw auto;background-repeat:no-repeat}
  .v34-activity-art.v34-world-activity-art{display:grid;place-items:center;background:none}
  .v34-carousel-globe{display:block;width:clamp(44px,14vw,84px);height:clamp(44px,14vw,84px);border:2px solid #fff5c9;border-radius:50%;background-image:url("${V31_HOME_WORLD_ART.v34ApprovedHome}");background-repeat:no-repeat;background-size:50vw auto;background-position:-36.6vw -4.9vw;box-shadow:0 0 0 4px #ffb34775,0 0 16px #ffdc78;animation:v34-globe-spin 32s linear infinite}
  .v34-carousel-globe:after{content:"";display:block;width:100%;height:100%;border:1px solid #ffffffcc;border-radius:50%;box-shadow:inset -8px -4px 11px #46207765,inset 6px 5px 10px #fff9}
  .v34-activity-card strong{position:relative;z-index:2;display:grid;place-items:center;width:100%;min-height:40px;margin-top:0;padding:4px 2px;border:2px solid #fff8da;border-radius:999px;background:linear-gradient(180deg,#fff9dc,#ffe4a5);box-shadow:0 3px 0 #e58a22,0 5px 10px #64265b48;color:#4d176f;font-family:var(--v34-ui-font);font-size:clamp(9px,2.55vw,19px);font-weight:950;line-height:1.05;text-align:center}
  .v34-activity-card.is-active strong{border-color:#fff;background:linear-gradient(180deg,#fffbe9,#fff0bc);box-shadow:0 3px 0 #de861a,0 0 12px #fff6a9}
  .v34-carousel-controls{position:absolute;z-index:5;inset:39% 3% auto;display:flex;justify-content:space-between;pointer-events:none}
  .v34-carousel-controls button{display:grid;place-items:center;width:clamp(31px,8vw,48px);height:clamp(31px,8vw,48px);padding:0;border:2px solid #fff;border-radius:50%;background:linear-gradient(145deg,#d83bdf,#7918c3);color:white;font-size:clamp(25px,6vw,39px);font-weight:900;line-height:1;box-shadow:0 3px 0 #62168f,0 0 12px #fc8bff;pointer-events:auto}
  .v34-carousel-dots{position:absolute;z-index:4;left:0;right:0;bottom:9px;display:flex;justify-content:center;gap:7px}.v34-carousel-dots button{width:9px;height:9px;padding:0;border:1px solid #fff;border-radius:50%;background:#ffd2f4;box-shadow:0 1px 4px #702c9d77}.v34-carousel-dots button.is-active{width:21px;border-radius:99px;background:#f354b6}
  .v34-surprise{position:relative;display:block;width:100%;height:clamp(86px,22vw,190px);min-height:86px;padding:0;border:0;border-radius:0;background-color:transparent;background-image:url("${V31_HOME_WORLD_ART.v34ApprovedHome}");background-repeat:no-repeat;background-size:100% auto;background-position:center -66.4vw;filter:drop-shadow(0 5px 7px #8c327426);cursor:pointer;animation:v34-chest-glow 3s ease-in-out infinite}
  .v34-surprise:active{transform:scale(.985);filter:drop-shadow(0 0 14px #ffde67)}
  .v34-surprise-label{position:absolute;inset:auto 0 9%;display:block;width:max-content;max-width:90%;margin:auto;padding:5px 16px;border:2px solid #fff8d6;border-radius:999px;background:linear-gradient(120deg,#d72cc4ed,#853bc9ed);color:#fff;font-size:clamp(14px,4vw,24px);font-weight:1000;text-shadow:0 2px 3px #542166;box-shadow:0 3px 0 #672c9b,0 0 15px #ffe06c;pointer-events:none}
  .v34-surprise:focus-visible{outline:4px solid #ffdb58;outline-offset:3px}.v34-surprise:focus-visible .v34-surprise-label{background:#631491}
  .v34-creations-page{min-height:70vh;padding:22px 16px}.v34-creations-page h1{margin:0;color:#7929ad}.v34-creations-page>p{margin:4px 0 12px;color:#76548d}
  .v34-section-heading{display:flex;align-items:center;justify-content:space-between;gap:8px;margin-bottom:8px}.v34-section-heading h2{margin:0;color:#8B5CF6;font-family:var(--v34-ui-font);font-size:clamp(18px,4.6vw,31px);font-weight:1000;line-height:1.05;text-shadow:0 1px #fff}
  .v34-section-heading p{margin:3px 0 0;color:#865da5;font-size:clamp(10px,2.5vw,15px);font-weight:800}.v34-section-heading>span{flex:none;color:#8963a6;font-size:clamp(9px,2vw,13px);font-weight:900}
  .v34-rail-section{position:relative;min-width:0;margin:8px clamp(8px,2.6vw,28px) 0;padding:12px 12px 9px;border:2px solid #fff;border-radius:25px;background:linear-gradient(115deg,#fff1fbf5,#fff8fff5 55%,#fff0f7f5);box-shadow:0 5px 0 #f5bfdc,0 9px 18px #87368124;overflow:hidden}
  .v34-rail{display:flex;gap:clamp(8px,2vw,16px);min-width:0;overflow-x:auto;overscroll-behavior-x:contain;scrollbar-width:none;scroll-snap-type:x mandatory;padding:2px 2px 7px}.v34-rail::-webkit-scrollbar{display:none}
  .v34-recipe-card,.v34-country-card{position:relative;display:flex;flex:0 0 clamp(136px,34vw,220px);flex-direction:column;gap:4px;min-width:0;padding:6px;border:1px solid #f5d3e7;border-radius:20px;background:#fff;color:#421362;text-align:center;box-shadow:0 3px 0 #f3c1df,0 5px 12px #55226e22;scroll-snap-align:start}
  .v34-recipe-card .home-thumb,.v34-country-art{display:block;width:100%;height:clamp(92px,23vw,150px);overflow:hidden;border-radius:15px;background:linear-gradient(135deg,#ffdfef,#fff0bb)}.v34-recipe-card .home-thumb img,.v34-country-art img{width:100%;height:100%;object-fit:cover}
  .v34-recipe-card strong,.v34-country-card strong{font-family:Georgia,serif;font-size:clamp(12px,3vw,16px);font-weight:950;line-height:1.15}
  .v34-card-badge{position:absolute;top:10px;right:9px;padding:4px 8px;border:1px solid #fff;border-radius:999px;background:#f33f9f;color:#fff;font-size:10px;font-weight:950;box-shadow:0 2px 6px #4c164d55}
  .v34-home-photo{display:block;width:100%;height:clamp(92px,23vw,150px);object-fit:cover;border-radius:15px}.v34-country-art{position:relative;display:grid;place-items:center}.v34-country-art>img{position:absolute;inset:0}.v34-country-food{position:absolute;right:8px;bottom:7px;display:grid;place-items:center;width:45px;height:45px;border:2px solid #fff;border-radius:50%;background:#fff7d9;font-size:27px;box-shadow:0 2px 9px #391e4b66}.v34-country-card small{color:#76548d;font-size:11px;font-weight:850}
  .v34-empty-creations{display:grid;justify-items:start;align-content:center;gap:6px;flex:0 0 min(88%,390px);min-height:118px;padding:14px;border:2px dashed #db9dd7;border-radius:20px;background:#fffafde8;color:#552277}.v34-empty-creations>span{font-size:27px}.v34-empty-creations strong{font-family:Georgia,serif;font-size:15px}.v34-empty-creations p{margin:0;color:#806492;font-size:12px}.v34-empty-creations button{min-height:40px;padding:7px 14px;border:0;border-radius:14px;background:#853dae;color:white;font-weight:900}
  .v34-modal-backdrop{position:fixed;z-index:10000;inset:0;display:grid;place-items:center;padding:18px;background:#281239aa}
  .v34-surprise-dialog{position:relative;width:min(100%,410px);max-height:88dvh;overflow:auto;padding:22px;border:3px solid #fff;border-radius:28px;background:linear-gradient(145deg,#fff2fc,#fff8df);box-shadow:0 16px 50px #20122d66;text-align:center}
  .v34-modal-close{position:absolute;top:10px;right:10px;width:42px;height:42px;border:0;border-radius:50%;background:#f3dcff;color:#602580;font-size:27px}
  .v34-country-dialog{position:relative;width:min(100%,650px);max-height:88dvh;overflow:auto;padding:22px;border:3px solid #fff;border-radius:26px;background:linear-gradient(145deg,#fff6ff,#fff9e6);box-shadow:0 16px 50px #20122d66}.v34-country-dialog h2{margin:4px 0 14px;color:#702894}.v34-country-recipes{display:grid;grid-template-columns:repeat(auto-fit,minmax(145px,1fr));gap:10px;max-height:65dvh;overflow:auto}.v34-country-recipes .v34-recipe-card{width:100%;flex:none}
  .v34-home-style{margin:16px 8px;padding:16px;border:2px solid #fff;border-radius:22px;background:linear-gradient(115deg,#fff8fe,#fff7e7);box-shadow:0 4px 0 #e2c9e8}.v34-home-style h2{margin:0;color:#702894;font-size:20px}.v34-home-style>p{color:#70587f}.v34-style-options{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}.v34-style-option{display:grid;justify-items:start;gap:6px;min-height:134px;padding:10px;border:2px solid #e7d6ed;border-radius:17px;background:#fff;color:#513563;text-align:left}.v34-style-option.is-selected{border-color:#9c4ec1;background:#fcf2ff;box-shadow:0 0 0 2px #e6c5f2}.v34-style-preview{display:grid;place-items:center;width:100%;height:53px;border-radius:12px;font-size:24px}.classic-preview{background:linear-gradient(110deg,#fff3dc,#e5f4e7)}.magical-preview{background:linear-gradient(110deg,#f5dcff,#ffe9b8)}.v34-style-option strong{font-size:14px}.v34-style-option small{color:#786588;font-size:11px}.v34-style-status{font-size:12px}.v34-country-card .home-thumb{width:100%;height:100%;margin:0}
  @keyframes v34-orbit{to{transform:rotate(360deg)}}@keyframes v34-globe-spin{to{filter:hue-rotate(8deg)}}@keyframes v34-globe-float{0%,100%{translate:0 0}50%{translate:0 -5px}}@keyframes v34-chest-glow{0%,100%{filter:drop-shadow(0 4px 5px #8c327426)}50%{filter:drop-shadow(0 0 12px #ffde7799)}}
  @media(min-width:700px){.v34-activity-section{height:clamp(230px,23vw,300px);padding-inline:62px}.v34-activity-card{max-width:176px}.v34-activity-card strong{font-size:clamp(13px,1.55vw,19px)}.v34-activity-art.v34-world-activity-art{background-size:32vw auto;background-position:-22vw -3vw}.v34-rail-section{margin-inline:auto;width:calc(100% - 40px)}.v34-recipe-card,.v34-country-card{flex-basis:clamp(190px,21vw,230px)}}
  @media(max-width:420px){.app.v34-home-active #screen{padding-bottom:calc(82px + env(safe-area-inset-bottom))}.v34-hero{height:clamp(185px,47vw,230px)}.v34-activity-section{height:158px;padding-inline:30px;padding-bottom:21px}.v34-activity-track{gap:1px}.v34-activity-card{height:82%;min-height:106px}.v34-activity-art{height:clamp(48px,14vw,57px)}.v34-activity-art.v34-world-activity-art{background-size:38vw auto;background-position:-26vw -3.5vw}.v34-activity-card strong{min-height:36px;font-size:clamp(8px,2.45vw,10px)}.v34-carousel-controls{inset:38% 1% auto}.v34-carousel-controls button{width:30px;height:30px;font-size:24px}.v34-carousel-dots{bottom:7px}.v34-surprise{height:22vw;min-height:82px}.v34-rail-section{margin-inline:7px;padding:10px 9px 8px;border-radius:20px}.v34-section-heading p{font-size:10px}.v34-recipe-card,.v34-country-card{flex-basis:clamp(128px,37vw,154px)}.v34-recipe-card .home-thumb,.v34-country-art,.v34-home-photo{height:clamp(87px,25vw,106px)}.v34-style-options{grid-template-columns:1fr}.v34-style-option{min-height:108px}.v34-style-preview{height:42px}.app.v34-magical #nav{width:calc(100vw - 10px)!important;padding:4px 3px!important;border-radius:20px!important}.app.v34-magical #nav .tab{min-height:49px;font-size:9px}.app.v34-magical #nav .tab b{font-size:19px}}
  @media(max-height:520px) and (orientation:landscape){.v34-hero{height:min(43vh,360px)}.v34-activity-section{height:190px;padding-inline:54px}.v34-activity-art{min-height:100px}.v34-activity-card{min-height:145px}.v34-surprise{height:clamp(90px,13vw,155px)}.v34-rail-section{margin-top:4px;padding:8px 10px}.v34-recipe-card .home-thumb,.v34-country-art,.v34-home-photo{height:88px}.app.v34-home-active #screen{padding-bottom:78px}}
  @media(orientation:landscape){.v34-approved-scene{background-image:linear-gradient(180deg,#fff4ff12,#54247740),url("${V31_HOME_WORLD_ART.v34BackgroundLandscape}");background-position:center 46%;background-size:cover}.v34-hero{height:clamp(310px,55vh,510px)}.v34-hero-title{width:62%;font-size:clamp(36px,5.4vw,64px)}.v34-hero-aaria{left:12%;height:88%;width:50%}.v34-hero-globe{left:69%;top:31%;width:25%;height:52%;background-size:58vw auto;background-position:-42.3vw -5.8vw}.v34-activity-section{height:clamp(210px,27vw,300px);padding-inline:55px}.v34-activity-card{max-width:170px}.v34-activity-art{height:clamp(74px,10vw,118px)}.v34-carousel-globe{width:clamp(62px,9vw,90px);height:clamp(62px,9vw,90px);background-size:38vw auto;background-position:-27.7vw -3.7vw}}
  @media(min-width:700px) and (orientation:landscape){.v34-hero{height:clamp(360px,56vh,570px)}.v34-hero-aaria{left:19%;height:94%}.v34-hero-globe{left:68%;top:26%;width:27%;height:60%;background-size:58vw auto;background-position:-42.3vw -5.8vw}.v34-carousel-globe{width:clamp(82px,10vw,120px);height:clamp(82px,10vw,120px)}}
  @media(max-width:420px) and (orientation:portrait){.v34-hero{height:clamp(300px,78vw,370px)}.v34-hero-title{font-size:clamp(27px,7vw,36px);width:78%}.v34-hero-aaria{height:77%;width:62%}.v34-hero-globe{left:66%;top:40%;width:30%;height:40%;background-size:100vw auto;background-position:-73vw -10vw}.v34-carousel-globe{width:48px;height:48px;background-size:50vw auto;background-position:-36.6vw -4.9vw}}
  @media(max-height:520px) and (orientation:landscape){.v34-hero{height:min(52vh,330px);min-height:190px}.v34-hero-title{font-size:clamp(28px,4.5vw,44px)}.v34-hero-aaria{height:78%;left:14%}.v34-hero-globe{left:68%;top:29%;width:27%;height:55%}.v34-activity-section{height:clamp(144px,36vh,205px);padding-inline:44px;padding-bottom:16px}.v34-activity-card{height:85%;min-height:110px}.v34-activity-art{height:clamp(58px,14vw,82px)}.v34-surprise{height:clamp(90px,18vw,135px)}}
  @media(prefers-reduced-motion:reduce){.v34-home *,.v34-home *:before,.v34-home *:after{scroll-behavior:auto!important;animation-duration:.01ms!important;animation-iteration-count:1!important;transition-duration:.01ms!important}.v34-activity-viewport{scroll-behavior:auto}}
  `;
  document.head.insertAdjacentHTML('beforeend', `<style id="v34-dual-home-style">
${v34Style}
</style>`);

  const WELCOME_SCENES = [
    { text: 'Preparing something magical...', aria: 'Aaria raises her arms in the magical kitchen. Preparing something magical...' },
    { text: 'Mixing fun, flavours and surprises!', aria: 'Aaria stirs her magical mixing bowl. Mixing fun, flavours and surprises!' },
    { text: 'Welcome to my Magical Kitchen!', aria: 'Aaria celebrates in the magical kitchen. Welcome to my Magical Kitchen!' }
  ];
  let welcomeOverlay = null;
  let welcomeSceneIndex = 0;
  let welcomeClosing = false;

  function v34WelcomeScene(index, focusControl) {
    if (!welcomeOverlay) return;
    welcomeSceneIndex = Math.max(0, Math.min(2, index));
    const scene = WELCOME_SCENES[welcomeSceneIndex];
    const frame = welcomeOverlay.querySelector('.v34-welcome-frame');
    frame.style.backgroundPosition = ['0% center', '50% center', '100% center'][welcomeSceneIndex];
    frame.setAttribute('aria-label', scene.aria);
    welcomeOverlay.querySelector('.v34-welcome-live').textContent = scene.text;
    welcomeOverlay.querySelector('.v34-welcome-status').textContent = 'Scene ' + (welcomeSceneIndex + 1) + ' of 3';
    welcomeOverlay.querySelector('.v34-welcome-back').hidden = welcomeSceneIndex === 0;
    welcomeOverlay.querySelector('.v34-welcome-next').hidden = welcomeSceneIndex === 2;
    welcomeOverlay.querySelector('.v34-welcome-enter-wrap').hidden = welcomeSceneIndex !== 2;
    if (focusControl) {
      const selector = welcomeSceneIndex === 2 ? '.v34-welcome-enter' :
        welcomeSceneIndex === 0 ? '.v34-welcome-next' : '.v34-welcome-back';
      welcomeOverlay.querySelector(selector)?.focus({ preventScroll: true });
    }
  }

  function v34FinishWelcome() {
    if (!welcomeOverlay) return;
    const overlay = welcomeOverlay;
    welcomeOverlay = null;
    document.querySelector('.app')?.removeAttribute('inert');
    overlay.remove();
    v34SyncNavigation(homeStyle() === 'magical');
    if (view === 'home') render();
    document.querySelector('#nav [data-nav="home"]')?.focus({ preventScroll: true });
  }

  function v34CloseWelcome() {
    if (!welcomeOverlay) return;
    welcomeClosing = true;
    try { history.back(); }
    catch { welcomeClosing = false; v34FinishWelcome(); }
  }

  function v34ShowWelcome() {
    const app = document.querySelector('.app');
    if (!app || document.getElementById('v34-welcome')) return;
    welcomeOverlay = document.createElement('section');
    welcomeOverlay.id = 'v34-welcome';
    welcomeOverlay.className = 'v34-welcome-shell';
    welcomeOverlay.setAttribute('role', 'dialog');
    welcomeOverlay.setAttribute('aria-modal', 'true');
    welcomeOverlay.setAttribute('aria-labelledby', 'v34-welcome-title');
    welcomeOverlay.innerHTML =
      '<h1 id="v34-welcome-title" class="v34-welcome-sr">Aaria’s Magical Kitchen welcome</h1>' +
      '<header class="v34-welcome-top"><span aria-hidden="true">Aaria’s Magical Kitchen</span>' +
      '<button class="v34-welcome-button v34-welcome-skip" type="button" aria-label="Skip welcome and enter the selected Home style">Skip</button></header>' +
      '<div class="v34-welcome-stage"><div class="v34-welcome-frame" role="img"></div>' +
      '<div class="v34-welcome-particles" aria-hidden="true">' +
        '<span class="v34-welcome-particle" style="--x:4%;--y:17%;--s:21px;--d:4.4s;--delay:-.7s">♥</span>' +
        '<span class="v34-welcome-particle" style="--x:88%;--y:13%;--s:23px;--d:3.7s;--delay:-1.1s">✦</span>' +
        '<span class="v34-welcome-particle" style="--x:1%;--y:49%;--s:19px;--d:5.1s;--delay:-2.1s">✧</span>' +
        '<span class="v34-welcome-particle" style="--x:94%;--y:42%;--s:19px;--d:4.8s;--delay:-.4s">🥕</span>' +
        '<span class="v34-welcome-particle" style="--x:83%;--y:67%;--s:19px;--d:4.5s;--delay:-1.5s">★</span>' +
        '<span class="v34-welcome-particle" style="--x:5%;--y:73%;--s:19px;--d:5.3s;--delay:-2.3s">🍓</span>' +
        '<span class="v34-welcome-particle" style="--x:97%;--y:64%;--s:18px;--d:3.9s;--delay:-.8s">💛</span>' +
        '<span class="v34-welcome-particle" style="--x:38%;--y:4%;--s:18px;--d:4.7s;--delay:-2s">✨</span>' +
        '<span class="v34-welcome-particle" style="--x:66%;--y:29%;--s:18px;--d:5.5s;--delay:-1s">🥦</span>' +
        '<span class="v34-welcome-particle" style="--x:23%;--y:84%;--s:17px;--d:4.9s;--delay:-.2s">🎉</span>' +
      '</div></div>' +
      '<div class="v34-welcome-live v34-welcome-sr" aria-live="polite" aria-atomic="true"></div>' +
      '<footer class="v34-welcome-footer"><button class="v34-welcome-button v34-welcome-back" type="button">Back</button>' +
      '<span class="v34-welcome-status" aria-live="polite"></span>' +
      '<button class="v34-welcome-button v34-welcome-next" type="button">Next</button>' +
      '<div class="v34-welcome-enter-wrap" hidden><button class="v34-welcome-enter" type="button" aria-label="Enter My Magical Kitchen">➜</button>' +
      '<span>Enter My Magical Kitchen</span></div></footer>';
    document.body.appendChild(welcomeOverlay);
    document.getElementById('v34-welcome-boot')?.remove();
    app.setAttribute('inert', '');
    welcomeOverlay.querySelector('.v34-welcome-next').addEventListener('click', () => v34WelcomeScene(welcomeSceneIndex + 1, true));
    welcomeOverlay.querySelector('.v34-welcome-back').addEventListener('click', () => v34WelcomeScene(welcomeSceneIndex - 1, true));
    welcomeOverlay.querySelector('.v34-welcome-skip').addEventListener('click', v34CloseWelcome);
    welcomeOverlay.querySelector('.v34-welcome-enter').addEventListener('click', v34CloseWelcome);
    welcomeOverlay.addEventListener('keydown', event => {
      if (event.key === 'ArrowRight' && welcomeSceneIndex < 2) v34WelcomeScene(welcomeSceneIndex + 1, true);
      if (event.key === 'ArrowLeft' && welcomeSceneIndex > 0) v34WelcomeScene(welcomeSceneIndex - 1, true);
    });
    welcomeSceneIndex = 0;
    try { history.pushState({ v34Welcome: true }, '', location.href); } catch {}
    v34WelcomeScene(welcomeSceneIndex, false);
    welcomeOverlay.querySelector('.v34-welcome-next')?.focus({ preventScroll: true });
  }

  window.addEventListener('popstate', () => {
    if (!welcomeOverlay) return;
    if (welcomeClosing) {
      welcomeClosing = false;
      v34FinishWelcome();
      return;
    }
    if (welcomeSceneIndex > 0) v34WelcomeScene(welcomeSceneIndex - 1, true);
    try { history.pushState({ v34Welcome: true }, '', location.href); } catch {}
  });

  const v34WelcomeStyle = [
    '.v34-welcome-shell{position:fixed;z-index:2147483000;inset:0;display:grid;grid-template-rows:auto minmax(0,1fr) auto;gap:8px;padding:max(8px,env(safe-area-inset-top)) max(12px,env(safe-area-inset-right)) max(10px,env(safe-area-inset-bottom)) max(12px,env(safe-area-inset-left));overflow:hidden;background:radial-gradient(ellipse at 50% 43%,#7d45a9,#35114e 78%);color:#fff8ea;font-family:ui-rounded,"Arial Rounded MT Bold",system-ui,sans-serif;overscroll-behavior:none}',
    '.v34-welcome-top{display:flex;align-items:center;justify-content:space-between;gap:10px;min-height:46px;font-size:clamp(14px,2.6vw,19px);font-weight:900;text-shadow:0 2px 8px #190b2d}',
    '.v34-welcome-stage{position:relative;display:grid;place-items:center;min-height:0;overflow:visible}',
    '.v34-welcome-frame{height:100%;max-height:100%;max-width:100%;aspect-ratio:0.4921875/1;border-radius:clamp(12px,2vw,22px);background-image:var(--v34-welcome-art);background-repeat:no-repeat;background-size:303% 100%;background-position:0% center;box-shadow:0 12px 30px #1d0a2e80}',
    '.v34-welcome-particles{position:absolute;inset:0;pointer-events:none;overflow:hidden}',
    '.v34-welcome-particle{position:absolute;left:var(--x);top:var(--y);font-size:var(--s);line-height:1;filter:drop-shadow(0 0 7px #fff1a3);animation:v34-welcome-drift var(--d) ease-in-out var(--delay) infinite alternate,v34-welcome-twinkle calc(var(--d)*.67) ease-in-out var(--delay) infinite alternate}',
    '.v34-welcome-particle:nth-child(3n){animation-name:v34-welcome-drift-left,v34-welcome-twinkle}',
    '.v34-welcome-button{min-width:74px;min-height:48px;padding:10px 17px;border:2px solid #fff2dc;border-radius:999px;background:linear-gradient(135deg,#8735bd,#d343a8);color:#fff;font:850 16px ui-rounded,"Arial Rounded MT Bold",system-ui,sans-serif;box-shadow:0 4px 0 #32104e,0 0 16px #ffd86650}',
    '.v34-welcome-button:active{transform:translateY(2px);box-shadow:0 2px 0 #32104e,0 0 20px #ffd866a0}',
    '.v34-welcome-button:focus-visible,.v34-welcome-enter:focus-visible{outline:4px solid #ffe47a;outline-offset:4px}',
    '.v34-welcome-footer{position:relative;display:flex;align-items:center;justify-content:space-between;gap:12px;min-height:74px;padding:8px 2px 16px}',
    '.v34-welcome-status{position:absolute;left:50%;bottom:0;transform:translateX(-50%);font-size:11px;color:#fff9;white-space:nowrap}',
    '.v34-welcome-enter-wrap{display:flex;align-items:center;gap:10px;margin-left:auto;font-size:12px;font-weight:900}',
    '.v34-welcome-enter-wrap[hidden]{display:none}',
    '.v34-welcome-enter{display:grid;place-items:center;width:72px;height:72px;min-width:64px;min-height:64px;padding:0;border:4px solid #fff3bc;border-radius:50%;background:radial-gradient(circle at 30% 23%,#fff28c,#ff9a3f 57%,#d539ad);color:#fff;font-size:44px;font-weight:1000;line-height:1;text-shadow:0 3px 5px #51205f;box-shadow:0 0 0 6px #ffd94b50,0 0 24px 12px #ffe44b9c,0 5px 0 #572078;animation:v34-welcome-pulse 1.8s ease-in-out infinite alternate}',
    '.v34-welcome-sr{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}',
    '@keyframes v34-welcome-drift{from{transform:translate3d(0,10px,0) rotate(-8deg)}to{transform:translate3d(0,-23px,0) rotate(11deg)}}',
    '@keyframes v34-welcome-drift-left{from{transform:translate3d(8px,11px,0) rotate(9deg)}to{transform:translate3d(-14px,-20px,0) rotate(-13deg)}}',
    '@keyframes v34-welcome-twinkle{from{opacity:.42;filter:drop-shadow(0 0 3px #fff4a5)}to{opacity:1;filter:drop-shadow(0 0 11px #fff4a5)}}',
    '@keyframes v34-welcome-pulse{from{transform:scale(.97);box-shadow:0 0 0 5px #ffd94b42,0 0 18px 8px #ffe44b75,0 5px 0 #572078}to{transform:scale(1.04);box-shadow:0 0 0 9px #ffd94b60,0 0 30px 15px #ffe44bcb,0 5px 0 #572078}}',
    '@media(orientation:landscape){.v34-welcome-frame{height:100%;width:auto}.v34-welcome-enter-wrap{position:absolute;right:4px;bottom:18px}.v34-welcome-status{bottom:4px}}',
    '@media(max-height:480px){.v34-welcome-top{min-height:38px}.v34-welcome-footer{min-height:60px;padding-bottom:12px}.v34-welcome-enter{width:64px;height:64px;font-size:39px}.v34-welcome-button{min-height:44px}}',
    '@media(prefers-reduced-motion:reduce){.v34-welcome-particle{display:none!important;animation:none!important}.v34-welcome-enter{animation:none!important;transform:none!important;box-shadow:0 0 0 6px #ffd94b50,0 0 22px 9px #ffe44b9c,0 5px 0 #572078}}'
  ].join('');
  document.head.insertAdjacentHTML('beforeend', '<style id="v34-welcome-style">' + v34WelcomeStyle + '</style>');

  document.addEventListener('DOMContentLoaded', () => {
    v34SyncNavigation(homeStyle() === 'magical');
    if (view === 'home') render();
    v34ShowWelcome();
  }, { once: true });
})();
