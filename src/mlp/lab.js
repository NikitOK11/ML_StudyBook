import { defaultConfig, validateConfig } from './config.js?v=2';
import { xorExamples } from './data.js?v=2';
import { forward } from './core.js?v=2';
import { createLessonModel, forwardWorkspace, setActivation, exampleOutputs } from './lesson.js?v=2';
import { labView, format } from './view.js?v=2';
import { buildDiagram, updateDiagram, inspectorHTML } from './diagram.js?v=2';

export function mountLab(root, saved, persist) {
  let config = validateConfig(saved), model = createLessonModel(config), ws = forwardWorkspace(model);
  let selection = { kind: 'neuron', layer: 1, neuron: 0 }, diagram, disposed = false, frame = 0;
  let unmountTheory = null, loadingTheory = null, requestedSection = null;
  const abort = new AbortController();
  root.innerHTML = labView();
  const find = selector => root.querySelector(selector);
  const svg = find('[data-mlp-network]'), reading = find('[data-mlp-reading]');
  const status = find('[data-mlp-phase]');
  const motion = matchMedia('(prefers-reduced-motion: reduce)');

  function cancelAnimation() {
    cancelAnimationFrame(frame); frame = 0;
    find('[data-mlp-action="forward"]').disabled = false;
    svg.removeAttribute('data-phase');
    if (diagram) updateDiagram(diagram, model, ws, selection);
  }
  function syncControls() {
    find('[name="layers"]').value = String(config.hidden.length);
    find('[data-mlp-widths]').innerHTML = config.hidden.map((width, i) =>
      '<label>Нейронов в слое ' + (i + 1) + '<select data-mlp-setting="width" data-layer="' + i + '">' +
      [1, 2, 3, 4].map(n => '<option value="' + n + '" ' + (n === width ? 'selected' : '') + '>' + n + '</option>').join('') + '</select></label>').join('');
    find('[data-mlp-activation-note]').textContent = config.hidden.length
      ? 'Меняется только функция активации. Все веса и смещения остаются прежними. Выходной слой всегда тождественный.'
      : 'Скрытых слоёв нет: выход равен x₁ − x₂. Сравнивать скрытые активации здесь негде.';
    root.querySelectorAll('[data-mlp-activation]').forEach(button => {
      button.disabled = !config.hidden.length;
      button.setAttribute('aria-pressed', String(button.dataset.mlpActivation === config.activation));
    });
  }
  function update() {
    forward(model, xorExamples[config.example].input, ws);
    updateDiagram(diagram, model, ws, selection);
    find('[data-mlp-inspector]').innerHTML = inspectorHTML(model, ws, selection);
    find('[data-mlp-architecture]').textContent = model.sizes.join(' → ');
    find('[data-mlp-parameter-count]').textContent = 'Параметров: ' + model.params.length;
    find('[data-mlp-output]').textContent = format(ws.a.at(-1)[0]);
    const reference = config.hidden.length === 1 && config.hidden[0] === 2;
    find('[data-mlp-result]').textContent = (reference
      ? config.activation === 'relu' ? 'ReLU сохраняет положительную разность: выход равен |x₁ − x₂|.'
        : 'При тех же весах разности взаимно уничтожаются: (x₁ − x₂) + (x₂ − x₁) = 0.'
      : 'У этой архитектуры свои заданные коэффициенты. Сравни реальные выходы со значениями XOR в четырёх примерах.') +
      ' Это значение функции, не вероятность.';
    exampleOutputs(model).forEach((output, i) => {
      find('[data-mlp-example-output="' + i + '"]').textContent = format(output);
      find('[data-mlp-example="' + i + '"]').setAttribute('aria-pressed', String(i === config.example));
    });
  }
  function rebuild() {
    cancelAnimation();
    model = createLessonModel(config); ws = forwardWorkspace(model);
    selection = { kind: 'neuron', layer: 1, neuron: 0 };
    diagram = buildDiagram(svg, model);
    syncControls(); update();
    status.textContent = 'Сеть готова. Значения рассчитаны для выбранного входа.';
  }
  function save() { persist(validateConfig(config)); }
  function animate() {
    cancelAnimation();
    if (motion.matches) { update(); status.textContent = 'Прямой проход завершён: значения всех слоёв показаны на схеме.'; return; }
    const started = performance.now(), duration = 320;
    find('[data-mlp-action="forward"]').disabled = true;
    function tick(now) {
      if (disposed) return;
      const layer = Math.floor((now - started) / duration);
      if (layer >= model.sizes.length) {
        cancelAnimation();
        status.textContent = 'Прямой проход завершён. Выход: ' + format(ws.a.at(-1)[0]) + '.';
        return;
      }
      svg.dataset.phase = String(layer);
      updateDiagram(diagram, model, ws, selection, layer);
      status.textContent = layer === 0 ? 'Вход: два числа выбранного примера.' :
        layer === model.sizes.length - 1 ? 'Выход: складываем взвешенные сигналы и смещение.' :
        'Скрытый слой ' + layer + ': взвешенная сумма z, затем ' + (config.activation === 'relu' ? 'ReLU(z).' : 'a = z.');
      frame = requestAnimationFrame(tick);
    }
    frame = requestAnimationFrame(tick);
  }
  function ensureTheory(section = null) {
    if (section) requestedSection = section;
    if (unmountTheory) { if (section) unmountTheory.scrollTo(section); return; }
    if (loadingTheory) return;
    loadingTheory = import('./theory-loader.js?v=2').then(module => {
      if (disposed) return;
      unmountTheory = module.mountTheory(reading, requestedSection, { embedded: true });
    }).catch(() => {
      if (!disposed) reading.innerHTML = '<p role="alert">Не удалось открыть объяснение.</p><button class="secondary" data-mlp-action="read">Повторить загрузку</button>';
      loadingTheory = null;
    });
  }
  const observer = new IntersectionObserver(entries => {
    if (entries.some(entry => entry.isIntersecting)) { observer.disconnect(); ensureTheory(); }
  }, { rootMargin: '120px' });
  observer.observe(reading);

  root.addEventListener('click', event => {
    const link = event.target.closest('[data-mlp-section]');
    if (link) { event.preventDefault(); ensureTheory(link.dataset.mlpSection); return; }
    const example = event.target.closest('[data-mlp-example]');
    if (example) {
      cancelAnimation(); config.example = +example.dataset.mlpExample; update(); save();
      status.textContent = 'Новый вход. Коэффициенты сети прежние.'; return;
    }
    const activation = event.target.closest('[data-mlp-activation]');
    if (activation && config.hidden.length) {
      cancelAnimation(); config.activation = activation.dataset.mlpActivation;
      setActivation(model, config.activation); syncControls(); update(); save();
      status.textContent = 'Активация изменена. Веса и смещения сохранены.'; return;
    }
    const action = event.target.closest('[data-mlp-action]')?.dataset.mlpAction;
    if (action === 'reset') { config = validateConfig(defaultConfig); rebuild(); save(); return; }
    if (action === 'forward') { animate(); return; }
    if (action === 'read') { ensureTheory('mlp-start'); return; }
    const node = event.target.closest('[data-mlp-neuron], [data-mlp-edge], [data-mlp-bias]');
    if (!node) return;
    cancelAnimation();
    if (node.hasAttribute('data-mlp-neuron')) {
      const [layer, neuron] = node.dataset.mlpNeuron.split(':').map(Number);
      selection = { kind: 'neuron', layer, neuron };
    } else selection = node.hasAttribute('data-mlp-edge')
      ? { kind: 'edge', index: +node.dataset.mlpEdge } : { kind: 'bias', index: +node.dataset.mlpBias };
    update();
  }, { signal: abort.signal });
  root.addEventListener('keydown', event => {
    const node = event.target.closest('svg [role="button"]');
    if (node && ['Enter', ' '].includes(event.key)) {
      event.preventDefault(); node.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    }
  }, { signal: abort.signal });
  root.addEventListener('change', event => {
    const control = event.target.closest('[data-mlp-setting]');
    if (!control) return;
    if (control.dataset.mlpSetting === 'layers') config.hidden = Array.from({ length: +control.value }, (_, i) => config.hidden[i] || 2);
    else config.hidden[+control.dataset.layer] = +control.value;
    config = validateConfig(config); rebuild(); save();
  }, { signal: abort.signal });
  motion.addEventListener('change', () => { if (motion.matches) cancelAnimation(); }, { signal: abort.signal });
  rebuild();
  return () => {
    disposed = true; cancelAnimationFrame(frame); abort.abort(); observer.disconnect(); unmountTheory?.();
  };
}
