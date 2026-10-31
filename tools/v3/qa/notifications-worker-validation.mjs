import assert from 'node:assert/strict';
import { isPublicHttpsEndpoint, isValidSubscriptionInput } from '../../../notifications-worker/src/validation.js';

const b64url = size => Buffer.alloc(size, 7).toString('base64url');
const valid = {
  subscription: {
    endpoint: 'https://fcm.googleapis.com/fcm/send/test-token',
    keys: { p256dh: b64url(65), auth: b64url(16) }
  },
  locale: 'en-GB',
  categories: ['recipes','updates']
};
assert.equal(isValidSubscriptionInput(valid), true);
assert.equal(isPublicHttpsEndpoint('http://fcm.googleapis.com/send/token'), false);
assert.equal(isPublicHttpsEndpoint('https://localhost/send/token'), false);
assert.equal(isPublicHttpsEndpoint('https://127.0.0.1/send/token'), false);
assert.equal(isPublicHttpsEndpoint('https://user:pass@push.example.com/send/token'), false);
assert.equal(isPublicHttpsEndpoint('https://push.example.com:8443/send/token'), false);
assert.equal(isPublicHttpsEndpoint('https://push.example.com/send/token#fragment'), false);
assert.equal(isValidSubscriptionInput({...valid, subscription:{...valid.subscription, keys:{p256dh:b64url(64),auth:b64url(16)}}}), false);
assert.equal(isValidSubscriptionInput({...valid, categories:['recipes','recipes']}), false);
assert.equal(isValidSubscriptionInput({...valid, categories:['unknown']}), false);
assert.equal(isValidSubscriptionInput({...valid, locale:'en-US'}), false);
console.log('Worker subscription validation accepts standard HTTPS push endpoints and rejects malformed endpoints, keys, locales, and categories.');
