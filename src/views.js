import { linearDatasets, knnClassNames, knnFeatureNames, knnPoints, knnTarget, knnTargetName, logisticClassNames, logisticFeatureNames, logisticRows, logisticTargetName, treeFeatureNames, treePoints, treeTargetName, treeValidation, moduleCatalog, svmClassNames, svmFeatureNames, svmPoints, svmTargetName } from './data.js?v=20260915-ml5';
import { meanSquaredError, linearConvergence, linearGradients, findNeighbors, knnPrediction, buildTree, treeAccuracy, binaryCrossEntropy, logisticAccuracy, logisticGradients, logisticProbability, logisticScore, sigmoid, svmAccuracy, svmGradients, svmMargin, svmObjective, svmScore } from './algorithms.js?v=20260915-ml5';
import { theoryPages } from './theory.js?v=20260915-ml5';

export function escapeHTML(value) {
  return String(value).replace(/[&<>"]/g, char => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));
}

function nav() {
  return `<header class="topbar"><div class="top-label">FIT <span>&amp;</span> PREDICT</div><nav class="top-actions" aria-label="Основная навигация"><button class="quiet-button" data-route="map">Учебник</button><button class="quiet-button" data-route="about">О проекте</button><button class="quiet-button" data-route="profile">Профиль</button></nav></header>`;
}

function rangeControl({ scope, key, label, value, min, max, step, format = value => value }) {
  const percent = ((Number(value) - Number(min)) / (Number(max) - Number(min))) * 100;
  return `<label class="control"><span class="control-label">${label}</span><span class="range-line"><input class="range-control" data-control="${scope}.${key}" type="range" min="${min}" max="${max}" step="${step}" value="${value}" style="--range-progress:${percent}%"><output data-output="${scope}.${key}">${format(value)}</output></span></label>`;
}

function selectControl({ scope, key, label, value, options }) {
  return `<label class="control"><span class="control-label">${label}</span><select data-control="${scope}.${key}">${options.map(option => `<option value="${option.value}" ${option.value === String(value) ? 'selected' : ''}>${option.label}</option>`).join('')}</select></label>`;
}

function linearScale(points, weight, bias, width = 720, height = 395, pad = 62) {
  const firstWeight = Array.isArray(weight) ? weight[0] : weight;
  const predicted = points.map(([x]) => [x, firstWeight * x + bias]);
  const all = [...points, ...predicted];
  const xs = all.map(point => point[0]);
  const ys = all.map(point => point[1]);
  const xmin = Math.min(...xs), xmax = Math.max(...xs), ymin = Math.min(...ys), ymax = Math.max(...ys);
  const dx = Math.max(1, xmax - xmin), dy = Math.max(1, ymax - ymin);
  const x = value => pad + ((value - xmin) / dx) * (width - 2 * pad);
  const y = value => height - pad - ((value - ymin) / dy) * (height - 2 * pad);
  return { x, y, xmin, xmax, width, height, pad };
}

function linearChart(points, weight, bias, id = 'linear') {
  const firstWeight = Array.isArray(weight) ? weight[0] : weight;
  const scale = linearScale(points, weight, bias);
  const vertical = [0, 1, 2, 3, 4].map(index => {
    const value = scale.xmin + (scale.xmax - scale.xmin) * index / 4;
    return `<path class="grid" d="M${scale.x(value)} ${scale.pad}V${scale.height - scale.pad}"/>`;
  }).join('');
  const horizontal = [0, 1, 2, 3, 4].map(index => `<path class="grid" d="M${scale.pad} ${scale.pad + (scale.height - 2 * scale.pad) * index / 4}H${scale.width - scale.pad}"/>`).join('');
  const line = `M ${scale.x(scale.xmin)} ${scale.y(firstWeight * scale.xmin + bias)} L ${scale.x(scale.xmax)} ${scale.y(firstWeight * scale.xmax + bias)}`;
  return `<svg class="chart-svg" viewBox="0 0 ${scale.width} ${scale.height}" role="img" aria-label="Данные и прямая модели"><g>${vertical}${horizontal}<path class="axis" d="M${scale.pad} ${scale.height - scale.pad}H${scale.width - scale.pad}M${scale.pad} ${scale.height - scale.pad}V${scale.pad}"/><path class="model-line" data-linear-line="${id}" d="${line}"/>${points.map(([x, y]) => `<circle class="data-point" cx="${scale.x(x)}" cy="${scale.y(y)}" r="6"/>`).join('')}</g></svg>`;
}

export function linearLinePath(points, weight, bias) {
  const firstWeight = Array.isArray(weight) ? weight[0] : weight;
  const scale = linearScale(points, weight, bias);
  return `M ${scale.x(scale.xmin)} ${scale.y(firstWeight * scale.xmin + bias)} L ${scale.x(scale.xmax)} ${scale.y(firstWeight * scale.xmax + bias)}`;
}

export function introView() {
  return `<main class="intro-screen"><div class="intro-content"><h1>Учебник<br><span>машинного обучения</span></h1><button class="primary" data-action="start-learning">Начать обучение <span>→</span></button></div></main>`;
}

export function demoView(model) {
  const points = linearDatasets.linear.points;
  return `<main class="demo-screen"><section class="demo-lab"><div class="demo-head"><span class="dots"><i></i><i></i><i></i></span><span class="metric" data-demo-loss>MSE ${meanSquaredError(points, model.w, model.b).toFixed(3)}</span></div>${linearChart(points, model.w, model.b, 'demo')}<div class="demo-actions"><button class="primary" data-action="demo-train">Обучить модель <span>→</span></button></div></section></main>`;
}

export function signupView(profile) {
  return `<main class="signup-screen"><section class="signup-card"><button class="skip" data-action="skip-signup">Пропустить</button><div class="kicker">личный контур</div><h2>Сохрани<br><span>свой путь.</span></h2><form data-form="signup"><label>Имя и фамилия<input name="fullName" value="${escapeHTML(profile.fullName)}" autocomplete="name" required></label><label>Почта<input name="email" type="email" value="${escapeHTML(profile.email)}" autocomplete="email" required></label><button class="primary" type="submit">Зарегистрироваться <span>→</span></button></form><p>Регистрация превратит учебник в личную тетрадь: эксперименты и прогресс будут ждать тебя при следующем входе.</p></section></main>`;
}

export function mapView(selectedModule) {
  const coordinates = ['map-node-1', 'map-node-2', 'map-node-3', 'map-node-4', 'map-node-5'];
  const active = moduleCatalog.find(module => module.id === selectedModule);
  return `${nav()}<main class="map-screen"><div class="map-head map-head-compact"><div class="map-head-actions"><p>Выбери алгоритм на маршруте, затем открой его.</p></div></div><section class="map"><svg class="map-svg" viewBox="0 0 1000 660" preserveAspectRatio="none" role="img" aria-label="Карта алгоритмов машинного обучения"><path class="module-route" d="M104 536 C170 426 252 256 368 190 C462 136 545 166 626 245 C689 306 722 327 770 307 C844 274 878 218 932 148"/><circle class="route-point" cx="104" cy="536" r="7"/><circle class="route-point" cx="368" cy="190" r="7"/><circle class="route-point" cx="626" cy="245" r="7"/><circle class="route-point" cx="770" cy="307" r="7"/><circle class="route-point" cx="932" cy="148" r="7"/><circle class="star" cx="93" cy="76" r="2"/><circle class="star" cx="470" cy="35" r="1.5"/><circle class="star" cx="930" cy="72" r="2"/><circle class="star" cx="935" cy="474" r="1.5"/><circle class="star" cx="552" cy="620" r="2"/><circle class="star" cx="267" cy="555" r="1.5"/></svg>${moduleCatalog.map((module, index) => `<button class="node ${coordinates[index]} ${selectedModule === module.id ? 'active' : ''}" data-select-module="${module.id}"><small>${module.stage}</small><strong>${module.title}</strong><span>${module.subtitle}</span></button>`).join('')}<div class="map-open"><button class="primary" data-action="open-module" ${active ? '' : 'disabled'}>${active ? `Открыть: ${active.title}` : 'Выбери модуль'} <span>→</span></button></div></section></main>`;
}

const mathCopy = {
  dataset: 'Это преднамеренно крайний пример. Прямая хорошо описывает линейные данные и систематически ошибается на нелинейных.',
  weight: 'Модель предсказывает ŷ = w·x + b. Вес меняет наклон, а смещение двигает прямую целиком.',
  gradient: 'Градиент MSE по весу: ∂L/∂w = (2/n)Σ(ŷᵢ − yᵢ)xᵢ. Он показывает, в какую сторону изменить вес.',
  regularization: 'L2 добавляет λw² к функции потерь и 2λw к градиенту. Большие веса становятся дороже.',
  knn: 'KNN присваивает класс по голосованию ближайших k наблюдений.',
  metric: 'Евклидова метрика — √(Δx²+Δy²), манхэттенская — |Δx|+|Δy|.',
  impurity: 'Gini = 1 − Σpₖ². Чистый узел содержит один класс, поэтому его impurity равно нулю.',
  split: 'Каждый split реально делит точки на две группы. Δ показывает, насколько уменьшилось взвешенное impurity.'
};

function theoryJump(route, section, label = 'математика ↗') {
  return `<button class="math" data-theory-route="${route}" data-theory-section="${section}">${label}</button>`;
}

function bubble(title, control, theory) {
  return `<section class="bubble"><div class="bubble-title"><span>${title}</span>${theory ? theoryJump(theory.route, theory.section) : ''}</div>${control}</section>`;
}

function linearDatasetPicker(activeDataset) {
  const options = [
    { id: 'linear', title: 'Результат обучения', meta: '3 признака · 72 train' },
    { id: 'nonlinear', title: 'Восстановление', meta: '3 признака · 72 train' },
    { id: 'correlated', title: 'Стоимость квартиры', meta: '3 признака · 96 train' }
  ];
  return `<div class="dataset-picker">${options.map(option => `<button class="dataset-choice ${activeDataset === option.id ? 'active' : ''}" data-linear-dataset="${option.id}"><strong>${option.title}</strong><small>${option.meta}</small></button>`).join('')}</div>`;
}

export function linearLab(model) {
  const dataset = linearDatasets[model.dataset];
  const weights = Array.isArray(model.w) ? model.w : [model.w];
  const gradients = linearGradients(model, dataset.rows);
  const loss = meanSquaredError(dataset.rows, model.w, model.b);
  const validationLoss = meanSquaredError(dataset.validation, model.w, model.b);
  const convergence = linearConvergence(model, dataset.rows);
  const isConverged = model.converged || convergence.converged;
  const convergenceCopy = model.stopReason === 'limit'
    ? `предел 5 000 шагов · ∥∇J∥ ${convergence.gradientNorm.toExponential(2)}`
    : model.stopReason === 'diverged'
      ? 'расходится · уменьши learning rate'
      : isConverged
        ? `сошлось · ∥∇J∥ ${convergence.gradientNorm.toExponential(2)}`
        : `поиск минимума · ∥∇J∥ ${convergence.gradientNorm.toExponential(2)}`;
  const format = value => Math.abs(value) >= 1000 ? value.toExponential(2) : value.toFixed(3);
  const equation = weights.map((weight, index) => `${format(weight)}·${dataset.equationNames[index]}`).join(' + ');
  const weightCards = weights.map((weight, index) => `<article class="weight-card"><span>вес · ${dataset.featureNames[index]}</span><strong data-linear-weight="${index}">${format(weight)}</strong><small>градиент <i data-linear-gradient="${index}">${format(gradients.weights[index])}</i></small></article>`).join('');
  const warning = dataset.warning ? `<p class="collinearity-note">${dataset.warning}</p>` : '';
  const left = bubble('Выбор датасета', linearDatasetPicker(model.dataset)) + `<button class="theory-link" data-theory-route="linear-theory" data-theory-section="linear-intro"><span>Полное описание алгоритма</span><b>↗</b></button>`;
  const right = bubble('Learning rate', rangeControl({ scope: 'linear', key: 'lr', label: '', value: model.lr, min: .01, max: 1, step: .01, format: value => Number(value).toFixed(2) }), { route: 'linear-theory', section: 'linear-gradient' }) + bubble('L2 регуляризация', rangeControl({ scope: 'linear', key: 'reg', label: '', value: model.reg, min: 0, max: 1, step: .01, format: value => Number(value).toFixed(2) }), { route: 'linear-theory', section: 'linear-regularization' }) + bubble('Смещение b', rangeControl({ scope: 'linear', key: 'b', label: '', value: model.b, min: -4, max: 4, step: .1, format: value => Number(value).toFixed(1) }), { route: 'linear-theory', section: 'linear-model' });
  return labLayout('Линейная регрессия', 'batch gradient descent', left, `<div class="visual-head"><span data-linear-dataset-label>датасет / ${dataset.label}</span><div class="visual-head-actions"><button class="dataset-trigger" data-action="show-dataset" data-dataset="${model.dataset}">Показать датасет ↗</button><span class="metric" data-linear-loss>train MSE ${format(loss)}</span></div></div><div class="weights-stage"><section class="equation-card"><span>прогноз / ${dataset.targetName}</span><strong data-linear-equation>${dataset.targetName} = ${equation} + ${format(model.b)}</strong><small>шагов градиентного спуска: <i data-linear-steps>${model.steps}</i></small><small class="linear-convergence" data-linear-convergence data-linear-converged="${String(isConverged)}" data-linear-stop-reason="${model.stopReason || ''}">${convergenceCopy}</small></section><div class="weight-grid">${weightCards}<article class="weight-card bias"><span>b · смещение</span><strong data-linear-bias>${format(model.b)}</strong><small>градиент <i data-linear-bias-gradient>${format(gradients.bias)}</i></small></article></div><div class="linear-metrics"><span>train MSE <b data-linear-train-loss>${format(loss)}</b></span><span>validation MSE <b data-linear-validation-loss>${format(validationLoss)}</b></span></div>${warning}</div><div class="lab-controls"><button class="secondary" data-action="linear-reset">Сбросить веса</button><button class="secondary" data-action="linear-step">Один шаг</button><button class="primary" data-action="linear-train">До сходимости →</button></div>`, right);
}

function theoryView(kind, indexCollapsed = false) {
  const page = theoryPages[kind];
  const index = page.outline.map(([id, label]) => `<a href="#${id}">${label}</a>`).join('');
  const theme = kind === 'tree' ? 'объяснимая классификация' : kind === 'knn' ? 'локальная классификация' : kind === 'svm' ? 'геометрическая классификация' : kind === 'logistic' ? 'вероятностная классификация' : 'регрессия и оптимизация';
  const collapseLabel = indexCollapsed ? 'Показать содержание' : 'Свернуть содержание';
  return `${nav()}<main class="theory-screen"><div class="theory-layout ${indexCollapsed ? 'is-index-collapsed' : ''}"><aside class="theory-index" aria-label="Содержание алгоритма"><button class="back theory-index-back" data-route="${page.route}">← к алгоритму</button><button class="theory-index-toggle" data-action="toggle-theory-index" aria-expanded="${String(!indexCollapsed)}" aria-label="${collapseLabel}" title="${collapseLabel}"><span aria-hidden="true">${indexCollapsed ? '›' : '‹'}</span></button><div class="theory-index-content"><span>${page.label}</span><nav>${index}</nav></div></aside><article class="theory-sheet"><div class="theory-top"><span>${page.label}</span><button class="back" data-route="${page.route}">к алгоритму →</button></div><header><div class="kicker">${theme}</div><h1>${page.title}</h1><p>${page.lead}</p></header>${page.content}</article></div></main>`;
}

export const linearTheoryView = indexCollapsed => theoryView('linear', indexCollapsed);
export const logisticTheoryView = indexCollapsed => theoryView('logistic', indexCollapsed);
export const knnTheoryView = indexCollapsed => theoryView('knn', indexCollapsed);
export const treeTheoryView = indexCollapsed => theoryView('tree', indexCollapsed);
export const svmTheoryView = indexCollapsed => theoryView('svm', indexCollapsed);

function knnChart(settings) {
  const selectedIndex = Number.isInteger(settings.selectedPoint) ? settings.selectedPoint : null;
  const target = selectedIndex === null ? knnTarget : knnPoints[selectedIndex];
  const { neighbors, prediction } = knnPrediction(knnPoints, target, settings, selectedIndex);
  const toX = value => 85 + value / 10 * 845;
  const toY = value => 535 - value / 120 * 405;
  const circles = knnPoints.map((point, index) => {
    const selected = neighbors.some(neighbor => neighbor.index === index);
    const active = selectedIndex === index;
    return `<circle class="knn-object ${selected ? 'neighbor' : ''} ${active ? 'selected-object' : ''}" data-knn-point="${index}" cx="${toX(point.x)}" cy="${toY(point.y)}" r="${selected || active ? 10 : 7}" fill="${point.c ? '#87dbaa' : '#ff7272'}" stroke="${selected || active ? '#ffb900' : 'rgba(255,255,255,.55)'}" stroke-width="${selected || active ? 3 : 1.5}"/>`;
  }).join('');
  const query = selectedIndex === null ? `<circle class="knn-query" data-knn-target cx="${toX(knnTarget.x)}" cy="${toY(knnTarget.y)}" r="12" fill="#ffb900" stroke="#fff2bd" stroke-width="2"/>` : '';
  return { target, selectedIndex, neighbors, prediction, markup: `<svg class="chart-svg knn-chart" viewBox="0 0 1020 620" role="img" aria-label="Пространство признаков KNN"><path class="grid" d="M85 80H930M85 181H930M85 282H930M85 383H930M85 484H930M85 535H930M85 80V535M254 80V535M423 80V535M592 80V535M761 80V535M930 80V535"/><path class="axis" d="M85 535H950M85 555V60"/>${circles}${query}<text x="102" y="53" fill="#99999f" font-size="15">${knnFeatureNames[1]}</text><text x="775" y="578" fill="#99999f" font-size="15">${knnFeatureNames[0]}</text></svg>` };
}

function knnMetricLens(visual) {
  const points = [
    { label: 'объект', x: 0, y: 0, target: true },
    ...visual.neighbors.map((neighbor, index) => ({ label: `#${neighbor.index + 1}`, x: neighbor.x - visual.target.x, y: neighbor.y - visual.target.y, index }))
  ];
  const extent = Math.max(4, ...points.flatMap(point => [Math.abs(point.x), Math.abs(point.y)]) ) * 1.18;
  const projectX = value => 92 + value / extent * 72;
  const projectY = value => 92 - value / extent * 72;
  const links = points.slice(1).map(point => `<line x1="92" y1="92" x2="${projectX(point.x)}" y2="${projectY(point.y)}"/>`).join('');
  const marks = points.map(point => point.target ? `<circle class="knn-lens-target" cx="92" cy="92" r="6"/>` : `<g><circle class="knn-lens-neighbor" cx="${projectX(point.x)}" cy="${projectY(point.y)}" r="5"/><text x="${projectX(point.x) + 7}" y="${projectY(point.y) - 6}">${point.label}</text></g>`).join('');
  return `<div class="knn-metric-lens"><span>локальная геометрия метрики</span><svg viewBox="0 0 184 184" role="img" aria-label="Ближайшие объекты без визуального растяжения осей"><path class="knn-lens-axis" d="M18 92H166M92 18V166"/>${links}${marks}<text x="149" y="86">Δсл.</text><text x="98" y="25">Δмин.</text></svg><small>Здесь обе оси имеют один масштаб. На большой плоскости ось сложности растянута только для чтения данных.</small></div>`;
}

function knnPopover(visual) {
  if (visual.selectedIndex === null) return `<div class="knn-guide"><b>Выбери объект</b><span>Нажми на точку, чтобы увидеть её k ближайших соседей и точные расстояния.</span></div>`;
  const focus = visual.target;
  return `<aside class="knn-popover"><button class="close-knn-popover" data-action="close-knn-details" aria-label="Закрыть карточку соседей">×</button><span>объект #${visual.selectedIndex + 1}</span><strong>${knnFeatureNames[0]}: ${focus.x.toFixed(2)}<br>${knnFeatureNames[1]}: ${focus.y.toFixed(2)}</strong><p>Ближайшие ${visual.neighbors.length} по выбранной метрике:</p><ol>${visual.neighbors.map(neighbor => `<li><b>#${neighbor.index + 1}</b><em>${neighbor.distance.toFixed(3)}</em><small>сложность ${neighbor.x.toFixed(2)} · время ${neighbor.y.toFixed(2)} мин</small></li>`).join('')}</ol>${knnMetricLens(visual)}</aside>`;
}

export function knnLab(settings) {
  const visual = knnChart(settings);
  const left = bubble('Количество соседей k', rangeControl({ scope: 'knn', key: 'k', label: '', value: settings.k, min: 1, max: 7, step: 2 }), { route: 'knn-theory', section: 'knn-vote' }) + `<div class="lab-side-note">Расстояние считается в исходном пространстве признаков. Масштабирование вернём отдельным экспериментом.</div><button class="theory-link" data-theory-route="knn-theory" data-theory-section="knn-intro"><span>Полное описание алгоритма</span><b>↗</b></button>`;
  const right = bubble('Метрика расстояния', selectControl({ scope: 'knn', key: 'metric', label: '', value: settings.metric, options: [{ value: 'euclidean', label: 'Евклидова' }, { value: 'manhattan', label: 'Манхэттенская' }] }), { route: 'knn-theory', section: 'knn-distance' });
  const selectedLabel = visual.selectedIndex === null ? 'контрольная точка' : `объект #${visual.selectedIndex + 1}`;
  return labLayout('KNN', 'соседи / признаки / расстояние', left, `<div class="visual-head"><span>${selectedLabel}</span><div class="visual-head-actions"><button class="dataset-trigger" data-action="show-dataset" data-dataset="knn">Показать датасет ↗</button><span class="metric" data-knn-result>${knnClassNames[visual.prediction]} / k=${settings.k}</span></div></div><div class="knn-stage" data-knn-chart>${visual.markup}${knnPopover(visual)}</div>`, right, 'knn-lab');
}

function logisticBoundary(model) {
  const candidates = [];
  const add = (x, y) => {
    if (Number.isFinite(x) && Number.isFinite(y) && x >= -2.21 && x <= 2.21 && y >= -2.06 && y <= 2.06 && !candidates.some(point => Math.hypot(point.x - x, point.y - y) < .01)) candidates.push({ x, y });
  };
  const [wx, wy] = model.w;
  if (Math.abs(wy) > 1e-7) { add(-2.2, (-model.b + wx * 2.2) / wy); add(2.2, (-model.b - wx * 2.2) / wy); }
  if (Math.abs(wx) > 1e-7) { add((-model.b + wy * 2.05) / wx, -2.05); add((-model.b - wy * 2.05) / wx, 2.05); }
  return candidates.length > 1 ? candidates.slice(0, 2) : null;
}

function logisticChart(model) {
  const toX = value => 68 + (value + 2.2) / 4.4 * 488;
  const toY = value => 350 - (value + 2.05) / 4.1 * 255;
  const boundary = logisticBoundary(model);
  const line = boundary ? `<path class="logistic-boundary" d="M${toX(boundary[0].x)} ${toY(boundary[0].y)}L${toX(boundary[1].x)} ${toY(boundary[1].y)}"/>` : '';
  const points = logisticRows.map((row, index) => `<circle class="logistic-point" cx="${toX(row.features[0])}" cy="${toY(row.features[1])}" r="5.5" fill="${row.target ? '#87dbaa' : '#ff7272'}"><title>Объект ${index + 1}: ${logisticClassNames[row.target]}</title></circle>`).join('');
  const probe = logisticRows.reduce((best, row) => Math.abs(logisticScore(row, model)) < Math.abs(logisticScore(best, model)) ? row : best, logisticRows[0]);
  const score = logisticScore(probe, model);
  const probability = sigmoid(score);
  const sigmoidPath = Array.from({ length: 41 }, (_, index) => {
    const z = -5 + index / 40 * 10;
    const x = 628 + index / 40 * 250;
    const y = 309 - sigmoid(z) * 170;
    return `${index ? 'L' : 'M'}${x.toFixed(1)} ${y.toFixed(1)}`;
  }).join('');
  const markerX = 628 + (Math.max(-5, Math.min(5, score)) + 5) / 10 * 250;
  const markerY = 309 - probability * 170;
  return `<svg class="logistic-chart" viewBox="0 0 930 410" role="img" aria-label="Логистическая регрессия: линейный score до сигмоиды и вероятность после неё"><path class="grid" d="M68 95H556M68 159H556M68 223H556M68 287H556M68 350H556M68 95V350M190 95V350M312 95V350M434 95V350M556 95V350"/><path class="axis" d="M68 350H574M68 367V77"/>${line}${points}<text x="79" y="64" fill="#99999f" font-size="12">${logisticFeatureNames[1]}</text><text x="373" y="390" fill="#99999f" font-size="12">${logisticFeatureNames[0]}</text><text x="83" y="387" fill="#99999f" font-size="10">граница z = 0 → p = 0.5</text><g class="logistic-sigmoid"><path class="grid" d="M628 309H878M628 139H878M628 309V139"/><path class="logistic-sigmoid-path" d="${sigmoidPath}"/><line class="logistic-score-guide" x1="${markerX}" y1="309" x2="${markerX}" y2="${markerY}"/><circle cx="${markerX}" cy="${markerY}" r="5"/><text x="628" y="126">σ(z)</text><text x="852" y="328">z</text><text x="631" y="327">0</text><text x="646" y="154">1</text></g><g class="logistic-flow"><text x="622" y="356">z = ${score.toFixed(2)}</text><text x="622" y="378">σ(z) = ${probability.toFixed(3)}</text></g></svg>`;
}

export function logisticLab(model) {
  const loss = binaryCrossEntropy(logisticRows, model);
  const accuracy = logisticAccuracy(logisticRows, model);
  const gradients = logisticGradients(logisticRows, model);
  const left = bubble('Learning rate', rangeControl({ scope: 'logistic', key: 'lr', label: '', value: model.lr, min: .01, max: .5, step: .01, format: value => Number(value).toFixed(2) }), { route: 'logistic-theory', section: 'logistic-gradient' }) + bubble('L2 регуляризация', rangeControl({ scope: 'logistic', key: 'reg', label: '', value: model.reg, min: 0, max: 1, step: .01, format: value => Number(value).toFixed(2) }), { route: 'logistic-theory', section: 'logistic-regularization' }) + `<button class="theory-link" data-theory-route="logistic-theory" data-theory-section="logistic-intro"><span>Полное описание алгоритма</span><b>↗</b></button>`;
  const right = bubble('Линейный score', `<div class="empty-note">z = <span class="score">${model.w[0].toFixed(2)}</span>·подготовка + <span class="score">${model.w[1].toFixed(2)}</span>·уверенность + <span class="score">${model.b.toFixed(2)}</span></div>`, { route: 'logistic-theory', section: 'logistic-score' }) + bubble('Log-loss', `<div class="empty-note">BCE: <span class="score">${loss.toFixed(3)}</span><br>точность train: <span class="score">${(accuracy * 100).toFixed(0)}%</span><br>∥∇J∥: <span class="score">${Math.hypot(...gradients.weights, gradients.bias).toFixed(3)}</span></div>`, { route: 'logistic-theory', section: 'logistic-loss' }) + `<div class="lab-side-note">Слева — линейный score z до преобразования. Справа он проходит через σ(z) и становится вероятностью класса «готов».</div>`;
  return labLayout('Логистическая регрессия', 'score / сигмоида / log-loss', left, `<div class="visual-head"><span>${logisticTargetName}</span><div class="visual-head-actions"><button class="dataset-trigger" data-action="show-dataset" data-dataset="logistic">Показать датасет ↗</button><span class="metric">BCE ${loss.toFixed(3)}</span></div></div><div class="logistic-stage">${logisticChart(model)}</div><div class="lab-controls"><button class="secondary" data-action="logistic-reset">Сбросить веса</button><button class="secondary" data-action="logistic-step">Один шаг</button><button class="primary" data-action="logistic-train">До сходимости →</button></div>`, right, 'logistic-lab');
}

function svmSegment(weights, bias, level) {
  const [wx, wy] = weights;
  const candidates = [];
  const add = (x, y) => {
    if (Number.isFinite(x) && Number.isFinite(y) && x >= -0.001 && x <= 10.001 && y >= -0.001 && y <= 10.001 && !candidates.some(point => Math.hypot(point.x - x, point.y - y) < .01)) candidates.push({ x, y });
  };
  if (Math.abs(wy) > 1e-6) { add(0, (level - bias) / wy); add(10, (level - bias - wx * 10) / wy); }
  if (Math.abs(wx) > 1e-6) { add((level - bias) / wx, 0); add((level - bias - wy * 10) / wx, 10); }
  return candidates.length >= 2 ? [candidates[0], candidates[1]] : null;
}

function svmChart(model) {
  const toX = value => 80 + value / 10 * 590;
  const toY = value => 390 - value / 10 * 315;
  const segment = level => {
    const endpoints = svmSegment(model.w, model.b, level);
    return endpoints ? `M${toX(endpoints[0].x)} ${toY(endpoints[0].y)}L${toX(endpoints[1].x)} ${toY(endpoints[1].y)}` : '';
  };
  const wNorm = Math.hypot(...model.w);
  const score = point => svmScore(point, model.w, model.b);
  const marks = svmPoints.map((point, index) => {
    const margin = svmMargin(point, model.w, model.b);
    const support = margin <= 1.08;
    const violation = margin < 1;
    return `<circle class="svm-point ${support ? 'support' : ''} ${violation ? 'violation' : ''}" cx="${toX(point.x)}" cy="${toY(point.y)}" r="${support ? 8.5 : 6}" fill="${point.c > 0 ? '#87dbaa' : '#ff7272'}" aria-label="объект ${index + 1}, ${svmClassNames[point.c]}"><title>Объект ${index + 1}: y=${point.c}, y·f(x)=${margin.toFixed(2)}</title></circle>`;
  }).join('');
  const border = segment(0);
  const upper = segment(1);
  const lower = segment(-1);
  const boundary = border ? `<path class="svm-boundary" d="${border}"/><path class="svm-margin" d="${upper}"/><path class="svm-margin" d="${lower}"/>` : '';
  const status = wNorm < .001 ? 'веса нулевые — граница ещё не определена' : `ширина зазора: ${(2 / wNorm).toFixed(2)}`;
  return `<svg class="chart-svg svm-chart" viewBox="0 0 750 450" role="img" aria-label="Линейный SVM: классы, разделяющая граница и зазор"><path class="grid" d="M80 75H670M80 138H670M80 201H670M80 264H670M80 327H670M80 390H670M80 75V390M198 75V390M316 75V390M434 75V390M552 75V390M670 75V390"/><path class="axis" d="M80 390H690M80 410V55"/>${boundary}${marks}<text x="94" y="50" fill="#99999f" font-size="13">${svmFeatureNames[1]}</text><text x="486" y="428" fill="#99999f" font-size="13">${svmFeatureNames[0]}</text><text x="96" y="427" fill="#99999f" font-size="11">${status}</text></svg>`;
}

export function svmLab(model) {
  const gradients = svmGradients(svmPoints, model);
  const objective = svmObjective(svmPoints, model);
  const accuracy = svmAccuracy(svmPoints, model);
  const supportCount = svmPoints.filter(point => svmMargin(point, model.w, model.b) <= 1.08).length;
  const left = bubble('Штраф за нарушения C', rangeControl({ scope: 'svm', key: 'c', label: '', value: model.c, min: .1, max: 4, step: .1, format: value => Number(value).toFixed(1) }), { route: 'svm-theory', section: 'svm-soft-margin' }) + bubble('Learning rate', rangeControl({ scope: 'svm', key: 'lr', label: '', value: model.lr, min: .005, max: .1, step: .005, format: value => Number(value).toFixed(3) }), { route: 'svm-theory', section: 'svm-optimization' }) + `<button class="theory-link" data-theory-route="svm-theory" data-theory-section="svm-intro"><span>Полное описание алгоритма</span><b>↗</b></button>`;
  const right = bubble('Опорные векторы', `<div class="empty-note"><span class="score">${supportCount}</span> точек задают или нарушают зазор.<br><small>объекты с y·f(x) ≤ 1</small></div>`, { route: 'svm-theory', section: 'svm-support' }) + bubble('Текущий шаг', `<div class="empty-note">J(w) <span class="score">${objective.toFixed(3)}</span><br>точность train: <span class="score">${(accuracy * 100).toFixed(0)}%</span><br>шагов: <span class="score">${model.steps}</span></div>`, { route: 'svm-theory', section: 'svm-hinge' }) + `<div class="lab-side-note">Толстая линия — граница f(x)=0. Пунктир — уровни f(x)=±1; обведённые точки удерживают или нарушают зазор.</div>`;
  return labLayout('SVM', 'гиперплоскость / зазор / hinge loss', left, `<div class="visual-head"><span>${svmTargetName}</span><div class="visual-head-actions"><button class="dataset-trigger" data-action="show-dataset" data-dataset="svm">Показать датасет ↗</button><span class="metric">soft-margin SVM</span></div></div><div class="svm-stage">${svmChart(model)}</div><div class="svm-parameters"><span>w<sub>1</sub> = ${model.w[0].toFixed(3)}</span><span>w<sub>2</sub> = ${model.w[1].toFixed(3)}</span><span>b = ${model.b.toFixed(3)}</span><span>∥∇J∥ = ${Math.hypot(...gradients.weights, gradients.bias).toFixed(3)}</span></div><div class="lab-controls"><button class="secondary" data-action="svm-reset">Сбросить веса</button><button class="secondary" data-action="svm-step">Один шаг</button><button class="primary" data-action="svm-train">До сходимости →</button></div>`, right, 'svm-lab');
}

function graphTreeNodes(tree) {
  const nodes = [];
  let leaf = 0;

  function walk(node, id = 'root', depth = 0, parent = null) {
    const entry = { id, node, depth, parent, position: 0 };
    nodes.push(entry);
    if (!node.split) {
      entry.position = leaf;
      leaf += 1;
      return entry;
    }
    const left = walk(node.left, `${id}-l`, depth + 1, id);
    const right = walk(node.right, `${id}-r`, depth + 1, id);
    entry.position = (left.position + right.position) / 2;
    return entry;
  }

  walk(tree);
  const maxPosition = Math.max(leaf - 1, 1);
  return nodes
    .map(entry => ({
      ...entry,
      x: leaf === 1 ? 50 : 9 + entry.position / maxPosition * 82,
      y: 13 + entry.depth * 25
    }))
    .sort((left, right) => left.depth - right.depth || left.id.localeCompare(right.id));
}

function treePopover(entry) {
  if (!entry) return '';
  const node = entry.node;
  if (!node.split) {
    return `<aside class="tree-node-popover"><button data-action="close-tree-node" aria-label="Закрыть карточку вершины">×</button><span>${entry.id === 'root' ? 'корневая вершина' : 'лист дерева'}</span><strong>решение: заявка ${node.class ? 'одобрена' : 'отклонена'}</strong><p>n = ${node.rows.length} · impurity ${node.impurity.toFixed(3)}</p></aside>`;
  }
  const feature = treeFeatureNames[node.split.feature];
  return `<aside class="tree-node-popover"><button data-action="close-tree-node" aria-label="Закрыть карточку вершины">×</button><span>${entry.id === 'root' ? 'корневая вершина' : 'внутренняя вершина'}</span><strong>предикат: ${feature} ≤ ${node.split.threshold.toFixed(1)}</strong><p>n = ${node.rows.length} · impurity ${node.impurity.toFixed(3)} · Δ ${node.split.drop.toFixed(3)}</p></aside>`;
}

function treeGraph(tree, visibleNodes, selectedNode) {
  const nodes = graphTreeNodes(tree);
  const visible = nodes.slice(0, visibleNodes === null ? nodes.length : visibleNodes);
  const visibleIds = new Set(visible.map(entry => entry.id));
  const byId = new Map(nodes.map(entry => [entry.id, entry]));
  const selected = visible.find(entry => entry.id === selectedNode) || null;
  const edges = visible
    .filter(entry => entry.parent && visibleIds.has(entry.parent))
    .map(entry => {
      const parent = byId.get(entry.parent);
      return `<line x1="${parent.x}" y1="${parent.y}" x2="${entry.x}" y2="${entry.y}"/>`;
    }).join('');
  const vertices = visible.map(entry => {
    const predicate = entry.node.split ? (entry.node.split.feature === 'x' ? 'Д' : 'Р') : (entry.node.class ? '✓' : '×');
    const nodeLabel = entry.node.split ? treeFeatureNames[entry.node.split.feature] : (entry.node.class ? 'заявка одобрена' : 'заявка отклонена');
    const state = entry.node.split ? 'split' : entry.node.class ? 'leaf-green' : 'leaf-red';
    return `<button class="tree-vertex ${state} ${selected?.id === entry.id ? 'active' : ''}" data-tree-node="${entry.id}" style="--x:${entry.x}%;--y:${entry.y}%" aria-label="${escapeHTML(entry.id)}: ${escapeHTML(nodeLabel)}">${predicate}</button>`;
  }).join('');
  return { markup: `<div class="tree-graph" aria-label="Интерактивное дерево решений"><svg class="tree-edges" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">${edges}</svg>${vertices}</div>`, selected };
}

export function treeNodePopover(settings, nodeId) {
  const tree = buildTree(treePoints, 0, settings, settings.manualRoot);
  const graph = treeGraph(tree, settings.visibleNodes, nodeId);
  return treePopover(graph.selected);
}

export function treeLab(settings) {
  const tree = buildTree(treePoints, 0, settings, settings.manualRoot);
  const automatic = buildTree(treePoints, 0, settings);
  const visualTree = treeGraph(tree, settings.visibleNodes, settings.selectedNode);
  const manualAccuracy = treeAccuracy(tree, treeValidation);
  const automaticAccuracy = treeAccuracy(automatic, treeValidation);
  const toX = value => 35 + value / 10 * 265;
  const toY = value => 290 - value / 10 * 255;
  const points = treePoints.map(point => `<circle cx="${toX(point.x)}" cy="${toY(point.y)}" r="5" fill="${point.c ? '#87dbaa' : '#ff7272'}"/>`).join('');
  const splitLine = tree.split ? `<path class="near" d="M${tree.split.feature === 'x' ? toX(tree.split.threshold) : 35} ${tree.split.feature === 'x' ? 35 : toY(tree.split.threshold)}${tree.split.feature === 'x' ? 'V290' : 'H300'}"/>` : '';
  const left = bubble('Критерий impurity', selectControl({ scope: 'tree', key: 'criterion', label: '', value: settings.criterion, options: [{ value: 'gini', label: 'Gini' }, { value: 'entropy', label: 'Entropy' }] }), { route: 'tree-theory', section: 'tree-impurity' }) + bubble('Максимальная глубина', rangeControl({ scope: 'tree', key: 'depth', label: '', value: settings.depth, min: 1, max: 3, step: 1 }), { route: 'tree-theory', section: 'tree-split' }) + bubble('Минимум в листе', rangeControl({ scope: 'tree', key: 'minLeaf', label: '', value: settings.minLeaf, min: 1, max: 3, step: 1 })) + `<button class="theory-link" data-theory-route="tree-theory" data-theory-section="tree-intro"><span>Полное описание алгоритма</span><b>↗</b></button>`;
  const right = bubble('Валидация', `<div class="empty-note">Текущее дерево: <span class="score">${(manualAccuracy * 100).toFixed(0)}%</span><br>Автоматическое: <span class="score">${(automaticAccuracy * 100).toFixed(0)}%</span></div>`) + `<div class="lab-side-note">Нажми на вершину дерева — её предикат и вычисления откроются отдельной карточкой.</div>`;
  return labLayout('Решающее дерево', 'split’ы / impurity / глубина', left, `<div class="visual-head"><span>${treeTargetName} · дерево глубины ${settings.depth}</span><div class="visual-head-actions"><button class="dataset-trigger" data-action="show-dataset" data-dataset="tree">Показать датасет ↗</button><span class="metric">${settings.criterion}</span></div></div><div class="tree-layout"><div class="tree-box tree-data"><svg viewBox="0 0 330 320" role="img" aria-label="Данные двух классов"><path class="grid" d="M35 35H300M35 99H300M35 163H300M35 227H300M35 290H300M35 35V290M101 35V290M167 35V290M233 35V290M300 35V290"/>${splitLine}${points}<text x="221" y="310" fill="#99999f" font-size="9">${treeFeatureNames.x}</text><text x="12" y="22" fill="#99999f" font-size="9">${treeFeatureNames.y}</text></svg></div><div class="tree-box tree-structure">${visualTree.markup}${treePopover(visualTree.selected)}</div></div><div class="lab-controls"><button class="secondary" data-action="tree-auto">Автопостроение</button><button class="secondary" data-action="tree-reset">Сбросить выбор</button></div>`, right);
}

function labLayout(title, status, left, visual, right, modifier = '') {
  return `${nav()}<main class="lab-shell ${modifier}"><div class="lab-top"><div class="lab-name"><button class="back" data-route="map">← карта</button><h2>${title}</h2></div><span class="lab-status">${status}</span></div><div class="lab-grid"><aside class="bubbles">${left}</aside><section class="visual">${visual}<div class="math-card" hidden></div></section><aside class="bubbles">${right}</aside></div></main>`;
}

export function unavailableView(module) {
  return `${nav()}<main class="unavailable-screen"><div><div class="kicker">в разработке</div><h2>${module.title}</h2><p>Этот модуль появится в следующем расширении учебника.</p><button class="secondary" data-route="map">Вернуться к карте</button></div></main>`;
}

function datasetDefinition(kind) {
  if (kind === 'linear' || kind === 'nonlinear' || kind === 'correlated') {
    const selected = linearDatasets[kind];
    return {
      title: selected.label,
      description: selected.description,
      columns: [...selected.featureNames, selected.targetName],
      rows: selected.rows.map(row => [...row.features.map(value => value.toFixed(4)), row.target.toFixed(4)])
    };
  }
  if (kind === 'knn') {
    return {
      title: 'KNN: задачи и время решения',
      description: 'Детерминированно сгенерированное пространство задач. Выбирай точки на плоскости, чтобы сравнивать их ближайших соседей.',
      columns: [...knnFeatureNames, knnTargetName],
      rows: knnPoints.map(point => [point.x.toFixed(1), point.y, knnClassNames[point.c]])
    };
  }
  if (kind === 'logistic') {
    return {
      title: 'Логистическая регрессия: готовность к модулю',
      description: 'Синтетические наблюдения с бинарным target. Значения признаков нормированы, чтобы градиентный спуск и геометрия границы оставались читаемыми.',
      columns: [...logisticFeatureNames, logisticTargetName],
      rows: logisticRows.map(row => [...row.features.map(value => value.toFixed(3)), logisticClassNames[row.target]])
    };
  }
  if (kind === 'svm') {
    return {
      title: 'SVM: устойчивость результата',
      description: 'Синтетические объекты в пространстве двух признаков. Пограничные наблюдения делают мягкий зазор SVM наблюдаемым, а не декоративным.',
      columns: [...svmFeatureNames, svmTargetName],
      rows: svmPoints.map(point => [point.x.toFixed(2), point.y.toFixed(2), svmClassNames[point.c]])
    };
  }
  return {
    title: 'Решающее дерево',
    description: 'Синтетические заявки на кредит. Дерево ищет предикаты по доходу и рейтингу, которые уменьшают impurity.',
    columns: [treeFeatureNames.x, treeFeatureNames.y, treeTargetName],
    rows: treePoints.map(point => [point.x.toFixed(1), point.y.toFixed(1), point.c ? 'одобрена' : 'отклонена'])
  };
}

function profileSource(kind) {
  if (kind === 'linear' || kind === 'nonlinear' || kind === 'correlated') {
    const selected = linearDatasets[kind];
    return {
      title: selected.label,
      description: selected.description,
      featureNames: selected.featureNames,
      rows: selected.rows.map(row => [...row.features]),
      targetName: selected.targetName,
      targetType: 'numeric',
      target: selected.rows.map(row => row.target),
      preview: datasetDefinition(kind)
    };
  }
  if (kind === 'knn') {
    return {
      title: 'KNN: задачи и время решения',
      description: 'Детерминированно сгенерированное пространство задач. Признаки намеренно имеют разные масштабы: это помогает увидеть, почему KNN чувствителен к масштабированию.',
      featureNames: knnFeatureNames,
      rows: knnPoints.map(point => [point.x, point.y]),
      targetName: knnTargetName,
      targetType: 'categorical',
      target: knnPoints.map(point => knnClassNames[point.c]),
      preview: datasetDefinition(kind)
    };
  }
  if (kind === 'logistic') {
    return {
      title: 'Логистическая регрессия: готовность к модулю',
      description: 'Два нормированных признака и бинарный target. По ним строится линейный score, который сигмоида переводит в вероятность.',
      featureNames: logisticFeatureNames,
      rows: logisticRows.map(row => [...row.features]),
      targetName: logisticTargetName,
      targetType: 'categorical',
      target: logisticRows.map(row => logisticClassNames[row.target]),
      preview: datasetDefinition(kind)
    };
  }
  if (kind === 'svm') {
    return {
      title: 'SVM: устойчивость результата',
      description: 'Синтетические объекты в пространстве двух признаков. Пограничные наблюдения сохраняются в профиле: именно они делают задачу мягкого зазора содержательной.',
      featureNames: svmFeatureNames,
      rows: svmPoints.map(point => [point.x, point.y]),
      targetName: svmTargetName,
      targetType: 'categorical',
      target: svmPoints.map(point => svmClassNames[point.c]),
      preview: datasetDefinition(kind)
    };
  }
  return {
    title: 'Решающее дерево: кредитные заявки',
    description: 'Синтетические заявки на кредит. Распределения признаков и баланс решений остаются видимыми до построения первого split’а.',
    featureNames: [treeFeatureNames.x, treeFeatureNames.y],
    rows: treePoints.map(point => [point.x, point.y]),
    targetName: treeTargetName,
    targetType: 'categorical',
    target: treePoints.map(point => point.c ? 'одобрена' : 'отклонена'),
    preview: datasetDefinition('tree')
  };
}

function median(sorted) {
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

function summary(values) {
  const sorted = [...values].sort((a, b) => a - b);
  return {
    min: sorted[0],
    median: median(sorted),
    mean: values.reduce((total, value) => total + value, 0) / values.length,
    max: sorted.at(-1)
  };
}

function formatProfileValue(value) {
  if (Math.abs(value) >= 100) return value.toFixed(1);
  if (Math.abs(value) >= 10) return value.toFixed(2);
  return value.toFixed(3);
}

function histogram(values, binCount = 9) {
  const { min, max } = summary(values);
  if (min === max) return [{ start: min, end: max, count: values.length }];
  const width = (max - min) / binCount;
  const bins = Array.from({ length: binCount }, (_, index) => ({ start: min + index * width, end: min + (index + 1) * width, count: 0 }));
  values.forEach(value => {
    const index = Math.min(binCount - 1, Math.floor((value - min) / width));
    bins[index].count += 1;
  });
  return bins;
}

function pearson(first, second) {
  const firstMean = first.reduce((total, value) => total + value, 0) / first.length;
  const secondMean = second.reduce((total, value) => total + value, 0) / second.length;
  const top = first.reduce((total, value, index) => total + (value - firstMean) * (second[index] - secondMean), 0);
  const bottom = Math.sqrt(first.reduce((total, value) => total + (value - firstMean) ** 2, 0) * second.reduce((total, value) => total + (value - secondMean) ** 2, 0));
  return bottom === 0 ? 0 : top / bottom;
}

function histogramMarkup(values, label) {
  const bins = histogram(values);
  const maximum = Math.max(...bins.map(bin => bin.count), 1);
  return `<div class="data-profile-hist" role="img" aria-label="Распределение: ${escapeHTML(label)}"><div class="data-profile-bars">${bins.map(bin => `<span class="data-profile-bar" style="--bar-height:${Math.max(7, bin.count / maximum * 100)}%" data-tooltip="${formatProfileValue(bin.start)}–${formatProfileValue(bin.end)}: ${bin.count}"><i></i></span>`).join('')}</div><div class="data-profile-scale"><span>${formatProfileValue(bins[0].start)}</span><span>${formatProfileValue(bins.at(-1).end)}</span></div></div>`;
}

function correlationMarkup(names, columns) {
  const values = columns.map(column => columns.map(other => pearson(column, other)));
  const short = name => name.length > 15 ? `${name.slice(0, 14)}…` : name;
  return `<div class="data-correlation-wrap"><table class="data-correlation"><thead><tr><th></th>${names.map(name => `<th title="${escapeHTML(name)}">${escapeHTML(short(name))}</th>`).join('')}</tr></thead><tbody>${values.map((row, index) => `<tr><th title="${escapeHTML(names[index])}">${escapeHTML(short(names[index]))}</th>${row.map(value => `<td style="--correlation-alpha:${.08 + Math.abs(value) * .5}">${value.toFixed(2)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
}

function categoricalTargetMarkup(values) {
  const counts = [...new Set(values)].map(label => ({ label, count: values.filter(value => value === label).length }));
  const largest = Math.max(...counts.map(item => item.count));
  const smallest = Math.min(...counts.map(item => item.count));
  const imbalance = smallest / largest;
  return `<div class="data-target-summary"><p>Редкий класс составляет <b>${(imbalance * 100).toFixed(0)}%</b> от крупнейшего: ${imbalance < .5 ? 'дисбаланс заметный' : 'баланс близок к равному'}.</p><div class="data-category-bars">${counts.map(item => `<div><span>${escapeHTML(item.label)}</span><i><b style="--category-width:${item.count / values.length * 100}%"></b></i><em>${item.count} · ${(item.count / values.length * 100).toFixed(0)}%</em></div>`).join('')}</div></div>`;
}

export function datasetProfileView(kind, returnRoute = 'map') {
  const dataset = profileSource(kind);
  const columns = dataset.featureNames.map((_, index) => dataset.rows.map(row => row[index]));
  const numericNames = dataset.targetType === 'numeric' ? [...dataset.featureNames, dataset.targetName] : dataset.featureNames;
  const numericColumns = dataset.targetType === 'numeric' ? [...columns, dataset.target] : columns;
  const sample = dataset.preview;
  return `${nav()}<main class="dataset-profile-screen"><div class="dataset-profile-shell"><header class="dataset-profile-header"><div><button class="back" data-route="${escapeHTML(returnRoute)}">← к алгоритму</button><div class="kicker">профиль датасета</div><h1>Посмотри на<br><span>данные.</span></h1><p>${escapeHTML(dataset.description)}</p></div><dl class="dataset-profile-summary"><div><dt>наблюдений</dt><dd>${dataset.rows.length}</dd></div><div><dt>числовых признаков</dt><dd>${dataset.featureNames.length}</dd></div><div><dt>таргет</dt><dd>${dataset.targetType === 'numeric' ? 'числовой' : 'классы'}</dd></div></dl></header><section class="dataset-profile-section"><div class="dataset-profile-section-head"><span>01 / распределения</span><h2>Признаки</h2></div><div class="data-profile-hist-grid">${dataset.featureNames.map((name, index) => `<article><header><span>${escapeHTML(name)}</span><b>${formatProfileValue(summary(columns[index]).mean)} среднее</b></header>${histogramMarkup(columns[index], name)}</article>`).join('')}</div></section><section class="dataset-profile-section"><div class="dataset-profile-section-head"><span>02 / числовая сводка</span><h2>Границы и центр распределений</h2></div><div class="data-profile-table-wrap"><table class="data-profile-table"><thead><tr><th>Признак</th><th>Минимум</th><th>Медиана</th><th>Среднее</th><th>Максимум</th></tr></thead><tbody>${dataset.featureNames.map((name, index) => { const stats = summary(columns[index]); return `<tr><th>${escapeHTML(name)}</th><td>${formatProfileValue(stats.min)}</td><td>${formatProfileValue(stats.median)}</td><td>${formatProfileValue(stats.mean)}</td><td>${formatProfileValue(stats.max)}</td></tr>`; }).join('')}</tbody></table></div></section><section class="dataset-profile-section data-profile-correlation-section"><div class="dataset-profile-section-head"><span>03 / взаимосвязи</span><h2>Корреляция признаков${dataset.targetType === 'numeric' ? ' и таргета' : ''}</h2><p>Коэффициент Пирсона: +1 — признаки меняются вместе, −1 — в противоположных направлениях.</p></div>${correlationMarkup(numericNames, numericColumns)}</section><section class="dataset-profile-section"><div class="dataset-profile-section-head"><span>04 / таргет</span><h2>${escapeHTML(dataset.targetName)}</h2></div>${dataset.targetType === 'numeric' ? `<article class="data-target-numeric">${histogramMarkup(dataset.target, dataset.targetName)}<div>${Object.entries(summary(dataset.target)).map(([name, value]) => `<span><small>${({ min: 'минимум', median: 'медиана', mean: 'среднее', max: 'максимум' })[name]}</small><b>${formatProfileValue(value)}</b></span>`).join('')}</div></article>` : categoricalTargetMarkup(dataset.target)}</section><details class="dataset-profile-sample"><summary>Первые 10 строк <span>↘</span></summary><div class="data-profile-table-wrap"><table class="data-profile-table"><thead><tr><th>#</th>${sample.columns.map(column => `<th>${escapeHTML(column)}</th>`).join('')}</tr></thead><tbody>${sample.rows.slice(0, 10).map((row, index) => `<tr><td>${String(index + 1).padStart(2, '0')}</td>${row.map(value => `<td>${escapeHTML(value)}</td>`).join('')}</tr>`).join('')}</tbody></table></div></details></div></main>`;
}

export function aboutView() {
  return `${nav()}<main class="info-screen"><section><div class="kicker">о проекте</div><h2>Цифровой мир<br><span>изучения ML.</span></h2><p>Здесь появится актуальная информация о проекте, его авторах, партнёрах и материалах Fit & Predict.</p><div class="about-photo" aria-label="Место для будущей фотографии проекта">информация и фото скоро</div></section></main>`;
}

export function profileView(profile) {
  const initials = profile.fullName.split(' ').filter(Boolean).map(part => part[0]).join('').slice(0, 2).toUpperCase() || 'ML';
  const avatar = profile.avatar ? `<img src="${profile.avatar}" alt="Фото профиля">` : `<span>${initials}</span>`;
  return `${nav()}<main class="profile-screen"><section class="profile-card"><div class="avatar">${avatar}</div><label class="avatar-control">Добавить фото<input type="file" accept="image/*" data-avatar></label><form data-form="profile"><label>Имя и фамилия<input name="fullName" value="${escapeHTML(profile.fullName)}" autocomplete="name"></label><label>Почта<input name="email" type="email" value="${escapeHTML(profile.email)}" autocomplete="email"></label><button class="primary" type="submit">Сохранить изменения</button></form></section></main>`;
}

export function showMath(container, type) {
  const card = container.querySelector('.math-card');
  if (!card) return;
  card.hidden = false;
  card.innerHTML = `<button aria-label="Закрыть">×</button><b>Почему так:</b> ${mathCopy[type] || ''}`;
  card.querySelector('button').addEventListener('click', () => { card.hidden = true; });
}

export function getLinearChartData(model) {
  return { points: linearDatasets[model.dataset].points, dataset: linearDatasets[model.dataset] };
}

export { knnChart };
