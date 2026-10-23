import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const draftPath = path.join(here, 'data/v3.3-world-map-country-drafts.json');
const data = JSON.parse(fs.readFileSync(draftPath, 'utf8'));
const expected = [
  ['ITA', 'Italy', 'Itália', 'Tomato Basil Pasta', 'Massa de tomate e manjericão'],
  ['CHN', 'China', 'China', 'Vegetable Fried Rice', 'Arroz frito com legumes'],
  ['JPN', 'Japan', 'Japão', 'Veggie Sushi Rolls', 'Rolinhos de sushi de legumes'],
  ['MEX', 'Mexico', 'México', 'Rainbow Veggie Tacos', 'Tacos arco-íris de legumes'],
  ['VNM', 'Vietnam', 'Vietnã', 'Fresh Spring Rolls', 'Rolinhos primavera frescos']
];
const fail = message => { throw new Error(`V3.3 draft contract: ${message}`); };
if (data.status !== 'draft-review-only' || data.runtimeEligible !== false || data.canonicalCatalogMutation !== false) fail('draft registry must remain non-runtime and must not mutate the canonical catalog.');
if (JSON.stringify(data.locales) !== JSON.stringify(['en-GB', 'pt-BR'])) fail('EN-GB and PT-BR locales are required.');
if (!Array.isArray(data.countries) || data.countries.length !== expected.length) fail('exactly five country concepts are required.');
const seen = new Set();
for (const [index, country] of data.countries.entries()) {
  const [iso, en, pt, dishEn, dishPt] = expected[index];
  if (country.iso3166Alpha3 !== iso || seen.has(country.iso3166Alpha3)) fail(`country order/code mismatch or duplicate at index ${index}.`);
  seen.add(country.iso3166Alpha3);
  if (country.name?.['en-GB'] !== en || country.name?.['pt-BR'] !== pt || country.recipeConcept?.['en-GB'] !== dishEn || country.recipeConcept?.['pt-BR'] !== dishPt) fail(`localized concept mismatch for ${iso}.`);
  if (country.canonicalRecipeIds?.length !== 0) fail(`${iso} must not borrow or invent a canonical recipe ID.`);
  for (const gate of ['geography','culturalAssociation','duplicate','nutrition','allergens','a08ChildSafety','a09ChildExperience','artworkRights']) if (country.review?.[gate] !== 'pending') fail(`${iso}.${gate} must remain explicitly pending.`);
}
const runtime = fs.readFileSync(path.join(here, 'runtime.js'), 'utf8');
if (runtime.includes('v3.3-world-map-country-drafts.json') || runtime.includes('Tomato Basil Pasta') || runtime.includes('Vegetable Fried Rice') || runtime.includes('Veggie Sushi Rolls') || runtime.includes('Rainbow Veggie Tacos') || runtime.includes('Fresh Spring Rolls')) fail('draft recipe concepts leaked into runtime.');
const catalogContract = JSON.parse(fs.readFileSync(path.join(here, 'data/v3.2-feature-contract.json'), 'utf8'));
if (catalogContract.catalog?.count !== 95) fail('repository feature contract no longer asserts the canonical 95-recipe catalog.');
console.log('V3.3 five-country draft registry: valid, localized, review-only; canonical 95 unchanged.');
