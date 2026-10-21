/* __AARIA_V3_MARKER__: shared HTML + APK experience */
const V3_ART=__V3_ART_JSON__;
const V3_INGREDIENT_ATLAS=__V3_INGREDIENT_ATLAS_JSON__;
const V3_PROFILE_ART=__V3_PROFILE_ART_JSON__;
const V31_WORLD_GEOGRAPHY=__V31_WORLD_GEOGRAPHY_JSON__;
const V31_WORLD_ADVENTURE=__V31_WORLD_ADVENTURE_JSON__;
const V31_WORLD_ADVENTURE_ART=__V31_WORLD_ADVENTURE_ART_JSON__;
const V31_HOME_WORLD_ART=__V31_HOME_WORLD_ART_JSON__;
const V32_RECIPE_THEME_MAP=__V32_RECIPE_THEME_MAP_JSON__;
const V32_PT_RECIPE_DRAFTS=__V3_PT_RECIPE_DRAFTS_JSON__;
const V32_PT_GROUP_ROLE_COPY=__V32_PT_GROUP_ROLE_COPY_JSON__;
for(const [id,draft] of Object.entries(V32_PT_RECIPE_DRAFTS))PT_RECIPES[id]={...(PT_RECIPES[id]||{}),...draft};
const v32BaseTranslateText=translateText;
const v32PortugueseCopy=new Map();
for(const [id,draft] of Object.entries(V32_PT_RECIPE_DRAFTS)){
 const record=RECIPES.find(item=>item.id===Number(id));if(!record)throw new Error('Portuguese copy references unknown recipe '+id);
 for(const key of ['title','safety','description','allergyAlert'])if(record[key]&&draft[key])v32PortugueseCopy.set(record[key],draft[key]);
 for(const key of ['ingredients','steps','extras'])if(Array.isArray(record[key])&&Array.isArray(draft[key]))record[key].forEach((source,index)=>{if(draft[key][index])v32PortugueseCopy.set(source,draft[key][index])});
}
translateText=function(value,lang=state.language){const source=String(value??'');if(lang==='pt-BR'&&v32PortugueseCopy.has(source))return v32PortugueseCopy.get(source);return v32BaseTranslateText(value,lang)};
function v32AddGroupRoleCopy(){
 if(view!=='recipe'||!selected)return;
 const mode=selected.category==='Cooking with Mommy & Daddy'?'family':selected.category==='Cooking with Friends'?'friends':null;
 if(!mode)return;
 const title=document.querySelector('#screen .ref-title'),heading=title?.querySelector('h1');
 if(!title||!heading||title.querySelector('.v32-group-role-copy'))return;
 const english={
  family:'Aaria is the head chef. Mommy and Daddy help. An adult handles the oven, hob and hot food as shown in the steps.',
  friends:'Aaria and the friends cook together. An adult supervises hot equipment, knives and hot food as shown in the steps.'
 };
 const copy=state.language==='pt-BR'?V32_PT_GROUP_ROLE_COPY[mode]:english[mode];
 if(!copy)return;
 const note=document.createElement('p');note.className='v32-group-role-copy';note.setAttribute('role','note');note.textContent=copy;
 note.style.cssText='margin:8px 0;padding:8px 10px;border-left:3px solid #9c65bd;border-radius:8px;background:#fff3fb;color:#50345a;font-size:clamp(12px,2.8vw,15px);line-height:1.35;text-align:left';
 heading.insertAdjacentElement('afterend',note);
}
function v32RecipeTheme(id){return V32_RECIPE_THEME_MAP[String(Number(id))]||'playful-purple'}
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
const v32ReferenceTemplateCookingScene=cookingScene;
cookingScene=function v32IngredientOnlyCookingScene(r,stepIndex){
 if([5,12,76].includes(Number(r?.id))){
  const ingredients=(Array.isArray(r.ingredients)?r.ingredients:[]).slice(0,3);
  return `<figure class="ref-step-photo v32-template-ingredient-art" role="img" aria-label="${safe(r.title+' — '+localizedStepTitle(r,stepIndex)+' ingredients')}"><div class="v32-template-ingredient-row">${ingredients.map(value=>`<div class="v32-template-ingredient">${v3IngredientArt(value)}<small>${safe(value)}</small></div>`).join('')}</div><figcaption data-original-source="canonical-ingredient-icons">${safe(localizedStepTitle(r,stepIndex))}</figcaption></figure>`;
 }
 return v32ReferenceTemplateCookingScene(r,stepIndex);
};

homeTile=function v31PinterestTile(r){return `<button class="home-tile v31-pinterest-tile" data-v32-theme="${v32RecipeTheme(r.id)}" data-open="${r.id}" aria-label="Open ${safe(r.title)}">${homeDishThumb(r)}${recipeNumberMarkup(r)}<span class="home-tile-name">${safe(r.title)}</span><span class="home-tile-meta">${safe(r.category)} · ${safe(r.method)}</span></button>`};
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
 const family=RECIPES.find(r=>r.category==='Cooking with Mommy & Daddy');
 const friends=RECIPES.find(r=>r.category==='Cooking with Friends');
 const preferred=[...favs.slice(0,4),...recent.slice(0,4),family,friends,...RECIPES];
 const picks=[...new Map(preferred.filter(Boolean).map(r=>[r.id,r])).values()].slice(0,12);
 const pt=state.language==='pt-BR';
 const title=pt?'Cozinha mágica da Aaria':'Aaria’s Magical Kitchen';
 const aaria=avatar('v3-hero-avatar');
 return `<section class="v3-home" aria-label="${title}">
  <header class="v3-home-top"><div class="v3-brand"><span class="v3-brand-mark" aria-hidden="true">✨</span><span>${title}<small>${pt?'Sua cozinha · Suas criações · Sua magia':'Your kitchen · Your creations · Your magic'}</small></span></div><button class="v3-settings" data-nav="settings" aria-label="${pt?'Configurações':'Settings'}">⚙️</button></header>
  <section class="v31-home-hero"><div class="v31-hero-copy"><span class="v3-eyebrow">${pt?'✨ AVENTURAS NA COZINHA':'✨ LITTLE KITCHEN ADVENTURES'}</span><h1>${pt?'O que vamos criar hoje?':'What shall we make today?'}</h1><p>${pt?'Escolha uma receita ou explore sabores do mundo.':'Pick a recipe or explore flavours around the world.'}</p><div class="v31-primary-actions"><button class="v3-primary" data-nav="library">${pt?'Vamos cozinhar':'Let’s Cook'} <span aria-hidden="true">→</span></button><button class="v31-world-primary" data-v31-open-world>${pt?'Explorar o mundo':'Explore the World'} <span aria-hidden="true">🌍</span></button></div></div><div class="v31-hero-art">${aaria}<span class="v31-sparkle v31-sparkle-a" aria-hidden="true">✦</span><span class="v31-sparkle v31-sparkle-b" aria-hidden="true">✧</span></div></section>
  <section class="v31-shortcuts" aria-label="${pt?'Atalhos da cozinha':'Kitchen shortcuts'}"><button class="v31-shortcut v31-surprise" data-action="open-wheel"><span aria-hidden="true">🎁</span><span><strong>${pt?'Surpresa!':'Surprise Me'}</strong><small>${pt?'Uma receita escolhida na roda':'Spin for a recipe'}</small></span></button><button class="v31-shortcut v31-week-spin" data-action="open-week-wheel"><span aria-hidden="true">🎡</span><span><strong>${pt?'Monte minha semana':'Spin My Week'}</strong><small>${pt?'Escolha 7 receitas para a semana':'Spin for seven recipes this week'}</small></span></button><button class="v31-shortcut v31-planner" data-nav="week"><span aria-hidden="true">🗓️</span><span><strong>${pt?'Meu planejador':'My Planner'}</strong><small>${pt?'Planeje a semana em família':'Plan a fun week together'}</small></span></button></section>
  <div class="v3-section-head v31-board-heading"><div><h2>${pt?'Meu livro de receitas':'My recipe book'}</h2><p>${pt?'Uma coleção visual para escolher sua próxima aventura.':'A picture-led collection for your next kitchen adventure.'}</p></div><button class="text-link" data-nav="library">${pt?'Ver todas':'Browse all'} →</button></div>
  <section class="v31-pinterest-board" aria-label="${pt?'Meu livro de receitas':'My recipe book'}">${picks.map(homeTile).join('')}</section>
  <section class="v31-world-shelf"><div class="v3-section-head"><div><h2>${pt?'Aventuras de comida pelo mundo':'World Food Adventures'}</h2><p>${pt?'Conheça um lugar novo, um sabor de cada vez.':'Meet a new place, one flavour at a time.'}</p></div><button class="text-link" data-v31-open-world>${pt?'Explorar':'Explore'} →</button></div><button class="v31-world-card" data-v31-open-world><span class="v31-world-globe" aria-hidden="true">🌏</span><span><strong>${pt?'Seu passaporte culinário':'Your food explorer passport'}</strong><small>${pt?'Sete destinos para descobrir no mapa':'Seven destinations to discover on the map'}</small></span><span class="v31-country-flags" aria-hidden="true">🇮🇳 🇮🇹 🇨🇳 🇯🇵 🇲🇽 🇻🇳 🇬🇷</span><span class="v31-card-arrow" aria-hidden="true">→</span></button></section>
  <section class="v31-collection-links"><div class="v3-section-head"><div><h2>${pt?'Cozinhe junto':'Cook together'}</h2><p>${pt?'Com as pessoas que você gosta.':'With the people you love.'}</p></div></div><div class="v31-collection-grid"><button data-nav="family">👨‍👩‍👧 <strong>${pt?'Com a família':'With Family'}</strong></button><button data-nav="friends">🧑‍🍳 <strong>${pt?'Com amigos':'With Friends'}</strong></button></div></section>
  <nav class="v3-quick-links" aria-label="${pt?'Mais atividades':'More activities'}"><button data-nav="rewards">🏆 ${pt?'Prêmios':'Awards'} · ${stats.badges}</button><button data-nav="creations">🎨 ${pt?'Minhas criações':'My Creations'}</button><button data-nav="stories">🧚 ${pt?'Histórias e música':'Stories and music'}</button><button data-action="groceries-choose">🛒 ${pt?'Lista de compras':'Shopping list'}</button><button data-nav="settings">⚙️ ${pt?'Configurações':'Settings'}</button></nav>
 </section>`;
};

home=function v31ApprovedHome(){
 const pt=state.language==='pt-BR',stats=homeStats();
 const featured=find(12);
 const countries=['IND','ITA','JPN','MEX','GRC'].map(code=>V31_DESTINATION_BY_ISO[code]).filter(Boolean);
 const headline=pt?'O que vamos cozinhar hoje?':'What shall we cook today?';
 return `<section class="v31-approved-home" aria-label="${pt?'Cozinha mágica da Aaria':'Aaria’s Magical Kitchen'}">
  <header class="v31-approved-header"><img class="v31-brand-lockup" src="${V31_HOME_WORLD_ART.brand}" alt="Aaria’s Magical Kitchen"><button type="button" class="v31-header-greeting" data-v3-profile-open aria-label="${pt?'Trocar perfil da cozinha':'Switch kitchen profile'}"><img src="${V31_HOME_WORLD_ART.aaria}" alt=""><span><strong>${pt?'Oi, Aaria!':'Hi Aaria!'}</strong><small>${pt?'Pronta para uma aventura saborosa?':'Ready for a tasty adventure?'}</small></span></button><button class="v3-settings" data-nav="settings" aria-label="${pt?'Configurações':'Settings'}">⚙️</button></header>
  <section class="v31-reference-hero" style="--v31-kitchen:url('${V31_HOME_WORLD_ART.kitchen}')"><div class="v31-hero-welcome"><h1>${headline}</h1><span aria-hidden="true">♥</span></div><div class="v31-reference-characters"><img class="v31-hero-character" src="${V31_HOME_WORLD_ART.aariaCooking}" alt="Aaria, the kitchen’s young chef"><img class="v31-hero-dog" src="${V31_HOME_WORLD_ART.friends}" alt="Aaria’s friendly dog"></div></section>
  <nav class="v31-action-tiles" aria-label="${pt?'Aventuras da cozinha':'Kitchen adventures'}"><button class="v31-action-tile v31-tile-cook" data-nav="library"><span>♨️</span><strong>${pt?'Vamos cozinhar!':'Let’s Cook!'}</strong><small>${pt?'Explore todas as receitas':'Explore all recipes'}</small></button><button class="v31-action-tile v31-tile-world" data-v31-open-world><span>🌍</span><strong>${pt?'Aventura pelo mundo':'World Adventure'}</strong><small>${pt?'Cozinhe ao redor do mundo':'Cook around the world'}</small></button><button class="v31-action-tile v31-tile-surprise" data-action="open-wheel"><span>🎲</span><strong>${pt?'Surpresa!':'Surprise Me!'}</strong><small>${pt?'Encontre uma receita':'Find a random recipe'}</small></button><button class="v31-action-tile v31-tile-planner" data-nav="week"><span>▦</span><strong>${pt?'Meu planejador':'My Planner'}</strong><small>${pt?'Planeje sua semana saborosa':'Plan your tasty week'}</small></button></nav>
  <section class="v31-featured-section"><div class="v31-section-title"><h2>⭐ ${pt?'Receita em destaque':'Featured Recipe'}</h2><button class="text-link" data-nav="library">${pt?'Ver todas':'See all'} →</button></div><button class="v31-featured-card" data-open="${featured.id}"><span class="v31-featured-art">${homeDishThumb(featured)}</span><span class="v31-featured-copy"><span class="v31-featured-kicker">${pt?'FÁCIL E DIVERTIDA':'EASY & FUN'}</span><strong>${safe(pt?(PT_RECIPES[featured.id]?.title||featured.title):featured.title)}</strong><small>${safe((pt?(PT_RECIPES[featured.id]?.description||featured.description):featured.description)||(pt?'Uma receita gostosa para preparar juntos.':'A tasty recipe to make together.'))}</small><span class="v31-featured-meta">◷ ${safe(featured.time||'15 min')}　 ♧ ${pt?'Fácil':'Easy'}　 ♧ ${pt?'Porções':'Serves'} ${safe(featured.servings||'2')}</span></span><span class="v31-featured-heart" aria-hidden="true">♡</span></button></section>
  <section class="v31-world-shelf"><div class="v31-section-title"><div><h2>🌍 ${pt?'Aventura de comida pelo mundo':'World Food Adventure'}</h2><p>${pt?'Descubra pratos deliciosos de todo o mundo!':'Discover delicious dishes from around the world!'}</p></div><button class="text-link" data-v31-open-world>${pt?'Explorar mapa':'Explore the map'} →</button></div><div class="v31-destination-rail">${countries.map((c,i)=>{const id=c.code==='IND'?51:null,r=id?find(id):null;const recipeTitle=r?(pt?(PT_RECIPES[id]?.title||r.title):r.title):(pt?'Novas receitas em revisão':'New recipes under review');return `<button class="v31-destination-tile${i===0?' is-featured':''}" data-v31-card-country="${c.code}"><span class="v31-destination-art v31-country-${c.code.toLowerCase()}"><img src="${V31_HOME_WORLD_ART.destinations[c.code]}" alt="" loading="lazy" decoding="async">${i===0?'<i aria-hidden="true">✦</i>':''}</span><strong>${pt?c.pt:c.en}</strong><small>${safe(recipeTitle)}</small></button>`}).join('')}</div></section>
  <section class="v31-home-quick-links" aria-label="${pt?'Mais aventuras':'More adventures'}"><button data-action="open-week-wheel">🎡 ${pt?'Monte minha semana':'Spin My Week'}</button><button data-nav="stories">🎵 ${pt?'Histórias e música':'Stories & Music'}</button><button data-nav="family">💛 ${pt?'Cozinhar com a família':'Cook with Family'}</button><button data-nav="friends">🌈 ${pt?'Cozinhar com amigos':'Cook with Friends'}</button><button data-nav="groceries">🧺 ${pt?'Lista de compras':'Shopping list'}</button></section>
 </section>`;
};


function v32AvatarCastItems(items, ariaLabel, mode) {
 if(items.some(item=>!item.src))throw new Error('Canonical avatar source is missing: '+ariaLabel);
 return `<div class="parent-pair v32-avatar-cast v32-${mode}-avatar-cast" role="group" aria-label="${ariaLabel}">${items.map(item=>`<div class="parent-person"><img data-v32-avatar="${item.key}" src="${item.src}" alt="${item.label}" loading="eager"><span>${item.label}</span></div>`).join('')}</div>`;
}
family=function v32CanonicalFamily(){
 const pt=state.language==='pt-BR';
 const people=[
  {key:'aaria',label:'Aaria',src:V31_HOME_WORLD_ART.aaria},
  {key:'mommy',label:'Mommy',src:V31_HOME_WORLD_ART.avatars.mommy},
  {key:'daddy',label:'Daddy',src:V31_HOME_WORLD_ART.avatars.daddy}
 ];
 return `${header(pt?'Cozinhe com a família 💛':'Cook with Family 💛')}<section class="home-subpage v32-group-screen"><h1>${pt?'Cozinhe com Mamãe e Papai':'Cook with Mommy and Daddy'}</h1><p>${pt?'Escolha uma receita para preparar com Mamãe ou Papai. Abra um cartão para começar a cozinhar juntos.':'Pick a recipe to make with Mommy or Daddy. Open a card to start cooking together.'}</p>${v32AvatarCastItems(people,pt?'Aaria, Mamãe e Papai':'Aaria, Mommy and Daddy','family')}<h2>${pt?'Sugestões de receitas em família':'Family recipe ideas'}</h2>${relatedRecipeGrid('family')}<div class="home-subpage-actions"><button data-nav="library">${pt?'📖 Ver todas as 95 receitas':'📖 See all 95 recipes'}</button><button data-nav="week">${pt?'🗓️ Planejar a semana':'🗓️ Plan a cooking week'}</button></div></section>`;
};
friends=function v32CanonicalFriends(){
 const pt=state.language==='pt-BR';
 const people=[
  {key:'rohan',label:'Rohan',src:V31_HOME_WORLD_ART.avatars.rohan},
  {key:'arjun',label:'Arjun',src:V31_HOME_WORLD_ART.avatars.arjun},
  {key:'vihaan',label:'Vihaan',src:V31_HOME_WORLD_ART.avatars.vihaan},
  {key:'isha',label:'Isha',src:V31_HOME_WORLD_ART.avatars.isha},
  {key:'meera',label:'Meera',src:V31_HOME_WORLD_ART.avatars.meera},
  {key:'sana',label:'Sana',src:V31_HOME_WORLD_ART.avatars.sana},
  {key:'diya',label:'Diya',src:V31_HOME_WORLD_ART.avatars.diya}
 ];
 return `${header(pt?'Cozinhe com amigos 🌈':'Cook with Friends 🌈')}<section class="home-subpage v32-group-screen"><h1>${pt?'Convide seus amigos para a cozinha!':'Invite your kitchen friends!'}</h1><p>${pt?'Escolha uma receita fácil para preparar juntos. Peça a um adulto para ajudar com aparelhos quentes e ferramentas afiadas.':'Choose an easy recipe to make together. Ask an adult to help with hot appliances and sharp tools.'}</p>${v32AvatarCastItems(people,pt?'Sete amigos da cozinha':'Seven kitchen friends','friends')}<h2>${pt?'Sugestões de receitas entre amigos':'Friend-friendly recipe ideas'}</h2>${relatedRecipeGrid('friends')}<div class="home-subpage-actions"><button data-nav="library">${pt?'📖 Ver todas as 95 receitas':'📖 See all 95 recipes'}</button><button data-nav="week">${pt?'🗓️ Planejar uma semana de receitas':'🗓️ Plan a cooking week'}</button></div></section>`;
};
const v3OriginalGroceries=groceries;
groceries=function v31PantryShortcuts(){
 const pt=state.language==='pt-BR',html=v3OriginalGroceries();
 const links=`<nav class="v31-pantry-shortcuts" aria-label="${pt?'Mais aventuras':'More adventures'}"><button data-nav="stories">🎵 ${pt?'Histórias e música':'Stories & Music'}</button><button data-nav="family">💛 ${pt?'Cozinhar com a família':'Cook with Family'}</button><button data-nav="friends">🌈 ${pt?'Cozinhar com amigos':'Cook with Friends'}</button><button data-nav="rewards">🏆 ${pt?'Prêmios':'Awards'}</button><button data-action="open-wheel">🎁 ${pt?'Surpresa!':'Surprise Me'}</button><button data-action="open-week-wheel">🎡 ${pt?'Monte minha semana':'Spin My Week'}</button></nav>`;
 return html.replace('<div class="grocery-share-row">',`${links}<div class="grocery-share-row">`);
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
 state.worldStamps=Array.isArray(state.worldStamps)?state.worldStamps:[];
 const stamps=state.worldStamps.filter(code=>V31_WORLD_DESTINATIONS.some(destination=>destination.code===code));
 const countries=V31_WORLD_DESTINATIONS.map(x=>`<button class="v31-country-choice${x.code===c.code?' is-selected':''}" aria-pressed="${x.code===c.code}" data-v31-country="${x.code}" data-v31-country-choice data-v31-search-name="${safe((pt?x.pt:x.en).toLowerCase())}"><span>${x.flag}</span><span>${pt?x.pt:x.en}</span></button>`).join('');
 const indiaRecipes=c.code==='IND'?V31_APPROVED_INDIA_RECIPE_IDS.map(id=>find(id)).filter(Boolean):[];
 const pilotRecipes=(c.recipeIds||[]).map(id=>V31_WORLD_ADVENTURE.recipes.find(recipe=>recipe.id===id)).filter(Boolean);
 const adventureContent=indiaRecipes.length?`<div class="v31-approved-recipes"><span class="v31-preview-tag">${pt?'RECEITAS ORIGINAIS APROVADAS':'APPROVED ORIGINAL RECIPES'}</span><p>${pt?'Receitas do catálogo original, sem alterar seus IDs ou funcionamento.':'Recipes from the original catalog; their IDs and existing features stay unchanged.'}</p><div>${indiaRecipes.map(r=>`<button data-v31-approved-recipe="${r.id}">${safe(pt?(PT_RECIPES[r.id]?.title||r.title):r.title)} <span aria-hidden="true">→</span></button>`).join('')}</div></div>`:pilotRecipes.length?`<div class="v31-adventure-recipes"><span class="v31-preview-tag">${pt?'PILOTO DE AVENTURA · EM REVISÃO':'ADVENTURE PILOT · IN REVIEW'}</span><p class="v31-review-note">${pt?'Receitas piloto disponíveis para teste; aprovação editorial e de segurança ainda pendente.':'Pilot recipes are available for testing; editorial and safety approval is still pending.'}</p>${pilotRecipes.map(p=>`<article class="v31-adventure-recipe"><img src="${V31_WORLD_ADVENTURE_ART[p.id].hero}" alt="${safe(p.record.title)} — illustrated recipe scene" loading="lazy"><div><h3>${safe(pt?p.pt.title:p.record.title)}</h3><p>${safe(pt?p.pt.description:p.record.description)}</p><small>${safe(p.record.method)} · ${p.record.servings} ${pt?'porções':'servings'} · ${safe((p.record.allergens||[]).join(', ')|| (pt?'sem alergênicos declarados':'no declared allergens'))}</small><button class="v31-preview-button" data-v31-approved-recipe="${p.id}">${pt?'Abrir receita':'Open recipe'} <span aria-hidden="true">→</span></button></div></article>`).join('')}</div>`:`<div class="v31-recipe-preview"><span class="v31-preview-tag">${pt?'REVISÃO PENDENTE':'REVIEW PENDING'}</span><h3>${pt?'Novas aventuras culinárias em revisão':'New cooking adventures under review'}</h3><p class="v31-review-note">${pt?'Receitas novas só aparecerão após a revisão de segurança infantil, alergênicos, nutrição, cultura e duplicatas.':'New recipes will appear after child-safety, allergen, nutrition, cultural and duplicate reviews.'}</p></div>`;
 const passport=stamps.length?stamps.map(code=>{const x=V31_DESTINATION_BY_ISO[code];return `<span class="v31-stamp">${x.flag} ${pt?x.pt:x.en}</span>`}).join(''):`<p>${pt?'Complete uma aventura aprovada para ganhar seu primeiro selo.':'Finish an approved adventure to earn your first stamp.'}</p>`;
 return `<section class="v31-world-page"><header class="v31-world-header"><button class="v31-back" data-v31-back aria-label="${pt?'Voltar para início':'Back home'}">←</button><div><span class="v3-eyebrow">${pt?'PASSAPORTE CULINÁRIO':'FOOD EXPLORER PASSPORT'}</span><h1 tabindex="-1">${pt?'Aventuras pelo mundo':'World Food Adventures'}</h1><p>${pt?'Explore destinos e sabores com sua família.':'Explore destinations and flavours with your family.'}</p></div><div class="v31-passport-count" aria-label="${pt?`${stamps.length} de 7 selos ganhos`:`${stamps.length} of 7 stamps earned`}">📔 <strong>${stamps.length}/7 ${pt?'selos':'stamps'}</strong></div></header><div class="v31-world-layout"><section class="v31-map-panel" aria-label="${pt?'Mapa':'Map'}"><div class="v31-map-title"><strong>${pt?'Escolha um destino':'Choose a destination'}</strong><small>${pt?'Toque no mapa ou use a lista.':'Tap the map or use the country list.'}</small></div>${v31MapSvg()}<label class="v31-country-select-label">${pt?'Buscar destino':'Search destinations'}<input type="search" data-v31-country-search placeholder="${pt?'Digite um país':'Type a country'}" autocomplete="off"></label><p class="v31-search-result" data-v31-search-result aria-live="polite"></p><label class="v31-country-select-label">${pt?'Lista de destinos':'Destination list'}<select data-v31-country-select aria-label="${pt?'Escolha um país':'Choose a country'}">${V31_WORLD_DESTINATIONS.map(x=>`<option value="${x.code}"${x.code===c.code?' selected':''}>${x.flag} ${pt?x.pt:x.en}</option>`).join('')}</select></label></section><aside class="v31-destination-card" aria-live="polite"><div class="v31-destination-banner"><span class="v31-destination-flag" aria-hidden="true">${c.flag}</span>${v31DestinationIllustration(c.code)}</div><span class="v3-eyebrow">${pt?'DESTINO':'DESTINATION'}</span><h2>${pt?c.pt:c.en}</h2><p class="v31-food-fact">${pt?c.factPt:c.factEn}</p>${adventureContent}</aside></div><section class="v31-country-list"><h2>${pt?'Destinos disponíveis':'Available destinations'}</h2><div>${countries}</div><p class="v31-no-results" data-v31-no-results hidden>${pt?'Nenhum destino encontrado. Apague a busca para ver todos.':'No destinations found. Clear your search to see all.'}</p></section><section class="v31-passport" aria-live="polite"><div><h2>${pt?'Meu passaporte culinário':'My food passport'}</h2>${passport}</div><button type="button" data-v31-passport-reset ${stamps.length?'':'disabled'}>${pt?'Redefinir selos':'Reset stamps'}</button></section><p class="v31-map-source">${pt?'Mapa offline: Natural Earth, escala 1:110m.':'Offline map: Natural Earth, 1:110m scale.'} ${pt?'Fronteiras simplificadas e possivelmente disputadas; mapa para exploração, não navegação.':'Boundaries are simplified and may be disputed; for exploration, not navigation.'}</p></section>`;
}

v31WorldPage=function v31ApprovedWorldPage(){
 const pt=state.language==='pt-BR',c=V31_WORLD_DESTINATIONS.find(x=>x.code===v31SelectedCountry)||V31_WORLD_DESTINATIONS[0];
 state.worldStamps=Array.isArray(state.worldStamps)?state.worldStamps:[];
 const stamps=state.worldStamps.filter(code=>V31_WORLD_DESTINATIONS.some(destination=>destination.code===code));
 const countries=V31_WORLD_DESTINATIONS.map(x=>`<button class="v31-country-choice${x.code===c.code?' is-selected':''}" aria-pressed="${x.code===c.code}" data-v31-country="${x.code}" data-v31-country-choice data-v31-search-name="${safe((pt?x.pt:x.en).toLowerCase())}"><span>${x.flag}</span><span>${pt?x.pt:x.en}</span></button>`).join('');
 const ids=c.code==='IND'?V31_APPROVED_INDIA_RECIPE_IDS:[];
 const recipes=ids.map(id=>find(id)).filter(Boolean),featured=recipes.find(r=>Number(r.id)===51)||null;
 const passport=stamps.length?stamps.map(code=>{const x=V31_DESTINATION_BY_ISO[code];return `<span class="v31-stamp">${x.flag} ${pt?x.pt:x.en}</span>`}).join(''):`<p>${pt?'Complete uma aventura aprovada para ganhar seu primeiro selo.':'Complete an approved adventure to earn your first stamp.'}</p>`;
 const featuredMarkup=featured?`<button class="v31-world-feature" data-v31-approved-recipe="${featured.id}"><span class="v31-world-feature-art">${homeDishThumb(featured)}</span><span class="v31-world-feature-copy"><small>${pt?'DESTINO EM DESTAQUE':'FEATURED DESTINATION'}</small><strong>${c.flag} ${pt?c.pt:c.en}</strong><b>${safe(pt?(PT_RECIPES[featured.id]?.title||featured.title):featured.title)}</b><span>${safe((pt?(PT_RECIPES[featured.id]?.description||featured.description):featured.description)||(pt?'Uma receita gostosa para preparar juntos.':'A tasty recipe to make together.'))}</span><em>🌿 ${pt?'Receita do catálogo original':'Original catalog recipe'}</em><span class="v31-world-cook">${pt?'Vamos cozinhar!':'Let’s Cook!'} →</span></span></button>`:`<section class="v31-world-pending"><span class="v31-world-pending-icon">${c.flag}</span><div><small>${pt?'DESTINO EM REVISÃO':'DESTINATION UNDER REVIEW'}</small><h2>${pt?c.pt:c.en}</h2><p>${pt?'Novas receitas e ilustrações só aparecerão após as revisões independentes de segurança, nutrição, cultura e direitos autorais.':'New recipes and illustrations will appear after independent safety, nutrition, cultural, and artwork-rights reviews.'}</p></div></section>`;
 return `<section class="v31-world-page v31-world-illustrated"><header class="v31-world-header"><button class="v31-back" data-v31-back aria-label="${pt?'Voltar para início':'Back home'}">←</button><div><span class="v3-eyebrow">${pt?'PASSAPORTE DO EXPLORADOR':'FOOD EXPLORER PASSPORT'}</span><h1 tabindex="-1">${pt?'Aventura de comida pelo mundo':'World Food Adventure'}</h1><p>${pt?'Explore países, experimente sabores e colecione selos!':'Explore countries, try new flavours and collect passport stamps!'}</p></div><div class="v31-passport-count" aria-label="${pt?`${stamps.length} de 7 selos ganhos`:`${stamps.length} of 7 stamps earned`}">📔 <strong>${stamps.length}/7 ${pt?'selos':'stamps'}</strong></div></header>
  <section class="v31-illustrated-map-panel${pt?'':' v31-map-reference-art'}" style="${pt?'':`--v31-world-map-art:url('${V31_HOME_WORLD_ART.worldMap}')`}" aria-label="${pt?'Mapa de aventuras pelo mundo':'World adventure map'}"><div class="v31-map-decoration" aria-hidden="true"><span class="v31-map-landmark v31-landmark-america">🌮<small>${pt?'América do Norte':'North America'}</small></span><span class="v31-map-landmark v31-landmark-europe">🍕<small>${pt?'Europa':'Europe'}</small></span><span class="v31-map-landmark v31-landmark-asia">🍜<small>${pt?'Ásia':'Asia'}</small></span><span class="v31-map-landmark v31-landmark-africa">🥘<small>${pt?'África':'Africa'}</small></span><span class="v31-map-landmark v31-landmark-oceania">🍍<small>Oceania</small></span></div>${v31MapSvg()}<p class="v31-map-source">${pt?'Mapa offline simplificado para explorar, não navegar.':'Offline simplified map for exploring, not navigation.'}</p><div class="v31-world-map-search"><label>${pt?'Buscar destino':'Search destinations'}<input type="search" data-v31-country-search placeholder="${pt?'Digite um país':'Type a country'}" autocomplete="off"></label><label>${pt?'Lista de destinos':'Destination list'}<select data-v31-country-select aria-label="${pt?'Escolha um país':'Choose a country'}">${V31_WORLD_DESTINATIONS.map(x=>`<option value="${x.code}"${x.code===c.code?' selected':''}>${x.flag} ${pt?x.pt:x.en}</option>`).join('')}</select></label></div><p class="v31-search-result" data-v31-search-result aria-live="polite"></p></section>
  ${featuredMarkup}
  ${recipes.length?`<section class="v31-world-recipes v31-approved-recipes"><div class="v31-section-title"><div><h2>${pt?'Mais receitas da Ásia':'More Recipes from Asia'}</h2><p>${pt?'Receitas originais já disponíveis':'Original recipes already in your kitchen'}</p></div><button class="text-link" data-nav="library">${pt?'Ver todas':'See all'} →</button></div><div class="v31-world-recipe-rail">${recipes.map(r=>`<button class="v31-world-recipe-tile" data-v31-approved-recipe="${r.id}"><span>${homeDishThumb(r)}</span><strong>${safe(pt?(PT_RECIPES[r.id]?.title||r.title):r.title)}</strong></button>`).join('')}</div></section>`:''}
  <section class="v31-country-list v31-world-countries"><h2>${pt?'Escolha seu próximo destino':'Choose your next destination'}</h2><div>${countries}</div><p class="v31-no-results" data-v31-no-results hidden>${pt?'Nenhum destino encontrado.':'No destinations found.'}</p></section>
  <section class="v31-passport" aria-live="polite"><div><h2>${pt?'Meu passaporte culinário':'My food passport'}</h2>${passport}</div><button type="button" data-v31-passport-reset ${stamps.length?'':'disabled'}>${pt?'Redefinir selos':'Reset stamps'}</button></section></section>`;
};

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
 const html=v3OriginalWeek().replace('<p class="sub">','<p class="v3-planner-note">'+(pt?'Planejamento variado com estimativas nutricionais dos ingredientes. Um adulto deve revisar alergias, porções e escolhas antes de salvar.':'Variety guided by recipe ingredient estimates. A parent should review allergies, portions and choices before saving.')+'</p><p class="sub">');
 return html.replace('<div class="weekcontrols">',`<button class="secondary v31-spin-week-entry" data-action="open-week-wheel">🎡 ${pt?'Monte minha semana':'Spin My Week'}</button><div class="weekcontrols">`);
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
 return html.replace(/<label class="cook-photo-pick">📸 Take a dish photo[\s\S]*?<\/label>/,`<button type="button" class="cook-photo-pick v3-photo-camera" data-action="take-dish-photo" data-recipe="${r.id}">📸 Take a dish photo</button><input class="v3-hidden-camera-input" type="file" accept="image/*" capture="environment" data-share-photo="${r.id}" aria-label="Take a dish photo">`).replace(/<label class="cook-photo-pick">🖼️ Choose a dish photo[\s\S]*?<\/label>/,'');
};

const v3OriginalShareCook=shareCook;
shareCook=async function v3ShareCook(id){
 const blob=sharePostBlobs[id],r=find(id);
 if(window.AariaNative&&blob){
  try{const reader=new FileReader(),data=await new Promise((resolve,reject)=>{reader.onload=()=>resolve(reader.result);reader.onerror=reject;reader.readAsDataURL(blob)});const caption=translateText(`I made ${r.title}! 🍽️\nMade with love by Chef Aaria in Aaria’s Magical Kitchen.\n#AariasMagicalKitchen #LittleChef`);const started=window.AariaNative.sharePost(String(data),caption);notice(started?'A parent or guardian must confirm with the device screen lock before sharing.':'Sharing needs a parent or guardian and a device screen lock. No photo was shared.');return}catch(e){console.warn('Native share unavailable; sharing was not started.',e);notice('Sharing could not be started. Ask a parent or guardian for help.');return}
 }
 const url=sharePostUrls[id];
 if(url){const slug=r.title.toLowerCase().replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');const a=document.createElement('a');a.href=url;a.download=`aaria-${slug}.png`;document.body.append(a);a.click();a.remove();await copyText(translateText(`I made ${r.title}! 🍽️\\nMade with love by Chef Aaria in Aaria’s Magical Kitchen.\\n#AariasMagicalKitchen #LittleChef`));notice('Photo saved on this device. Ask a parent or guardian to share it.');return}
 notice('Ask a parent or guardian to help save and share this photo.');
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
// Official food-composition records can be identified while their nutrient
// payload is unavailable. Keep those entries visibly partial instead of
// dereferencing null or presenting invented values.
nutritionValue=function v32SafeNutritionValue(r){
 const plan=NUTRITION_PLANS[r.id],o=state.nutritionOverrides[r.id]||{},totals={},missing=[],unavailable=new Set();
 NUTRIENT_COLUMNS.forEach(([k])=>totals[k]=[0,0]);
 plan.entries.forEach((entry,i)=>{
  if(entry.water)return;
  const key=o.types?.[i]||entry.key,ref=NUTRIENT_REFS[key];
  let grams=entry.optional?[0,0]:entry.grams;
  if(o.weights?.[i]!==undefined&&o.weights[i]!==null)grams=[o.weights[i],o.weights[i]];
  if(grams[0]===0&&grams[1]===0)return;
  if(!ref||!ref.nutrients||grams[0]===null){missing.push(entry.text);return}
  NUTRIENT_COLUMNS.forEach(([k])=>{if(ref.nutrients[k]===null)unavailable.add(k);else for(let j=0;j<2;j++)totals[k][j]+=ref.nutrients[k]*grams[j]/100;});
 });
 const servings=o.servings?[o.servings,o.servings]:plan.yield,per={};
 NUTRIENT_COLUMNS.forEach(([k])=>per[k]=[totals[k][0]/servings[1],totals[k][1]/servings[0]]);
 return {totals,per,servings,missing,unavailable:[...unavailable]};
};
render=function v3Render(){
 document.title=state.language==='pt-BR'?'Cozinha mágica da Aaria':'Aaria’s Magical Kitchen';
 if(view==='world'){
  const active=document.activeElement,previousView=window.v31PreviousView||'home';
  const focusCode=active?.closest?.('[data-v31-country]')?.dataset.v31Country||'';
  const focusType=active?.matches?.('[data-v31-country-select]')?'select':active?.matches?.('[data-v31-country-search]')?'search':active?.closest?.('.v31-map-pin')?'pin':active?.closest?.('.v31-country-choice')?'list':active?.matches?.('.v31-land')?'map':'';
  const screen=document.querySelector('#screen');if(screen){screen.className='page v31-world-screen';screen.innerHTML=v31WorldPage()}
  const app=document.querySelector('.app');app?.classList.remove('home-dashboard');app?.classList.add('v31-world-active');app?.classList.toggle('reduce-motion',!!state.reducedMotion);
  document.body.classList.remove('v3-screen-home');document.body.classList.add('v31-screen-world');document.querySelectorAll('.bottom .tab').forEach(b=>b.classList.toggle('active',b.dataset.nav==='world'));
  v31ApplyMapTransform();
  const selector=focusType==='select'?'[data-v31-country-select]':focusType==='search'?'[data-v31-country-search]':focusType==='pin'?`.v31-map-pin[data-v31-country="${focusCode}"]`:focusType==='list'?`.v31-country-choice[data-v31-country="${focusCode}"]`:focusType==='map'?`.v31-land[data-v31-country="${focusCode}"]`:'';
  if(selector)document.querySelector(selector)?.focus({preventScroll:true});else if(previousView!=='world')document.querySelector('.v31-world-header h1')?.focus({preventScroll:true});
  window.v31PreviousView='world';
  return;
 }
 window.v31PreviousView=view;
 v3BaseRender();
 if(view==='recipe')v32AddGroupRoleCopy();
 document.querySelector('.app')?.classList.remove('v31-world-active');document.body.classList.remove('v31-screen-world');
 if(view==='recipe')v31AddAdultCookingCues();
 document.title=state.language==='pt-BR'?'Cozinha mágica da Aaria':'Aaria’s Magical Kitchen';
 document.body.classList.toggle('v3-screen-home',view==='home');
 if(view==='recipe'&&selected){const screen=document.querySelector('#screen');if(screen&&!screen.querySelector('.v3-quiz-card'))screen.insertAdjacentHTML('beforeend',v3QuizCard(selected));}
 v32ApplyRecipeThemes();
};

function v32ApplyRecipeThemes(){
 const themeFor=id=>V32_RECIPE_THEME_MAP[String(Number(id))];
 document.querySelectorAll('#screen [data-open],#screen [data-v31-approved-recipe]').forEach(node=>{
  const id=node.dataset.open||node.dataset.v31ApprovedRecipe,theme=themeFor(id);
  if(theme)node.dataset.v32Theme=theme;
 });
 const app=document.querySelector('.app');
 if(!app)return;
 const theme=view==='recipe'&&selected?themeFor(selected.id):null;
 if(theme){app.dataset.v32RecipeTheme=theme;app.classList.add('v32-template-active')}
 else{delete app.dataset.v32RecipeTheme;app.classList.remove('v32-template-active')}
}

function v31AddAdultCookingCues(){
 const method=String(selected?.method||'').toLowerCase();
 const cueText=method.includes('air fryer')
  ?(state.language==='pt-BR'?'Peça a um adulto para usar a air fryer e retirar a comida quente. Espere a comida esfriar antes de comer.':'Ask an adult to operate the air fryer and remove hot food. Wait until food is cool before eating.')
  :method.includes('oven')||method.includes('stovetop')||method.includes('hob')
   ?(state.language==='pt-BR'?'Peça a um adulto para usar o forno ou fogão e manusear panelas e alimentos quentes.':'Ask an adult to operate the oven or hob and handle hot pans and food.')
   :'';
 if(!cueText)return;
 const banner=document.querySelector('.rollup-method-banner');
 if(banner&&!banner.previousElementSibling?.classList.contains('v31-adult-cue')){
  const cue=document.createElement('p');cue.className='v31-adult-cue';cue.setAttribute('role','note');cue.textContent=cueText;banner.before(cue);
 }
 const stepCopy=document.querySelector('.ref-step-card.active .ref-step-copy');
 if(stepCopy&&!stepCopy.previousElementSibling?.classList.contains('v31-step-adult-cue')){
  const cue=document.createElement('p');cue.className='v31-step-adult-cue';cue.setAttribute('role','note');
  cue.textContent=method.includes('air fryer')
   ?(state.language==='pt-BR'?'Somente um adulto deve usar a air fryer e retirar a comida quente.':'Adult only: operate the air fryer and remove hot food.')
   :(state.language==='pt-BR'?'Somente um adulto deve usar o forno ou fogão e manusear panelas quentes.':'Adult only: operate the oven or hob and handle hot pans.');
  stepCopy.before(cue);
 }
}

document.addEventListener('click',e=>{if(e.target.closest?.('.bottom .tab[data-nav="world"]'))window.v31WorldOpenedFromNav=true;const pantry=e.target.closest?.('.bottom .tab[data-nav="groceries"]');if(pantry){e.preventDefault();e.stopImmediatePropagation();openGroceries('choose')}},true);
document.addEventListener('click',e=>{const card=e.target.closest?.('[data-v31-card-country]');if(!card)return;v31SelectedCountry=card.dataset.v31CardCountry||'IND';window.v31WorldOpenedFromNav=false;window.v31WorldOpenerIndex=[...document.querySelectorAll('[data-v31-card-country]')].indexOf(card);goto('world')});
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
 if(button.hasAttribute('data-v31-passport-reset')){state.worldStamps=[];save();render();return}
 if(button.hasAttribute('data-v31-open-world')){window.v31WorldOpenedFromNav=false;window.v31WorldOpenerIndex=[...document.querySelectorAll('[data-v31-open-world]')].indexOf(button);goto('world');return}
 if(button.hasAttribute('data-v31-back')){goto('home');if(window.v31WorldOpenedFromNav)document.querySelector('.bottom .tab[data-nav="world"]')?.focus({preventScroll:true});else{const openers=[...document.querySelectorAll('[data-v31-open-world]')];(openers[window.v31WorldOpenerIndex]||openers[0])?.focus({preventScroll:true})}window.v31WorldOpenedFromNav=false;return}
 if(button.hasAttribute('data-v31-pan-toggle')){v31MapPanMode=!v31MapPanMode;v31ApplyMapTransform();button.setAttribute('aria-pressed',String(v31MapPanMode));button.setAttribute('aria-label',state.language==='pt-BR'?(v31MapPanMode?'Mover mapa ativado. Arraste o mapa; toque em Concluir para rolar a página.':'Mover mapa. Ative para arrastar em todas as direções.'):(v31MapPanMode?'Map movement on. Drag the map; choose Done to scroll the page.':'Move map. Turn on to drag in every direction.'));button.textContent=state.language==='pt-BR'?(v31MapPanMode?'Concluir':'Mover mapa'):(v31MapPanMode?'Done':'Move map');return}
 if(button.dataset.v31Zoom){if(button.dataset.v31Zoom==='in')v31MapZoom=Math.min(2.5,v31MapZoom+.25);else if(button.dataset.v31Zoom==='out')v31MapZoom=Math.max(1,v31MapZoom-.25);else{v31MapZoom=1;v31PanX=0;v31PanY=0}const rect=document.querySelector('.v31-map-wrap')?.getBoundingClientRect();if(rect){const maxX=Math.max(0,(v31MapZoom-1)*rect.width/2),maxY=Math.max(0,(v31MapZoom-1)*rect.height/2);v31PanX=Math.max(-maxX,Math.min(maxX,v31PanX));v31PanY=Math.max(-maxY,Math.min(maxY,v31PanY))}v31ApplyMapTransform();return}
});
document.addEventListener('click',e=>{const button=e.target.closest('button[data-action="nextstep"].finish-step');if(!button||!selected||!state.done.includes(selected.id)||!V31_APPROVED_INDIA_RECIPE_IDS.includes(selected.id))return;state.worldStamps=Array.isArray(state.worldStamps)?state.worldStamps:[];if(!state.worldStamps.includes('IND')){state.worldStamps.push('IND');save()}});
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
function v3ParseProfileState(raw){
 try{
  const x=typeof raw==='string'?JSON.parse(raw||'{}'):raw;
  if(!x||typeof x!=='object'||!Array.isArray(x.profiles))return {profiles:[],activeId:null,snapshot:{},...(typeof x?.error==='string'?{error:x.error}:{})};
  const seen=new Set(),profiles=[];
  for(const p of x.profiles){
   if(!p||typeof p!=='object'||Array.isArray(p)||typeof p.id!=='string')continue;
   const id=p.id.trim();if(!id||seen.has(id))continue;seen.add(id);
   const snapshot=p.snapshot&&typeof p.snapshot==='object'&&!Array.isArray(p.snapshot)?p.snapshot:{};
   profiles.push({...p,id,snapshot});
  }
  const requested=typeof x.activeId==='string'?x.activeId:null;
  const activeId=profiles.some(p=>p.id===requested)?requested:(profiles[0]?.id||null);
  const snapshot=x.snapshot&&typeof x.snapshot==='object'&&!Array.isArray(x.snapshot)?x.snapshot:{};
  return {...x,profiles,activeId,snapshot};
 }catch{return {profiles:[],activeId:null,snapshot:{}}}
}
function v3PersistProfileState(){
 const activeId=v3ProfileState.activeId||null,nativeSave=window.AariaNative?.saveProfileSnapshot;
 let nativeSaved=false;
 if(nativeSave&&activeId){try{nativeSaved=!!nativeSave(activeId,JSON.stringify(state))}catch{}}
 try{
  const key='myMagicalKitchenProfilesV1',previous=v3ParseProfileState(localStorage.getItem(key));
  const priorById=new Map((previous.profiles||[]).map(p=>[p.id,p.snapshot]));
  const profiles=(v3ProfileState.profiles||[]).map(p=>({...p,snapshot:p.id===activeId?state:(priorById.get(p.id)||p.snapshot)}));
  const pending=new Set(Array.isArray(previous.pendingProfileIds)?previous.pendingProfileIds.filter(id=>typeof id==='string'):[]);
  if(nativeSave&&activeId){if(nativeSaved)pending.delete(activeId);else pending.add(activeId)}
  localStorage.setItem(key,JSON.stringify({profiles,activeId,pendingProfileIds:[...pending]}));
 }catch{}
 return nativeSaved||!nativeSave;
}
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
 const r=v3ParseProfileState(result);
 const key='myMagicalKitchenProfilesV1',fallback=v3ParseProfileState(localStorage.getItem(key));
 const pending=new Set(Array.isArray(fallback.pendingProfileIds)?fallback.pendingProfileIds.filter(id=>typeof id==='string'):[]);
 const fallbackById=new Map((fallback.profiles||[]).map(p=>[p.id,p]));
 const recovered=fallbackById.get(r.activeId);
 if(r.activeId&&pending.has(r.activeId)&&recovered?.snapshot)r.snapshot=recovered.snapshot;
 v3ProfileState.profiles=r.profiles||[];v3ProfileState.activeId=r.activeId||null;
 const active=v3ProfileState.profiles.find(p=>p.id===v3ProfileState.activeId)||null;
 v3ProfileState.profile=active;
 state=v3ProfileStateFor(state,r.snapshot);state.avatarAssignments??={};
 if(active){
  if(pending.has(active.id)&&window.AariaNative?.saveProfileSnapshot){try{if(window.AariaNative.saveProfileSnapshot(active.id,JSON.stringify(state)))pending.delete(active.id)}catch{}}
  try{
   localStorage.setItem('aariaPrivateKitchenV4',JSON.stringify(state));
   const profiles=v3ProfileState.profiles.map(p=>({...p,snapshot:p.id===active.id?state:(fallbackById.get(p.id)?.snapshot||p.snapshot)}));
   localStorage.setItem(key,JSON.stringify({profiles,activeId:active.id,pendingProfileIds:[...pending]}));
  }catch{}
 }
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
.v3-profile-trigger{border:0;border-radius:12px;background:#fff;color:#4e376c;padding:6px 9px;font:800 11px inherit;box-shadow:0 3px 12px #4e376c18;cursor:pointer;min-height:40px;white-space:nowrap}
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
function v3CreationsPage(){
 const pt=state.language==='pt-BR',ids=[...new Set([...(Array.isArray(state.myCreations)?state.myCreations:[]).map(item=>Number(typeof item==='object'?item.recipeId:item)),...(state.done||[]).map(Number)])].filter(id=>find(id));
 const cards=ids.map(id=>{const r=find(id);return `<article class="v3-creation-card"><div>${homeTile(r)}</div><p>${pt?'Receita preparada e salva neste perfil':'Cooked recipe saved to this profile'}${(state.done||[]).includes(id)?' ✓':''}</p></article>`}).join('');
 return `<div class="v3-creations-page"><div class="v3-creations-heading"><button type="button" data-nav="home" aria-label="${pt?'Voltar ao início':'Back home'}">← ${pt?'Início':'Home'}</button><h1>🎨 ${pt?'Minhas criações':'My Creations'}</h1><p>${pt?'Suas receitas concluídas ficam guardadas neste perfil.':'Your completed recipes are saved with this kitchen profile.'}</p></div>${cards?`<section class="v3-creations-grid" aria-label="${pt?'Receitas concluídas':'Completed recipes'}">${cards}</section>`:`<section class="v3-creations-empty"><span aria-hidden="true">✨</span><p>${pt?'Prepare uma receita e ela aparecerá aqui.':'Finish a recipe and it will appear here.'}</p><button type="button" data-nav="library">${pt?'Escolher uma receita':'Choose a recipe'}</button></section>`}</div>`;
}
if(typeof document!=='undefined'&&!document.getElementById('v3-creations-style'))document.head.insertAdjacentHTML('beforeend',`<style id="v3-creations-style">.v3-creations-page{max-width:1100px;margin:0 auto;padding:clamp(18px,4vw,42px);min-height:70vh;color:#35264f}.v3-creations-heading{background:#fff9f3;border:1px solid #eadcf0;border-radius:24px;padding:20px;margin-bottom:20px}.v3-creations-heading h1{margin:10px 0 6px}.v3-creations-heading p,.v3-creation-card p{color:#645775}.v3-creations-heading button,.v3-creations-empty button{min-height:44px;border:0;border-radius:12px;padding:10px 16px;background:#694a9a;color:white;font-weight:800}.v3-creations-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:16px}.v3-creation-card{padding:12px;background:#fff;border:1px solid #eadcf0;border-radius:20px;box-shadow:0 8px 22px #54345b12}.v3-creation-card .home-tile{width:100%}.v3-creation-card p{font-size:13px;font-weight:700;margin:8px 4px}.v3-creations-empty{text-align:center;padding:32px;border:2px dashed #ddc8e5;border-radius:22px;background:#fffaf4}.v3-creations-empty>span{font-size:38px}</style>`);
const v3RenderBeforeProfileControls=render;
function v3UpdateNavLabels(){const pt=state.language==='pt-BR',labels=pt?['Início','Receitas','Aventura','Despensa','Planejar','Criações']:['Home','Recipes','World Adventure','Magic Pantry','Planner','My Creations'];document.querySelectorAll('#nav .tab').forEach((tab,i)=>{if(tab.lastChild?.nodeType===Node.TEXT_NODE)tab.lastChild.textContent=labels[i]||tab.lastChild.textContent})}
render=function(){const creationsView=view==='creations';if(creationsView)view='home';v3SyncRecipeArt();v3RenderBeforeProfileControls();if(creationsView){view='creations';const screen=document.querySelector('#screen');if(screen){screen.innerHTML=v3CreationsPage();screen.classList.remove('home-page');document.querySelector('.app')?.classList.remove('home-dashboard','reference-active');document.querySelectorAll('#nav .tab').forEach(tab=>tab.classList.remove('active'));window.scrollTo(0,0)}v3UpdateNavLabels();return}v3UpdateNavLabels();if(!v3ProfileInitComplete||view!=='home')return;const header=document.querySelector('#screen .v31-approved-header');if(!header)return;if(!header.querySelector('[data-v3-profile-open]')){const button=document.createElement('button');button.className='v3-profile-trigger';button.type='button';button.setAttribute('data-v3-profile-open','');button.setAttribute('aria-label',state.language==='pt-BR'?'Trocar perfil da cozinha':'Switch kitchen profile');button.textContent=`👩‍🍳 ${v3ProfileState.profile?.name|| (state.language==='pt-BR'?'Escolher perfil':'Choose profile')} ▾`;header.insertBefore(button,header.querySelector('.v3-settings'))}};
function v3RestoreCreationsRoute(){if(location.hash==='#aria/creations'){view='creations';render()}}
window.addEventListener('hashchange',v3RestoreCreationsRoute);window.addEventListener('popstate',v3RestoreCreationsRoute);
document.addEventListener('click',event=>{const button=event.target.closest('button[data-action="nextstep"]');if(!button||!button.classList.contains('finish-step')||!selected)return;state.myCreations=Array.isArray(state.myCreations)?state.myCreations:[];if(!state.myCreations.some(item=>Number(typeof item==='object'?item.recipeId:item)===Number(selected.id)))state.myCreations.push({recipeId:Number(selected.id),savedAt:new Date().toISOString()});save()});
function v3WhatsNewCopy(index,pt){
 const steps=pt?[
  {title:'Bem-vinda à cozinha V3!',body:'Explore as 95 receitas. Escolha uma com um adulto, que pode conferir ingredientes e alergias.'},
  {title:'Planeje e brinque',body:'Sorteie uma receita, veja a semana mágica, ganhe estrelas, ou monte uma lista de compras. Peça a um adulto para revisar planos e mensagens.'},
  {title:'Faça do seu jeito',body:'Cada chef pode ter um perfil separado. Favoritos e progresso ficam naquele perfil. Você pode rever este passeio em Configurações.'}
 ]:[
  {title:'Welcome to your V3 kitchen!',body:'Explore all 95 recipes. Choose one with an adult, who can check ingredients and allergies.'},
  {title:'Plan and play',body:'Spin for a recipe, explore your magical week, collect stars, or make a shopping list. Ask an adult to review plans and messages.'},
  {title:'Make it yours',body:'Each chef can have a separate profile. Favourites and progress stay with that profile. Replay this tour from Settings whenever you like.'}
 ];
 return Number.isInteger(index)&&index>=0&&index<steps.length?steps[index]:null;
}

let v3WhatsNewOpener=null;
function v3OpenWhatsNew(index=0){
 const pt=state.language==='pt-BR',step=v3WhatsNewCopy(index,pt);if(!step)return;
 document.getElementById('v3WhatsNew')?.remove();
 const modal=document.createElement('div');modal.id='v3WhatsNew';modal.setAttribute('role','presentation');
 modal.style.cssText='position:fixed;inset:0;z-index:99999;background:rgba(10,20,40,.78);display:grid;place-items:center;padding:18px';
 const panel=document.createElement('section');panel.setAttribute('role','dialog');panel.setAttribute('aria-modal','true');panel.setAttribute('aria-labelledby','v3WhatsNewTitle');
 panel.style.cssText='max-width:480px;width:100%;background:#fffdf4;color:#192c43;border-radius:24px;padding:24px;box-shadow:0 14px 48px #0005';
 const heading=document.createElement('h2');heading.id='v3WhatsNewTitle';heading.tabIndex=-1;heading.textContent='✨ '+step.title;panel.appendChild(heading);
 const body=document.createElement('p');body.textContent=step.body;panel.appendChild(body);
 const progress=document.createElement('p');progress.textContent=(index+1)+(pt?' de 3':' of 3');panel.appendChild(progress);
 const actions=document.createElement('div');actions.style.cssText='display:flex;gap:8px;flex-wrap:wrap';
 function action(text,attr,value){const btn=document.createElement('button');btn.type='button';btn.textContent=text;btn.setAttribute(attr,value);btn.style.cssText='padding:12px;border-radius:12px;min-height:44px';actions.appendChild(btn)}
 if(index>0)action(pt?'Voltar':'Back','data-v3-tour-step',String(index-1));
 if(index<2)action(pt?'Próximo':'Next','data-v3-tour-step',String(index+1));
 else action(pt?'Concluir':'Finish','data-v3-tour-close','');
 action(pt?'Pular passeio':'Skip tour','data-v3-tour-close','');
 panel.appendChild(actions);modal.appendChild(panel);document.body.appendChild(modal);heading.focus();
}
document.addEventListener('click',event=>{
 const btn=event.target.closest('button');if(!btn)return;
 if(btn.hasAttribute('data-v3-tour-open')){v3WhatsNewOpener=btn;v3OpenWhatsNew();return}
 if(btn.hasAttribute('data-v3-tour-close')){document.getElementById('v3WhatsNew')?.remove();v3WhatsNewOpener?.focus();return}
 if(btn.hasAttribute('data-v3-tour-step'))v3OpenWhatsNew(Number(btn.getAttribute('data-v3-tour-step')));
});
document.addEventListener('keydown',event=>{if(event.key==='Escape'&&document.getElementById('v3WhatsNew')){document.getElementById('v3WhatsNew').remove();v3WhatsNewOpener?.focus()}});
const v31RenderBeforeTour=render;
render=function(){v31RenderBeforeTour();if(view!=='home'&&view!=='settings')return;
 const screen=document.querySelector('#screen');if(!screen||screen.querySelector('[data-v3-tour-open]'))return;
 const button=document.createElement('button');button.type='button';button.setAttribute('data-v3-tour-open','');
 button.textContent=view==='settings'?'✨ Replay the V3 kitchen tour':(state.language==='pt-BR'?'✨ Novidades':'✨ What’s new');
 button.style.cssText='min-height:44px;padding:10px 16px;border-radius:16px;margin:12px;cursor:pointer';
 screen.appendChild(button);
};

v3InitProfiles();
render();


