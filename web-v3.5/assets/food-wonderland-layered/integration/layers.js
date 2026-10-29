/* Minimal scene layer renderer. Use existing app route functions in onNavigate. */
export async function mountWonderlandLayers(host,{onNavigate=()=>{},assetBase='.'}={}){
 const m=await (await fetch(assetBase+'/manifest.json')).json();
 const orientation=matchMedia('(orientation: landscape)').matches?'landscape':'portrait';
 host.classList.add('fw-layer-scene');
 host.replaceChildren();
 const bg=document.createElement('img');bg.className='fw-layer-bg';bg.alt='';bg.src=assetBase+'/'+m.backgrounds[orientation];host.append(bg);
 const map=m.positions[orientation];
 const destinations={world:'world',spin:'week',recipes:'recipes',surprise:'surprise',creations:'creations',family:'family',friends:'friends',planner:'planner'};
 const decorative=['aaria','kitten'];
 for(const [key,p] of Object.entries(map)){
  const [x,y,w]=p;const name=key.startsWith('label-')?key.slice(6):key;
  const isLabel=key.startsWith('label-');const isInteractive=!decorative.includes(key);
  const wrapper=document.createElement(isInteractive?'button':'div');
  if(isInteractive){wrapper.type='button';wrapper.className='fw-layer-hit';wrapper.setAttribute('aria-label',(isLabel?'Open ':'')+name.replaceAll('-',' '));wrapper.addEventListener('click',()=>onNavigate(destinations[name]||name));}
  else wrapper.className='fw-layer';
  wrapper.style.left=x+'%';wrapper.style.top=y+'%';wrapper.style.width=w+'%';
  const img=document.createElement('img');img.className='fw-layer'+(name==='globe'?' fw-layer-globe':'')+(name==='wheel'?' fw-layer-wheel':'');img.src=assetBase+'/'+m.sprites[key].file;img.alt='';img.draggable=false;
  if(isInteractive)wrapper.append(img);else {wrapper.style.position='absolute';wrapper.append(img)}
  host.append(wrapper);
 }
 return {orientation,manifest:m};
}
