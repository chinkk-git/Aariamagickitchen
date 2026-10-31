import webpush from 'web-push';
import { isPublicHttpsEndpoint, isValidSubscriptionInput } from './validation.js';

const allowedOrigin = 'https://chinkk-git.github.io';
const maxBody = 12_000;
const cors = origin => ({'Access-Control-Allow-Origin':origin===allowedOrigin?origin:'null','Access-Control-Allow-Methods':'GET,POST,OPTIONS','Access-Control-Allow-Headers':'Content-Type,Authorization','Vary':'Origin'});
const json = (data,status=200,origin='') => new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json; charset=utf-8','Cache-Control':'no-store',...cors(origin)}});
const validRoute = route => typeof route==='string' && (/^\/notifications(?:\/new)?$/.test(route)||/^\/recipes\/new\/(?:[1-9]\d{0,2})(?:,(?:[1-9]\d{0,2})){0,49}$/.test(route)||/^\/recipe\/(?:[1-9]\d{0,2})$/.test(route)||/^\/world\/(?:IND|ITA|CHN|JPN|MEX|VNM|BRA|USA|FRA|ESP|THA|GBR|MAR)$/.test(route)||['/settings/notifications','/settings/accessibility/text-size','/whats-new'].includes(route));
const categories = new Set(['recipes','features','countries','updates']);
const fanoutPageSize = 50;
const maxDeliveryAttempts = 5;
async function body(request){const raw=await request.text();if(raw.length>maxBody)throw new Error('payload too large');return JSON.parse(raw);}
async function auth(request,env){return Boolean(env.ADMIN_TOKEN&&request.headers.get('Authorization')==='Bearer '+env.ADMIN_TOKEN);}
const decode64=value=>Uint8Array.from(atob(value.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
async function endpointHash(endpoint){const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(endpoint));return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');}
async function validConsentReceipt(token,env,locale){
  if(typeof token!=='string'||!env.CONSENT_SIGNING_SECRET||token.length>4096)return null;
  const [encoded,signature,...extra]=token.split('.');if(!encoded||!signature||extra.length)return null;
  try{
    const payload=JSON.parse(new TextDecoder().decode(decode64(encoded)));
    const now=Math.floor(Date.now()/1000);
    if(payload.iss!=='aaria-parent-consent'||payload.approved!==true||payload.locale!==locale||typeof payload.receiptId!=='string'||payload.receiptId.length>120||!Number.isInteger(payload.iat)||!Number.isInteger(payload.exp)||payload.iat>now+60||payload.exp<now||payload.exp-payload.iat>366*86400)return null;
    const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.CONSENT_SIGNING_SECRET),{name:'HMAC',hash:'SHA-256'},false,['verify']);
    const ok=await crypto.subtle.verify('HMAC',key,decode64(signature),new TextEncoder().encode(encoded));
    if(!ok)return null;
    const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(token));
    return {
      hash:Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join(''),
      expiresAt:payload.exp*1000
    };
  }catch{return null;}
}
function validAnnouncement(a){
  if(!a||!/^[A-Za-z0-9._:-]{1,100}$/.test(a.id)||!/^[0-9a-f]{40}$/.test(a.releaseSha)||!categories.has(a.category)||!validRoute(a.route)||a.confirmedProduction!==true||a.approvedGuardianConsentModel!==true)return false;
  return ['en-GB','pt-BR'].every(locale=>{
    const m=a.messages?.[locale];return Boolean(m&&typeof m.title==='string'&&m.title.trim()&&m.title.length<=100&&typeof m.body==='string'&&m.body.trim()&&m.body.length<=240);
  });
}
async function publishAnnouncement(request,env,a){
  if(!await auth(request,env))return {status:401};
  if(env.PARENT_CONSENT_MODEL_APPROVED!=='true')return {status:503,error:'guardian_consent_model_not_approved'};
  if(!env.DB||!env.DELIVERY_QUEUE||!env.VAPID_PUBLIC_KEY||!env.VAPID_PRIVATE_KEY||!env.VAPID_SUBJECT)return {status:503};
  if(!validAnnouncement(a))return {status:400};
  const now=Date.now();
  await env.DB.prepare('INSERT OR IGNORE INTO announcements(id,release_sha,status,payload,fanout_cursor,fanout_complete,created_at) VALUES(?,?,?,?,?,0,?)').bind(a.id,a.releaseSha,'pending',JSON.stringify({id:a.id,category:a.category,route:a.route,messages:a.messages}),'',now).run();
  const row=await env.DB.prepare('SELECT release_sha,status,fanout_cursor,fanout_complete FROM announcements WHERE id=?').bind(a.id).first();
  if(!row||row.release_sha!==a.releaseSha)return {status:409,error:'announcement_id_conflict'};
  if(['sent','partial'].includes(row.status))return {status:200,id:a.id,status:row.status,duplicate:true};
  if(row.status==='pending'){
    try{await env.DELIVERY_QUEUE.send({kind:'fanout',announcementId:a.id,cursor:''});}
    catch{return {status:503,error:'delivery_queue_unavailable'};}
    await env.DB.prepare("UPDATE announcements SET status='queued' WHERE id=? AND status='pending'").bind(a.id).run();
  }
  return {status:202,id:a.id,status:'queued',duplicate:row.status!=='pending'};
}
async function finalizeAnnouncement(env,id){
  const announcement=await env.DB.prepare('SELECT fanout_complete FROM announcements WHERE id=?').bind(id).first();
  if(!announcement?.fanout_complete)return;
  const counts=await env.DB.prepare("SELECT SUM(status='sent') AS sent,SUM(status='failed') AS failed,SUM(status='removed') AS removed,SUM(status='skipped') AS skipped,SUM(status IN ('pending','queued','sending')) AS active FROM announcement_deliveries WHERE announcement_id=?").bind(id).first();
  if(Number(counts?.active||0)>0)return;
  const failed=Number(counts?.failed||0);
  await env.DB.prepare('UPDATE announcements SET status=?,sent=?,failed=?,removed=?,skipped=?,completed_at=? WHERE id=? AND fanout_complete=1').bind(failed?'partial':'sent',Number(counts?.sent||0),failed,Number(counts?.removed||0),Number(counts?.skipped||0),Date.now(),id).run();
}
async function processFanout(message,env){
  const a=await env.DB.prepare('SELECT payload,status,fanout_cursor,fanout_complete FROM announcements WHERE id=?').bind(message.announcementId).first();
  if(!a||a.fanout_complete||['sent','partial'].includes(a.status))return;
  const cursor=typeof message.cursor==='string'?message.cursor:'';
  if(cursor!==a.fanout_cursor)return;
  const payload=JSON.parse(a.payload);
  const now=Date.now();
  const page=await env.DB.prepare('SELECT rowid AS row_id,endpoint,p256dh,auth,locale,categories,endpoint_hash FROM subscriptions WHERE consent_valid=1 AND consent_expires_at>? AND rowid>? ORDER BY rowid LIMIT ?').bind(now,Number(cursor)||0,fanoutPageSize).all();
  const eligible=[];
  for(const s of page.results||[]){
    let prefs=[];try{prefs=JSON.parse(s.categories)}catch{}
    if(!Array.isArray(prefs)||!prefs.includes(payload.category))continue;
    const hash=s.endpoint_hash||await endpointHash(s.endpoint);
    if(!s.endpoint_hash)await env.DB.prepare('UPDATE subscriptions SET endpoint_hash=? WHERE endpoint=? AND endpoint_hash IS NULL').bind(hash,s.endpoint).run();
    const id=payload.id+':'+hash;
    await env.DB.prepare("INSERT OR IGNORE INTO announcement_deliveries(id,announcement_id,endpoint_hash,category,status,attempts,created_at,updated_at) VALUES(?,?,?,?,'pending',0,?,?)").bind(id,payload.id,hash,payload.category,Date.now(),Date.now()).run();
    const delivery=await env.DB.prepare('SELECT status FROM announcement_deliveries WHERE id=?').bind(id).first();
    if(delivery?.status==='pending')eligible.push({body:{kind:'deliver',deliveryId:id}});
  }
  const nextCursor=page.results?.length?String(page.results[page.results.length-1].row_id):cursor;
  const hasMore=(page.results?.length||0)===fanoutPageSize;
  const messages=[...eligible];
  if(hasMore)messages.push({body:{kind:'fanout',announcementId:payload.id,cursor:nextCursor}});
  if(messages.length)await env.DELIVERY_QUEUE.sendBatch(messages);
  if(eligible.length){
    await env.DB.batch(eligible.map(item=>env.DB.prepare("UPDATE announcement_deliveries SET status='queued',updated_at=? WHERE id=? AND status='pending'").bind(Date.now(),item.body.deliveryId)));
  }
  await env.DB.prepare('UPDATE announcements SET fanout_cursor=?,fanout_complete=? WHERE id=? AND fanout_cursor=?').bind(nextCursor,hasMore?0:1,payload.id,cursor).run();
  if(!hasMore)await finalizeAnnouncement(env,payload.id);
}
async function processConsentCleanup(message,env){
  const now=Date.now(),cursor=Number(message.cursor)||0;
  const expired=await env.DB.prepare('SELECT rowid AS row_id,endpoint FROM subscriptions WHERE consent_valid=1 AND consent_expires_at<=? AND rowid>? ORDER BY rowid LIMIT ?').bind(now,cursor,fanoutPageSize).all();
  const endpoints=expired.results||[];
  if(!endpoints.length)return;
  await env.DB.batch(endpoints.map(s=>env.DB.prepare('DELETE FROM subscriptions WHERE endpoint=? AND consent_valid=1 AND consent_expires_at<=?').bind(s.endpoint,now)));
  if(endpoints.length===fanoutPageSize){
    await env.DELIVERY_QUEUE.send({kind:'consent-cleanup',cursor:String(endpoints[endpoints.length-1].row_id)});
  }
}
async function processDelivery(message,env,queueMessage){
  const now=Date.now();
  const claimed=await env.DB.prepare("UPDATE announcement_deliveries SET status='sending',attempts=attempts+1,updated_at=? WHERE id=? AND (status IN ('pending','queued') OR (status='sending' AND updated_at<?))").bind(now,message.deliveryId,now-60000).run();
  if(!claimed.meta?.changes){
    const current=await env.DB.prepare('SELECT status FROM announcement_deliveries WHERE id=?').bind(message.deliveryId).first();
    if(current?.status==='sending')queueMessage.retry({delaySeconds:60});
    return;
  }
  const row=await env.DB.prepare('SELECT d.announcement_id,d.endpoint_hash,d.category,d.attempts,a.payload,s.endpoint,s.p256dh,s.auth,s.locale,s.categories,s.consent_valid,s.consent_expires_at FROM announcement_deliveries d JOIN announcements a ON a.id=d.announcement_id LEFT JOIN subscriptions s ON s.endpoint_hash=d.endpoint_hash WHERE d.id=?').bind(message.deliveryId).first();
  if(!row){await env.DB.prepare("UPDATE announcement_deliveries SET status='failed',updated_at=? WHERE id=?").bind(Date.now(),message.deliveryId).run();return;}
  if(!row.endpoint){await env.DB.prepare("UPDATE announcement_deliveries SET status='removed',updated_at=? WHERE id=?").bind(Date.now(),message.deliveryId).run();await finalizeAnnouncement(env,row.announcement_id);return;}
  if(Number(row.consent_valid)!==1||Number(row.consent_expires_at)<=Date.now()){
    await env.DB.prepare('UPDATE subscriptions SET consent_valid=0,updated_at=? WHERE endpoint_hash=? AND consent_expires_at<=?').bind(Date.now(),row.endpoint_hash,Date.now()).run();
    await env.DB.prepare("UPDATE announcement_deliveries SET status='skipped',updated_at=? WHERE id=?").bind(Date.now(),message.deliveryId).run();
    await finalizeAnnouncement(env,row.announcement_id);return;
  }
  let prefs=[];try{prefs=JSON.parse(row.categories)}catch{}
  if(!Array.isArray(prefs)||!prefs.includes(row.category)){
    await env.DB.prepare("UPDATE announcement_deliveries SET status='skipped',updated_at=? WHERE id=?").bind(Date.now(),message.deliveryId).run();
    await finalizeAnnouncement(env,row.announcement_id);return;
  }
  const announcement=JSON.parse(row.payload),copy=announcement.messages?.[row.locale];
  if(!copy?.title||!copy?.body){await env.DB.prepare("UPDATE announcement_deliveries SET status='failed',updated_at=? WHERE id=?").bind(Date.now(),message.deliveryId).run();await finalizeAnnouncement(env,row.announcement_id);return;}
  const payload={title:copy.title,body:copy.body,tag:announcement.id,data:{route:announcement.route,announcementId:announcement.id}};
  try{
    await webpush.sendNotification({endpoint:row.endpoint,keys:{p256dh:row.p256dh,auth:row.auth}},JSON.stringify(payload),{vapidDetails:{subject:env.VAPID_SUBJECT,publicKey:env.VAPID_PUBLIC_KEY,privateKey:env.VAPID_PRIVATE_KEY},TTL:86400});
    await env.DB.prepare("UPDATE announcement_deliveries SET status='sent',updated_at=? WHERE id=? AND status='sending'").bind(Date.now(),message.deliveryId).run();
  }catch(error){
    const code=Number(error?.statusCode)||0;
    if(code===404||code===410){
      await env.DB.prepare('DELETE FROM subscriptions WHERE endpoint=?').bind(row.endpoint).run();
      await env.DB.prepare("UPDATE announcement_deliveries SET status='removed',error_code=?,updated_at=? WHERE id=?").bind(code,Date.now(),message.deliveryId).run();
    }else if(Number(row.attempts)>=maxDeliveryAttempts){
      await env.DB.prepare("UPDATE announcement_deliveries SET status='failed',error_code=?,updated_at=? WHERE id=?").bind(code,Date.now(),message.deliveryId).run();
    }else{
      await env.DB.prepare("UPDATE announcement_deliveries SET status='queued',error_code=?,updated_at=? WHERE id=?").bind(code,Date.now(),message.deliveryId).run();
      queueMessage.retry({delaySeconds:60});return;
    }
  }
  await finalizeAnnouncement(env,row.announcement_id);
}
async function handleQueueMessage(message,env){
  const value=message.body;
  if(value?.kind==='fanout')return processFanout(value,env);
  if(value?.kind==='deliver')return processDelivery(value,env,message);
  if(value?.kind==='consent-cleanup')return processConsentCleanup(value,env);
  message.ack();
}
export default {async fetch(request,env){
  const origin=request.headers.get('Origin')||'',url=new URL(request.url);
  if(request.method==='OPTIONS')return new Response(null,{headers:cors(origin)});
  if(origin&&origin!==allowedOrigin)return json({error:'origin_not_allowed'},403,origin);
  if(url.pathname==='/v1/config'&&request.method==='GET')return json({vapidPublicKey:env.PARENT_CONSENT_MODEL_APPROVED==='true'?env.VAPID_PUBLIC_KEY||null:null},200,origin);
  if(url.pathname==='/v1/consent/verify'&&request.method==='POST'){
    if(env.PARENT_CONSENT_MODEL_APPROVED!=='true')return json({error:'guardian_consent_model_not_approved'},503,origin);
    let b;try{b=await body(request)}catch{return json({error:'invalid_body'},400,origin)}
    if(!['en-GB','pt-BR'].includes(b?.locale))return json({error:'valid_parent_consent_required'},403,origin);
    const consent=await validConsentReceipt(b?.consentReceipt,env,b.locale);
    if(!consent)return json({error:'valid_parent_consent_required'},403,origin);
    return json({valid:true,expiresAt:consent.expiresAt},200,origin);
  }
  if(url.pathname==='/v1/subscribe'&&request.method==='POST'){
    if(env.PARENT_CONSENT_MODEL_APPROVED!=='true')return json({error:'guardian_consent_model_not_approved'},503,origin);
    let b;try{b=await body(request)}catch{return json({error:'invalid_body'},400,origin)}
    if(!isValidSubscriptionInput(b))return json({error:'invalid_subscription'},400,origin);
    if(!env.DB||!env.VAPID_PUBLIC_KEY||!env.VAPID_PRIVATE_KEY||!env.VAPID_SUBJECT)return json({error:'push_service_unavailable'},503,origin);
    const consent=await validConsentReceipt(b.consentReceipt,env,b.locale);if(!consent)return json({error:'valid_parent_consent_required'},403,origin);
    const now=Date.now(),hash=await endpointHash(b.subscription.endpoint);
    await env.DB.prepare('INSERT INTO subscriptions(endpoint,endpoint_hash,p256dh,auth,locale,categories,consent_valid,consent_receipt_hash,consent_expires_at,created_at,updated_at) VALUES(?,?,?,?,?,?,1,?,?,?,?) ON CONFLICT(endpoint) DO UPDATE SET endpoint_hash=excluded.endpoint_hash,p256dh=excluded.p256dh,auth=excluded.auth,locale=excluded.locale,categories=excluded.categories,consent_valid=1,consent_receipt_hash=excluded.consent_receipt_hash,consent_expires_at=excluded.consent_expires_at,updated_at=excluded.updated_at').bind(b.subscription.endpoint,hash,b.subscription.keys.p256dh,b.subscription.keys.auth,b.locale,JSON.stringify(b.categories),consent.hash,consent.expiresAt,now,now).run();
    return json({ok:true},201,origin);
  }
  if(url.pathname==='/v1/unsubscribe'&&request.method==='POST'){
    let b;try{b=await body(request)}catch{return json({error:'invalid_body'},400,origin)}
    if(!isPublicHttpsEndpoint(b?.endpoint))return json({error:'invalid_endpoint'},400,origin);
    if(!env.DB)return json({error:'storage_unavailable'},503,origin);
    await env.DB.prepare('DELETE FROM subscriptions WHERE endpoint=?').bind(b.endpoint).run();return json({ok:true},200,origin);
  }
  if(url.pathname==='/v1/test'&&request.method==='POST'){
    if(!await auth(request,env))return json({error:'unauthorized'},401,origin);
    if(env.PARENT_CONSENT_MODEL_APPROVED!=='true')return json({error:'guardian_consent_model_not_approved'},503,origin);
    let b;try{b=await body(request)}catch{return json({error:'invalid_body'},400,origin)}
    if(!isPublicHttpsEndpoint(b?.endpoint))return json({error:'invalid_endpoint'},400,origin);
    if(!env.DB||!env.VAPID_PUBLIC_KEY||!env.VAPID_PRIVATE_KEY||!env.VAPID_SUBJECT)return json({error:'push_service_unavailable'},503,origin);
    const s=await env.DB.prepare('SELECT endpoint,p256dh,auth FROM subscriptions WHERE endpoint=? AND consent_valid=1 AND consent_expires_at>?').bind(b.endpoint,Date.now()).first();if(!s)return json({error:'not_found'},404,origin);
    try{await webpush.sendNotification({endpoint:s.endpoint,keys:{p256dh:s.p256dh,auth:s.auth}},JSON.stringify({title:'Aaria test',body:'Push delivery is connected.',data:{route:'/notifications'}}),{vapidDetails:{subject:env.VAPID_SUBJECT,publicKey:env.VAPID_PUBLIC_KEY,privateKey:env.VAPID_PRIVATE_KEY},TTL:60});}
    catch(error){if(error.statusCode===404||error.statusCode===410)await env.DB.prepare('DELETE FROM subscriptions WHERE endpoint=?').bind(s.endpoint).run();return json({error:'test_delivery_failed',expired:error.statusCode===404||error.statusCode===410},Number(error.statusCode)||502,origin);}
    return json({ok:true},200,origin);
  }
  if(url.pathname==='/v1/publish'&&request.method==='POST'){
    let a;try{a=await body(request)}catch{return json({error:'invalid_body'},400,origin)}
    const result=await publishAnnouncement(request,env,a);return json(result,result.status,origin);
  }
  const statusMatch=url.pathname.match(/^\/v1\/status\/([A-Za-z0-9._:-]{1,100})$/);
  if(statusMatch&&request.method==='GET'){
    if(!await auth(request,env))return json({error:'unauthorized'},401,origin);
    if(!env.DB)return json({error:'storage_unavailable'},503,origin);
    const row=await env.DB.prepare('SELECT id,release_sha,status,sent,failed,removed,skipped,created_at,completed_at FROM announcements WHERE id=?').bind(statusMatch[1]).first();
    if(!row)return json({error:'not_found'},404,origin);
    return json(row,200,origin);
  }
  return json({error:'not_found'},404,origin);
},async scheduled(_event,env,ctx){
  if(!env.DB||!env.DELIVERY_QUEUE)return;
  ctx.waitUntil(env.DELIVERY_QUEUE.send({kind:'consent-cleanup',cursor:''}).catch(error=>{
    console.error('expired-consent cleanup enqueue failed',{errorCode:Number(error?.statusCode)||0});
  }));
},async queue(batch,env){
  for(const message of batch.messages){
    try{await handleQueueMessage(message,env);}
    catch(error){console.error('notification queue processing failed',{kind:message.body?.kind,errorCode:Number(error?.statusCode)||0});message.retry({delaySeconds:60});}
  }
}};
