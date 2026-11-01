import assert from 'node:assert/strict';
import worker from '../../../notifications-worker/src/index.js';

function queueDatabase(permissionStatus){
  let deliveryStatus='queued';
  const expires=Date.now()+60_000;
  const row={
    announcement_id:'test-announcement',
    endpoint_hash:'a'.repeat(64),
    category:'recipes',
    attempts:0,
    payload:JSON.stringify({id:'test-announcement',route:'/recipes/new/111',messages:{'en-GB':{title:'Approved test recipe',body:'A new recipe is ready.'}}}),
    endpoint:'https://fcm.googleapis.com/fcm/send/isolated-test-endpoint',
    p256dh:'test-p256dh',
    auth:'test-auth',
    locale:'en-GB',
    categories:'["recipes"]',
    consent_valid:1,
    consent_expires_at:expires,
    device_permission_status:permissionStatus,
    device_subscription_status:'active',
    device_consent_expires_at:expires
  };
  return {
    get deliveryStatus(){return deliveryStatus;},
    prepare(sql){return{bind(){return{
      run:async()=>{
        if(sql.includes("SET status='sending'"))deliveryStatus='sending';
        if(sql.includes("SET status='skipped'"))deliveryStatus='skipped';
        if(sql.includes("SET status='sent'"))deliveryStatus='sent';
        return{meta:{changes:1}};
      },
      first:async()=>{
        if(sql.includes('SELECT d.announcement_id,d.endpoint_hash'))return{...row,attempts:1};
        if(sql.includes('SELECT fanout_complete,fanout_errors'))return{fanout_complete:1,fanout_errors:0};
        if(sql.includes('SELECT SUM(status='))return{sent:deliveryStatus==='sent'?1:0,failed:0,removed:0,skipped:deliveryStatus==='skipped'?1:0,active:0};
        return null;
      },
      all:async()=>({results:[]})
    };}}},
    batch:async statements=>Promise.all(statements.map(s=>s.run()))
  };
}
async function dispatch(permissionStatus,parentConsentApproved){
  globalThis.__testPushCalls=[];
  const DB=queueDatabase(permissionStatus);
  const env={DB,PARENT_CONSENT_MODEL_APPROVED:parentConsentApproved?'true':'false',VAPID_PUBLIC_KEY:'test-public',VAPID_PRIVATE_KEY:'test-private',VAPID_SUBJECT:'mailto:qa@example.test'};
  const message={body:{kind:'deliver',deliveryId:'test-announcement:'+('a'.repeat(64))},retry(){}};
  await worker.queue({queue:'aaria-notification-delivery',messages:[message]},env);
  return{DB,pushCount:globalThis.__testPushCalls.length};
}
const disabled=await dispatch('granted',false);
assert.equal(disabled.pushCount,0,'queued work cannot send while the consent switch is disabled');
assert.equal(disabled.DB.deliveryStatus,'skipped');
const denied=await dispatch('denied',true);
assert.equal(denied.pushCount,0,'a device with denied OS permission cannot receive queued work');
assert.equal(denied.DB.deliveryStatus,'skipped');
const allowed=await dispatch('granted',true);
assert.equal(allowed.pushCount,1,'approved active device with granted OS permission can receive queued work');
assert.equal(allowed.DB.deliveryStatus,'sent');
console.log('PASS: queued delivery rechecks global consent and device permission.');
