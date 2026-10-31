import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import worker from '../../../notifications-worker/src/index.js';

const secret='test-only-consent-signing-secret';
const now=Math.floor(Date.now()/1000);
globalThis.__testPushCalls=[];
const encode=value=>Buffer.from(value).toString('base64url');
async function receipt({locale='en-GB',iat=now-60,exp=now+3600,approved=true,iss='aaria-parent-consent',guardianVerified=true,deviceManagement=true,guardianId='synthetic-guardian-id-for-tests-0001'}={}){
  const payload=encode(JSON.stringify({iss,approved,guardianVerified,deviceManagement,guardianId,locale,receiptId:'test-receipt-1',iat,exp}));
  const key=await webcrypto.subtle.importKey('raw',new TextEncoder().encode(secret),{name:'HMAC',hash:'SHA-256'},false,['sign']);
  const signature=await webcrypto.subtle.sign('HMAC',key,new TextEncoder().encode(payload));
  return payload+'.'+encode(new Uint8Array(signature));
}
function mockDatabase(){
  const writes=[];
  let activeSubscription=null;
  const devices=new Map();let firstNotificationClaimed=false;let firstNotificationRow=null;
  return {writes,batch:async statements=>{const results=[];for(const statement of statements)results.push(await statement.run());return results;},prepare(sql){return{bind(...values){return{
    run:async()=>{
      writes.push({sql,values});
      let changes=1;
      if(sql.includes('INSERT INTO subscriptions'))activeSubscription={endpoint:values[0],p256dh:values[2],auth:values[3],locale:values[4],categories:values[5],consent_receipt_hash:values[6],consent_expires_at:values[7],guardian_hash:values[10],device_id:values[11],last_test_at:null};
      if(sql.includes('INSERT INTO guardian_devices'))devices.set(values[0],{device_id:values[0],guardian_hash:values[1],endpoint_hash:values[2],device_name:values[3],platform:values[4],permission_status:values[5],subscription_status:'active',consent_expires_at:values[6],created_at:values[7],last_contact_at:values[8]});
      if(sql.includes('INSERT OR IGNORE INTO first_magical_notification')){if(firstNotificationClaimed)changes=0;else{firstNotificationClaimed=true;firstNotificationRow={notification_id:values[0],device_id:values[1],guardian_hash:values[2],locale:values[3],route:'/recipe/112',status:'sending'};}}
      if(sql.includes("SET status='accepted',accepted_at=?")&&firstNotificationRow)firstNotificationRow.status='accepted';
      if(sql.includes('SET last_test_at=?')){
        const [updatedAt,endpoint,expiresAt,locale,receiptHash,threshold]=values;
        if(activeSubscription&&activeSubscription.endpoint===endpoint&&activeSubscription.consent_expires_at>expiresAt&&activeSubscription.locale===locale&&activeSubscription.consent_receipt_hash===receiptHash&&(activeSubscription.last_test_at===null||activeSubscription.last_test_at<=threshold))activeSubscription.last_test_at=updatedAt;
        else changes=0;
      }
      if(sql.includes('DELETE FROM subscriptions WHERE endpoint=')&&activeSubscription?.endpoint===values[0])activeSubscription=null;
      if(sql.includes("SET subscription_status='revoked'")&&devices.has(values[1]||'')){const d=devices.get(values[1]);d.subscription_status='revoked';d.permission_status='default';}
      if(sql.includes('DELETE FROM guardian_devices WHERE device_id=? AND guardian_hash=?'))devices.delete(values[0]);
      if(sql.includes('UPDATE guardian_devices SET device_name=?')){const d=devices.get(values[2]);if(d&&d.guardian_hash===values[3])d.device_name=values[0];else changes=0;}
      if(sql.includes("SET delivery_confirmed_at=?")&&firstNotificationRow){firstNotificationRow.navigation_result=values[1];}
      return{meta:{changes}};
    },
    first:async()=>{
      if(sql.includes('SELECT endpoint,p256dh,auth,locale,consent_receipt_hash,last_test_at FROM subscriptions')&&activeSubscription)return{...activeSubscription};
      if(sql.includes('SELECT guardian_hash FROM subscriptions WHERE endpoint=')&&activeSubscription?.endpoint===values[0])return{guardian_hash:activeSubscription.guardian_hash};
      if(sql.includes('SELECT endpoint_hash FROM subscriptions WHERE endpoint=? AND p256dh=? AND auth=?')&&activeSubscription?.endpoint===values[0]&&activeSubscription.p256dh===values[1]&&activeSubscription.auth===values[2])return{endpoint_hash:'a'.repeat(64)};
      if(sql.includes('SELECT guardian_hash FROM guardian_devices WHERE device_id=')&&devices.has(values[0]))return{guardian_hash:devices.get(values[0]).guardian_hash};
      if(sql.includes('SELECT d.device_id,d.guardian_hash')){
        const d=devices.get(values[0]);if(!d||!activeSubscription||d.device_id!==activeSubscription.device_id||d.guardian_hash!==activeSubscription.guardian_hash)return null;
        return{device_id:d.device_id,guardian_hash:d.guardian_hash,consent_expires_at:d.consent_expires_at,permission_status:d.permission_status,endpoint:activeSubscription.endpoint,p256dh:activeSubscription.p256dh,auth:activeSubscription.auth,locale:activeSubscription.locale,categories:activeSubscription.categories,consent_valid:1,sub_expires:activeSubscription.consent_expires_at};
      }
      if(sql.includes('SELECT endpoint_hash FROM guardian_devices')){const d=devices.get(values[0]);return d&&d.guardian_hash===values[1]?{endpoint_hash:d.endpoint_hash}:null;}
      if(sql.includes('SELECT device_id,device_name,platform,permission_status,subscription_status'))return{results:[...devices.values()].filter(d=>d.guardian_hash===values[0])};
      if(sql.includes('UPDATE first_magical_notification'))return firstNotificationRow&&firstNotificationRow.device_id===values[3]?{meta:{changes:1}}:{meta:{changes:0}};
      return null;
    },
    all:async()=>({results:sql.includes('SELECT device_id,device_name,platform,permission_status,subscription_status')?[...devices.values()].filter(d=>d.guardian_hash===values[0]):[]})
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
const unverified=await request('/v1/consent/verify',{locale:'en-GB',consentReceipt:await receipt({guardianVerified:false})});
assert.equal(unverified.status,403,'browser permission alone cannot count as verified guardian consent');

const blockedSubscribe=await request('/v1/subscribe',{subscription:validSubscription,locale:'en-GB',categories:['recipes'],consentReceipt:validReceipt},{PARENT_CONSENT_MODEL_APPROVED:'false'});
assert.equal(blockedSubscribe.status,503,'subscription creation must remain fail-closed');
const testDevice={deviceId:'syntheticdeviceid_000000000000000000000001',deviceName:'QA Android',platform:'android',permissionStatus:'granted'};
const subscribeBody={subscription:validSubscription,locale:'en-GB',categories:['recipes'],consentReceipt:validReceipt,device:testDevice};
const firstSubscribe=await request('/v1/subscribe',subscribeBody);
assert.equal(firstSubscribe.status,201);
const outOfScopeConsent=await request('/v1/subscribe',{...subscribeBody,consentReceipt:await receipt({deviceManagement:false})});
assert.equal(outOfScopeConsent.status,403,'subscription enrollment requires a receipt explicitly scoped to guardian device management');
let subscriptionWrite=DB.writes.findLast(x=>x.sql.includes('INSERT INTO subscriptions'));
assert.match(subscriptionWrite.sql,/consent_expires_at/);
assert.match(subscriptionWrite.sql,/ON CONFLICT\(endpoint\) DO UPDATE/,'repeat subscriptions update the existing endpoint');
assert.equal(subscriptionWrite.values[7],(now+3600)*1000,'the signed receipt expiry is stored with the subscription');
assert.match(subscriptionWrite.values[1],/^[a-f0-9]{64}$/,'the stored endpoint identifier is a one-way hash');
const renewal=await request('/v1/subscribe',{...subscribeBody,consentReceipt:await receipt({exp:now+7200}),categories:['features']});
assert.equal(renewal.status,201,'a newly verified guardian receipt renews the existing endpoint');
assert.equal(DB.writes.filter(x=>x.sql.includes('INSERT INTO subscriptions')).length,2);
const noDevice=await request('/v1/subscribe',{...subscribeBody,device:null});
assert.equal(noDevice.status,400,'subscription registration requires an explicit device registration');
const expiredSubscribe=await request('/v1/subscribe',{...subscribeBody,consentReceipt:await receipt({exp:now-1})});
assert.equal(expiredSubscribe.status,403,'expired receipt cannot create or renew a subscription');

const remove=await request('/v1/unsubscribe',{endpoint:validSubscription.endpoint});
assert.equal(remove.status,200);
assert.ok(DB.writes.some(x=>x.sql==='DELETE FROM subscriptions WHERE endpoint=?'));
const invalidRemove=await request('/v1/unsubscribe',{endpoint:'http://127.0.0.1/private'});
assert.equal(invalidRemove.status,400,'unsubscribe rejects non-public/non-HTTPS endpoints');
const resubscribe=await request('/v1/subscribe',subscribeBody);
assert.equal(resubscribe.status,201,'an active guardian receipt permits resubscription after unsubscribe');
const deviceList=await request('/v1/guardian/devices',{locale:'en-GB',consentReceipt:validReceipt});
assert.equal(deviceList.status,200);
assert.deepEqual(deviceList.body.devices.map(x=>x.device_id),[testDevice.deviceId],'a guardian sees only registered devices they own');
const renameDevice=await request('/v1/guardian/device/rename',{deviceId:testDevice.deviceId,deviceName:'Aaria QA phone',locale:'en-GB',consentReceipt:validReceipt});
assert.equal(renameDevice.status,200,'a guardian can update the assigned device label');
assert.equal((await request('/v1/guardian/devices',{locale:'en-GB',consentReceipt:validReceipt})).body.devices[0].device_name,'Aaria QA phone');
const noManagementScope=await request('/v1/guardian/devices',{locale:'en-GB',consentReceipt:await receipt({deviceManagement:false})});
assert.equal(noManagementScope.status,403,'device listing requires explicit guardian-management scope');
const heartbeat=await request('/v1/device/heartbeat',{subscription:validSubscription,permissionStatus:'granted'});
assert.equal(heartbeat.status,200,'an active registered device can record a successful contact');
const blockedHeartbeat=await request('/v1/device/heartbeat',{subscription:validSubscription,permissionStatus:'granted'},{PARENT_CONSENT_MODEL_APPROVED:'false'});
assert.equal(blockedHeartbeat.status,503,'device heartbeat remains disabled while guardian-consent approval is false');
const beforeFirst=globalThis.__testPushCalls.length;
const firstMagic=await request('/v1/guardian/device/first-magical',{deviceId:testDevice.deviceId,locale:'en-GB',consentReceipt:validReceipt});
assert.equal(firstMagic.status,202,'the first notification is sent to the selected authorized device');
assert.equal(globalThis.__testPushCalls.length,beforeFirst+1,'the first notification makes one push call');
const firstPayload=JSON.parse(globalThis.__testPushCalls.at(-1)[1]);
assert.equal(firstPayload.title,'✨ Aaria, a magical surprise for you!');
assert.equal(firstPayload.body,'🍜 Your special Tofu & Vegetable Phở recipe from Vietnam is ready! Tap to discover your new cooking adventure! 🌟');
assert.equal(firstPayload.data.route,'/recipe/112','the first notification targets canonical recipe 112');
const duplicateFirst=await request('/v1/guardian/device/first-magical',{deviceId:testDevice.deviceId,locale:'en-GB',consentReceipt:validReceipt});
assert.equal(duplicateFirst.status,409,'the first notification cannot be broadcast or duplicated by a repeated request');
assert.equal(globalThis.__testPushCalls.length,beforeFirst+1);
const recordNavigation=await request('/v1/guardian/device/first-magical-result',{deviceId:testDevice.deviceId,locale:'en-GB',result:'opened_recipe_112',consentReceipt:validReceipt});
assert.equal(recordNavigation.status,200,'guardian-confirmed delivery/navigation evidence can be recorded');
const foreignGuardian=await request('/v1/guardian/device/revoke',{deviceId:testDevice.deviceId,locale:'en-GB',consentReceipt:await receipt({guardianId:'another-guardian-id-for-isolated-tests-0002'})});
assert.equal(foreignGuardian.status,404,'a different guardian cannot revoke a device they do not own');

const disabledTest=await request('/v1/test',{endpoint:validSubscription.endpoint,locale:'en-GB',consentReceipt:validReceipt,route:'/notifications'},{PARENT_CONSENT_MODEL_APPROVED:'false'});
assert.equal(disabledTest.status,503,'test delivery remains disabled until the owner-approved consent model is enabled');
const badTestConsent=await request('/v1/test',{endpoint:validSubscription.endpoint,locale:'en-GB',consentReceipt:await receipt({approved:false}),route:'/notifications'});
assert.equal(badTestConsent.status,403,'test delivery requires a signed, approved guardian receipt');
const badTestRoute=await request('/v1/test',{endpoint:validSubscription.endpoint,locale:'en-GB',consentReceipt:validReceipt,route:'https://evil.example'});
assert.equal(badTestRoute.status,400,'test delivery accepts only allowlisted in-app destinations');
const beforeConfiguredTest=globalThis.__testPushCalls.length;
const testSent=await request('/v1/test',{endpoint:validSubscription.endpoint,locale:'en-GB',consentReceipt:validReceipt,route:'/settings/accessibility/text-size'});
assert.equal(testSent.status,200,'a signed receipt bound to an active subscription can request a test');
assert.equal(globalThis.__testPushCalls.length,beforeConfiguredTest+1);
const sentPayload=JSON.parse(globalThis.__testPushCalls.at(-1)[1]);
assert.equal(sentPayload.data.route,'/settings/accessibility/text-size');
assert.equal(sentPayload.title,'Aaria test notification');
const throttled=await request('/v1/test',{endpoint:validSubscription.endpoint,locale:'en-GB',consentReceipt:validReceipt,route:'/notifications'});
assert.equal(throttled.status,429,'test requests are rate limited per subscription');
assert.equal(globalThis.__testPushCalls.length,beforeConfiguredTest+1,'rate-limited requests do not send a second push');
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
const removedDevice=await request('/v1/guardian/device/revoke',{deviceId:testDevice.deviceId,locale:'pt-BR',consentReceipt:testPt});
assert.equal(removedDevice.status,200,'guardian removal deletes an expired registered device as well as its subscription');
const afterRemoval=await request('/v1/guardian/devices',{locale:'pt-BR',consentReceipt:testPt});
assert.deepEqual(afterRemoval.body.devices,[],'removed devices no longer appear in the guardian dashboard');
console.log('PASS: fail-closed guardian consent, secret-free config, renewal/unsubscribe, localized test push, safe routes, cooldown and expired-endpoint cleanup.');
