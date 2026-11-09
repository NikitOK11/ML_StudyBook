import { randomGenerator, normalRandom } from './config.js?v=2';

export const sigmoid = z => z >= 0 ? 1 / (1 + Math.exp(-z)) : Math.exp(z) / (1 + Math.exp(z));
export const binaryLoss = (z, y) => Math.max(z, 0) - z * y + Math.log1p(Math.exp(-Math.abs(z)));
export const activate = (z, kind) => kind === 'relu' ? Math.max(0, z) : kind === 'tanh' ? Math.tanh(z) : kind === 'sigmoid' ? sigmoid(z) : z;
export const derivative = (z, a, kind) => kind === 'relu' ? +(z > 0) : kind === 'tanh' ? 1 - a * a : kind === 'sigmoid' ? a * (1 - a) : 1;

export function distribution(config, fanIn, fanOut) {
  const method = config.initialization;
  if (method === 'zero') return { family: 'constant', mean: 0, variance: 0, value: 0 };
  if (method === 'uniform') return { family: 'uniform', min: config.uniformMin, max: config.uniformMax, mean: (config.uniformMin + config.uniformMax) / 2, variance: (config.uniformMax - config.uniformMin) ** 2 / 12 };
  if (method === 'normal') return { family: 'normal', mean: config.normalMean, std: config.normalStd, variance: config.normalStd ** 2 };
  const variance = method.startsWith('he') ? 2 / fanIn : 2 / (fanIn + fanOut);
  return method.endsWith('uniform') ? { family: 'uniform', mean: 0, variance, min: -Math.sqrt(3 * variance), max: Math.sqrt(3 * variance) } : { family: 'normal', mean: 0, variance, std: Math.sqrt(variance) };
}

export function createModel(sizes, activation = 'tanh', task = 'binary') {
  let length = 0;
  const layers = sizes.slice(1).map((nout, l) => {
    const nin = sizes[l], offset = length, biasOffset = offset + nin * nout;
    length = biasOffset + nout;
    return { nin, nout, offset, biasOffset, activation: l === sizes.length - 2 ? (task === 'binary' ? 'sigmoid' : 'linear') : activation };
  });
  const params = new Float64Array(length);
  for (const l of layers) { l.w = params.subarray(l.offset, l.biasOffset); l.b = params.subarray(l.biasOffset, l.biasOffset + l.nout); }
  return { sizes: [...sizes], task, layers, params, revision: 0 };
}

export function initialize(model, config) {
  const rng = randomGenerator(config.initSeed);
  for (const l of model.layers) {
    const d = distribution(config, l.nin, l.nout);
    for (let i = 0; i < l.w.length; i++) l.w[i] = d.family === 'constant' ? 0 : d.family === 'normal' ? d.mean + d.std * normalRandom(rng) : d.min + rng() * (d.max - d.min);
    l.b.fill(config.bias);
  }
  model.revision++;
}

export function workspace(model) {
  return { a: model.sizes.map(n => new Float64Array(n)), z: model.layers.map(l => new Float64Array(l.nout)),
    delta: model.layers.map(l => new Float64Array(l.nout)), inputGradient: new Float64Array(model.sizes[0]) };
}

// Row-major W stores the column-vector convention W[out, in]. No allocation per pass.
export function forward(model, input, ws, offset = 0) {
  for (let j = 0; j < model.sizes[0]; j++) ws.a[0][j] = input[offset + j];
  for (let k = 0; k < model.layers.length; k++) {
    const l = model.layers[k], previous = ws.a[k], a = ws.a[k + 1], z = ws.z[k];
    for (let i = 0; i < l.nout; i++) {
      let sum = l.b[i];
      for (let j = 0; j < l.nin; j++) sum += l.w[i * l.nin + j] * previous[j];
      z[i] = sum; a[i] = activate(sum, l.activation);
    }
  }
  return ws.a[ws.a.length - 1][0];
}

// Adds one sample's data-loss gradient. Caller averages exactly once; no L2 here.
export function backward(model, target, ws, gradient) {
  const last = model.layers.length - 1;
  ws.delta[last][0] = ws.a[last + 1][0] - target;
  for (let k = last; k >= 0; k--) {
    const l = model.layers[k], delta = ws.delta[k];
    if (k < last) {
      const next = model.layers[k + 1];
      for (let i = 0; i < l.nout; i++) {
        let sum = 0;
        for (let j = 0; j < next.nout; j++) sum += next.w[j * next.nin + i] * ws.delta[k + 1][j];
        delta[i] = sum * derivative(ws.z[k][i], ws.a[k + 1][i], l.activation);
      }
    }
    for (let i = 0; i < l.nout; i++) {
      gradient[l.biasOffset + i] += delta[i];
      for (let j = 0; j < l.nin; j++) gradient[l.offset + i * l.nin + j] += delta[i] * ws.a[k][j];
    }
  }
  const first = model.layers[0];
  for (let j = 0; j < first.nin; j++) {
    let sum = 0;
    for (let i = 0; i < first.nout; i++) sum += first.w[i * first.nin + j] * ws.delta[0][i];
    ws.inputGradient[j] = sum;
  }
}

export function batchGradient(model, split, indices, start, count, l2, ws, gradient) {
  gradient.fill(0);
  let loss = 0;
  for (let i = 0; i < count; i++) {
    const row = indices ? indices[start + i] : start + i;
    const p = forward(model, split.x, ws, row * model.sizes[0]), y = split.y[row];
    loss += model.task === 'binary' ? binaryLoss(ws.z.at(-1)[0], y) : .5 * (p - y) ** 2;
    backward(model, y, ws, gradient);
  }
  for (let i = 0; i < gradient.length; i++) gradient[i] /= count;
  loss /= count;
  for (const l of model.layers) for (let j = 0; j < l.w.length; j++) {
    gradient[l.offset + j] += l2 * l.w[j]; loss += .5 * l2 * l.w[j] ** 2;
  }
  return loss;
}

export function metrics(model, split, ws) {
  let loss = 0, correct = 0, squared = 0;
  for (let i = 0; i < split.count; i++) {
    const p = forward(model, split.x, ws, i * model.sizes[0]), y = split.y[i];
    squared += (p - y) ** 2;
    loss += model.task === 'binary' ? binaryLoss(ws.z.at(-1)[0], y) : .5 * (p - y) ** 2;
    correct += +(+(p >= .5) === y);
  }
  return { loss: loss / split.count, accuracy: correct / split.count, rmse: Math.sqrt(squared / split.count) };
}
