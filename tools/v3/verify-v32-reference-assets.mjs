#!/usr/bin/env node
import {readFileSync,mkdirSync,copyFileSync,writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve} from 'node:path';
const root=process.cwd();
const manifestPath='docs/design/references/V3_2_REFERENCE_ASSET_MANIFEST.json';
const manifest=JSON.parse(readFileSync(resolve(root,manifestPath),'utf8'));
const required=[
  ['approved-avatar-identity-sheet','docs/design/references/v3.2-approved-avatar-sheet-bearded-daddy.png'],
  ['protected-v31-home-and-world-reference','docs/design/approved-v31-home-world-reference.png'],
  ['protected-v31-world-map-crop','docs/design/approved-v31-world-map-crop.webp']
];
const results=[];
for(const [role,path] of required){
 const record=manifest.assets.find(x=>x.role===role);
 if(!record||record.path!==path||!record.sha256)throw new Error('Missing or changed approved reference provenance: '+role);
 const actual=createHash('sha256').update(readFileSync(resolve(root,path))).digest('hex');
 if(actual!==record.sha256)throw new Error('Approved reference SHA-256 mismatch for '+role+': '+actual+' != '+record.sha256);
 results.push({role,path,sha256:actual,status:record.status});
}
const homeReference=manifest.assets.find(x=>x.role==='protected-v31-home-and-world-reference');
const derivedArt=manifest.assets.find(x=>x.role==='v31-home-destination-art-crops');
if(!derivedArt||derivedArt.sourcePath!=='docs/design/approved-v31-home-world-reference.png'||derivedArt.sourceSha256!==homeReference.sha256||derivedArt.items?.length!==5)throw new Error('Home destination artwork must remain traceable to the verified approved reference');
const mapRecord=manifest.assets.find(x=>x.role==='protected-v31-world-map-crop');
const mapBytes=readFileSync(resolve(root,mapRecord.path));
if(mapBytes.subarray(0,4).toString('ascii')!=='RIFF'||mapBytes.subarray(8,12).toString('ascii')!=='WEBP')throw new Error('Reference-derived world map crop must be a decodable WebP');
for(const item of derivedArt.items){
 const bytes=readFileSync(resolve(root,item.path)),actual=createHash('sha256').update(bytes).digest('hex');
 if(actual!==item.sha256||bytes.subarray(0,4).toString('ascii')!=='RIFF'||bytes.subarray(8,12).toString('ascii')!=='WEBP')throw new Error('Reference-derived Home art is missing, corrupt, or mismatched: '+item.code);
}
results.push({role:derivedArt.role,sourcePath:derivedArt.sourcePath,sourceSha256:derivedArt.sourceSha256,items:derivedArt.items,status:derivedArt.status});
const dogArt=manifest.assets.find(x=>x.role==='v31-approved-home-dog-crop');
if(!dogArt||dogArt.sourcePath!==homeReference.path||dogArt.sourceSha256!==homeReference.sha256||dogArt.allowedContexts?.join(',')!=='home')throw new Error('Home dog art must remain traceable to the approved V3.1 Home reference and limited to Home');
const dogBytes=readFileSync(resolve(root,dogArt.path)),dogSha=createHash('sha256').update(dogBytes).digest('hex');
if(dogSha!==dogArt.sha256||dogBytes.subarray(0,8).toString('hex')!=='89504e470d0a1a0a')throw new Error('Approved Home dog crop is missing, corrupt, or mismatched');
results.push({role:dogArt.role,path:dogArt.path,sha256:dogSha,sourcePath:dogArt.sourcePath,sourceSha256:dogArt.sourceSha256,status:dogArt.status});
const avatarReference=manifest.assets.find(x=>x.role==='approved-avatar-identity-sheet');
const avatarArt=manifest.assets.find(x=>x.role==='v32-approved-avatar-crops');
if(!avatarArt||avatarArt.sourcePath!==avatarReference.path||avatarArt.sourceSha256!==avatarReference.sha256||avatarArt.items?.length!==11)throw new Error('Canonical avatar crops must trace to the exact approved avatar sheet');
for(const item of avatarArt.items){
 const bytes=readFileSync(resolve(root,item.path)),actual=createHash('sha256').update(bytes).digest('hex');
 if(actual!==item.sha256||bytes.subarray(0,4).toString('ascii')!=='RIFF'||bytes.subarray(8,12).toString('ascii')!=='WEBP')throw new Error('Approved avatar crop is missing, corrupt, or mismatched: '+item.key);
}
results.push({role:avatarArt.role,sourcePath:avatarArt.sourcePath,sourceSha256:avatarArt.sourceSha256,items:avatarArt.items,status:avatarArt.status});
const template=manifest.assets.find(x=>x.role==='three-recipe-theme-comparison');
const templatePath='docs/design/references/v3.2-three-recipe-templates.png';
if(!template||template.path!==templatePath||!template.sha256||template.status!=='EXACT_SOURCE_BYTES_VERIFIED')throw new Error('Three-template source must match the approved reference manifest');
const approvedTemplate=createHash('sha256').update(readFileSync(resolve(root,templatePath))).digest('hex');
if(approvedTemplate!==template.sha256)throw new Error('Approved three-template SHA-256 mismatch: '+approvedTemplate+' != '+template.sha256);
const candidate=createHash('sha256').update(readFileSync(resolve(root,template.candidate_path))).digest('hex');
if(candidate!==template.candidate_sha256)throw new Error('Quarantined template candidate bytes changed: '+candidate);
results.push({role:'three-recipe-theme-comparison',path:templatePath,sha256:approvedTemplate,status:template.status,candidatePath:template.candidate_path,candidateSha256:candidate,candidateStatus:'UNVERIFIED_QUARANTINED'});
const tacos=manifest.assets.find(x=>x.role==='approved-tasty-tacos-recipe-flow');
if(!tacos||tacos.path!==null||!String(tacos.status).includes('BLOCKED'))throw new Error('Missing Tasty Tacos baseline must remain explicitly blocked');
results.push({role:'approved-tasty-tacos-recipe-flow',status:tacos.status});
mkdirSync(resolve(root,'artifacts/v32-diagnostics'),{recursive:true});
mkdirSync(resolve(root,'artifacts/v32-diagnostics/avatar-crops'),{recursive:true});
copyFileSync(resolve(root,templatePath),resolve(root,'artifacts/v32-diagnostics/approved-three-template-reference.png'));
copyFileSync(resolve(root,template.candidate_path),resolve(root,'artifacts/v32-diagnostics/unverified-template-candidate.png'));
copyFileSync(resolve(root,mapRecord.path),resolve(root,'artifacts/v32-diagnostics/reference-derived-world-map.webp'));
copyFileSync(resolve(root,dogArt.path),resolve(root,'artifacts/v32-diagnostics/approved-home-dog-crop.png'));
copyFileSync(resolve(root,avatarReference.path),resolve(root,'artifacts/v32-diagnostics/approved-avatar-identity-sheet.png'));
for(const item of avatarArt.items)copyFileSync(resolve(root,item.path),resolve(root,`artifacts/v32-diagnostics/avatar-crops/${item.key}.webp`));
writeFileSync(resolve(root,'artifacts/v32-diagnostics/reference-provenance.json'),JSON.stringify({source:manifestPath,manifestStatus:manifest.status,assets:results,rights:'HOLD',A08:'HOLD',A09:'HOLD'},null,2)+'\n');
console.log(JSON.stringify(results));
