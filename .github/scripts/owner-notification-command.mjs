import { readFile } from 'node:fs/promises';

export const OWNER_COMMAND_PREFIX='/aaria-notify ';

const fail=message=>{throw new Error(message);};

export function parseOwnerNotificationCommand(event,ownerLogin,manifest){
  if(event?.issue?.number!==51)fail('wrong_control_tower_issue');
  if(!ownerLogin||event?.comment?.user?.login!==ownerLogin)fail('owner_only_command');
  const text=event?.comment?.body;
  if(typeof text!=='string'||text.length>6000||!text.startsWith(OWNER_COMMAND_PREFIX))fail('invalid_command');
  let request;
  try{request=JSON.parse(text.slice(OWNER_COMMAND_PREFIX.length).trim());}catch{fail('invalid_announcement_json');}
  const keys=Object.keys(request||{}).sort().join(',');
  if(keys!=='category,id,messages,route')fail('unexpected_announcement_fields');
  if(typeof request.id!=='string'||!/^[A-Za-z0-9._:-]{1,100}$/.test(request.id))fail('invalid_announcement_id');
  if(!['recipes','features','countries','updates'].includes(request.category))fail('invalid_category');
  if(typeof request.route!=='string')fail('invalid_destination');
  const recipeIds=new Set(Array.isArray(manifest?.recipeIds)?manifest.recipeIds.map(Number):[]);
  const countryCodes=new Set(Array.isArray(manifest?.countryRegistry)?manifest.countryRegistry:[]);
  if(request.category==='recipes'){
    const detail=request.route.match(/^\/recipe\/([1-9]\d{0,2})$/);
    const collection=request.route.match(/^\/recipes\/new\/([1-9]\d{0,2}(?:,[1-9]\d{0,2}){0,49})$/);
    const ids=detail?[Number(detail[1])]:collection?collection[1].split(',').map(Number):[];
    if(!ids.length||ids.some(id=>!recipeIds.has(id)))fail('recipe_destination_not_in_release_manifest');
  }else if(request.category==='countries'){
    const match=request.route.match(/^\/world\/([A-Z]{3})$/);
    if(!match||!countryCodes.has(match[1]))fail('country_destination_not_in_release_manifest');
  }else if(request.category==='features'){
    const releasedFeatureRoutes=new Set(['/settings/accessibility/text-size']);
    const approved=releasedFeatureRoutes.has(request.route)||(manifest?.notificationFeatures||[]).some(feature=>feature?.route===request.route&&feature.status==='approved'&&feature.announcementReady===true);
    if(!approved)fail('feature_destination_not_approved');
  }else if(request.route!=='/whats-new')fail('update_destination_not_allowed');
  const locales=['en-GB','pt-BR'];
  for(const locale of locales){
    const message=request.messages?.[locale];
    if(!message||typeof message.title!=='string'||!message.title.trim()||message.title.length>100||typeof message.body!=='string'||!message.body.trim()||message.body.length>240)fail('invalid_localized_message');
  }
  return {id:request.id,category:request.category,route:request.route,messages:{'en-GB':request.messages['en-GB'],'pt-BR':request.messages['pt-BR']}};
}

async function main(){
  const event=JSON.parse(await readFile(process.env.GITHUB_EVENT_PATH,'utf8'));
  const manifest=JSON.parse(await readFile('manifest.json','utf8'));
  const announcement=parseOwnerNotificationCommand(event,event.repository?.owner?.login,manifest);
  if(process.argv.includes('--json'))console.log(JSON.stringify(announcement));
  else{
    console.log('Owner-approved announcement preview');
    console.log('Destination: '+announcement.route);
    console.log('Category: '+announcement.category);
    for(const locale of ['en-GB','pt-BR']){
      console.log(locale+' title: '+announcement.messages[locale].title);
      console.log(locale+' body: '+announcement.messages[locale].body);
    }
  }
}

if(process.argv[1]&&new URL(import.meta.url).pathname===process.argv[1])await main();
