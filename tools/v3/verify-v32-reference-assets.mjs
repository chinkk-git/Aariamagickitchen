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
  ['protected-v31-world-map-crop','docs/design/approved-v31-world-map-crop.jpg']
];
const results=[];
for(const [role,path] of required){
 const record=manifest.assets.find(x=>x.role===role);
 if(!record||record.path!==path||!record.sha256)throw new Error('Missing or changed approved reference provenance: '+role);
 const actual=createHash('sha256').update(readFileSync(resolve(root,path))).digest('hex');
 if(actual!==record.sha256)throw new Error('Approved reference SHA-256 mismatch for '+role+': '+actual+' != '+record.sha256);
 results.push({role,path,sha256:actual,status:record.status});
}
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
copyFileSync(resolve(root,templatePath),resolve(root,'artifacts/v32-diagnostics/approved-three-template-reference.png'));
copyFileSync(resolve(root,template.candidate_path),resolve(root,'artifacts/v32-diagnostics/unverified-template-candidate.png'));
writeFileSync(resolve(root,'artifacts/v32-diagnostics/reference-provenance.json'),JSON.stringify({source:manifestPath,manifestStatus:manifest.status,assets:results,rights:'HOLD',A08:'HOLD',A09:'HOLD'},null,2)+'\n');
console.log(JSON.stringify(results));
