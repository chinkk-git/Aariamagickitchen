import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(scriptDir, '../..');
const outputDir = path.resolve(repoRoot, 'web-v3.5');
const sourcePath = path.resolve(process.argv[2] || path.join(repoRoot, 'index.html'));
const source = fs.readFileSync(sourcePath, 'utf8');

function balancedJsonEnd(text, start) {
  let depth = 0, inString = false, escaped = false;
  for (let i = start; i < text.length; i++) {
    const ch = text[i];
    if (inString) {
      if (escaped) escaped = false;
      else if (ch === '\\') escaped = true;
      else if (ch === '"') inString = false;
      continue;
    }
    if (ch === '"') inString = true;
    else if (ch === '[' || ch === '{') depth++;
    else if (ch === ']' || ch === '}') {
      depth--;
      if (depth === 0) return i + 1;
    }
  }
  throw new Error('Unclosed recipe JSON value');
}

const recipeStart = source.indexOf('const RECIPES=');
if (recipeStart < 0) throw new Error('Canonical RECIPES array not found');
const arrayStart = source.indexOf('[', recipeStart);
const recipeEnd = balancedJsonEnd(source, arrayStart);
const recipes = JSON.parse(source.slice(arrayStart, recipeEnd));
if (recipes.length !== 95) throw new Error(`Expected 95 canonical baseline rows before the two pinned international records; found ${recipes.length}`);
const ids = recipes.map(recipe => recipe.id);
if (new Set(ids).size !== 95) throw new Error('Baseline recipe IDs are not unique');
const international = [96, 99].map(id => {
  const country = id === 96 ? 'italy' : 'china';
  const slug = id === 96 ? '096-tomato-basil-pasta' : '099-vegetable-fried-rice';
  const record = JSON.parse(fs.readFileSync(path.join(repoRoot, `content/international/countries/${country}/${slug}/recipe.json`), 'utf8'));
  return { ...record.renderer, country, localeTranslations: { 'pt-BR': record.renderer['pt-BR'] } };
});
const fullCatalog = [...recipes, ...international];
if (fullCatalog.length !== 97 || new Set(fullCatalog.map(recipe => recipe.id)).size !== 97) throw new Error('Expected 97 unique baseline and pinned international recipes');

const markupWithoutScripts = source.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, '');
const styleBlocks = [...markupWithoutScripts.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)].map(match => match[1]);
if (styleBlocks.length < 35) throw new Error(`Expected at least 35 ordered style blocks; found ${styleBlocks.length}`);
const scriptBlocks = [...source.matchAll(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi)];
const appScript = scriptBlocks.find(match => !/type\s*=\s*["']application\/json["']/i.test(match[1]) && match[2].includes('const RECIPES='));
const menuScript = scriptBlocks.find(match => /id\s*=\s*["']scrolling-bottom-menu["']/i.test(match[1]));
const runtimeScript = scriptBlocks.find(match => /id\s*=\s*["']aaria-v3-layer["']/i.test(match[1]));
if (!appScript || !menuScript || !runtimeScript) throw new Error('Expected app, bottom-menu, and V3.4 runtime scripts');
const appOffset = appScript[2].indexOf('const RECIPES=');
const afterRecipes = appScript[2].slice(appOffset + (recipeEnd - recipeStart));

fs.mkdirSync(path.join(outputDir, 'css'), { recursive: true });
fs.mkdirSync(path.join(outputDir, 'js'), { recursive: true });
fs.mkdirSync(path.join(outputDir, 'data'), { recursive: true });
fs.writeFileSync(path.join(outputDir, 'css/recipe-experience.css'), styleBlocks.slice(0, 15).join('\n').replace(/^[\t ]+$/gm, '').trimEnd() + '\n');
fs.writeFileSync(path.join(outputDir, 'css/v34-interface.css'), styleBlocks.slice(15, 35).join('\n').replace(/^[\t ]+$/gm, '').trimEnd() + '\n');
fs.writeFileSync(path.join(outputDir, 'css/v34-runtime.css'), styleBlocks.slice(35).join('\n').replace(/^[\t ]+$/gm, '').trimEnd() + '\n');
fs.writeFileSync(path.join(outputDir, 'data/recipes.json'), JSON.stringify(fullCatalog, null, 2) + '\n');
fs.writeFileSync(path.join(outputDir, 'js/recipe-data.js'), `window.AARIA_RECIPES = ${JSON.stringify(recipes)};\n`);
fs.writeFileSync(path.join(outputDir, 'js/app.js'), `const RECIPES = window.AARIA_RECIPES;\n${afterRecipes.trimEnd()}\n`);
fs.writeFileSync(path.join(outputDir, 'js/bottom-menu.js'), menuScript[2].trimEnd() + '\n');
fs.writeFileSync(path.join(outputDir, 'js/v34-runtime.js'), runtimeScript[2].trimEnd() + '\n');

let html = source;
html = html.replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, '');
html = html.replace(/<script\b([^>]*)>([\s\S]*?)<\/script>/gi, (full, attrs, body) => {
  if (/type\s*=\s*["']application\/json["']/i.test(attrs)) return full;
  if (body.includes('const RECIPES=')) return '<script defer src="./js/recipe-data.js"></script>\n<script defer src="./js/app.js"></script>';
  if (/id\s*=\s*["']scrolling-bottom-menu["']/i.test(attrs)) return '<script defer src="./js/bottom-menu.js"></script>';
  if (/id\s*=\s*["']aaria-v3-layer["']/i.test(attrs)) return '<script defer src="./js/v34-runtime.js"></script>';
  return full;
});
html = html.replace('</head>', '  <link rel="stylesheet" href="./css/recipe-experience.css">\n  <link rel="stylesheet" href="./css/v34-interface.css">\n  <link rel="stylesheet" href="./css/v34-runtime.css">\n</head>');
fs.writeFileSync(path.join(outputDir, 'index.html'), html);
const sourceSha256 = crypto.createHash('sha256').update(source).digest('hex');
fs.writeFileSync(path.join(outputDir, 'reports/source-baseline.json'), JSON.stringify({
  source: path.relative(repoRoot, sourcePath),
  productionSource: 'repository-root/index.html',
  sourceSha256,
  sourceRecipes: recipes.length,
  addedPinnedRecipes: international.map(recipe => ({ id: recipe.id, country: recipe.country })),
  totalRecipes: fullCatalog.length,
  uniqueIds: new Set(fullCatalog.map(recipe => recipe.id)).size,
  ids: [Math.min(...fullCatalog.map(recipe => recipe.id)), Math.max(...fullCatalog.map(recipe => recipe.id))],
  stylesExtracted: styleBlocks.length,
  appScriptBytes: Buffer.byteLength(afterRecipes),
  generatedAt: 'deterministic-build'
}, null, 2) + '\n');
console.log(JSON.stringify({ recipeCount: fullCatalog.length, sourceSha256, styles: styleBlocks.length, output: path.relative(repoRoot, outputDir) }));
