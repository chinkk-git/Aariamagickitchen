import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const runtime = await readFile(new URL('./runtime.js', import.meta.url), 'utf8');
const activity = await readFile(new URL('../../phase2-pilot/apps/aaria-android/app/src/main/java/com/aaria/magickitchen/pilot/MainActivity.kt', import.meta.url), 'utf8');
const profile = JSON.parse(await readFile(new URL('../../phase2-pilot/tools/recipe-pipeline/release-profile.json', import.meta.url), 'utf8'));

assert.equal(profile.photoPost.parentConfirmationBeforeExternalShare, true);
const cameraFlow = runtime.slice(runtime.indexOf('cookShareSection=function v3CookShareSection'), runtime.indexOf('const v3OriginalShareCook'));
assert.ok(cameraFlow.includes('capture="environment"'), 'Android photo input must request the device camera');
assert.ok(cameraFlow.includes('.replace(/<label class="cook-photo-pick">🖼️ Choose a dish photo'), 'gallery/picker control must be removed from the Android recipe flow');
assert.ok(cameraFlow.includes('v3-hidden-camera-input'), 'Android camera input must remain hidden behind the camera action');
const nativeShare = runtime.slice(runtime.indexOf('shareCook=async function v3ShareCook'), runtime.indexOf('async function v3ShowGroceryRecipients'));
assert.match(nativeShare, /window\.AariaNative\.sharePost\(String\(data\),caption\)/);
assert.match(nativeShare, /Sharing could not be started\. Ask a parent or guardian for help\./);
assert.match(nativeShare, /a\.download=`aaria-/);
assert.match(nativeShare, /Photo saved on this device\. Ask a parent or guardian to share it\./);
assert.doesNotMatch(nativeShare, /v3OriginalShareCook\(id\)|navigator\.share|window\.confirm\(/, 'browser fallback must not open another app without enforceable adult approval');
assert.match(activity, /keyguard\.createConfirmDeviceCredentialIntent\(/);
assert.match(activity, /ParentShareAuthorizationPolicy\.canRequest\(/);
assert.match(activity, /ParentShareAuthorizationPolicy\.canDispatch\(/);
assert.match(activity, /if \(requestCode == parentShareRequest\)[\s\S]*?pending\?\.let\(::shareParentApprovedPhoto\)/);
assert.match(activity, /fun sharePost\(dataUrl: String, title: String\): Boolean[\s\S]*?requestParentApprovedShare\(bytes, mimeType, title\)/);
console.log('External photo sharing requires parent approval; Android also requires successful device-credential confirmation.');
