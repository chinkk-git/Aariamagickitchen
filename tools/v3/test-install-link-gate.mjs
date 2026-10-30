import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {runInNewContext} from 'node:vm';

const html = await readFile(new URL('../../index.html', import.meta.url), 'utf8');
const source = await readFile(new URL('../../js/install-link-gate.js', import.meta.url), 'utf8');
const css = await readFile(new URL('../../install-link-gate.css', import.meta.url), 'utf8');
const head = html.match(/<head>([\s\S]*?)<\/head>/i)?.[1] || '';
const body = html.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] || '';

assert.match(head, /install-link-gate\.css/);
assert.match(head, /install-link-gate\.js/);
assert.match(head, /og:image" content="https:\/\/chinkk-git\.github\.io\/Aariamagickitchen\/aaria-pwa-icon-512\.png"/);
assert.ok(head.includes('install-link-gate.js'), 'Gate script must be loaded from the initial head before body/app startup');
assert.ok(body.indexOf('id="install-link-gate"') < body.indexOf('id="v34-welcome-boot"'), 'Install screen must precede Palace Welcome');
assert.match(body, /src="\.\/aaria-pwa-icon-512\.png"/);
for (const label of ["Aaria's Magical Kitchen", 'Install App', 'Continue in Browser']) assert.ok(body.includes(label));
assert.match(css, /html\.install-gate-active body > :not\(#install-link-gate\)/);

function run({search='?install=1', ua='Android Chrome', standalone=false, platform='Linux armv8l'} = {}) {
  const listeners = {};
  const buttons = {};
  const classes = new Set();
  const gate = {hidden: true};
  const instructions = {hidden: true, textContent: ''};
  for (const id of ['install-link-install', 'install-link-continue']) {
    buttons[id] = {textContent: id === 'install-link-install' ? 'Install App' : 'Continue in Browser', events: {}, addEventListener(name, fn) { this.events[name] = fn; }};
  }
  const location = {href: 'https://chinkk-git.github.io/Aariamagickitchen/' + search + '#aria/home'};
  const document = {
    readyState: 'loading',
    documentElement: {classList: {add: value => classes.add(value), remove: value => classes.delete(value)}},
    addEventListener(name, fn) { listeners['document:' + name] = fn; },
    getElementById(id) { return id === 'install-link-gate' ? gate : id === 'install-link-instructions' ? instructions : buttons[id]; }
  };
  const window = {
    location,
    history: {state: null, replaceState(_state, _title, path) { this.path = path; location.href = 'https://chinkk-git.github.io' + path; }},
    matchMedia: () => ({matches: standalone}),
    addEventListener(name, fn) { listeners['window:' + name] = fn; }
  };
  const navigator = {userAgent: ua, platform, maxTouchPoints: 0, standalone};
  runInNewContext(source, {window, document, navigator, URL, URLSearchParams});
  return {listeners, buttons, classes, gate, instructions, location, window};
}

const direct = run();
assert.ok(direct.classes.has('install-gate-active'), 'Direct ?install=1 must activate gate before DOM ready');
direct.listeners['document:DOMContentLoaded']();
assert.equal(direct.gate.hidden, false);
assert.equal(direct.buttons['install-link-install'].textContent, 'Install App');
await direct.buttons['install-link-continue'].events.click();
assert.ok(!direct.classes.has('install-gate-active'));
assert.ok(direct.window.history.path.startsWith('/Aariamagickitchen/#aria/home'), 'Continue must remove install query and preserve app route');

const supported = run();
supported.listeners['document:DOMContentLoaded']();
let promptCalled = false, prevented = false;
supported.listeners['window:beforeinstallprompt']({
  preventDefault() { prevented = true; },
  async prompt() { promptCalled = true; },
  userChoice: Promise.resolve({outcome: 'accepted'})
});
await supported.buttons['install-link-install'].events.click();
assert.equal(prevented, true, 'beforeinstallprompt must be captured');
assert.equal(promptCalled, true, 'Install tap must invoke the captured prompt');

const ios = run({ua:'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) Version/18.0 Mobile Safari', platform:'iPhone'});
ios.listeners['document:DOMContentLoaded']();
await ios.buttons['install-link-install'].events.click();
assert.match(ios.instructions.textContent, /Safari, then tap Share → Add to Home Screen/);

const inApp = run({ua:'Mozilla/5.0 (Linux; Android 15) AppleWebKit WhatsApp'});
inApp.listeners['document:DOMContentLoaded']();
await inApp.buttons['install-link-install'].events.click();
assert.match(inApp.instructions.textContent, /in-app browser/);
assert.match(inApp.instructions.textContent, /Open in browser/);
assert.match(inApp.instructions.textContent, /Install app or Add to Home screen/);

const installed = run({standalone:true});
installed.listeners['document:DOMContentLoaded']();
assert.equal(installed.buttons['install-link-install'].textContent, 'Open App');
await installed.buttons['install-link-install'].events.click();
assert.ok(!installed.classes.has('install-gate-active'));

const normal = run({search:''});
assert.ok(!normal.classes.has('install-gate-active'), 'Normal production URL must not show the install gate');
console.log('Focused install-link checks passed: early query gate, browser continuation, prompt capture, iOS/in-app instructions, and standalone Open App.');
