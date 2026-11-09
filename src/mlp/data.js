import { randomGenerator, normalRandom } from './config.js';

export const datasetNames = { xor: 'XOR · разные знаки', circles: 'Концентрические окружности', wave: 'Нелинейная волна' };

export function makeDataset(kind, seed) {
  const rng = randomGenerator(seed);
  const regression = kind === 'wave';
  const dimensions = regression ? 1 : 2;
  const count = 128, validationCount = 64;
  const generate = n => {
    const x = new Float64Array(n * dimensions), y = new Float64Array(n);
    for (let i = 0; i < n; i++) {
      if (regression) {
        const t = -3 + 6 * rng();
        x[i] = t; y[i] = Math.sin(1.7 * t) + .2 * t + .04 * normalRandom(rng);
      } else if (kind === 'circles') {
        const label = i % 2, angle = 2 * Math.PI * rng();
        const radius = (label ? .55 : 1.35) + .06 * normalRandom(rng);
        x[i * 2] = radius * Math.cos(angle); x[i * 2 + 1] = radius * Math.sin(angle); y[i] = label;
      } else {
        const u = (i % 4 < 2 ? -1 : 1) * (.35 + .85 * rng());
        const v = (i % 2 ? 1 : -1) * (.35 + .85 * rng());
        x[i * 2] = u; x[i * 2 + 1] = v; y[i] = u * v < 0 ? 1 : 0;
      }
    }
    return { x, y, count: n };
  };
  const train = generate(count), validation = generate(validationCount);
  const mean = new Float64Array(dimensions), std = new Float64Array(dimensions);
  for (let j = 0; j < dimensions; j++) {
    for (let i = 0; i < count; i++) mean[j] += train.x[i * dimensions + j] / count;
    for (let i = 0; i < count; i++) std[j] += (train.x[i * dimensions + j] - mean[j]) ** 2 / count;
    std[j] = Math.sqrt(std[j]) || 1;
  }
  for (const split of [train, validation]) {
    split.raw = split.x.slice();
    for (let i = 0; i < split.count; i++) for (let j = 0; j < dimensions; j++) split.x[i * dimensions + j] = (split.x[i * dimensions + j] - mean[j]) / std[j];
  }
  return { kind, seed, title: datasetNames[kind], task: regression ? 'regression' : 'binary', dimensions,
    featureNames: regression ? ['Положение на оси'] : ['Горизонтальная координата', 'Вертикальная координата'],
    targetName: regression ? 'Значение волны' : 'Класс области', train, validation, mean, std };
}

export function datasetProfile(dataset) {
  const { train, dimensions, featureNames, task } = dataset;
  const rows = Array.from({ length: train.count }, (_, i) => Array.from(train.raw.subarray(i * dimensions, (i + 1) * dimensions)));
  const target = Array.from(train.y, y => task === 'binary' ? `Класс ${y}` : y);
  const description = `Синтетический пример · seed ${dataset.seed}. Показаны ${train.count} обучающих объектов; ${dataset.validation.count} проверочных объектов выделены отдельно. Здесь исходные признаки; сеть получает стандартизованные только по обучающей выборке.`;
  return { title: dataset.title, description, featureNames, rows, targetName: dataset.targetName,
    targetType: task === 'binary' ? 'categorical' : 'numeric', target,
    preview: { title: dataset.title, description, columns: [...featureNames, dataset.targetName], rows: rows.map((r, i) => [...r.map(v => v.toFixed(4)), target[i]]) } };
}
