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
const worldGeography = JSON.parse(fs.readFileSync(path.join(here, 'data/ne_110m_admin_0_countries.geojson'), 'utf8'));

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
.v31-recipe-preview>p{margin:4px 0;color:#675a79;font-size:12px;line-height:1.4}
.v31-review-note{padding:8px;border-radius:10px;background:#fff5dd;color:#664b1c!important}
.v31-allergen-note{font-weight:800}
.v31-preview-button{display:flex;align-items:center;justify-content:space-between;width:100%;min-height:46px;margin-top:9px;padding:9px 12px;border:0;border-radius:13px;background:#6748a0;color:#fff;font:inherit;font-weight:900;cursor:pointer}
.v31-passport-stamp{margin-top:10px;padding:9px 10px;border:1px dashed #d7c98f;border-radius:12px;background:#fffbed;color:#6c5a2c;font-size:12px;text-align:center}
.v31-passport-stamp.earned{border-style:solid;border-color:#b4d8c5;background:#ebf8ef;color:#2f7054}
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
@media(prefers-reduced-motion:reduce){.v3-action,.v3-primary{scroll-behavior:auto;transition:none!important}}
`;

const runtimeTemplate = fs.readFileSync(path.join(here, 'runtime.js'), 'utf8');
const runtime = runtimeTemplate
  .replaceAll('__AARIA_V3_MARKER__', marker)
  .replace('__V3_ART_JSON__', JSON.stringify(art))
  .replace('__V3_INGREDIENT_ATLAS_JSON__', JSON.stringify(ingredientAtlas))
  .replace('__V3_PROFILE_ART_JSON__', JSON.stringify(profileArt))
  .replace('__V31_WORLD_GEOGRAPHY_JSON__', JSON.stringify(worldGeography));

if (runtime.includes('__V31_WORLD_GEOGRAPHY_JSON__')) throw new Error('Could not embed the offline country-boundary dataset.');


let outputHtml = html;
outputHtml = outputHtml.replace('home|week|library|recipe|stories|groceries|family|friends|rewards|settings|wheel', 'home|week|library|recipe|stories|groceries|family|friends|rewards|settings|wheel|world');
if (!outputHtml.includes('wheel|world')) throw new Error('Could not add the V3.1 world route to Android back navigation.');
outputHtml = outputHtml.replace('</nav><button class="nav-reopen"', '<button class="tab" data-nav="world"><b>🌍</b>World</button></nav><button class="nav-reopen"');
if (!outputHtml.includes('data-nav="world"')) throw new Error('Could not add the persistent World navigation tab.');
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

