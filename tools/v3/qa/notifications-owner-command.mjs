import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {parseOwnerNotificationCommand,OWNER_COMMAND_PREFIX} from '../../../notifications/owner-notification-command.mjs';

const manifest=JSON.parse(await readFile(new URL('../../../manifest.json',import.meta.url),'utf8'));
const valid={id:'v36-feature-2026-11',category:'features',route:'/settings/accessibility/text-size',messages:{
  'en-GB':{title:'✨ Something magical is new!',body:'You can now make recipe text bigger.'},
  'pt-BR':{title:'✨ Uma novidade mágica!',body:'Agora você pode aumentar o texto das receitas.'}
}};
const makeEvent=(value,login='chinkk-git',issue=51)=>({issue:{number:issue},comment:{user:{login},body:OWNER_COMMAND_PREFIX+JSON.stringify(value)}});
const parsed=parseOwnerNotificationCommand(makeEvent(valid),'chinkk-git',manifest);
assert.deepEqual(parsed,valid,'the approved feature route and both localized messages are preserved');
assert.equal('confirmedProduction' in parsed,false,'the owner cannot assert deployment verification in comment data');
const recipes={...valid,id:'new-recipes-nov',category:'recipes',route:'/recipes/new/111,112'};
assert.equal(parseOwnerNotificationCommand(makeEvent(recipes),'chinkk-git',manifest).route,recipes.route);
const country={...valid,id:'japan-nov',category:'countries',route:'/world/JPN'};
assert.equal(parseOwnerNotificationCommand(makeEvent(country),'chinkk-git',manifest).route,country.route);
const updates={...valid,id:'release-notes',category:'updates',route:'/whats-new'};
assert.equal(parseOwnerNotificationCommand(makeEvent(updates),'chinkk-git',manifest).route,'/whats-new');
assert.throws(()=>parseOwnerNotificationCommand(makeEvent(valid,'untrusted-user'),'chinkk-git',manifest),/owner_only_command/);
assert.throws(()=>parseOwnerNotificationCommand(makeEvent(valid,'chinkk-git',52),'chinkk-git',manifest),/wrong_control_tower_issue/);
assert.throws(()=>parseOwnerNotificationCommand(makeEvent({...recipes,route:'/recipes/new/999'}),'chinkk-git',manifest),/recipe_destination_not_in_release_manifest/);
assert.throws(()=>parseOwnerNotificationCommand(makeEvent({...country,route:'/world/XXX'}),'chinkk-git',manifest),/country_destination_not_in_release_manifest/);
assert.throws(()=>parseOwnerNotificationCommand(makeEvent({...valid,route:'/settings/accessibility/text-size',category:'updates'}),'chinkk-git',manifest),/update_destination_not_allowed/);
assert.throws(()=>parseOwnerNotificationCommand(makeEvent({...valid,unexpected:true}),'chinkk-git',manifest),/unexpected_announcement_fields/);
console.log('PASS: owner-only Control Tower command, deployed-manifest recipe/country/feature destinations, bilingual payload, and malformed command rejection.');
