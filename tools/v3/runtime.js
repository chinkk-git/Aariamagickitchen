/* __AARIA_V3_MARKER__: shared HTML + APK experience */
const V3_ART=__V3_ART_JSON__;
const V3_INGREDIENT_ATLAS=__V3_INGREDIENT_ATLAS_JSON__;
const V3_PROFILE_ART=__V3_PROFILE_ART_JSON__;
const V31_HOME_WORLD_ART=__V31_HOME_WORLD_ART_JSON__;
const V33_WORLD_ARTWORK=__V33_WORLD_ARTWORK_JSON__;
const V32_RECIPE_THEME_MAP=__V32_RECIPE_THEME_MAP_JSON__;
const V32_REVIEW_FEATURED_IDS=__V32_REVIEW_FEATURED_IDS_JSON__;
const V32_INTERNATIONAL_RECIPES=__V32_INTERNATIONAL_RECIPES_JSON__;
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
function v32ReviewFeaturedDescription(recipe,pt){
 const description=pt?(PT_RECIPES[recipe.id]?.description||recipe.description):recipe.description;
 return description||'';
}

const V32_INTL_ROOT='international-wave-1/';
const V32_INTL_FLAG={italy:'🇮🇹',china:'🇨🇳'};
const v32InternationalIngredientList=record=>record.ingredients.map(x=>String(x.name)+': '+x.quantity+' '+x.unit);
const v32InternationalSteps=record=>record.steps.map(x=>x.instruction);
const V32_INTL_BY_ID=new Map();
for(const item of V32_INTERNATIONAL_RECIPES){
 const id=Number(item.id),en=item.locales&&item.locales['en-GB'],pt=item.locales&&item.locales['pt-BR'];
 if(![96,99].includes(id)||!en||!pt||RECIPES.some(x=>Number(x.id)===id))throw new Error('Pinned W03 recipe/locale collision: '+id);
 const r={id,title:en.title,emoji:V32_INTL_FLAG[item.country]||'🌍',category:'International',country:item.country,description:en.description,fact:en.description,method:en.method||'Guided cooking',time:(en.estimatedHandsOnMinutes||20)+' min',servings:en.servings||2,yieldText:'Makes '+(en.servings||2)+' servings',ingredients:v32InternationalIngredientList(en),steps:v32InternationalSteps(en),safety:en.adultHelp,adultHelp:en.adultHelp,allergens:en.allergens||[],crossContact:en.crossContact||'',international:en.international,nutrition:en.nutrition};
 RECIPES.push(r);
 PT_RECIPES[id]={title:pt.title,description:pt.description,ingredients:v32InternationalIngredientList(pt),steps:v32InternationalSteps(pt),safety:pt.adultHelp,adultHelp:pt.adultHelp,crossContact:pt.crossContact||''};
 const dish=V32_INTL_ROOT+en.finishedDish;
 NEW_RECIPE_ART[id]={hero:dish,dish,status:'approved-review-only'};
 BATCH_META[id]={title:pt.title,line:pt.description,steps:v32InternationalSteps(pt),titles:pt.steps.map(x=>x.title),tools:pt.equipment,stepCells:pt.steps.map((_,i)=>i)};
 STEP_GUIDES[id]=en.steps.map(x=>({title:x.title,tip:x.safety,safety:x.safety,adultAssist:x.adultAssist,art:V32_INTL_ROOT+x.image.path}));
 V32_INTL_BY_ID.set(id,{record:r,item});
}
function v32InternationalRole(role,pt){
 const values={'adult':pt?'Somente um adulto':'Adult only','shared under adult supervision':pt?'Com um adulto':'With an adult','shared when cool':pt?'Quando esfriar':'When cool','child':pt?'Aaria':'Aaria'};
 return values[String(role||'').trim().toLowerCase()]||role||'';
}
function v32ShortIngredient(name,pt){
 const t=String(name||'').toLowerCase();
 const entries=[
  [/tomato|tomate/,pt?'Tomates':'Tomatoes'],[/soy sauce|molho de soja/,pt?'Molho de soja':'Soy sauce'],[/\bsalt\b|\bsal\b/,pt?'Sal':'Salt'],[/water|água/,pt?'Água':'Water'],[/spaghetti|espaguete|pasta|macarr/,pt?'Espaguete':'Spaghetti'],[/olive oil|azeite/,pt?'Azeite':'Olive oil'],[/garlic|alho/,pt?'Alho':'Garlic'],[/basil|manjeric/,pt?'Manjericão':'Basil'],[/rice|arroz/,pt?'Arroz':'Rice'],[/egg|ovo/,pt?'Ovos':'Eggs'],[/pea|ervilha/,pt?'Ervilhas':'Peas'],[/carrot|cenoura/,pt?'Cenoura':'Carrot'],[/spring onion|green onion|cebolinha/,pt?'Cebolinha':'Spring onion'],[/oil|óleo/,pt?'Óleo':'Oil']
 ];
 return (entries.find(([rx])=>rx.test(t))||[])[1]||String(name||'').split(/[,(]/)[0].trim();
}
function v32ShortAmount(x,pt){
 const quantity=String(x.quantity??'').trim(),unit=String(x.unit||'').trim();
 let short=unit.replace(/\s*\([^)]*\)/g,'').replace(/\b(?:grams?|millilitres?|milliliters?)\b/gi,m=>/^milli/i.test(m)?'mL':'g');
 if(pt)short=short.replace(/\bcloves?\b/gi,'dentes').replace(/\bleaves?\b/gi,'folhas').replace(/\bpinches?\b/gi,'pitadas').replace(/\bcups?\b/gi,'xícaras').replace(/\btablespoons?\b/gi,'colheres (sopa)').replace(/\bteaspoons?\b/gi,'colheres (chá)');
 else short=short.replace(/\bcloves?\b/gi,'clove').replace(/\bleaves?\b/gi,'leaves');
 return [quantity,short].filter(Boolean).join(' ');
}
function v32CompactIngredients(item,locale){
 const pt=locale==='pt-BR',record=item.locales[locale];
 return record.ingredients.map(x=>({shortName:v32ShortIngredient(x.name,pt),amount:v32ShortAmount(x,pt),picture:x.name,accessibleLabel:[x.name,x.quantity,x.unit].filter(Boolean).join(', ')}));
}
function v32NutritionSource(item,locale){return item.locales[locale].nutrition||{}}
function v32InternationalIngredientPicture(text){
 const t=String(text||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').toLowerCase();
 const icons=[
  [/spaghetti|espaguete|pasta seca/,'Dried spaghetti','<g fill="none" stroke="#d6a55e" stroke-width="3.2" stroke-linecap="round"><path d="M13 10 45 47M20 8l31 40M28 7l25 38M36 8l17 33M15 20l30 29M12 29l26 20"/></g><path d="M11 8h5m26 39h8" stroke="#b47b3b" stroke-width="3" stroke-linecap="round"/>'],
  [/garlic|alho/,'Garlic','<path d="M32 15c-2-8 2-10 5-11m-5 12c-7-7-17-2-16 10-8 8-3 24 9 25 3 4 11 4 14 0 12-1 17-17 9-25 1-12-9-17-16-10Z" fill="#f8f0dc" stroke="#b8a582" stroke-width="2.5"/><path d="M31 17c-3 10-4 19-3 31m6-31c3 10 4 19 3 31m-9-27c-6-3-10 0-10 7m20-7c6-3 10 0 10 7" fill="none" stroke="#d2c4a5" stroke-width="2"/>'],
  [/basil|manjeric/,'Fresh basil','<path d="M32 51C10 42 7 24 15 14c8-1 15 4 17 13 2-13 10-20 20-18 4 14-2 28-20 42Z" fill="#76b85d" stroke="#438447" stroke-width="2.5"/><path d="M32 51c-2-15-2-25 0-37m0 21L19 23m13 20 14-17" fill="none" stroke="#d1e59a" stroke-width="2.4" stroke-linecap="round"/>'],
  [/(peas?.*carrot|carrot.*peas|ervilha.*cenoura|cenoura.*ervilha)/,'Peas and carrots','<g><path d="M10 35c10-10 31-13 44-7-8 13-25 21-43 14Z" fill="#6caa57" stroke="#438447" stroke-width="2"/><g fill="#78b95d" stroke="#438447" stroke-width="1.5"><circle cx="18" cy="35" r="4"/><circle cx="29" cy="32" r="4"/><circle cx="40" cy="32" r="4"/></g><path d="m16 15 11 5-10 23-8-4Zm20-7 11 5-11 26-8-4Z" fill="#f39a43" stroke="#c56c2d" stroke-width="2"/><path d="m14 17 4 2m20-3 4 2" stroke="#ffd281" stroke-width="2"/></g>'],
  [/(spring|green) onion|cebolinha/,'Spring onion','<path d="M17 47 27 13m4 37 3-40m3 39 12-34" stroke="#6b9e4c" stroke-width="6" stroke-linecap="round"/><path d="M27 17c-10-7-14-5-17-1m21 0c7-10 13-9 16-6m-9 8c9-6 14-4 17 0" fill="none" stroke="#86bd63" stroke-width="4" stroke-linecap="round"/><path d="m15 43 4 8m11-4 4 5m10-6 4 4" stroke="#f5f0df" stroke-width="5" stroke-linecap="round"/>'],
  [/(neutral|cooking) oil|oleo neutro/,'Neutral cooking oil','<path d="M27 8h11v7l6 6v29H20V21l7-6Z" fill="#f1d873" stroke="#a89848" stroke-width="2.5"/><path d="M27 8h11m-11 7h11" stroke="#82965c" stroke-width="4" stroke-linecap="round"/><rect x="23" y="28" width="22" height="12" rx="3" fill="#fff4cc" stroke="#c7b65e"/><path d="M27 34h14" stroke="#b4a353" stroke-width="2"/>'],
  [/soy sauce|molho de soja/,'Soy sauce','<path d="M26 8h12v7l7 7v27H19V22l7-7Z" fill="#8a5135" stroke="#593526" stroke-width="2.5"/><path d="M26 8h12m-12 7h12" stroke="#d2b37c" stroke-width="4" stroke-linecap="round"/><rect x="22" y="28" width="20" height="12" rx="3" fill="#fff2d3" stroke="#cba96e"/><path d="M26 34h12" stroke="#9b6040" stroke-width="2"/>']
 ];
 const match=icons.find(([pattern])=>pattern.test(t));
 const canonicalName=(/tomato|tomate/.test(t)?'tomato':/olive oil|azeite/.test(t)?'olive oil':/\bsalt\b|\bsal\b/.test(t)?'salt':/water|agua/.test(t)?'water':/rice|arroz/.test(t)?'rice':/\beggs?\b|\bovos?\b/.test(t)?'eggs':null);
 const rendered=match?iconSvg(match[1],match[2]):v32BaseBatchIngredientPictureForOriginalRecipes(canonicalName||text);
 if(rendered.includes('<circle cx="32" cy="28" r="23" fill="#fff0dc"/>'))throw Error('International ingredient icon is not mapped: '+text);
 return rendered.replace('<svg class="kitchen-icon"','<svg class="kitchen-icon v32-intl-ingredient-icon"');
}
const v32BaseBatchIngredientPictureForOriginalRecipes=batchIngredientPicture;
batchIngredientPicture=function v32ScopedInternationalIngredientPicture(text){
 return V32_INTL_BY_ID?.has(Number(selected?.id))?v32InternationalIngredientPicture(text):v32BaseBatchIngredientPictureForOriginalRecipes(text);
};
function v32RenderInternationalEquipment(html,record,pt){
 const start=html.indexOf('<div class="ref-tool-grid"');if(start<0)throw Error('Canonical equipment grid missing');
 const openEnd=html.indexOf('>',start);if(openEnd<0)throw Error('Canonical equipment grid opening tag is incomplete');
 const tags=/<\/?div\b[^>]*>/g;tags.lastIndex=start;let depth=0,end=-1,match;
 while((match=tags.exec(html))){if(/^<\/div\b/.test(match[0]))depth--;else if(!/\/>$/.test(match[0]))depth++;if(depth===0){end=tags.lastIndex;break;}}
 if(end<0)throw Error('Canonical equipment grid is unclosed');
 const items=record.equipmentItems||[];if(!items.length)throw Error('International equipment metadata missing');
 const cards=items.map((item,index)=>{const name=String(item.name?.[pt?'pt-BR':'en-GB']||item.name||'').trim(),role=v32InternationalRole(item.roleDescription||item.role,pt);if(!name||!role)throw Error('International equipment name or child-safety role missing: '+index);return '<div class="ref-tool"><span class="v32-equipment-chip">'+safe(name)+'</span><small class="v32-tool-role">'+safe(role)+'</small></div>';}).join('');
 return html.slice(0,start)+html.slice(start,openEnd+1)+cards+html.slice(end);
}
function v32RestoreInternationalStepCopy(active,steps,index){const position=Math.max(0,Math.min((steps||[]).length-1,Number(index)||0)),step=steps?.[position],instruction=typeof step==='string'?step:step?.instruction;if(!active||!String(instruction||'').trim())return false;active.textContent=String(instruction);return true;}
function v32RenderInternationalStepArtwork(html,steps){let cursor=0;for(let index=0;index<steps.length;index++){const start=html.indexOf('<figure class="ref-step-photo new-recipe-art-pending">',cursor);if(start<0)throw Error('Canonical step-art slot missing: '+index);const close=html.indexOf('</figure>',start);if(close<0)throw Error('Canonical step-art slot is unclosed: '+index);const end=close+'</figure>'.length,step=steps[index],asset=step.image?.path||step.art||step.image;if(!asset)throw Error('Pinned international step illustration missing: '+index);const title=String(step.title||'Step '+(index+1));const figure='<figure class="ref-step-photo v32-international-step-art"><img src="'+safe(V32_INTL_ROOT+asset)+'" alt="'+safe(title)+'" loading="eager" decoding="async"><figcaption data-original-source="recipe-step">'+safe(title)+'</figcaption></figure>';html=html.slice(0,start)+figure+html.slice(end);cursor=start+figure.length;}if(html.indexOf('<figure class="ref-step-photo new-recipe-art-pending">',cursor)>=0)throw Error('Unexpected extra pending international step-art slot');return html;}
function v32RenderCompactInternationalIngredients(html,r){for(let i=0;i<(r.compactIngredients||[]).length;i++){const token='data-check="'+i+'"',at=html.indexOf(token),start=html.lastIndexOf('<label class="ref-ingredient ',at),close=html.indexOf('</label>',at);if(at<0||start<0||close<0)throw Error('International ingredient card missing: '+i);const end=close+'</label>'.length,x=r.compactIngredients[i],source='<span>'+safe(r.ingredients[i])+'</span>';let row=html.slice(start,end);if(!row.includes(source))throw Error('International ingredient source mismatch: '+i);row=row.replace(source,'<span class="v32-ingredient-label"><b>'+safe(x.shortName)+'</b><small>'+safe(x.amount)+'</small></span>');row=row.replace('<input type="checkbox" data-check="'+i+'"','<input type="checkbox" data-check="'+i+'" aria-label="'+safe(x.accessibleLabel)+'"');html=html.slice(0,start)+row+html.slice(end);}return html;}
const v32NutritionResultsBeforeInternational=nutritionResults;
nutritionResults=function(r){if(!r.internationalNutrition)return v32NutritionResultsBeforeInternational(r);const pt=state.language==='pt-BR',per=r.internationalNutrition.perServing||{},n=Number(r.servings)||1,cols=[['kcal',pt?'Energia':'Energy','kcal',0],['proteinG',pt?'Proteína':'Protein','g',1],['carbohydrateG',pt?'Carboidratos':'Carbohydrate','g',1],['saturatedFatG',pt?'Gordura saturada':'Saturated fat','g',1],['totalFatG',pt?'Gordura':'Fat','g',1],['fiberG',pt?'Fibras':'Fibre','g',1],['sugarG',pt?'Açúcares':'Sugars','g',1],['sodiumMg',pt?'Sódio':'Sodium','mg',0]],val=(k,d,m=1)=>per[k]!==null&&per[k]!==undefined&&Number.isFinite(Number(per[k]))?formatNutrient(Number(per[k])*m,d)+' '+cols.find(x=>x[0]===k)[2]:(pt?'Indisponível':'Unavailable');return '<div class="nutrition-status needs-weights" role="status"><strong>'+(pt?'Estimativa · revisão pendente':'Estimate · review pending')+'</strong></div><table class="nutrition-table"><caption>'+(pt?'Estimativa nutricional':'Estimated nutrition')+'</caption><thead><tr><th>'+(pt?'Nutriente':'Nutrient')+'</th><th>'+(pt?'Por porção':'Per serving')+'</th><th>'+(pt?'Receita inteira':'Whole recipe')+'</th></tr></thead><tbody>'+cols.map(([k,l,u,d])=>'<tr><th>'+l+'</th><td>'+val(k,d)+'</td><td>'+val(k,d,n)+'</td></tr>').join('')+'</tbody></table>';};
const v32NutritionPanelBeforeInternational=nutritionPanel;
nutritionPanel=function(r){if(!r.internationalNutrition)return v32NutritionPanelBeforeInternational(r);const pt=state.language==='pt-BR',n=r.internationalNutrition,s=(n.sources||[]).map(x=>'<li>'+safe(x.source||'Food composition record')+(x.food?': '+safe(x.food):'')+(x.fdcId?' · FDC '+x.fdcId:'')+(x.url?' · <a href="'+safe(x.url)+'" target="_blank" rel="noopener">'+(pt?'Abrir fonte':'Open source')+'</a>':'')+'</li>').join('');return '<section class="health-card nutrition-card"><h2>🍓 '+(pt?'Nutrição desta receita':'Nutrition for this recipe')+'</h2><div class="nutrition-results">'+nutritionResults(r)+'</div><details><summary>'+(pt?'Responsáveis: método e fontes':'Adults: method and sources')+'</summary><p>'+safe(n.calculationMethod||n.method||'')+'. '+safe(n.basis||'')+'</p>'+(s?'<ul>'+s+'</ul>':'')+'</details></section>';};
const v32RecipeAllergensBeforeInternational=recipeAllergens;
recipeAllergens=function(r){const a=v32RecipeAllergensBeforeInternational(r);if(Number(r.id)<96)return a;const pt=state.language==='pt-BR',entry=V32_INTL_BY_ID.get(Number(r.id)),items=entry?.item.locales[pt?'pt-BR':'en-GB'].ingredients||[];for(const raw of r.declaredAllergens||[]){const k=String(raw).toLowerCase(),name=/wheat|gluten/.test(k)?'Wheat':/egg/.test(k)?'Eggs':/soy/.test(k)?'Soy':/sesame/.test(k)?'Sesame':/milk|dairy/.test(k)?'Milk':/peanut/.test(k)?'Peanuts':/tree nut|almond|hazelnut|cashew|walnut/.test(k)?'Tree nuts':/fish/.test(k)?'Fish':/shellfish|prawn|shrimp|crab/.test(k)?'Crustacean shellfish':null;if(name&&!a.confirmed.some(x=>x.name===name)){const found=items.filter(x=>(x.allergens||[]).some(y=>String(y).toLowerCase()===k)).map(x=>x.name);a.confirmed.push({name,ingredients:found.length?found:[pt?'Declarado pela receita: '+raw:'Declared by recipe source: '+raw]});}}return a;};
const v32AllergyPanelBeforeInternational=allergyPanel;
allergyPanel=function(r){const html=v32AllergyPanelBeforeInternational(r);if(Number(r.id)<96||!r.crossContact)return html;const pt=state.language==='pt-BR';return html.replace('</details></section>','<p><b>'+(pt?'Contato cruzado':'Cross-contact')+':</b> '+safe(r.crossContact)+'</p></details></section>');};
const v32FamilyTeamMarkupBeforeInternational=familyTeamMarkup;
familyTeamMarkup=function(r,i){const g=Number(r.id)>=96?STEP_GUIDES[r.id]?.[i]:null;if(g?.adultAssist){const pt=state.language==='pt-BR';return '<div class="family-team-plan v32-step-adult-assist" role="note"><strong>🛡️ '+(pt?'Ajuda de um adulto':'Adult help')+'</strong><p>'+safe(g.adultAssist)+'</p>'+(g.safety?'<p class="v32-step-safety"><b>'+(pt?'Segurança':'Safety')+':</b> '+safe(g.safety)+'</p>':'')+'</div>';}return v32FamilyTeamMarkupBeforeInternational(r,i);};
if(typeof document!=='undefined'&&!document.getElementById('v32-intl-parity-style'))document.head.insertAdjacentHTML('beforeend','<style id="v32-intl-parity-style">.app.v32-international-active .ref-ingredient-grid{grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:6px!important}.app.v32-international-active .ref-ingredient{box-sizing:border-box!important;display:grid!important;grid-template-columns:30px minmax(0,1fr)!important;grid-template-rows:minmax(0,1fr)!important;align-items:center!important;gap:3px 5px!important;min-width:0!important;min-height:82px!important;height:auto!important;padding:19px 5px 6px!important;overflow:hidden!important;font-size:11px!important;line-height:1.2!important}.app.v32-international-active .ref-ingredient-icon{grid-column:1!important;grid-row:1!important;width:28px!important;height:28px!important;min-width:28px!important;max-width:28px!important;overflow:hidden!important}.app.v32-international-active .ref-ingredient-icon .kitchen-icon{width:28px!important;height:26px!important;max-width:100%!important}.app.v32-international-active .v32-ingredient-label{grid-column:2!important;grid-row:1!important;display:flex!important;min-width:0!important;max-width:100%!important;flex-direction:column!important;gap:2px!important;overflow:hidden!important;overflow-wrap:anywhere!important}.app.v32-international-active .v32-ingredient-label b{font-size:11px!important;line-height:1.18!important;overflow-wrap:anywhere!important}.app.v32-international-active .v32-ingredient-label small{font-size:10px!important;line-height:1.15!important;white-space:normal!important}.app.v32-international-active .ref-ingredient input[type=checkbox]{position:absolute!important;top:3px!important;right:3px!important;width:22px!important;height:22px!important;min-width:22px!important;min-height:22px!important;margin:0!important}.app.v32-international-active .ref-ingredient>i{display:none!important}.app.v32-international-active .ref-tool-grid{grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:5px!important}.app.v32-international-active .ref-tool{min-width:0!important;min-height:66px!important;padding:4px 2px!important}.app.v32-international-active .ref-tool .kitchen-icon{width:38px!important;height:34px!important;max-width:100%!important;object-fit:contain!important}.app.v32-international-active .ref-tool small{font-size:10px!important;line-height:1.2!important}.app.v32-international-active .ref-tool .v32-tool-role{font-size:9px!important;color:#654878!important}.app.v32-international-active .ref-step-grid{display:grid!important;grid-template-columns:minmax(0,1fr)!important;gap:0!important}.app.v32-international-active .ref-step-card,.app.v32-international-active .ref-step-card.active{box-sizing:border-box!important;display:grid!important;grid-template-columns:minmax(0,1fr)!important;gap:12px!important;width:100%!important;min-width:0!important;max-width:100%!important;padding:14px!important;transform:none!important}.app.v32-international-active .ref-step-card:not(.active){display:none!important}.app.v32-international-active .ref-step-card.active .ref-step-title{grid-column:1/-1!important;min-width:0!important}.app.v32-international-active .ref-step-photo.v32-international-step-art{display:flex;flex-direction:column;justify-content:center;align-self:center;width:100%;max-width:min(100%,560px);height:clamp(220px,42dvh,420px);margin:0 auto;overflow:hidden}.app.v32-international-active .ref-step-photo.v32-international-step-art img{display:block;width:100%;height:100%;max-width:100%;object-fit:contain}.app.v32-international-active .ref-step-copy{min-width:0!important;max-width:100%!important;overflow-wrap:anywhere}.app.v32-international-active .family-team-plan{grid-column:1/-1!important;min-width:0!important;max-width:100%!important;overflow-wrap:anywhere}@media(orientation:landscape){.app.v32-international-active .ref-step-card.active{grid-template-columns:minmax(0,1.2fr) minmax(260px,.8fr)!important;align-items:start!important}.app.v32-international-active .ref-step-card.active .ref-step-title{grid-column:1/-1!important}.app.v32-international-active .ref-step-card.active .ref-step-photo.v32-international-step-art{grid-column:1!important;grid-row:2/span 2!important;width:100%!important;height:min(60dvh,420px)!important;max-width:100%!important;margin:0!important;align-self:start!important}.app.v32-international-active .ref-step-card.active .ref-step-copy{grid-column:2!important;grid-row:2!important;align-self:start!important;display:flex!important;align-items:flex-start!important}.app.v32-international-active .ref-step-card.active .family-team-plan{grid-column:2!important;grid-row:3!important}.app.v32-international-active .ref-step-card.active .ref-step-copy p{font-size:clamp(14px,2.2vh,18px)!important;line-height:1.45!important}}.app.v32-international-active .nutrition-table td{white-space:normal;font-variant-numeric:tabular-nums}</style>');
if(typeof document!=='undefined'&&!document.getElementById('v32-magic-prep-board-style'))document.head.insertAdjacentHTML('beforeend','<style id="v32-magic-prep-board-style">.app .ref-tool-grid{display:flex!important;flex-wrap:wrap!important;align-items:center!important;gap:7px!important}.app .ref-tool{display:contents!important}.app .v32-equipment-chip,.app .v32-r12-equipment-list li{display:inline-flex!important;align-items:center!important;justify-content:center!important;max-width:100%!important;min-height:36px!important;box-sizing:border-box!important;padding:7px 12px!important;border:1px solid #e8d6ef!important;border-radius:999px!important;background:#fff2f8!important;color:#50345f!important;font-size:12px!important;font-weight:850!important;line-height:1.2!important;text-align:center!important;overflow-wrap:anywhere!important}.app .ref-tool:nth-child(4n+2) .v32-equipment-chip,.app .v32-r12-equipment-list li:nth-child(4n+2){background:#f1edff!important;border-color:#ddd3fb!important}.app .ref-tool:nth-child(4n+3) .v32-equipment-chip,.app .v32-r12-equipment-list li:nth-child(4n+3){background:#eaf8ff!important;border-color:#d0ebf7!important}.app .ref-tool:nth-child(4n+4) .v32-equipment-chip,.app .v32-r12-equipment-list li:nth-child(4n+4){background:#f1f8e8!important;border-color:#dcedc9!important}.app .ref-tool .v32-tool-role{display:block!important;flex-basis:100%!important;width:100%!important;margin:-4px 0 1px!important;color:#654878!important;font-size:10px!important;line-height:1.2!important;text-align:center!important}.app .v32-r12-equipment-list{display:flex!important;flex-wrap:wrap!important;align-items:center!important;gap:7px!important;margin:0!important;padding:0!important;list-style:none!important}.app .v32-r12-equipment-list li{gap:0!important;min-width:0!important;min-height:36px!important}.app .v32-r12-equipment-list li>span{display:none!important}.app .v32-r12-equipment-list li small{font-size:12px!important;line-height:1.2!important}.app.v32-international-active .ref-tool-grid{display:flex!important;flex-wrap:wrap!important;gap:7px!important}.app.v32-international-active .ref-tool{display:flex!important;flex-direction:column!important;align-items:center!important;gap:5px!important;padding:0!important;border:0!important;background:transparent!important;min-height:0!important}</style>');
function v32ApplyMagicPrepBoard(){
 const root=document.querySelector('#screen');if(!root)return;
 for(const card of root.querySelectorAll('.ref-tool-grid .ref-tool')){
  if(card.querySelector('.v32-equipment-chip'))continue;
  const label=card.querySelector('small:not(.v32-tool-role)')||card.querySelector('small');
  const name=String(label?.textContent||'').trim();if(!name)continue;
  const role=String(card.querySelector('.v32-tool-role')?.textContent||'').trim();
  card.replaceChildren(Object.assign(document.createElement('span'),{className:'v32-equipment-chip',textContent:name}));
  if(role){const safety=document.createElement('small');safety.className='v32-tool-role';safety.textContent=role;card.append(safety);}
 }
 for(const item of root.querySelectorAll('.v32-r12-equipment-list li')){
  if(item.querySelector('.v32-equipment-chip'))continue;
  const label=String(item.querySelector('small')?.textContent||'').trim();if(!label)continue;
  item.classList.add('v32-equipment-chip');item.replaceChildren(document.createTextNode(label));
 }
}
if(typeof document!=='undefined'&&!document.getElementById('v32-home-carousel-style'))document.head.insertAdjacentHTML('beforeend','<style id="v32-home-carousel-style">.app .v32-new-recipes-grid{display:flex!important;flex-wrap:nowrap!important;grid-template-columns:none!important;gap:12px!important;width:100%!important;max-width:100%!important;overflow-x:auto!important;overflow-y:hidden!important;padding:4px 3px 12px!important;scroll-snap-type:x mandatory;overscroll-behavior-x:contain;-webkit-overflow-scrolling:touch;scrollbar-width:thin}.app .v32-new-recipe-card{position:relative!important;display:grid!important;flex:0 0 clamp(176px,28vw,224px)!important;grid-template-columns:minmax(0,1fr)!important;grid-template-rows:108px auto auto!important;align-content:start!important;gap:6px!important;width:clamp(176px,28vw,224px)!important;min-width:0!important;max-width:none!important;height:auto!important;min-height:0!important;max-height:190px!important;padding:9px!important;overflow:hidden!important;border-radius:18px!important;scroll-snap-align:start!important;text-align:left!important}.app .v32-new-recipe-card img{display:block!important;width:100%!important;height:108px!important;min-height:108px!important;max-height:108px!important;object-fit:cover!important;border-radius:12px!important}.app .v32-new-recipe-card .v32-new-recipe-badge{position:absolute!important;top:14px!important;left:14px!important;z-index:1!important;padding:4px 8px!important;border-radius:999px!important;background:#fff8e8!important;color:#603d91!important;font-size:10px!important;font-weight:1000!important;line-height:1.1!important;letter-spacing:.35px!important}.app .v32-new-recipe-card strong{min-width:0!important;font-size:clamp(13px,1.8vw,16px)!important;line-height:1.2!important;display:-webkit-box!important;-webkit-box-orient:vertical!important;-webkit-line-clamp:2!important;overflow:hidden!important;overflow-wrap:anywhere!important;white-space:normal!important;text-overflow:clip!important}.app .v32-new-recipe-card small{display:block!important;margin:0!important;font-size:11px!important;line-height:1.15!important}.app .v32-new-recipes-grid:focus-visible{outline:3px solid #47317b;outline-offset:3px}@media(max-width:520px){.app .v32-new-recipe-card{flex-basis:176px!important;width:176px!important}}@media(orientation:landscape){.app .v32-new-recipe-card{flex-basis:clamp(170px,22vw,210px)!important;width:clamp(170px,22vw,210px)!important}}</style>');

home=function v31ApprovedHome(){
 const pt=state.language==='pt-BR',stats=homeStats();
 const featured=find(12);
 const currentReviewFeatured=V32_REVIEW_FEATURED_IDS.map(find).filter(Boolean);
 const featuredMarkup=currentReviewFeatured.length?`<section class="v31-featured-section v32-review-featured-section"><div class="v31-section-title"><div><h2>⭐ ${pt?'Receitas em destaque':'Featured Recipes'}</h2><p>${pt?'Prontas para revisão do responsável':'Ready for owner review'}</p></div><button class="text-link" data-nav="library">${pt?'Ver todas':'See all'} →</button></div><div class="v32-review-featured-rail" role="group" aria-label="${pt?'Receitas em destaque desta revisão':'Featured recipes in this review'}" data-v32-featured-ids="${currentReviewFeatured.map(recipe=>recipe.id).join(',')}">${currentReviewFeatured.map(recipe=>{const description=v32ReviewFeaturedDescription(recipe,pt);return `<button class="v31-featured-card v32-review-featured-card" data-open="${recipe.id}" data-v32-review-featured-id="${recipe.id}" aria-label="${safe(pt?(PT_RECIPES[recipe.id]?.title||recipe.title):recipe.title)}"><span class="v31-featured-art">${homeDishThumb(recipe)}</span><span class="v31-featured-copy"><span class="v31-featured-kicker">${pt?'PRONTA PARA REVISÃO':'READY FOR REVIEW'}</span><strong>${safe(pt?(PT_RECIPES[recipe.id]?.title||recipe.title):recipe.title)}</strong>${description?`<small>${safe(description)}</small>`:''}<span class="v31-featured-meta">◷ ${safe(recipe.time||'')}　♧ ${pt?'Rende':'Makes'} ${safe(recipe.yieldText||'')}</span></span></button>`}).join('')}</div></section>`:'';
 const countries=['IND'].map(code=>V31_DESTINATION_BY_ISO[code]).filter(Boolean);
 const headline=pt?'O que vamos cozinhar hoje?':'What shall we cook today?';
 return `<section class="v31-approved-home" aria-label="${pt?'Cozinha mágica da Aaria':'Aaria’s Magical Kitchen'}">
  <header class="v31-approved-header"><img class="v31-brand-lockup" src="${V31_HOME_WORLD_ART.brand}" alt="Aaria’s Magical Kitchen"><button type="button" class="v31-header-greeting" data-v3-profile-open aria-label="${pt?'Trocar perfil da cozinha':'Switch kitchen profile'}"><span><strong>${pt?'Oi, Aaria!':'Hi Aaria!'}</strong><small>${pt?'Pronta para uma aventura saborosa?':'Ready for a tasty adventure?'}</small></span></button><button class="v3-settings" data-nav="settings" aria-label="${pt?'Configurações':'Settings'}">⚙️</button></header>
  <section class="v31-reference-hero" style="--v31-kitchen:url('${V31_HOME_WORLD_ART.kitchen}')"><div class="v31-hero-welcome"><h1>${headline}</h1><span aria-hidden="true">♥</span></div></section>
  <nav class="v31-action-tiles" aria-label="${pt?'Aventuras da cozinha':'Kitchen adventures'}"><button class="v31-action-tile v31-tile-cook" data-nav="library"><span>♨️</span><strong>${pt?'Vamos cozinhar!':'Let’s Cook!'}</strong><small>${pt?'Explore todas as receitas':'Explore all recipes'}</small></button><button class="v31-action-tile v31-tile-world" data-v31-open-world><span>🌍</span><strong>${pt?'Aventura pelo mundo':'World Adventure'}</strong><small>${pt?'Cozinhe ao redor do mundo':'Cook around the world'}</small></button><button class="v31-action-tile v31-tile-surprise" data-action="open-wheel"><span>🎲</span><strong>${pt?'Surpresa!':'Surprise Me!'}</strong><small>${pt?'Encontre uma receita':'Find a random recipe'}</small></button><button class="v31-action-tile v31-tile-planner" data-nav="week"><span>▦</span><strong>${pt?'Meu planejador':'My Planner'}</strong><small>${pt?'Planeje sua semana saborosa':'Plan your tasty week'}</small></button></nav>
  ${V32_INTERNATIONAL_RECIPES.length?'<section class="v32-new-recipes"><div class="v31-section-title"><div><h2>✨ '+(pt?'Novas receitas':'New Recipes')+'</h2><p>'+(pt?'Receitas internacionais ilustradas.':'Illustrated international recipes.')+'</p></div><button class="text-link" data-nav="library">'+(pt?'Ver todas':'See all')+' →</button></div><div class="v32-new-recipes-grid" role="group" tabindex="0" aria-label="'+(pt?'Novas receitas internacionais':'New international recipes')+'">'+V32_INTERNATIONAL_RECIPES.map(item=>{const id=Number(item.id),r=RECIPES.find(x=>Number(x.id)===id),title=pt?(PT_RECIPES[id]?.title||r.title):r.title;return '<button class="home-tile v31-pinterest-tile v32-new-recipe-card" data-open="'+id+'" aria-label="'+safe(title)+' — '+(pt?'Nova receita':'New recipe')+'"><img src="'+(NEW_RECIPE_ART[id]?.dish||'')+'" alt=""><span class="v32-new-recipe-badge">'+(pt?'NOVA':'NEW')+'</span><strong>'+safe(title)+'</strong><small>'+safe(r.country)+'</small></button>'}).join('')+'</div></section>':''}
  ${featuredMarkup||`<section class="v31-featured-section"><div class="v31-section-title"><h2>⭐ ${pt?'Receita em destaque':'Featured Recipe'}</h2><button class="text-link" data-nav="library">${pt?'Ver todas':'See all'} →</button></div><button class="v31-featured-card" data-open="${featured.id}"><span class="v31-featured-art">${homeDishThumb(featured)}</span><span class="v31-featured-copy"><span class="v31-featured-kicker">${pt?'FÁCIL E DIVERTIDA':'EASY & FUN'}</span><strong>${safe(pt?(PT_RECIPES[featured.id]?.title||featured.title):featured.title)}</strong><small>${safe((pt?(PT_RECIPES[featured.id]?.description||featured.description):featured.description)||(pt?'Uma receita gostosa para preparar juntos.':'A tasty recipe to make together.'))}</small><span class="v31-featured-meta">◷ ${safe(featured.time||'15 min')}　 ♧ ${pt?'Fácil':'Easy'}　 ♧ ${pt?'Porções':'Serves'} ${safe(featured.servings||'2')}</span></span><span class="v31-featured-heart" aria-hidden="true">♡</span></button></section>`}
  <section class="v31-world-shelf"><div class="v31-section-title"><div><h2>🌍 ${pt?'Aventura de comida pelo mundo':'World Food Adventures'}</h2><p>${pt?'Descubra pratos deliciosos de todo o mundo!':'Discover delicious dishes from around the world!'}</p></div><button class="text-link" data-v31-open-world>${pt?'Explorar mapa':'Explore the map'} →</button></div><div class="v31-destination-rail">${countries.map((c,i)=>{const id=c.code==='IND'?51:null,r=id?find(id):null;const recipeTitle=r?(pt?(PT_RECIPES[id]?.title||r.title):r.title):(pt?'Novas receitas em revisão':'New recipes under review');return `<button class="v31-destination-tile${i===0?' is-featured':''}" data-v31-card-country="${c.code}"><span class="v31-destination-art v31-country-${c.code.toLowerCase()}"><img src="${V31_HOME_WORLD_ART.destinations[c.code]}" alt="" loading="lazy" decoding="async">${i===0?'<i aria-hidden="true">✦</i>':''}</span><strong>${pt?c.pt:c.en}</strong><small>${safe(recipeTitle)}</small></button>`}).join('')}</div></section>
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
const V31_WORLD_DESTINATIONS=[{code:'IND',iso:'IND',en:'India',pt:'Índia',flag:'🇮🇳',factEn:'Explore the original Indian recipes in Aaria’s kitchen.',factPt:'Explore as receitas indianas originais da cozinha da Aaria.',reviewStatus:'approved-reference'}];
const V31_DESTINATION_BY_ISO=Object.fromEntries(V31_WORLD_DESTINATIONS.map(x=>[x.code,x]));
let v31SelectedCountry='IND',v31MapPanel='';
window.v34EnterGlobeFirst=function(fromNav){
 // Every World action is a fresh entry: clear the country sheet, country selection,
 // and the controller snapshot before rendering, including taps while already on World.
 v31SelectedCountry=null;v31MapPanel='';window.v31WorldOpenedFromNav=Boolean(fromNav);window.v31WorldOpenerIndex=0;window.v34SuppressCountryRestore=true;
 if(v33GlobeController){v33GlobeController.destroy();v33GlobeController=null}
 v33GlobeState=null;v33WorldHost=null;
 history.replaceState({},'',location.hash||'#aria/world');goto('world')
};
let v33GlobeController=null,v33GlobeState=null,v33WorldHost=null,v33SpinHintDismissed=false;
function v33FinishedDishSource(recipe){try{const html=homeDishThumb(recipe),src=html.match(/<img\b[^>]*\bsrc=["']([^"']+)["']/i)?.[1]||'';return src.startsWith('data:image/')?src:''}catch{return ''}}
function v33WorldCatalogue(){
 const getLocalizedRecipe=(recipe,locale)=>{const pt=PT_RECIPES[recipe.id]||{};return {title:locale==='pt-BR'?(pt.title||''):recipe.title,description:locale==='pt-BR'?(pt.description||''):recipe.description,finishedDish:v33FinishedDishSource(recipe)}};
 return createWorldAdventureHost({canonicalRecipes:RECIPES,locale:state.language==='pt-BR'?'pt-BR':'en-GB',passportSnapshot:{worldStamps:state.worldStamps},getLocalizedRecipe,
  onOpenRecipe:id=>{v33GlobeState=v33GlobeController?.getState?.()||v33GlobeState;openRecipe(id);return true},
  onBack:scope=>{if(scope==='screen'){goto('home');return true}return false},onOpenPassport:()=>{v33ShowPassport();return true}});
}
function v33ShowPassport(){
 const screen=document.querySelector('#screen');if(!screen)return;screen.querySelector('.v33-passport-overlay')?.remove();
 const pt=state.language==='pt-BR',stamps=[...new Set((v33WorldHost?.getPassportSnapshot?.().stamps||[]))];
 const names={IND:pt?'Índia':'India',ITA:pt?'Itália':'Italy',CHN:'China',JPN:pt?'Japão':'Japan',MEX:pt?'México':'Mexico',VNM:pt?'Vietnã':'Vietnam'},flags={IND:'🇮🇳',ITA:'🇮🇹',CHN:'🇨🇳',JPN:'🇯🇵',MEX:'🇲🇽',VNM:'🇻🇳'};
 const count=pt?`${stamps.length} selo${stamps.length===1?'':'s'} ganho${stamps.length===1?'':'s'}`:`${stamps.length} stamp${stamps.length===1?'':'s'} earned`;
 screen.insertAdjacentHTML('beforeend',`<div class="v33-passport-overlay"><section class="w02-map-sheet w02-passport-sheet" role="dialog" aria-modal="true" aria-labelledby="v33-passport-title"><button class="w02-sheet-close" type="button" data-v33-passport-close aria-label="${pt?'Fechar passaporte culinário':'Close Food Passport'}">×</button><div class="w02-sheet-heading"><span aria-hidden="true">📔</span><div><small>${pt?'PASSAPORTE CULINÁRIO':'FOOD PASSPORT'}</small><h2 id="v33-passport-title" tabindex="-1">${pt?'Meu passaporte culinário':'My Food Passport'}</h2><p>${count} · ${pt?'selos aparecem após concluir uma receita aprovada.':'stamps are earned after completing an approved recipe.'}</p></div></div>${stamps.length?`<div class="w02-passport-stamps">${stamps.map(code=>`<span class="v31-stamp">${flags[code]||'⭐'} ${names[code]||code}</span>`).join('')}</div>`:`<p class="w02-passport-empty">${pt?'Conclua uma receita aprovada para ganhar seu primeiro selo.':'Complete an approved recipe to earn your first stamp.'}</p>`}</section></div>`);
 screen.querySelector('#v33-passport-title')?.focus({preventScroll:true});
}
function v33KeepFlagsInsideSphere(host){
 const sphere=host.querySelector('.aria-world-globe__sphere'),flags=host.querySelector('.aria-world-globe__flags');
 if(!sphere||!flags)return {fit:()=>{},dispose:()=>{}};
 const fit=()=>{const b=sphere.getBoundingClientRect(),cx=b.left+b.width/2,cy=b.top+b.height/2,r=Math.min(b.width,b.height)/2-2,r2=r*r;
  for(const flag of flags.querySelectorAll('.aria-world-globe__flag')){const q=flag.getBoundingClientRect(),corners=[[q.left,q.top],[q.right,q.top],[q.left,q.bottom],[q.right,q.bottom]];if(corners.some(([x,y])=>(x-cx)*(x-cx)+(y-cy)*(y-cy)>r2))flag.remove()}
 };
 const schedule=()=>requestAnimationFrame(fit),observer=new MutationObserver(schedule),resizer=new ResizeObserver(schedule);
 observer.observe(flags,{childList:true});resizer.observe(sphere);fit();
 return {fit,dispose:()=>{observer.disconnect();resizer.disconnect()}};
}
function v33MountGlobe(screen){
 if(v33GlobeController){v33GlobeState=v33GlobeController.getState();v33GlobeController.destroy()}v33GlobeController=null;v33WorldHost=v33WorldCatalogue();
 screen.innerHTML='<div id="v33-world-globe-host" class="v33-world-globe-host"></div>';
 const host=screen.querySelector('#v33-world-globe-host'),moduleController=window.AariaWorldAdventureGlobe.mount(host,{...v33WorldHost,avatarSrc:V33_WORLD_ARTWORK.pointingAaria},v33GlobeState||{rotation:-78}),flagFit=v33KeepFlagsInsideSphere(host);
 const stage=host.querySelector('.aria-world-globe__stage'),guideHand=host.querySelector('.aria-world-globe__guide').cloneNode(),magic=document.createElement('div');
 guideHand.className='aria-world-globe__guide-hand';guideHand.alt='';guideHand.setAttribute('aria-hidden','true');stage.append(guideHand);
 const sparkle=document.createElement('img');sparkle.className='v33-globe-sparkle-trail';sparkle.src=V33_WORLD_ARTWORK.sparkleTrail;sparkle.alt='';sparkle.setAttribute('aria-hidden','true');stage.append(sparkle);
 const spinHint=document.createElement('div');spinHint.className='v33-spin-hint';spinHint.setAttribute('role','note');
 spinHint.innerHTML='<svg class="v33-spin-arrows" viewBox="0 0 160 42" aria-hidden="true" focusable="false"><path d="M8 31C23 8 53 5 75 19"/><path d="m67 10 10 10-14 2"/><path d="M152 11c-15 23-45 26-67 12"/><path d="m93 32-10-10 14-2"/></svg><span></span>';
 spinHint.querySelector('span').textContent=state.language==='pt-BR'?'Deslize para girar o globo!':'Swipe to spin the globe!';
 if(v33SpinHintDismissed)stage.classList.add('has-user-spun');stage.append(spinHint);
 let spinStartRotation=null;
 stage.addEventListener('pointerdown',event=>{if(event.target.closest('button'))return;spinStartRotation=moduleController.serialize().rotation;});
 stage.addEventListener('pointerup',()=>{if(spinStartRotation===null)return;const rotated=Math.abs(moduleController.serialize().rotation-spinStartRotation);spinStartRotation=null;if(rotated>=8){v33SpinHintDismissed=true;stage.classList.add('has-user-spun');}});
 stage.addEventListener('pointercancel',()=>{spinStartRotation=null;});
 magic.className='v33-globe-magic-decor';magic.setAttribute('aria-hidden','true');
 magic.innerHTML='<span class="v33-globe-magic-star">✦</span><span class="v33-globe-magic-star">✧</span><span class="v33-globe-magic-star">✦</span><span class="v33-globe-magic-star">✷</span><span class="v33-globe-magic-star">✧</span><span class="v33-globe-magic-star">✦</span><span class="v33-globe-magic-star">✷</span><span class="v33-globe-magic-star">✧</span><span class="v33-globe-magic-particle"></span><span class="v33-globe-magic-particle"></span><span class="v33-globe-magic-particle"></span><span class="v33-globe-magic-particle"></span><span class="v33-globe-magic-particle"></span><span class="v33-globe-magic-particle"></span>';
 stage.append(magic);
 let idleMotionAt=performance.now();
 const idleMotion=setInterval(()=>{
  const now=performance.now(),elapsed=Math.min(800,Math.max(0,now-idleMotionAt));idleMotionAt=now;
  if(matchMedia('(prefers-reduced-motion: reduce)').matches||document.visibilityState==='hidden'||stage.classList.contains('is-dragging'))return;
  const current=moduleController.serialize();if(current.selected||current.pending)return;
  // Reuse the immutable W03 restore API so the Natural Earth projection and
  // country flags advance together; four updates per second keep CPU modest.
  moduleController.restore({...current,rotation:current.rotation+elapsed*.002});flagFit.fit();
 },250);
 // Keep the W03 module source immutable while preserving W02's existing app
 // lifecycle hooks and ensuring every rendered country control remains a
 // 48px minimum Android touch target at the globe's farthest visible depth.
 v33GlobeController={
  getState:()=>moduleController.serialize(),
  destroy:()=>{clearInterval(idleMotion);magic.remove();flagFit.dispose();moduleController.dispose()},
  handleBack:()=>moduleController.handleBack(),
  refresh:()=>moduleController.refresh(),
  setOrientation:value=>moduleController.setOrientation(value)
 };
}
let v31WorldPage;
v31WorldPage=function v33FixedWorldMapPage(){
 const pt=state.language==='pt-BR';
 state.worldStamps=Array.isArray(state.worldStamps)?state.worldStamps:[];
 // India is the only destination backed by validated canonical recipe links.
 // Preserve profile data, but do not display stamps for unvalidated countries.
 const stamps=state.worldStamps.filter(code=>code==='IND');
 const countLabel=pt?`${stamps.length} selo${stamps.length===1?'':'s'} ganho${stamps.length===1?'':'s'}`:`${stamps.length} stamp${stamps.length===1?'':'s'} earned`;
 const recipes=V31_APPROVED_INDIA_RECIPE_IDS.map(id=>find(id)).filter(Boolean);
 const countryCard=v31MapPanel==='country'?`<section class="w02-map-sheet w02-country-sheet" role="dialog" aria-labelledby="v33-country-title"><button class="w02-sheet-close" type="button" data-v31-panel-close aria-label="${pt?'Fechar receitas da Índia':'Close India recipes'}">×</button><div class="w02-sheet-heading"><span aria-hidden="true">🇮🇳</span><div><small>${pt?'RECEITAS ORIGINAIS APROVADAS':'APPROVED ORIGINAL RECIPES'}</small><h2 id="v33-country-title" tabindex="-1">${pt?'Índia':'India'}</h2><p>${pt?'Escolha uma receita para cozinhar.':'Choose a recipe to cook.'}</p></div></div><div class="w02-country-recipes" aria-label="${pt?'18 receitas canônicas da Índia':'18 canonical India recipes'}">${recipes.map(r=>`<button class="w02-recipe-card" type="button" data-v31-approved-recipe="${r.id}"><span class="w02-recipe-card-art">${homeDishThumb(r)}</span><span><strong>${safe(pt?(PT_RECIPES[r.id]?.title||r.title):r.title)}</strong><small>${safe(pt?(PT_RECIPES[r.id]?.description||r.description||''):r.description||'')}</small></span><b aria-hidden="true">→</b></button>`).join('')}</div></section>`:'';
 const passport=v31MapPanel==='passport'?`<section class="w02-map-sheet w02-passport-sheet" role="dialog" aria-labelledby="v33-passport-title"><button class="w02-sheet-close" type="button" data-v31-panel-close aria-label="${pt?'Fechar passaporte':'Close Food Passport'}">×</button><div class="w02-sheet-heading"><span aria-hidden="true">📔</span><div><small>${pt?'PASSAPORTE CULINÁRIO':'FOOD PASSPORT'}</small><h2 id="v33-passport-title" tabindex="-1">${pt?'Meu passaporte culinário':'My Food Passport'}</h2><p>${safe(countLabel)} · ${pt?'selos aparecem após concluir uma receita aprovada.':'stamps are earned after completing an approved recipe.'}</p></div></div>${stamps.length?`<div class="w02-passport-stamps">${stamps.map(()=>'<span class="v31-stamp">🇮🇳 India</span>').join('')}</div>`:`<p class="w02-passport-empty">${pt?'Conclua uma receita aprovada para ganhar seu primeiro selo.':'Complete an approved recipe to earn your first stamp.'}</p>`}</section>`:'';
 return `<section class="w02-fixed-map-page"><header class="w02-map-header"><button class="w02-map-back" type="button" data-v31-back aria-label="${pt?'Voltar para início':'Back home'}">←</button><h1 tabindex="-1">${pt?'Mapa do mundo':'World Map'}</h1><button type="button" class="w02-passport-button" data-v31-open-passport aria-label="${pt?'Abrir passaporte culinário':'Open Food Passport'}">📔 <span>${safe(countLabel)}</span></button></header><div class="w02-map-viewport" data-w02-fixed-map role="region" aria-label="${pt?'Mapa ilustrado offline para explorar, não para navegação':'Offline illustrated map for exploring, not navigation'}"><div class="w02-map-art"><img class="v31-map-art-image" alt="${pt?'Mapa ilustrado do mundo':'Illustrated world map'}"><button type="button" class="w02-country-marker" data-v31-country="IND" aria-label="${pt?'Índia: ver 18 receitas aprovadas':'India: view 18 approved recipes'}"><span aria-hidden="true">🇮🇳</span><strong>${pt?'Índia':'India'}</strong></button></div></div><p class="w02-map-caption">${pt?'Toque em Índia para ver as receitas.':'Tap India to see its recipes.'}</p>${countryCard}${passport}</section>`;
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
  const previousView=window.v31PreviousView||'home';
  const screen=document.querySelector('#screen');if(screen){screen.className='page v31-world-screen';v33MountGlobe(screen)}
  const app=document.querySelector('.app');app?.classList.remove('home-dashboard');app?.classList.add('v31-world-active');app?.classList.toggle('reduce-motion',!!state.reducedMotion);
  document.body.classList.remove('v3-screen-home');document.body.classList.add('v31-screen-world');document.querySelectorAll('.bottom .tab').forEach(b=>b.classList.toggle('active',b.dataset.nav==='world'));
  if(previousView!=='world')screen?.querySelector('.aria-world-globe__header h1')?.focus({preventScroll:true});
  window.v31PreviousView='world';
  return;
 }
 if(v33GlobeController){v33GlobeState=v33GlobeController.getState();v33GlobeController.destroy();v33GlobeController=null;v33WorldHost=null}
 window.v31PreviousView=view;
 v3BaseRender();
 // The base renderer appends the current page class while the world renderer
 // replaces the full className. Clear that route-only marker when returning to
 // Home or another non-World screen so the DOM state matches the active route.
 document.querySelector('#screen')?.classList.remove('v31-world-screen');
 if(view==='recipe')v32AddGroupRoleCopy();
 document.querySelector('.app')?.classList.remove('v31-world-active');document.body.classList.remove('v31-screen-world');
  if(view==='recipe'&&Number(selected?.id)!==12)v31AddAdultCookingCues();
 document.title=state.language==='pt-BR'?'Cozinha mágica da Aaria':'Aaria’s Magical Kitchen';
 document.body.classList.toggle('v3-screen-home',view==='home');
 if(view==='recipe'&&selected){const screen=document.querySelector('#screen');if(screen&&!screen.querySelector('.v3-quiz-card'))screen.insertAdjacentHTML('beforeend',v3QuizCard(selected));}
  v32ApplyRecipeThemes();
  document.querySelector('.app')?.classList.toggle('v32-recipe12-pilot-active',view==='recipe'&&Number(selected?.id)===12);
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
  if(window.AariaNative?.takeDishPhoto){if(!window.AariaNative.takeDishPhoto(String(id)))notice('Could not open the camera. Please try again.');return}
  document.querySelector(`[data-share-photo="${id}"][capture]`)?.click();return;
 }
});
document.addEventListener('click',e=>{
 if(e.target.closest?.('[data-v33-passport-close]')){document.querySelector('.v33-passport-overlay')?.remove();document.querySelector('.aria-world-globe__passport')?.focus({preventScroll:true});return}
  const target=e.target.closest('[data-v31-country]');
  if(target){v31SelectedCountry=target.dataset.v31Country;v31MapPanel='country';window.v34SuppressCountryRestore=false;history.pushState({v31Panel:'country'},'',location.hash);render();document.querySelector('#v33-country-title')?.focus({preventScroll:true});return}
 const button=e.target.closest('button');if(!button)return;
 if(button.dataset.v31ApprovedRecipe){v31MapPanel='';window.v34SuppressCountryRestore=true;history.replaceState({},'',location.hash);openRecipe(Number(button.dataset.v31ApprovedRecipe));return}
 if(button.hasAttribute('data-v31-passport-reset')){state.worldStamps=[];save();render();return}
  if(button.hasAttribute('data-v31-open-passport')){v31MapPanel='passport';history.pushState({v31Panel:'passport'},'',location.hash);render();document.querySelector('#v33-passport-title')?.focus({preventScroll:true});return}
  if(button.hasAttribute('data-v31-panel-close')){history.back();return}
 if(button.hasAttribute('data-v31-open-world')){window.v31WorldOpenedFromNav=false;window.v31WorldOpenerIndex=[...document.querySelectorAll('[data-v31-open-world]')].indexOf(button);goto('world');return}
  if(button.hasAttribute('data-v31-back')){v31MapPanel='';goto('home');if(window.v31WorldOpenedFromNav)document.querySelector('.bottom .tab[data-nav="world"]')?.focus({preventScroll:true});else{const openers=[...document.querySelectorAll('[data-v31-open-world]')];(openers[window.v31WorldOpenerIndex]||openers[0])?.focus({preventScroll:true})}window.v31WorldOpenedFromNav=false;return}
});
function v33CountryForCompletedRecipe(id){
 if(V31_APPROVED_INDIA_RECIPE_IDS.includes(Number(id)))return 'IND';
 const recipe=RECIPES.find(item=>Number(item.id)===Number(id)),meta=recipe?.worldAdventure;
 return meta?.validationStatus==='W01_VALIDATED'&&meta?.navigationStatus==='ACTIVE'&&['ITA','CHN','JPN','MEX','VNM'].includes(meta.countryCode)&&meta.bilingualStatus==='APPROVED'&&meta.artworkStatus==='APPROVED'&&meta.safetyStatus==='APPROVED'?meta.countryCode:null;
}
document.addEventListener('click',e=>{const button=e.target.closest('button[data-action="nextstep"].finish-step');if(!button||!selected||!state.done.includes(selected.id))return;const code=v33CountryForCompletedRecipe(selected.id);if(!code)return;state.worldStamps=Array.isArray(state.worldStamps)?state.worldStamps:[];if(!state.worldStamps.includes(code)){state.worldStamps.push(code);save()}});
document.addEventListener('backbutton',e=>{if(view!=='world')return;if(document.querySelector('.v33-passport-overlay')){document.querySelector('.v33-passport-overlay').remove();e.preventDefault();e.stopImmediatePropagation();return}if(v33GlobeController?.handleBack?.()){e.preventDefault();e.stopImmediatePropagation()}},true);
document.addEventListener('keydown',e=>{if(view!=='world'||!['Escape','Backspace','BrowserBack'].includes(e.key))return;if(document.querySelector('.v33-passport-overlay')){document.querySelector('.v33-passport-overlay').remove();e.preventDefault();e.stopImmediatePropagation();return}if(v33GlobeController?.handleBack?.()){e.preventDefault();e.stopImmediatePropagation()}},true);
window.addEventListener('popstate',e=>{
  // Recipe navigation changes the hash, but the prior history entry is the
  // country-card panel state at #aria/world. Restore that panel explicitly;
  // the base hash router intentionally does not know about the World route.
  if(e.state?.v31Panel==='country'&&location.hash==='#aria/world'&&!window.v34SuppressCountryRestore){
   view='world';v31MapPanel='country';e.preventDefault();e.stopImmediatePropagation();render();return;
  }
  // A subsequent Back from the country panel returns to the fixed map.
  if(view==='world'&&v31MapPanel){v31MapPanel='';e.preventDefault();e.stopImmediatePropagation();render()}
},true);

 window.addEventListener('hashchange',()=>{if(!location.hash&&view!=='home'){view='home';v31MapPanel='';render()}});
document.addEventListener('change',e=>{
 const input=e.target;if(input.matches('[data-v3-parent]')){state.parentContacts??={mommy:'',daddy:''};state.parentContacts[input.dataset.v3Parent]=input.value.trim();save();notice('Family contact saved on this device.');}
});
window.aariaHandleNativeDishPhoto=async(id,fileName)=>{
 try{
  if(!/^[a-f0-9-]{36}\.jpg$/i.test(String(fileName||'')))throw new Error('Invalid saved photo reference.');
  const photoUrl='https://appassets.androidplatform.net/dish-photo/'+encodeURIComponent(fileName);
  if(typeof window.v34SaveCreationPhoto==='function'){await window.v34SaveCreationPhoto(Number(id),photoUrl);return}
  const blob=await(await fetch(photoUrl)).blob();if(sharePostUrls[id])URL.revokeObjectURL(sharePostUrls[id]);shareSourcePhotos[id]=blob;const post=await makeCookPost(find(id),blob);sharePostBlobs[id]=post;sharePostUrls[id]=URL.createObjectURL(post);render();notice('Your cooking post is ready! 💖');
 }
 catch(e){console.error('Could not prepare the camera photo.',e);notice('Could not prepare that photo. Please try again.');}
};
window.aariaHandleNativeDishPhotoError=()=>notice('Could not open the camera. Please try again.');
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
  {title:'Bem-vinda à cozinha V3!',body:'Explore as '+RECIPES.length+' receitas. Escolha uma com um adulto, que pode conferir ingredientes e alergias.'},
  {title:'Planeje e brinque',body:'Sorteie uma receita, veja a semana mágica, ganhe estrelas, ou monte uma lista de compras. Peça a um adulto para revisar planos e mensagens.'},
  {title:'Faça do seu jeito',body:'Cada chef pode ter um perfil separado. Favoritos e progresso ficam naquele perfil. Você pode rever este passeio em Configurações.'}
 ]:[
  {title:'Welcome to your V3 kitchen!',body:'Explore all '+RECIPES.length+' recipes. Choose one with an adult, who can check ingredients and allergies.'},
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

// Issue #40 pilot: adapt only canonical recipe 12 to the owner's attached
// recipe-screen reference. All cooking content remains sourced from RECIPES and
// PT_RECIPES; health, checklist, progress, save, favourite and share behaviour
// continues to use the existing shared components and state.
const v32PilotRecipePresentation={12:{
 stepTitles:{en:['Mix the batter','Warm the pan','Cook the pancakes','Check and cool'],pt:['Misture a massa','Aqueça a frigideira','Cozinhe as panquequinhas','Confira e deixe esfriar']},
 methodIcons:['🥣','🍳','🥞','✓'],
 safety:{en:['Do not taste batter containing raw egg. Cook it fully before eating.','An adult operates the hob and handles the hot pan.','An adult operates the hob, cooks the pancakes and handles the hot pan.','Check that the centres are fully cooked. An adult handles the hot pan; let the pancakes cool before eating.'],pt:['Não prove a massa com ovo cru. Cozinhe-a completamente antes de comer.','Um adulto deve usar o fogão e manusear a frigideira quente.','Um adulto deve usar o fogão, cozinhar as panquequinhas e manusear a frigideira quente.','Confira se o centro está completamente cozido. Um adulto deve manusear a frigideira quente; deixe as panquequinhas esfriarem antes de comer.']},
 safetyTitles:{en:['Adult help needed','Adult help needed','Adult help needed','Adult help needed'],pt:['Ajuda de um adulto','Ajuda de um adulto','Ajuda de um adulto','Ajuda de um adulto']},
 method:{en:'Hob',pt:'Fogão'},
 time:{en:'2–3 min each side',pt:'2–3 min de cada lado'},
 yield:{en:'Makes 6 small pancakes',pt:'Rende 6 panquequinhas'},
 dishIcon:'🥞',
 equipment:{en:[['🥣','Mixing bowl'],['🥄','Spoon'],['🥄','Whisk'],['🍳','Non-stick pan'],['🥄','Spatula'],['♨️','Hob']],pt:[['🥣','Tigela'],['🥄','Colher'],['🥄','Batedor'],['🍳','Frigideira antiaderente'],['🥄','Espátula'],['♨️','Fogão']]}
}};
function v32ApplyRecipe12StepSafety(){
 const root=document.querySelector('#screen'),config=v32PilotRecipePresentation[12];if(!root||!config)return;
 const locale=state.language==='pt-BR'?'pt':'en',safety=config.safety?.[locale]||[],titles=config.safetyTitles?.[locale]||[],adultHelp=locale==='pt'?'Ajuda de um adulto':'Adult help needed';
 for(const card of root.querySelectorAll('.ref-step-card')){
  const copy=card.querySelector('.ref-step-copy'),number=Number(card.querySelector('.ref-step-number')?.textContent),index=Number.isInteger(number)?number-1:-1,text=safety[index];if(!copy||index<0||!String(text||'').trim())continue;
  let note=card.querySelector('.v32-r12-step-safety');if(!note){note=document.createElement('aside');note.className='v32-r12-safety v32-r12-step-safety';note.setAttribute('role','note');copy.insertAdjacentElement('afterend',note);}
  const label=titles[index]||adultHelp;note.setAttribute('aria-label',label);note.replaceChildren();const icon=document.createElement('span');icon.className='v32-r12-safety-icon';icon.setAttribute('aria-hidden','true');icon.textContent='!';const content=document.createElement('div'),heading=document.createElement('strong'),paragraph=document.createElement('p');heading.textContent=label;paragraph.setAttribute('data-original-source','recipe-safety');paragraph.textContent=text;content.append(heading,paragraph);note.append(icon,content);
  if(card.classList.contains('active')){
   const canonicalSafety=card.querySelector('.ref-safety details p');
   if(canonicalSafety)canonicalSafety.textContent=text;
  }
 }
}
if(typeof document!=='undefined'&&!document.getElementById('v32-r12-step-safety-style'))document.head.insertAdjacentHTML('beforeend','<style id="v32-r12-step-safety-style">.app .v32-r12-step-safety{box-sizing:border-box;display:flex;align-items:flex-start;gap:9px;min-width:0;max-width:100%;margin:0;padding:10px 12px;border:1px solid #efd9ac;border-radius:14px;background:#fff8e8;color:#543b59;overflow-wrap:anywhere}.app .v32-r12-step-safety .v32-r12-safety-icon{display:grid;flex:0 0 24px;place-items:center;width:24px;height:24px;border-radius:50%;background:#ffe9a8;color:#62431a;font-weight:1000}.app .v32-r12-step-safety>div{min-width:0}.app .v32-r12-step-safety strong{display:block;margin-bottom:3px;font-size:12px}.app .v32-r12-step-safety p{margin:0;font-size:12px;line-height:1.4}</style>');
function v32UniversalRecipeStepTemplate(r,config){
 const id=Number(r?.id),pt=state.language==='pt-BR',locale=pt?'pt':'en',ptRecord=PT_RECIPES[id];
 if(!r||!config||!Array.isArray(r.steps)||!r.steps.length)throw new Error('Canonical recipe step data or presentation contract is missing.');
 if(!ptRecord||ptRecord.steps?.length!==r.steps.length||ptRecord.ingredients?.length!==r.ingredients?.length)throw new Error('PT-BR recipe coverage is incomplete for recipe '+id+'.');
 if(!Array.isArray(config.safety?.[locale])||config.safety[locale].length!==r.steps.length||config.safety[locale].some(value=>!String(value).trim()))throw new Error('Per-step adult-safety contract is incomplete for recipe '+id+'.');
 const title=pt?(ptRecord.title||r.title):r.title,steps=pt?ptRecord.steps:r.steps,ingredients=pt?ptRecord.ingredients:r.ingredients;
 const stepIndex=Math.max(0,Math.min(r.steps.length-1,Number(step)||0)),finished=(state.done||[]).some(value=>Number(value)===id);
 const checks=state.checks[id]||[],favorite=(state.favorites||[]).some(value=>Number(value)===id),h=value=>safe(value);
 const method=config.method?.[locale]||r.method||'',time=config.time?.[locale]||r.time||'',makes=config.yield?.[locale]||r.yieldText||'';
 const dishImage=NEW_RECIPE_ART[id]?.dish||NEW_RECIPE_ART[id]?.hero||INLINE_DISH_PHOTOS[id]||HOME_RECIPE_THUMBS[id]||'';
 const chefAvatar=avatar('v32-r12-brand-avatar',id);
 const characterAvatar=avatar('v32-r12-character-avatar',id);
 const equipment=config.equipment?.[locale]||[];
 const quickActions=pt?[
  ['⌂','Início','nav','home'],['📖','Minhas receitas','nav','library'],['🎁','Surpresa!','action','open-wheel'],
  ['♥','Minhas favoritas','action','favorites'],['🗓️','Minha semana','nav','week'],['🛒','Lista de compras','action','groceries-choose']
 ]:[
  ['⌂','Home','nav','home'],['📖','My Recipes','nav','library'],['🎁','Surprise Me','action','open-wheel'],
  ['♥','My Favourites','action','favorites'],['🗓️','My Week','nav','week'],['🛒','Grocery List','action','groceries-choose']
 ];
 const stepTitle=config.stepTitles?.[locale]?.[stepIndex]||(pt?'Etapa '+(stepIndex+1):'Step '+(stepIndex+1)),adultHelp=pt?'Ajuda de um adulto':'Adult help needed';
 const stepPanel=finished
  ?`<section class="v32-r12-completion" data-v32-recipe-completion role="status" aria-live="polite"><div class="v32-r12-completion-icon" aria-hidden="true">${h(config.dishIcon||r.emoji||'✓')}</div><p class="v32-r12-eyebrow">${pt?'RECEITA CONCLUÍDA':'RECIPE COMPLETE'}</p><h2>${pt?'Você fez '+h(title)+'!':'You made '+h(title)+'!'}</h2><p>${h(config.completionSafety?.[locale]||config.safety[locale].at(-1))}</p><div class="v32-r12-completion-actions"><button type="button" data-nav="library">${pt?'Voltar às receitas':'Back to recipes'}</button></div></section>`
  :`<section class="v32-r12-cook" aria-label="${pt?'Etapas da receita':'Recipe steps'}">
    <div class="v32-r12-progress-head"><p class="v32-r12-eyebrow">${pt?'ETAPA':'STEP'} ${stepIndex+1} ${pt?'DE':'OF'} ${r.steps.length}</p><span class="v32-r12-step-count">${stepIndex+1} / ${r.steps.length}</span></div>
    <div class="v32-r12-progress" role="progressbar" aria-label="${pt?'Progresso da receita':'Recipe progress'}" aria-valuemin="1" aria-valuemax="${r.steps.length}" aria-valuenow="${stepIndex+1}">${r.steps.map((_,i)=>`<span class="${i<=stepIndex?'is-complete':''}" aria-hidden="true"></span>`).join('')}</div>
    <div class="ref-step-grid v32-r12-step-grid" data-step-count="${r.steps.length}">
     <article class="ref-step-card active v32-r12-step-card" aria-current="step" data-v32-step="${stepIndex+1}">
      <div class="v32-r12-step-heading"><span class="v32-r12-method-icon" aria-hidden="true">${h(config.methodIcons?.[stepIndex]||'•')}</span><div><p class="v32-r12-step-kicker">${pt?'ETAPA':'STEP'} ${stepIndex+1}</p><h2 class="ref-step-title v32-r12-title"><span class="ref-step-number">${stepIndex+1}</span><strong>${h(stepTitle)}</strong></h2></div></div>
      <div class="ref-step-copy v32-r12-instruction"><p data-original-source="recipe-step">${h(steps[stepIndex])}</p></div>
      ${config.metadataStep===stepIndex?`<p class="v32-r12-metadata" data-original-source="recipe-metadata">◷ ${h(time)}</p>`:''}
      <aside class="v32-r12-safety" role="note" aria-label="${h(config.safetyTitles?.[locale]?.[stepIndex]||adultHelp)}"><span class="v32-r12-safety-icon" aria-hidden="true">!</span><div><strong>${h(config.safetyTitles?.[locale]?.[stepIndex]||adultHelp)}</strong><p data-original-source="recipe-safety">${h(config.safety[locale][stepIndex])}</p></div></aside>
     </article>
    </div>
    <div class="ref-step-actions v32-r12-actions"><button type="button" class="ref-back" data-action="prevstep" ${stepIndex===0?'disabled':''}>← ${pt?'Anterior':'Previous'}</button><span class="v32-r12-actions-progress">${stepIndex+1} ${pt?'de':'of'} ${r.steps.length}</span><button type="button" class="ref-next ${stepIndex===r.steps.length-1?'finish-step':''}" data-action="nextstep">${stepIndex===r.steps.length-1?(pt?'Concluir':'Finish'):(pt?'Próxima etapa':'Next step')} →</button></div>
   </section>`;
 return `<article class="v32-r12-main" data-v32-template="recipe-step-v1" data-recipe-id="${id}">
  <section class="v32-r12-top" aria-label="${pt?'Atalhos da cozinha':'Kitchen shortcuts'}">
   <div class="v32-r12-brand">${chefAvatar}<span><strong>${pt?'Cozinha mágica':'Aaria’s'}<br>${pt?'da Aaria':'Magical Kitchen'}</strong><small>${pt?'Cozinhar · Criar · Explorar':'Cook · Create · Explore'}</small></span></div>
   <nav class="v32-r12-quick-actions" aria-label="${pt?'Atalhos da cozinha':'Kitchen shortcuts'}">${quickActions.map(([icon,label,type,target])=>`<button type="button" ${type==='nav'?`data-nav="${target}"`:`data-action="${target}"`}><span aria-hidden="true">${icon}</span>${label}</button>`).join('')}</nav>
  </section>
  <header class="v32-r12-header">
   <p class="v32-r12-special">✨ ${pt?'RECEITA ESPECIAL PARA A AARIA':'SPECIAL RECIPE FOR AARIA'} <span>♥ ${pt?'Favorita da família':'Family favourite'}</span></p>
   <div class="v32-r12-title-block"><p class="v32-r12-eyebrow">✨ ${pt?'VAMOS FAZER ALGO GOSTOSO':'LET’S MAKE SOMETHING YUMMY'}</p><h1>${h(title)}</h1></div>
   <div class="v32-r12-meta"><span class="v32-r12-method">🍳 ${h(method)}</span><span>◷ ${h(time)}</span></div>
   <p class="v32-r12-yield">${pt?'Rende':'Makes'} ${h(makes.replace(/^(Makes |Rende )/i,''))}</p>
   <button type="button" class="ref-favorite v32-r12-favorite" data-action="favorite" aria-label="${favorite?(pt?'Remover dos favoritos':'Remove from favourites'):(pt?'Adicionar aos favoritos':'Add to favourites')}">${favorite?'♥':'♡'} <span>${pt?'Favorita':'Favourite'}</span></button>
   <button type="button" class="recipe-grocery-link v32-r12-grocery" data-action="groceries-current">🛒 ${pt?'Lista de compras':'Make grocery list'}</button>
  </header>
  <figure class="v32-r12-dish-photo" aria-label="${pt?'Foto do prato pronto: ':'Finished dish photo: '}${h(title)}">${dishImage?`<img src="${dishImage}" alt="${pt?'Prato pronto: ':'Finished '}${h(title)}" decoding="async" fetchpriority="high">`:`<span aria-hidden="true">${h(config.dishIcon||r.emoji||'✓')}</span>`}</figure>
  <aside class="v32-r12-character" aria-label="${pt?'Dica da Aaria':'Aaria’s recipe fact'}">${characterAvatar}<div><strong>${pt?'Oi! Eu sou a Aaria!':'Hi! I’m Aaria!'}</strong><p>${h(translateText(r.fact,pt?'pt-BR':'en-GB'))}</p></div></aside>
  <section class="v32-r12-ingredients ref-card" aria-labelledby="v32-r12-ingredients-title"><div class="v32-r12-section-heading"><h2 id="v32-r12-ingredients-title">🥣 ${pt?'Ingredientes':'Ingredients'}</h2><span>${h(makes)}</span></div><div class="v32-r12-ingredient-list">${ingredients.map((ingredient,i)=>`<label class="ref-ingredient ${checks.includes(i)?'is-checked':''}"><span class="v32-r12-ingredient-art">${v3IngredientArt(ingredient)}</span><span class="v32-r12-ingredient-name">${h(ingredient)}</span><input type="checkbox" data-check="${i}" aria-label="${pt?'Marcar':'Check'} ${h(ingredient)}" ${checks.includes(i)?'checked':''}><i aria-hidden="true">${checks.includes(i)?'✓':'○'}</i></label>`).join('')}</div>${r.extras?.length?`<p class="v32-r12-extras">✨ ${pt?'Opcional':'Optional'}: ${r.extras.map(extra=>h(translateText(extra,pt?'pt-BR':'en-GB'))).join('; ')}</p>`:''}</section>
  <section class="v32-r12-equipment ref-card" aria-labelledby="v32-r12-equipment-title"><div class="v32-r12-section-heading"><h2 id="v32-r12-equipment-title">💗 ${pt?'Você vai precisar':'You’ll need'}</h2></div><ul class="v32-r12-equipment-list">${equipment.map(([icon,label])=>`<li><span aria-hidden="true">${icon}</span><small>${h(label)}</small></li>`).join('')}</ul></section>
  ${stepPanel}
  <details open class="storybook-safety v32-r12-recipe-safety"><summary>🛡️ ${pt?'Segurança na cozinha':'Kitchen safety'}</summary><p>${h(translateText(r.safety||config.safety[locale].join(' '),pt?'pt-BR':'en-GB'))}</p></details>
  ${healthPanels(r)}
  ${cookShareSection(r)}
 </article>`;
}
const v32RecipeBeforePilot=recipe;
recipe=function v32Recipe12AndInternational(){const id=Number(selected?.id),entry=V32_INTL_BY_ID.get(id);if(!entry)return id===12?batchReferenceRecipe():v32RecipeBeforePilot();const pt=state.language==='pt-BR',locale=pt?'pt-BR':'en-GB',record=entry.item.locales[locale],localeSteps=pt?(PT_RECIPES[id]?.steps||entry.record.steps):entry.record.steps,original=selected;const roles=Object.fromEntries((record.equipmentItems||[]).map(x=>[String(x.name).toLowerCase(),v32InternationalRole(x.roleDescription||x.role,pt)]));selected={...entry.record,...(PT_RECIPES[id]||{}),title:record.title,ingredients:v32InternationalIngredientList(record),steps:localeSteps,yieldText:pt?`${record.servings||entry.record.servings||2} porções`:`${record.servings||entry.record.servings||2} servings`,description:record.description,fact:record.description,safety:record.adultHelp,adultHelp:record.adultHelp,crossContact:record.crossContact||'',declaredAllergens:record.allergens||[],internationalNutrition:{...(record.nutrition||{}),sources:record.international?.nutritionSources||[],basis:entry.item.locales['en-GB'].nutrition?.basis||'',calculationMethod:record.nutrition?.calculationMethod||record.nutrition?.method||''},compactIngredients:v32CompactIngredients(entry.item,locale),equipmentRoles:roles};BATCH_META[id]={...BATCH_META[id],title:record.title,line:record.description,tools:record.equipment};STEP_GUIDES[id]=record.steps.map(x=>({title:x.title,tip:x.safety,safety:x.safety,adultAssist:x.adultAssist,art:V32_INTL_ROOT+x.image.path}));let html;try{html=v32RenderCompactInternationalIngredients(batchReferenceRecipe(),selected);html=v32RenderInternationalEquipment(html,record,pt);html=v32RenderInternationalStepArtwork(html,record.steps)}finally{selected=original}return html};
const v32RenderBeforeInternationalParity=render;
render=function v32RenderInternationalParity(){v32RenderBeforeInternationalParity();const id=Number(selected?.id),active=view==='recipe'&&V32_INTL_BY_ID.has(id);document.querySelector('.app')?.classList.toggle('v32-international-active',active);if(view==='recipe')v32ApplyMagicPrepBoard();if(view==='recipe'&&id===12)v32ApplyRecipe12StepSafety();if(active){const steps=state.language==='pt-BR'?(PT_RECIPES[id]?.steps||[]):(RECIPES.find(r=>Number(r.id)===id)?.steps||[]);v32RestoreInternationalStepCopy(document.querySelector('.app.v32-international-active .ref-step-card.active .ref-step-copy p'),steps,step);}};

v3InitProfiles();
render();


