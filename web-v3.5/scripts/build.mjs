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
  const structuredHtml = fs.readFileSync(attached);
  let finalHtml = structuredHtml.toString('utf8');
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
  const unmappedIconThrow = `if(rendered.includes('<circle cx="32" cy="28" r="23" fill="#fff0dc"/>'))throw Error('International ingredient icon is not mapped: '+text);`;
  if (!finalHtml.includes(unmappedIconThrow)) throw new Error('Ingredient icon fallback anchor was not found.');
  finalHtml = finalHtml.replace(unmappedIconThrow, `if(rendered.includes('<circle cx="32" cy="28" r="23" fill="#fff0dc"/>'))return iconSvg('Ingredient','<path d="M12 30c3-12 37-12 40 0v4c-3 18-37 18-40 0Z" fill="#e9ddeb" stroke="#a793b2" stroke-width="2"/><ellipse cx="32" cy="29" rx="20" ry="8" fill="#fff4df"/><path d="M26 20 40 6" stroke="#9b744e" stroke-width="3" stroke-linecap="round"/>');`);
  const oldWorldDishResolver = `function v33FinishedDishSource(recipe){try{const html=homeDishThumb(recipe),src=html.match(/<img\\b[^>]*\\bsrc=["']([^"']+)["']/i)?.[1]||'';return src.startsWith('data:image/')?src:''}catch{return ''}}`;
  const newWorldDishResolver = `function normalizeWorldDishSource(source){const value=String(source||'').trim();if(/^data:image\\/(?:png|webp|jpeg|jpg|gif);base64,[A-Za-z0-9+/=]+$/i.test(value))return value;if(/^android-inline-art\\/[a-f0-9]{64}\\.(?:png|webp|jpeg|jpg|gif)$/i.test(value))return value;if(/^international-wave-1\\/content\\/international\\/countries\\/[a-z0-9-]+\\/[0-9]{3}-[a-z0-9-]+\\/artwork\\/(?:finished\\/)?finished-dish\\.(?:png|webp)$/i.test(value))return value;return ''}function v33FinishedDishSource(recipe){try{const html=homeDishThumb(recipe),src=html.match(/<img\\b[^>]*\\bsrc=["']([^"']+)["']/i)?.[1]||'';return normalizeWorldDishSource(src)}catch{return ''}}`;
  if (finalHtml.includes(oldWorldDishResolver)) finalHtml = finalHtml.replace(oldWorldDishResolver, newWorldDishResolver);
  else if (!finalHtml.includes('function normalizeWorldDishSource(source)') || !finalHtml.includes('return normalizeWorldDishSource(src)')) throw new Error('World country thumbnail resolver anchor was not found.');
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
</style>`;
  finalHtml = finalHtml.replace('</body>', `${ownerMobileVisualFixes}\n</body>`);
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
    acceptanceGates: { androidFunctionalSmoke: 'CI-LITE run 40776773336 in progress; screenshot capture not required', independentA08A09: 'NOT VERIFIED', accessibility: 'NOT VERIFIED', security: 'NOT VERIFIED', nutritionAllergen: 'NOT VERIFIED', artworkRights: 'NOT VERIFIED' },
    productionModified: false
  };
  writeJson(path.join(dist, 'manifest.json'), manifest);
  const readme = `# Aaria V3.5 Web Edition\n\nThis structured Web target is assembled from Android V3.5 source (${sourceCommit}) and the approved V3.4 Welcome/Magical Adventure component (${v34Commit}). The UI, recipes, translations, country registry and runtime come from shared Android source; the Web target serves recipe artwork beside the HTML.\n\n## Open\n\nServe this directory over HTTPS for Android Chrome. Open \`index.html\`; do not open the directory payload through a \`content://\` file picker. \`aaria-v3.5-standalone.html\` is the portable single-file version.\n\n## Home experience\n\nMagical Adventure is the only active Home. The approved Welcome appears before Home, and its glowing arrow opens the adventure. Classic Home code/assets remain preserved but inaccessible. Legacy Classic preferences are ignored without deleting them. Settings remains available with no Home selector. All 116 recipes and canonical country mappings are included.\n\n## Status\n\nSource/catalog checks pass. Android CI-LITE run #228 is checking installation, launch, WebView readiness and critical routes; screenshots are not an acceptance gate. The isolated HTTPS preview still needs this updated package and focused live-browser checks. Independent A08/A09, accessibility, security, nutrition/allergen and artwork-rights gates remain NOT VERIFIED. Production GitHub Pages is unchanged.\n`;
  fs.writeFileSync(path.join(dist, 'README.md'), readme);
  fs.mkdirSync(path.join(dist, 'reports'), { recursive: true });
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
  fs.writeFileSync(path.join(dist, 'manifest.webmanifest'), JSON.stringify({
    id: './', name: "Aaria's Magical Kitchen — Web Edition", short_name: 'Aaria Kitchen',
    description: 'Cook playful recipes with Aaria.', start_url: './index.html', scope: './', display: 'standalone',
    background_color: '#fff9ed', theme_color: '#8b63d9',
    icons: [{ src: './aaria-launcher-icon.svg', sizes: 'any', type: 'image/svg+xml', purpose: 'any maskable' }]
  }, null, 2) + '\n');
  fs.writeFileSync(path.join(dist, 'browser-adapters.js'), `(() => { if (location.protocol !== 'file:' && 'serviceWorker' in navigator) navigator.serviceWorker.register('./sw.js', { scope: './' }).catch(() => {}); })();\n`);
  const structuredWithPwa = fs.readFileSync(path.join(dist, 'index.html'), 'utf8')
    .replace('</head>', '  <link rel="manifest" href="./manifest.webmanifest">\n</head>')
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
  fs.writeFileSync(path.join(dist, 'sw.js'), `const CACHE='aaria-web-v3.5-${servedHtmlSha256.slice(0,12)}';\nself.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(['./','./index.html','./manifest.webmanifest'])).then(()=>self.skipWaiting())));\nself.addEventListener('activate',e=>e.waitUntil(caches.keys().then(keys=>Promise.all(keys.filter(k=>k.startsWith('aaria-web-v3.5-')&&k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim())));\nself.addEventListener('fetch',e=>{const r=e.request;if(r.method!=='GET'||new URL(r.url).origin!==self.location.origin)return;e.respondWith(caches.match(r).then(c=>c||fetch(r).then(resp=>{if(resp.ok&&new URL(r.url).pathname.startsWith(new URL('./',self.registration.scope).pathname))caches.open(CACHE).then(cache=>cache.put(r,resp.clone()));return resp;})));});\n`);
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
  standalone = standalone.replace("const V32_INTL_ROOT='';", `const V32_INTL_ROOT='';const V35_WEB_ART=${JSON.stringify(inlineAssets)};const v35WebAsset=p=>V35_WEB_ART[p]||V32_INTL_ROOT+p;`);
  standalone = standalone.replaceAll('V32_INTL_ROOT+en.finishedDish', 'v35WebAsset(en.finishedDish)')
    .replaceAll('V32_INTL_ROOT+x.image.path', 'v35WebAsset(x.image.path)')
    .replaceAll('V32_INTL_ROOT+asset', 'v35WebAsset(asset)')
    .replaceAll('V32_INTL_ROOT+x.imagePath', 'v35WebAsset(x.imagePath)');
  standalone = standalone.replace(/<link rel="manifest" href="\.\/manifest\.webmanifest">/g, '').replace(/\s*<script defer src="\.\/browser-adapters\.js"><\/script>/g, '');
  fs.writeFileSync(path.join(dist, 'aaria-v3.5-standalone.html'), standalone);

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
