/* __AARIA_V3_MARKER__: shared HTML + APK experience */
const V3_ART=__V3_ART_JSON__;
const V3_INGREDIENT_ATLAS=__V3_INGREDIENT_ATLAS_JSON__;
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
  NEW_RECIPE_ART[id]={...(NEW_RECIPE_ART[id]||{}),atlas:a.atlas,storyboard:a.atlas,hero:a.hero,cellAspect:a.aspect,status:'approved'};
  BATCH_META[id]={...(BATCH_META[id]||{}),stepCells:[1,2,3,4]};
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
  <header class="v3-home-top"><div class="v3-brand"><span class="v3-brand-mark" aria-hidden="true">✨</span><span>${title}<small>${pt?'Cozinhar · Criar · Explorar · Brilhar':'Cook · Create · Explore · Shine'}</small></span></div><button class="v3-settings" data-nav="settings" aria-label="${pt?'Configurações':'Settings'}">⚙️</button></header>
  <section class="v3-hero"><div class="v3-hero-copy"><span class="v3-eyebrow">${pt?'✨ SUA PRÓXIMA AVENTURA':'✨ YOUR NEXT KITCHEN QUEST'}</span><h1>${pt?'Vamos preparar algo mágico!':'Make something magical today.'}</h1><p>${pt?'Escolha uma receita, experimente algo novo e crie do seu jeito.':'Pick a recipe, try a new skill, and make it your own.'}</p><button class="v3-primary" data-nav="library">${pt?'Escolher uma receita':'Choose a recipe'} <span aria-hidden="true">→</span></button></div><div class="v3-hero-art">${aaria}</div></section>
  <section class="v3-progress" aria-label="${pt?'Seu progresso':'Your progress'}"><div class="v3-progress-card"><span>📖</span><div><strong>95 ${pt?'receitas':'recipes'}</strong><small>${pt?'para descobrir':'ready to explore'}</small></div></div><div class="v3-progress-card"><span>⭐</span><div><strong>${stats.stars}</strong><small>${pt?'estrelas de chef':'chef stars'}</small></div></div><div class="v3-progress-card"><span>🏅</span><div><strong>${stats.completed}</strong><small>${pt?'receitas feitas':'recipes completed'}</small></div></div></section>
  <div class="v3-section-head"><div><h2>${pt?'O que parece divertido?':'What sounds fun?'}</h2><p>${pt?'Escolha uma aventura para hoje.':'Choose a kitchen adventure.'}</p></div></div>
  <section class="v3-action-grid" aria-label="${pt?'Aventuras':'Kitchen adventures'}">
   <button class="v3-action" data-action="open-wheel"><span class="v3-action-art"><span class="action-illustration gift-art" aria-hidden="true"></span></span><strong>${pt?'Surpresa!':'Surprise me'}</strong><small>${pt?'Sorteie uma receita.':'Spin for a recipe to try.'}</small></button>
   <button class="v3-action" data-action="open-week-wheel"><span class="v3-action-art"><span class="action-illustration wheel-art" aria-hidden="true"></span></span><strong>${pt?'Minha semana':'My magical week'}</strong><small>${pt?'Ideias variadas para a semana.':'A fun mix to review together.'}</small></button>
   <button class="v3-action" data-nav="family"><span class="v3-action-art"><span class="action-illustration family-art" aria-hidden="true"></span></span><strong>${pt?'Cozinhar em família':'Cook with family'}</strong><small>${pt?'Receitas para fazer juntos.':'Mommy, Daddy and Aaria.'}</small></button>
   <button class="v3-action" data-nav="friends"><span class="v3-action-art"><span class="action-illustration friends-art" aria-hidden="true"></span></span><strong>${pt?'Cozinhar com amigos':'Cook with friends'}</strong><small>${pt?'Compartilhe a diversão.':'Make something together.'}</small></button>
  </section>
  <div class="v3-section-head"><div><h2>${pt?'Comece com uma favorita':'Start with a favourite'}</h2><p>${pt?'Seu próximo prato está esperando.':'Three ways to cook, one magical kitchen.'}</p></div><button class="text-link" data-nav="library">${pt?'Ver as 95 receitas':'See all 95'} →</button></div>
  <section class="v3-rail" aria-label="${pt?'Receitas em destaque':'Featured recipes'}">${picks.map(homeTile).join('')}</section>
  <nav class="v3-quick-links" aria-label="${pt?'Mais atividades':'More activities'}"><button data-nav="rewards">🏆 ${pt?'Prêmios':'Awards'}</button><button data-nav="stories">🧚 ${pt?'Histórias e música':'Stories and music'}</button><button data-action="groceries-choose">🛒 ${pt?'Lista de compras':'Grocery list'}</button></nav>
 </section>`;
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
 v3BaseRender();
 document.body.classList.toggle('v3-screen-home',view==='home');
 if(view==='recipe'&&selected){const screen=document.querySelector('#screen');if(screen&&!screen.querySelector('.v3-quiz-card'))screen.insertAdjacentHTML('beforeend',v3QuizCard(selected));}
};

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
document.addEventListener('change',e=>{
 const input=e.target;if(input.matches('[data-v3-parent]')){state.parentContacts??={mommy:'',daddy:''};state.parentContacts[input.dataset.v3Parent]=input.value.trim();save();notice('Family contact saved on this device.');}
});
window.aariaHandleNativeDishPhoto=async(id,dataUrl)=>{
 try{const blob=await(await fetch(dataUrl)).blob();if(sharePostUrls[id])URL.revokeObjectURL(sharePostUrls[id]);shareSourcePhotos[id]=blob;const post=await makeCookPost(find(id),blob);sharePostBlobs[id]=post;sharePostUrls[id]=URL.createObjectURL(post);render();notice('Your cooking post is ready! 💖');}
 catch(e){console.error('Could not prepare the camera photo.',e);notice('Could not prepare that photo. Please try again.');}
};
if(document.title.includes('Cozinha Mágica da Aaria'))document.title='Cozinha mágica da Aaria';
render();
