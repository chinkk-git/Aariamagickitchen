import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import worker from '../../../notifications-worker/src/index.js';

const secret='test-only-consent-signing-secret';
const now=Math.floor(Date.now()/1000);
globalThis.__testPushCalls=[];
const encode=value=>Buffer.from(value).toString('base64url');
async function receipt({locale='en-GB',iat=now-60,exp=now+3600,approved=true,iss='aaria-parent-consent'}={}){
  const payload=encode(JSON.stringify({iss,approved,locale,receiptId:'test-receipt-1',iat,exp}));
  const key=await webcrypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const signature=await webcrypto.subtle.sign('HMAC',key,new TextEncoder().encode(payload));
  return payload+'.'+encode(new Uint8Array(signature));
}
function mockDatabase(){
  const writes=[];
  let activeSubscription=null;
  return {writes,prepare(sql){return{bind(...values){return{
    run:async()=>{
      writes.push({sql,values});
      let changes=1;
      if(sql.includes('INSERT INTO subscriptions'))activeSubscription={endpoint:values[0],p256dh:values[2],auth:values[3],locale:values[4],consent_receipt_hash:values[6],consent_expires_at:values[7],last_test_at:null};
      if(sql.includes('SET last_test_at=?')){
        const [updatedAt,endpoint,expiresAt,locale,receiptHash,threshold]=values;
        if(activeSubscription&&activeSubscription.endpoint===endpoint&&activeSubscription.consent_expires_at>expiresAt&&activeSubscription.locale===locale&&activeSubscription.consent_receipt_hash===receiptHash&&(activeSubscription.last_test_at===null||activeSubscription.last_test_at<=threshold))activeSubscription.last_test_at=updatedAt;
        else changes=0;
      }
      if(sql.includes('DELETE FROM subscriptions WHERE endpoint=')&&activeSubscription?.endpoint===values[0])activeSubscription=null;
      return{meta:{changes}};
    },
    first:async()=>sql.includes('SELECT endpoint,p256dh,auth,locale,consent_receipt_hash,last_test_at FROM subscriptions')&&activeSubscription?{...activeSubscription}:null,
    all:async()=>({results:[]})
  };}};}};
}
const DB=mockDatabase();
const env={
  DB,CONSENT_SIGNING_SECRET:secret,ADMIN_TOKEN:'test-only-admin-token',
  VAPID_PUBLIC_KEY:'test-public-key',VAPID_PRIVATE_KEY:'test-private-key',
  VAPID_SUBJECT:'mailto:notifications@example.test',PARENT_CONSENT_MODEL_APPROVED:'true'
};
async function request(path,body,overrides={}){
  const req=new Request('https://worker.example.test'+path,{method:body===undefined?'GET':'POST',headers:{Origin:'https://chinkk-git.github.io','Content-Type':'application/json'},body:body===undefined?undefined:JSON.stringify(body)});
  const response=await worker.fetch(req,{...env,...overrides});
  return {status:response.status,body:await response.json()};
}
const validReceipt=await receipt();
const validSubscription={
  endpoint:'https://fcm.googleapis.com/fcm/send/test-token',
  keys:{p256dh:Buffer.alloc(65,3).toString('base64url'),auth:Buffer.alloc(16,4).toString('base64url')}
};

const disabled=await request('/v1/consent/verify',{locale:'en-GB',consentReceipt:validReceipt},{PARENT_CONSENT_MODEL_APPROVED:'false'});
assert.equal(disabled.status,503,'consent verification must fail closed before owner approval');
const configDisabled=await request('/v1/config',undefined,{PARENT_CONSENT_MODEL_APPROVED:'false'});
assert.equal(configDisabled.body.vapidPublicKey,null,'public VAPID key stays hidden while disabled');
assert.ok(!JSON.stringify(configDisabled.body).includes('PRIVATE_KEY')&&!JSON.stringify(configDisabled.body).includes('ADMIN_TOKEN'));
const configEnabled=await request('/v1/config');
assert.equal(configEnabled.body.vapidPublicKey,env.VAPID_PUBLIC_KEY,'only the public VAPID key is exposed for browser subscription');
for(const secretValue of [env.VAPID_PRIVATE_KEY,env.ADMIN_TOKEN,env.CONSENT_SIGNING_SECRET]) assert.ok(!JSON.stringify(configEnabled.body).includes(secretValue),'Worker secrets must never be exposed in public configuration');

const verified=await request('/v1/consent/verify',{locale:'en-GB',consentReceipt:validReceipt});
assert.equal(verified.status,200);
assert.equal(verified.body.valid,true);
assert.equal(verified.body.expiresAt,(now+3600)*1000);
const [receiptPayload,receiptSignature]=validReceipt.split('.');
const invalidSignature=receiptPayload+'.'+(receiptSignature[0]==='A'?'B':'A')+receiptSignature.slice(1);
const malformed=await request('/v1/consent/verify',{locale:'en-GB',consentReceipt:invalidSignature});
assert.equal(malformed.status,403,'invalid receipt signature must be rejected');
const expired=await request('/v1/consent/verify',{locale:'en-GB',consentReceipt:await receipt({exp:now-1})});
assert.equal(expired.status,403,'expired guardian receipt must be rejected');
const wrongLocale=await request('/v1/consent/verify',{locale:'pt-BR',consentReceipt:validReceipt});
assert.equal(wrongLocale.status,403,'receipt locale must match the selected locale');
const wrongIssuer=await request('/v1/consent/verify',{locale:'en-GB',consentReceipt:await receipt({iss:'untrusted-issuer'})});
assert.equal(wrongIssuer.status,403,'receipt issuer must match the trusted issuer contract');
const unapproved=await request('/v1/consent/verify',{locale:'en-GB',consentReceipt:await receipt({approved:false})});
assert.equal(unapproved.status,403,'an unapproved guardian receipt must be rejected');

const blockedSubscribe=await request('/v1/subscribe',{subscription:validSubscription,locale:'en-GB',categories:['recipes'],consentReceipt:validReceipt},{PARENT_CONSENT_MODEL_APPROVED:'false'});
assert.equal(blockedSubscribe.status,503,'subscription creation must remain fail-closed');
const subscribeBody={subscription:validSubscription,locale:'en-GB',categories:['recipes'],consentReceipt:validReceipt};
const firstSubscribe=await request('/v1/subscribe',subscribeBody);
assert.equal(firstSubscribe.status,201);
assert.match(DB.writes.at(-1).sql,/consent_expires_at/);
assert.match(DB.writes.at(-1).sql,/ON CONFLICT\(endpoint\) DO UPDATE/,'repeat subscriptions update the existing endpoint');
assert.equal(DB.writes.at(-1).values[7],(now+3600)*1000,'the signed receipt expiry is stored with the subscription');
assert.match(DB.writes.at(-1).values[1],/^[a-f0-9]{64}$/,'the stored endpoint identifier is a one-way hash');
const renewal=await request('/v1/subscribe',{...subscribeBody,consentReceipt:await receipt({exp:now+7200}),categories:['features']});
assert.equal(renewal.status,201,'a newly verified guardian receipt renews the existing endpoint');
assert.equal(DB.writes.length,2);
const expiredSubscribe=await request('/v1/subscribe',{...subscribeBody,consentReceipt:await receipt({exp:now-1})});
assert.equal(expiredSubscribe.status,403,'expired receipt cannot create or renew a subscription');

const remove=await request('/v1/unsubscribe',{endpoint:validSubscription.endpoint});
assert.equal(remove.status,200);
assert.match(DB.writes.at(-1).sql,/DELETE FROM subscriptions WHERE endpoint=\?/);
const invalidRemove=await request('/v1/unsubscribe',{endpoint:'http://127.0.0.1/private'});
assert.equal(invalidRemove.status,400,'unsubscribe rejects non-public/non-HTTPS endpoints');
const resubscribe=await request('/v1/subscribe',subscribeBody);
assert.equal(resubscribe.status,201,'an active guardian receipt permits resubscription after unsubscribe');

const disabledTest=await request('/v1/test',{endpoint:validSubscription.endpoint,locale:'en-GB',consentReceipt:validReceipt,route:'/notifications'},{PARENT_CONSENT_MODEL_APPROVED:'false'});
assert.equal(disabledTest.status,503,'test delivery remains disabled until the owner-approved consent model is enabled');
const badTestConsent=await request('/v1/test',{endpoint:validSubscription.endpoint,locale:'en-GB',consentReceipt:await receipt({approved:false}),route:'/notifications'});
assert.equal(badTestConsent.status,403,'test delivery requires a signed, approved guardian receipt');
const badTestRoute=await request('/v1/test',{endpoint:validSubscription.endpoint,locale:'en-GB',consentReceipt:validReceipt,route:'https://evil.example'});
assert.equal(badTestRoute.status,400,'test delivery accepts only allowlisted in-app destinations');
const testSent=await request('/v1/test',{endpoint:validSubscription.endpoint,locale:'en-GB',consentReceipt:validReceipt,route:'/settings/accessibility/text-size'});
assert.equal(testSent.status,200,'a signed receipt bound to an active subscription can request a test');
assert.equal(globalThis.__testPushCalls.length,1);
const sentPayload=JSON.parse(globalThis.__testPushCalls[0][1]);
assert.equal(sentPayload.data.route,'/settings/accessibility/text-size');
assert.equal(sentPayload.title,'Aaria test notification');
const throttled=await request('/v1/test',{endpoint:validSubscription.endpoint,locale:'en-GB',consentReceipt:validReceipt,route:'/notifications'});
assert.equal(throttled.status,429,'test requests are rate limited per subscription');
assert.equal(globalThis.__testPushCalls.length,1,'rate-limited requests do not send a second push');
const testPt=await receipt({locale:'pt-BR',exp:now+7200});
const renewalPt=await request('/v1/subscribe',{...subscribeBody,locale:'pt-BR',consentReceipt:testPt});
assert.equal(renewalPt.status,201);
const beforeFailureWrites=DB.writes.length;
globalThis.__testPushFailure={statusCode:410};
const expiredTest=await request('/v1/test',{endpoint:validSubscription.endpoint,locale:'pt-BR',consentReceipt:testPt,route:'/recipes/new/111,112,113,114,115,116'});
delete globalThis.__testPushFailure;
assert.equal(expiredTest.status,410,'expired push subscriptions are returned as expired');
assert.equal(JSON.parse(globalThis.__testPushCalls.at(-1)[1]).title,'Notificação de teste Aaria','test copy follows the subscription locale');
assert.ok(DB.writes.slice(beforeFailureWrites).some(x=>x.sql==='DELETE FROM subscriptions WHERE endpoint=?'),'expired test endpoint is removed');
console.log('PASS: fail-closed guardian consent, secret-free config, renewal/unsubscribe, localized test push, safe routes, cooldown and expired-endpoint cleanup.');
