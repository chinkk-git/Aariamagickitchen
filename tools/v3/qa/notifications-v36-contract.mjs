import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
const client=await readFile(new URL('../../js/notifications-v36.js',import.meta.url),'utf8');
const sw=await readFile(new URL('../../sw.js',import.meta.url),'utf8');
assert.match(client,/PushManager/);assert.match(client,/safeRoute/);assert.match(client,/consentNeeded/);assert.match(client,/aaria:open-text-size/);
assert.match(sw,/addEventListener\('push'/);assert.match(sw,/notificationclick/);assert.match(sw,/AARIA_NOTIFICATION_OPEN/);
assert.doesNotMatch(client,/https?:\\/\\/[^'" ]+\/v1\/publish/);
console.log('Notification route, consent gate, service-worker handlers and no client publisher secret are present.');
