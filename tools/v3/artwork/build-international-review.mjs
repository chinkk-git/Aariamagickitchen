#!/usr/bin/env node
// Builds the pinned Wave 1 package into an isolated Android debug review route.
// This never writes to the production recipe renderer or canonical catalogue.
import {createHash} from 'node:crypto';
import {copyFileSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join, resolve} from 'node:path';
import {pathToFileURL} from 'node:url';

const root = resolve(new URL('../../..', import.meta.url).pathname);
const lockPath = join(root, 'phase2-pilot/domains/cooking/recipe-import/wave1-source-lock.json');
const sourceLock = JSON.parse(readFileSync(lockPath, 'utf8'));
const sourceFiles = Object.fromEntries(sourceLock.package_files.map(item => [item.path, readFileSync(join(root, item.path))]));
sourceFiles[sourceLock.source_manifest_path] = readFileSync(join(root, sourceLock.source_manifest_path));
sourceFiles[sourceLock.source_style_guide_path] = readFileSync(join(root, sourceLock.source_style_guide_path));
const {preparePinnedW03WaveOne} = await import(pathToFileURL(join(root, 'phase2-pilot/domains/cooking/recipe-import/international-adapter.js')));
const prepared = preparePinnedW03WaveOne({sourceLock, files: sourceFiles});
const route = join(root, 'phase2-pilot/apps/aaria-android/app/src/debug/assets/artwork-review/international-wave-1');
const productionRoute = join(root, 'phase2-pilot/apps/aaria-android/app/src/main/assets/international-wave-1');
mkdirSync(route, {recursive: true});
mkdirSync(productionRoute, {recursive: true});
for (const item of sourceLock.package_files) {
  const destination = join(route, item.path);
  mkdirSync(resolve(destination, '..'), {recursive: true});
  copyFileSync(join(root, item.path), destination);
  const productionDestination = join(productionRoute, item.path);
  mkdirSync(resolve(productionDestination, '..'), {recursive: true});
  copyFileSync(join(root, item.path), productionDestination);
}
const recipes = prepared.recipes.map(recipe => ({id:recipe.id,country:recipe.country,title:recipe.title,locales:recipe.locales,artworkAssetPaths:recipe.artworkAssetPaths}));
const recipePackage = {sourceCommit:prepared.sourceCommit,sourceManifestSha256:prepared.sourceManifestSha256,pairSha256:prepared.pairSha256,recipes};
writeFileSync(join(route, 'recipes.json'), JSON.stringify(recipePackage, null, 2)+'\n');
writeFileSync(join(productionRoute, 'recipes.json'), JSON.stringify(recipePackage, null, 2)+'\n');
const approvedRecipeCss=readFileSync(join(root,'tools/v3/home-world-visual.css'),'utf8');
const template=readFileSync(join(root,'tools/v3/artwork/wave1-review.template.html'),'utf8')
  .replace('__APPROVED_RECIPE_CSS__',()=>approvedRecipeCss)
  .replace('__SOURCE_COMMIT_SHORT__',prepared.sourceCommit.slice(0,12))
  .replace('__RECIPE_DATA__',()=>JSON.stringify(recipes).replaceAll('<','\\u003c'));
writeFileSync(join(route, 'index.html'), template);
const hash = bytes => createHash('sha256').update(bytes).digest('hex');
const images = sourceLock.package_files.filter(item => item.path.endsWith('.png'));
if(images.length!==42||images.some(item=>hash(readFileSync(join(route,item.path)))!==item.sha256)) throw new Error('Debug route did not stage all 42 pinned artwork files byte-for-byte');
console.log(JSON.stringify({route:'artwork-review/international-wave-1/index.html',sourceCommit:prepared.sourceCommit,recipeIds:prepared.recipes.map(x=>x.id),packagePairSha256:prepared.pairSha256,artworkFiles:images.length,offline:true,productionArtworkCopied:true,productionCatalogueIntegration:'transform-production.mjs'}));
