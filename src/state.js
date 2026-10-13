const storageKey = 'fitpredict-ml-textbook-v6';
const knownRoutes = new Set(['intro', 'demo', 'signup', 'map', 'linear', 'linear-theory', 'logistic', 'logistic-theory', 'knn', 'knn-theory', 'tree', 'tree-theory', 'svm', 'svm-theory', 'unavailable', 'about', 'profile', 'dataset-profile']);

const defaults = {
  route: 'intro',
  selectedModule: null,
  theoryIndexCollapsed: false,
  datasetProfile: null,
  profile: { fullName: '', email: '', avatar: '' },
  linear: { dataset: 'linear', w: [0, 0, 0], b: 0, lr: .08, reg: .02, steps: 0, converged: false, stopReason: null },
  logistic: { w: [.3, -.2], b: 0, lr: .18, reg: .02, steps: 0, converged: false },
  knn: { k: 3, metric: 'euclidean', selectedPoint: null },
  tree: { criterion: 'gini', depth: 3, minLeaf: 2, manualRoot: null, visibleNodes: null, selectedNode: null },
  svm: { w: [0, 0], b: 0, lr: .03, c: 1, steps: 0 }
};

export function createStore() {
  let persisted = {};
  try {
    persisted = JSON.parse(localStorage.getItem(storageKey) || '{}');
  } catch {
    // Старое или вручную повреждённое localStorage не должно оставлять сайт
    // на пустом экране: начинаем безопасно с первого экрана.
    localStorage.removeItem(storageKey);
  }
  let value = { ...defaults, ...persisted };
  if (!knownRoutes.has(value.route)) value.route = defaults.route;
  value.profile = { ...defaults.profile, ...value.profile };
  value.linear = { ...defaults.linear, ...value.linear };
  if (!Array.isArray(value.linear.w) || value.linear.w.length !== 3) value.linear.w = [0, 0, 0];
  value.logistic = { ...defaults.logistic, ...value.logistic };
  if (!Array.isArray(value.logistic.w) || value.logistic.w.length !== 2) value.logistic.w = [.3, -.2];
  value.knn = { ...defaults.knn, ...value.knn };
  value.tree = { ...defaults.tree, ...value.tree };
  value.svm = { ...defaults.svm, ...value.svm };
  if (!Array.isArray(value.svm.w) || value.svm.w.length !== 2) value.svm.w = [0, 0];
  const listeners = new Set();

  const notify = () => listeners.forEach(listener => listener(value));
  const save = () => localStorage.setItem(storageKey, JSON.stringify(value));

  return {
    get: () => value,
    set: patch => { value = { ...value, ...patch }; save(); notify(); },
    patch: (scope, patch) => { value = { ...value, [scope]: { ...value[scope], ...patch } }; save(); notify(); },
    subscribe: listener => { listeners.add(listener); return () => listeners.delete(listener); },
    reset: () => { value = structuredClone(defaults); save(); notify(); }
  };
}
