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
  const bytes = fs.readFileSync(path.join(here, 'artwork', name));
  const text = bytes.toString('ascii').replace(/\s/g, '');
  if (/^[A-Za-z0-9+/]+={0,2}$/.test(text)) return `data:image/webp;base64,${text}`;
  if (bytes.subarray(0, 4).toString('ascii') === 'RIFF' && bytes.subarray(8, 12).toString('ascii') === 'WEBP') {
    return `data:image/webp;base64,${bytes.toString('base64')}`;
  }
  throw new Error(`Invalid WebP artwork: ${name}`);
}

function readReferenceImage(relativePath) {
  const bytes = fs.readFileSync(path.join(root, relativePath));
  const ext = path.extname(relativePath).toLowerCase();
  const mime = ext === '.png' ? 'image/png' : ext === '.webp' ? 'image/webp' : 'image/jpeg';
  return `data:${mime};base64,${bytes.toString('base64')}`;
}

const homeWorldArt = {
  brand: readReferenceImage('phase2-pilot/packages/assets/brand/brand-lockup.png'),
  aaria: readReferenceImage('tools/v3/artwork/characters/reference-derived/aaria-portrait.webp'),
  aariaCooking: readReferenceImage('tools/v3/artwork/characters/reference-derived/aaria-cooking.webp'),
  friends: readReferenceImage('tools/v3/artwork/characters/reference-derived/home-approved-dog-crop.png'),
  kitchen: readReferenceImage('phase2-pilot/packages/assets/backgrounds/kitchen-day.jpg'),
  worldMap: readReferenceImage('docs/design/approved-v31-world-map-crop.webp'),
  destinations: Object.fromEntries(['IND'].map(code => [code, readReferenceImage(`tools/v3/artwork/world-adventures/reference-derived/home-destination-${code.toLowerCase()}.webp`)])),
  avatars: Object.fromEntries(['mommy','daddy','rohan','arjun','vihaan','isha','meera','sana','diya'].map(key => [key, readReferenceImage(`tools/v3/artwork/characters/reference-derived/${key}.webp`)]))
};

const art = Object.fromEntries([
  [1, {
    variants: {
      CHEF_A: { atlas: readAsset('recipe-1-chef-a-storyboard.webp.b64'), hero: readAsset('recipe-1-chef-a-hero.webp.b64') },
      CHEF_B: { atlas: readAsset('recipe-1-chef-b-storyboard.webp.b64'), hero: readAsset('recipe-1-chef-b-hero.webp.b64') }
    },
    aspect: 543 / 724,
    status: 'pending-review'
  }],
  [2, {
    variants: {
      CHEF_A: { atlas: readAsset('recipe-2-chef-a-storyboard.webp.b64'), hero: readAsset('recipe-2-chef-a-hero.webp.b64') },
      CHEF_B: { atlas: readAsset('recipe-2-chef-b-storyboard.webp.b64'), hero: readAsset('recipe-2-chef-b-hero.webp.b64') }
    },
    aspect: 543 / 724,
    status: 'pending-review'
  }],
  [3, {
    variants: {
      CHEF_A: { atlas: readAsset('recipe-3-chef-a-storyboard.webp.b64'), hero: readAsset('recipe-3-chef-a-hero.webp.b64') },
      CHEF_B: { atlas: readAsset('recipe-3-chef-b-storyboard.webp.b64'), hero: readAsset('recipe-3-chef-b-hero.webp.b64') }
    },
    aspect: 420 / 700,
    status: 'pending-review'
  }],
  [4, {
    variants: {
      CHEF_A: { atlas: readAsset('recipe-4-chef-a-storyboard.webp.b64'), hero: readAsset('recipe-4-chef-a-hero.webp.b64') },
      CHEF_B: { atlas: readAsset('recipe-4-chef-b-storyboard.webp.b64'), hero: readAsset('recipe-4-chef-b-hero.webp.b64') }
    },
    aspect: 480 / 640,
    status: 'pending-review'
  }],
  ...[78, 89, 93, 94].map(id => [id, {
    atlas: readAsset(`recipe-${id}-storyboard.webp.b64`),
    hero: readAsset(`recipe-${id}-hero.webp.b64`),
    aspect: id === 94 ? 412 / 624 : 502 / 507,
    status: 'approved'
  }])
]);
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
.bottom{height:68px;min-height:68px;grid-template-columns:repeat(5,minmax(0,1fr));padding:6px 10px calc(6px + env(safe-area-inset-bottom));gap:4px;background:#fffdfa;border-top:1px solid #eadff0;box-shadow:0 -5px 20px #39285412;z-index:120}
.bottom .tab{min-width:0;min-height:48px;border-radius:16px;padding:4px 6px;font-size:12px;line-height:1.15;font-weight:800;color:#685b78;gap:2px}
.bottom .tab b{font-size:20px;line-height:1.1}
.bottom .tab.active{background:#efe7f8;color:#6849a1}
.nav-reopen{display:none!important}
#screen.home-page{padding:clamp(12px,3vw,28px);padding-bottom:calc(92px + env(safe-area-inset-bottom));max-width:1240px}
.v3-home{display:grid;gap:18px;margin:0 auto;max-width:1120px}
.v31-home-hero{position:relative;display:grid;grid-template-columns:minmax(0,1.3fr) minmax(150px,.7fr);align-items:center;min-height:clamp(230px,30vw,330px);overflow:hidden;padding:clamp(20px,4vw,42px);border:1px solid #e9ddec;border-radius:30px;background:radial-gradient(ellipse at 78% 38%,#fff9cf 0 4%,transparent 4.5%),linear-gradient(115deg,#fffdf8 0%,#f7eafa 50%,#ddf2f1 100%);box-shadow:var(--v3-shadow)}
.v31-home-hero:before{position:absolute;right:-35px;bottom:-74px;width:250px;height:160px;border-radius:50%;background:#ffffff55;content:""}
.v31-hero-copy{position:relative;z-index:1;max-width:600px}
.v31-home-hero h1{margin:0;color:var(--v3-ink);font-size:clamp(30px,5vw,50px);line-height:1.03;letter-spacing:-.035em}
.v31-home-hero p{max-width:480px;margin:10px 0 18px;color:#625674;font-size:clamp(14px,2vw,17px);line-height:1.45}
.v31-primary-actions{display:flex;flex-wrap:wrap;gap:12px}
.v31-world-primary{display:inline-flex;align-items:center;justify-content:center;gap:8px;min-height:48px;padding:0 17px;border:1px solid #b2d7ce;border-radius:15px;background:#fff;color:#276d5f;font:inherit;font-size:15px;font-weight:900;box-shadow:0 4px 0 #a8d1c5;cursor:pointer}
.v31-hero-art{position:relative;display:grid;place-items:center;min-height:200px}
.v31-hero-art .v3-hero-avatar{width:min(100%,245px);height:clamp(170px,24vw,270px)}
.v31-sparkle{position:absolute;color:#d79b32;text-shadow:0 1px 4px #fff;font-size:26px}
.v31-sparkle-a{top:12%;right:12%}.v31-sparkle-b{bottom:14%;left:12%;font-size:21px}
.v31-shortcuts{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}
.v31-shortcut{display:flex;align-items:center;gap:12px;min-width:0;min-height:74px;padding:12px 16px;border:1px solid var(--v3-line);border-radius:19px;background:#fff;color:var(--v3-ink);text-align:left;box-shadow:var(--v3-shadow);cursor:pointer}
.v31-shortcut>span:first-child{display:grid;place-items:center;width:44px;height:44px;flex:none;border-radius:15px;background:#f9eafa;font-size:25px}
.v31-planner>span:first-child{background:#e8f5ee}
.v31-shortcut strong,.v31-world-card strong{display:block;font-size:15px;line-height:1.2}
.v31-shortcut small,.v31-world-card small{display:block;margin-top:4px;color:#766b80;font-size:12px;line-height:1.3}
.v31-world-shelf,.v31-collection-links{display:grid;gap:10px}
.v31-world-card{display:flex;align-items:center;gap:13px;width:100%;min-height:80px;padding:12px 16px;border:1px solid #c6e2dc;border-radius:20px;background:linear-gradient(105deg,#f1fbf7,#fff9ef);color:var(--v3-ink);text-align:left;box-shadow:var(--v3-shadow);cursor:pointer}
.v31-world-globe{display:grid;place-items:center;width:50px;height:50px;flex:none;border-radius:17px;background:#e3f3f1;font-size:29px}
.v31-country-flags{margin-left:auto;font-size:clamp(16px,2vw,23px);white-space:nowrap}
.v31-card-arrow{color:#287c69;font-size:22px;font-weight:900}
.v31-collection-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:10px}
.v31-collection-grid button{display:flex;align-items:center;gap:10px;min-height:60px;padding:12px 16px;border:1px solid var(--v3-line);border-radius:17px;background:#fff;color:var(--v3-plum);font-size:20px;box-shadow:var(--v3-shadow);cursor:pointer}
.v31-collection-grid strong{font-size:14px}
.v31-world-screen{max-width:1280px!important;padding-top:14px}
.v31-world-page{display:grid;gap:18px;max-width:1200px;margin:0 auto}
.v31-world-header{display:grid;grid-template-columns:auto 1fr auto;align-items:center;gap:14px}
.v31-world-header h1{margin:0;color:var(--v3-ink);font-size:clamp(26px,4vw,40px);line-height:1.05}.v31-world-header h1:focus{outline:3px solid #8e70bb;outline-offset:5px;border-radius:4px}
.v31-world-header p{margin:6px 0 0;color:#6f637d;line-height:1.35}
.v31-back{width:46px;height:46px;border:1px solid var(--v3-line);border-radius:16px;background:#fff;color:var(--v3-plum);font-size:25px;box-shadow:var(--v3-shadow);cursor:pointer}
.v31-passport-count{display:flex;align-items:center;gap:8px;padding:10px 13px;border:1px solid #e7d7ad;border-radius:15px;background:#fff7db;color:#654b1d;font-size:20px}
.v31-passport-count strong{font-size:15px}
.v31-world-layout{display:grid;grid-template-columns:minmax(0,1.45fr) minmax(280px,.75fr);align-items:start;gap:16px}
.v31-map-panel,.v31-destination-card,.v31-country-list{min-width:0;padding:16px;border:1px solid var(--v3-line);border-radius:22px;background:#fff;box-shadow:var(--v3-shadow)}
.v31-map-title{display:flex;justify-content:space-between;align-items:baseline;gap:8px;margin-bottom:11px}
.v31-map-title strong{color:var(--v3-ink);font-size:17px}
.v31-map-title small{color:#756a80;font-size:12px}
.v31-map-controls{display:flex;justify-content:flex-end;gap:6px;margin:-4px 0 8px}
.v31-map-controls button{width:44px;height:44px;border:1px solid #c8b9d5;border-radius:13px;background:#fff;color:var(--v3-plum);font-size:23px;font-weight:900;box-shadow:0 2px 5px #36234a12;cursor:pointer}
.v31-map-controls button:disabled{opacity:.58;cursor:not-allowed}
.v31-map-controls [data-v31-pan-toggle]{width:auto;min-width:44px;padding:0 10px;font-size:12px}
.v31-map-wrap{position:relative;overflow:hidden;border:1px solid #c5e2e6;border-radius:20px;background:#d9f0f1}
.v31-world-map{display:block;width:100%;height:auto;touch-action:pan-y pinch-zoom;transform:translate(var(--v31-pan-x,0),var(--v31-pan-y,0)) scale(var(--v31-zoom,1));transform-origin:center;user-select:none}
.v31-map-wrap.is-pan-mode .v31-world-map{touch-action:none}
.v31-graticule{fill:none;stroke:#fff8;stroke-width:1}
.v31-land{fill:#fff9eb;stroke:#99b8a7;stroke-width:1.05;vector-effect:non-scaling-stroke;cursor:pointer;transition:fill .15s ease,stroke .15s ease}
.v31-land:hover,.v31-land:focus{fill:#f4dc9c;stroke:#90682c;stroke-width:2;outline:none}
.v31-land.v31-destination{fill:#b8ddc8;stroke:#579777;stroke-width:1.4}
.v31-land.v31-destination:hover,.v31-land.v31-destination.is-selected{fill:#f6c96b;stroke:#7c5721;stroke-width:2}
.v31-map-pin{position:absolute;left:var(--pin-x);top:var(--pin-y);display:flex;align-items:center;justify-content:center;gap:4px;min-width:44px;min-height:44px;transform:translate(-50%,-50%);padding:4px 8px;border:2px solid #fff;border-radius:16px;background:#fff;color:#302344;font-size:19px;line-height:1.2;box-shadow:0 2px 7px #30304035;pointer-events:auto;cursor:pointer}
.v31-map-pin span{font-size:10px;font-weight:900;white-space:nowrap}
.v31-map-pin.is-selected{border-color:#dca438;background:#fff7d9}
.v31-country-select-label{display:grid;gap:5px;margin-top:11px;color:#554667;font-size:12px;font-weight:800}
.v31-country-select-label select{min-height:44px;padding:7px 10px;border:1px solid #cbbbd8;border-radius:12px;background:#fff;color:var(--v3-ink);font:inherit}
.v31-country-select-label input{min-height:44px;padding:7px 10px;border:1px solid #cbbbd8;border-radius:12px;background:#fff;color:var(--v3-ink);font:inherit}
.v31-search-result{min-height:17px;margin:4px 0;color:#665878;font-size:11px}
.v31-no-results{margin:10px 0 0;padding:10px;border-radius:12px;background:#fff7dc;color:#624e22;font-size:13px}
.v31-destination-banner{display:flex;align-items:center;justify-content:space-between;min-height:90px;margin:-2px 0 13px;padding:10px 18px;border-radius:17px;background:linear-gradient(120deg,#f2eafd,#e1f4ed)}
.v31-destination-flag{font-size:42px}.v31-destination-illustration{width:110px;height:94px;filter:drop-shadow(0 3px 3px #58406e22)}
.v31-approved-recipes{padding:12px;border:1px solid #cde1d4;border-radius:17px;background:#f4fbf6}.v31-approved-recipes>p{margin:7px 0;color:#655975;font-size:12px;line-height:1.4}.v31-approved-recipes>div{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}.v31-approved-recipes button{display:flex;align-items:center;justify-content:space-between;gap:6px;min-height:44px;padding:8px 10px;border:1px solid #d9cfe2;border-radius:12px;background:#fff;color:var(--v3-ink);font:inherit;font-size:12px;font-weight:800;text-align:left;cursor:pointer}.v31-approved-recipes button:focus-visible{outline:3px solid #6b56bd;outline-offset:2px}
.v31-destination-card h2{margin:0;color:var(--v3-ink);font-size:27px}
.v31-food-fact{margin:8px 0 13px;color:#655975;font-size:13px;line-height:1.45}
.v31-recipe-preview{padding:13px;border:1px solid #e6d8ed;border-radius:17px;background:#fffafd}
.v31-preview-tag{display:inline-flex;padding:5px 8px;border-radius:9px;background:#fff1ca;color:#6b4b10;font-size:9px;font-weight:950;letter-spacing:.08em}
.v31-recipe-preview h3{margin:8px 0 2px;color:var(--v3-plum);font-size:19px}
.v31-adventure-recipes{display:grid;gap:9px;padding:12px;border:1px solid #e6d8ed;border-radius:17px;background:#fffafd}.v31-adventure-recipes>p{margin:0;color:#675a79;font-size:12px;line-height:1.4}.v31-adventure-recipe{display:grid;grid-template-columns:92px minmax(0,1fr);gap:10px;overflow:hidden;padding:9px;border:1px solid #eee2ef;border-radius:14px;background:#fff}.v31-adventure-recipe>img{width:92px;height:100%;min-height:116px;max-height:150px;border-radius:11px;object-fit:cover}.v31-adventure-recipe h3{margin:0;color:var(--v3-plum);font-size:15px;line-height:1.2}.v31-adventure-recipe p{margin:5px 0;color:#675a79;font-size:11px;line-height:1.35}.v31-adventure-recipe small{display:block;color:#786d82;font-size:10px;line-height:1.3}
.v31-recipe-preview>p{margin:4px 0;color:#675a79;font-size:12px;line-height:1.4}
.v31-review-note{padding:8px;border-radius:10px;background:#fff5dd;color:#664b1c!important}
.v31-allergen-note{font-weight:800}
.v31-preview-button{display:flex;align-items:center;justify-content:space-between;width:100%;min-height:46px;margin-top:9px;padding:9px 12px;border:0;border-radius:13px;background:#6748a0;color:#fff;font:inherit;font-weight:900;cursor:pointer}
.v31-passport-stamp{margin-top:10px;padding:9px 10px;border:1px dashed #d7c98f;border-radius:12px;background:#fffbed;color:#6c5a2c;font-size:12px;text-align:center}
.v31-passport-stamp.earned{border-style:solid;border-color:#b4d8c5;background:#ebf8ef;color:#2f7054}
.v31-passport{display:flex;align-items:center;justify-content:space-between;gap:14px;padding:16px;border:1px solid #e5dced;border-radius:20px;background:linear-gradient(100deg,#fffaf0,#f3fbf6);box-shadow:var(--v3-shadow)}
.v31-passport h2{margin:0 0 6px;font-size:17px}
.v31-passport p{margin:0;color:#71667c;font-size:13px;line-height:1.4}
.v31-stamp{display:inline-flex;align-items:center;min-height:38px;margin:3px;padding:6px 11px;border:1px solid #b4d8c5;border-radius:999px;background:#ebf8ef;color:#2f7054;font-size:13px;font-weight:900}
.v31-passport button{min-height:44px;padding:8px 12px;border:1px solid #d8cbdf;border-radius:12px;background:#fff;color:#554366;font:inherit;font-weight:800;cursor:pointer}
.v31-passport button:disabled{opacity:.55;cursor:not-allowed}
.v31-country-list h2{margin:0 0 10px;font-size:17px}
.v31-country-list>div{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px}
.v31-country-choice{display:flex;align-items:center;justify-content:center;gap:6px;min-height:46px;padding:6px 9px;border:1px solid var(--v3-line);border-radius:13px;background:#fff;color:var(--v3-ink);font:inherit;font-size:12px;font-weight:800;cursor:pointer}
.v31-country-choice.is-selected{border-color:#b6924d;background:#fff7dc}
.v31-country-choice>span:first-child{font-size:18px}.v31-stamp-status{color:#997526}
.v31-map-source{margin:0;color:#786d82;font-size:10px;line-height:1.4}
.v31-recipe-modal h3{margin:14px 0 6px;color:var(--v3-plum);font-size:16px}
.v31-recipe-modal ul,.v31-recipe-modal ol{margin:5px 0;padding-left:22px;color:#4b3b60;font-size:14px;line-height:1.5}
.v31-recipe-modal li+li{margin-top:5px}
.v31-modal-warning{padding:11px;border-radius:12px;background:#fff2ce;color:#684d1d!important;font-size:13px}
.v31-modal-actions{display:grid;grid-template-columns:1fr auto;gap:8px;margin-top:16px}
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
.v31-pinterest-board{columns:2;column-gap:12px;padding:4px 1px 2px}
.v31-pinterest-tile{display:block;break-inside:avoid;width:100%;margin:0 0 12px;padding:0 0 10px;overflow:hidden;border:1px solid #e8deed;border-radius:19px;background:#fff;color:var(--v3-ink);text-align:left;box-shadow:0 5px 16px #39285412;cursor:pointer}
.v31-pinterest-tile .home-thumb{height:auto;aspect-ratio:1.34;margin:0;overflow:hidden;border-radius:18px 18px 0 0;background:#f3eafa}
.v31-pinterest-tile:nth-child(4n+1) .home-thumb{aspect-ratio:1/1}
.v31-pinterest-tile:nth-child(4n+2) .home-thumb{aspect-ratio:1.34/1}
.v31-pinterest-tile:nth-child(4n+3) .home-thumb{aspect-ratio:1.12/1}
.v31-pinterest-tile:nth-child(4n) .home-thumb{aspect-ratio:1.48/1}
.v31-pinterest-tile .home-thumb img{width:100%;height:100%;object-fit:cover}
.v31-pinterest-tile .home-thumb.family-group-art img{object-fit:contain;background:#fff8fc}
.v31-pinterest-tile .home-thumb .atlas-cell img{object-fit:fill}
.v31-pinterest-tile .recipe-number-badge{top:8px;left:8px}
.v31-pinterest-tile .home-tile-name{display:block;padding:9px 11px 0;color:var(--v3-ink);font-size:14px;font-weight:900;line-height:1.2;white-space:normal}
.v31-pinterest-tile .home-tile-meta{display:block;padding:4px 11px 0;color:#746985;font-size:11px;font-weight:700;line-height:1.25}
.v31-board-heading{margin-top:3px}
@media(min-width:760px){.v31-pinterest-board{columns:3;column-gap:14px}.v31-pinterest-tile{margin-bottom:14px}.v31-pinterest-tile .home-tile-name{font-size:15px}}
@media(max-width:340px){.v31-pinterest-board{columns:1}}
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
@media(max-width:700px){.page{padding:12px;padding-bottom:calc(96px + env(safe-area-inset-bottom))}.v3-home{gap:14px}.v3-hero{grid-template-columns:minmax(0,1fr) minmax(95px,.43fr);padding:18px;border-radius:22px}.v3-hero-art{min-height:112px}.v3-hero-avatar{height:140px;width:120px}.v3-progress{gap:6px}.v3-progress-card{gap:6px;padding:9px 7px;border-radius:14px}.v3-progress-card>span{font-size:18px}.v3-progress-card strong{font-size:12px}.v3-progress-card small{font-size:10px}.v3-action-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:9px}.v3-action{min-height:142px;padding:10px;border-radius:17px}.v3-action-art{height:75px}.v3-rail{grid-auto-columns:minmax(138px,42vw)}.bottom{height:64px;min-height:64px}.bottom .tab{font-size:11px}.v31-home-hero{grid-template-columns:minmax(0,1fr) 105px;min-height:190px;padding:18px;border-radius:23px}.v31-hero-art{min-height:105px}.v31-hero-art .v3-hero-avatar{width:110px;height:138px}.v31-home-hero h1{font-size:clamp(27px,7vw,37px)}.v31-home-hero p{font-size:13px;margin:8px 0 13px}.v31-primary-actions{gap:9px}.v31-primary-actions button{min-height:44px;padding:0 12px;font-size:13px}.v31-shortcuts{gap:8px}.v31-shortcut{gap:8px;min-height:70px;padding:9px}.v31-shortcut>span:first-child{width:37px;height:37px;font-size:21px}.v31-shortcut strong{font-size:13px}.v31-shortcut small{font-size:10px}.v31-country-flags{display:none}.v31-world-layout{grid-template-columns:minmax(0,1fr);gap:11px}.v31-world-header{grid-template-columns:auto 1fr auto;gap:9px}.v31-world-header .v3-eyebrow{font-size:9px}.v31-world-header h1{font-size:26px}.v31-world-header p{font-size:12px}.v31-passport-count{padding:7px 9px;font-size:16px}.v31-back{width:44px;height:44px}.v31-map-panel,.v31-destination-card,.v31-country-list{padding:12px;border-radius:18px}.v31-map-title{display:grid;gap:3px}.v31-map-title strong{font-size:15px}.v31-map-pin{padding:2px 5px;font-size:16px}.v31-map-pin span{display:none}.v31-country-list>div{grid-template-columns:repeat(2,minmax(0,1fr))}.v31-approved-recipes>div{grid-template-columns:minmax(0,1fr)}.v31-approved-recipes button{font-size:13px}.v31-collection-grid button{padding:10px;font-size:17px}.v31-collection-grid strong{font-size:12px}}
@media(max-width:380px){.v31-home-hero{grid-template-columns:minmax(0,1fr) 88px;padding:14px}.v31-hero-art .v3-hero-avatar{width:92px;height:125px}.v31-home-hero h1{font-size:26px}.v31-primary-actions{display:grid;justify-items:start}.v31-primary-actions button{min-height:44px}}
@media(max-height:520px) and (orientation:landscape){.v31-home-hero{grid-template-columns:minmax(0,1fr) 180px;min-height:190px;padding:14px 22px}.v31-hero-art .v3-hero-avatar{height:150px;width:150px}.v31-shortcut{min-height:60px}.v31-world-layout{grid-template-columns:minmax(0,1.4fr) minmax(270px,.8fr)}.v31-country-list>div{grid-template-columns:repeat(5,minmax(0,1fr))}.v31-world-page{gap:10px}}
@media(max-width:380px){.v3-hero{grid-template-columns:minmax(0,1fr) 84px;padding:15px}.v3-hero-avatar{width:92px;height:120px}.v3-hero h1{font-size:27px}.v3-progress-card small{display:none}}
@media(max-height:520px) and (orientation:landscape){#screen.home-page{padding:10px 16px 92px}.v3-home{gap:10px}.v3-hero{grid-template-columns:minmax(0,1fr) 160px;padding:14px 20px}.v3-hero-art{min-height:84px}.v3-hero-avatar{height:105px;width:130px}.v3-hero p{margin:6px 0 10px}.v3-progress-card{padding:7px 10px}.v3-action-grid{grid-template-columns:repeat(4,minmax(0,1fr));gap:8px}.v3-action{min-height:108px;padding:8px}.v3-action-art{height:47px}.v3-rail{grid-auto-columns:150px}}
@media(max-width:700px){.v31-passport{align-items:flex-start;flex-direction:column}.v31-passport button{align-self:flex-start}}
.v31-home-hero{min-height:clamp(155px,18vw,230px);padding:clamp(14px,2vw,24px)}
.v31-home-hero h1{font-size:clamp(27px,4.2vw,42px)}
@media(max-width:700px){.v3-home{gap:10px}.v3-home-top{gap:7px}.v3-brand{gap:7px;font-size:17px}.v3-brand small{display:none}.v3-brand-mark{width:36px;height:36px;border-radius:12px;font-size:20px}.v31-home-hero{grid-template-columns:minmax(0,1fr) 82px;min-height:140px;padding:11px 13px;border-radius:19px}.v31-home-hero h1{font-size:clamp(22px,5.5vw,30px)}.v31-home-hero p{margin:4px 0 7px;font-size:11px;line-height:1.3}.v31-hero-art{min-height:84px}.v31-hero-art .v3-hero-avatar{width:82px;height:102px}.v31-primary-actions{gap:6px}.v31-primary-actions button{min-height:38px;padding:0 9px;font-size:11px;border-radius:12px}.v31-shortcuts{gap:7px}.v31-shortcut{min-height:56px;padding:7px;gap:7px;border-radius:15px}.v31-shortcut>span:first-child{width:32px;height:32px;font-size:18px;border-radius:11px}.v31-shortcut strong{font-size:12px}.v31-shortcut small{font-size:9px;margin-top:2px}.v31-board-heading p{display:none}.v31-board-heading{margin:0}}
@media(max-height:520px) and (orientation:landscape){.v31-home-hero{min-height:115px;padding:8px 14px}.v31-home-hero h1{font-size:clamp(22px,3vw,30px)}.v31-home-hero p{margin:3px 0 5px;font-size:11px}.v31-hero-art{min-height:80px}.v31-hero-art .v3-hero-avatar{height:90px;width:90px}.v31-shortcut{min-height:48px}}
.v31-adult-cue,.v31-step-adult-cue{margin:7px 0;padding:9px 11px;border:1px solid #e5a471;border-radius:12px;background:#fff2e4;color:#713c20;font-size:13px;font-weight:900;line-height:1.35}
.v31-step-adult-cue{margin:8px 0;font-size:12px;flex:1 0 100%;grid-column:1/-1}
.app.reference-active .enchanted-sky,.app.reference-active .ambient{display:none!important}
.app.reference-active .ref-hero-group-art>.ref-dish{grid-area:art;min-width:0;min-height:0}
.app.reference-active .ref-hero-group-art>.ref-dish img{display:block;width:100%;height:100%;object-fit:contain;object-position:center}
.app.v31-world-active{width:100%;max-width:none!important;min-height:100dvh;margin:0}
.app.v31-world-active #screen.v31-world-screen{width:100%;max-width:none!important;margin:0;padding:12px 16px calc(92px + env(safe-area-inset-bottom))}
.app.v31-world-active .v31-world-page{width:100%;max-width:1600px}
.app.v31-world-active .enchanted-sky,.app.v31-world-active .ambient{display:none!important}
.app.v31-world-active #nav{display:grid!important;position:fixed!important;left:0;right:0;bottom:0;transform:none!important;width:100%;max-width:none;grid-template-columns:repeat(5,minmax(0,1fr));padding:6px 10px calc(6px + env(safe-area-inset-bottom));z-index:190;opacity:1!important;pointer-events:auto!important}
@media(max-width:720px) and (orientation:portrait){.app.reference-active .ref-side-nav{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));overflow:visible}.app.reference-active .ref-side-nav button{min-width:0;white-space:normal}.app.reference-active .bottom{display:grid!important;position:fixed;left:0;right:0;bottom:0;transform:none!important;width:100%;max-width:none;grid-template-columns:repeat(5,minmax(0,1fr));padding:6px 10px calc(6px + env(safe-area-inset-bottom));z-index:190;opacity:1!important;pointer-events:auto!important}}
@media(max-width:720px) and (orientation:portrait){.app.reference-active .ref-step-card.active,.app.reference-active .ref-step-card.active:nth-child(n+4){grid-template-columns:minmax(0,1fr)!important;grid-auto-rows:max-content;align-content:start;gap:10px}.app.reference-active .ref-step-card.active .ref-step-title,.app.reference-active .ref-step-card.active .family-team-plan{grid-column:1}.app.reference-active .ref-step-card.active .storybook-action{grid-column:1;width:100%;max-width:490px;min-height:0}.app.reference-active .ref-step-card.active .storybook-action .action-svg{height:auto;aspect-ratio:490/305}.app.reference-active .ref-step-card.active .v31-step-adult-cue{grid-column:1;align-self:start;height:auto;min-height:0;margin:0;padding:9px 11px;flex:none}.app.reference-active .ref-step-card.active .ref-step-copy{grid-column:1;align-self:start}.app.reference-active .ref-cook-area{padding-bottom:124px}.app.reference-active .ref-step-actions{position:relative;z-index:2;background:#fff8f7;padding:8px 0}.app.reference-active .ref-step-actions .ref-back,.app.reference-active .ref-step-actions .ref-next{min-width:96px}}
@media(max-height:520px) and (orientation:landscape){.app.v31-world-active #screen.v31-world-screen{padding:8px 18px 78px}.app.v31-world-active .v31-world-page{max-width:1600px}.app.v31-world-active .v31-world-layout{grid-template-columns:minmax(0,1.4fr) minmax(280px,.8fr);gap:12px}}
@media(prefers-reduced-motion:reduce){.v3-action,.v3-primary{scroll-behavior:auto;transition:none!important}}
`;

const runtimeTemplate = fs.readFileSync(path.join(here, 'runtime.js'), 'utf8');
const worldAdventureHost = fs.readFileSync(path.join(here, 'world-adventure-host.mjs'), 'utf8')
  .replace(/^export const /gm, 'const ')
  .replace(/^export function /gm, 'function ')
  + '\nwindow.createWorldAdventureHost=createWorldAdventureHost;';
const magicalGlobeScript = fs.readFileSync(path.join(here, 'world-adventure-globe/world-adventure-globe.js'), 'utf8');
const magicalGlobeStyles = fs.readFileSync(path.join(here, 'world-adventure-globe/world-adventure-globe.css'), 'utf8');
const w02GlobeHostStyles = String.raw`
.app.v31-world-active{width:100vw!important;max-width:none!important;height:100dvh;min-height:0;margin:0;overflow:hidden}
.app.v31-world-active #screen.v31-world-screen{position:fixed;z-index:2;inset:env(safe-area-inset-top) 0 calc(76px + env(safe-area-inset-bottom));width:100vw;height:auto;min-height:0;max-width:none;margin:0;padding:0;overflow:hidden}
.app.v31-world-active .v33-world-globe-host{position:relative;display:block;width:100%;height:100%;min-width:0;min-height:0;overflow:hidden}
.app.v31-world-active .aria-world-globe{position:relative;display:flex;width:100%;height:100%;min-height:0;max-width:none;padding:8px clamp(10px,1.4vw,22px);gap:8px;overflow:hidden;background:radial-gradient(ellipse at 50% 55%,#fff8df 0%,#fbf2ff 60%,#f0e3fb 100%)}
.app.v31-world-active .aria-world-globe__header{position:relative;z-index:6;flex:0 0 auto;min-height:50px;max-width:none;width:100%;gap:12px}
.app.v31-world-active .aria-world-globe__header h1{font-size:clamp(16px,2.3vw,26px)}
.app.v31-world-active .aria-world-globe__passport,.app.v31-world-active .aria-world-globe__surprise{min-height:48px}
.app.v31-world-active .aria-world-globe__body{position:relative;display:grid;grid-template-columns:minmax(0,1fr) minmax(270px,31%);gap:clamp(10px,1.6vw,24px);flex:1;min-height:0;width:100%;max-width:none;margin:0}
.app.v31-world-active .aria-world-globe__stage{position:relative;container-type:size;min-width:0;min-height:0;overflow:visible;border:0;border-radius:28px;background:radial-gradient(ellipse at 50% 55%,rgba(255,255,255,.82),rgba(255,255,255,0) 65%)}
.app.v31-world-active .aria-world-globe__sphere{position:absolute;left:62%;top:50%;width:min(84cqw,84cqh,820px);height:auto;aspect-ratio:1;flex:none;transform:translate(-50%,-50%)}
.app.v31-world-active .aria-world-globe__atlas,.app.v31-world-active .aria-world-globe__flags{transform:scale(1.32);transform-origin:50% 50%}
.app.v31-world-active .aria-world-globe__flag{width:58px;height:58px;font-size:29px}
.app.v31-world-active .aria-world-globe__stage::before{content:"";position:absolute;z-index:0;left:62%;top:50%;width:min(94cqw,94cqh,900px);height:auto;aspect-ratio:1;border:3px dashed rgba(126,76,171,.65);border-radius:50%;box-shadow:0 0 0 9px rgba(255,214,111,.2),0 0 28px rgba(133,87,184,.28),inset 0 0 20px rgba(255,214,111,.16);transform:translate(-50%,-50%);animation:v33-orbit-turn 46s linear infinite;pointer-events:none}
.app.v31-world-active .aria-world-globe__stage::after{content:"";position:absolute;z-index:4;inset:0;background:radial-gradient(circle at 8% 22%,#fff8b7 0 3px,transparent 4px),radial-gradient(circle at 88% 19%,#fff 0 2px,transparent 4px),radial-gradient(circle at 91% 72%,#ffe69b 0 3px,transparent 4px),radial-gradient(circle at 12% 78%,#fff 0 2px,transparent 4px),radial-gradient(circle at 50% 5%,#fff 0 2px,transparent 4px),radial-gradient(circle at 52% 94%,#fff8b7 0 3px,transparent 4px),radial-gradient(circle at 24% 8%,#fff 0 1.5px,transparent 4px),radial-gradient(circle at 78% 91%,#fff 0 2px,transparent 4px);filter:drop-shadow(0 0 6px #fff2a8);animation:v33-sparkle-twinkle 2.2s ease-in-out infinite alternate;pointer-events:none}
.app.v31-world-active .aria-world-globe__guide{left:clamp(4px,1vw,14px);bottom:clamp(8px,2vh,20px);height:88cqh;width:auto;max-width:30cqw;object-fit:contain;object-position:bottom left;filter:drop-shadow(0 8px 12px rgba(65,40,89,.34));pointer-events:none}
.app.v31-world-active .aria-world-globe__guide-copy{left:clamp(84px,19cqw,240px);bottom:clamp(12px,2vh,22px);max-width:min(28%,290px)}
.app.v31-world-active .aria-world-globe__panel{position:relative;z-index:5;min-width:0;min-height:0;max-height:100%;}
.app.v31-world-active .aria-world-globe__controls{right:clamp(10px,1.4vw,22px);bottom:clamp(10px,1.4vh,18px)}
.app.v31-world-active .aria-world-globe__surprise{min-width:clamp(136px,17cqw,190px);min-height:52px}
.app.v31-world-active #nav.bottom{z-index:20}
.app.v31-world-active .v33-passport-overlay{z-index:240}
@keyframes v33-orbit-turn{from{transform:translate(-50%,-50%) rotate(0deg)}to{transform:translate(-50%,-50%) rotate(360deg)}}
@keyframes v33-sparkle-twinkle{from{opacity:.55}to{opacity:1}}
.v33-passport-overlay{position:fixed;z-index:240;inset:0;display:grid;place-items:center;padding:16px;background:#241a3888}
.v33-passport-overlay .w02-map-sheet{position:relative;inset:auto;width:min(620px,calc(100vw - 24px));max-height:min(82dvh,720px);overflow:auto;transform:none}
@media(orientation:portrait){.app.v31-world-active .aria-world-globe{gap:6px}.app.v31-world-active .aria-world-globe__header{min-height:48px}.app.v31-world-active .aria-world-globe__body{display:block}.app.v31-world-active .aria-world-globe__stage{position:absolute;inset:0 0 27% 0}.app.v31-world-active .aria-world-globe__sphere{left:62%;width:min(70cqw,82cqh,440px)}.app.v31-world-active .aria-world-globe__stage::before{left:62%;width:min(78cqw,90cqh,490px)}.app.v31-world-active .aria-world-globe__panel{position:absolute;left:0;right:0;bottom:0;height:25%;min-height:132px;border-radius:20px}.app.v31-world-active .aria-world-globe__guide{height:88cqh;max-width:38cqw}.app.v31-world-active .aria-world-globe__guide-copy{left:clamp(90px,25cqw,180px);bottom:10px;max-width:29%}.app.v31-world-active .aria-world-globe__controls{bottom:10px}.app.v31-world-active .aria-world-globe__surprise{min-width:140px}}
@media(orientation:landscape){.app.v31-world-active .aria-world-globe{padding:7px 12px;gap:6px}.app.v31-world-active .aria-world-globe__header{min-height:40px}.app.v31-world-active .aria-world-globe__body{grid-template-columns:minmax(0,1fr) minmax(245px,32%);gap:12px}.app.v31-world-active .aria-world-globe__stage{border-radius:22px}.app.v31-world-active .aria-world-globe__sphere{width:min(84cqw,84cqh,660px)}.app.v31-world-active .aria-world-globe__stage::before{width:min(94cqw,94cqh,740px)}.app.v31-world-active .aria-world-globe__flag{width:54px;height:54px}.app.v31-world-active .aria-world-globe__guide{height:88cqh;max-width:27cqw}.app.v31-world-active .aria-world-globe__guide-copy{left:clamp(84px,20cqw,200px);bottom:8px;max-width:26%}.app.v31-world-active .aria-world-globe__panel-head{padding:9px 10px}.app.v31-world-active .aria-world-globe__recipe-list{padding:8px;gap:7px}.app.v31-world-active .aria-world-globe__recipe{min-height:56px}.app.v31-world-active .aria-world-globe__dish,.app.v31-world-active .aria-world-globe__dish-placeholder{width:44px;height:44px;flex-basis:44px}}
@media(max-width:900px) and (orientation:landscape){.app.v31-world-active .aria-world-globe__body{grid-template-columns:minmax(0,1fr) minmax(220px,34%);gap:7px}.app.v31-world-active .aria-world-globe__header h1{max-width:35vw}.app.v31-world-active .aria-world-globe__guide{max-width:25cqw}}
@media(prefers-reduced-motion:reduce){.app.v31-world-active .aria-world-globe__stage::before,.app.v31-world-active .aria-world-globe__stage::after{animation:none}.app.v31-world-active .aria-world-globe__stage::before{border-style:dotted}.app.v31-world-active .aria-world-globe__flag.is-pending,.app.v31-world-active .aria-world-globe__flag.is-selected{animation:none}}
`;
const v32RecipeThemeMap = JSON.parse(fs.readFileSync(path.join(here, 'data/v3.2-recipe-theme-map.json'), 'utf8'));
const v32ReviewFeaturedIds = (process.env.V32_REVIEW_FEATURED_IDS || '').split(',').map(x => x.trim()).filter(Boolean).map(Number);
const v32CanonicalIds = new Set(Object.keys(v32RecipeThemeMap.mapping).map(Number));
if (new Set(v32ReviewFeaturedIds).size !== v32ReviewFeaturedIds.length || v32ReviewFeaturedIds.some(id => !Number.isInteger(id) || !v32CanonicalIds.has(id))) throw new Error('V32_REVIEW_FEATURED_IDS must contain unique canonical recipe IDs.');
const v32PtRecipeDrafts = {};
const v32PtGroupRoleCopy = {};
for (const name of ['pt-BR-recipes-66-80-review.json','pt-BR-recipes-81-95-review.json']) {
  const draft = JSON.parse(fs.readFileSync(path.join(here, 'data', name), 'utf8'));
  if (draft.status !== 'W01_DRAFT_PENDING_INDEPENDENT_REVIEW' || draft.locale !== 'pt-BR') throw new Error('Portuguese recipe copy must remain explicitly marked for independent review: ' + name);
  Object.assign(v32PtRecipeDrafts, draft.recipes);
  if (draft.familyRoleCopy) v32PtGroupRoleCopy.family = draft.familyRoleCopy;
  if (draft.friendsRoleCopy) v32PtGroupRoleCopy.friends = draft.friendsRoleCopy;
}
const runtime = runtimeTemplate
  .replaceAll('__AARIA_V3_MARKER__', marker)
  .replace('__V3_ART_JSON__', JSON.stringify(art))
  .replace('__V3_INGREDIENT_ATLAS_JSON__', JSON.stringify(ingredientAtlas))
  .replace('__V3_PROFILE_ART_JSON__', JSON.stringify(profileArt))
  .replace('__V32_RECIPE_THEME_MAP_JSON__', JSON.stringify(v32RecipeThemeMap.mapping))
  .replace('__V32_REVIEW_FEATURED_IDS_JSON__', JSON.stringify(v32ReviewFeaturedIds))
  .replace('__V3_PT_RECIPE_DRAFTS_JSON__', JSON.stringify(v32PtRecipeDrafts))
  .replace('__V32_PT_GROUP_ROLE_COPY_JSON__', JSON.stringify(v32PtGroupRoleCopy))
  .replace('__V31_HOME_WORLD_ART_JSON__', JSON.stringify(homeWorldArt));

if (!v32PtGroupRoleCopy.family || !v32PtGroupRoleCopy.friends) throw new Error('Family/Friends PT-BR role copy is missing from review drafts.');
if (/__V32_RECIPE_THEME_MAP_JSON__|__V3_PT_RECIPE_DRAFTS_JSON__|__V32_PT_GROUP_ROLE_COPY_JSON__/.test(runtime)) throw new Error('Could not embed the offline experience data.');


let outputHtml = html;
for (const [constant, key] of [['HOME_MOM','mommy'],['HOME_DAD','daddy']]) {
  const matches = outputHtml.match(new RegExp(`const ${constant}='[^']*';`, 'g')) || [];
  if (matches.length !== 1) throw new Error(`Expected one legacy ${constant} asset to replace with its approved avatar crop; found ${matches.length}.`);
  outputHtml = outputHtml.replace(matches[0], `const ${constant}=${JSON.stringify(homeWorldArt.avatars[key])};`);
}
const legacyFriendPortraits = '<div class="parent-pair" aria-hidden="true"><span style="font-size:78px">👧🏻</span><span style="font-size:78px">👦🏽</span><span style="font-size:78px">👦🏻</span></div>';
const canonicalFriendPortraits = `<div class="parent-pair v32-friend-portraits" role="group" aria-label="Aaria’s kitchen friends">${[['rohan','Rohan'],['arjun','Arjun'],['vihaan','Vihaan'],['isha','Isha'],['meera','Meera'],['sana','Sana'],['diya','Diya']].map(([key,name]) => `<figure class="v32-friend-portrait"><img src="${homeWorldArt.avatars[key]}" alt="${name}, Aaria’s cooking friend"><figcaption>${name}</figcaption></figure>`).join('')}</div>`;
if (!outputHtml.includes(legacyFriendPortraits) || outputHtml.indexOf(legacyFriendPortraits) !== outputHtml.lastIndexOf(legacyFriendPortraits)) throw new Error('Could not uniquely replace the unverified friends emoji row with approved avatar crops.');
outputHtml = outputHtml.replace(legacyFriendPortraits, canonicalFriendPortraits);
outputHtml = outputHtml.replace('home|week|library|recipe|stories|groceries|family|friends|rewards|settings|wheel', 'home|week|library|recipe|stories|groceries|family|friends|rewards|settings|wheel|world');
if (!outputHtml.includes('wheel|world')) throw new Error('Could not add the V3.1 world route to Android back navigation.');
const sourceNav = outputHtml.match(/<nav class="bottom" id="nav"[^>]*>[\s\S]*?<\/nav>/)?.[0];
if (!sourceNav) throw new Error('Could not find the persistent bottom navigation.');
const sixTabNav = '<nav class="bottom" id="nav" aria-label="Main navigation"><button class="tab" data-nav="home"><b>⌂</b>Home</button><button class="tab" data-nav="library"><b>♧</b>Recipes</button><button class="tab" data-nav="world"><b>🌍</b>World Adventure</button><button class="tab" data-nav="groceries"><b>🧺</b>Magic Pantry</button><button class="tab" data-nav="week"><b>▦</b>Planner</button><button class="tab" data-nav="creations"><b>☆</b>My Creations</button></nav>';
outputHtml = outputHtml.replace(sourceNav, sixTabNav);
if ((outputHtml.match(/<button class="tab" data-nav=/g) || []).length < 6 || !outputHtml.includes('data-nav="world"')) throw new Error('Could not install the six-item persistent navigation.');
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
const homeWorldStyles = fs.readFileSync(path.join(here, 'home-world-visual.css'), 'utf8');
const ptRecipeTranslationLoop = "for(const r of RECIPES)r.steps.forEach((t,i)=>PT_TRANSLATIONS[displayStepText(r,i)]=PT_RECIPES[r.id].steps[i]);";
const guardedPtRecipeTranslationLoop = "for(const r of RECIPES)r.steps.forEach((t,i)=>{const translated=PT_RECIPES[r.id]?.steps?.[i];if(translated)PT_TRANSLATIONS[displayStepText(r,i)]=translated;});";
if (!outputHtml.includes(ptRecipeTranslationLoop)) throw new Error('Expected PT recipe translation registration loop was not found');
outputHtml = outputHtml.replace(ptRecipeTranslationLoop, guardedPtRecipeTranslationLoop);

outputHtml = outputHtml.replace('</body>', `<style id="aaria-v3-styles">${styles}\n${homeWorldStyles}\n${magicalGlobeStyles}\n${w02GlobeHostStyles}</style><script id="aaria-v3-layer">${worldAdventureHost}\n${magicalGlobeScript}\n${runtime}</script></body>`);
if (outputHtml === html || !outputHtml.includes(marker)) throw new Error('Could not append the V3 layer to the production HTML.');
fs.mkdirSync(path.dirname(output), { recursive: true });
fs.writeFileSync(output, outputHtml);
console.log(`Built ${output} (${outputHtml.length.toLocaleString()} chars) from ${input}`);
