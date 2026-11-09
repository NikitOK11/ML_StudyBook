import { format, theoryLink } from './view.js?v=2';

const sub = n => String(n).replace(/\d/g, digit => '₀₁₂₃₄₅₆₇₈₉'[digit]);
const activationName = kind => kind === 'relu' ? 'ReLU' : 'тождественная';
const tone = value => value > 0 ? '#5dd6c4' : value < 0 ? '#ff7f91' : '#68706f';
export function buildDiagram(svg, model) {
  const width = Math.max(560, model.sizes.length * 190), height = Math.max(310, Math.max(...model.sizes) * 80 + 130);
  const positions = model.sizes.map((size, k) => Array.from({ length: size }, (_, i) => ({
    x: 65 + k * (width - 130) / (model.sizes.length - 1),
    y: (height + 70) / 2 + (i - (size - 1) / 2) * 80
  })));
  svg.setAttribute('viewBox', '0 0 ' + width + ' ' + height);
  svg.style.minWidth = width + 'px';
  const edges = model.layers.map((layer, k) => Array.from({ length: layer.nout }, (_, i) => Array.from({ length: layer.nin }, (_, j) => {
    const from = positions[k][j], to = positions[k + 1][i], index = layer.offset + i * layer.nin + j;
    const path = 'M' + (from.x + 24) + ',' + from.y + ' L' + (to.x - 24) + ',' + to.y;
    return '<g data-mlp-edge="' + index + '" role="button" tabindex="0"><path class="mlp-edge-line" d="' + path + '"/><path class="mlp-edge-hit" d="' + path + '"/><text class="mlp-edge-value" x="' + ((from.x + to.x) / 2) + '" y="' + ((from.y + to.y) / 2 - 9) + '" text-anchor="middle"></text></g>';
  }).join('')).join('')).join('');
  const nodes = positions.map((layer, k) => {
    const title = k === 0 ? 'Вход' : k === model.sizes.length - 1 ? 'Выход' : 'Скрытый ' + k;
    const label = k === 0 ? '2 числа' : model.sizes[k] + ' · ' + activationName(model.layers[k - 1].activation);
    return '<text class="mlp-layer-title" x="' + layer[0].x + '" y="28" text-anchor="middle">' + title + '</text><text class="mlp-layer-caption" data-mlp-layer-caption="' + k + '" x="' + layer[0].x + '" y="49" text-anchor="middle">' + label + '</text>' +
      layer.map((p, i) => '<g data-mlp-neuron="' + k + ':' + i + '" role="button" tabindex="0"><circle cx="' + p.x + '" cy="' + p.y + '" r="24"/><text class="mlp-node-name" x="' + p.x + '" y="' + (p.y + 5) + '" text-anchor="middle">' + (k === 0 ? 'x' + sub(i + 1) : k === model.sizes.length - 1 ? 'ŷ' : 'a' + sub(i + 1)) + '</text><text class="mlp-node-value" x="' + p.x + '" y="' + (p.y + 45) + '" text-anchor="middle"></text></g>' +
      (k ? '<g data-mlp-bias="' + (model.layers[k - 1].biasOffset + i) + '" role="button" tabindex="0"><circle cx="' + (p.x + 28) + '" cy="' + (p.y - 27) + '" r="13"/><text x="' + (p.x + 28) + '" y="' + (p.y - 23) + '" text-anchor="middle">b</text></g>' : '')).join('');
  }).join('');
  svg.innerHTML = '<g class="mlp-edges">' + edges + '</g><g class="mlp-neurons">' + nodes + '</g>';
  return { svg, edges: [...svg.querySelectorAll('[data-mlp-edge]')], neurons: [...svg.querySelectorAll('[data-mlp-neuron]')], biases: [...svg.querySelectorAll('[data-mlp-bias]')] };
}

export function selectionNeuron(model, selection) {
  if (selection.kind === 'neuron') return { layer: selection.layer, neuron: selection.neuron };
  const k = model.layers.findIndex(l => selection.index >= l.offset && selection.index < l.biasOffset + l.nout);
  const l = model.layers[k];
  return { layer: k + 1, neuron: selection.index >= l.biasOffset ? selection.index - l.biasOffset : Math.floor((selection.index - l.offset) / l.nin) };
}

export function updateDiagram(diagram, model, ws, selection, phaseLayer = -1) {
  const current = selectionNeuron(model, selection);
  diagram.edges.forEach(edge => {
    const index = +edge.dataset.mlpEdge, value = model.params[index], selected = selection.kind === 'edge' && selection.index === index;
    const line = edge.querySelector('.mlp-edge-line');
    line.style.stroke = tone(value); line.style.strokeWidth = String(1.5 + 2 * Math.abs(value));
    line.style.strokeDasharray = value === 0 ? '3 5' : '';
    edge.classList.toggle('selected', selected);
    edge.setAttribute('aria-pressed', String(selected));
    edge.setAttribute('aria-label', 'Вес связи ' + (index + 1) + ': ' + format(value));
    edge.querySelector('text').textContent = 'w = ' + format(value);
  });
  diagram.neurons.forEach(node => {
    const [k, i] = node.dataset.mlpNeuron.split(':').map(Number), value = ws.a[k][i];
    node.querySelector('circle').style.fill = tone(value);
    node.querySelector('.mlp-node-value').textContent = format(value);
    node.classList.toggle('selected', current.layer === k && current.neuron === i);
    node.classList.toggle('propagating', phaseLayer === k);
    node.setAttribute('aria-pressed', String(selection.kind === 'neuron' && current.layer === k && current.neuron === i));
    node.setAttribute('aria-label', (k ? 'Слой ' + k + ', нейрон ' : 'Вход ') + (i + 1) + ': значение ' + format(value));
  });
  diagram.biases.forEach(node => {
    const index = +node.dataset.mlpBias;
    node.classList.toggle('selected', selection.kind === 'bias' && selection.index === index);
    node.setAttribute('aria-label', 'Смещение ' + (index + 1) + ': ' + format(model.params[index]));
    node.setAttribute('aria-pressed', String(selection.kind === 'bias' && selection.index === index));
  });
  model.layers.forEach((l, k) => { diagram.svg.querySelector('[data-mlp-layer-caption="' + (k + 1) + '"]').textContent = l.nout + ' · ' + activationName(l.activation); });
}

export function inspectorHTML(model, ws, selection) {
  const { layer, neuron } = selectionNeuron(model, selection);
  if (!layer) return '<h2>Вход x' + sub(neuron + 1) + '</h2><p>Одно из двух чисел выбранного примера. Оно поступает в первый слой без изменения.</p><div class="mlp-inspector-equation">x' + sub(neuron + 1) + ' = ' + format(ws.a[0][neuron]) + '</div>' + theoryLink('mlp-neuron');
  const l = model.layers[layer - 1], z = ws.z[layer - 1][neuron], a = ws.a[layer][neuron], bias = l.b[neuron];
  const heading = layer === model.layers.length ? 'Выходной нейрон' : 'Слой ' + layer + ' · нейрон ' + (neuron + 1);
  const end = '<dl><div><dt>Смещение b</dt><dd>' + format(bias) + '</dd></div><div><dt>Сумма z = Σ w·a + b</dt><dd>' + format(z) + '</dd></div><div><dt>' + (l.activation === 'relu' ? 'a = max(0, z)' : 'a = z') + '</dt><dd>' + format(a) + '</dd></div></dl>' + theoryLink('mlp-forward');
  if (selection.kind === 'edge') {
    const j = (selection.index - l.offset) % l.nin, input = ws.a[layer - 1][j], weight = model.params[selection.index];
    return '<h2>Вклад одной связи</h2><p>Из ' + (layer === 1 ? 'входа ' : 'нейрона ') + (j + 1) + ' в нейрон ' + (neuron + 1) + ' слоя ' + layer + '.</p><div class="mlp-inspector-equation">' + format(input) + ' × (' + format(weight) + ') = ' + format(input * weight) + '</div><p>Вход × вес — одно слагаемое суммы z. Остальные связи и смещение тоже участвуют в сумме.</p>' + end;
  }
  if (selection.kind === 'bias') return '<h2>Смещение нейрона</h2><p>' + heading + '. Смещение добавляется один раз после всех произведений и не умножается на вход.</p>' + end;
  return '<h2>' + heading + '</h2><p>Сначала произведения, затем сумма и активация.</p><table><thead><tr><th>Вход</th><th>Значение</th><th>Вес</th><th>Вклад</th></tr></thead><tbody>' +
    Array.from({ length: l.nin }, (_, j) => '<tr><th>' + (layer === 1 ? 'x' : 'a') + sub(j + 1) + '</th><td>' + format(ws.a[layer - 1][j]) + '</td><td>' + format(l.w[neuron * l.nin + j]) + '</td><td>' + format(ws.a[layer - 1][j] * l.w[neuron * l.nin + j]) + '</td></tr>').join('') + '</tbody></table>' + end;
}
