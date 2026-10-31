import webpush from 'web-push';

const allowedOrigin = 'https://chinkk-git.github.io';
const appPrefix = '/Aariamagickitchen/';
const maxBody = 12_000;
const cors = origin => ({'Access-Control-Allow-Origin': origin === allowedOrigin ? origin : 'null','Access-Control-Allow-Methods':'GET,POST,DELETE,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Authorization','Vary':'Origin'});
const json = (data,status=200,origin='') => new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...cors(origin)}});
const validRoute = route => typeof route==='string' && (/^\/notifications(?:\/new)?$/.test(route)||/^\/recipe\/(?:[1-9]\d{0,2})$/.test(route)||/^\/world\/(?:IND|ITA|CHN|JPN|MEX|VNM|BRA|USA|FRA|ESP|THA|GBR|MAR)$/.test(route)||['/settings/notifications','/settings/accessibility/text-size','/whats-new'].includes(route));
const categories = new Set(['recipes','features','countries','updates']);
async function body(request){const raw=await request.text();if(raw.length>maxBody)throw new Error('payload too large');return JSON.parse(raw);}
async function auth(request,env){return Boolean(env.ADMIN_TOKEN && request.headers.get('Authorization')==='Bearer '+env.ADMIN_TOKEN);}
async function record(env,id,sha,status){await env.DB.prepare('INSERT OR IGNORE INTO announcements(id,release_sha,status,created_at) VALUES(?,?,?,?)').bind(id,sha,status,Date.now()).run();}
async function sendAnnouncement(env, announcement){
  if(!await auth(announcement.request,env))return {status:401};
  const a=announcement.data;
  if(!a||!/^[A-Za-z0-9._:-]{1,100}$/.test(a.id)||!/^[0-9a-f]{40}$/.test(a.releaseSha)||!categories.has(a.category)||!validRoute(a.route)||!a.confirmedProduction||!a.approvedGuardianConsentModel)return {status:400};
  const claimed=await env.DB.prepare('INSERT OR IGNORE INTO announcements(id,release_sha,status,created_at) VALUES(?,?,?,?)').bind(a.id,a.releaseSha,'sending',Date.now()).run();
  if(!claimed.meta.changes)return {status:409};
  const rows=await env.DB.prepare('SELECT endpoint,p256dh,auth,locale,categories FROM subscriptions WHERE consent_valid=1').all();
  let sent=0,failed=0,removed=0;
  const messageFor=s=>({title:a.messages?.[s.locale]?.title||a.messages?.['en-GB']?.title||'',body:a.messages?.[s.locale]?.body||a.messages?.['en-GB']?.body||'',tag:a.id,data:{route:a.route,announcementId:a.id}});
  for(const s of rows.results){let prefs=[];try{prefs=JSON.parse(s.categories)}catch{};if(!prefs.includes(a.category))continue;try{await webpush.sendNotification({endpoint:s.endpoint,keys:{p256dh:s.p256dh,auth:s.auth}},JSON.stringify(messageFor(s)),{vapidDetails:{subject:env.VAPID_SUBJECT,publicKey:env.VAPID_PUBLIC_KEY,privateKey:env.VAPID_PRIVATE_KEY},TTL:86400});sent++}catch(e){if(e.statusCode===404||e.statusCode===410){await env.DB.prepare('DELETE FROM subscriptions WHERE endpoint=?').bind(s.endpoint).run();removed++}else failed++;}}
  await env.DB.prepare('UPDATE announcements SET status=?,sent=?,failed=?,removed=?,completed_at=? WHERE id=?').bind(failed?'partial':'sent',sent,failed,removed,Date.now(),a.id).run();
  return {status:200,sent,failed,removed};
}
export default {async fetch(request,env){const origin=request.headers.get('Origin')||'',url=new URL(request.url);if(request.method==='OPTIONS')return new Response(null,{headers:cors(origin)});if(origin&&origin!==allowedOrigin)return json({error:'origin_not_allowed'},403,origin);
  if(url.pathname==='/v1/config'&&request.method==='GET')return json({vapidPublicKey:env.VAPID_PUBLIC_KEY||null},200,origin);
  if(url.pathname==='/v1/subscribe'&&request.method==='POST'){let b;try{b=await body(request)}catch{return json({error:'invalid_body'},400,origin)};if(!b?.subscription?.endpoint||!/^https:\/\//.test(b.subscription.endpoint)||!b.subscription.keys?.p256dh||!b.subscription.keys?.auth||!['en-GB','pt-BR'].includes(b.locale)||!Array.isArray(b.categories)||b.categories.some(c=>!categories.has(c))||!b.consentReceipt)return json({error:'invalid_subscription_or_consent'},400,origin);await env.DB.prepare('INSERT INTO subscriptions(endpoint,p256dh,auth,locale,categories,consent_valid,created_at,updated_at) VALUES(?,?,?,?,?,1,?,?) ON CONFLICT(endpoint) DO UPDATE SET p256dh=excluded.p256dh,auth=excluded.auth,locale=excluded.locale,categories=excluded.categories,consent_valid=1,updated_at=excluded.updated_at').bind(b.subscription.endpoint,b.subscription.keys.p256dh,b.subscription.keys.auth,b.locale,JSON.stringify(b.categories),Date.now(),Date.now()).run();return json({ok:true},201,origin)}
  if(url.pathname==='/v1/unsubscribe'&&request.method==='POST'){let b;try{b=await body(request)}catch{return json({error:'invalid_body'},400,origin)};if(!b?.endpoint)return json({error:'invalid_endpoint'},400,origin);await env.DB.prepare('DELETE FROM subscriptions WHERE endpoint=?').bind(b.endpoint).run();return json({ok:true},200,origin)}
  if(url.pathname==='/v1/test'&&request.method==='POST'){if(!await auth(request,env))return json({error:'unauthorized'},401,origin);let b;try{b=await body(request)}catch{return json({error:'invalid_body'},400,origin)};if(!b?.endpoint)return json({error:'invalid_endpoint'},400,origin);const s=await env.DB.prepare('SELECT endpoint,p256dh,auth FROM subscriptions WHERE endpoint=? AND consent_valid=1').bind(b.endpoint).first();if(!s)return json({error:'not_found'},404,origin);await webpush.sendNotification({endpoint:s.endpoint,keys:{p256dh:s.p256dh,auth:s.auth}},JSON.stringify({title:'Aaria test',body:'Push delivery is connected.',data:{route:'/notifications'}}),{vapidDetails:{subject:env.VAPID_SUBJECT,publicKey:env.VAPID_PUBLIC_KEY,privateKey:env.VAPID_PRIVATE_KEY},TTL:60});return json({ok:true},200,origin)}
  if(url.pathname==='/v1/publish'&&request.method==='POST'){let data;try{data=await body(request)}catch{return json({error:'invalid_body'},400,origin)};const result=await sendAnnouncement(env,{request,data});return json(result,result.status,origin)}
  return json({error:'not_found'},404,origin);
}};
