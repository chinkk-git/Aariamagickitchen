import fs from 'node:fs';

const file = process.argv[2];
if (!file) throw new Error('Usage: node v34-prepare-visual-page.mjs <transformed-html>');
let html = fs.readFileSync(file, 'utf8');
const shim = `<script id="v34-visual-review-only">const visualMode=new URLSearchParams(location.search).get('visual');try{localStorage.setItem('aaria.v34.homeStyle',visualMode==='classic'?'classic':'magical')}catch{};window.addEventListener('load',()=>setTimeout(()=>{const id={carousel:'v34-activity-section',surprise:'v34-surprise',new:'v34-new-title',made:'v34-made-title',world:'v34-world-title',country:'v34-world-title'}[visualMode];if(id)document.getElementById(id)?.scrollIntoView({block:'start',behavior:'instant'});if(visualMode==='country')setTimeout(()=>document.querySelector('[data-v34-country="ITA"]')?.click(),500);if(visualMode==='country-recipe')setTimeout(()=>{document.querySelector('[data-v34-country="ITA"]')?.click();setTimeout(()=>document.querySelector('#v34-country-dialog [data-open]')?.click(),700)},500)},1300))</script>`;
if (!html.includes('</head>')) throw new Error('Transformed preview has no head element.');
html = html.replace('</head>', `${shim}</head>`);
fs.writeFileSync(file, html);
console.log('Prepared visual-only Magical Adventure page. No APK is produced by this workflow.');
