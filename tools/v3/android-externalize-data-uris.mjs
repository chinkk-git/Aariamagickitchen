#!/usr/bin/env node
import {createHash} from 'node:crypto';
import {mkdirSync,readFileSync,writeFileSync} from 'node:fs';
import {basename,dirname,resolve,sep} from 'node:path';

const [inputArg,outputArg,assetDirArg]=process.argv.slice(2);
if(!inputArg||!outputArg||!assetDirArg)throw new Error('Usage: android-externalize-data-uris.mjs <input.html> <output.html> <asset-directory>');
const input=resolve(inputArg),output=resolve(outputArg),assetDir=resolve(assetDirArg);
const html=readFileSync(input,'utf8'),assets=new Map();
const uriPattern=/data:image\/(png|webp|jpeg|jpg|gif);base64,([A-Za-z0-9+/=]+)/g;
const rewritten=html.replace(uriPattern,(uri,format,payload)=>{
  const bytes=Buffer.from(payload,'base64');
  if(!bytes.length)throw new Error('Encountered an empty inline image');
  const ext=format==='jpeg'?'jpg':format;
  const digest=createHash('sha256').update(bytes).digest('hex');
  const relative=`android-inline-art/${digest}.${ext}`;
  if(!assets.has(relative))assets.set(relative,bytes);
  return relative;
});
mkdirSync(dirname(output),{recursive:true});mkdirSync(assetDir,{recursive:true});
for(const [relative,bytes] of assets){
  const destination=resolve(assetDir,relative.slice('android-inline-art/'.length));
  mkdirSync(dirname(destination),{recursive:true});writeFileSync(destination,bytes);
}
if(/data:image\/(?:png|webp|jpeg|jpg|gif);base64,/.test(rewritten))throw new Error('Android HTML still contains an inline image payload');
const assetManifest=[...assets].map(([path,bytes])=>({path,sha256:createHash('sha256').update(bytes).digest('hex'),sizeBytes:bytes.length}));
writeFileSync(resolve(assetDir,'asset-manifest.json'),JSON.stringify({formatVersion:1,assetCount:assetManifest.length,assets:assetManifest},null,2)+'\n');
writeFileSync(output,rewritten);
const bytes=[...assets.values()].reduce((sum,value)=>sum+value.length,0);
console.log(JSON.stringify({source:basename(input),output:basename(output),sourceBytes:Buffer.byteLength(html),outputBytes:Buffer.byteLength(rewritten),externalImageCount:assets.size,externalImageBytes:bytes}));
