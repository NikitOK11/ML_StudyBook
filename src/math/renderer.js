// Shared, local-only MathJax runtime. Work is serialized and scoped to changed nodes.
let loading, queue = Promise.resolve();
export function loadMath() {
  if (!loading) loading = new Promise((resolve, reject) => {
    window.MathJax = {tex:{inlineMath:[['$','$']],displayMath:[['$$','$$']],packages:['base','ams','newcommand','noundefined']},svg:{fontCache:'local'},options:{enableMenu:false},startup:{typeset:false}};
    const script=document.createElement('script');script.src=new URL('../../vendor/mathjax/tex-svg.js',import.meta.url).href;
    script.onload=()=>window.MathJax.startup.promise.then(resolve,reject);
    script.onerror=()=>{loading=null;script.remove();reject(Error('Не удалось загрузить формулы'));};document.head.append(script);
  });
  return loading;
}
export function clearMath(root) {
  window.MathJax?.typesetClear?.([root]);
  const document=window.MathJax?.startup?.document;
  if(document?.options.elements?.some(element=>element===root||root.contains(element)))document.options.elements=[];
}
export function typesetMath(root) {
  queue=queue.catch(()=>{}).then(async()=>{if(!root.isConnected)return;await loadMath();if(!root.isConnected)return;await window.MathJax.typesetPromise([root]);if(!root.isConnected)clearMath(root);});
  return queue;
}
export function mathHTML(tex, display=true) {
  const escaped=tex.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'}[c]));
  const mark=display?'$$':'$';return `<span class="${display?'math-display':'math-inline'}">${mark}${escaped}${mark}</span>`;
}
