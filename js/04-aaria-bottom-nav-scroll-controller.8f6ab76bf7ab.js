
(()=>{
  const nav=document.querySelector('#nav.bottom');
  if(!nav)return;
  const threshold=18,positions=new WeakMap();
  let accumulated=0,direction=0,interactionUntil=0,lastHash=location.hash;
  const rememberPositions=()=>{
    const targets=[document.scrollingElement,document.querySelector('#screen')].filter(Boolean);
    for(const target of targets)positions.set(target,{top:target.scrollTop,left:target.scrollLeft});
  };
  const setVisible=visible=>{
    if(visible)nav.removeAttribute('data-scroll-hidden');
    else nav.setAttribute('data-scroll-hidden','true');
  };
  const reset=()=>{accumulated=0;direction=0;setVisible(true)};
  const isWelcome=()=>!!document.getElementById('v34-welcome');
  const hasOverlay=()=>!!document.querySelector('[aria-modal="true"]:not(#v34-welcome),dialog[open]');
  document.addEventListener('scroll',event=>{
    if(isWelcome()){reset();return}
    if(hasOverlay()||Date.now()<interactionUntil||/^(INPUT|TEXTAREA|SELECT)$/.test(document.activeElement?.tagName||'')||document.activeElement?.isContentEditable)return;
    const target=event.target;
    const scroller=target===document?document.scrollingElement:target;
    if(!(scroller instanceof Element))return;
    const style=getComputedStyle(scroller);
    const topScrollable=style.overflowY==='auto'||style.overflowY==='scroll'||scroller===document.scrollingElement;
    if(!topScrollable||scroller.scrollHeight<=scroller.clientHeight+2)return;
    const current={top:scroller.scrollTop,left:scroller.scrollLeft};
    const previous=positions.get(scroller);
    positions.set(scroller,current);
    if(!previous)return;
    const dy=current.top-previous.top,dx=current.left-previous.left;
    if(current.top<=1){accumulated=0;direction=0;setVisible(true);return}
    if(Math.abs(dx)>Math.abs(dy)||Math.abs(dy)<1)return;
    const nextDirection=Math.sign(dy);
    accumulated=nextDirection===direction?accumulated+Math.abs(dy):Math.abs(dy);
    direction=nextDirection;
    if(accumulated>=threshold){setVisible(nextDirection<0);accumulated=0}
  },{capture:true,passive:true});
  document.addEventListener('pointerdown',event=>{if(event.target.closest?.('#nav')){interactionUntil=Date.now()+900;setVisible(true)}},true);
  document.addEventListener('click',event=>{if(event.target.closest?.('#nav')){interactionUntil=Date.now()+900;setVisible(true)}},true);
  document.addEventListener('focusin',event=>{if(event.target.closest?.('#nav')){interactionUntil=Date.now()+900;setVisible(true)}},true);
  document.addEventListener('pointerup',event=>{if(event.target.closest?.('#nav'))interactionUntil=Date.now()+500},true);
  window.addEventListener('hashchange',()=>{if(location.hash!==lastHash){lastHash=location.hash;reset();rememberPositions()}});
  window.addEventListener('pageshow',()=>{reset();rememberPositions()});
  document.addEventListener('DOMContentLoaded',()=>{reset();rememberPositions()},{once:true});
  reset();
  rememberPositions();
})();
