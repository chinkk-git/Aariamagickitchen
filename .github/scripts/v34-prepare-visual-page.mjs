import fs from 'node:fs';

const file = process.argv[2];
if (!file) throw new Error('Usage: node v34-prepare-visual-page.mjs <transformed-html>');
let html = fs.readFileSync(file, 'utf8');
const shim = `<script id="v34-visual-review-only">const visualParams=new URLSearchParams(location.search),visualMode=visualParams.get('visual');function setVisualHomeStyle(){try{localStorage.setItem('aaria.v34.homeStyle',visualMode==='classic'?'classic':'magical')}catch{}}setVisualHomeStyle();window.addEventListener('load',()=>setTimeout(()=>{setVisualHomeStyle();if(typeof render==='function')render();const selector={carousel:'.v34-activity-section',surprise:'.v34-surprise',new:'#v34-new-title',made:'#v34-made-title',world:'#v34-world-title',country:'#v34-world-title'}[visualMode];document.querySelector(selector)?.scrollIntoView({block:'start',behavior:'instant'});if(visualMode==='carousel'){const viewport=document.querySelector('[data-v34-activity-viewport]'),count=Number(visualParams.get('activity')||0);for(let i=0;i<count;i++)viewport?.dispatchEvent(new KeyboardEvent('keydown',{key:'ArrowRight',bubbles:true}))}if(visualMode==='settings')setTimeout(()=>document.querySelector('.v34-settings')?.click(),450);if(visualMode==='country')setTimeout(()=>document.querySelector('[data-v34-country="ITA"]')?.click(),500);if(visualMode==='country-recipe'||visualMode==='country-back')setTimeout(()=>{document.querySelector('[data-v34-country="ITA"]')?.click();setTimeout(()=>document.querySelector('#v34-country-dialog [data-open]')?.click(),700)},500)},1200))</script>`;
if (!html.includes('</head>')) throw new Error('Transformed preview has no head element.');
html = html.replace('</head>', `${shim}</head>`);
fs.writeFileSync(file, html);
console.log('Prepared visual-only Magical Adventure page. No APK is produced by this workflow.');
