import {notation} from './notation.js';
import {equations,equationSelector} from './equations.js';
import {mathHTML,typesetMath,clearMath} from './renderer.js';
export function prepareEquations(root) {
  const sections=[...(root.matches?.('section[id]')?[root]:[]),...root.querySelectorAll('section[id]')];
  for(const section of sections){
    if(notation[section.id]&&!section.dataset.notationPrepared){const nodes=[...section.querySelectorAll('.notation-card dt')],sources=notation[section.id];if(nodes.length!==sources.length)throw Error('Notation mismatch '+section.id);nodes.forEach((node,i)=>{if(sources[i]){node.dataset.tex=sources[i];node.innerHTML=mathHTML(sources[i],false);}});section.dataset.notationPrepared='true';}
    const sources=equations[section.id];if(!sources||section.dataset.mathPrepared)continue;
    const nodes=[...section.querySelectorAll(equationSelector)];
    if(nodes.length!==sources.length)throw Error(`Несовпадение формул ${section.id}: ${nodes.length}/${sources.length}`);
    nodes.forEach((node,i)=>{const target=node.tagName==='CODE'?document.createElement('span'):node;if(target!==node)node.replaceWith(target);target.dataset.tex=sources[i];target.innerHTML=mathHTML(sources[i]);});
    if(section.id==='knn-distance'){const caption=document.createElement('p');caption.textContent='d₂ — евклидова, d₁ — манхэттенская, dₚ — метрика Минковского.';section.append(caption);}
    section.dataset.mathPrepared='true';
  }
}
export function observeMath(root) {
  const pending=new Set();let scheduled=false;
  const flush=()=>{scheduled=false;for(const node of pending){if(node.isConnected){prepareEquations(node);const targets=[...(node.matches?.('.math-display,.math-inline,[data-math]')?[node]:[]),...node.querySelectorAll('.math-display,.math-inline,[data-math]')];for(const target of targets)if(!target.dataset.mathMounted){target.dataset.mathMounted='true';typesetMath(target).catch(()=>{target.dataset.mathMounted='';});}}}pending.clear();};
  const enqueue=node=>{if(node.nodeType!==1||node.closest('mjx-container,.mlp-lab,.mlp-theory-shell'))return;pending.add(node);if(!scheduled){scheduled=true;queueMicrotask(flush);}};
  const observer=new MutationObserver(records=>{for(const record of records){for(const node of record.removedNodes)if(node.nodeType===1)clearMath(node);for(const node of record.addedNodes)enqueue(node);}});
  observer.observe(root,{childList:true,subtree:true});enqueue(root);
  return()=>{observer.disconnect();pending.clear();clearMath(root);};
}
