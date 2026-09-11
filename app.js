(() => {
  const app = document.getElementById('app');
  const storageKey = 'fitpredict-ml-atlas-v1';
  const saved = JSON.parse(localStorage.getItem(storageKey) || '{}');
  const state = {
    view: saved.view || 'landing',
    lab: saved.lab || 'linear',
    selectedMap: saved.selectedMap || null,
    linear: saved.linear || { dataset: 'linear', w: 0, b: 0, lr: .08, reg: .02, steps: 0 },
    knn: saved.knn || { k: 3, metric: 'euclidean', scaling: false },
    tree: saved.tree || { criterion: 'gini', depth: 3, minLeaf: 2, manualRoot: null }
  };

  const linearSets = {
    linear: { label: 'Линейная зависимость', points: [[-4,-7.1],[-3,-5.4],[-2,-3.1],[-1,-1.5],[0,.8],[1,3.1],[2,5.3],[3,7.2],[4,9.6]] },
    nonlinear: { label: 'Нелинейная зависимость', points: [[-4,7.4],[-3,3.3],[-2,.5],[-1,-1.2],[0,-1.5],[1,-.5],[2,1.2],[3,4.1],[4,7.7]] }
  };
  const knnPoints = [
    { x:1.0,y:18,c:0 },{ x:1.6,y:32,c:0 },{ x:2.1,y:25,c:0 },{ x:2.7,y:44,c:0 },{ x:3.1,y:39,c:0 },
    { x:6.2,y:88,c:1 },{ x:6.8,y:74,c:1 },{ x:7.3,y:94,c:1 },{ x:7.8,y:81,c:1 },{ x:8.4,y:102,c:1 }
  ];
  // Без масштабирования большой второй признак тянет жёлтую точку к зелёному классу.
  // После min-max scaling первым становится близкий по x красный сосед.
  const knnTarget = { x:3.3,y:82 };
  const treePoints = [
    {x:1.0,y:1.2,c:0},{x:1.8,y:2.2,c:0},{x:2.5,y:1.4,c:0},{x:3.1,y:3.0,c:0},{x:3.9,y:2.4,c:0},
    {x:5.2,y:1.1,c:1},{x:6.1,y:2.2,c:1},{x:7.0,y:1.4,c:1},{x:7.7,y:2.9,c:1},{x:8.6,y:2.0,c:1},
    {x:1.4,y:6.8,c:1},{x:2.7,y:7.6,c:1},{x:3.6,y:6.2,c:1},{x:4.2,y:7.8,c:1},{x:6.0,y:6.3,c:0},{x:7.1,y:7.5,c:0},{x:8.4,y:6.7,c:0}
  ];

  function persist() { localStorage.setItem(storageKey, JSON.stringify(state)); }
  function escapeHTML(value) { return String(value).replace(/[&<>"]/g, c => ({ '&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;' }[c])); }
  function shell(content) {
    return `<div class="app"><header class="topbar"><div class="top-label">ML ATLAS</div><div class="top-actions"><button class="quiet-button" data-action="home">Главная</button><button class="quiet-button" data-action="map">Карта</button></div></header>${content}</div>`;
  }
  function landing() {
    return shell(`<section class="landing"><div class="landing-copy"><div class="kicker">интерактивный учебник</div><h1>Понимай<br>алгоритмы<br><span>изнутри.</span></h1><p>Меняй реальные параметры модели, смотри на последствия и собирай интуицию — не запоминай готовые рецепты.</p><div class="landing-actions"><button class="primary" data-action="demo">Начать демо <span>→</span></button><span class="micro">линейная регрессия<br>за 60 секунд</span></div></div><div class="hero-card"><div class="window-header"><span class="dots"><i></i><i></i><i></i></span><span>linear-regression.lab</span></div><div class="hero-code">model.<span>fit</span>(X, y)</div>${linearChart(linearSets.linear.points, 2.05, .8, { small: true })}</div></section>`);
  }
  function mapView() {
    const titles = { knn: 'KNN', linear: 'Линейную регрессию', tree: 'Решающее дерево' };
    const node = (id, title, meta, cls) => `<button class="node ${cls} ${state.selectedMap === id ? 'active' : ''}" data-select-lab="${id}"><small>${id === 'knn' ? '01 / начало' : id === 'linear' ? '02 / демо' : '03 / далее'}</small><strong>${title}</strong><span>${meta}</span></button>`;
    const selectedTitle = state.selectedMap ? titles[state.selectedMap] : 'вершину';
    return shell(`<section class="map-screen"><div class="map-head"><h2>Карта<br><span>модулей.</span></h2><p>Выбери вершину, затем открой её лабораторию.</p></div><div class="map"><svg class="map-svg" viewBox="0 0 1000 580" role="img" aria-label="Спиральная карта алгоритмов"><path d="M55 365C35 115 650 18 735 222C828 439 368 533 171 334C17 177 456 -2 877 118C1088 179 924 486 543 535"/><path class="active-path" d="M55 365C78 262 217 191 355 177"/><circle cx="55" cy="365" r="4"/><circle class="active-dot" cx="355" cy="177" r="5"/><circle cx="885" cy="330" r="4"/><circle class="star" cx="86" cy="45" r="2"/><circle class="star" cx="244" cy="35" r="1.5"/><circle class="star" cx="477" cy="37" r="2"/><circle class="star" cx="854" cy="72" r="1.5"/><circle class="star" cx="940" cy="243" r="2"/><circle class="star" cx="426" cy="542" r="1.5"/></svg>${node('knn','KNN','соседи и расстояния','node-knn')}${node('linear','Линейная регрессия','веса и gradient descent','node-linear')}${node('tree','Решающее дерево','split’ы и impurity','node-tree')}<div class="map-open"><button class="primary" data-action="open-selected" ${state.selectedMap ? '' : 'disabled'}>Открыть ${selectedTitle} <span>→</span></button></div></div></section>`);
  }
  function scale(points, width = 690, height = 395, pad = 55) {
    const xs = points.map(p => p[0]), ys = points.map(p => p[1]);
    const xmin = Math.min(...xs), xmax = Math.max(...xs), ymin = Math.min(...ys), ymax = Math.max(...ys);
    const dx = Math.max(1, xmax - xmin), dy = Math.max(1, ymax - ymin);
    const x = value => pad + ((value - xmin) / dx) * (width - 2 * pad);
    const y = value => height - pad - ((value - ymin) / dy) * (height - 2 * pad);
    return { x, y, xmin, xmax, ymin, ymax, width, height, pad };
  }
  function linearChart(points, w, b, { small = false } = {}) {
    const predicted = points.map(([x]) => w * x + b);
    const all = points.concat(points.map(([x], i) => [x, predicted[i]]));
    const s = scale(all, small ? 630 : 720, small ? 315 : 395, small ? 55 : 62);
    const line = `M ${s.x(s.xmin)} ${s.y(w*s.xmin+b)} L ${s.x(s.xmax)} ${s.y(w*s.xmax+b)}`;
    const vertical = [0,1,2,3,4].map(i => { const v=s.xmin+(s.xmax-s.xmin)*i/4; return `<path class="grid" d="M${s.x(v)} ${s.pad}V${s.height-s.pad}"/>`; }).join('');
    const horizontal = [0,1,2,3,4].map(i => { const v=s.ymin+(s.ymax-s.ymin)*i/4; return `<path class="grid" d="M${s.pad} ${s.y(v)}H${s.width-s.pad}"/>`; }).join('');
    return `<svg class="chart-svg" viewBox="0 0 ${s.width} ${s.height}" role="img" aria-label="Данные и прямая модели">${vertical}${horizontal}<path class="axis" d="M${s.pad} ${s.height-s.pad}H${s.width-s.pad}M${s.pad} ${s.height-s.pad}V${s.pad}"/><path class="model-line" d="${line}"/>${points.map(([x,y]) => `<circle class="data-point" cx="${s.x(x)}" cy="${s.y(y)}" r="${small ? 5 : 6}"/>`).join('')}</svg>`;
  }
  function mse(points, w, b) { return points.reduce((sum, [x,y]) => sum + (w*x+b-y)**2, 0) / points.length; }
  function linearLab() {
    const model = state.linear, data = linearSets[model.dataset], loss = mse(data.points, model.w, model.b);
    const bubble = (title, control, math) => `<div class="bubble"><div class="bubble-title"><span>${title}</span>${math ? '<button class="math" data-math="'+math+'">математика ↗</button>' : ''}</div>${control}</div>`;
    const left = bubble('Датасет', `<select data-linear="dataset"><option value="linear" ${model.dataset==='linear'?'selected':''}>Линейная зависимость</option><option value="nonlinear" ${model.dataset==='nonlinear'?'selected':''}>Нелинейная зависимость</option></select>`, 'dataset') + bubble('Начальный вес w', `<div class="range-line"><input data-linear="w" type="range" min="-3" max="3" step=".1" value="${model.w}"><span class="range-value">${model.w.toFixed(1)}</span></div>`, 'weight');
    const right = bubble('Learning rate', `<div class="range-line"><input data-linear="lr" type="range" min=".01" max=".3" step=".01" value="${model.lr}"><span class="range-value">${model.lr.toFixed(2)}</span></div>`, 'gradient') + bubble('L2 регуляризация', `<div class="range-line"><input data-linear="reg" type="range" min="0" max=".3" step=".01" value="${model.reg}"><span class="range-value">${model.reg.toFixed(2)}</span></div>`, 'regularization') + bubble('Смещение b', `<div class="range-line"><input data-linear="b" type="range" min="-4" max="4" step=".1" value="${model.b}"><span class="range-value">${model.b.toFixed(1)}</span></div>`, 'weight');
    const math = `<div class="math-card" id="math-card" hidden></div>`;
    return shell(`<section class="lab-shell"><div class="lab-top"><div class="lab-name"><button class="back" data-action="map">← карта</button><h2>Линейная регрессия</h2></div><span class="lab-status">реальное обучение / batch GD</span></div><div class="lab-grid"><aside class="bubbles">${left}</aside><section class="visual"><div class="visual-head"><span>данные A / ${escapeHTML(data.label)}</span><span class="metric">MSE ${loss.toFixed(3)}</span></div>${linearChart(data.points, model.w, model.b)}<div class="lab-controls"><button class="secondary" data-action="linear-reset">Сбросить</button><button class="secondary" data-action="linear-step">Один шаг</button><button class="primary" data-action="linear-train">До сходимости →</button></div>${math}</section><aside class="bubbles">${right}</aside></div></section>`);
  }
  function normalized(point, points) {
    const xs=points.map(p=>p.x),ys=points.map(p=>p.y); const mx=(Math.min(...xs)+Math.max(...xs))/2, my=(Math.min(...ys)+Math.max(...ys))/2;
    const sx=Math.max(1,Math.max(...xs)-Math.min(...xs)), sy=Math.max(1,Math.max(...ys)-Math.min(...ys));
    return { x:(point.x-mx)/sx, y:(point.y-my)/sy };
  }
  function knnDistances() {
    const cfg=state.knn; const target=cfg.scaling?normalized(knnTarget,knnPoints):knnTarget;
    return knnPoints.map((p,i)=>{const q=cfg.scaling?normalized(p,knnPoints):p;const d=cfg.metric==='manhattan'?Math.abs(q.x-target.x)+Math.abs(q.y-target.y):Math.hypot(q.x-target.x,q.y-target.y);return {...p,d,i};}).sort((a,b)=>a.d-b.d);
  }
  function knnLab() {
    const cfg=state.knn, distances=knnDistances(), neighbors=distances.slice(0,cfg.k), vote=neighbors.reduce((sum,p)=>sum+(p.c?1:-1),0), prediction=vote>0?1:0;
    const sx=x=>54+x/10*610, sy=y=>360-y/120*300;
    const circles=knnPoints.map((p,i)=>{const n=neighbors.some(q=>q.i===i);return `<circle cx="${sx(p.x)}" cy="${sy(p.y)}" r="${n?10:7}" fill="${p.c?'#87dbaa':'#ff7272'}" stroke="${n?'#ffb900':'rgba(255,255,255,.55)'}" stroke-width="${n?3:1.5}"/>`;}).join('');
    const bubble=(title,content,math)=>`<div class="bubble"><div class="bubble-title"><span>${title}</span>${math?'<button class="math" data-math="'+math+'">математика ↗</button>':''}</div>${content}</div>`;
    const left=bubble('Количество соседей k',`<div class="range-line"><input data-knn="k" type="range" min="1" max="7" step="2" value="${cfg.k}"><span class="range-value">${cfg.k}</span></div>`,'knn')+bubble('Масштабирование',`<select data-knn="scaling"><option value="false" ${!cfg.scaling?'selected':''}>Выключено</option><option value="true" ${cfg.scaling?'selected':''}>Min-max scaling</option></select>`,'scaling');
    const right=bubble('Метрика расстояния',`<select data-knn="metric"><option value="euclidean" ${cfg.metric==='euclidean'?'selected':''}>Евклидова</option><option value="manhattan" ${cfg.metric==='manhattan'?'selected':''}>Манхэттенская</option></select>`,'metric')+bubble('Ближайшие точки',`<div class="empty-note">${neighbors.map(p=>`(${p.x.toFixed(1)}, ${p.y}) — ${p.d.toFixed(2)}`).join('<br>')}</div>`);
    return shell(`<section class="lab-shell"><div class="lab-top"><div class="lab-name"><button class="back" data-action="map">← карта</button><h2>KNN</h2></div><span class="lab-status">соседи / признаки / расстояние</span></div><div class="lab-grid"><aside class="bubbles">${left}</aside><section class="visual"><div class="visual-head"><span>класс жёлтой точки</span><span class="metric">${prediction?'зелёный':'красный'} / k=${cfg.k}</span></div><svg class="chart-svg" viewBox="0 0 720 410" role="img" aria-label="Точки двух классов и ближайшие соседи"><path class="grid" d="M54 60H665M54 135H665M54 210H665M54 285H665M54 360H665M54 60V360M176 60V360M298 60V360M420 60V360M542 60V360M665 60V360"/><path class="axis" d="M54 360H678M54 372V50"/>${circles}<circle cx="${sx(knnTarget.x)}" cy="${sy(knnTarget.y)}" r="11" fill="#ffb900" stroke="#fff2bd" stroke-width="2"/><text x="64" y="43" fill="#99999f" font-size="12">признак 2: большой масштаб</text><text x="590" y="388" fill="#99999f" font-size="12">признак 1</text></svg><div class="lab-controls"><button class="secondary" data-action="knn-toggle">${cfg.scaling?'Показать без scaling':'Нормализовать признаки'}</button></div><div class="math-card" id="math-card" hidden></div></section><aside class="bubbles">${right}</aside></div></section>`);
  }
  function impurity(rows, criterion) {
    if (!rows.length) return 0; const p=rows.filter(r=>r.c).length/rows.length;
    return criterion==='entropy' ? (p? -p*Math.log2(p):0) + (p<1?-(1-p)*Math.log2(1-p):0) : 2*p*(1-p);
  }
  function candidateSplits(rows, criterion, minLeaf) {
    const result=[];
    ['x','y'].forEach(feature=>{
      const values=[...new Set(rows.map(r=>r[feature]))].sort((a,b)=>a-b);
      values.slice(0,-1).forEach((v,i)=>{const t=(v+values[i+1])/2,l=rows.filter(r=>r[feature]<=t),right=rows.filter(r=>r[feature]>t);if(l.length<minLeaf||right.length<minLeaf)return;const before=impurity(rows,criterion);const after=(l.length*impurity(l,criterion)+right.length*impurity(right,criterion))/rows.length;result.push({feature,t,left:l,right,drop:before-after,before,after});});
    }); return result.sort((a,b)=>b.drop-a.drop);
  }
  function buildTree(rows, depth, cfg, forcedRoot=null) {
    const base={rows,depth,imp:impurity(rows,cfg.criterion),class:rows.filter(r=>r.c).length>=rows.length/2?1:0};
    if(depth>=cfg.depth||base.imp===0||rows.length<cfg.minLeaf*2)return base;
    const choices=candidateSplits(rows,cfg.criterion,cfg.minLeaf);let best=forcedRoot&&depth===0?choices.find(c=>c.feature===forcedRoot.feature&&Math.abs(c.t-forcedRoot.t)<.01):choices[0];
    if(!best)return base; return {...base,split:best,left:buildTree(best.left,depth+1,cfg),right:buildTree(best.right,depth+1,cfg)};
  }
  function leaves(tree){return tree.split?[...leaves(tree.left),...leaves(tree.right)]:[tree]}
  function accuracy(tree, rows){const predict=p=>{let n=tree;while(n.split)n=p[n.split.feature]<=n.split.t?n.left:n.right;return n.class};return rows.filter(p=>predict(p)===p.c).length/rows.length}
  function treeLab() {
    const cfg=state.tree, choices=candidateSplits(treePoints,cfg.criterion,cfg.minLeaf), tree=buildTree(treePoints,0,cfg,cfg.manualRoot), auto=buildTree(treePoints,0,cfg), validation=[{x:2,y:2,c:0},{x:7,y:2,c:1},{x:2,y:7,c:1},{x:7,y:7,c:0},{x:5,y:6,c:1},{x:4,y:3,c:0}], manualAcc=accuracy(tree,validation),autoAcc=accuracy(auto,validation);
    const bubble=(title,content,math)=>`<div class="bubble"><div class="bubble-title"><span>${title}</span>${math?'<button class="math" data-math="'+math+'">математика ↗</button>':''}</div>${content}</div>`;
    const left=bubble('Критерий impurity',`<select data-tree="criterion"><option value="gini" ${cfg.criterion==='gini'?'selected':''}>Gini</option><option value="entropy" ${cfg.criterion==='entropy'?'selected':''}>Entropy</option></select>`,'impurity')+bubble('Максимальная глубина',`<div class="range-line"><input data-tree="depth" type="range" min="1" max="3" step="1" value="${cfg.depth}"><span class="range-value">${cfg.depth}</span></div>`)+bubble('Минимум в листе',`<div class="range-line"><input data-tree="minLeaf" type="range" min="1" max="3" step="1" value="${cfg.minLeaf}"><span class="range-value">${cfg.minLeaf}</span></div>`);
    const candidates=choices.slice(0,4).map((c,i)=>`<button class="candidate" data-candidate="${i}">${c.feature==='x'?'признак 1':'признак 2'} ≤ ${c.t.toFixed(1)} <span class="score">Δ ${c.drop.toFixed(3)}</span></button>`).join('');
    const right=bubble('Кандидатные split’ы',candidates,'split')+bubble('Валидация',`<div class="empty-note">Твоё дерево: <span class="score">${(manualAcc*100).toFixed(0)}%</span><br>Автоматическое: <span class="score">${(autoAcc*100).toFixed(0)}%</span></div>`);
    const sx=x=>35+x/10*265,sy=y=>290-y/10*255; const dots=treePoints.map(p=>`<circle cx="${sx(p.x)}" cy="${sy(p.y)}" r="5" fill="${p.c?'#87dbaa':'#ff7272'}"/>`).join('');
    const nodes=[]; (function walk(n,label='root'){nodes.push(`<div class="tree-node">${label}: ${n.split?(n.split.feature==='x'?'x₁':'x₂')+' ≤ '+n.split.t.toFixed(1):n.class?'зелёный лист':'красный лист'}<small>impurity ${n.imp.toFixed(3)} / n=${n.rows.length}</small></div>`);if(n.split){walk(n.left,'лево');walk(n.right,'право')}})(tree);
    return shell(`<section class="lab-shell"><div class="lab-top"><div class="lab-name"><button class="back" data-action="map">← карта</button><h2>Решающее дерево</h2></div><span class="lab-status">split’ы / impurity / глубина</span></div><div class="lab-grid"><aside class="bubbles">${left}</aside><section class="visual"><div class="visual-head"><span>дерево глубины ${cfg.depth}</span><span class="metric">${cfg.criterion}</span></div><div class="tree-layout"><div class="tree-box"><svg viewBox="0 0 330 320" role="img" aria-label="Данные двух классов"><path class="grid" d="M35 35H300M35 99H300M35 163H300M35 227H300M35 290H300M35 35V290M101 35V290M167 35V290M233 35V290M300 35V290"/>${tree.split?`<path class="near" d="M${tree.split.feature==='x'?sx(tree.split.t):35} ${tree.split.feature==='x'?35:sy(tree.split.t)}${tree.split.feature==='x'?'V290':'H300'}"/>`:''}${dots}</svg></div><div class="tree-box tree-nodes">${nodes.join('')}</div></div><div class="lab-controls"><button class="secondary" data-action="tree-auto">Автопостроение</button><button class="secondary" data-action="tree-reset">Сбросить выбор</button></div><div class="math-card" id="math-card" hidden></div></section><aside class="bubbles">${right}</aside></div></section>`);
  }
  function mathText(type){return {dataset:'Это крайний учебный пример: на линейных данных прямая может хорошо описать зависимость, на нелинейных — систематически ошибается.',weight:'Модель предсказывает ŷ = w·x + b. Вес w меняет наклон, а b сдвигает прямую целиком.',gradient:'Для MSE градиент по весу: ∂L/∂w = (2/n)Σ(ŷᵢ − yᵢ)xᵢ. Шаг: w ← w − learning rate · ∂L/∂w.',regularization:'L2 добавляет λw² к функции потерь. Градиент получает добавку 2λw и не даёт весу расти без причины.',knn:'KNN голосует классом ближайших k наблюдений. У выбранной точки это реально пересчитывается при каждом изменении k.',scaling:'Расстояние чувствительно к масштабу. Признак со значениями 0–120 может почти целиком определить соседство, даже если он не важнее другого.',metric:'Евклидова метрика — √(Δx²+Δy²), манхэттенская — |Δx|+|Δy|.',impurity:'Gini = 1 − Σpₖ². Чем чище классы в узле, тем ближе impurity к нулю.',split:'Каждый кандидат делит реальные точки на две группы. Мы считаем взвешенное impurity после split’а и показываем его уменьшение Δ.'}[type]||'';}
  function render() { app.innerHTML = state.view==='landing'?landing():state.view==='map'?mapView():state.lab==='linear'?linearLab():state.lab==='knn'?knnLab():treeLab(); bind(); persist(); }
  function openMath(type){const card=document.querySelector('#math-card'); if(!card)return; card.hidden=false;card.innerHTML=`<button aria-label="Закрыть">×</button><b>Почему так:</b> ${mathText(type)}`;card.querySelector('button').onclick=()=>card.hidden=true;}
  function updateLinear(){const m=state.linear,d=linearSets[m.dataset].points,n=d.length;let dw=0,db=0;d.forEach(([x,y])=>{const e=m.w*x+m.b-y;dw+=e*x;db+=e});dw=2*dw/n+2*m.reg*m.w;db=2*db/n;m.w-=m.lr*dw;m.b-=m.lr*db;m.steps++;}
  function bind(){
    app.querySelectorAll('[data-action]').forEach(el=>el.addEventListener('click',()=>{const a=el.dataset.action;if(a==='home')state.view='landing';if(a==='map')state.view='map';if(a==='demo'){state.view='lab';state.lab='linear'}if(a==='open-selected'&&state.selectedMap){state.view='lab';state.lab=state.selectedMap}if(a==='linear-reset')state.linear={dataset:state.linear.dataset,w:0,b:0,lr:state.linear.lr,reg:state.linear.reg,steps:0};if(a==='linear-step')updateLinear();if(a==='linear-train'){for(let i=0;i<300;i++)updateLinear()}if(a==='knn-toggle')state.knn.scaling=!state.knn.scaling;if(a==='tree-auto')state.tree.manualRoot=null;if(a==='tree-reset')state.tree.manualRoot=null;render()}));
    app.querySelectorAll('[data-select-lab]').forEach(el=>el.addEventListener('click',()=>{state.selectedMap=el.dataset.selectLab;render()}));
    app.querySelectorAll('[data-linear]').forEach(el=>{
      const update=()=>{const key=el.dataset.linear;state.linear[key]=key==='dataset'?el.value:Number(el.value);const value=el.closest('.range-line')?.querySelector('.range-value');if(value)value.textContent=key==='lr'||key==='reg'?Number(el.value).toFixed(2):Number(el.value).toFixed(1);};
      if(el.type==='range'){el.addEventListener('input',update);el.addEventListener('change',()=>{update();render()});}else el.addEventListener('change',()=>{update();state.linear.w=0;state.linear.b=0;state.linear.steps=0;render()});
    });
    app.querySelectorAll('[data-knn]').forEach(el=>{
      const update=()=>{const k=el.dataset.knn;state.knn[k]=k==='k'?Number(el.value):k==='scaling'?el.value==='true':el.value;const value=el.closest('.range-line')?.querySelector('.range-value');if(value)value.textContent=el.value;};
      if(el.type==='range'){el.addEventListener('input',update);el.addEventListener('change',()=>{update();render()});}else el.addEventListener('change',()=>{update();render()});
    });
    app.querySelectorAll('[data-tree]').forEach(el=>{
      const update=()=>{const k=el.dataset.tree;state.tree[k]=k==='criterion'?el.value:Number(el.value);state.tree.manualRoot=null;const value=el.closest('.range-line')?.querySelector('.range-value');if(value)value.textContent=el.value;};
      if(el.type==='range'){el.addEventListener('input',update);el.addEventListener('change',()=>{update();render()});}else el.addEventListener('change',()=>{update();render()});
    });
    app.querySelectorAll('[data-math]').forEach(el=>el.addEventListener('click',()=>openMath(el.dataset.math)));
    app.querySelectorAll('[data-candidate]').forEach(el=>el.addEventListener('click',()=>{const choices=candidateSplits(treePoints,state.tree.criterion,state.tree.minLeaf);state.tree.manualRoot=choices[Number(el.dataset.candidate)];render()}));
  }
  render();
})();
