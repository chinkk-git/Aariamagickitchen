import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const webRoot = path.join(root, 'web-v3.5');
const approvedV34 = '4cbd0d3414556973e5790ee02a8232aa917bdd8a';
const wave1Handoff = '451ab0bf8a3ab1867cf004a113d3d8e6896ccf60';
const tempRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aaria-v34-source-'));
const tempHtml = path.join(os.tmpdir(), `aaria-v34-${process.pid}.html`);
try {
  const archive = execFileSync('git', [
    'archive', '--format=tar', approvedV34,
    'index.html', 'tools/v3', 'phase2-pilot/packages/assets',
    'docs/design/approved-v31-world-map-crop.webp',
    'docs/design/approved-v31-home-world-reference.png', 'docs/design/v3.4', 'content/international'
  ], { cwd: root, maxBuffer: 150 * 1024 * 1024 });
  execFileSync('tar', ['-x', '-C', tempRoot], { cwd: root, input: archive });
  execFileSync(process.execPath, ['web-v3.5/scripts/prepare-wave1-package.mjs'], {
    cwd: root, stdio: 'inherit', env: { ...process.env, AARIA_BUILD_ROOT: tempRoot, AARIA_WEB_ROOT: webRoot }
  });
  execFileSync(process.execPath, [path.join(tempRoot, 'tools/v3/transform-production.mjs'), 'index.html', tempHtml], {
    cwd: tempRoot, stdio: 'inherit'
  });
  execFileSync(process.execPath, ['web-v3.5/scripts/extract-production.mjs', tempHtml], { cwd: root, stdio: 'inherit' });

  fs.mkdirSync(path.join(webRoot, 'assets/brand'), { recursive: true });
  fs.mkdirSync(path.join(webRoot, 'assets/characters'), { recursive: true });
  fs.cpSync(path.join(tempRoot, 'phase2-pilot/packages/assets/brand/aaria-launcher-icon.svg'), path.join(webRoot, 'assets/brand/aaria-launcher-icon.svg'));
  fs.cpSync(path.join(tempRoot, 'phase2-pilot/packages/assets/characters/aaria.jpg'), path.join(webRoot, 'assets/characters/aaria.jpg'));
  let html = fs.readFileSync(path.join(webRoot, 'index.html'), 'utf8');
  html = html.replace('</head>', '  <link rel="manifest" href="./manifest.webmanifest">\n</head>');
  html = html.replace('</body>', '  <script defer src="./js/browser-adapters.js"></script>\n</body>');
  fs.writeFileSync(path.join(webRoot, 'index.html'), html);
  const buildRecord = JSON.parse(fs.readFileSync(path.join(webRoot, 'reports/source-baseline.json'), 'utf8'));
  buildRecord.productionHead = execFileSync('git', ['rev-parse', 'main'], { cwd: root, encoding: 'utf8' }).trim();
  buildRecord.productionIndexSha256 = crypto.createHash('sha256').update(fs.readFileSync(path.join(root, 'index.html'))).digest('hex');
  buildRecord.approvedV34Source = approvedV34;
  buildRecord.approvedSourceBlobs = Object.fromEntries(['tools/v3/runtime.js', 'tools/v3/transform-production.mjs', 'tools/v3/home-world-visual.css', 'tools/v3/world-adventure-globe/world-adventure-globe.js', 'tools/v3/world-adventure-globe/world-adventure-globe.css'].map(file => [file, execFileSync('git', ['rev-parse', `${approvedV34}:${file}`], { cwd: root, encoding: 'utf8' }).trim()]));
  buildRecord.wave1HandoffSource = wave1Handoff;
  buildRecord.webRecipeCount = 97;
  fs.writeFileSync(path.join(webRoot, 'reports/source-baseline.json'), JSON.stringify(buildRecord, null, 2) + '\n');

  const dist = path.join(root, 'dist/web-v3.5');
  fs.rmSync(dist, { recursive: true, force: true });
  fs.cpSync(webRoot, dist, { recursive: true, filter: src => !src.includes(`${path.sep}scripts${path.sep}`) && !src.includes(`${path.sep}tests${path.sep}`) });

  let standalone = fs.readFileSync(path.join(dist, 'index.html'), 'utf8');
  for (const cssPath of ['./css/recipe-experience.css', './css/v34-interface.css', './css/v34-runtime.css']) {
    const css = fs.readFileSync(path.join(dist, cssPath.slice(2)), 'utf8');
    standalone = standalone.replace(`<link rel="stylesheet" href="${cssPath}">`, `<style>\n${css}\n</style>`);
  }
  const bundledFiles = ['./js/recipe-data.js', './js/app.js', './js/bottom-menu.js', './js/v34-runtime.js', './js/browser-adapters.js'];
  for (const jsPath of bundledFiles) {
    let js = fs.readFileSync(path.join(dist, jsPath.slice(2)), 'utf8');
    if (jsPath === './js/v34-runtime.js') {
      const assetsRoot = path.join(dist, 'international-wave-1');
      const walk = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
        const absolute = path.join(dir, entry.name);
        return entry.isDirectory() ? walk(absolute) : [absolute];
      });
      for (const asset of walk(assetsRoot)) {
        const rel = path.relative(assetsRoot, asset).split(path.sep).join('/');
        const mime = rel.endsWith('.png') ? 'image/png' : rel.endsWith('.webp') ? 'image/webp' : 'application/octet-stream';
        const uri = `data:${mime};base64,${fs.readFileSync(asset).toString('base64')}`;
        js = js.replaceAll(rel, uri);
      }
      js = js.replace("const V32_INTL_ROOT='international-wave-1/';", "const V32_INTL_ROOT='';");
    }
    const tag = `<script defer src="${jsPath}"></script>`;
    standalone = standalone.replace(tag, `<script>\n${js}\n</script>`);
  }
  standalone = standalone.replace(/\s*<link rel="manifest" href="\.\/manifest\.webmanifest">/g, '');
  fs.writeFileSync(path.join(dist, 'aaria-v3.5-standalone.html'), standalone);

  const hashes = {};
  const walkFiles = dir => fs.readdirSync(dir, { withFileTypes: true }).flatMap(entry => {
    const absolute = path.join(dir, entry.name);
    return entry.isDirectory() ? walkFiles(absolute) : [absolute];
  });
  for (const file of walkFiles(dist).filter(file => !file.endsWith('SHA256SUMS.json'))) {
    const rel = path.relative(dist, file).split(path.sep).join('/');
    hashes[rel] = crypto.createHash('sha256').update(fs.readFileSync(file)).digest('hex');
  }
  fs.writeFileSync(path.join(dist, 'SHA256SUMS.json'), JSON.stringify(hashes, null, 2) + '\n');
  console.log(JSON.stringify({ dist: path.relative(root, dist), files: Object.keys(hashes).length, standaloneBytes: fs.statSync(path.join(dist, 'aaria-v3.5-standalone.html')).size, recipes: buildRecord.webRecipeCount, approvedV34 }));
} finally {
  fs.rmSync(tempRoot, { recursive: true, force: true });
  fs.rmSync(tempHtml, { force: true });
}
