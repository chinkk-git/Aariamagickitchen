const COUNTRY_NAMES={
 IND:{en:'India',pt:'Índia'},ITA:{en:'Italy',pt:'Itália'},CHN:{en:'China',pt:'China'},JPN:{en:'Japan',pt:'Japão'},MEX:{en:'Mexico',pt:'México'},VNM:{en:'Vietnam',pt:'Vietnã'},BRA:{en:'Brazil',pt:'Brasil'},USA:{en:'the United States',pt:'os Estados Unidos'},FRA:{en:'France',pt:'a França'},ESP:{en:'Spain',pt:'a Espanha'},THA:{en:'Thailand',pt:'a Tailândia'},GBR:{en:'the United Kingdom',pt:'o Reino Unido'},MAR:{en:'Morocco',pt:'Marrocos'}
};
const validRoute=r=>/^\/notifications$/.test(r)||/^\/recipes\/new\/(?:[1-9]\d{0,2})(?:,(?:[1-9]\d{0,2})){0,49}$/.test(r)||/^\/world\/(?:IND|ITA|CHN|JPN|MEX|VNM|BRA|USA|FRA|ESP|THA|GBR|MAR)$/.test(r)||['/settings/notifications','/settings/accessibility/text-size','/whats-new'].includes(r);
const normalizedIds=value=>Array.isArray(value)?[...new Set(value.map(Number).filter(n=>Number.isInteger(n)&&n>0&&n<=999))].sort((a,b)=>a-b):[];
export function generateAnnouncements(previous={},current={},releaseSha=''){
 if(!/^[0-9a-f]{40}$/.test(releaseSha))throw new Error('A full production release SHA is required.');
 const announcements=[],oldIds=normalizedIds(previous.recipeIds),newIds=normalizedIds(current.recipeIds),added=newIds.filter(id=>!oldIds.includes(id));
 if(added.length){const route='/recipes/new/'+added.join(',');announcements.push({id:releaseSha+':recipes',releaseSha,category:'recipes',route,messages:{'en-GB':{title:'🍜 New magical recipes!',body:`Discover ${added.length} new recipes with Aaria!`},'pt-BR':{title:'🍜 Novas receitas mágicas!',body:`Descubra ${added.length} novas receitas com Aaria!`}}});}
 const oldCountries=new Set(Array.isArray(previous.countryRegistry)?previous.countryRegistry:[]);
 for(const code of (Array.isArray(current.countryRegistry)?current.countryRegistry:[]).filter(x=>!oldCountries.has(x))){
  const name=COUNTRY_NAMES[code];if(!name)continue;const route='/world/'+code;
  announcements.push({id:releaseSha+':country:'+code,releaseSha,category:'countries',route,messages:{'en-GB':{title:'🌍 A new cooking adventure!',body:`${code==='USA'?'Explore delicious recipes from the United States!':`Explore delicious recipes from ${name.en}!`}`},'pt-BR':{title:'🌍 Uma nova aventura culinária!',body:`${code==='USA'?'Explore receitas deliciosas dos Estados Unidos!':`Explore receitas deliciosas de ${name.pt}!`}`}}});
 }
 const oldFeatures=new Set((previous.notificationFeatures||[]).map(x=>x.id));
 for(const f of (current.notificationFeatures||[]).filter(x=>x&&x.status==='approved'&&x.announcementReady===true&&!oldFeatures.has(x.id))){
  if(!/^[a-z0-9][a-z0-9._-]{0,39}$/.test(f.id)||!validRoute(f.route)||!f.messages?.['en-GB']?.title||!f.messages?.['en-GB']?.body||!f.messages?.['pt-BR']?.title||!f.messages?.['pt-BR']?.body)continue;
  announcements.push({id:releaseSha+':feature:'+f.id,releaseSha,category:'features',route:f.route,messages:f.messages});
 }
 if(current.majorUpdate===true&&previous.majorUpdate!==true&&current.whatsNew?.['en-GB']?.body&&current.whatsNew?.['pt-BR']?.body){
  announcements.push({id:releaseSha+':update',releaseSha,category:'updates',route:'/whats-new',messages:{'en-GB':{title:'🎉 Aaria’s Kitchen has been updated!',body:current.whatsNew['en-GB'].body},'pt-BR':{title:'🎉 A Cozinha da Aaria foi atualizada!',body:current.whatsNew['pt-BR'].body}}});
 }
 return announcements;
}
