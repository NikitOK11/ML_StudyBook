// Only this small, versioned configuration is persisted. Model buffers never are.
export const defaultConfig = Object.freeze({
  version: 1, dataset: 'xor', hidden: [8, 8], activation: 'tanh',
  lr: .08, batchSize: 32, l2: .0001,
  dataSeed: 42, initSeed: 7, orderSeed: 19,
  initialization: 'xavier-normal', uniformMin: -.5, uniformMax: .5,
  normalMean: 0, normalStd: 1, bias: 0
});
export const initializationNames = {
  zero: 'Нулевые веса', uniform: 'Равномерное · свои границы', normal: 'Нормальное · свои μ и σ',
  'xavier-normal': 'Xavier · нормальное', 'xavier-uniform': 'Xavier · равномерное',
  'he-normal': 'He · нормальное', 'he-uniform': 'He · равномерное'
};
const number = (value, fallback, min, max) => typeof value === 'number' && Number.isFinite(value) ? Math.max(min, Math.min(max, value)) : fallback;
export function validateConfig(input) {
  const c = input && typeof input === 'object' && !Array.isArray(input) && input.version === 1 ? input : {};
  const d = defaultConfig;
  const result = {
    version: 1,
    dataset: ['xor', 'circles', 'wave'].includes(c.dataset) ? c.dataset : d.dataset,
    hidden: Array.isArray(c.hidden) && c.hidden.length >= 1 && c.hidden.length <= 4 && c.hidden.every(n => Number.isInteger(n) && n >= 1 && n <= 16) ? [...c.hidden] : [...d.hidden],
    activation: ['relu', 'tanh', 'sigmoid'].includes(c.activation) ? c.activation : d.activation,
    initialization: Object.hasOwn(initializationNames, c.initialization) ? c.initialization : d.initialization,
    lr: number(c.lr, d.lr, .00001, 2), batchSize: Math.round(number(c.batchSize, d.batchSize, 1, 128)),
    l2: number(c.l2, d.l2, 0, 1), uniformMin: number(c.uniformMin, d.uniformMin, -20, 20),
    uniformMax: number(c.uniformMax, d.uniformMax, -20, 20), normalMean: number(c.normalMean, d.normalMean, -20, 20),
    normalStd: number(c.normalStd, d.normalStd, 0, 20), bias: number(c.bias, d.bias, -20, 20)
  };
  for (const key of ['dataSeed', 'initSeed', 'orderSeed']) result[key] = Math.floor(number(c[key], d[key], 0, 4294967295));
  if (result.uniformMin > result.uniformMax) [result.uniformMin, result.uniformMax] = [result.uniformMax, result.uniformMin];
  return result;
}

export function randomGenerator(seed) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6D2B79F5) | 0;
    let t = Math.imul(state ^ state >>> 15, 1 | state);
    t = (t + Math.imul(t ^ t >>> 7, 61 | t)) ^ t;
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}
export function normalRandom(rng) {
  return Math.sqrt(-2 * Math.log(Math.max(Number.MIN_VALUE, rng()))) * Math.cos(2 * Math.PI * rng());
}
