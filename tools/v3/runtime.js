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
 const title=pt?'Minha Cozinha Mágica':'My Magical Kitchen';
 const aaria=avatar('v3-hero-avatar');
 return `<section class="v3-home" aria-label="${title}">
  <header class="v3-home-top"><div class="v3-brand"><span class="v3-brand-mark" aria-hidden="true">✨</span><span>${title}<small>${pt?'Sua cozinha · Suas criações · Sua magia':'Your Kitchen. Your Creations. Your Magic.'}</small></span></div><button class="v3-settings" data-nav="settings" aria-label="${pt?'Configurações':'Settings'}">⚙️</button></header>
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
document.title=state.language==='pt-BR'?'Minha Cozinha Mágica':'My Magical Kitchen';
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
 state=v3ProfileStateFor(state,r.snapshot);
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
.v3-chef-choice[aria-pressed="true"],.v3-profile-choice[aria-current="true"]{border-color:#a7418c;background:#fff0f8;box-shadow:0 0 0 3px #e9c1dc66}
.v3-profile-choice{display:grid;text-align:left;gap:3px}.v3-profile-choice small{color:#716481;font-weight:600}
.v3-profile-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:14px}.v3-profile-actions button{flex:1}
.v3-profile-primary{background:#694a9a;color:white;border-color:#694a9a}.v3-profile-error{min-height:22px;color:#a52f45;font-weight:700}
@media(max-width:420px){.v3-profile-dialog{padding:18px}.v3-chef-options,.v3-profile-list{grid-template-columns:1fr}}
</style>`;
if(!document.getElementById('v3-profile-style'))document.head.insertAdjacentHTML('beforeend',v3ProfileCss);
function v3OpenProfileEditor(mode='menu'){
 document.getElementById('v3ProfileDialog')?.remove();
 const pt=state.language==='pt-BR',active=v3ProfileState.profile,legacy=mode==='legacy',first=mode==='first-run',adding=mode==='add';
 const heading=legacy?(pt?'Escolha seu chef':'Choose your chef'):first?(pt?'Bem-vinda à sua cozinha':'Welcome to My Magical Kitchen'):adding?(pt?'Novo perfil':'Add a chef profile'):(pt?'Perfis da cozinha':'Kitchen profiles');
 const intro=legacy?(pt?'Seu progresso da cozinha da Aaria foi preservado. Escolha um dos dois chefs para continuar com os mesmos dados.':'Aaria’s existing kitchen progress is preserved. Pick one of the two chefs to continue with that saved data.'):first?(pt?'Escolha um nome e um chef. Você pode alterar isso depois.':'Choose a name and a chef. You can change them later.'):adding?(pt?'Cada chef tem seu próprio progresso e favoritos neste aparelho.':'Each chef gets separate progress and favourites on this device.'):'';
 const rows=!first&&!legacy&&!adding?`<div class="v3-profile-list">${v3ProfileState.profiles.map(p=>`<button class="v3-profile-choice" data-v3-profile-select="${safe(p.id)}" aria-current="${p.id===v3ProfileState.activeId}"><strong>${safe(p.name)}</strong><small>${p.chefId==='CHEF_B'?'Chef B':p.chefId==='CHEF_A'?'Chef A':'Choose a chef'}</small></button>`).join('')}</div><div class="v3-profile-actions"><button class="v3-profile-action" data-v3-profile-add>${pt?'Adicionar perfil':'Add profile'}</button><button class="v3-profile-action" data-v3-profile-close>${pt?'Concluído':'Done'}</button></div>`:'';
 const name=legacy?active?.name||'Aaria':'';
 const chooser=(first||legacy||adding)?`<label>${pt?'Nome ou apelido':'Name or nickname'}<input id="v3ProfileName" maxlength="24" autocomplete="nickname" value="${safe(name)}" aria-label="${pt?'Nome ou apelido':'Name or nickname'}"></label><div class="v3-chef-options" role="group" aria-label="${pt?'Escolha um chef':'Choose a chef'}"><button type="button" class="v3-chef-choice" data-v3-chef="CHEF_A" aria-pressed="false">✨ Chef A</button><button type="button" class="v3-chef-choice" data-v3-chef="CHEF_B" aria-pressed="false">🌟 Chef B</button></div><div class="v3-profile-error" id="v3ProfileError" role="status" aria-live="polite"></div><div class="v3-profile-actions"><button class="v3-profile-action v3-profile-primary" data-v3-profile-continue>${pt?'Entrar na cozinha':'Continue to kitchen'}</button>${!first&&!legacy?`<button class="v3-profile-action" data-v3-profile-close>${pt?'Cancelar':'Cancel'}</button>`:''}</div>`:'';
 document.body.insertAdjacentHTML('beforeend',`<div class="v3-profile-backdrop" id="v3ProfileDialog"><section class="v3-profile-dialog" role="dialog" aria-modal="true" aria-labelledby="v3ProfileTitle"><span class="v3-eyebrow">✨ ${pt?'MINHA COZINHA MÁGICA':'MY MAGICAL KITCHEN'}</span><h2 id="v3ProfileTitle">${heading}</h2><p>${intro}</p>${rows}${chooser}</section></div>`);
 document.querySelector('#v3ProfileDialog [data-v3-chef]')?.focus();
}
function v3FreshSnapshot(){return {weeks:{},done:[],checks:{},stories:[],favorites:[],grocerySelected:[],language:state.language||'en-GB'}}
function v3ApplyProfileResult(raw){const r=v3ParseProfileState(raw);if(r.error)throw new Error(r.error);v3SetActiveProfile(r);try{localStorage.setItem('myMagicalKitchenProfilesV1',JSON.stringify({profiles:v3ProfileState.profiles,activeId:v3ProfileState.activeId}))}catch{};render()}
function v3CreateOrSelectChef(name,chefId){
 const profile=v3ProfileState.profile;
 if(profile?.chefId==='LEGACY_AARIA'){if(window.AariaNative?.chooseProfileChef&&!window.AariaNative.chooseProfileChef(profile.id,chefId))throw new Error('Could not save avatar choice');profile.chefId=chefId;v3ProfileState.profile=profile;v3PersistProfileState();render();return}
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
const v3RenderBeforeProfileControls=render;
render=function(){v3RenderBeforeProfileControls();if(!v3ProfileInitComplete||view!=='home')return;const header=document.querySelector('#screen .v3-home-top');if(header&&!header.querySelector('[data-v3-profile-open]')){const button=document.createElement('button');button.className='v3-profile-trigger';button.type='button';button.setAttribute('data-v3-profile-open','');button.setAttribute('aria-label','Switch kitchen profile');button.textContent=`👩‍🍳 ${v3ProfileState.profile?.name||'Choose profile'} ▾`;header.insertBefore(button,header.lastElementChild)}};
v3InitProfiles();
render();
