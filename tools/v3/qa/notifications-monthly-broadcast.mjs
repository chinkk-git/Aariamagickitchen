import assert from 'node:assert/strict';
import {webcrypto} from 'node:crypto';
import worker from '../../../notifications-worker/src/index.js';

const originalNow=Date.now;
const rows=new Map();
const queued=[];
const db={
  prepare(sql){
    return {bind(...values){return{
      run:async()=>{
        if(sql.startsWith('INSERT OR IGNORE INTO announcements')){
          const [id,releaseSha,status,payload,fanoutCursor,createdAt,monthStart,monthEnd]=values;
          if(rows.has(id))return{meta:{changes:0}};
          const occupied=[...rows.values()].some(row=>row.created_at>=monthStart&&row.created_at<monthEnd);
          if(occupied)return{meta:{changes:0}};
          rows.set(id,{id,release_sha:releaseSha,status,payload,fanout_cursor:fanoutCursor,fanout_complete:0,created_at:createdAt});
          return{meta:{changes:1}};
        }
        if(sql.startsWith("UPDATE announcements SET status='queued'")){
          const row=rows.get(values[0]);if(row&&row.status==='pending')row.status='queued';
          return{meta:{changes:row?1:0}};
        }
        throw new Error('Unexpected SQL in monthly-limit test');
      },
      first:async()=>{
        if(sql.startsWith('SELECT release_sha,status,fanout_cursor,fanout_complete FROM announcements WHERE id=?'))return rows.get(values[0])||null;
        throw new Error('Unexpected SELECT in monthly-limit test');
      }
    }}}
  }
};
const env={ADMIN_TOKEN:'test-owner-token',PARENT_CONSENT_MODEL_APPROVED:'true',DB:db,DELIVERY_QUEUE:{send:async value=>queued.push(value)},VAPID_PUBLIC_KEY:'public',VAPID_PRIVATE_KEY:'private',VAPID_SUBJECT:'mailto:test@example.invalid',NOTIFICATION_API_LIMITER:{limit:async()=>({success:true})}};
const base={category:'features',route:'/settings/accessibility/text-size',releaseSha:'a'.repeat(40),confirmedProduction:true,approvedGuardianConsentModel:true,messages:{'en-GB':{title:'Aaria update',body:'A new accessible feature is ready.'},'pt-BR':{title:'Novidade Aaria',body:'Um novo recurso acessível está disponível.'}}};
async function post(id,token='test-owner-token'){
  const body=JSON.stringify({...base,id});
  return worker.fetch(new Request('https://worker.example/v1/publish',{method:'POST',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json','CF-Connecting-IP':'192.0.2.20'},body}),env);
}

try{
  Date.now=()=>Date.UTC(2026,10,15,12);
  const first=await post('monthly-2026-11-a');
  assert.equal(first.status,202,'the first owner announcement in a UTC calendar month is queued');
  assert.equal(queued.length,1);
  const duplicate=await post('monthly-2026-11-a');
  assert.equal(duplicate.status,202,'retrying the same announcement ID is idempotent');
  assert.equal((await duplicate.json()).duplicate,true);
  assert.equal(queued.length,1,'an idempotent retry does not enqueue a duplicate');
  const blocked=await post('monthly-2026-11-b');
  assert.equal(blocked.status,429,'a second broadcast in the same month is rejected');
  assert.equal((await blocked.json()).error,'monthly_broadcast_limit_reached');
  assert.equal(queued.length,1,'a monthly-cap rejection is never queued');
  const unauthorized=await post('monthly-2026-11-c','wrong-token');
  assert.equal(unauthorized.status,401,'unauthorized send attempts are rejected');
  assert.equal(queued.length,1);
  const consentOff=await worker.fetch(new Request('https://worker.example/v1/publish',{method:'POST',headers:{Authorization:'Bearer test-owner-token','Content-Type':'application/json','CF-Connecting-IP':'192.0.2.20'},body:JSON.stringify({...base,id:'monthly-consent-off'})}),{...env,PARENT_CONSENT_MODEL_APPROVED:'false'});
  assert.equal(consentOff.status,503,'broadcasts remain blocked while guardian approval is false');
  assert.equal(queued.length,1);
  Date.now=()=>Date.UTC(2026,11,1,0,0,0);
  const nextMonth=await post('monthly-2026-12-a');
  assert.equal(nextMonth.status,202,'a new UTC calendar month permits one new approved broadcast');
  assert.equal(queued.length,2);
  console.log('PASS: one authenticated owner broadcast per UTC calendar month, same-ID idempotency, consent gate, and no enqueue on rejection.');
}finally{Date.now=originalNow;}
