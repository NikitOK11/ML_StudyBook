import { buildTree, countTreeNodes, gradientStep, linearConvergence, linearGradients, logisticStep, trainLogistic, meanSquaredError, trainLinear, svmStep, trainSvm } from './src/algorithms.js?v=20260915-ml5';
import { linearDatasets, logisticRows, moduleCatalog, treePoints, svmPoints } from './src/data.js?v=20260915-ml5';
import { createStore } from './src/state.js?v=20260915-ml5';
import {
  aboutView,
  datasetProfileView,
  demoView,
  getLinearChartData,
  introView,
  knnChart,
  knnLab,
  knnTheoryView,
  linearLab,
  linearLinePath,
  linearTheoryView,
  logisticLab,
  logisticTheoryView,
  mapView,
  profileView,
  signupView,
  svmLab,
  svmTheoryView,
  treeLab,
  treeNodePopover,
  treeTheoryView,
  unavailableView
} from './src/views.js?v=20260915-ml5';

const app = document.getElementById('app');
const store = createStore();
let demoTimer = null;
let treeTimer = null;

function render() {
  const state = store.get();
  const module = moduleCatalog.find(item => item.id === state.selectedModule);

  const views = {
    intro: () => introView(),
    demo: () => demoView(state.linear),
    signup: () => signupView(state.profile),
    map: () => mapView(state.selectedModule),
    linear: () => linearLab(state.linear),
    'linear-theory': () => linearTheoryView(state.theoryIndexCollapsed),
    logistic: () => logisticLab(state.logistic),
    'logistic-theory': () => logisticTheoryView(state.theoryIndexCollapsed),
    knn: () => knnLab(state.knn),
    'knn-theory': () => knnTheoryView(state.theoryIndexCollapsed),
    tree: () => treeLab(state.tree),
    'tree-theory': () => treeTheoryView(state.theoryIndexCollapsed),
    svm: () => svmLab(state.svm),
    'svm-theory': () => svmTheoryView(state.theoryIndexCollapsed),
    unavailable: () => module ? unavailableView(module) : mapView(null),
    about: () => aboutView(),
    profile: () => profileView(state.profile),
    'dataset-profile': () => {
      const profile = state.datasetProfile || { kind: 'linear', returnRoute: 'linear' };
      return datasetProfileView(profile.kind, profile.returnRoute);
    }
  };

  const selectedView = views[state.route] || views.intro;
  try {
    app.innerHTML = selectedView();
  } catch (error) {
    console.error('Не удалось отрисовать сохранённый экран, возвращаем стартовую страницу.', error);
    store.set({ route: 'intro', selectedModule: null, datasetProfile: null });
    app.innerHTML = introView();
  }

  setRangeProgress();
}

function go(route, section = null, animation = 'page-enter') {
  stopDemoAnimation();
  stopTreeAnimation();
  store.set({ route });
  render();
  app.classList.remove('page-enter', 'onboarding-swipe');
  void app.offsetWidth;
  app.classList.add(animation);
  if (section) {
    window.requestAnimationFrame(() => {
      document.getElementById(section)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  } else {
    // Новый экран не должен наследовать позицию длинной теоретической статьи:
    // иначе пользователь возвращается в середину пустого фона, а верхние
    // контролы двигаются во время восстановления scroll position.
    window.scrollTo({ top: 0, left: 0, behavior: 'auto' });
  }
}

function stopDemoAnimation() {
  if (demoTimer) window.clearInterval(demoTimer);
  demoTimer = null;
}

function stopTreeAnimation() {
  if (treeTimer) window.clearInterval(treeTimer);
  treeTimer = null;
}

function setRangeProgress(input) {
  const controls = input ? [input] : app.querySelectorAll('.range-control');
  controls.forEach(control => {
    const minimum = Number(control.min);
    const maximum = Number(control.max);
    const value = Number(control.value);
    const percent = ((value - minimum) / (maximum - minimum)) * 100;
    control.style.setProperty('--range-progress', `${percent}%`);
  });
}

function formatControlValue(scope, key, value) {
  if (scope === 'linear' && (key === 'lr' || key === 'reg')) return Number(value).toFixed(2);
  if (scope === 'logistic' && (key === 'lr' || key === 'reg')) return Number(value).toFixed(2);
  if (scope === 'linear') return Number(value).toFixed(1);
  return String(value);
}

function refreshLinearVisual() {
  const model = store.get().linear;
  const dataset = linearDatasets[model.dataset];
  const weights = Array.isArray(model.w) ? model.w : [model.w];
  const gradients = linearGradients(model, dataset.rows);
  const format = value => Math.abs(value) >= 1000 ? value.toExponential(2) : value.toFixed(3);
  const trainLoss = meanSquaredError(dataset.rows, model.w, model.b);
  const validationLoss = meanSquaredError(dataset.validation, model.w, model.b);
  const convergence = linearConvergence(model, dataset.rows);
  const isConverged = model.converged || convergence.converged;
  const loss = app.querySelector('[data-linear-loss]');
  const datasetName = app.querySelector('[data-linear-dataset-label]');
  const equation = app.querySelector('[data-linear-equation]');
  const stepCount = app.querySelector('[data-linear-steps]');
  const convergenceStatus = app.querySelector('[data-linear-convergence]');
  if (loss) loss.textContent = `train MSE ${format(trainLoss)}`;
  if (datasetName) datasetName.textContent = `датасет / ${dataset.label}`;
  weights.forEach((weight, index) => {
    const weightValue = app.querySelector(`[data-linear-weight="${index}"]`);
    const gradientValue = app.querySelector(`[data-linear-gradient="${index}"]`);
    if (weightValue) weightValue.textContent = format(weight);
    if (gradientValue) gradientValue.textContent = format(gradients.weights[index]);
  });
  const bias = app.querySelector('[data-linear-bias]');
  const biasGradient = app.querySelector('[data-linear-bias-gradient]');
  const trainMetric = app.querySelector('[data-linear-train-loss]');
  const validationMetric = app.querySelector('[data-linear-validation-loss]');
  if (bias) bias.textContent = format(model.b);
  if (biasGradient) biasGradient.textContent = format(gradients.bias);
  if (trainMetric) trainMetric.textContent = format(trainLoss);
  if (validationMetric) validationMetric.textContent = format(validationLoss);
  if (stepCount) stepCount.textContent = model.steps;
  if (convergenceStatus) {
    const copy = model.stopReason === 'limit'
      ? `предел 5 000 шагов · ∥∇J∥ ${convergence.gradientNorm.toExponential(2)}`
      : model.stopReason === 'diverged'
        ? 'расходится · уменьши learning rate'
        : isConverged
          ? `сошлось · ∥∇J∥ ${convergence.gradientNorm.toExponential(2)}`
          : `поиск минимума · ∥∇J∥ ${convergence.gradientNorm.toExponential(2)}`;
    convergenceStatus.textContent = copy;
    convergenceStatus.dataset.linearConverged = String(isConverged);
    convergenceStatus.dataset.linearStopReason = model.stopReason || '';
  }
  if (equation) equation.textContent = `${dataset.targetName} = ${weights.map((weight, index) => `${format(weight)}·${dataset.equationNames[index]}`).join(' + ')} + ${format(model.b)}`;
}

function refreshDemoVisual() {
  const model = store.get().linear;
  const { points } = getLinearChartData({ ...model, dataset: 'linear' });
  const line = app.querySelector('[data-linear-line="demo"]');
  const loss = app.querySelector('[data-demo-loss]');
  if (line) line.setAttribute('d', linearLinePath(points, model.w, model.b));
  if (loss) loss.textContent = `MSE ${meanSquaredError(points, model.w, model.b).toFixed(3)}`;
}

function refreshKnnVisual() {
  render();
}

function selectLinearDataset(datasetId) {
  const dataset = linearDatasets[datasetId];
  if (!dataset) return;
  const initialWeights = dataset.featureNames.length === 1 ? 0 : Array(dataset.featureNames.length).fill(0);
  store.patch('linear', { dataset: datasetId, w: initialWeights, b: 0, steps: 0, converged: false, stopReason: null });
  render();
}

function setControlValue(input, shouldRender) {
  const [scope, key] = input.dataset.control.split('.');
  let value = input.value;
  if (input.tagName === 'SELECT') {
  } else {
    value = Number(value);
  }

  if (scope === 'linear' && key === 'dataset') {
    return selectLinearDataset(value);
  }

  if (scope === 'tree') {
    stopTreeAnimation();
    store.patch(scope, { [key]: value, manualRoot: null, visibleNodes: null, selectedNode: null });
  } else {
    store.patch(scope, scope === 'linear'
      ? { [key]: value, converged: false, stopReason: null }
      : { [key]: value });
  }
  if (input.type === 'range') {
    setRangeProgress(input);
    const output = app.querySelector(`[data-output="${input.dataset.control}"]`);
    if (output) output.textContent = formatControlValue(scope, key, value);
    if (scope === 'linear') refreshLinearVisual();
    if (scope === 'knn') return refreshKnnVisual();
  }
  if (shouldRender) render();
}

function animateDemo() {
  stopDemoAnimation();
  store.patch('linear', { dataset: 'linear', w: [-1.6, 0, 0], b: 4.1, lr: .08, reg: 0, steps: 0 });
  refreshDemoVisual();
  let ticks = 0;
  demoTimer = window.setInterval(() => {
    const current = store.get().linear;
    const next = gradientStep(current, getLinearChartData(current).points);
    store.patch('linear', next);
    refreshDemoVisual();
    ticks += 1;
    if (ticks >= 48) {
      stopDemoAnimation();
      window.setTimeout(() => {
        // Демо заканчивается обученной прямой, а самостоятельный алгоритм начинается с чистого эксперимента.
        store.patch('linear', { dataset: 'linear', w: [0, 0, 0], b: 0, lr: .08, reg: .02, steps: 0 });
        go('signup', null, 'onboarding-swipe');
      }, 350);
    }
  }, 28);
}

function openSelectedModule() {
  const selected = moduleCatalog.find(item => item.id === store.get().selectedModule);
  if (!selected) return;
  go(selected.available ? selected.id : 'unavailable');
}

function animateTreeBuild() {
  stopTreeAnimation();
  const settings = store.get().tree;
  const automaticTree = buildTree(treePoints, 0, { ...settings, manualRoot: null });
  const total = countTreeNodes(automaticTree);
  let visible = 1;
  store.patch('tree', { manualRoot: null, visibleNodes: visible, selectedNode: null });
  render();
  treeTimer = window.setInterval(() => {
    visible += 1;
    store.patch('tree', { visibleNodes: visible });
    render();
    if (visible >= total) stopTreeAnimation();
  }, 260);
}

function openDataset(kind) {
  const returnRoute = store.get().route;
  stopTreeAnimation();
  store.set({ route: 'dataset-profile', datasetProfile: { kind, returnRoute } });
  render();
  app.classList.remove('page-enter', 'onboarding-swipe');
  void app.offsetWidth;
  app.classList.add('page-enter');
}

function selectTreeNode(nodeId) {
  const tree = store.get().tree;
  store.patch('tree', { selectedNode: nodeId });
  app.querySelectorAll('[data-tree-node]').forEach(node => {
    node.classList.toggle('active', node.dataset.treeNode === nodeId);
  });
  const structure = app.querySelector('.tree-structure');
  if (!structure) return;
  structure.querySelector('.tree-node-popover')?.remove();
  const popover = treeNodePopover({ ...tree, selectedNode: nodeId }, nodeId);
  if (popover) structure.insertAdjacentHTML('beforeend', popover);
}

function closeTreeNode() {
  store.patch('tree', { selectedNode: null });
  app.querySelectorAll('[data-tree-node]').forEach(node => node.classList.remove('active'));
  app.querySelector('.tree-node-popover')?.remove();
}

function handleAction(action, source) {
  const state = store.get();
  if (action === 'toggle-theory-index') {
    store.set({ theoryIndexCollapsed: !state.theoryIndexCollapsed });
    return render();
  }
  if (action === 'start-learning') return go('demo');
  if (action === 'demo-train') return animateDemo();
  if (action === 'skip-signup') return go('map');
  if (action === 'open-module') return openSelectedModule();
  if (action === 'linear-reset') {
    const dataset = linearDatasets[state.linear.dataset];
    store.patch('linear', { w: dataset.featureNames.length === 1 ? 0 : Array(dataset.featureNames.length).fill(0), b: 0, steps: 0, converged: false, stopReason: null });
    return refreshLinearVisual();
  }
  if (action === 'linear-step') {
    const model = store.get().linear;
    const rows = linearDatasets[model.dataset].rows;
    const current = linearConvergence(model, rows);
    if (model.converged || current.converged) {
      store.patch('linear', { converged: true, stopReason: 'gradient' });
      return refreshLinearVisual();
    }
    const next = gradientStep(model, rows);
    const nextState = linearConvergence(next, rows);
    const nextLoss = meanSquaredError(rows, next.w, next.b);
    store.patch('linear', {
      ...next,
      converged: nextState.converged,
      stopReason: !Number.isFinite(nextLoss) ? 'diverged' : nextState.converged ? 'gradient' : null
    });
    return refreshLinearVisual();
  }
  if (action === 'linear-train') {
    const model = store.get().linear;
    const dataset = linearDatasets[model.dataset];
    store.patch('linear', trainLinear(model, dataset.rows));
    return refreshLinearVisual();
  }
  if (action === 'logistic-reset') {
    store.patch('logistic', { w: [.3, -.2], b: 0, steps: 0, converged: false });
    return render();
  }
  if (action === 'logistic-step') {
    store.patch('logistic', logisticStep(logisticRows, state.logistic));
    return render();
  }
  if (action === 'logistic-train') {
    store.patch('logistic', trainLogistic(logisticRows, state.logistic));
    return render();
  }
  if (action === 'close-knn-details') {
    store.patch('knn', { selectedPoint: null });
    return render();
  }
  if (action === 'tree-auto') {
    return animateTreeBuild();
  }
  if (action === 'tree-reset') {
    stopTreeAnimation();
    store.patch('tree', { manualRoot: null, visibleNodes: null, selectedNode: null });
    return render();
  }
  if (action === 'svm-reset') {
    store.patch('svm', { w: [0, 0], b: 0, steps: 0 });
    return render();
  }
  if (action === 'svm-step') {
    store.patch('svm', svmStep(svmPoints, state.svm));
    return render();
  }
  if (action === 'svm-train') {
    store.patch('svm', trainSvm(svmPoints, state.svm));
    return render();
  }
  if (action === 'close-tree-node') {
    return closeTreeNode();
  }
  if (action === 'show-dataset') return openDataset(source.dataset.dataset);
}

app.addEventListener('click', event => {
  const theoryButton = event.target.closest('[data-theory-route]');
  if (theoryButton) return go(theoryButton.dataset.theoryRoute, theoryButton.dataset.theorySection);

  const routeButton = event.target.closest('[data-route]');
  if (routeButton) return go(routeButton.dataset.route);

  const moduleButton = event.target.closest('[data-select-module]');
  if (moduleButton) {
    store.set({ selectedModule: moduleButton.dataset.selectModule });
    return render();
  }

  const linearDatasetButton = event.target.closest('[data-linear-dataset]');
  if (linearDatasetButton) return selectLinearDataset(linearDatasetButton.dataset.linearDataset);

  const knnPoint = event.target.closest('[data-knn-point]');
  if (knnPoint) {
    store.patch('knn', { selectedPoint: Number(knnPoint.dataset.knnPoint) });
    return render();
  }

  const knnTarget = event.target.closest('[data-knn-target]');
  if (knnTarget) {
    store.patch('knn', { selectedPoint: null });
    return render();
  }

  const treeNode = event.target.closest('[data-tree-node]');
  if (treeNode) {
    return selectTreeNode(treeNode.dataset.treeNode);
  }

  const actionButton = event.target.closest('[data-action]');
  if (actionButton) handleAction(actionButton.dataset.action, actionButton);

});

app.addEventListener('input', event => {
  const input = event.target;
  if (input.matches('.range-control')) setControlValue(input, false);
});

app.addEventListener('change', event => {
  const control = event.target;
  if (control.matches('select[data-control]')) setControlValue(control, true);
  if (control.matches('.range-control') && (control.dataset.control.startsWith('tree.') || control.dataset.control.startsWith('logistic.'))) render();
});

app.addEventListener('submit', event => {
  const form = event.target.closest('form[data-form]');
  if (!form) return;
  event.preventDefault();
  const details = new FormData(form);
  store.patch('profile', { fullName: details.get('fullName').trim(), email: details.get('email').trim() });
  go(form.dataset.form === 'signup' ? 'map' : 'profile');
});

app.addEventListener('change', event => {
  if (!event.target.matches('[data-avatar]')) return;
  const [file] = event.target.files;
  if (!file) return;
  const reader = new FileReader();
  reader.addEventListener('load', () => {
    store.patch('profile', { avatar: reader.result });
    render();
  });
  reader.readAsDataURL(file);
});

render();
