#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const htmlPath = path.resolve(process.argv[2] || path.join(here, '../../dist/Aaria_Magical_Kitchen_V3.html'));
const html = fs.readFileSync(htmlPath, 'utf8');
const expected = {
  CHEF_A: { file: 'approved-chef-a.webp.b64', sha256: 'd29662b184f391c86f3b9c2afe5343297bb6de5da82dfb9680513861aed9f034', label: 'Chef A' },
  CHEF_B: { file: 'approved-chef-b.webp.b64', sha256: 'c0176f9ff6dd4b60e282cb96b64e4754ff97128625cce5f622ebf07f6bacd9fb', label: 'Chef B' }
};
for (const [chef, item] of Object.entries(expected)) {
  const encoded = fs.readFileSync(path.join(here, 'artwork', item.file), 'utf8').replace(/\s/g, '');
  const bytes = Buffer.from(encoded, 'base64');
  assert.ok(bytes.length > 0, chef + ' source artwork is empty');
  assert.equal(createHash('sha256').update(bytes).digest('hex'), item.sha256, chef + ' artwork differs from the approved crop');
  const button = html.match(new RegExp('<button\\b[^>]*data-v3-chef="' + chef + '"[^>]*>([\\s\\S]*?)<\\/button>'));
  assert.ok(button, chef + ' chooser button is missing from generated HTML');
  assert.ok(button[1].includes('class="v3-chef-portrait"'), chef + ' portrait is not rendered in the chooser');
  const image = button[1].match(/<img\b[^>]*src="(data:image\/webp;base64,[A-Za-z0-9+/=]+)"/);
  assert.ok(image, chef + ' approved portrait data URI is not packaged in generated HTML');
  const embeddedBytes = Buffer.from(image[1].slice(image[1].indexOf(',') + 1), 'base64');
  assert.equal(createHash('sha256').update(embeddedBytes).digest('hex'), item.sha256, chef + ' embedded portrait differs from the approved crop');
  assert.ok(button[1].includes(item.label), chef + ' accessible visible label is missing');
}
console.log('Approved Chef A and Chef B portraits are present in the generated V3 chooser with verified source checksums.');
