/** Build WebView DevTools expressions without embedding dynamic values in CSS. */
export function findByDatasetExpression(collectionSelector, datasetKey, value) {
  return `[...document.querySelectorAll(${JSON.stringify(collectionSelector)})].find(node=>node.dataset[${JSON.stringify(datasetKey)}]===${JSON.stringify(String(value))})`;
}

export function clickByDatasetExpression(collectionSelector, datasetKey, value) {
  return `(()=>{const node=${findByDatasetExpression(collectionSelector, datasetKey, value)};if(!node)return false;node.click();return true})()`;
}

export function clickSelectorExpression(selector) {
  return `(()=>{const node=document.querySelector(${JSON.stringify(selector)});if(!node)return false;node.click();return true})()`;
}

export function navigationSummaryExpression() {
  return `(()=>[...document.querySelectorAll("#nav .tab")].map(tab=>({id:tab.dataset.nav,label:(tab.lastChild?.textContent||"").trim()})))()`;
}
