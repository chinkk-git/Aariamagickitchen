import fs from 'node:fs';

const file = process.argv[2];
if (!file) throw new Error('Usage: node v34-prepare-visual-page.mjs <transformed-html>');
let html = fs.readFileSync(file, 'utf8');
const shim = `<script id="v34-visual-review-only">try{localStorage.setItem('aaria.v34.homeStyle','magical')}catch{};window.addEventListener('load',()=>setTimeout(()=>{const view=new URLSearchParams(location.search).get('visual');if(view==='surprise')document.querySelector('[data-v34-surprise]')?.click();else if(view==='new'||view==='made'||view==='world'){const id={new:'v34-new-title',made:'v34-made-title',world:'v34-world-title'}[view];document.getElementById(id)?.scrollIntoView({block:'start',behavior:'instant'})}},1400))</script>`;
if (!html.includes('</head>')) throw new Error('Transformed preview has no head element.');
html = html.replace('</head>', `${shim}</head>`);
fs.writeFileSync(file, html);
console.log('Prepared visual-only Magical Adventure page. No APK is produced by this workflow.');
