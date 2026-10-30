import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';

const runtime = await readFile(new URL('./runtime.js', import.meta.url), 'utf8');
const production = await readFile(new URL('../../js/03-aaria-v3-layer.7e7cb86154e0.js', import.meta.url), 'utf8').catch(async () =>
  readFile(new URL('../../js/03-aaria-v3-layer.c2c6fc71d8ad.js', import.meta.url), 'utf8'));
const activity = await readFile(new URL('../../phase2-pilot/apps/aaria-android/app/src/main/java/com/aaria/magickitchen/pilot/MainActivity.kt', import.meta.url), 'utf8');
const profile = JSON.parse(await readFile(new URL('../../phase2-pilot/tools/recipe-pipeline/release-profile.json', import.meta.url), 'utf8'));

assert.equal(profile.photoPost.parentConfirmationBeforeExternalShare, true);
const cameraFlow = runtime.slice(runtime.indexOf('cookShareSection=function v3CookShareSection'), runtime.indexOf('const v3OriginalShareCook'));
assert.ok(cameraFlow.includes('capture="environment"'), 'Android photo input must request the device camera');
assert.ok(cameraFlow.includes('v3-hidden-camera-input'), 'Android camera input must remain hidden behind the camera action');
assert.ok(cameraFlow.includes('data-action="save-cook-photo"'), 'Save Photo must be an explicit separate action');

function shareBlock(source) {
  const start = source.indexOf('shareCook=async function v3ShareCook(id){');
  const end = source.indexOf('async function v3ShowGroceryRecipients', start);
  assert.ok(start >= 0 && end > start, 'Photo share handler must be present');
  return source.slice(start, end);
}
const share = shareBlock(runtime);
const productionShare = shareBlock(production);
for (const source of [share, productionShare]) {
  assert.match(source, /navigator\.canShare\(\{files:\[file\]\}\)/);
  assert.match(source, /navigator\.share\(shareData\)/);
  assert.match(source, /new File\(\[blob\],filename,\{type:mimeType\}\)/);
  assert.match(source, /e\?\.name==='AbortError'\)return/);
  assert.match(source, /Photo sharing is not supported in this browser/);
  assert.doesNotMatch(source, /\.download=|copyText\(/, 'Share Photo must never silently download or substitute text');
}
assert.match(runtime, /function v3SaveCookPhoto\(id\)/);
assert.match(runtime, /a\.download=\`aaria-\$\{slug\}\.\$\{extension\}\`/);
assert.match(runtime, /data-action==='save-cook-photo'\)\{v3SaveCookPhoto/);

// Exercise the supported browser path with a mock native share API.
class FakeFile {
  constructor(parts, name, options) { this.parts = parts; this.name = name; this.type = options.type; }
}
function contextFor(overrides = {}) {
  const notices = [], shared = [], downloads = [];
  const context = {
    sharePostBlobs: { 7: new Blob(['captured photo'], { type: 'image/jpeg' }) },
    sharePostUrls: { 7: 'blob:preview' },
    find: () => ({ title: 'Rainbow Toast' }),
    window: {},
    navigator: { canShare: () => true, share: async payload => shared.push(payload), ...overrides.navigator },
    File: FakeFile,
    FileReader: class {},
    translateText: text => text,
    t: text => text,
    notice: message => notices.push(message),
    console: { warn() {} },
    document: {
      createElement: () => { const link = { click() { downloads.push(link); }, remove() {} }; return link; },
      body: { append() {} }
    },
    URL: { createObjectURL: () => 'blob:save', revokeObjectURL() {} },
    setTimeout: callback => callback(),
    shareSourcePhotos: {},
    downloads, notices, shared
  };
  return context;
}
const functionSource = share.match(/shareCook=(async function v3ShareCook\(id\)\{[\s\S]*?\n\});/);
assert.ok(functionSource, 'Share Photo handler must be extractable for focused behavior checks');
const supported = contextFor();
const sharePhoto = runInNewContext(`(${functionSource[1]})`, supported);
await sharePhoto(7);
assert.equal(supported.shared.length, 1, 'Supported share must invoke the OS share API');
assert.equal(supported.shared[0].files.length, 1, 'The share payload must contain the image file');
assert.equal(supported.shared[0].files[0].name, 'aaria-rainbow-toast.jpg');
assert.equal(supported.shared[0].files[0].type, 'image/jpeg');
assert.equal(supported.shared[0].files[0].parts[0], supported.sharePostBlobs[7]);
assert.equal(supported.downloads.length, 0, 'Share must not trigger a download');

// Dismissing the native share sheet is a safe cancellation.
const cancelled = contextFor({ navigator: { share: async () => { const error = new Error('cancelled'); error.name = 'AbortError'; throw error; } } });
await runInNewContext(`(${functionSource[1]})`, cancelled)(7);
assert.equal(cancelled.notices.length, 0, 'Cancellation must return quietly');
assert.equal(cancelled.downloads.length, 0);

// Unsupported file sharing explains the limitation and offers the separate Save Photo control.
const unsupported = contextFor({ navigator: { canShare: () => false } });
await runInNewContext(`(${functionSource[1]})`, unsupported)(7);
assert.equal(unsupported.shared.length, 0);
assert.match(unsupported.notices[0], /not supported/i);
assert.equal(unsupported.downloads.length, 0, 'Unsupported sharing must not silently download');

// The independent Save Photo action is the only flow that downloads an image.
const saveMatch = runtime.match(/function v3SaveCookPhoto\(id\)\{[\s\S]*?\n\}/);
assert.ok(saveMatch, 'Save Photo handler must be present');
const saveCtx = contextFor();
saveCtx.shareSourcePhotos[7] = new Blob(['captured photo'], { type: 'image/jpeg' });
const savePhoto = runInNewContext(`(${saveMatch[0]})`, saveCtx);
savePhoto(7);
assert.equal(saveCtx.downloads.length, 1);
assert.equal(saveCtx.downloads[0].download, 'aaria-rainbow-toast.jpg');

assert.match(activity, /keyguard\.createConfirmDeviceCredentialIntent\(/);
assert.match(activity, /ParentShareAuthorizationPolicy\.canRequest\(/);
assert.match(activity, /ParentShareAuthorizationPolicy\.canDispatch\(/);
assert.match(activity, /fun sharePost\(dataUrl: String, title: String\): Boolean[\s\S]*?requestParentApprovedShare\(bytes, mimeType, title\)/);
assert.match(activity, /Intent\.ACTION_SEND[\s\S]*?Intent\.EXTRA_STREAM/);
console.log('Focused photo-sharing checks passed: native image-file share, quiet cancellation, explicit save, and Android parent gate.');
