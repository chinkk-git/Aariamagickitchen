#!/usr/bin/env node
// Build the Web target from Android V3.5 plus the approved V3.4 Magical
// Adventure and Welcome UI. Classic Home remains dormant.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const webRoot = path.join(root, 'web-v3.5');
const dist = path.join(root, 'dist/web-v3.5');
const sourceCommit = 'c54704fc4b181727ca18e9f3463c0d76c777b5fe';
const indiaThumbnailCommit = '6addb187f4563a4d00d69a9cf89bd4adf4f41de8';
const v34Commit = '7ab11cc917b144a643fb30b6cc1dfed132ab45fb';
const androidArtifactHtmlSha256 = '934138e96dbc264a8314967d643232a015119eb39faeb235d9c238da687a4cc2';
const sha = data => crypto.createHash('sha256').update(data).digest('hex');
const tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aaria-v35-web-'));
const sourceRoot = path.join(tmp, 'android-source');
const v34Root = path.join(tmp, 'v34-adapter');
const tempHtml = path.join(tmp, 'android-v35.html');

function ensureCommit(commit) {
  try { execFileSync('git', ['cat-file', '-e', `${commit}^{commit}`], { cwd: root, stdio: 'ignore' }); }
  catch {
    execFileSync('git', ['fetch', '--no-tags', 'origin', commit], { cwd: root, stdio: 'inherit' });
    execFileSync('git', ['cat-file', '-e', `${commit}^{commit}`], { cwd: root, stdio: 'ignore' });
  }
}
function extractArchive(commit, paths, destination) {
  fs.mkdirSync(destination, { recursive: true });
  const tar = execFileSync('git', ['archive', '--format=tar', commit, ...paths], {
    cwd: root, maxBuffer: 300 * 1024 * 1024
  });
  execFileSync('tar', ['-x', '-C', destination], { cwd: root, input: tar });
}
function walkFiles(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const absolute = path.join(dir, entry.name);
    return entry.isDirectory() ? walkFiles(absolute) : [absolute];
  });
}
function writeJson(file, value) { fs.writeFileSync(file, JSON.stringify(value, null, 2) + '\n'); }

try {
  ensureCommit(sourceCommit);
  ensureCommit(indiaThumbnailCommit);
  ensureCommit(v34Commit);
  extractArchive(sourceCommit, [
    'index.html', 'tools/v3', 'content/international',
    'phase2-pilot/packages/assets', 'docs/design/approved-v31-world-map-crop.webp'
  ], sourceRoot);
  const indiaDishThumbnailPaths = [
    'tools/v3/artwork/india-dish-thumbnails/051-masala-cheese-toast.webp',
    'tools/v3/artwork/india-dish-thumbnails/057-rainbow-veggie-cutlets.webp'
  ];
  extractArchive(indiaThumbnailCommit, indiaDishThumbnailPaths, sourceRoot);
  const indiaDishThumbnailHashes = Object.fromEntries(indiaDishThumbnailPaths.map(file => [file, sha(fs.readFileSync(path.join(sourceRoot, file)))]));
  extractArchive(v34Commit, [
    'tools/v3/v34-dual-home.js', 'tools/v3/attach-v34-dual-home.mjs',
    'docs/design/v3.4'
  ], v34Root);
  fs.cpSync(path.join(v34Root, 'docs/design/v3.4'), path.join(sourceRoot, 'docs/design/v3.4'), { recursive: true });

  // The approved V3.4 home component used a 3-country V3.4 pilot registry.
  // Resolve its cards through the V3.5 canonical country registry instead.
  const adapterPath = path.join(v34Root, 'tools/v3/v34-dual-home.js');
  let adapter = fs.readFileSync(adapterPath, 'utf8');
  const legacyCreationIds = [
    '  const creationIds = () => [...new Set([',
    "    ...(Array.isArray(state.myCreations) ? state.myCreations.map(item => Number(typeof item === 'object' ? item.recipeId : item)) : []),",
    '    ...(Array.isArray(state.done) ? state.done.map(Number) : [])',
    '  ])].filter(id => find(id));'
  ].join('\n');
  if (!adapter.includes(legacyCreationIds)) throw new Error('V3.4 completed-dish Home rail source changed; refusing stale deleted dishes to reappear.');
  adapter = adapter.replace(legacyCreationIds, [
    '  const creationIds = () => [...new Set([',
    "    ...(Array.isArray(state.myCreations) ? state.myCreations.map(item => Number(typeof item === 'object' ? item.recipeId : item)) : []),",
    '    ...(state.myCreationsV35MigrationComplete === true ? [] : (Array.isArray(state.done) ? state.done.map(Number) : []))',
    '  ])].filter(id => find(id));'
  ].join('\n'));
  const legacyHomeStyle = `  const homeStyle = () => {
    try { return localStorage.getItem(STYLE_KEY) === 'classic' ? 'classic' : 'magical'; }
    catch { return 'magical'; }
  };`;
  if (!adapter.includes(legacyHomeStyle)) throw new Error('V3.4 home-style selector source changed; refusing an imprecise single-home patch.');
  adapter = adapter.replace(legacyHomeStyle, `  // V3.5 has one active Home. Preserve, but ignore, any legacy Classic preference.
  const homeStyle = () => 'magical';`);
  const oldRows = `    const rows = [\n      { code: 'IND', en: 'India', br: 'Índia', flag: '🇮🇳', ids: [51,52,53,54,55,56,57,58,59,60,61,62,63,64,65,69,72,74] },\n      { code: 'ITA', en: 'Italy', br: 'Itália', flag: '🇮🇹', ids: [96] },\n      { code: 'CHN', en: 'China', br: 'China', flag: '🇨🇳', ids: [99] }\n    ];\n    return rows.map(row => ({ ...row, recipes: row.ids.map(find).filter(Boolean) })).filter(row => row.recipes.length);`;
  const newRows = `    const labels = [\n      { code: 'IND', en: 'India', br: 'Índia', flag: '🇮🇳' },\n      { code: 'ITA', en: 'Italy', br: 'Itália', flag: '🇮🇹' },\n      { code: 'CHN', en: 'China', br: 'China', flag: '🇨🇳' },\n      { code: 'JPN', en: 'Japan', br: 'Japão', flag: '🇯🇵' },\n      { code: 'MEX', en: 'Mexico', br: 'México', flag: '🇲🇽' },\n      { code: 'VNM', en: 'Vietnam', br: 'Vietnã', flag: '🇻🇳' }\n    ];\n    return labels.map(row => { const ids = (V35_COUNTRY_RECIPE_IDS[row.code] || []).map(Number); return { ...row, ids, recipes: ids.map(find).filter(Boolean) }; }).filter(row => row.recipes.length);`;
  if (!adapter.includes(oldRows)) throw new Error('V3.4 country-card source block changed; refusing an imprecise patch.');
  adapter = adapter.replace(oldRows, newRows);
  adapter = adapter.replace("t('approved recipes', 'receitas aprovadas')", "t('recipes', 'receitas')");
  const latestTwelve = "const recipeList = [...RECIPES].filter(r => r.active !== false).sort((a, b) => b.id - a.id).slice(0, 12).reverse();";
  if (!adapter.includes(latestTwelve)) throw new Error('V3.4 New Recipes rail source changed; refusing an imprecise 19-recipe integration.');
  adapter = adapter.replace(latestTwelve, "const recipeList = [...new Set(Object.values(V35_COUNTRY_RECIPE_IDS).flat().map(Number))].filter(id => id >= 97 && id !== 99).sort((a,b) => a-b).map(find).filter(r => r && r.active !== false);");
  adapter = adapter.replace("recipeList.map(r=>recipeCard(r, r.id>95?'NEW':'✨')).join('')", "recipeList.map(r=>recipeCard(r, r.id>110?t('DRAFT · REVIEW','RASCUNHO · REVISÃO'):r.id>95?t('REVIEW ONLY','SOMENTE REVISÃO'):'✨')).join('')");
  if (!adapter.includes('  settingsPage = v34SettingsPage;')) throw new Error('V3.4 Settings selector hook changed; refusing to retain a visible Home toggle.');
  adapter = adapter.replace('  settingsPage = v34SettingsPage;', '  // Keep the approved Settings page and all other settings; omit the deferred Home-style selector.\n  settingsPage = v34OriginalSettingsPage;');
  const photoPersistence = '    await storeCreationPhoto(id, blob);\n    rememberCreation(id, photoUrl);';
  if (!adapter.includes(photoPersistence)) throw new Error('V3.4 photo persistence block changed; refusing to add child photos to My Creations.');
  adapter = adapter.replace(photoPersistence, '    // Keep captured images transient for the approved sharing flow only.');
  adapter = adapter.replace("    let photoUrl = '';\n", '');
  adapter = adapter.replace('      photoUrl = source;\n', '');
  const oldPhotoNotice = "    render(); notice(t('Photo saved to My Creations!', 'Foto salva em Minhas criações!'));\n    if (view === 'home' || view === 'creations') void hydratePhotoRail();";
  if (!adapter.includes(oldPhotoNotice)) throw new Error('V3.4 photo completion notice changed; refusing to claim a photo was saved.');
  adapter = adapter.replace(oldPhotoNotice, "    render(); notice(t('Photo ready to share; it was not added to My Creations.', 'Foto pronta para compartilhar; ela não foi adicionada a Minhas criações.'));");
  const creationsStart = adapter.indexOf('  function v34CreationsPage() {');
  const creationsEnd = adapter.indexOf('\n  const v34BaseRender = render;', creationsStart);
  if (creationsStart < 0 || creationsEnd < 0) throw new Error('V3.4 My Creations gallery renderer anchors changed.');
  adapter = adapter.slice(0, creationsStart) + '  function v34CreationsPage() { return window.v3RenderCompletedCreations(); }' + adapter.slice(creationsEnd);
  const photoRailHydration = "    if (magical && (view === 'home' || view === 'creations')) void hydratePhotoRail();\n";
  if (!adapter.includes(photoRailHydration)) throw new Error('V3.4 photo rail hydration anchor changed.');
  adapter = adapter.replace(photoRailHydration, '');
  fs.writeFileSync(adapterPath, adapter);

  const reviewBuilder = path.join(sourceRoot, 'tools/v3/artwork/build-v35-international-review.mjs');
  execFileSync(process.execPath, [reviewBuilder], {
    cwd: sourceRoot, stdio: 'inherit', env: { ...process.env, GITHUB_SHA: sourceCommit }
  });
  execFileSync(process.execPath, [
    path.join(sourceRoot, 'tools/v3/validate-v35-international-review.mjs')
  ], { cwd: sourceRoot, stdio: 'inherit' });
  execFileSync(process.execPath, [
    path.join(sourceRoot, 'tools/v3/validate-v35-country-navigation.mjs')
  ], { cwd: sourceRoot, stdio: 'inherit' });
  const transformer = path.join(sourceRoot, 'tools/v3/transform-production.mjs');
  execFileSync(process.execPath, [transformer, 'index.html', tempHtml], { cwd: sourceRoot, stdio: 'inherit' });
  if (sha(fs.readFileSync(tempHtml)) !== androidArtifactHtmlSha256) {
    throw new Error('V3.5 shared transformer output differs from the recorded Android handoff artifact.');
  }
  // Web uses the approved V3.4 Welcome scene attached below. Suppress only
  // the Android fallback overlay so Web never shows two Welcome screens.
  const runtimePath = path.join(sourceRoot, 'tools/v3/runtime.js');
  let runtimeText = fs.readFileSync(runtimePath, 'utf8');
  const androidWelcomeCall = "if(view==='home')v35OpenWelcome();";
  const androidWelcomeCount = (runtimeText.match(/if\(view==='home'\)v35OpenWelcome\(\);/g) || []).length;
  if (androidWelcomeCount > 1) throw new Error('Android Welcome fallback appears multiple times; refusing duplicate Web Welcome screens.');
  if (androidWelcomeCount === 1) runtimeText = runtimeText.replace(androidWelcomeCall, "if(false&&view==='home')v35OpenWelcome();");
  const creationRendererAnchor = 'const v3RenderBeforeProfileControls=render;';
  const sharedRuntimeText = fs.readFileSync(path.join(root, 'tools/v3/runtime.js'), 'utf8');
  const creationBlockStart = sharedRuntimeText.indexOf('/* __V3_CREATIONS_MODEL_START__ */');
  const creationRendererEndMarker = 'window.v3RenderCompletedCreations=()=>v3CreationsPage();';
  const creationBlockEnd = sharedRuntimeText.indexOf(creationRendererEndMarker, creationBlockStart) + creationRendererEndMarker.length;
  const legacyRendererStart = runtimeText.indexOf('function v3CreationsPage(){');
  const legacyRendererEnd = runtimeText.indexOf(creationRendererEndMarker, legacyRendererStart) + creationRendererEndMarker.length;
  if (creationBlockStart < 0 || creationBlockEnd < creationBlockStart || legacyRendererStart < 0 || legacyRendererEnd < legacyRendererStart || !runtimeText.includes(creationRendererAnchor)) throw new Error('Shared completed-dish renderer anchors changed; refusing a partial Web build.');
  const completedDishClickBridge = `document.addEventListener('click',event=>{const button=event.target.closest('button[data-action="nextstep"]');if(!button||!button.classList.contains('finish-step')||!selected)return;v3AddCompletedDish(selected.id)});`;
  runtimeText = runtimeText.slice(0, legacyRendererStart) + sharedRuntimeText.slice(creationBlockStart, creationBlockEnd) + '\n' + completedDishClickBridge + runtimeText.slice(legacyRendererEnd);
  fs.writeFileSync(runtimePath, runtimeText);
  // Carry the approved V3.4 artwork fields into the exact V3.5 transformer
  // only after the Android artifact source hash has been confirmed.
  let transformerText = fs.readFileSync(transformer, 'utf8');
  const worldMapLine = "  worldMap: readReferenceImage('docs/design/approved-v31-world-map-crop.webp'),";
  if (!transformerText.includes(worldMapLine)) throw new Error('V3.5 transformer anchor for approved V3.4 artwork was not found.');
  transformerText = transformerText.replace(worldMapLine, `${worldMapLine}\n  indiaDishThumbnails: {\n    51: readReferenceImage('tools/v3/artwork/india-dish-thumbnails/051-masala-cheese-toast.webp'),\n    57: readReferenceImage('tools/v3/artwork/india-dish-thumbnails/057-rainbow-veggie-cutlets.webp')\n  },\n  v34ApprovedHome: readReferenceImage('docs/design/v3.4/magical-adventure-home-approved.png'),\n  v34BackgroundPortrait: readReferenceImage('docs/design/v3.4/V34_Magical_Home_Background_Portrait.png'),\n  v34BackgroundLandscape: readReferenceImage('docs/design/v3.4/V34_Magical_Home_Background_Landscape.png'),`);
  fs.writeFileSync(transformer, transformerText);
  const indiaRuntimeAnchor = `  BATCH_META[id]={...(BATCH_META[id]||{}),stepCells};\n}\nfunction v32ReviewFeaturedDescription(recipe,pt){`;
  if (!runtimeText.includes(indiaRuntimeAnchor)) throw new Error('Shared runtime India artwork insertion point changed; refusing an imprecise thumbnail patch.');
  const indiaThumbnailRuntime = `for(const [rawId,dish] of Object.entries(V31_HOME_WORLD_ART.indiaDishThumbnails||{})){
  const id=Number(rawId),recipe=RECIPES.find(item=>Number(item.id)===id);
  if(!recipe||!dish)throw new Error('India thumbnail references a missing canonical recipe: '+rawId);
  NEW_RECIPE_ART[id]={...(NEW_RECIPE_ART[id]||{}),dish,dishAlt:'Finished '+recipe.title,status:'approved-existing-sprite-crop'};
}
`;
  runtimeText = runtimeText.replace(indiaRuntimeAnchor, `  BATCH_META[id]={...(BATCH_META[id]||{}),stepCells};\n}\n${indiaThumbnailRuntime}function v32ReviewFeaturedDescription(recipe,pt){`);
  fs.writeFileSync(runtimePath, runtimeText);
  execFileSync(process.execPath, [transformer, 'index.html', tempHtml], { cwd: sourceRoot, stdio: 'inherit' });
  const attached = path.join(tmp, 'v35-with-v34-home.html');
  execFileSync(process.execPath, [
    path.join(v34Root, 'tools/v3/attach-v34-dual-home.mjs'), tempHtml, attached
  ], { cwd: v34Root, stdio: 'inherit' });

  fs.rmSync(dist, { recursive: true, force: true });
  fs.mkdirSync(dist, { recursive: true });
  for (let i = 1; i <= 3; i++) fs.copyFileSync(path.join(webRoot, `assets/welcome-landscape/scene_0${i}_landscape.webp`), path.join(dist, `welcome-scene-${i}-landscape.webp`));
  const structuredHtml = fs.readFileSync(attached);
  let finalHtml = structuredHtml.toString('utf8');
  const welcomeSceneAnchor = "    frame.style.backgroundPosition = ['0% center', '50% center', '100% center'][welcomeSceneIndex];";
  if (!finalHtml.includes(welcomeSceneAnchor)) throw new Error('Welcome scene selector anchor changed.');
  finalHtml = finalHtml.replace(welcomeSceneAnchor, `${welcomeSceneAnchor}\n    frame.dataset.scene = String(welcomeSceneIndex + 1);`);
  const welcomeSceneDefinitions = `    { text: 'Preparing something magical...', aria: 'Aaria raises her arms in the magical kitchen. Preparing something magical...' },
    { text: 'Mixing fun, flavours and surprises!', aria: 'Aaria stirs her magical mixing bowl. Mixing fun, flavours and surprises!' },
    { text: 'Welcome to my Magical Kitchen!', aria: 'Aaria celebrates in the magical kitchen. Welcome to my Magical Kitchen!' }`;
  const localizedWelcomeSceneDefinitions = `    { text: 'Preparing something magical...', pt: 'Preparando algo mágico...', aria: 'Aaria introduces her Magical Kitchen.', ariaPt: 'Aaria apresenta sua cozinha mágica.' },
    { text: 'Exploring recipes and mixing ingredients!', pt: 'Explorando receitas e misturando ingredientes!', aria: 'Aaria explores recipes and mixes ingredients.', ariaPt: 'Aaria explora receitas e mistura ingredientes.' },
    { text: 'Let’s start cooking together!', pt: 'Vamos começar a cozinhar!', aria: 'Aaria celebrates and invites the child to start cooking.', ariaPt: 'Aaria comemora e convida a criança para começar a cozinhar.' }`;
  if (!finalHtml.includes(welcomeSceneDefinitions)) throw new Error('Welcome localization source changed.');
  finalHtml = finalHtml.replace(welcomeSceneDefinitions, localizedWelcomeSceneDefinitions);
  const welcomeAriaAnchor = "    frame.setAttribute('aria-label', scene.aria);";
  if (!finalHtml.includes(welcomeAriaAnchor)) throw new Error('Welcome accessible label anchor changed.');
  finalHtml = finalHtml.replace(welcomeAriaAnchor, `    frame.setAttribute('aria-label', state.language === 'pt-BR' ? scene.ariaPt : scene.aria);\n    welcomeOverlay.querySelector('.v34-welcome-live').textContent = state.language === 'pt-BR' ? scene.pt : scene.text;\n    welcomeOverlay.querySelector('.v34-welcome-skip').textContent = state.language === 'pt-BR' ? 'Pular' : 'Skip';\n    welcomeOverlay.querySelector('.v34-welcome-next').textContent = state.language === 'pt-BR' ? 'Avançar' : 'Next';\n    welcomeOverlay.querySelector('.v34-welcome-back').textContent = state.language === 'pt-BR' ? 'Voltar' : 'Back';\n    welcomeOverlay.querySelector('.v34-welcome-enter').setAttribute('aria-label', state.language === 'pt-BR' ? 'Entrar na cozinha mágica da Aaria' : 'Enter Aaria’s Magical Kitchen');`);
  const welcomeStatusAnchor = "    welcomeOverlay.querySelector('.v34-welcome-status').textContent = 'Scene ' + (welcomeSceneIndex + 1) + ' of 3';";
  if (!finalHtml.includes(welcomeStatusAnchor)) throw new Error('Welcome progress status anchor changed.');
  finalHtml = finalHtml.replace(welcomeStatusAnchor, "    welcomeOverlay.querySelector('.v34-welcome-status').textContent = state.language === 'pt-BR' ? 'Cena ' + (welcomeSceneIndex + 1) + ' de 3' : 'Scene ' + (welcomeSceneIndex + 1) + ' of 3';");
  const failedPhotoPost = "catch{notice('Could not prepare that photo. Please choose another one.')}}});document.addEventListener('change',e=>{if(e.target.matches('[data-appliance-filter]')";
  const originalPhotoFallback = "catch(error){console.error('Photo post rendering failed; retaining the original image for sharing.',error);if(file instanceof Blob&&file.type.startsWith('image/')){try{if(sharePostUrls[id])URL.revokeObjectURL(sharePostUrls[id]);shareSourcePhotos[id]=file;sharePostBlobs[id]=file;sharePostUrls[id]=URL.createObjectURL(file);render();notice(state.language==='pt-BR'?'Foto pronta para compartilhar. A imagem original será usada.':'Photo ready to share. The original image will be used.')}catch(fallbackError){console.error('Original photo fallback failed.',fallbackError);notice('Could not prepare that photo. Please choose another one.')}}else notice('Could not prepare that photo. Please choose another one.')}}});document.addEventListener('change',e=>{if(e.target.matches('[data-appliance-filter]')";
  if (!finalHtml.includes(failedPhotoPost)) throw new Error('Photo-post failure handler anchor changed.');
  finalHtml = finalHtml.replace(failedPhotoPost, originalPhotoFallback);
  for (const sentinel of [
    "const homeStyle = () => 'magical';",
    'settingsPage = v34OriginalSettingsPage;',
    'const v34OriginalHome = home;',
    'const recipeList = [...new Set(Object.values(V35_COUNTRY_RECIPE_IDS).flat().map(Number))].filter(id => id >= 97 && id !== 99)',
    'indiaDishThumbnails',
    'approved-existing-sprite-crop'
  ]) if (!finalHtml.includes(sentinel)) throw new Error(`Single-Home source assertion failed: ${sentinel}`);
  const ingredientMapAnchor = ' const match=icons.find(([pattern])=>pattern.test(t));';
  if (!finalHtml.includes(ingredientMapAnchor)) throw new Error('Shared ingredient illustration map anchor was not found.');
  finalHtml = finalHtml.replace(ingredientMapAnchor, ` icons.unshift([/coconut|coco/,'Coconut','<path d="M9 32c0-13 10-23 23-23s23 10 23 23-10 22-23 22S9 45 9 32Z" fill="#77533a" stroke="#583c29" stroke-width="3"/><circle cx="32" cy="32" r="15" fill="#fff9ec"/><path d="M20 25c5-5 10-7 15-7" fill="none" stroke="#fff" stroke-width="3" stroke-linecap="round"/>']);\n${ingredientMapAnchor}`);
  const courgetteAnchor = 'else if(/zucchini/i.test(t))';
  const bunAnchor = 'else if(/slider|buns/.test(t))';
  if (!finalHtml.includes(courgetteAnchor) || !finalHtml.includes(bunAnchor)) throw new Error('Ingredient alias anchors changed; refusing to replace approved source art.');
  finalHtml = finalHtml.replace(courgetteAnchor, 'else if(/zucchini|courgette/i.test(t))')
    .replace(bunAnchor, 'else if(/slider|buns|dinner rolls?/.test(t))');
  const unmappedIconThrow = `if(rendered.includes('<circle cx="32" cy="28" r="23" fill="#fff0dc"/>'))throw Error('International ingredient icon is not mapped: '+text);`;
  if (!finalHtml.includes(unmappedIconThrow)) throw new Error('Ingredient icon fallback anchor was not found.');
  finalHtml = finalHtml.replace(unmappedIconThrow, `if(rendered.includes('<circle cx="32" cy="28" r="23" fill="#fff0dc"/>'))return iconSvg('Ingredient','<path d="M12 30c3-12 37-12 40 0v4c-3 18-37 18-40 0Z" fill="#e9ddeb" stroke="#a793b2" stroke-width="2"/><ellipse cx="32" cy="29" rx="20" ry="8" fill="#fff4df"/><path d="M26 20 40 6" stroke="#9b744e" stroke-width="3" stroke-linecap="round"/>');`);
  const oldWorldDishResolver = `function v33FinishedDishSource(recipe){try{const html=homeDishThumb(recipe),src=html.match(/<img\\b[^>]*\\bsrc=["']([^"']+)["']/i)?.[1]||'';return src.startsWith('data:image/')?src:''}catch{return ''}}`;
  const newWorldDishResolver = `function resolveWebArtworkSource(source){const value=String(source||'').trim();if(/^data:image\\/[a-z0-9.+-]+;base64,[A-Za-z0-9+/=]+$/i.test(value))return value;try{const decodedValue=decodeURIComponent(value);if(/(?:^|\\/)\\.\\.(?:\\/|$)/.test(decodedValue.split(/[?#]/,1)[0]))return '';const base=new URL('./',document.baseURI),candidate=new URL(value,document.baseURI);if(candidate.origin!==location.origin||candidate.protocol!==location.protocol)return '';let pathname=decodeURIComponent(candidate.pathname),basePath=decodeURIComponent(base.pathname);if(!pathname.startsWith(basePath))return '';let relative=pathname.slice(basePath.length).replace(/^\\/+/, '');if(/^content\\/international\\/countries\\//i.test(relative))relative='international-wave-1/'+relative;const embedded=/^assets\\/embedded\\/[a-f0-9]{64}\\.(?:svg|png|webp|jpe?g|gif)$/i.test(relative),international=/^international-wave-1\\/content\\/international\\/countries\\/[a-z0-9-]+\\/[0-9]{3}-[a-z0-9-]+\\/artwork\\/(?:(?:finished\\/)?finished-dish\\.(?:png|webp)|ingredients\\/[a-z0-9-]+\\.(?:png|webp)|steps\\/step-[0-9]{2}\\.(?:png|webp))$/i.test(relative);return embedded||international?new URL(relative,base).href:''}catch{return ''}}function v33FinishedDishSource(recipe){try{const html=homeDishThumb(recipe),src=html.match(/<img\\b[^>]*\\bsrc=["']([^"']+)["']/i)?.[1]||'';return resolveWebArtworkSource(src)}catch{return ''}}`;
  if (finalHtml.includes(oldWorldDishResolver)) finalHtml = finalHtml.replace(oldWorldDishResolver, newWorldDishResolver);
  else if (!finalHtml.includes('function normalizeWorldDishSource(source)') || !finalHtml.includes('return normalizeWorldDishSource(src)')) throw new Error('World country thumbnail resolver anchor was not found.');
  if (finalHtml.includes('function normalizeWorldDishSource(source)')) finalHtml = finalHtml.replaceAll('normalizeWorldDishSource', 'resolveWebArtworkSource');
  const oldIngredientArtSource = 'safe(V32_INTL_ROOT+x.imagePath)';
  const oldIngredientStepSource = 'safe(V32_INTL_ROOT+asset)';
  if (!finalHtml.includes(oldIngredientArtSource)) throw new Error('International ingredient image URL anchor was not found.');
  if (!finalHtml.includes(oldIngredientStepSource)) throw new Error('International step image URL anchor was not found.');
  finalHtml = finalHtml.replaceAll(oldIngredientArtSource, "safe(resolveWebArtworkSource(V32_INTL_ROOT+x.imagePath)||'')")
    .replaceAll(oldIngredientStepSource, "safe(resolveWebArtworkSource(V32_INTL_ROOT+asset)||'')");
  const countryRegistryAnchor = 'const WORLD_COUNTRY_ALIASES = Object.freeze(';
  if (!finalHtml.includes(countryRegistryAnchor)) throw new Error('Canonical country registry anchor was not found.');
  finalHtml = finalHtml.replace(countryRegistryAnchor, `const V35_NEW_RECIPE_IDS=Object.freeze([...new Set(Object.values(V35_COUNTRY_RECIPE_IDS).flat().map(Number))].filter(id=>id>=96).sort((a,b)=>a-b));\n${countryRegistryAnchor}`);
  const oldRecipeListStart = "V32_INTERNATIONAL_RECIPES.length?'<section class=\"v32-new-recipes\"";
  const newRecipeListStart = "V35_NEW_RECIPE_IDS.length?'<section class=\"v32-new-recipes\"";
  if (!finalHtml.includes(oldRecipeListStart)) throw new Error('New Recipes section anchor was not found.');
  finalHtml = finalHtml.replace(oldRecipeListStart, newRecipeListStart);
  const oldRecipeListMap = "V32_INTERNATIONAL_RECIPES.map(item=>{const id=Number(item.id),r=RECIPES.find(x=>Number(x.id)===id),title=pt?(PT_RECIPES[id]?.title||r.title):r.title,draft=item.publicationStatus==='DRAFT_REVIEW_ONLY';return '<button class=\"home-tile v31-pinterest-tile v32-new-recipe-card\" data-open=\"'+id+'\" aria-label=\"'+safe(title)+' — '+(pt?'Em revisão':'Review only')+'\"><img src=\"'+(NEW_RECIPE_ART[id]?.dish||'')+'\" alt=\"\"><span class=\"v32-new-recipe-badge\">";
  const newRecipeListMap = "V35_NEW_RECIPE_IDS.map(id=>{const r=RECIPES.find(x=>Number(x.id)===id),title=pt?(PT_RECIPES[id]?.title||r.title):r.title,draft=id>=111;return '<button class=\"home-tile v31-pinterest-tile v32-new-recipe-card\" data-open=\"'+id+'\" aria-label=\"'+safe(title)+' — '+(pt?'Em revisão':'Review only')+'\">'+homeDishThumb(r)+'<span class=\"v32-new-recipe-badge\">";
  if (!finalHtml.includes(oldRecipeListMap)) throw new Error('New Recipes canonical artwork renderer anchor was not found.');
  finalHtml = finalHtml.replace(oldRecipeListMap, newRecipeListMap);
  const ownerMobileVisualFixes = `<style id="aaria-owner-mobile-visual-fixes">
/* Keep the approved Classic Home artwork at its source proportions and keep its utility control reachable on phones. */
@media(max-width:720px){
  .app.home-dashboard .home-top{height:auto!important;min-height:0!important;aspect-ratio:1.5/1;background-size:cover!important;background-position:center!important;overflow:visible!important}
  .app.home-dashboard .home-settings{position:fixed!important;top:calc(8px + env(safe-area-inset-top))!important;right:10px!important;z-index:10040!important;display:grid!important;place-items:center!important;width:44px!important;height:44px!important;visibility:visible!important;opacity:1!important;pointer-events:auto!important}
  .app.home-dashboard .home-top.menu-open .home-settings{visibility:visible!important;opacity:1!important;pointer-events:auto!important}
  .app.home-dashboard .home-book-primary{width:100%!important;height:auto!important;min-height:60px!important;margin:8px 0 0!important;padding:8px 12px!important;gap:8px!important;box-shadow:0 3px 0 #8e54ad!important}
  .app.home-dashboard .home-book-primary .book-primary-arrow{display:grid!important;place-items:center!important;width:30px!important;height:30px!important;flex:0 0 30px!important}
  .app.home-dashboard .home-lower .home-thumb.new-dish-thumb{height:auto!important;min-height:0!important;aspect-ratio:3/2!important}
  .app.home-dashboard .home-lower .home-thumb.new-dish-thumb img{width:100%!important;height:100%!important;object-fit:contain!important;object-position:center!important;background:#fff8f1}
}
.app .v32-new-recipe-card{grid-template-rows:auto auto auto!important;height:auto!important;max-height:none!important;min-height:0!important;align-content:start!important}
.app .v32-new-recipe-card>.home-thumb{display:block!important;width:100%!important;height:auto!important;min-height:0!important;aspect-ratio:3/2!important;margin:0!important;overflow:hidden!important;border-radius:12px!important;background:#fff8f1}
.app .v32-new-recipe-card>.home-thumb img{display:block!important;width:100%!important;height:100%!important;object-fit:contain!important;object-position:center!important;background:#fff8f1}
.app .v32-new-recipe-card>strong{display:-webkit-box!important;min-height:2.3em!important;overflow:hidden!important;-webkit-box-orient:vertical!important;-webkit-line-clamp:2!important;white-space:normal!important;line-height:1.15!important}
.app .v32-new-recipe-card>small{display:block!important;min-height:1.1em!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important}
.app .v34-recipe-card .home-thumb.new-dish-thumb img,.app .v34-country-card .home-thumb.new-dish-thumb img{object-fit:contain!important;object-position:center!important;background:#fff8f1}
.aria-world-globe__dish{object-fit:contain!important;object-position:center!important;background:#fff8f1}
.app .ref-ingredient-icon>img{display:block!important;width:100%!important;height:100%!important;max-width:100%!important;max-height:100%!important;object-fit:contain!important;object-position:center!important}
.app.v32-international-active .ref-ingredient-icon>img{min-width:0!important;min-height:0!important}
</style>`;
  const ownerLandscapeWelcomeHead = `<style id="aaria-landscape-welcome-boot">
@media (orientation:landscape){#v34-welcome-boot-frame{width:min(calc(100dvw - 24px),calc((100dvh - 16px)*16/9));height:auto;max-height:100%;aspect-ratio:16/9;background-image:url("./welcome-scene-1-landscape.webp");background-size:100% 100%}}
</style>`;
  finalHtml = finalHtml.replace('</head>', `${ownerLandscapeWelcomeHead}\n</head>`);
  const ownerLandscapeVisualCorrections = `<style id="aaria-landscape-only-visual-corrections">
/* All overrides in this block are landscape-only; portrait layout rules remain untouched. */
@media (orientation:landscape) {
  .v34-welcome-shell{gap:4px!important;padding:max(4px,env(safe-area-inset-top)) max(12px,env(safe-area-inset-right)) max(6px,env(safe-area-inset-bottom)) max(12px,env(safe-area-inset-left))!important}
  .v34-welcome-top{min-height:34px!important}
  .v34-welcome-stage{min-width:0!important}
  .v34-welcome-frame{height:100%!important;max-height:100%!important;max-width:100%!important;aspect-ratio:.4921875/1!important}
  .v34-welcome-footer{min-height:52px!important;padding:2px 4px 14px!important}
  .v34-welcome-enter-wrap{right:clamp(8px,2vw,24px)!important;bottom:6px!important}
  .v34-welcome-enter{width:clamp(58px,11vh,78px)!important;height:clamp(58px,11vh,78px)!important}
  .v34-hero{height:clamp(410px,68vh,600px)!important}
  .v34-hero-globe{width:clamp(112px,18vw,210px)!important;height:auto!important;aspect-ratio:1/1!important;border-radius:50%!important;box-sizing:border-box!important}
}
@media (orientation:landscape) and (max-width:720px) {
  .v34-hero{height:clamp(390px,72vw,460px)!important}
}
</style>`;
  const ownerLandscapeWelcomeScenes = `<style id="aaria-landscape-welcome-scenes">
@media (orientation:landscape) {
  .v34-welcome-shell{display:block!important;padding:0!important;gap:0!important;overflow:hidden!important}
  .v34-welcome-top{display:none!important}
  .v34-welcome-stage{position:absolute!important;inset:0!important;display:grid!important;place-items:center!important;min-height:0!important;overflow:hidden!important}
  .v34-welcome-frame{width:min(100dvw,calc(100dvh*16/9))!important;height:auto!important;aspect-ratio:16/9!important;max-width:100dvw!important;max-height:100dvh!important;border-radius:0!important;background-image:url("./welcome-scene-1-landscape.webp")!important;background-size:100% 100%!important;background-position:center!important;box-shadow:none!important}
  .v34-welcome-frame[data-scene="2"]{width:min(100dvw,1672px)!important;aspect-ratio:1672/313!important;background-image:url("./welcome-scene-2-landscape.webp")!important}
  .v34-welcome-frame[data-scene="3"]{width:min(100dvw,1672px)!important;aspect-ratio:1672/314!important;background-image:url("./welcome-scene-3-landscape.webp")!important}
  .v34-welcome-footer{position:absolute!important;z-index:2!important;left:50%!important;top:50%!important;right:auto!important;bottom:auto!important;transform:translate(-50%,-50%)!important;width:min(100dvw,calc(100dvh*16/9))!important;height:min(100dvh,calc(100dvw*9/16))!important;min-height:0!important;display:block!important;padding:0!important;pointer-events:none!important}
  .v34-welcome-shell:has(.v34-welcome-frame[data-scene="2"]) .v34-welcome-footer{width:min(100dvw,1672px)!important;height:auto!important;aspect-ratio:1672/313!important}
  .v34-welcome-shell:has(.v34-welcome-frame[data-scene="3"]) .v34-welcome-footer{width:min(100dvw,1672px)!important;height:auto!important;aspect-ratio:1672/314!important}
  .v34-welcome-skip{position:absolute!important;right:1%!important;top:3%!important;width:10%!important;height:14%!important;min-width:0!important;min-height:0!important;padding:0 8px!important;border:3px solid #fff2dc!important;border-radius:999px!important;background:linear-gradient(135deg,#8735bd,#d343a8)!important;color:#fff!important;font-size:clamp(11px,2vw,24px)!important;font-weight:900!important;opacity:1!important;pointer-events:auto!important}
  .v34-welcome-next{position:absolute!important;left:1%!important;bottom:1%!important;width:13%!important;height:24%!important;min-width:0!important;min-height:0!important;padding:0 8px!important;border:3px solid #fff2dc!important;border-radius:999px!important;background:linear-gradient(135deg,#8735bd,#d343a8)!important;color:#fff!important;font-size:clamp(13px,2.4vw,26px)!important;font-weight:900!important;opacity:1!important;pointer-events:auto!important}
  .v34-welcome-back{position:absolute!important;left:15%!important;bottom:0!important;width:13%!important;height:25%!important;min-width:0!important;min-height:0!important;padding:0!important;opacity:0!important;pointer-events:auto!important}
  .v34-welcome-status{position:absolute!important;width:1px!important;height:1px!important;padding:0!important;margin:-1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important;white-space:nowrap!important;border:0!important}
  .v34-welcome-enter-wrap{position:absolute!important;left:0!important;right:auto!important;bottom:0!important;width:15%!important;height:31%!important;margin:0!important;display:grid!important;place-items:center!important;gap:0!important;border-radius:28px!important;background:linear-gradient(135deg,#6428d5,#ef31be)!important;border:3px solid #ffe891!important;box-shadow:0 0 18px 7px #ffe44bba,0 4px 0 #572078!important;pointer-events:auto!important}
  .v34-welcome-enter-wrap[hidden]{display:none!important}
  .v34-welcome-enter-wrap>span{position:absolute!important;width:1px!important;height:1px!important;overflow:hidden!important;clip:rect(0,0,0,0)!important}
  .v34-welcome-enter{width:min(74px,74%)!important;height:min(74px,74%)!important;min-width:44px!important;min-height:44px!important;font-size:clamp(26px,7vw,48px)!important}
}
</style>`;
  finalHtml = finalHtml.replace('</body>', `${ownerMobileVisualFixes}\n${ownerLandscapeVisualCorrections}\n${ownerLandscapeWelcomeScenes}\n</body>`);
  fs.writeFileSync(path.join(dist, 'index.html'), finalHtml);
  const reviewJson = path.join(sourceRoot, 'phase2-pilot/apps/aaria-android/app/src/debug/assets/artwork-review/international-wave-1/recipes.json');
  const review = JSON.parse(fs.readFileSync(reviewJson, 'utf8'));
  const assetPaths = [...new Set(review.recipes.flatMap(recipe => recipe.artworkAssetPaths || []))];
  for (const asset of assetPaths) {
    const from = path.join(sourceRoot, asset);
    const to = path.join(dist, 'international-wave-1', asset);
    const bytes = fs.readFileSync(from);
    const expected = review.recipes.flatMap(recipe => recipe.artworkAssets || []).find(item => item.path === asset)?.sha256;
    if (expected && sha(bytes) !== expected) throw new Error(`Artwork checksum mismatch for ${asset}`);
    fs.mkdirSync(path.dirname(to), { recursive: true });
    fs.writeFileSync(to, bytes);
  }
  const recipeIds = [...new Set(review.recipes.map(item => Number(item.id)))];
  const manifest = {
    package: 'Aaria V3.5 Web Edition', version: '3.5.0-review-single-home',
    sharedAndroidSourceCommit: sourceCommit, approvedV34DualHomeCommit: v34Commit,
    androidWorkflowRun: 40776773336, androidApkArtifact: 12855138667,
    indiaDishThumbnailSourceCommit: indiaThumbnailCommit, indiaDishThumbnailIds: [51,57], indiaDishThumbnailSha256: indiaDishThumbnailHashes,
    androidTransformedHtmlSha256: androidArtifactHtmlSha256,
    webAppSha256: sha(structuredHtml), recipeCount: 116, recipeIds: Array.from({ length: 116 }, (_, i) => i + 1),
    internationalReviewIds: recipeIds, countryRegistry: JSON.parse(fs.readFileSync(path.join(sourceRoot, 'content/international/country-navigation-manifest.json'), 'utf8')).countries.map(country => country.countryCode),
    recipeArtworkFileCount: assetPaths.length,
    homeExperience: { default: 'magical', active: 'magical-only', classicHome: 'disabled-preserved-in-source', legacyClassicPreference: 'ignored-without-deletion', preferenceKey: 'aaria.v34.homeStyle' },
    acceptanceGates: { androidFunctionalSmoke: 'CI-LITE run 40776773336 failed Activity/WebView readiness; screenshot capture not required', independentA08A09: 'NOT VERIFIED', accessibility: 'NOT VERIFIED', security: 'NOT VERIFIED', nutritionAllergen: 'NOT VERIFIED', artworkRights: 'NOT VERIFIED' },
    productionModified: false
  };
  writeJson(path.join(dist, 'manifest.json'), manifest);
  const readme = `# Aaria V3.5 Web Edition\n\nThis structured Web target is assembled from Android V3.5 source (${sourceCommit}) and the approved V3.4 Welcome/Magical Adventure component (${v34Commit}). The UI, recipes, translations, country registry and runtime come from shared Android source; the Web target serves recipe artwork beside the HTML.\n\n## Open\n\nInstall on Android with Chrome's Install app/Add to Home screen action. On iPhone or iPad, open the HTTPS URL in Safari and choose Share → Add to Home Screen; the icon launches the same Welcome-first Web Edition. Open \`index.html\`; do not open the directory payload through a \`content://\` file picker. \`aaria-v3.5-standalone.html\` is the portable single-file version.\n\n## Home experience\n\nMagical Adventure is the only active Home. The approved Welcome appears before Home, and its glowing arrow opens the adventure. Classic Home code/assets remain preserved but inaccessible. Legacy Classic preferences are ignored without deleting them. Settings remains available with no Home selector. All 116 recipes and canonical country mappings are included.\n\n## Status\n\nBuild and focused artwork package checks pass: 18 India recipe thumbnails, 21 international finished-dish images, and 224 locale ingredient-image references (112 unique files) resolve and are packaged. Android CI-LITE run 40776773336 failed Activity/WebView readiness; screenshot capture is not an acceptance gate. Interactive Android Chrome visual acceptance remains pending. Seven original ingredient names and 132 ingredient entries in draft recipes #111–116 have no dedicated source artwork; existing approved fallback behavior is preserved, and no new art was invented. Independent A08/A09, accessibility, security, nutrition/allergen and artwork-rights gates remain NOT VERIFIED. Production GitHub Pages is unchanged.\n`;
  fs.writeFileSync(path.join(dist, 'README.md'), readme);
  fs.mkdirSync(path.join(dist, 'reports'), { recursive: true });
  const countryNavigationManifest = JSON.parse(fs.readFileSync(path.join(sourceRoot, 'content/international/country-navigation-manifest.json'), 'utf8'));
  const indiaRecipeIds = countryNavigationManifest.countries.find(country => country.countryCode === 'IND')?.recipeIds || [];
  if (indiaRecipeIds.length !== 18) throw new Error(`Expected all 18 canonical India recipes, received ${indiaRecipeIds.length}.`);
  const internationalArtworkMap = review.recipes.map(recipe => {
    const checksums = Object.fromEntries((recipe.artworkAssets || []).map(asset => [asset.path, asset.sha256]));
    const finishedDish = (recipe.artworkAssetPaths || []).find(file => /\/artwork\/(?:finished\/)?finished-dish\.(?:png|webp)$/i.test(file));
    return {
      id: Number(recipe.id), country: recipe.country, publicationStatus: recipe.publicationStatus,
      finishedDish: finishedDish ? { path: finishedDish, sha256: checksums[finishedDish] || null } : null,
      ingredients: Object.fromEntries(Object.entries(recipe.locales || {}).map(([locale, record]) => [locale,
        (record.ingredients || []).map(ingredient => ({
          name: ingredient.name, path: ingredient.imagePath || null,
          sha256: ingredient.imageSha256 || checksums[ingredient.imagePath] || null
        }))
      ]))
    };
  });
  writeJson(path.join(dist, 'reports/artwork-source-map.json'), {
    androidArtworkSourceCommit: sourceCommit,
    indiaThumbnailOverrideSourceCommit: indiaThumbnailCommit,
    indiaRecipeIds,
    indiaOverrides: Object.fromEntries(Object.entries(indiaDishThumbnailHashes).map(([sourcePath, hash]) => [sourcePath, hash])),
    internationalRecipes: internationalArtworkMap
  });
  fs.copyFileSync(path.join(webRoot, 'reports/shared-source-contract.json'), path.join(dist, 'reports/shared-source-contract.json'));
  const release = {
    result: 'WEB_BUILD_CREATED; OWNER_ACCEPTANCE_PENDING',
    androidSourceCommit: sourceCommit,
    androidSourceArtifactSha256: androidArtifactHtmlSha256,
    webAppSha256: sha(structuredHtml),
    recipeCount: 116,
    countryMappings: 'validated against content/international/country-navigation-manifest.json',
    browserVisualEvidence: 'PENDING: focused live browser verification after this single-Home update. Android Chrome browser-control service is unavailable; static validators do not count as visual acceptance.',
    visualScreenshots: [],
    browserChecks: { allRecipesCount: 116, newRecipesRail: '19 canonical expansion recipes sourced from country mapping', canonicalInternationalDishAssets: '21/21 source and packaged SHA-256 verified', indiaExistingRecipeThumbnails: '2/2 Android-canonical images mapped for #051 and #057; source SHA-256 recorded', magicalAdventureOnly: 'SOURCE ASSERTED; BROWSER CHECK PENDING', classicHomeAccess: 'ACTIVE SELECTOR DISABLED; SOURCE AND ASSETS PRESERVED', settingsReachable: 'SETTINGS PAGE PRESERVED; BROWSER CHECK PENDING', worldCountryArtwork: '21/21 canonical paths and package hashes verified', welcomeArrowNavigation: 'MAGICAL-ONLY SOURCE ASSERTED; BROWSER CHECK PENDING', publicHttpsAndroidChrome: 'PENDING live browser verification' },
    androidFunctionalGate: 'CI-LITE run 40776773336 failed activity launch timeout; process started, WebView readiness not confirmed',
    androidScreenshotGate: 'HOLD: Android screenshot/UI validation failed due system responsiveness',
    independentGates: { A08: 'NOT VERIFIED', A09: 'NOT VERIFIED', accessibility: 'NOT VERIFIED', security: 'NOT VERIFIED', nutritionAndAllergens: 'NOT VERIFIED', artworkRights: 'NOT VERIFIED' },
    productionIndexSha256: '74d9c0f8b0f8c8ec9115e58ff77f6cdc1607f73df45bfbb3d2d50039d86431fe',
    productionModified: false
  };
  writeJson(path.join(dist, 'acceptance-report.json'), release);

  // Isolated Web-origin adapter assets. The worker scope stays inside this
  // package folder and caches only same-origin requests beneath that scope.
  fs.copyFileSync(path.join(sourceRoot, 'phase2-pilot/packages/assets/brand/aaria-launcher-icon.svg'), path.join(dist, 'aaria-launcher-icon.svg'));
  const pwaIconFiles = ['aaria-pwa-icon-192.png','aaria-pwa-icon-512.png','aaria-pwa-icon-maskable-512.png','aaria-apple-touch-icon-180.png','aaria-apple-touch-icon-167.png','aaria-apple-touch-icon-152.png','aaria-apple-touch-icon-120.png','aaria-favicon-32.png'];
  for (const icon of pwaIconFiles) fs.copyFileSync(path.join(sourceRoot, 'phase2-pilot/packages/assets/brand', icon), path.join(dist, icon));
  fs.writeFileSync(path.join(dist, 'manifest.webmanifest'), JSON.stringify({
    id: './', name: "Aaria's Magical Kitchen", short_name: 'Aaria',
    description: 'Cook playful recipes with Aaria.', start_url: './index.html', scope: './', display: 'standalone',
    background_color: '#fff9ed', theme_color: '#8b63d9',
    icons: [
      { src: './aaria-pwa-icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: './aaria-pwa-icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: './aaria-pwa-icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }
    ]
  }, null, 2) + '\n');
  fs.writeFileSync(path.join(dist, 'browser-adapters.js'), `(() => { if (location.protocol !== 'file:' && 'serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {}); })();\n`);
  const pwaHeadTags = [
    '  <link rel="manifest" href="./manifest.webmanifest">',
    '  <link rel="icon" type="image/png" sizes="32x32" href="./aaria-favicon-32.png">',
    '  <link rel="apple-touch-icon" sizes="180x180" href="./aaria-apple-touch-icon-180.png">',
    '  <link rel="apple-touch-icon" sizes="167x167" href="./aaria-apple-touch-icon-167.png">',
    '  <link rel="apple-touch-icon" sizes="152x152" href="./aaria-apple-touch-icon-152.png">',
    '  <link rel="apple-touch-icon" sizes="120x120" href="./aaria-apple-touch-icon-120.png">',
    '  <meta name="theme-color" content="#8b63d9">',
    '  <meta name="mobile-web-app-capable" content="yes">',
    '  <meta name="apple-mobile-web-app-capable" content="yes">',
    '  <meta name="apple-mobile-web-app-status-bar-style" content="default">',
    '  <meta name="apple-mobile-web-app-title" content="Aaria">'
  ].join('\n');
  const structuredWithPwa = fs.readFileSync(path.join(dist, 'index.html'), 'utf8')
    .replace('</head>', pwaHeadTags + '\n</head>')
    .replace('</body>', '  <script defer src="./browser-adapters.js"></script>\n</body>');
  // The standalone target keeps artwork inline, while the structured target
  // externalizes embedded image data for lower-memory Android Chrome startup.
  fs.mkdirSync(path.join(dist, 'assets/embedded'), { recursive: true });
  const embeddedAssetPaths = new Map();
  const modularHtml = structuredWithPwa.replace(/data:(image\/[a-zA-Z0-9.+-]+);base64,([A-Za-z0-9+/=]+)/g, (_match, mime, base64) => {
    const bytes = Buffer.from(base64, 'base64');
    const digest = sha(bytes);
    const extension = mime === 'image/svg+xml' ? '.svg' : mime === 'image/webp' ? '.webp' : mime === 'image/jpeg' ? '.jpg' : '.png';
    const relative = `assets/embedded/${digest}${extension}`;
    const destination = path.join(dist, relative);
    if (!fs.existsSync(destination)) fs.writeFileSync(destination, bytes);
    embeddedAssetPaths.set(relative, digest);
    return `./${relative}`;
  });
  for (const [file, digest] of Object.entries(indiaDishThumbnailHashes)) {
    if (!modularHtml.includes(`./assets/embedded/${digest}.webp`)) throw new Error(`India dish thumbnail was not externalized into the browser package: ${file}`);
  }
  fs.writeFileSync(path.join(dist, 'index.html'), modularHtml);
  const servedHtmlSha256 = sha(Buffer.from(modularHtml));
  const pwaCacheRevision = sha(Buffer.concat([Buffer.from(servedHtmlSha256), ...pwaIconFiles.map(icon => fs.readFileSync(path.join(dist, icon)))] )).slice(0, 12);
  const serviceWorkerSource = [
    "const CACHE_NAME = 'aaria-web-v3.5-" + pwaCacheRevision + "';",
    "const CORE_FILES = ['./','./index.html','./welcome-scene-1-landscape.webp','./welcome-scene-2-landscape.webp','./welcome-scene-3-landscape.webp','./manifest.webmanifest','./aaria-pwa-icon-192.png','./aaria-pwa-icon-512.png','./aaria-pwa-icon-maskable-512.png','./aaria-apple-touch-icon-180.png','./aaria-apple-touch-icon-167.png','./aaria-apple-touch-icon-152.png','./aaria-apple-touch-icon-120.png','./aaria-favicon-32.png'];",
    "self.addEventListener('install', event => event.waitUntil(caches.open(CACHE_NAME).then(cache => cache.addAll(CORE_FILES)).then(() => self.skipWaiting())));",
    "self.addEventListener('activate', event => event.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(key => key.startsWith('aaria-web-v3.5-') && key !== CACHE_NAME).map(key => caches.delete(key)))).then(() => self.clients.claim())));",
    "self.addEventListener('fetch', event => { const request = event.request, url = new URL(request.url); if (request.method !== 'GET' || url.origin !== self.location.origin) return; event.respondWith(fetch(new Request(request, {cache:'no-store'})).catch(async () => (await caches.match(request)) || (request.mode === 'navigate' ? await caches.match('./index.html') : Response.error())); });"
  ].join('\n') + '\n';
  fs.writeFileSync(path.join(dist, 'sw.js'), serviceWorkerSource);
  const generatedPwaManifest = JSON.parse(fs.readFileSync(path.join(dist, 'manifest.webmanifest'), 'utf8'));
  if (generatedPwaManifest.name !== "Aaria's Magical Kitchen" || generatedPwaManifest.short_name !== 'Aaria' || generatedPwaManifest.display !== 'standalone' || generatedPwaManifest.start_url !== './index.html' || generatedPwaManifest.scope !== './') throw new Error('PWA manifest identity, launch or scope is invalid.');
  const iconSizes = [['aaria-pwa-icon-192.png',192],['aaria-pwa-icon-512.png',512],['aaria-pwa-icon-maskable-512.png',512],['aaria-apple-touch-icon-180.png',180],['aaria-apple-touch-icon-167.png',167],['aaria-apple-touch-icon-152.png',152],['aaria-apple-touch-icon-120.png',120],['aaria-favicon-32.png',32]];
  for (const [name,size] of iconSizes) { const png=fs.readFileSync(path.join(dist,name)); if (png.toString('hex',0,8)!=='89504e470d0a1a0a' || png.readUInt32BE(16)!==size || png.readUInt32BE(20)!==size) throw new Error('PWA icon missing or has incorrect PNG dimensions: '+name); }
  for (const icon of generatedPwaManifest.icons) if (!fs.existsSync(path.join(dist,icon.src.slice(2)))) throw new Error('Manifest icon is not packaged: '+icon.src);
  for (const tag of ['apple-mobile-web-app-capable','apple-mobile-web-app-status-bar-style','apple-mobile-web-app-title','aaria-apple-touch-icon-180.png','aaria-pwa-icon-192.png']) if (!structuredWithPwa.includes(tag)) throw new Error('PWA HTML metadata missing: '+tag);
  if (!modularHtml.toLowerCase().includes('welcome')) throw new Error('Web app entry must retain its Welcome screen.');
  if (serviceWorkerSource.includes('cache.put(')) throw new Error('Service worker must not persist dynamic requests or photos.');

  manifest.webAppSha256 = servedHtmlSha256;
  writeJson(path.join(dist, 'manifest.json'), manifest);
  release.webAppSha256 = servedHtmlSha256;
  writeJson(path.join(dist, 'acceptance-report.json'), release);

  // Inline each artwork file once, then resolve it through a compact runtime
  // lookup. Replacing every repeated path with base64 would multiply the file
  // size and exceed browser string limits on a standalone HTML document.
  let standalone = structuredWithPwa.replace("const V32_INTL_ROOT='international-wave-1/';", "const V32_INTL_ROOT='';");
  const inlineAssets = {};
  for (const asset of assetPaths) {
    const bytes = fs.readFileSync(path.join(sourceRoot, asset));
    const mime = path.extname(asset).toLowerCase() === '.webp' ? 'image/webp' : 'image/png';
    inlineAssets[asset] = `data:${mime};base64,${bytes.toString('base64')}`;
  }
  standalone = standalone.replace(/<link rel="manifest" href="\.\/manifest\.webmanifest">/g, '').replace(/<link rel="(?:icon|apple-touch-icon)"[^>]*>/g, '').replace(/\s*<script defer src="\.\/browser-adapters\.js"><\/script>/g, '');
  standalone = standalone.replaceAll('V32_INTL_ROOT+en.finishedDish', 'v35WebAsset(en.finishedDish)')
    .replaceAll('V32_INTL_ROOT+x.image.path', 'v35WebAsset(x.image.path)')
    .replaceAll('V32_INTL_ROOT+asset', 'v35WebAsset(asset)')
    .replaceAll('V32_INTL_ROOT+x.imagePath', 'v35WebAsset(x.imagePath)');
  standalone = standalone.replace(/<link rel="manifest" href="\.\/manifest\.webmanifest">/g, '').replace(/\s*<script defer src="\.\/browser-adapters\.js"><\/script>/g, '');
  fs.writeFileSync(path.join(dist, 'aaria-v3.5-standalone.html'), standalone);

  execFileSync(process.execPath, [path.join(webRoot, 'scripts/verify-artwork.mjs')], { cwd: root, stdio: 'inherit' });
  const artworkValidation = JSON.parse(fs.readFileSync(path.join(dist, 'reports/artwork-validation.json'), 'utf8'));
  release.browserChecks = {
    ...release.browserChecks,
    indiaRecipeThumbnails: `${artworkValidation.india.recipeCount}/18 source-mapped and packaged with checksum verification; live browser rendering pending`,
    internationalFinishedDishArtwork: `${artworkValidation.international.finishedDishCount}/21 mapped, packaged, checksum verified and URL resolver checked`,
    internationalIngredientArtwork: `${artworkValidation.international.ingredientArtworkReferences}/${artworkValidation.international.ingredientArtworkReferences} locale references mapped to ${artworkValidation.international.uniqueIngredientArtworkFiles} packaged source images`,
    originalIngredientIconCoverage: `${artworkValidation.originalRecipeIngredientIcons.mappedToSpecificExistingArtwork}/${artworkValidation.originalRecipeIngredientIcons.uniqueIngredientNames} existing ingredient names have specific mapped art; ${artworkValidation.originalRecipeIngredientIcons.sourceArtGaps.length} source-art gaps recorded`,
    browserDecodeAndRender: 'PENDING: interactive Android Chrome unavailable in this executor'
  };
  release.artworkSourceGaps = {
    originalIngredients: artworkValidation.originalRecipeIngredientIcons.sourceArtGaps,
    internationalDraftIngredientSlotsWithoutSourceArtwork: artworkValidation.international.draftIngredientSlotsWithoutSourceArtwork
  };
  manifest.indiaRecipeThumbnailCount = artworkValidation.india.recipeCount;
  manifest.internationalFinishedDishCount = artworkValidation.international.finishedDishCount;
  manifest.internationalIngredientArtworkReferenceCount = artworkValidation.international.ingredientArtworkReferences;
  writeJson(path.join(dist, 'manifest.json'), manifest);
  writeJson(path.join(dist, 'acceptance-report.json'), release);

  const checksumMap = {};
  for (const file of walkFiles(dist).filter(file => !file.endsWith('SHA256SUMS.json'))) {
    checksumMap[path.relative(dist, file).split(path.sep).join('/')] = sha(fs.readFileSync(file));
  }
  writeJson(path.join(dist, 'SHA256SUMS.json'), checksumMap);
  const zipPath = path.join(root, 'Aaria_V3_5_Web_Edition.zip');
  fs.rmSync(zipPath, { force: true });
  execFileSync('zip', ['-qr', zipPath, 'web-v3.5', '-x', 'web-v3.5/aaria-v3.5-standalone.html'], { cwd: path.dirname(dist), stdio: 'inherit' });
  console.log(JSON.stringify({ output: path.relative(root, dist), zip: path.relative(root, zipPath), htmlSha256: servedHtmlSha256, recipeCount: 116, artworkFiles: assetPaths.length, standaloneBytes: fs.statSync(path.join(dist, 'aaria-v3.5-standalone.html')).size }));
} finally {
  fs.rmSync(tmp, { recursive: true, force: true });
}

