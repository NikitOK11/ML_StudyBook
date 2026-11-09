import { defaultConfig, validateConfig, initializationNames } from './config.js';
import { makeDataset, datasetProfile } from './data.js';
import { Experiment } from './core.js';
import { labView, format, escape } from './view.js';
import { buildDiagram, updateDiagram, inspectorHTML, initializationHTML, layerSummary } from './diagram.js';
import { createPlots } from './plots.js';

let current = null;
let comparisons = [];
const comparisonKey = config => JSON.stringify({ ...config, initialization: null, normalMean: null, normalStd: null, uniformMin: null, uniformMax: null, bias: null });
export function getExperiment(config) {
  const validated = validateConfig(config);
  if (!current || JSON.stringify(current.config) !== JSON.stringify(validated)) current = new Experiment(validated, makeDataset(validated.dataset, validated.dataSeed));
  return current;
}
export const getProfile = config => datasetProfile(getExperiment(config).dataset);

export function mountLab(root, config, persist, go) {
  let e = getExperiment(config), running = false, disposed = false, frame = 0, animation = null;
  let row = 0, selection = { kind: 'neuron', layer: 1, neuron: 0 }, diagram, plots;
  let lastPaint = 0, paintCost = 0, trainingMs = 0, trainingSteps = 0, mode = 'selected';
  const abort = new AbortController();
  const reducedMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  function phase(title, copy) {
    root.querySelector('[data-mlp-phase-title]').textContent = title;
    root.querySelector('[data-mlp-phase-copy]').textContent = copy;
  }
  function busy(value) {
    for (const control of root.querySelectorAll('[data-mlp-action], [data-mlp-config] input, [data-mlp-config] select, [data-mlp-config] button, [data-mlp-preset], [data-mlp-live]')) {
      if (control.dataset.mlpAction === 'dataset') continue;
      control.disabled = control.dataset.mlpAction === 'pause' ? !value : value;
    }
    root.querySelectorAll('[data-mlp-edit] input, [data-mlp-edit] button').forEach(c => { c.disabled = value; });
    if (!value) syncForm();
  }
  function inspector() { root.querySelector('[data-mlp-inspector]').innerHTML = inspectorHTML(e, selection, row, running || !!animation); }
  function update(full = true) {
    if (disposed) return;
    const start = performance.now();
    if (e.metricsRevision !== e.model.revision) e.record();
    e.inspect(row);
    updateDiagram(diagram, e, selection, mode);
    // Keep a user's manual edit intact while focused. Training disables that form.
    if (!root.querySelector('[data-mlp-edit]')?.contains(document.activeElement)) inspector();
    root.querySelector('[data-mlp-layer-summary]').innerHTML = layerSummary(e);
    const values = { steps: e.steps, epochs: e.epochs.toFixed(2), parameters: e.model.params.length,
      trainLoss: format(e.trainMetrics.loss), validationLoss: format(e.validationMetrics.loss),
      quality: e.dataset.task === 'binary' ? `${(e.validationMetrics.accuracy * 100).toFixed(1)}%` : format(e.validationMetrics.rmse) };
    for (const [key, value] of Object.entries(values)) root.querySelector(`[data-mlp-stat="${key}"]`).textContent = value;
    root.querySelector('[data-mlp-model-stamp]').textContent = `Все текущие сигналы: шаг ${e.steps} · версия ${e.model.revision} · пример № ${row + 1}`;
    root.querySelector('[data-mlp-prediction-stamp]').textContent = `Шаг ${e.steps}`;
    root.dataset.steps = String(e.steps); root.dataset.revision = String(e.model.revision);
    if (full) plots.update(row);
    paintCost = performance.now() - start;
    root.dataset.paintMs = String(paintCost);
    root.querySelector('[data-mlp-performance]').textContent = `Буферы: ${((e.bufferBytes + plots.bufferBytes) / 1024).toFixed(0)} КиБ · последний кадр ${paintCost.toFixed(1)} мс${trainingMs ? ` · обучение ${Math.round(trainingSteps / trainingMs * 1000)} шагов/с` : ''}.`;
  }
  function syncForm() {
    const form = root.querySelector('[data-mlp-config]');
    const count = Math.max(1, Math.min(4, +form.elements.layers.value || 1));
    for (let i = 0; i < 4; i++) form.elements[`width${i}`].disabled = running || !!animation || i >= count;
    for (const field of form.querySelectorAll('[data-init-fields]')) field.hidden = field.dataset.initFields !== form.elements.initialization.value;
  }
  function rememberComparison() {
    if (!e.steps) return;
    const key = comparisonKey(e.config);
    const extra = e.config.initialization === 'normal' ? `, μ=${e.config.normalMean}, σ=${e.config.normalStd}` : e.config.initialization === 'uniform' ? `, [${e.config.uniformMin}, ${e.config.uniformMax}]` : '';
    comparisons.push({ key, method: initializationNames[e.config.initialization] + extra + `, b=${e.config.bias}`, steps: e.steps, loss: e.validationMetrics.loss });
    if (comparisons.length > 4) comparisons.shift();
  }
  function setup() {
    mode = e.model.params.length <= 200 ? 'all' : 'selected';
    root.innerHTML = labView(e.config, e.dataset);
    root.querySelector('[data-mlp-edge-mode]').value = mode;
    diagram = buildDiagram(root.querySelector('[data-mlp-network]'), e.model);
    plots = createPlots(root, e);
    root.querySelector('[data-mlp-init-stats]').innerHTML = initializationHTML(e);
    const comparable = comparisons.filter(c => c.key === comparisonKey(e.config));
    root.querySelector('[data-mlp-comparisons]').innerHTML = comparable.length ? `<p>Предыдущие старты с теми же данными, архитектурой, активацией, seeds и настройками SGD. Сравни число шагов:</p><div class="mlp-table-scroll"><table><thead><tr><th>Инициализация</th><th>Шагов</th><th>Ошибка проверки</th></tr></thead><tbody>${comparable.map(c => `<tr><td>${escape(c.method)}</td><td>${c.steps}</td><td>${format(c.loss)}</td></tr>`).join('')}</tbody></table></div>` : '';
    syncForm(); update();
  }
  function stop(message = true) {
    running = false; animation = null; cancelAnimationFrame(frame); frame = 0;
    if (disposed) return;
    delete diagram.svg.dataset.phase;
    e.record(); busy(false); update();
    if (message) phase('На паузе', `Шаг ${e.steps}. Можно изучить любой элемент или изменить вес вручную. Сходимость автоматически не объявляется.`);
  }
  function rebuild(next) {
    stop(false); rememberComparison();
    const clean = validateConfig(next); persist(clean);
    e = current = new Experiment(clean, makeDataset(clean.dataset, clean.dataSeed));
    row = 0; selection = { kind: 'neuron', layer: 1, neuron: 0 }; mode = 'selected'; trainingMs = 0; trainingSteps = 0;
    setup(); phase('Новая сеть готова', 'История и старые градиенты очищены. С теми же seeds повторится тот же эксперимент.');
  }
  function animate(kind) {
    if (running || animation) return;
    e.inspect(row);
    const layers = e.model.sizes.length;
    const phases = kind === 'step' ? ['forward', 'backward', 'update'] : [kind];
    let previousStage = '';
    const start = performance.now(), layerDuration = reducedMotion ? 0 : 100;
    animation = kind; busy(true); inspector();
    const tick = now => {
      if (disposed || !animation) return;
      const unit = layerDuration ? Math.floor((now - start) / layerDuration) : layers * phases.length;
      const stage = phases[Math.min(phases.length - 1, Math.floor(unit / layers))];
      diagram.svg.dataset.phase = stage;
      const progress = unit % layers;
      if (stage !== previousStage) {
        previousStage = stage;
        if (stage === 'forward') phase('Прямой проход · выбранный пример', 'Входы → взвешенные суммы → активации → прогноз. Веса пока не меняются.');
        if (stage === 'backward') phase('Обратный проход · выбранный пример', 'От ошибки к δ и производным. Это градиент одного примера без L2, а не будущего батча.');
        if (stage === 'update') phase('Обновление · следующий батч', 'Для SGD пересчитываем средний градиент настоящего батча и добавляем λW.');
      }
      updateDiagram(diagram, e, selection, mode, stage === 'backward' ? layers - 1 - progress : progress);
      if (unit >= layers * phases.length) {
        animation = null;
        delete diagram.svg.dataset.phase;
        if (kind === 'step') e.step();
        e.record(); busy(false); update();
        if (e.failed) phase('Шаг отклонён: численная нестабильность', 'Веса не изменены. Уменьши η или масштаб начальных весов и повтори инициализацию.');
        else phase(kind === 'step' ? 'SGD: обновление завершено' : kind === 'forward' ? 'Прямой проход завершён' : 'Обратный проход завершён', kind === 'step' ? `Шаг ${e.steps}. Все текущие сигналы пересчитаны с новыми весами. В разборе связи отдельно сохранён предыдущий градиент батча.` : `Пример № ${row + 1}, шаг ${e.steps}. Параметры не изменялись. Выбери нейрон или связь для разбора.`);
        frame = 0; return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
  }
  function train() {
    if (running || animation) return;
    if (e.failed) { phase('Сначала переинициализируй сеть', 'Предыдущий запуск численно неустойчив. Уменьши скорость или начальный масштаб.'); return; }
    running = true; busy(true); inspector();
    phase('Обучение идёт', 'Вычисления идут порциями до 6 мс. Сеть и графики обновляются не чаще 12 раз/с. Пауза доступна в любой момент.');
    const tick = now => {
      if (!running || disposed) return;
      const start = performance.now(); let steps = 0;
      do { if (!e.step()) break; steps++; } while (steps < 40 && performance.now() - start < 6);
      trainingMs += performance.now() - start; trainingSteps += steps;
      if (now - lastPaint >= 85) { e.record(); update(); lastPaint = now; }
      if (e.failed || e.steps >= 100000) {
        stop(false); phase(e.failed ? 'Обучение остановлено: численная нестабильность' : 'Достигнут предел 100 000 шагов', e.failed ? 'Последний нестабильный шаг не применён. Уменьши скорость или масштаб инициализации.' : 'Это ограничение длительности запуска, а не доказательство сходимости. Сбрось опыт или изучи текущие параметры.'); return;
      }
      frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
  }
  root.addEventListener('click', event => {
    const target = event.target.closest('[data-mlp-action], [data-mlp-neuron], [data-mlp-edge], [data-mlp-bias], [data-mlp-preset]');
    if (!target) return;
    if (target.hasAttribute('data-mlp-neuron')) { const [layer, neuron] = target.dataset.mlpNeuron.split(':').map(Number); selection = { kind: 'neuron', layer, neuron }; update(false); }
    else if (target.hasAttribute('data-mlp-edge') || target.hasAttribute('data-mlp-bias')) { selection = { kind: target.hasAttribute('data-mlp-edge') ? 'edge' : 'bias', index: +(target.dataset.mlpEdge ?? target.dataset.mlpBias) }; update(false); }
    else if (target.dataset.mlpPreset) {
      const preset = target.dataset.mlpPreset;
      rebuild({ ...e.config, initialization: preset === 'bad' ? 'normal' : preset, normalMean: 0, normalStd: preset === 'bad' ? 5 : e.config.normalStd, bias: 0 });
      const copy = preset === 'zero' ? 'Симметричные скрытые нейроны получают одинаковые обновления. При tanh/ReLU и всех нулевых весах скрытые веса не обучаются, но выходное смещение может обновляться. В сбалансированном полном батче и оно может получить нулевой градиент.' : preset === 'bad' ? 'При больших весах sigmoid/tanh могут насытиться; у ReLU возможен рост сигналов. Смотри нормы и производные, затем сравни ошибку после одинакового числа шагов.' : 'Xavier балансирует fan-in и fan-out. He сохраняет второй момент для ReLU при оговорённых предпосылках. Выходной слой тоже использует выбранную схему — проверь его масштаб отдельно.';
      root.querySelector('[data-mlp-guide-copy]').textContent = copy;
    } else {
      const action = target.dataset.mlpAction;
      if (action === 'pause') stop();
      else if (action === 'train') train();
      else if (action === 'reset') { stop(false); e.reset(); update(); phase('Начальное состояние восстановлено', 'Восстановлены все начальные параметры и порядок батчей; счётчики и история обнулены.'); }
      else if (action === 'dataset') { stop(false); go('dataset-profile'); }
      else animate(action);
    }
  }, { signal: abort.signal });
  root.addEventListener('keydown', event => {
    if ((event.key === 'Enter' || event.key === ' ') && event.target.matches('svg [role="button"]')) { event.preventDefault(); event.target.dispatchEvent(new MouseEvent('click', { bubbles: true })); }
  }, { signal: abort.signal });
  root.addEventListener('change', event => {
    const control = event.target;
    if (control.matches('[data-mlp-example]')) { row = +control.value; update(); }
    else if (control.matches('[data-mlp-edge-mode]')) { mode = control.value; update(false); }
    else if (control.matches('[data-mlp-select-edge]') && control.value !== '') { selection = { kind: 'edge', index: +control.value }; update(false); }
    else if (control.matches('[data-mlp-live]')) {
      if (!control.checkValidity() || !control.value) { control.reportValidity(); return; }
      e.config = validateConfig({ ...e.config, [control.dataset.mlpLive]: +control.value }); persist(e.config);
      phase('Настройки следующего шага изменены', 'Последнее выполненное обновление хранит прежние η и λ. Новые значения применятся со следующего батча.');
    } else if (control.closest('[data-mlp-config]')) syncForm();
  }, { signal: abort.signal });
  root.addEventListener('submit', event => {
    event.preventDefault();
    if (event.target.matches('[data-mlp-config]')) {
      const data = new FormData(event.target), c = { ...e.config };
      for (const [key, value] of data) if (!key.startsWith('width') && key !== 'layers') c[key] = ['dataset', 'activation', 'initialization'].includes(key) ? value : +value;
      c.hidden = Array.from({ length: +data.get('layers') }, (_, i) => +data.get(`width${i}`)); rebuild(c);
    } else if (event.target.matches('[data-mlp-edit]') && !running && !animation) {
      e.edit(selection.index, +new FormData(event.target).get('value')); e.inspect(row); inspector(); update(); phase('Параметр изменён вручную', 'Сигналы и предсказания пересчитаны. История очищена; следующий батч получит новый градиент.');
    }
  }, { signal: abort.signal });
  setup();
  return () => { disposed = true; running = false; animation = null; cancelAnimationFrame(frame); abort.abort(); };
}
