import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const html = await readFile(new URL('../../index.html', import.meta.url), 'utf8');
const head = html.match(/<head>([\s\S]*?)<\/head>/i)?.[1];
assert.ok(head, 'Metadata must be present in the initial HTML head');

const tags = [...head.matchAll(/<meta\b[^>]*>/gi)].map(match => match[0]);
function content(attribute, name) {
  const tag = tags.find(item => new RegExp('(?:^|\\s)' + attribute + '=["\\']' + name.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&') + '["\\']', 'i').test(item));
  assert.ok(tag, `Missing ${attribute}=${name} in server-delivered head`);
  const match = tag.match(/(?:^|\s)content=["']([^"']*)["']/i);
  assert.ok(match, `Missing content for ${name}`);
  return match[1];
}

const expected = {
  'property|og:title': "Aaria's Magical Kitchen",
  'property|og:description': 'Discover a magical world of cooking adventures!',
  'property|og:type': 'website',
  'property|og:url': 'https://chinkk-git.github.io/Aariamagickitchen/',
  'property|og:image': 'https://chinkk-git.github.io/Aariamagickitchen/aaria-pwa-icon-512.png',
  'property|og:image:width': '512',
  'property|og:image:height': '512',
  'name|twitter:card': 'summary_large_image',
  'name|twitter:title': "Aaria's Magical Kitchen",
  'name|twitter:description': 'Discover a magical world of cooking adventures!',
  'name|twitter:image': 'https://chinkk-git.github.io/Aariamagickitchen/aaria-pwa-icon-512.png'
};
for (const [key, value] of Object.entries(expected)) {
  const [attribute, name] = key.split('|');
  assert.equal(content(attribute, name), value, `Incorrect ${name}`);
}

const imageUrl = new URL(expected['property|og:image']);
assert.equal(imageUrl.protocol, 'https:');
assert.equal(imageUrl.href, 'https://chinkk-git.github.io/Aariamagickitchen/aaria-pwa-icon-512.png');

const installUrl = new URL('?install=1', expected['property|og:url']);
assert.equal(installUrl.origin + installUrl.pathname, expected['property|og:url']);

const response = await fetch(imageUrl);
assert.equal(response.status, 200, 'Official icon must be publicly accessible');
assert.match(response.headers.get('content-type') || '', /^image\/png(?:;|$)/i);
const bytes = Buffer.from(await response.arrayBuffer());
assert.equal(bytes.subarray(0, 8).toString('hex'), '89504e470d0a1a0a', 'OG image must be a valid PNG');
assert.equal(bytes.readUInt32BE(16), 512, 'OG image width must match metadata');
assert.equal(bytes.readUInt32BE(20), 512, 'OG image height must match metadata');
console.log('Open Graph/Twitter metadata and public 512x512 official icon checks passed.');
