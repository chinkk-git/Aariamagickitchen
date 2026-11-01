const palettes = {
  parfait:{dish:'parfait',tone:'#f5cdd3',base:'#fff3e3'},
  'mini-pizza-toast':{dish:'toast',tone:'#ef7180',base:'#ffe5b8'}
};
const stepImages={
  'parfait-wash':'../../packages/assets/cooking-steps/parfait-wash.jpg',
  'parfait-yogurt':'../../packages/assets/cooking-steps/parfait-yogurt.jpg',
  'parfait-layers':'../../packages/assets/cooking-steps/parfait-layers.jpg',
  'parfait-finish':'../../packages/assets/cooking-steps/parfait-finish.jpg',
  'toast-sauce':'../../packages/assets/cooking-steps/toast-sauce.jpg',
  'toast-toppings':'../../packages/assets/cooking-steps/toast-toppings.jpg',
  'toast-airfryer':'../../packages/assets/cooking-steps/toast-airfryer.jpg',
  'toast-finish':'../../packages/assets/cooking-steps/toast-finish.jpg'
};
export function foodArt(recipeId, selected=[]) {
  const p=palettes[recipeId]||palettes.parfait;
  if(p.dish==='parfait') {
    const berries = selected.includes('strawberries') || selected.includes('blueberries');
    return `<svg class="food-art-svg" viewBox="0 0 480 330" role="img" aria-label="Illustration of a layered yogurt parfait with selected fruit toppings"><defs><linearGradient id="cup" x2="0" y2="1"><stop stop-color="#ffffff" stop-opacity=".92"/><stop offset="1" stop-color="#e8f5f4" stop-opacity=".55"/></linearGradient><linearGradient id="yog" x2="0" y2="1"><stop stop-color="#fffdf8"/><stop offset="1" stop-color="#fff2df"/></linearGradient><filter id="sh"><feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#755541" flood-opacity=".15"/></filter></defs><ellipse cx="240" cy="292" rx="155" ry="18" fill="#89725b" opacity=".12"/><path d="M133 58h214l-24 222q-4 27-29 27h-108q-25 0-29-27z" fill="url(#cup)" stroke="#fff" stroke-width="9" filter="url(#sh)"/><path d="M139 105h202l-8 68H146z" fill="url(#yog)"/><path d="M146 171h188l-8 52H151z" fill="#f2b7c0"/><path d="M151 222h177l-7 42H155z" fill="url(#yog)"/><path d="M163 273q70 21 145 0l-3 17q-66 19-138 0z" fill="#f5d4db"/><ellipse cx="240" cy="59" rx="108" ry="22" fill="#fff" stroke="#ead8d5" stroke-width="4"/><ellipse cx="240" cy="60" rx="88" ry="13" fill="#fffaf5"/><g>${berries?`<circle cx="190" cy="48" r="19" fill="#df526c"/><circle cx="236" cy="47" r="18" fill="#526eae"/><circle cx="281" cy="49" r="18" fill="#df526c"/><path d="M183 33l8-10 7 11m38-5 8-9 8 11m29 1 8-10 7 11" fill="none" stroke="#648566" stroke-width="5" stroke-linecap="round"/>`:''}<g fill="#d8a36d"><rect x="207" y="41" width="13" height="9" rx="3" transform="rotate(-20 207 41)"/><rect x="253" y="36" width="14" height="9" rx="3" transform="rotate(18 253 36)"/><rect x="222" y="34" width="11" height="8" rx="3" transform="rotate(27 222 34)"/></g></g><path d="M169 91q18 80 2 151" fill="none" stroke="#fff" stroke-width="9" stroke-linecap="round" opacity=".58"/><g fill="#f3c54f" opacity=".9"><path d="M83 103l5 11 12 1-9 8 3 12-11-7-10 7 3-12-9-8 12-1z"/><circle cx="377" cy="137" r="7"/><circle cx="112" cy="226" r="5"/></g></svg>`;
  }
  const toppings=selected.filter(x=>['bell-pepper','olive','mozzarella'].includes(x));
  const cheese=toppings.includes('mozzarella');
  return `<svg class="food-art-svg" viewBox="0 0 480 330" role="img" aria-label="Illustration of a finished mini pizza toast with selected toppings"><defs><linearGradient id="toast" x2="0" y2="1"><stop stop-color="#efbd76"/><stop offset="1" stop-color="#b97848"/></linearGradient><filter id="sh"><feDropShadow dx="0" dy="10" stdDeviation="12" flood-color="#755541" flood-opacity=".18"/></filter></defs><ellipse cx="240" cy="286" rx="172" ry="19" fill="#89725b" opacity=".13"/><g transform="rotate(-4 240 170)" filter="url(#sh)"><rect x="84" y="73" width="312" height="190" rx="52" fill="url(#toast)"/><rect x="103" y="91" width="274" height="154" rx="39" fill="#f5d698"/><rect x="120" y="107" width="240" height="122" rx="30" fill="#df6257"/><path d="M127 142q45-37 83 0t82 0q32-24 61 1v40q-33-20-65 0t-80 0q-42-23-81 0z" fill="#fff0c5" opacity=".96"/>${cheese?'<path d="M132 162q43-20 82 0t78 0q32-16 59 1v38q-30-16-63 2t-77 0q-43-20-79 0z" fill="#fff8df"/>':''}<g fill="#648568" stroke="#fff7e9" stroke-width="3">${toppings.includes('bell-pepper')?'<circle cx="178" cy="131" r="13" fill="#78a871"/><circle cx="290" cy="133" r="13" fill="#e7c44d"/><circle cx="233" cy="196" r="12" fill="#e77d5a"/>':''}</g><g fill="#554442" stroke="#fff7e9" stroke-width="3">${toppings.includes('olive')?'<circle cx="232" cy="130" r="11"/><circle cx="316" cy="184" r="11"/>':''}</g></g><g fill="#f3c54f"><path d="M75 118l5 11 12 1-9 8 3 12-11-7-10 7 3-12-9-8 12-1z"/><circle cx="403" cy="217" r="6"/></g></svg>`;
}

export function stepArt(recipeId, index, selected=[]) {
  const isToast=recipeId==='mini-pizza-toast';
  const names=isToast?['toast-sauce','toast-toppings','toast-airfryer','toast-finish']:['parfait-wash','parfait-yogurt','parfait-layers','parfait-finish'];
  const labels=isToast?['Spread pizza sauce on whole-wheat bread','Sprinkle mozzarella and add small pepper and olive pieces','An adult safely places the mini pizza toast in the air fryer','Cool the cooked mini pizza toast on a plate']:['Rinse strawberries and blueberries under cool running water','Spoon plain Greek yogurt into a clear cup','Layer yogurt with strawberries and blueberries','Top the finished parfait with granola and berries'];
  const name=names[Math.max(0,Math.min(index,names.length-1))];
  const label=labels[Math.max(0,Math.min(index,labels.length-1))];
  return `<img class="step-photo" src="${stepImages[name]}" alt="${label}">`;
}
