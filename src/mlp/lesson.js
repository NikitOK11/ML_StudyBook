import { createModel, forward } from './core.js?v=2';
import { validateConfig } from './config.js?v=2';
import { xorExamples } from './data.js?v=2';

// Fixed, inspectable coefficients: no random generator or optimizer is used.
export function createLessonModel(config) {
  const c = validateConfig(config);
  const model = createModel([2, ...c.hidden, 1], c.activation, 'regression');
  if (!c.hidden.length) {
    model.layers[0].w.set([1, -1]);
    return model;
  }
  const directions = [[1, -1], [-1, 1], [1, 1], [-1, -1]];
  model.layers.forEach((layer, index) => {
    if (index === 0) {
      for (let i = 0; i < layer.nout; i++) layer.w.set(directions[i], i * layer.nin);
    } else if (index === model.layers.length - 1) {
      layer.w.fill(1);
    } else {
      for (let i = 0; i < Math.min(layer.nin, layer.nout); i++) layer.w[i * layer.nin + i] = 1;
    }
  });
  return model;
}

// Forward-only buffers: no gradients or diagnostics.
export const forwardWorkspace = model => ({
  a: model.sizes.map(n => new Float64Array(n)),
  z: model.layers.map(layer => new Float64Array(layer.nout))
});

export function setActivation(model, activation) {
  if (!['relu', 'identity'].includes(activation)) throw new Error('Unsupported lesson activation');
  for (const layer of model.layers.slice(0, -1)) layer.activation = activation;
}

export function exampleOutputs(model) {
  const ws = forwardWorkspace(model);
  return xorExamples.map(example => forward(model, example.input, ws));
}
