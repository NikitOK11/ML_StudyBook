import { createSvmTrainer } from './svm-solver.js';
import { drawSvmPlot, svmPointAt, svmPlotBounds } from './svm-plot.js';

const presets = { blobs: 'Два облака', overlap: 'Пересечение', rings: 'Кольца', xor: 'XOR' };
const kernels = { linear: 'Линейное', rbf: 'RBF', poly: 'Полиномиальное' };

function choices(name, options, selected) {
  return Object.entries(options).map(([value, label]) =>
    `<button type="button" class="secondary" data-svm-${name}="${value}" aria-pressed="${value === selected}">${label}</button>`
  ).join('');
}

function slider(id, label, min, max, step, value, output) {
  return `<div class="svm-field">
    <label for="svm-${id}">${label}</label>
    <div class="range-line">
      <input class="range-control" id="svm-${id}" type="range" min="${min}" max="${max}" step="${step}" value="${value}" aria-valuetext="${output}">
      <output class="range-value" for="svm-${id}" id="svm-${id}-value">${output}</output>
    </div>
  </div>`;
}

export function svmPlaygroundView() {
  return `<section class="svm-playground" id="svm-playground" data-svm-playground aria-labelledby="svm-title">
    <div class="svm-heading">
      <div>
        <button class="back" data-route="map">← карта</button>
        <h1 id="svm-title">Метод опорных векторов</h1>
        <p>Меняй ядро, настройки и точки. Следи, как SVM проводит границу между классами.</p>
      </div>
      <nav class="svm-jumps" aria-label="Разделы модуля SVM">
        <a class="secondary" href="#svm-intro">Теория</a>
        <a class="secondary" href="#svm-exercises">Задачи</a>
      </nav>
    </div>

    <div class="svm-workbench">
      <section class="visual svm-live-visual" aria-label="График и данные">
        <div class="svm-toolbar">
          <div class="svm-choices" role="group" aria-label="Датасет">${choices('preset', presets, 'blobs')}</div>
          <button type="button" class="back" data-svm-command="shuffle">Новая выборка</button>
        </div>
        <div class="svm-canvas-frame">
          <canvas id="svm-live-plot" role="img" aria-label="Граница SVM и точки двух классов. Для ввода координат используй форму под графиком."></canvas>
          <p class="svm-empty" data-svm-empty hidden>Добавь точки обоих классов, чтобы построить границу.</p>
        </div>
        <div class="svm-toolbar svm-point-tools">
          <div class="svm-choices" role="group" aria-label="Класс новой точки">
            <button type="button" class="secondary" data-svm-class="1" aria-pressed="true"><i class="svm-class-mark positive" aria-hidden="true"></i>Класс +1</button>
            <button type="button" class="secondary" data-svm-class="-1" aria-pressed="false"><i class="svm-class-mark negative" aria-hidden="true"></i>Класс −1</button>
          </div>
          <div class="svm-choices">
            <button type="button" class="back" data-svm-command="undo" disabled>Отменить</button>
            <button type="button" class="back" data-svm-command="clear">Очистить</button>
            <button type="button" class="back" data-svm-command="export">Скачать PNG</button>
          </div>
        </div>
        <p class="svm-point-help">Клик добавляет точку. Shift меняет класс, Alt удаляет ближайшую точку.</p>
        <details class="svm-coordinate-details">
          <summary>Ввести координаты</summary>
          <form class="svm-coordinate-form">
            <label>x₁ <input type="number" name="x" min="-3" max="3" step="any" value="0" required></label>
            <label>x₂ <input type="number" name="y" min="-3" max="3" step="any" value="0" required></label>
            <button class="secondary">Добавить точку</button>
          </form>
        </details>
      </section>

      <aside class="svm-settings" aria-label="Настройки модели">
        <h2>Параметры модели</h2>
        <div class="svm-choices" role="group" aria-label="Ядро SVM">${choices('kernel', kernels, 'linear')}</div>
        ${slider('penalty', 'Штраф C', -2, 2, .05, 0, '1,00')}
        <div data-svm-gamma hidden>${slider('gamma', 'Параметр ядра γ', -2, 1, .05, -.15, '0,71')}</div>
        <div data-svm-degree hidden>${slider('degree', 'Степень полинома', 2, 5, 1, 3, '3')}</div>
        <div class="svm-layers">
          <label><input type="checkbox" id="svm-show-margin" checked> Показать полосу зазора</label>
          <label><input type="checkbox" id="svm-show-support" checked> Обвести опорные векторы</label>
        </div>
        <dl class="svm-readout">
          <div><dt>Точность на обучении</dt><dd data-svm-accuracy>—</dd></div>
          <div><dt>Опорные векторы</dt><dd data-svm-support>—</dd></div>
          <div><dt>Всего точек</dt><dd data-svm-count>—</dd></div>
        </dl>
        <p class="svm-live-status" role="status" data-svm-status>Обучаем модель…</p>
        <p class="svm-legend">Сплошная линия показывает границу f(x) = 0. Пунктир отмечает уровни f(x) = ±1.</p>
        <button class="back svm-manual-link" data-route="svm-linear">Линейный SVM по шагам →</button>
      </aside>
    </div>
    <p class="svm-experiment">Выбери «Кольца» и переключись с линейного ядра на RBF. Затем увеличь γ и посмотри, как меняется граница.</p>
  </section>`;
}

function makePoints(preset, seed) {
  const random = () => {
    seed = (seed + 0x6D2B79F5) | 0;
    let value = Math.imul(seed ^ seed >>> 15, 1 | seed);
    value = (value + Math.imul(value ^ value >>> 7, 61 | value)) ^ value;
    return ((value ^ value >>> 14) >>> 0) / 4294967296;
  };
  const normal = () => Math.sqrt(-2 * Math.log(Math.max(1e-8, random()))) * Math.cos(2 * Math.PI * random());
  const clamp = value => Math.max(-2.85, Math.min(2.85, value));
  return Array.from({ length: 56 }, (_, index) => {
    const label = index < 28 ? 1 : -1;
    let x;
    let y;
    if (preset === 'rings') {
      const radius = (label === 1 ? .85 : 2.05) + normal() * .13;
      const angle = random() * Math.PI * 2;
      x = radius * Math.cos(angle);
      y = radius * Math.sin(angle);
    } else if (preset === 'xor') {
      const side = index % 2 ? 1 : -1;
      x = side * 1.35 + normal() * .36;
      y = label * side * 1.35 + normal() * .36;
    } else {
      const spread = preset === 'overlap' ? .95 : .47;
      const offset = preset === 'overlap' ? .65 : 1.22;
      x = label * offset + normal() * spread;
      y = label * .6 + normal() * spread;
    }
    return { x: clamp(x), y: clamp(y), label };
  });
}

export function mountSvmPlayground(root) {
  const find = selector => root.querySelector(selector);
  const canvas = find('#svm-live-plot');
  const coordinateForm = find('.svm-coordinate-form');
  const status = find('[data-svm-status]');
  const penalty = find('#svm-penalty');
  const gamma = find('#svm-gamma');
  const degree = find('#svm-degree');
  const margin = find('#svm-show-margin');
  const support = find('#svm-show-support');
  const number = new Intl.NumberFormat('ru', { minimumFractionDigits: 2, maximumFractionDigits: 3 });
  const history = [];
  let seed = 42;
  let preset = 'blobs';
  let activePreset = preset;
  let points = makePoints(preset, seed);
  let kind = 'linear';
  let label = 1;
  let frame = null;
  let trainer = null;
  let needsTraining = true;
  let model = null;

  function select(name, selected) {
    root.querySelectorAll(`[data-svm-${name}]`).forEach(button => {
      button.setAttribute('aria-pressed', String(button.getAttribute(`data-svm-${name}`) === String(selected)));
    });
  }

  function paint() {
    drawSvmPlot(canvas, points, model, { margin: margin.checked, support: support.checked, draft: Boolean(trainer) });
  }

  function requestFrame() {
    if (frame === null) frame = requestAnimationFrame(update);
  }

  function update() {
    frame = null;
    if (needsTraining) {
      trainer = createSvmTrainer(points, { kind, C: 10 ** +penalty.value, gamma: 10 ** +gamma.value, degree: +degree.value });
      needsTraining = false;
    }
    if (trainer) {
      trainer.step(6);
      model = trainer.snapshot();
      if (trainer.done) trainer = null;

      find('[data-svm-count]').textContent = points.length;
      find('[data-svm-support]').textContent = model.ready ? model.support.length : '—';
      find('[data-svm-accuracy]').textContent = model.ready ? `${(model.accuracy * 100).toFixed(1).replace('.', ',')}%` : '—';
      find('[data-svm-empty]').hidden = model.ready;
      find('[data-svm-command="undo"]').disabled = !history.length;
      find('[data-svm-command="clear"]').disabled = !points.length;
      const message = !model.ready ? 'Нужны точки обоих классов'
        : trainer ? 'Модель обновляется'
        : model.limited ? 'Достигнут предел итераций' : 'Модель готова';
      if (status.textContent !== message) status.textContent = message;
    }
    paint();
    if (trainer) requestFrame();
  }

  function scheduleTraining() {
    // Consume the latest input on the next frame, even while the slider is moving.
    needsTraining = true;
    requestFrame();
  }

  function syncCoordinateBounds() {
    const { xLimit, yLimit } = svmPlotBounds(canvas, points);
    for (const [name, limit] of [['x', xLimit], ['y', yLimit]]) {
      coordinateForm.elements[name].min = -limit;
      coordinateForm.elements[name].max = limit;
    }
  }

  function updatePoints(nextPoints, nextPreset = null) {
    history.push({ points, activePreset });
    if (history.length > 30) history.shift();
    points = nextPoints;
    syncCoordinateBounds();
    activePreset = nextPreset;
    select('preset', activePreset);
    scheduleTraining();
  }

  function addPoint(point, pointLabel = label) {
    if (points.length >= 200) {
      status.textContent = 'Достигнут лимит в 200 точек. Удали точку или очисти график.';
      return;
    }
    updatePoints([...points, { ...point, label: pointLabel }]);
  }

  root.addEventListener('input', event => {
    const control = event.target;
    if (control === penalty || control === gamma || control === degree) {
      const value = control === degree ? control.value : number.format(10 ** +control.value);
      find(`#${control.id}-value`).textContent = value;
      control.setAttribute('aria-valuetext', value);
      scheduleTraining();
    }
  });

  root.addEventListener('change', event => {
    if (event.target === margin || event.target === support) requestFrame();
  });

  root.addEventListener('click', event => {
    const button = event.target.closest('button');
    if (!button) return;
    if (button.dataset.svmPreset) {
      preset = button.dataset.svmPreset;
      updatePoints(makePoints(preset, seed), preset);
    }
    if (button.dataset.svmKernel) {
      kind = button.dataset.svmKernel;
      select('kernel', kind);
      find('[data-svm-gamma]').hidden = kind === 'linear';
      find('[data-svm-degree]').hidden = kind !== 'poly';
      scheduleTraining();
    }
    if (button.dataset.svmClass) {
      label = Number(button.dataset.svmClass);
      select('class', label);
    }
    switch (button.dataset.svmCommand) {
      case 'shuffle':
        updatePoints(makePoints(preset, ++seed), preset);
        break;
      case 'clear':
        updatePoints([]);
        break;
      case 'undo': {
        const previous = history.pop();
        if (!previous) break;
        ({ points, activePreset } = previous);
        syncCoordinateBounds();
        if (activePreset) preset = activePreset;
        select('preset', activePreset);
        scheduleTraining();
        break;
      }
      case 'export': {
        const link = document.createElement('a');
        link.href = canvas.toDataURL();
        link.download = `svm-${kind}.png`;
        link.click();
        break;
      }
    }
  });

  canvas.addEventListener('click', event => {
    const point = svmPointAt(canvas, event, points);
    if (!event.altKey) {
      addPoint(point, event.shiftKey ? -label : label);
      return;
    }
    const { unit } = svmPlotBounds(canvas, points);
    let closest = -1;
    let distance = 18;
    points.forEach((candidate, index) => {
      const pixels = Math.hypot(candidate.x - point.x, candidate.y - point.y) * unit;
      if (pixels < distance) {
        closest = index;
        distance = pixels;
      }
    });
    if (closest !== -1) updatePoints(points.filter((_, index) => index !== closest));
  });

  coordinateForm.addEventListener('submit', event => {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    addPoint({ x: Number(data.get('x')), y: Number(data.get('y')) });
  });

  const observer = new ResizeObserver(() => {
    syncCoordinateBounds();
    requestFrame();
  });
  observer.observe(canvas);
  requestFrame();
  return () => {
    observer.disconnect();
    if (frame !== null) cancelAnimationFrame(frame);
  };
}
