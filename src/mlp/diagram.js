import { escape, format, theoryLink } from './view.js';
import { derivative, distribution } from './core.js';

const norm = array => Math.sqrt(array.reduce((sum, v) => sum + v * v, 0));
const tone = value => value < 0 ? '#ff7f91' : '#5dd6c4';
export function buildDiagram(svg, model) {
  const height = Math.max(360, Math.max(...model.sizes) * 43 + 110), width = 960;
  const positions = model.sizes.map((size, l) => Array.from({ length: size }, (_, i) => ({ x: 70 + l * 820 / (model.sizes.length - 1), y: height / 2 + (i - (size - 1) / 2) * 43 + 18 })));
  svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
  svg.style.height = `${Math.min(height, 720)}px`;
  const edges = model.layers.map((l, k) => Array.from({ length: l.nout }, (_, i) => Array.from({ length: l.nin }, (_, j) => {
    const a = positions[k][j], b = positions[k + 1][i], index = l.offset + i * l.nin + j;
    return `<path data-mlp-edge="${index}" data-layer="${k}" data-from="${j}" data-to="${i}" d="M${a.x + 20},${a.y} L${b.x - 20},${b.y}" role="button" tabindex="0" aria-label="Вес слоя ${k + 1}, ${j + 1} → ${i + 1}"/>`;
  }).join('')).join('')).join('');
  const nodes = positions.map((layer, k) => `<text class="mlp-layer-title" x="${layer[0].x}" y="26" text-anchor="middle">${k === 0 ? 'Вход' : k === model.sizes.length - 1 ? 'Выход' : `Скрытый ${k}`}</text><text class="mlp-layer-caption" x="${layer[0].x}" y="46" text-anchor="middle">${model.sizes[k]} ${k ? `· ${model.layers[k - 1].activation}` : 'признака'}</text>${k ? `<text class="mlp-layer-caption" x="${layer[0].x}" y="64" text-anchor="middle">${model.layers[k - 1].nin * model.sizes[k] + model.sizes[k]} параметров</text>` : ''}${layer.map((p, i) => `<g data-mlp-neuron="${k}:${i}" role="button" tabindex="0" aria-label="${k ? `Слой ${k}, нейрон` : 'Вход'} ${i + 1}"><circle cx="${p.x}" cy="${p.y}" r="18"/><text x="${p.x}" y="${p.y + 4}" text-anchor="middle">${i + 1}</text></g>${k ? `<g data-mlp-bias="${model.layers[k - 1].biasOffset + i}" role="button" tabindex="0" aria-label="Смещение слоя ${k}, нейрона ${i + 1}"><circle cx="${p.x + 26}" cy="${p.y - 17}" r="10"/><text x="${p.x + 26}" y="${p.y - 13}" text-anchor="middle">b</text></g>` : ''}`).join('')}`).join('');
  svg.innerHTML = `<g class="mlp-edges">${edges}</g><g class="mlp-neurons">${nodes}</g>`;
  return { svg, edges: [...svg.querySelectorAll('[data-mlp-edge]')], neurons: [...svg.querySelectorAll('[data-mlp-neuron]')], biases: [...svg.querySelectorAll('[data-mlp-bias]')] };
}

export function selectionNeuron(model, selection) {
  if (selection.kind === 'neuron') return { layer: selection.layer, neuron: selection.neuron };
  const k = model.layers.findIndex(l => selection.index >= l.offset && selection.index < l.biasOffset + l.nout);
  const l = model.layers[k];
  return { layer: k + 1, neuron: selection.index >= l.biasOffset ? selection.index - l.biasOffset : Math.floor((selection.index - l.offset) / l.nin) };
}

export function updateDiagram(diagram, experiment, selection, mode, phaseLayer = -1) {
  const { model, inspection } = experiment, current = selectionNeuron(model, selection);
  diagram.edges.forEach(edge => {
    const index = +edge.dataset.mlpEdge, layer = +edge.dataset.layer;
    const connected = (current.layer === layer && current.neuron === +edge.dataset.from) || (current.layer === layer + 1 && current.neuron === +edge.dataset.to);
    const visible = mode === 'all' || connected;
    edge.style.display = visible ? '' : 'none'; edge.setAttribute('tabindex', visible ? '0' : '-1');
    const value = model.params[index];
    edge.style.stroke = tone(value); edge.style.strokeWidth = String(1 + 3 * Math.abs(value) / (1 + Math.abs(value)));
    edge.style.opacity = selection.kind !== 'neuron' && selection.index === index ? '1' : connected ? '.72' : '.13';
    edge.classList.toggle('selected', selection.kind !== 'neuron' && selection.index === index);
  });
  diagram.neurons.forEach(node => {
    const [k, i] = node.dataset.mlpNeuron.split(':').map(Number), a = inspection.a[k][i];
    const circle = node.querySelector('circle');
    circle.style.fill = tone(a); circle.style.fillOpacity = String(.06 + .8 * Math.abs(a) / (1 + Math.abs(a)));
    node.classList.toggle('selected', current.layer === k && current.neuron === i);
    node.classList.toggle('propagating', phaseLayer === k);
    node.setAttribute('aria-label', `${k ? `Слой ${k}, нейрон` : 'Вход'} ${i + 1}: активация ${format(a)}`);
  });
  diagram.biases.forEach(node => node.classList.toggle('selected', selection.kind === 'bias' && selection.index === +node.dataset.mlpBias));
}

export function inspectorHTML(e, selection, row, running) {
  const { model, inspection: ws } = e, { layer, neuron } = selectionNeuron(model, selection);
  const stamp = `<p class="mlp-inspector-stamp">Пример № ${row + 1} · цель ${format(e.dataset.train.y[row])}<br>Текущие веса: шаг ${e.steps}, версия ${model.revision}</p>`;
  if (layer === 0) return `<div class="kicker">вход / ${neuron + 1}</div><h3>${escape(e.dataset.featureNames[neuron])}</h3>${stamp}<dl><dt>Исходное значение</dt><dd>${format(e.dataset.train.raw[row * e.dataset.dimensions + neuron])}</dd><dt>Среднее обучения</dt><dd>${format(e.dataset.mean[neuron])}</dd><dt>Масштаб обучения</dt><dd>${format(e.dataset.std[neuron])}</dd><dt>Нормализованный вход</dt><dd>${format(ws.a[0][neuron])}</dd><dt>∂ℓ / ∂x (норм.)</dt><dd>${format(ws.inputGradient[neuron])}</dd></dl>${theoryLink('mlp-normalization')}`;
  const l = model.layers[layer - 1], z = ws.z[layer - 1][neuron], a = ws.a[layer][neuron], delta = ws.delta[layer - 1][neuron];
  const selector = `<label>Входящая связь<select data-mlp-select-edge><option value="">Выбери вес для разбора</option>${Array.from({ length: l.nin }, (_, j) => `<option value="${l.offset + neuron * l.nin + j}" ${selection.kind === 'edge' && selection.index === l.offset + neuron * l.nin + j ? 'selected' : ''}>Из нейрона ${j + 1}: ${format(l.w[neuron * l.nin + j])}</option>`).join('')}</select></label>`;
  if (selection.kind === 'neuron') return `<div class="kicker">слой ${layer} / нейрон ${neuron + 1}</div><h3>От суммы к сигналу</h3>${stamp}<dl><dt>Смещение b</dt><dd><button class="mlp-link" data-mlp-bias="${l.biasOffset + neuron}">${format(l.b[neuron])} ↗</button></dd><dt>Взвешенная сумма z</dt><dd>${format(z)}</dd><dt>Активация a = ${l.activation}(z)</dt><dd>${format(a)}</dd><dt>Производная φ′(z)</dt><dd>${format(derivative(z, a, l.activation))}</dd><dt>Сигнал ошибки δ = ∂ℓ/∂z</dt><dd>${format(delta)}</dd></dl><details><summary>Откуда взялась сумма?</summary><table><thead><tr><th>Вход</th><th>a</th><th>w</th><th>w·a</th></tr></thead><tbody>${Array.from({ length: l.nin }, (_, j) => `<tr><td>${j + 1}</td><td>${format(ws.a[layer - 1][j])}</td><td>${format(l.w[neuron * l.nin + j])}</td><td>${format(ws.a[layer - 1][j] * l.w[neuron * l.nin + j])}</td></tr>`).join('')}</tbody></table><p>Сумма произведений + ${format(l.b[neuron])} = ${format(z)}.</p></details>${selector}${theoryLink('mlp-backprop')}`;
  const index = selection.index;
  const recent = e.lastCount ? `<div class="mlp-last-update"><strong>Последнее обновление батчем</strong><p>Шаг ${e.lastFromStep} → ${e.steps} · ${e.lastCount} объектов · λ = ${e.lastL2}</p><dl><dt>До</dt><dd>${format(e.previous[index])}</dd><dt>Средний градиент + L2</dt><dd>${format(e.lastGradient[index])}</dd><dt>Скорость η</dt><dd>${format(e.lastLr)}</dd><dt>После = до − η · градиент</dt><dd>${format(model.params[index])}</dd></dl><details><summary>Какие примеры в батче?</summary><p>${Array.from(e.lastBatch.subarray(0, e.lastCount), i => i + 1).join(', ')}</p></details></div>` : '<p>Обновления ещё нет. «Один шаг» вычислит градиент следующего батча и применит SGD.</p>';
  return `<div class="kicker">слой ${layer} / ${selection.kind === 'bias' ? 'смещение' : 'связь'}</div><h3>${selection.kind === 'bias' ? `b нейрона ${neuron + 1}` : `Вес ${((index - l.offset) % l.nin) + 1} → ${neuron + 1}`}</h3>${stamp}<dl><dt>Текущее значение</dt><dd>${format(model.params[index])}</dd><dt>Градиент ℓ одного примера, без L2</dt><dd>${format(e.sampleGradient[index])}</dd></dl><form data-mlp-edit><label>Изменить вручную<input name="value" aria-label="Новое значение параметра" type="number" min="-100" max="100" step="any" required value="${model.params[index]}" ${running ? 'disabled' : ''}></label><button class="secondary" ${running ? 'disabled' : ''}>Применить</button></form><p>Ручное изменение очищает историю и старый градиент. «Сбросить» вернёт начальный эксперимент.</p>${recent}${selector}${theoryLink('mlp-batch', 'Почему градиенты различаются? ↗')}`;
}

export function layerSummary(e) {
  return e.model.layers.map((l, k) => {
    const a = e.inspection.a[k + 1];
    const inactive = l.activation === 'relu' ? a.filter(v => v === 0).length : l.activation === 'tanh' ? a.filter(v => Math.abs(v) > .98).length : l.activation === 'sigmoid' ? a.filter(v => v < .01 || v > .99).length : 0;
    return `<tr><th>${k + 1} · ${l.activation}</th><td>${format(norm(l.w))}</td><td>${format(norm(a))}</td><td>${format(norm(e.sampleGradient.subarray(l.offset, l.biasOffset)))}</td><td>${e.lastCount ? format(norm(e.lastGradient.subarray(l.offset, l.biasOffset))) : '—'}</td><td>${inactive} / ${l.nout}</td></tr>`;
  }).join('');
}

export function initializationHTML(e) {
  return e.model.layers.map((l, k) => {
    const w = e.initial.subarray(l.offset, l.biasOffset), d = distribution(e.config, l.nin, l.nout);
    const mean = w.reduce((s, v) => s + v, 0) / w.length, variance = w.reduce((s, v) => s + (v - mean) ** 2, 0) / w.length;
    const min = Math.min(...w), max = Math.max(...w), bins = Array(12).fill(0);
    for (const v of w) bins[Math.min(11, Math.floor(12 * (v - min) / (max - min || 1)))]++;
    const distributionText = d.family === 'constant' ? 'W = 0' : d.family === 'normal' ? `N(μ = ${format(d.mean)}, σ² = ${format(d.variance)})` : `U[${format(d.min)}, ${format(d.max)}]`;
    return `<article><h3>Слой ${k + 1} <small>${l.nin} → ${l.nout}</small></h3><p class="mlp-mono">${distributionText}</p><dl><dt>fan-in / fan-out</dt><dd>${l.nin} / ${l.nout}</dd><dt>Теоретическая дисперсия</dt><dd>${format(d.variance)}</dd><dt>Выборочное среднее</dt><dd>${format(mean)}</dd><dt>Дисперсия (делитель N)</dt><dd>${format(variance)}</dd><dt>Смещений ${l.nout}, каждое</dt><dd>${e.config.bias}</dd></dl><svg viewBox="0 0 240 72" role="img" aria-label="Гистограмма ${w.length} начальных весов слоя ${k + 1}">${bins.map((n, i) => `<rect x="${i * 20 + 1}" y="${52 - 48 * n / Math.max(...bins)}" width="17" height="${48 * n / Math.max(...bins)}" fill="#ffb900"/>`).join('')}<text x="0" y="69">${min.toFixed(2)}</text><text x="235" y="69" text-anchor="end">${max.toFixed(2)}</text></svg><p>${w.length} весов; малая выборка не обязана точно воспроизводить теоретическую дисперсию.</p></article>`;
  }).join('');
}
