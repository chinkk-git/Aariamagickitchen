import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const [input, output] = process.argv.slice(2);
if (!input || !output) throw new Error('Usage: node tools/v3/attach-v34-dual-home.mjs <transformed-html> <output-html>');
const source = fs.readFileSync(path.resolve(input), 'utf8');
const adapter = fs.readFileSync(path.join(root, 'tools/v3/v34-dual-home.js'), 'utf8');
const marker = '<script id="aaria-v3-layer">';
const start = source.indexOf(marker);
const close = source.indexOf('</script>', start);
if (start < 0 || close < 0 || source.indexOf(marker, start + 1) >= 0) throw new Error('Expected exactly one complete shared V3 runtime script.');
const result = source.slice(0, close) + '\n' + adapter + '\n' + source.slice(close);
if (!result.includes('aaria.v34.homeStyle') || !result.includes('Magical Adventure')) throw new Error('V3.4 adapter was not attached.');
fs.mkdirSync(path.dirname(path.resolve(output)), { recursive: true });
fs.writeFileSync(path.resolve(output), result);
console.log(`Attached V3.4 APK-only home adapter to ${output} (${result.length.toLocaleString()} chars).`);
