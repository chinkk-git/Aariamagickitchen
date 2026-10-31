import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
const read=path=>readFile(new URL(path,import.meta.url),'utf8');
const [manifestText,sw,adapter,client,push,worker,migration]=await Promise.all([
  read('../../../manifest.webmanifest'),read('../../../sw.js'),read('../../../browser-adapters.js'),
  read('../../../js/notifications-v36.js'),read('../../../js/notifications-push-v36.js'),
  read('../../../notifications-worker/src/index.js'),read('../../../notifications-worker/migrations/0004_guardian_devices_first_notification.sql')
]);
const manifest=JSON.parse(manifestText);
assert.equal(manifest.id,'./','the installed PWA id stays unchanged');
assert.equal(manifest.scope,'./','the installed PWA scope stays unchanged');
assert.equal(manifest.start_url,'./index.html','the installed PWA start URL stays unchanged');
assert.equal(manifest.name,"Aaria's Magical Kitchen");
assert.match(sw,/aaria-web-v3\.5-85f537591449-r2/,'upgrade uses the existing adapter cache identity');
assert.ok(sw.includes("self.skipWaiting()")&&sw.includes('self.clients.claim()'),'the existing service-worker registration upgrades in place');
const activation=sw.slice(sw.indexOf("addEventListener('activate'"),sw.indexOf("addEventListener('fetch'"));
assert.ok(!sw.includes('caches.delete(')&&!activation.includes('client.navigate('),'activation never deletes the prior shell or forcibly reloads open apps');
assert.ok(sw.includes('./js/notifications-v36.js')&&sw.includes('./js/notifications-push-v36.js')&&sw.includes('./browser-adapters.js'),'updated shell caches notifications in the existing app');
assert.ok(adapter.includes("navigator.serviceWorker.register('./sw.js', { scope: './', updateViaCache: 'none' })"));
assert.ok(!adapter.includes('caches.delete(')&&adapter.includes('Restart now')&&adapter.includes("location.reload()"),'restart is user controlled and app data is not cleared');
assert.ok(!adapter.includes('localStorage.clear')&&!sw.includes('localStorage.clear')&&!sw.includes('indexedDB.deleteDatabase'));
assert.ok(client.includes("safe.startsWith('/recipe/')")&&client.includes("go('/world/VNM')"),'recipe 112 has the Vietnam fallback');
assert.ok(push.includes('DEVICE_ID_KEY')&&push.includes('localStorage.setItem(DEVICE_ID_KEY'),'the existing install receives a stable device ID without resetting other preferences');
assert.ok(worker.includes('guardianVerified!==true')&&worker.includes('guardianId')&&worker.includes('deviceManagement===true'),'device management requires a signed verified-guardian claim');
assert.ok(worker.includes("url.pathname==='/v1/guardian/device/first-magical'")&&worker.includes("'/recipe/112'"),'first notification is a selected-device message to canonical recipe 112');
assert.ok(migration.includes('CREATE TABLE guardian_devices')&&migration.includes('CREATE TABLE first_magical_notification'));
console.log('PASS: stable PWA identity/scope/start URL, compatible in-place service-worker cache, no data clearing or forced restart, guardian device registration, recipe 112 destination and Vietnam fallback.');
