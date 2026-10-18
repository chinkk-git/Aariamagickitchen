#!/usr/bin/env node
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const root = path.resolve(here, '../..');
const input = path.resolve(process.argv[2] || path.join(root, 'index.html'));
const output = path.resolve(process.argv[3] || path.join(root, 'dist', 'index.html'));
const html = fs.readFileSync(input, 'utf8');
const marker = 'AARIA_V3_BUILD_2026_10';
if (html.includes(marker)) throw new Error('Input already contains the V3 build layer. Start from production index.html.');

function readAsset(name) {
  const value = fs.readFileSync(path.join(here, 'artwork', name), 'utf8').replace(/\s/g, '');
  if (!/^[A-Za-z0-9+/]+={0,2}$/.test(value)) throw new Error(`Invalid base64 artwork: ${name}`);
  return `data:image/webp;base64,${value}`;
}

const art = Object.fromEntries([78, 89, 93, 94].map(id => [id, {
  atlas: readAsset(`recipe-${id}-storyboard.webp.b64`),
  hero: readAsset(`recipe-${id}-hero.webp.b64`),
  aspect: id === 94 ? 412 / 624 : 502 / 507
}]));
const ingredientAtlas = readAsset('ingredients-storybook-atlas.webp.b64');
const profileArt = {
  chefA: readAsset('approved-chef-a.webp.b64'),
  chefB: readAsset('approved-chef-b.webp.b64')
};

const styles = String.raw`
/* ${marker} */
:root{--v3-ink:#34264f;--v3-plum:#4e376c;--v3-berry:#b43b7a;--v3-mint:#318d79;--v3-sky:#ddecf8;--v3-lav:#f5f0fb;--v3-paper:#fffdf8;--v3-gold:#f0c24b;--v3-line:#e7ddec;--v3-shadow:0 8px 24px #39285412}
html,body{min-height:100%;background:#f8f5fb;color:var(--v3-ink)}
.app{background:#f8f5fb}
.app.home-dashboard{background:linear-gradient(180deg,#f1ebfa 0,#fbf9fd 360px,#f8f5fb 100%)}
.page{padding:clamp(14px,3vw,28px);padding-bottom:calc(100px + env(safe-area-inset-bottom));max-width:1240px;margin:0 auto}
.bottom{height:68px;min-height:68px;padding:6px 10px calc(6px + env(safe-area-inset-bottom));gap:4px;background:#fffdfa;border-top:1px solid #eadff0;box-shadow:0 -5px 20px #39285412;z-index:120}
.bottom .tab{min-width:0;min-height:48px;border-radius:16px;padding:4px 6px;font-size:12px;line-height:1.15;font-weight:800;color:#685b78;gap:2px}
.bottom .tab b{font-size:20px;line-height:1.1}
.bottom .tab.active{background:#efe7f8;color:#6849a1}
.nav-reopen{display:none!important}
#screen.home-page{padding:clamp(12px,3vw,28px);padding-bottom:calc(92px + env(safe-area-inset-bottom));max-width:1240px}
.v3-home{display:grid;gap:18px;margin:0 auto;max-width:1120px}
.v3-home-top{display:flex;align-items:center;justify-content:space-between;gap:12px}
.v3-brand{display:flex;align-items:center;gap:10px;color:var(--v3-plum);font-weight:950;font-size:clamp(17px,2.4vw,23px);line-height:1.1}
.v3-brand-mark{display:grid;place-items:center;width:42px;height:42px;border-radius:14px;background:#fff;box-shadow:var(--v3-shadow);font-size:24px}
.v3-brand small{display:block;margin-top:3px;font-size:11px;font-weight:700;color:#776a83;letter-spacing:.02em}
.v3-settings{width:44px;height:44px;border:1px solid var(--v3-line);border-radius:15px;background:#fff;font-size:21px}
.v3-hero{position:relative;display:grid;grid-template-columns:minmax(0,1.25fr) minmax(180px,.75fr);align-items:center;gap:14px;overflow:hidden;padding:clamp(20px,4vw,38px);border:1px solid #e9ddec;border-radius:28px;background:linear-gradient(115deg,#fffdf8 0%,#f7eafa 53%,#e7f4fa 100%);box-shadow:var(--v3-shadow)}
.v3-hero-copy{position:relative;z-index:1;max-width:580px}
.v3-eyebrow{display:inline-flex;align-items:center;gap:6px;margin-bottom:9px;color:var(--v3-berry);font-size:11px;font-weight:950;letter-spacing:.1em;text-transform:uppercase}
.v3-hero h1{margin:0;color:var(--v3-ink);font-size:clamp(28px,5vw,48px);line-height:1.05;letter-spacing:-.035em}
.v3-hero p{max-width:480px;margin:10px 0 18px;color:#625674;font-size:clamp(14px,2vw,17px);line-height:1.45}
.v3-primary{min-height:48px;padding:0 18px;border:0;border-radius:15px;background:#6748a0;color:white;font:inherit;font-size:15px;font-weight:900;box-shadow:0 5px 0 #4e367b;cursor:pointer}
.v3-hero-art{display:grid;place-items:center;min-height:168px}
.v3-hero-avatar{width:min(100%,250px);height:clamp(160px,23vw,250px);object-fit:contain;filter:drop-shadow(0 8px 10px #57417524)}
.v3-progress{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}
.v3-progress-card{display:flex;align-items:center;gap:10px;min-width:0;padding:12px 14px;border:1px solid var(--v3-line);border-radius:18px;background:#fff;box-shadow:var(--v3-shadow)}
.v3-progress-card>span{font-size:23px}
.v3-progress-card strong{display:block;font-size:14px;line-height:1.15}
.v3-progress-card small{display:block;margin-top:3px;color:#776d82;font-size:11px;line-height:1.2}
.v3-section-head{display:flex;align-items:end;justify-content:space-between;gap:8px;margin:2px 0 -6px}
.v3-section-head h2{margin:0;color:var(--v3-ink);font-size:clamp(19px,3vw,25px);line-height:1.15}
.v3-section-head p{margin:4px 0 0;color:#756a80;font-size:13px}
.v3-action-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px}
.v3-action{display:flex;min-width:0;min-height:156px;flex-direction:column;align-items:flex-start;justify-content:flex-start;gap:6px;padding:12px;border:1px solid var(--v3-line);border-radius:20px;background:#fff;text-align:left;color:var(--v3-ink);box-shadow:var(--v3-shadow);cursor:pointer}
.v3-action-art{display:grid;place-items:center;width:100%;height:82px;overflow:hidden;border-radius:13px;background:linear-gradient(135deg,#f8e4f2,#e6f3f7)}
.v3-action-art .action-illustration{display:block;width:96%;height:100%;aspect-ratio:496/548;flex:none;border-radius:13px;background-size:400% 120.7%;background-repeat:no-repeat;background-position:center}
.v3-action-art .gift-art{background-position:0% center}.v3-action-art .wheel-art{background-position:33.3333% center}.v3-action-art .family-art{background-position:66.6667% center}.v3-action-art .friends-art{background-position:100% center}
.v3-action strong{font-size:14px;line-height:1.15}
.v3-action small{color:#766b80;font-size:11px;line-height:1.25}
.v3-rail{display:grid;grid-auto-columns:minmax(145px,1fr);grid-auto-flow:column;gap:10px;overflow-x:auto;padding:4px 2px 10px;scroll-snap-type:x mandatory}
.v3-rail>*{scroll-snap-align:start}
.v3-rail .home-tile{min-width:0;width:100%;border:1px solid var(--v3-line);border-radius:17px;background:#fff;box-shadow:var(--v3-shadow);overflow:hidden}
.v3-rail .home-thumb{height:116px}
.v3-rail .home-tile-name{display:block;padding:8px 9px 10px;color:var(--v3-ink);font-weight:850;font-size:13px;line-height:1.2;white-space:normal}
.v3-quick-links{display:flex;flex-wrap:wrap;gap:8px}
.v3-quick-links button{min-height:42px;padding:8px 13px;border:1px solid var(--v3-line);border-radius:14px;background:#fff;color:var(--v3-plum);font:inherit;font-size:13px;font-weight:800}
.v3-planner-note{margin:0 0 12px;padding:12px 14px;border:1px solid #d5e8dc;border-radius:15px;background:#edf7ef;color:#405e50;font-size:13px;line-height:1.4}
.v3-quiz-card{display:flex;align-items:center;justify-content:space-between;gap:12px;margin:18px 0;padding:16px;border:1px solid #e6d9eb;border-radius:20px;background:linear-gradient(105deg,#fff,#f8eff9);box-shadow:var(--v3-shadow)}
.v3-quiz-card strong{display:block;color:var(--v3-plum);font-size:16px}
.v3-quiz-card small{display:block;margin-top:4px;color:#756a80;font-size:12px}
.v3-quiz-start,.v3-modal button{min-height:44px;padding:9px 14px;border:0;border-radius:13px;background:#6748a0;color:#fff;font:inherit;font-weight:850}
.v3-modal-backdrop{position:fixed;inset:0;z-index:400;display:grid;place-items:center;padding:16px;background:#251a3780}
.v3-modal{width:min(100%,500px);max-height:90dvh;overflow:auto;padding:22px;border:1px solid #eadff0;border-radius:24px;background:#fffdf9;box-shadow:0 20px 80px #1e14344a}
.v3-modal h2{margin:0 0 8px;color:var(--v3-ink);font-size:23px}
.v3-modal p{color:#635773;line-height:1.45}
.v3-modal-options{display:grid;gap:8px;margin:14px 0}
.v3-modal-options button{min-height:48px;border:1px solid #e3d7eb;background:#fff;color:var(--v3-ink);text-align:left}
.v3-modal-options button.correct{border-color:#63a486;background:#eaf6ef;color:#285d45}
.v3-modal-options button.incorrect{border-color:#d79090;background:#fff1f0;color:#834343}
.v3-modal .v3-close{background:#6c5687}
.v3-contact-form{display:grid;gap:10px;margin-top:16px;padding:16px;border:1px solid var(--v3-line);border-radius:18px;background:#fff}
.v3-contact-form h2{margin:0;font-size:18px}
.v3-contact-form p{margin:0;color:#756a80;font-size:13px;line-height:1.4}
.v3-contact-form label{display:grid;gap:5px;color:#514361;font-size:13px;font-weight:800}
.v3-contact-form input{min-height:44px;padding:8px 11px;border:1px solid #cfc0d9;border-radius:11px;font:inherit;color:var(--v3-ink)}
.v3-photo-camera{display:block;width:100%;margin-bottom:8px;border:0;border-radius:13px;background:#66469a;color:#fff;font:inherit;font-weight:850;cursor:pointer}
.cook-photo-pick{min-height:46px}
.v3-hidden-camera-input{position:fixed;left:-10000px;width:1px;height:1px;opacity:0}
.storybook-ingredient-icon{display:grid;place-items:center;min-height:66px}
.storybook-ingredient-icon .v3-ingredient-art{width:min(76px,100%);aspect-ratio:1;border-radius:18px}
.ref-ingredient-icon{display:grid;place-items:center;width:60px;height:58px}
.ref-ingredient-icon .v3-ingredient-art{width:54px;height:54px;border:1px solid #f0e5d8;border-radius:16px}
.v3-ingredient-art{display:block;background-image:url("${ingredientAtlas}");background-repeat:no-repeat;background-size:400% 400%;box-shadow:0 3px 8px #4a345212;overflow:hidden}
.v3-food-0{background-position:0% 0%}.v3-food-1{background-position:33.333% 0%}.v3-food-2{background-position:66.667% 0%}.v3-food-3{background-position:100% 0%}
.v3-food-4{background-position:0% 33.333%}.v3-food-5{background-position:33.333% 33.333%}.v3-food-6{background-position:66.667% 33.333%}.v3-food-7{background-position:100% 33.333%}
.v3-food-8{background-position:0% 66.667%}.v3-food-9{background-position:33.333% 66.667%}.v3-food-10{background-position:66.667% 66.667%}.v3-food-11{background-position:100% 66.667%}
.v3-food-12{background-position:0% 100%}.v3-food-13{background-position:33.333% 100%}.v3-food-14{background-position:66.667% 100%}.v3-food-15{background-position:100% 100%}
.ref-tools .ref-tool{background:linear-gradient(155deg,#fff 0%,#fffafd 100%);border-color:#f0dfef}
.ref-tools .ref-tool span.tool-illustration{box-sizing:border-box;width:52px;height:44px;display:grid;place-items:center;border:1px solid #f2e4f1;border-radius:14px;background:linear-gradient(145deg,#fff7fb,#f5efff);filter:drop-shadow(0 2px 2px #67487a17)}
.ref-tools .ref-tool .kitchen-icon,.ref-tools .ref-tool .ref-tool-svg{width:44px;height:38px;filter:drop-shadow(0 2px 1px #50335612)}
@media(max-width:700px){.page{padding:12px;padding-bottom:calc(96px + env(safe-area-inset-bottom))}.v3-home{gap:14px}.v3-hero{grid-template-columns:minmax(0,1fr) minmax(95px,.43fr);padding:18px;border-radius:22px}.v3-hero-art{min-height:112px}.v3-hero-avatar{height:140px;width:120px}.v3-progress{gap:6px}.v3-progress-card{gap:6px;padding:9px 7px;border-radius:14px}.v3-progress-card>span{font-size:18px}.v3-progress-card strong{font-size:12px}.v3-progress-card small{font-size:10px}.v3-action-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.v3-action{min-height:142px;padding:10px;border-radius:17px}.v3-action-art{height:75px}.v3-rail{grid-auto-columns:minmax(138px,42vw)}.bottom{height:64px;min-height:64px}.bottom .tab{font-size:11px}}
@media(max-width:380px){.v3-hero{grid-template-columns:minmax(0,1fr) 84px;padding:15px}.v3-hero-avatar{width:92px;height:120px}.v3-hero h1{font-size:27px}.v3-progress-card small{display:none}}
@media(max-height:520px) and (orientation:landscape){#screen.home-page{padding:10px 16px 92px}.v3-home{gap:10px}.v3-hero{grid-template-columns:minmax(0,1fr) 160px;padding:14px 20px}.v3-hero-art{min-height:84px}.v3-hero-avatar{height:105px;width:130px}.v3-hero p{margin:6px 0 10px}.v3-progress-card{padding:7px 10px}.v3-action-grid{grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.v3-action{min-height:108px;padding:8px}.v3-action-art{height:47px}.v3-rail{grid-auto-columns:150px}}
@media(prefers-reduced-motion:reduce){.v3-action,.v3-primary{scroll-behavior:auto;transition:none!important}}
`;

const runtimeTemplate = fs.readFileSync(path.join(here, 'runtime.js'), 'utf8');
const runtime = runtimeTemplate
  .replaceAll('__AARIA_V3_MARKER__', marker)
  .replace('__V3_ART_JSON__', JSON.stringify(art))
  .replace('__V3_INGREDIENT_ATLAS_JSON__', JSON.stringify(ingredientAtlas))
  .replace('__V3_PROFILE_ART_JSON__', JSON.stringify(profileArt));


let outputHtml = html;
const homeArtSelector = '.home-action .action-illustration,.home-drawer-link .drawer-illustration{';
if (!outputHtml.includes(homeArtSelector)) throw new Error('Production home artwork selector missing.');
outputHtml = outputHtml.replace(homeArtSelector, '.home-action .action-illustration,.home-drawer-link .drawer-illustration,.v3-action .action-illustration{');
const ingredientFnMarker='const ingredientPicture=v=>';
if (!outputHtml.includes(ingredientFnMarker)) throw new Error('Could not find ingredient icon renderer in production HTML.');
outputHtml = outputHtml.replace(ingredientFnMarker, 'let ingredientPicture=v=>');
const bellPepperRule = "else if(/pepper|capsicum/.test(t)&&!/salt/.test(t))";
if (!outputHtml.includes(bellPepperRule)) throw new Error('Could not find the production bell-pepper illustration rule.');
outputHtml = outputHtml.replace(bellPepperRule, `else if(/black pepper|peppercorn|ground pepper/.test(t)){kind='Black pepper';body='<ellipse cx="32" cy="26" rx="24" ry="10" fill="#d9d5d2"/><path d="M8 28c2 17 13 23 24 23s22-6 24-23Z" fill="#eeeaf0" stroke="#b1a1bf" stroke-width="2"/><g fill="#312d34"><circle cx="20" cy="23" r="2"/><circle cx="29" cy="19" r="2"/><circle cx="39" cy="24" r="2"/><circle cx="31" cy="27" r="2"/><circle cx="44" cy="20" r="1.5"/></g>';}${bellPepperRule}`);
outputHtml = outputHtml.replaceAll('Cozinha Mágica da Aaria', 'Cozinha mágica da Aaria');
const csp = "script-src 'self' 'unsafe-inline'; connect-src 'self'; frame-src 'none'; child-src 'none'; object-src 'none'; base-uri 'self'; form-action 'self'";
const headTag = outputHtml.match(/<head\b[^>]*>/i)?.[0];
if (!headTag) throw new Error('Production HTML must have a <head> for the V3 security policy.');
outputHtml = outputHtml.replace(headTag, `${headTag}<meta http-equiv="Content-Security-Policy" content="${csp}">`);
outputHtml = outputHtml.replace('</body>', `<style id="aaria-v3-styles">${styles}</style><script id="aaria-v3-layer">${runtime}</script></body>`);
if (outputHtml === html || !outputHtml.includes(marker)) throw new Error('Could not append the V3 layer to the production HTML.');
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, outputHtml);
console.log(`Built ${output} (${outputHtml.length.toLocaleString()} chars) from ${input}`);
