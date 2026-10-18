/* __AARIA_V3_MARKER__: shared HTML + APK experience */
const V3_ART=__V3_ART_JSON__;
const V3_INGREDIENT_ATLAS=__V3_INGREDIENT_ATLAS_JSON__;
const V3_PROFILE_ART=__V3_PROFILE_ART_JSON__;
const V31_WORLD_GEOGRAPHY=__V31_WORLD_GEOGRAPHY_JSON__;
const V31_WORLD_ADVENTURE=__V31_WORLD_ADVENTURE_JSON__;
const V31_WORLD_ADVENTURE_ART=__V31_WORLD_ADVENTURE_ART_JSON__;
function v3IngredientClass(value){
 const t=String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 // Only use a sprite when the atlas actually depicts that ingredient. This
 // deliberately avoids broad substitutions such as peas -> spinach or oil -> milk.
 if(/strawber/.test(t))return 0;
 if(/banana/.test(t))return 1;
 if(/mango/.test(t))return 2;
 if(/apple/.test(t))return 3;
 if(/carrot/.test(t))return 4;
 if(/tomato/.test(t))return 5;
 if(/broccoli/.test(t))return 6;
 if(/spinach/.test(t))return 7;
 if(/\bcorn\b|maize/.test(t))return 8;
 if(/\beggs?\b/.test(t))return 9;
 if(/cheese/.test(t))return 10;
 if(/\bmilk\b/.test(t))return 11;
 if(/\bbread\b|toast/.test(t))return 12;
 if(/\bflour\b/.test(t))return 13;
 if(/chickpea|garbanzo/.test(t))return 14;
 if(/\bchicken\b/.test(t)&&!/cooked|nugget|roast|grilled/.test(t))return 15;
 return -1;
}
function v3IngredientFallback(value){
 const t=String(value).normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 if(/\bblack pepper\b|\bpeppercorn|\bsalt\b/.test(t))return '🧂';
 if(/\boil\b|olive oil|ghee/.test(t))return '🫒';
 if(/\brice\b|poha|puffed rice/.test(t))return '🍚';
 if(/\bpeas?\b/.test(t))return '🫛';
 if(/ketchup|tomato sauce|salsa/.test(t))return '🍅';
 if(/paneer/.test(t))return '🧀';
 if(/yogh?urt|curd|cream/.test(t))return '🥣';
 if(/\bmilk\b/.test(t))return '🥛';
 if(/butter/.test(t))return '🧈';
 if(/onion/.test(t))return '🧅';
 if(/garlic/.test(t))return '🧄';
 if(/cucumber|courgette|zucchini/.test(t))return '🥒';
 if(/potato/.test(t))return '🥔';
 if(/lettuce|kale|leafy greens|cabbage/.test(t))return '🥬';
 if(/capsicum|bell pepper/.test(t))return '🫑';
 if(/chilli|chili|paprika/.test(t))return '🌶️';
 if(/cinnamon|spice|masala/.test(t))return '🧂';
 if(/flour|oat|semolina|suji|pasta|noodle|cereal/.test(t))return '🌾';
 if(/fish|salmon|tuna|prawn|shrimp/.test(t))return '🐟';
 if(/turkey|meat|beef/.test(t))return '🍖';
 return '🧺';
}
function v3IngredientArt(value){
 const idx=v3IngredientClass(value);
 if(idx<0)return `<span aria-hidden="true">${v3IngredientFallback(value)}</span>`;
 return `<span class="v3-ingredient-art v3-food-${idx}" role="img" aria-label="${safe(value)}"></span>`;
}
// The production batch renderer has hand-drawn, ingredient-specific SVGs for
// the full recipe catalogue. Keep it intact; the small atlas is only a fallback
// for the older recipe card renderer, where exact atlas matches are available.
ingredientPicture=function v3IngredientPicture(value){return v3IngredientArt(value)};
for(const [id,a] of Object.entries(V3_ART)){
  const initial=a.variants?.CHEF_A||a;
  NEW_RECIPE_ART[id]={...(NEW_RECIPE_ART[id]||{}),atlas:initial.atlas,storyboard:initial.atlas,hero:initial.hero,profileVariants:a.variants||null,cellAspect:a.aspect,status:a.status||'approved'};
  const stepCells=Number(id)===3?[0,1,2,3,4]:[1,2,3,4].includes(Number(id))?[0,1,2,3]:[1,2,3,4];
  BATCH_META[id]={...(BATCH_META[id]||{}),stepCells};
}
// The 95 production records stay untouched in index.html. These pilot recipes
// are appended only to the V3.1 offline build and use the existing recipe flow.
for(const pilot of V31_WORLD_ADVENTURE.recipes){
 const id=pilot.id,r=pilot.record,art=V31_WORLD_ADVENTURE_ART[id];
 if(!RECIPES.some(existing=>existing.id===id))RECIPES.push(r);
 PT_RECIPES[id]={...(PT_RECIPES[id]||{}),...pilot.pt};
 NUTRITION_PLANS[id]=pilot.nutritionPlan;
 for(const [key,ref] of Object.entries(V31_WORLD_ADVENTURE.nutritionRefs))NUTRIENT_REFS[`v31_${key}`]=ref;
 BATCH_ATLASES[id]=art.atlas;
 NEW_RECIPE_ART[id]={atlas:art.atlas,storyboard:art.atlas,hero:art.hero,dish:art.hero,cellAspect:1,status:art.status};
 BATCH_META[id]={title:pilot.pt.title,steps:pilot.pt.steps,titles:pilot.record.steps.map((_,i)=>`Step ${i+1}`),tools:pilot.record.equipment,line:pilot.record.description,stepCells:[0,1,2,3,4,5]};
 STEP_GUIDES[id]=pilot.record.steps.map((title,i)=>({title,emoji:r.emoji,tip:pilot.record.safety}));
 pilot.record.steps.forEach((text,i)=>{if(pilot.pt.steps?.[i])PT_TRANSLATIONS[text]=pilot.pt.steps[i]});
}

home=function v3Home(){
 const stats=homeStats();
 const recent=[...(state.done||[])].reverse().map(find).filter(Boolean);
 const favs=(state.favorites||[]).map(find).filter(Boolean);
 const picks=(favs.length?favs:recent.length?recent:RECIPES.slice(0,6)).slice(0,6);
 const pt=state.language==='pt-BR';
 const title=pt?'Cozinha mágica da Aaria':'Aaria’s Magical Kitchen';
 const aaria=avatar('v3-hero-avatar');
 return `<section class="v3-home" aria-label="${title}">
  <header class="v3-home-top"><div class="v3-brand"><span class="v3-brand-mark" aria-hidden="true">✨</span><span>${title}<small>${pt?'Sua cozinha · Suas criações · Sua magia':'Your kitchen · Your creations · Your magic'}</small></span></div><button class="v3-settings" data-nav="settings" aria-label="${pt?'Configurações':'Settings'}">⚙️</button></header>
  <section class="v31-home-hero"><div class="v31-hero-copy"><span class="v3-eyebrow">${pt?'✨ AVENTURAS NA COZINHA':'✨ LITTLE KITCHEN ADVENTURES'}</span><h1>${pt?'O que vamos criar hoje?':'What shall we make today?'}</h1><p>${pt?'Escolha uma receita ou explore sabores do mundo.':'Pick a recipe or explore flavours around the world.'}</p><div class="v31-primary-actions"><button class="v3-primary" data-nav="library">${pt?'Vamos cozinhar':'Let’s Cook'} <span aria-hidden="true">→</span></button><button class="v31-world-primary" data-v31-open-world>${pt?'Explorar o mundo':'Explore the World'} <span aria-hidden="true">🌍</span></button></div></div><div class="v31-hero-art">${aaria}<span class="v31-sparkle v31-sparkle-a" aria-hidden="true">✦</span><span class="v31-sparkle v31-sparkle-b" aria-hidden="true">✧</span></div></section>
  <section class="v31-shortcuts" aria-label="${pt?'Atalhos da cozinha':'Kitchen shortcuts'}"><button class="v31-shortcut v31-surprise" data-action="open-wheel"><span aria-hidden="true">🎁</span><span><strong>${pt?'Surpresa!':'Surprise Me'}</strong><small>${pt?'Uma receita escolhida na roda':'Spin for a recipe'}</small></span></button><button class="v31-shortcut v31-planner" data-nav="week"><span aria-hidden="true">🗓️</span><span><strong>${pt?'Meu planejador':'My Planner'}</strong><small>${pt?'Planeje a semana em família':'Plan a fun week together'}</small></span></button></section>
  <div class="v3-section-head"><div><h2>${pt?'Receita em destaque':'Featured recipe'}</h2><p>${pt?'Uma ideia deliciosa para começar.':'A delicious idea to get started.'}</p></div><button class="text-link" data-nav="library">${pt?'Ver todas':'Browse all'} →</button></div>
  <section class="v3-rail" aria-label="${pt?'Receitas em destaque':'Featured recipes'}">${picks.map(homeTile).join('')}</section>
  <section class="v31-world-shelf"><div class="v3-section-head"><div><h2>${pt?'Aventuras de comida pelo mundo':'World Food Adventures'}</h2><p>${pt?'Conheça um lugar novo, um sabor de cada vez.':'Meet a new place, one flavour at a time.'}</p></div><button class="text-link" data-v31-open-world>${pt?'Explorar':'Explore'} →</button></div><button class="v31-world-card" data-v31-open-world><span class="v31-world-globe" aria-hidden="true">🌏</span><span><strong>${pt?'Seu passaporte culinário':'Your food explorer passport'}</strong><small>${pt?'Sete destinos para descobrir no mapa':'Seven destinations to discover on the map'}</small></span><span class="v31-country-flags" aria-hidden="true">🇮🇳 🇮🇹 🇨🇳 🇯🇵 🇲🇽 🇻🇳 🇬🇷</span><span class="v31-card-arrow" aria-hidden="true">→</span></button></section>
  <section class="v31-collection-links"><div class="v3-section-head"><div><h2>${pt?'Cozinhe junto':'Cook together'}</h2><p>${pt?'Com as pessoas que você gosta.':'With the people you love.'}</p></div></div><div class="v31-collection-grid"><button data-nav="family">👨‍👩‍👧 <strong>${pt?'Com a família':'With Family'}</strong></button><button data-nav="friends">🧑‍🍳 <strong>${pt?'Com amigos':'With Friends'}</strong></button></div></section>
  <nav class="v3-quick-links" aria-label="${pt?'Mais atividades':'More activities'}"><button data-nav="rewards">🏆 ${pt?'Prêmios':'Awards'} · ${stats.badges}</button><button data-nav="stories">🧚 ${pt?'Histórias e música':'Stories and music'}</button><button data-action="groceries-choose">🛒 ${pt?'Lista de compras':'Shopping list'}</button><button data-nav="settings">⚙️ ${pt?'Configurações':'Settings'}</button></nav>
 </section>`;
};

const V31_APPROVED_INDIA_RECIPE_IDS=[51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,69,72,74];
const V31_WORLD_DESTINATIONS=[
 {code:'IND',iso:'IND',en:'India',pt:'Índia',flag:'🇮🇳',factEn:'Explore existing Indian recipes from Aaria’s original kitchen collection.',factPt:'Explore receitas indianas existentes da coleção original da cozinha da Aaria.',reviewStatus:'approved-reference'},
 {code:'ITA',iso:'ITA',en:'Italy',pt:'Itália',flag:'🇮🇹',factEn:'New recipe adventures are being reviewed before they are added.',factPt:'Novas aventuras de receitas estão sendo revisadas antes de serem adicionadas.',recipeIds:[96],reviewStatus:'draft'},
 {code:'CHN',iso:'CHN',en:'China',pt:'China',flag:'🇨🇳',factEn:'New recipe adventures are being reviewed before they are added.',factPt:'Novas aventuras de receitas estão sendo revisadas antes de serem adicionadas.',recipeIds:[97,98],reviewStatus:'draft'},
 {code:'JPN',iso:'JPN',en:'Japan',pt:'Japão',flag:'🇯🇵',factEn:'New recipe adventures are being reviewed before they are added.',factPt:'Novas aventuras de receitas estão sendo revisadas antes de serem adicionadas.',reviewStatus:'draft'},
 {code:'MEX',iso:'MEX',en:'Mexico',pt:'México',flag:'🇲🇽',factEn:'New recipe adventures are being reviewed before they are added.',factPt:'Novas aventuras de receitas estão sendo revisadas antes de serem adicionadas.',reviewStatus:'draft'},
 {code:'VNM',iso:'VNM',en:'Vietnam',pt:'Vietnã',flag:'🇻🇳',factEn:'New recipe adventures are being reviewed before they are added.',factPt:'Novas aventuras de receitas estão sendo revisadas antes de serem adicionadas.',reviewStatus:'draft'},
 {code:'GRC',iso:'GRC',en:'Greece',pt:'Grécia',flag:'🇬🇷',factEn:'New recipe adventures are being reviewed before they are added.',factPt:'Novas aventuras de receitas estão sendo revisadas antes de serem adicionadas.',reviewStatus:'draft'}
];
const V31_DESTINATION_BY_ISO=Object.fromEntries(V31_WORLD_DESTINATIONS.map(x=>[x.code,x]));
let v31SelectedCountry='IND';
function v31MapPoint(coord){const lon=Number(coord[0]),lat=Math.max(-85,Math.min(85,Number(coord[1])));return [((lon+180)/360*1000).toFixed(1),((85-lat)/170*500).toFixed(1)]}
function v31RingPath(ring){if(!Array.isArray(ring)||ring.length<4)return '';return ring.map((point,i)=>{const [x,y]=v31MapPoint(point);return `${i?'L':'M'}${x} ${y}`}).join(' ')+'Z'}
function v31GeometryPath(geometry){if(!geometry)return '';const polys=geometry.type==='Polygon'?[geometry.coordinates]:geometry.type==='MultiPolygon'?geometry.coordinates:[];return polys.map(poly=>poly.map(v31RingPath).filter(Boolean).join(' ')).filter(Boolean).join(' ')}
function v31Flag(code){const country=V31_DESTINATION_BY_ISO[code];return country?.flag||'🌍'}
function v31MapSvg(){
 const features=V31_WORLD_GEOGRAPHY.features||[];
 const paths=features.map(feature=>{const p=feature.properties||{},code=p.ISO_A3_EH||p.ISO_A3||p.ADM0_A3||'',name=p.ADMIN||p.NAME||'Country',d=v31GeometryPath(feature.geometry),available=!!V31_DESTINATION_BY_ISO[code];if(!d)return '';return `<path class="v31-land${available?' v31-destination':''}${available&&v31SelectedCountry===code?' is-selected':''}" d="${d}"${available?` data-v31-country="${safe(code)}" data-v31-name="${safe(name)}" tabindex="0" role="button" aria-pressed="${v31SelectedCountry===code}" aria-label="${safe(name)} · ${state.language==='pt-BR'?'Destino disponível':'Adventure available'}"`:' aria-hidden="true"'}/>`}).join('');
 return `<div class="v31-map-wrap${v31MapPanMode?' is-pan-mode':''}"><svg class="v31-world-map" viewBox="0 0 1000 500" role="group" aria-label="${state.language==='pt-BR'?'Mapa interativo do mundo':'Interactive world map'}"><defs><linearGradient id="v31-ocean" x2="0" y2="1"><stop stop-color="#dff4f5"/><stop offset="1" stop-color="#c8e7ed"/></linearGradient></defs><rect width="1000" height="500" rx="30" fill="url(#v31-ocean)"/><g class="v31-graticule" aria-hidden="true"><path d="M0 125H1000M0 250H1000M0 375H1000M250 0V500M500 0V500M750 0V500"/></g><g class="v31-countries">${paths}</g></svg></div>`;
}
function v31DestinationIllustration(code){
 const label=V31_DESTINATION_BY_ISO[code]?.en||'World food';
 return `<svg viewBox="0 0 110 100" class="v31-destination-illustration" role="img" aria-label="${safe(label+' food adventure illustration')}"><ellipse cx="55" cy="88" rx="39" ry="6" fill="#67517a" opacity=".12"/><path d="M22 31q33-24 66 0v43q-33 24-66 0Z" fill="#fffaf0" stroke="#7d5b99" stroke-width="3"/><path d="M30 36q25-17 50 0v31q-25 17-50 0Z" fill="#f2eafd"/><path d="M55 34v39" stroke="#d0bfdc" stroke-width="2"/><path d="M38 47q7-8 14 0t-1 12q-8 4-13-2Z" fill="#8bbd78"/><path d="M63 45h11v15H63z" fill="#f0c267"/><path d="M38 68q8-8 16-1" fill="none" stroke="#e47d68" stroke-width="4" stroke-linecap="round"/><path d="M67 68q6-5 11 0" fill="none" stroke="#8eb8d1" stroke-width="4" stroke-linecap="round"/><path d="M55 11v9m-5-5h10" stroke="#d79b32" stroke-width="3" stroke-linecap="round"/></svg>`;
}
let v31MapZoom=1,v31PanX=0,v31PanY=0,v31MapPanMode=false,v31MapDrag=null,v31MapSuppressClick=false;
function v31ApplyMapTransform(){if(v31MapZoom<=1){v31MapPanMode=false;v31MapDrag=null}const wrap=document.querySelector('.v31-map-wrap');if(!wrap)return;wrap.classList.toggle('is-pan-mode',v31MapPanMode);wrap.style.setProperty('--v31-zoom',String(v31MapZoom));wrap.style.setProperty('--v31-pan-x',`${v31PanX}px`);wrap.style.setProperty('--v31-pan-y',`${v31PanY}px`);const toggle=document.querySelector('[data-v31-pan-toggle]');if(toggle){toggle.disabled=v31MapZoom<=1;toggle.setAttribute('aria-pressed',String(v31MapPanMode));toggle.textContent=state.language==='pt-BR'?(v31MapPanMode?'Concluir':'Mover mapa'):(v31MapPanMode?'Done':'Move map');toggle.setAttribute('aria-label',state.language==='pt-BR'?(v31MapZoom<=1?'Aumente o zoom para mover o mapa.':v31MapPanMode?'Mover mapa ativado. Arraste o mapa; toque em Concluir para rolar a página.':'Mover mapa. Ative para arrastar em todas as direções.'):(v31MapZoom<=1?'Zoom in before moving the map.':v31MapPanMode?'Map movement on. Drag the map; choose Done to scroll the page.':'Move map. Turn on to drag in every direction.'))}}
function v31WorldPage(){
 const pt=state.language==='pt-BR',c=V31_WORLD_DESTINATIONS.find(x=>x.code===v31SelectedCountry)||V31_WORLD_DESTINATIONS[0];
 const countries=V31_WORLD_DESTINATIONS.map(x=>`<button class="v31-country-choice${x.code===c.code?' is-selected':''}" aria-pressed="${x.code===c.code}" data-v31-country="${x.code}" data-v31-country-choice data-v31-search-name="${safe((pt?x.pt:x.en).toLowerCase())}"><span>${x.flag}</span><span>${pt?x.pt:x.en}</span></button>`).join('');
 const indiaRecipes=c.code==='IND'?V31_APPROVED_INDIA_RECIPE_IDS.map(id=>find(id)).filter(Boolean):[];
 const pilotRecipes=(c.recipeIds||[]).map(id=>V31_WORLD_ADVENTURE.recipes.find(recipe=>recipe.id===id)).filter(Boolean);
 const adventureContent=indiaRecipes.length?`<div class="v31-approved-recipes"><span class="v31-preview-tag">${pt?'RECEITAS ORIGINAIS APROVADAS':'APPROVED ORIGINAL RECIPES'}</span><p>${pt?'Receitas do catálogo original, sem alterar seus IDs ou funcionamento.':'Recipes from the original catalog; their IDs and existing features stay unchanged.'}</p><div>${indiaRecipes.map(r=>`<button data-v31-approved-recipe="${r.id}">${safe(pt?(PT_RECIPES[r.id]?.title||r.title):r.title)} <span aria-hidden="true">→</span></button>`).join('')}</div></div>`:pilotRecipes.length?`<div class="v31-adventure-recipes"><span class="v31-preview-tag">${pt?'PILOTO DE AVENTURA · EM REVISÃO':'ADVENTURE PILOT · IN REVIEW'}</span><p class="v31-review-note">${pt?'Receitas piloto disponíveis para teste; aprovação editorial e de segurança ainda pendente.':'Pilot recipes are available for testing; editorial and safety approval is still pending.'}</p>${pilotRecipes.map(p=>`<article class="v31-adventure-recipe"><img src="${V31_WORLD_ADVENTURE_ART[p.id].hero}" alt="${safe(p.record.title)} — illustrated recipe scene" loading="lazy"><div><h3>${safe(pt?p.pt.title:p.record.title)}</h3><p>${safe(pt?p.pt.description:p.record.description)}</p><small>${safe(p.record.method)} · ${p.record.servings} ${pt?'porções':'servings'} · ${safe((p.record.allergens||[]).join(', ')|| (pt?'sem alergênicos declarados':'no declared allergens'))}</small><button class="v31-preview-button" data-v31-approved-recipe="${p.id}">${pt?'Abrir receita':'Open recipe'} <span aria-hidden="true">→</span></button></div></article>`).join('')}</div>`:`<div class="v31-recipe-preview"><span class="v31-preview-tag">${pt?'REVISÃO PENDENTE':'REVIEW PENDING'}</span><h3>${pt?'Novas aventuras culinárias em revisão':'New cooking adventures under review'}</h3><p class="v31-review-note">${pt?'Receitas novas só aparecerão após a revisão de segurança infantil, alergênicos, nutrição, cultura e duplicatas.':'New recipes will appear after child-safety, allergen, nutrition, cultural and duplicate reviews.'}</p></div>`;
 return `<section class="v31-world-page"><header class="v31-world-header"><button class="v31-back" data-v31-back aria-label="${pt?'Voltar para início':'Back home'}">←</button><div><span class="v3-eyebrow">${pt?'PASSAPORTE CULINÁRIO':'FOOD EXPLORER PASSPORT'}</span><h1 tabindex="-1">${pt?'Aventuras pelo mundo':'World Food Adventures'}</h1><p>${pt?'Explore destinos e sabores com sua família.':'Explore destinations and flavours with your family.'}</p></div><div class="v31-passport-count" aria-label="${pt?'Sete destinos culinários':'Seven food destinations'}">📔 <strong>7 ${pt?'destinos':'places'}</strong></div></header><div class="v31-world-layout"><section class="v31-map-panel" aria-label="${pt?'Mapa':'Map'}"><div class="v31-map-title"><strong>${pt?'Escolha um destino':'Choose a destination'}</strong><small>${pt?'Toque no mapa ou use a lista.':'Tap the map or use the country list.'}</small></div><div class="v31-map-controls" aria-label="${pt?'Controles de zoom do mapa':'Map zoom controls'}"><button data-v31-zoom="out" aria-label="${pt?'Diminuir zoom':'Zoom out'}">−</button><button data-v31-zoom="reset" aria-label="${pt?'Redefinir mapa':'Reset map'}">↺</button><button data-v31-zoom="in" aria-label="${pt?'Aumentar zoom':'Zoom in'}">+</button><button data-v31-pan-toggle aria-pressed="${v31MapPanMode}" aria-label="${pt?'Mover mapa. Ative para arrastar em todas as direções.':'Move map. Turn on to drag in every direction.'}">${pt?(v31MapPanMode?'Concluir':'Mover mapa'):(v31MapPanMode?'Done':'Move map')}</button></div>${v31MapSvg()}<label class="v31-country-select-label">${pt?'Buscar destino':'Search destinations'}<input type="search" data-v31-country-search placeholder="${pt?'Digite um país':'Type a country'}" autocomplete="off"></label><p class="v31-search-result" data-v31-search-result aria-live="polite"></p><label class="v31-country-select-label">${pt?'Lista de destinos':'Destination list'}<select data-v31-country-select aria-label="${pt?'Escolha um país':'Choose a country'}">${V31_WORLD_DESTINATIONS.map(x=>`<option value="${x.code}"${x.code===c.code?' selected':''}>${x.flag} ${pt?x.pt:x.en}</option>`).join('')}</select></label></section><aside class="v31-destination-card" aria-live="polite"><div class="v31-destination-banner"><span class="v31-destination-flag" aria-hidden="true">${c.flag}</span>${v31DestinationIllustration(c.code)}</div><span class="v3-eyebrow">${pt?'DESTINO':'DESTINATION'}</span><h2>${pt?c.pt:c.en}</h2><p class="v31-food-fact">${pt?c.factPt:c.factEn}</p>${adventureContent}</aside></div><section class="v31-country-list"><h2>${pt?'Destinos disponíveis':'Available destinations'}</h2><div>${countries}</div><p class="v31-no-results" data-v31-no-results hidden>${pt?'Nenhum destino encontrado. Apague a busca para ver todos.':'No destinations found. Clear your search to see all.'}</p></section><p class="v31-map-source">${pt?'Mapa offline: Natural Earth, escala 1:110m.':'Offline map: Natural Earth, 1:110m scale.'} ${pt?'Fronteiras simplificadas e possivelmente disputadas; mapa para exploração, não navegação.':'Boundaries are simplified and may be disputed; for exploration, not navigation.'}</p></section>`;
}

const v3OriginalCreateWeek=createWeek;
createWeek=function v3CreateWeek(){
 const pool=[...RECIPES],chosen=[],usedGroups=new Set(),usedMethods=new Set(),usedCategories=new Set();
 const macro=r=>{try{const n=nutritionValue(r).per||{};return ['protein','fiber','kcal','sodium'].map(k=>{const v=n[k];return Array.isArray(v)&&Number.isFinite(v[0])?(v[0]+v[1])/2:null})}catch{return [null,null,null,null]}};
 const means=[];
 while(chosen.length<7&&pool.length){
  const scored=pool.map(r=>{
   const group=recipeMainIngredientGroup(r),method=String(r.method||'').toLowerCase(),category=String(r.category||'');
   const m=macro(r);let score=(usedGroups.has(group)?-5:5)+(usedMethods.has(method)?0:1.4)+(usedCategories.has(category)?0:1.1)+Math.random()*.8;
   let valid=0,spread=0;m.forEach((v,i)=>{if(v==null)return;valid++;if(means[i])spread+=Math.abs(v-means[i])/Math.max(means[i],1)});
   if(valid)score+=Math.min(1.2,spread/valid*.22);
   return {r,group,method,category,m,score};
  }).sort((a,b)=>b.score-a.score);
  const pick=scored[Math.floor(Math.random()*Math.min(4,scored.length))];
  chosen.push(pick.r.id);usedGroups.add(pick.group);usedMethods.add(pick.method);usedCategories.add(pick.category);pool.splice(pool.indexOf(pick.r),1);
  pick.m.forEach((v,i)=>{if(v!=null)means[i]=means[i]==null?v:(means[i]*.72+v*.28)});
 }
 return {ids:chosen,locks:Array(7).fill(false),nutritionNote:'variety-estimates'};
};

const v3OriginalWeek=week;
week=function v3Week(){
 const pt=state.language==='pt-BR';
 return v3OriginalWeek().replace('<p class="sub">','<p class="v3-planner-note">'+(pt?'Planejamento variado com estimativas nutricionais dos ingredientes. Um adulto deve revisar alergias, porções e escolhas antes de salvar.':'Variety guided by recipe ingredient estimates. A parent should review allergies, portions and choices before saving.')+'</p><p class="sub">');
};

const v3OriginalSettings=settingsPage;
settingsPage=function v3Settings(){
 const html=v3OriginalSettings(),pt=state.language==='pt-BR';
 state.parentContacts??={mommy:'',daddy:''};
 const form=`<section class="v3-contact-form"><h2>${pt?'Contatos da família':'Family WhatsApp contacts'}</h2><p>${pt?'Os números ficam salvos somente neste aparelho. Inclua o código do país.':'Numbers stay on this device. Enter the country code, for example +55.'}</p><label>${pt?'Mamãe':'Mommy'}<input type="tel" inputmode="tel" autocomplete="tel" data-v3-parent="mommy" value="${safe(state.parentContacts.mommy||'')}" placeholder="+55 11 99999-9999"></label><label>${pt?'Papai':'Daddy'}<input type="tel" inputmode="tel" autocomplete="tel" data-v3-parent="daddy" value="${safe(state.parentContacts.daddy||'')}" placeholder="+55 11 99999-9999"></label><small>${pt?'O WhatsApp abre a mensagem pronta; um adulto confere e envia.':'WhatsApp opens a drafted message. A parent reviews and taps Send.'}</small></section>`;
  const at=html.lastIndexOf('</section>');return at<0?html+form:html.slice(0,at)+form+html.slice(at);
};

const v3OriginalCookSection=cookShareSection;
cookShareSection=function v3CookShareSection(r){
 const html=v3OriginalCookSection(r);
 return html.replace(/<label class="cook-photo-pick">📸 Take a dish photo[\s\S]*?<\/label>/,`<button type="button" class="cook-photo-pick v3-photo-camera" data-action="take-dish-photo" data-recipe="${r.id}">📸 Take a dish photo</button><input class="v3-hidden-camera-input" type="file" accept="image/*" capture="environment" data-share-photo="${r.id}" aria-label="Take a dish photo">`);
};

const v3OriginalShareCook=shareCook;
shareCook=async function v3ShareCook(id){
 const blob=sharePostBlobs[id],r=find(id);
 if(window.AariaNative&&blob){
  try{const reader=new FileReader(),data=await new Promise((resolve,reject)=>{reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob)});const caption=translateText(`I made ${r.title}! 🍽️\nMade with love by Chef Aaria in Aaria’s Magical Kitchen.\n#AariasMagicalKitchen #LittleChef`);window.AariaNative.sharePost(String(data),caption);notice('Your post is ready to share 💖');return}catch(e){console.warn('Native share unavailable; using browser share.',e)}
 }
 return v3OriginalShareCook(id);
};

async function v3ShowGroceryRecipients(){
 const message=groceryMessage();if(!message){notice('Choose a recipe first 🛒');return}
 const pt=state.language==='pt-BR';
 document.querySelector('#v3GroceryRecipient')?.remove();
 document.body.insertAdjacentHTML('beforeend',`<div class="v3-modal-backdrop" id="v3GroceryRecipient" role="presentation"><section class="v3-modal" role="dialog" aria-modal="true" aria-labelledby="v3GroceryTitle"><span class="v3-eyebrow">🛒 ${pt?'LISTA DE COMPRAS':'GROCERY LIST'}</span><h2 id="v3GroceryTitle">${pt?'Para quem enviar?':'Send the list to'}</h2><p>${pt?'Escolha Mamãe ou Papai. O WhatsApp abrirá a mensagem para revisão.':'Choose Mommy or Daddy. WhatsApp will open the message for review.'}</p><div class="v3-modal-options"><button data-v3-send-to="mommy">💛 ${pt?'Mamãe':'Mommy'}</button><button data-v3-send-to="daddy">💙 ${pt?'Papai':'Daddy'}</button></div><button class="v3-close" data-v3-dismiss>${pt?'Voltar':'Cancel'}</button></section></div>`);
}
shareGroceryList=v3ShowGroceryRecipients;

function v3QuizCard(r){const pt=state.language==='pt-BR';return `<section class="v3-quiz-card"><div><strong>🧠 ${pt?'Quiz dos ingredientes':'Ingredient mini-quiz'}</strong><small>${pt?'Uma pergunta rápida sobre esta receita.':'One quick question about this recipe.'}</small></div><button class="v3-quiz-start" data-v3-quiz="${r.id}">${pt?'Jogar':'Play'}</button></section>`}
function v3OpenQuiz(id){
 const r=find(id),pt=state.language==='pt-BR';
 const source=(r.ingredients||[]).filter(Boolean),correct=source[Math.floor(Math.random()*source.length)]||r.emoji;
 const distractors=RECIPES.flatMap(x=>x.ingredients||[]).filter(x=>x&&x!==correct&&!source.includes(x));
 const options=[correct,...shuffle([...new Set(distractors)]).slice(0,2)];
 const ordered=shuffle(options),right=ordered.indexOf(correct);
 const question=pt?`Qual destes ingredientes faz parte de ${r.title}?`:`Which ingredient is in ${r.title}?`;
 const label=pt?'Escolha uma resposta:':'Pick your answer:';
 document.querySelector('#v3QuizDialog')?.remove();
 document.body.insertAdjacentHTML('beforeend',`<div class="v3-modal-backdrop" id="v3QuizDialog"><section class="v3-modal" role="dialog" aria-modal="true" aria-labelledby="v3QuizTitle"><span class="v3-eyebrow">${r.emoji} ${pt?'DESAFIO DA RECEITA':'RECIPE CHALLENGE'}</span><h2 id="v3QuizTitle">${safe(question)}</h2><p>${label}</p><div class="v3-modal-options">${ordered.map((x,i)=>`<button data-v3-answer="${i}" data-v3-right="${i===right?1:0}">${safe(x)}</button>`).join('')}</div><p class="v3-quiz-feedback" aria-live="polite"></p><button class="v3-close" data-v3-dismiss>${pt?'Fechar':'Close'}</button></section></div>`);
}

const v3BaseRender=render;
render=function v3Render(){
 document.title=state.language==='pt-BR'?'Cozinha mágica da Aaria':'Aaria’s Magical Kitchen';
 if(view==='world'){
  const active=document.activeElement,previousView=window.v31PreviousView||'home';
  const focusCode=active?.closest?.('[data-v31-country]')?.dataset.v31Country||'';
  const focusType=active?.matches?.('[data-v31-country-select]')?'select':active?.matches?.('[data-v31-country-search]')?'search':active?.closest?.('.v31-map-pin')?'pin':active?.closest?.('.v31-country-choice')?'list':active?.matches?.('.v31-land')?'map':'';
  const screen=document.querySelector('#screen');if(screen){screen.className='page v31-world-screen';screen.innerHTML=v31WorldPage()}
  const app=document.querySelector('.app');app?.classList.remove('home-dashboard');app?.classList.toggle('reduce-motion',!!state.reducedMotion);
  document.body.classList.remove('v3-screen-home');document.querySelectorAll('.bottom .tab').forEach(b=>{b.classList.toggle('active',b.dataset.nav==='world');if(b.dataset.nav==='world')b.lastChild.textContent=state.language==='pt-BR'?'Mundo':'World'});
  v31ApplyMapTransform();
  const selector=focusType==='select'?'[data-v31-country-select]':focusType==='search'?'[data-v31-country-search]':focusType==='pin'?`.v31-map-pin[data-v31-country="${focusCode}"]`:focusType==='list'?`.v31-country-choice[data-v31-country="${focusCode}"]`:focusType==='map'?`.v31-land[data-v31-country="${focusCode}"]`:'';
  if(selector)document.querySelector(selector)?.focus({preventScroll:true});else if(previousView!=='world')document.querySelector('.v31-world-header h1')?.focus({preventScroll:true});
  window.v31PreviousView='world';
  return;
 }
 window.v31PreviousView=view;
 v3BaseRender();
 document.title=state.language==='pt-BR'?'Cozinha mágica da Aaria':'Aaria’s Magical Kitchen';
 document.body.classList.toggle('v3-screen-home',view==='home');
 if(view==='recipe'&&selected){const screen=document.querySelector('#screen');if(screen&&!screen.querySelector('.v3-quiz-card'))screen.insertAdjacentHTML('beforeend',v3QuizCard(selected));}
};

document.addEventListener('click',e=>{if(e.target.closest?.('.bottom .tab[data-nav="world"]'))window.v31WorldOpenedFromNav=true},true);
document.addEventListener('click',async e=>{
 const button=e.target.closest('button');if(button?.dataset.v3Quiz){v3OpenQuiz(Number(button.dataset.v3Quiz));return}
 if(button?.hasAttribute('data-v3-dismiss')){button.closest('.v3-modal-backdrop')?.remove();return}
 if(button?.dataset.v3Answer!==undefined){
  const modal=button.closest('.v3-modal'),feedback=modal?.querySelector('.v3-quiz-feedback');
  modal?.querySelectorAll('[data-v3-answer]').forEach(x=>x.disabled=true);
  if(button.dataset.v3Right==='1'){button.classList.add('correct');state.quizDone??=[];if(!state.quizDone.includes(Number(selected.id)))state.quizDone.push(Number(selected.id));save();if(feedback)feedback.textContent=(state.language==='pt-BR'?'Isso! Você encontrou um ingrediente da receita. ':'That’s right! You found an ingredient in this recipe. ')+(selected.fact||'');chirp([659,784,1047]);}
  else{button.classList.add('incorrect');if(feedback)feedback.textContent=state.language==='pt-BR'?'Quase! Tente novamente na próxima receita.':'Nice try! You can play again with another recipe.';}
  return;
 }
 if(button?.dataset.v3SendTo){
  const who=button.dataset.v3SendTo;state.parentContacts??={mommy:'',daddy:''};const digits=String(state.parentContacts[who]||'').replace(/\D/g,'');
  if(!digits){document.querySelector('#v3GroceryRecipient')?.remove();notice('Add the WhatsApp number in Settings first.');goto('settings');return}
  const url=`https://wa.me/${digits}?text=${encodeURIComponent(groceryMessage())}`;document.querySelector('#v3GroceryRecipient')?.remove();window.location.href=url;return;
 }
 if(button?.dataset.action==='take-dish-photo'){
  const id=Number(button.dataset.recipe);
  if(window.AariaNative?.takeDishPhoto){window.AariaNative.takeDishPhoto(String(id));return}
  document.querySelector(`[data-share-photo="${id}"][capture]`)?.click();return;
 }
});
document.addEventListener('click',e=>{
 if(v31MapSuppressClick){v31MapSuppressClick=false;e.preventDefault();return}
 const target=e.target.closest('[data-v31-country]');
 if(target){v31SelectedCountry=target.dataset.v31Country;render();return}
 const button=e.target.closest('button');if(!button)return;
 if(button.dataset.v31ApprovedRecipe){openRecipe(Number(button.dataset.v31ApprovedRecipe));return}
 if(button.hasAttribute('data-v31-open-world')){window.v31WorldOpenedFromNav=false;window.v31WorldOpenerIndex=[...document.querySelectorAll('[data-v31-open-world]')].indexOf(button);goto('world');return}
 if(button.hasAttribute('data-v31-back')){goto('home');if(window.v31WorldOpenedFromNav)document.querySelector('.bottom .tab[data-nav="world"]')?.focus({preventScroll:true});else{const openers=[...document.querySelectorAll('[data-v31-open-world]')];(openers[window.v31WorldOpenerIndex]||openers[0])?.focus({preventScroll:true})}window.v31WorldOpenedFromNav=false;return}
 if(button.hasAttribute('data-v31-pan-toggle')){v31MapPanMode=!v31MapPanMode;v31ApplyMapTransform();button.setAttribute('aria-pressed',String(v31MapPanMode));button.setAttribute('aria-label',state.language==='pt-BR'?(v31MapPanMode?'Mover mapa ativado. Arraste o mapa; toque em Concluir para rolar a página.':'Mover mapa. Ative para arrastar em todas as direções.'):(v31MapPanMode?'Map movement on. Drag the map; choose Done to scroll the page.':'Move map. Turn on to drag in every direction.'));button.textContent=state.language==='pt-BR'?(v31MapPanMode?'Concluir':'Mover mapa'):(v31MapPanMode?'Done':'Move map');return}
 if(button.dataset.v31Zoom){if(button.dataset.v31Zoom==='in')v31MapZoom=Math.min(2.5,v31MapZoom+.25);else if(button.dataset.v31Zoom==='out')v31MapZoom=Math.max(1,v31MapZoom-.25);else{v31MapZoom=1;v31PanX=0;v31PanY=0}const rect=document.querySelector('.v31-map-wrap')?.getBoundingClientRect();if(rect){const maxX=Math.max(0,(v31MapZoom-1)*rect.width/2),maxY=Math.max(0,(v31MapZoom-1)*rect.height/2);v31PanX=Math.max(-maxX,Math.min(maxX,v31PanX));v31PanY=Math.max(-maxY,Math.min(maxY,v31PanY))}v31ApplyMapTransform();return}
});
document.addEventListener('change',e=>{const select=e.target;if(select.matches('[data-v31-country-select]')){v31SelectedCountry=select.value;render()}});
document.addEventListener('input',e=>{const input=e.target;if(!input.matches('[data-v31-country-search]'))return;const query=input.value.trim().toLocaleLowerCase(),choices=[...document.querySelectorAll('[data-v31-country-choice]')];let count=0;choices.forEach(button=>{button.hidden=!!query&&!button.dataset.v31SearchName.includes(query);if(!button.hidden)count++});const noResults=document.querySelector('[data-v31-no-results]'),result=document.querySelector('[data-v31-search-result]');if(noResults)noResults.hidden=count>0;if(result)result.textContent=query?(state.language==='pt-BR'?`${count} destino(s) encontrado(s).`:`${count} destination(s) found.`):''});
document.addEventListener('keydown',e=>{const path=e.target.closest?.('[data-v31-country]');if(path&&['Enter',' '].includes(e.key)){e.preventDefault();v31SelectedCountry=path.dataset.v31Country;render()}});
document.addEventListener('pointerdown',e=>{const wrap=e.target.closest?.('.v31-map-wrap');if(!wrap||!v31MapPanMode||e.button!==0)return;v31MapDrag={id:e.pointerId,x:e.clientX,y:e.clientY,panX:v31PanX,panY:v31PanY,moved:false}});
document.addEventListener('pointermove',e=>{if(!v31MapDrag||v31MapDrag.id!==e.pointerId)return;const dx=e.clientX-v31MapDrag.x,dy=e.clientY-v31MapDrag.y;if(Math.abs(dx)+Math.abs(dy)>5)v31MapDrag.moved=true;if(v31MapDrag.moved){const rect=document.querySelector('.v31-map-wrap')?.getBoundingClientRect();const maxX=rect?Math.max(0,(v31MapZoom-1)*rect.width/2):Infinity,maxY=rect?Math.max(0,(v31MapZoom-1)*rect.height/2):Infinity;v31PanX=Math.max(-maxX,Math.min(maxX,v31MapDrag.panX+dx));v31PanY=Math.max(-maxY,Math.min(maxY,v31MapDrag.panY+dy));v31ApplyMapTransform()}});
document.addEventListener('pointerup',e=>{if(!v31MapDrag||v31MapDrag.id!==e.pointerId)return;v31MapSuppressClick=v31MapDrag.moved;v31MapDrag=null});
document.addEventListener('pointercancel',()=>{v31MapDrag=null});
window.addEventListener('hashchange',()=>{if(!location.hash&&view!=='home'){view='home';render()}});
document.addEventListener('change',e=>{
 const input=e.target;if(input.matches('[data-v3-parent]')){state.parentContacts??={mommy:'',daddy:''};state.parentContacts[input.dataset.v3Parent]=input.value.trim();save();notice('Family contact saved on this device.');}
});
window.aariaHandleNativeDishPhoto=async(id,dataUrl)=>{
 try{const blob=await(await fetch(dataUrl)).blob();if(sharePostUrls[id])URL.revokeObjectURL(sharePostUrls[id]);shareSourcePhotos[id]=blob;const post=await makeCookPost(find(id),blob);sharePostBlobs[id]=post;sharePostUrls[id]=URL.createObjectURL(post);render();notice('Your cooking post is ready! 💖');}
 catch(e){console.error('Could not prepare the camera photo.',e);notice('Could not prepare that photo. Please try again.');}
};
document.title=state.language==='pt-BR'?'Cozinha mágica da Aaria':'Aaria’s Magical Kitchen';
render();

// V3 local child profiles. APK builds persist the profile roster and snapshots in app-private SQLite;
// standalone preview falls back to a versioned localStorage envelope.
let v3ProfileState = { profiles: [], activeId: null, profile: null };
let v3ProfileInitComplete = false;
let v3ProfileSaveWrapped = false;
function v3ParseProfileState(raw){try{const x=JSON.parse(raw||'{}');return x&&Array.isArray(x.profiles)?x:{profiles:[],activeId:null,snapshot:{}}}catch{return {profiles:[],activeId:null,snapshot:{}}}}
function v3PersistProfileState(){if(window.AariaNative?.saveProfileSnapshot&&v3ProfileState.activeId){window.AariaNative.saveProfileSnapshot(v3ProfileState.activeId,JSON.stringify(state));return}try{const profiles=(v3ProfileState.profiles||[]).map(p=>({...p,snapshot:p.id===v3ProfileState.activeId?state:p.snapshot}));localStorage.setItem('myMagicalKitchenProfilesV1',JSON.stringify({profiles,activeId:v3ProfileState.activeId||null}))}catch{}}
function v3EmptyProfileValue(value,key){
 if(Array.isArray(value))return [];
 if(value&&typeof value==='object'){const empty={};for(const [childKey,childValue] of Object.entries(value))empty[childKey]=v3EmptyProfileValue(childValue,childKey);return empty}
 if(key==='language')return value||'en-GB';
 if(typeof value==='boolean')return false;
 if(typeof value==='number')return 0;
 if(typeof value==='string')return '';
 return null;
}
function v3ProfileStateFor(template,snapshot){
 const cleared={};
 for(const [key,value] of Object.entries(template||{}))cleared[key]=v3EmptyProfileValue(value,key);
 const incoming=snapshot&&typeof snapshot==='object'&&!Array.isArray(snapshot)?snapshot:{};
 return {...cleared,...incoming};
}
function v3SetActiveProfile(result){
 const r=typeof result==='string'?v3ParseProfileState(result):result;
 v3ProfileState.profiles=r.profiles||[];v3ProfileState.activeId=r.activeId||null;
 const active=v3ProfileState.profiles.find(p=>p.id===v3ProfileState.activeId)||null;
 v3ProfileState.profile=active;
 state=v3ProfileStateFor(state,r.snapshot);state.avatarAssignments??={};
 if(active){try{localStorage.setItem('aariaPrivateKitchenV4',JSON.stringify(state))}catch{}}
 v3ProfileInitComplete=true;
 if(!v3ProfileSaveWrapped){const original=save;save=function v3ProfileSave(){original();v3PersistProfileState()};v3ProfileSaveWrapped=true}
}
function v3InitProfiles(){
 let result=null;
 if(window.AariaNative?.initializeProfiles){try{result=window.AariaNative.initializeProfiles(JSON.stringify(state))}catch(e){console.error('Profile initialization failed',e)}}
 if(result){const parsed=v3ParseProfileState(result);if(!parsed.error){v3SetActiveProfile(parsed);if(!v3ProfileState.profiles.length)v3OpenProfileEditor('first-run');else if(v3ProfileState.profile?.chefId==='LEGACY_AARIA')v3OpenProfileEditor('legacy');return}}
 let box=v3ParseProfileState(localStorage.getItem('myMagicalKitchenProfilesV1'));
 if(!box.profiles.length){
  const legacyHasData=Object.entries(state||{}).some(([k,v])=>k!=='language'&&(Array.isArray(v)?v.length>0:(v&&typeof v==='object'?Object.keys(v).length>0:!!v)));
  if(legacyHasData){box.profiles=[{id:'legacy-aaria-v4',name:'Aaria',chefId:'LEGACY_AARIA',snapshot:state}];box.activeId='legacy-aaria-v4'}
 }
 v3ProfileState.profiles=box.profiles;v3ProfileState.activeId=box.activeId||null;
 v3ProfileState.profile=box.profiles.find(p=>p.id===box.activeId)||null;
 if(v3ProfileState.profile?.snapshot)state={...state,...v3ProfileState.profile.snapshot};
 v3ProfileInitComplete=true;
 if(!v3ProfileSaveWrapped){const original=save;save=function v3ProfileSave(){original();v3PersistProfileState()};v3ProfileSaveWrapped=true}
 if(!v3ProfileState.profiles.length)v3OpenProfileEditor('first-run');else if(v3ProfileState.profile?.chefId==='LEGACY_AARIA')v3OpenProfileEditor('legacy');
}
const v3ProfileCss=`<style id="v3-profile-style">
.v3-profile-trigger{border:0;border-radius:15px;background:#fff;color:#4e376c;padding:9px 12px;font:800 13px inherit;box-shadow:0 3px 12px #4e376c18;cursor:pointer;min-height:44px}
.v3-profile-backdrop{position:fixed;inset:0;z-index:10000;background:#21142fb8;display:grid;place-items:center;padding:18px}
.v3-profile-dialog{width:min(100%,480px);max-height:min(92dvh,760px);overflow:auto;background:#fffdf9;color:#34264f;border:1px solid #eadff1;border-radius:25px;padding:22px;box-shadow:0 24px 70px #1d0c3566}
.v3-profile-dialog h2{margin:0 0 7px;font-size:25px;line-height:1.15}.v3-profile-dialog p{color:#655978;line-height:1.45;margin:0 0 16px}
.v3-profile-dialog label{display:grid;gap:6px;font-weight:800;margin:14px 0}.v3-profile-dialog input{min-height:48px;border:1px solid #cfc0d9;border-radius:13px;padding:10px 12px;font:inherit;color:#34264f}
.v3-chef-options,.v3-profile-list{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin:14px 0}
.v3-chef-choice,.v3-profile-choice,.v3-profile-action{min-height:60px;border:2px solid #e2d5eb;border-radius:16px;background:#fff;color:#4e376c;font:800 15px inherit;cursor:pointer;padding:10px}
.v3-chef-choice{display:grid;place-items:center;align-content:center;gap:5px;min-height:144px}.v3-chef-portrait{display:block;width:82px;height:96px;object-fit:contain}.v3-chef-choice span{line-height:1.15}
.v3-chef-choice[aria-pressed="true"],.v3-profile-choice[aria-current="true"]{border-color:#a7418c;background:#fff0f8;box-shadow:0 0 0 3px #e9c1dc66}
.v3-profile-choice{display:grid;text-align:left;gap:3px}.v3-profile-choice small{color:#716481;font-weight:600}
.v3-profile-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}.v3-profile-actions button{flex:1}
.v3-profile-primary{background:#694a9a;color:white;border-color:#694a9a}.v3-profile-error{min-height:22px;color:#a52f45;font-weight:700}
@media(max-width:420px){.v3-profile-dialog{padding:18px}.v3-profile-list{grid-template-columns:1fr}.v3-chef-choice{min-height:128px;padding:7px}.v3-chef-portrait{width:70px;height:82px}}
</style>`;
if(!document.getElementById('v3-profile-style'))document.head.insertAdjacentHTML('beforeend',v3ProfileCss);
function v3OpenProfileEditor(mode='menu'){
 document.getElementById('v3ProfileDialog')?.remove();
 const pt=state.language==='pt-BR',active=v3ProfileState.profile,legacy=mode==='legacy',first=mode==='first-run',adding=mode==='add';
 const heading=legacy?(pt?'Escolha seu chef':'Choose your chef'):first?(pt?'Bem-vinda à sua cozinha':'Welcome to My Magical Kitchen'):adding?(pt?'Novo perfil':'Add a chef profile'):(pt?'Perfis da cozinha':'Kitchen profiles');
 const intro=legacy?(pt?'Seu progresso da cozinha da Aaria foi preservado. Escolha um dos dois chefs para continuar com os mesmos dados.':'Aaria’s existing kitchen progress is preserved. Pick one of the two chefs to continue with that saved data.'):first?(pt?'Escolha um nome e um chef. Você pode alterar isso depois.':'Choose a name and a chef. You can change them later.'):adding?(pt?'Cada chef tem seu próprio progresso e favoritos neste aparelho.':'Each chef gets separate progress and favourites on this device.'):'';
 const rows=!first&&!legacy&&!adding?`<div class="v3-profile-list">${v3ProfileState.profiles.map(p=>`<button class="v3-profile-choice" data-v3-profile-select="${safe(p.id)}" aria-current="${p.id===v3ProfileState.activeId}"><strong>${safe(p.name)}</strong><small>${p.chefId==='CHEF_B'?'Chef B':p.chefId==='CHEF_A'?'Chef A':'Choose a chef'}</small></button>`).join('')}</div><div class="v3-profile-actions"><button class="v3-profile-action" data-v3-profile-add>${pt?'Adicionar perfil':'Add profile'}</button><button class="v3-profile-action" data-v3-profile-close>${pt?'Concluído':'Done'}</button></div>`:'';
 const name=legacy?active?.name||'Aaria':'';
 const chooser=(first||legacy||adding)?`<label>${pt?'Nome ou apelido':'Name or nickname'}<input id="v3ProfileName" maxlength="24" autocomplete="nickname" value="${safe(name)}" aria-label="${pt?'Nome ou apelido':'Name or nickname'}"></label><div class="v3-chef-options" role="group" aria-label="${pt?'Escolha um chef':'Choose a chef'}"><button type="button" class="v3-chef-choice" data-v3-chef="CHEF_A" aria-pressed="false"><img class="v3-chef-portrait" src="${V3_PROFILE_ART.chefA}" alt=""><span>✨ Chef A</span></button><button type="button" class="v3-chef-choice" data-v3-chef="CHEF_B" aria-pressed="false"><img class="v3-chef-portrait" src="${V3_PROFILE_ART.chefB}" alt=""><span>🌟 Chef B</span></button></div><div class="v3-profile-error" id="v3ProfileError" role="status" aria-live="polite"></div><div class="v3-profile-actions"><button class="v3-profile-action v3-profile-primary" data-v3-profile-continue>${pt?'Entrar na cozinha':'Continue to kitchen'}</button>${!first&&!legacy?`<button class="v3-profile-action" data-v3-profile-close>${pt?'Cancelar':'Cancel'}</button>`:''}</div>`:'';
 document.body.insertAdjacentHTML('beforeend',`<div class="v3-profile-backdrop" id="v3ProfileDialog"><section class="v3-profile-dialog" role="dialog" aria-modal="true" aria-labelledby="v3ProfileTitle"><span class="v3-eyebrow">✨ ${pt?'MINHA COZINHA MÁGICA':'MY MAGICAL KITCHEN'}</span><h2 id="v3ProfileTitle">${heading}</h2><p>${intro}</p>${rows}${chooser}</section></div>`);
 document.querySelector('#v3ProfileDialog [data-v3-chef]')?.focus();
}
function v3FreshSnapshot(){const defaults={weeks:{},done:[],checks:{},stories:[],favorites:[],grocerySelected:[],avatarAssignments:{},language:state.language||'en-GB'};return v3ProfileStateFor(state,defaults)}
function v3ApplyProfileResult(raw){const r=v3ParseProfileState(raw);if(r.error)throw new Error(r.error);v3SetActiveProfile(r);try{localStorage.setItem('myMagicalKitchenProfilesV1',JSON.stringify({profiles:v3ProfileState.profiles,activeId:v3ProfileState.activeId}))}catch{};render()}
function v3CreateOrSelectChef(name,chefId){
 const profile=v3ProfileState.profile;
 if(profile?.chefId==='LEGACY_AARIA'){
  if(window.AariaNative?.chooseProfileChef&&!window.AariaNative.chooseProfileChef(profile.id,chefId))throw new Error('Could not save avatar choice');
  profile.chefId=chefId;v3ProfileState.profile=profile;v3PersistProfileState();
  const trigger=document.querySelector('[data-v3-profile-open]');
  if(trigger)trigger.textContent=`👩‍🍳 ${profile.name||'Aaria'} ▾`;
  return;
 }
 const clean=String(name||'').trim();if(!clean||clean.length>24)throw new Error('Enter a name between 1 and 24 characters');
 if(window.AariaNative?.createProfile){const raw=window.AariaNative.createProfile(clean,chefId,JSON.stringify(v3FreshSnapshot()));v3ApplyProfileResult(raw);return}
 const id='profile-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8),fresh=v3FreshSnapshot();
 v3ProfileState.profiles.push({id,name:clean,chefId,snapshot:fresh});v3ProfileState.activeId=id;v3ProfileState.profile=v3ProfileState.profiles.find(x=>x.id===id);state=fresh;v3PersistProfileState();render();
}
document.addEventListener('click',e=>{
 const b=e.target.closest('button');if(!b)return;
 if(b.hasAttribute('data-v3-profile-open')){v3OpenProfileEditor('menu');return}
 if(b.dataset.v3Chef){document.querySelectorAll('[data-v3-chef]').forEach(x=>x.setAttribute('aria-pressed',String(x===b)));return}
 if(b.hasAttribute('data-v3-profile-continue')){const chef=document.querySelector('[data-v3-chef][aria-pressed="true"]')?.dataset.v3Chef,name=document.getElementById('v3ProfileName')?.value||'';try{if(!chef)throw new Error(state.language==='pt-BR'?'Escolha um dos dois chefs.':'Choose one of the two chefs.');v3CreateOrSelectChef(name,chef);document.getElementById('v3ProfileDialog')?.remove()}catch(err){const box=document.getElementById('v3ProfileError');if(box)box.textContent=err.message}return}
 if(b.hasAttribute('data-v3-profile-add')){v3OpenProfileEditor('add');return}
 if(b.dataset.v3ProfileSelect){if(b.dataset.v3ProfileSelect===v3ProfileState.activeId){document.getElementById('v3ProfileDialog')?.remove();return}try{v3PersistProfileState();const raw=window.AariaNative?.activateProfile?window.AariaNative.activateProfile(b.dataset.v3ProfileSelect):(()=>{const box=v3ParseProfileState(localStorage.getItem('myMagicalKitchenProfilesV1'));box.profiles.forEach(p=>{if(p.id===v3ProfileState.activeId)p.snapshot=state});box.activeId=b.dataset.v3ProfileSelect;localStorage.setItem('myMagicalKitchenProfilesV1',JSON.stringify(box));const p=box.profiles.find(x=>x.id===box.activeId);return JSON.stringify({profiles:box.profiles,activeId:box.activeId,snapshot:p?.snapshot||{}})})();v3ApplyProfileResult(raw);if(v3ProfileState.profile?.chefId==='LEGACY_AARIA')v3OpenProfileEditor('legacy');else document.getElementById('v3ProfileDialog')?.remove()}catch(err){console.error('Profile switch failed',err)}return}
 if(b.hasAttribute('data-v3-profile-close')){document.getElementById('v3ProfileDialog')?.remove();return}
});
function v3SyncRecipeArt(){
 const chefId=v3ProfileState.profile?.chefId==='CHEF_B'?'CHEF_B':'CHEF_A';
 for(const [id,a] of Object.entries(V3_ART)){
  const variant=a.variants?.[chefId]||a.variants?.CHEF_A||a;
  NEW_RECIPE_ART[id]={...(NEW_RECIPE_ART[id]||{}),atlas:variant.atlas,storyboard:variant.atlas,hero:variant.hero,profileVariants:a.variants||null,cellAspect:a.aspect,status:a.status||'approved'};
 }
}
const v3RenderBeforeProfileControls=render;
render=function(){v3SyncRecipeArt();v3RenderBeforeProfileControls();if(!v3ProfileInitComplete||view!=='home')return;const header=document.querySelector('#screen .v3-home-top');if(header&&!header.querySelector('[data-v3-profile-open]')){const button=document.createElement('button');button.className='v3-profile-trigger';button.type='button';button.setAttribute('data-v3-profile-open','');button.setAttribute('aria-label','Switch kitchen profile');button.textContent=`👩‍🍳 ${v3ProfileState.profile?.name||'Choose profile'} ▾`;header.insertBefore(button,header.lastElementChild)}};
v3InitProfiles();
render();


