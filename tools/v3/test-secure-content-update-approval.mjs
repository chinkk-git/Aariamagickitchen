import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const activity = await readFile(new URL('../../phase2-pilot/apps/aaria-android/app/src/main/java/com/aaria/magickitchen/pilot/MainActivity.kt', import.meta.url), 'utf8');
const policy = await readFile(new URL('../../phase2-pilot/apps/aaria-android/app/src/main/java/com/aaria/magickitchen/pilot/ParentUpdateAuthorizationPolicy.kt', import.meta.url), 'utf8');
const repository = await readFile(new URL('../../phase2-pilot/apps/aaria-android/app/src/main/java/com/aaria/magickitchen/pilot/AndroidContentPackRepository.kt', import.meta.url), 'utf8');

assert.match(activity, /internal fun confirmParentContentUpdate\([\s\S]*?keyguard\.isDeviceSecure/);
assert.match(activity, /internal fun confirmParentContentUpdate\([\s\S]*?createConfirmDeviceCredentialIntent\([\s\S]*?parentUpdateRequest/);
assert.match(activity, /\.setPositiveButton\("Continue"\)[\s\S]*?pending\.dialogApproved\.set\(true\)[\s\S]*?startActivityForResult\(credentialPrompt, parentUpdateRequest\)/);
assert.match(activity, /if \(requestCode == parentUpdateRequest\)[\s\S]*?ParentUpdateAuthorizationPolicy\.canApprove/);
assert.match(activity, /ParentUpdateAuthorizationPolicy\.canActivate\([\s\S]*?activityForeground = isForegroundForApproval[\s\S]*?activityAlive = !isFinishing && !isDestroyed/);
assert.match(policy, /credentialResult == successResult && parentDialogApproved && activityAlive/);
assert.match(policy, /dialogApproved && credentialApproved && activityForeground && activityAlive/);
assert.match(repository, /activateAfterParentConfirmation\(parentApproval\(pack\.version, pack\.files\.size\)\)/);

console.log('Content updates require parent-dialog approval, successful device-credential confirmation, and a live foreground activity.');
