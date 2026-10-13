function unpackLinearRow(row) {
  return Array.isArray(row)
    ? { features: [row[0]], target: row[1] }
    : row;
}

function weightsOf(weights) {
  return Array.isArray(weights) ? weights : [weights];
}

function predictLinear(row, weights, bias) {
  const { features } = unpackLinearRow(row);
  return features.reduce((sum, feature, index) => sum + feature * weights[index], bias);
}

export function meanSquaredError(rows, weights, bias) {
  const vector = weightsOf(weights);
  return rows.reduce((sum, row) => {
    const { target } = unpackLinearRow(row);
    return sum + (predictLinear(row, vector, bias) - target) ** 2;
  }, 0) / rows.length;
}

export function linearGradients(model, rows) {
  const weights = weightsOf(model.w);
  const gradients = Array(weights.length).fill(0);
  let bias = 0;
  rows.forEach(row => {
    const { features, target } = unpackLinearRow(row);
    const error = predictLinear(row, weights, model.b) - target;
    features.forEach((feature, index) => { gradients[index] += error * feature; });
    bias += error;
  });
  return {
    weights: gradients.map((value, index) => 2 * value / rows.length + 2 * model.reg * weights[index]),
    bias: 2 * bias / rows.length
  };
}

export function gradientStep(model, rows) {
  const next = { ...model };
  const gradients = linearGradients(next, rows);
  const vector = weightsOf(next.w);
  const updated = vector.map((weight, index) => weight - next.lr * gradients.weights[index]);
  next.w = Array.isArray(next.w) ? updated : updated[0];
  next.b -= next.lr * gradients.bias;
  next.steps += 1;
  return next;
}

export const linearGradientTolerance = 1.5e-3;

export function linearConvergence(model, rows, tolerance = linearGradientTolerance) {
  const gradients = linearGradients(model, rows);
  const gradientNorm = Math.hypot(...gradients.weights, gradients.bias);
  return {
    gradients,
    gradientNorm,
    converged: Number.isFinite(gradientNorm) && gradientNorm <= tolerance
  };
}

export function trainLinear(model, rows, iterations = 5000, tolerance = linearGradientTolerance) {
  let next = { ...model, w: Array.isArray(model.w) ? [...model.w] : model.w };
  for (let index = 0; index < iterations; index += 1) {
    const current = linearConvergence(next, rows, tolerance);
    if (current.converged) return { ...next, converged: true, stopReason: 'gradient' };
    next = gradientStep(next, rows);
    const loss = meanSquaredError(rows, next.w, next.b);
    if (!Number.isFinite(loss)) return { ...next, converged: false, stopReason: 'diverged' };
  }
  const final = linearConvergence(next, rows, tolerance);
  return { ...next, converged: final.converged, stopReason: final.converged ? 'gradient' : 'limit' };
}

export function findNeighbors(points, target, settings, excludedIndex = null) {
  return points
    .map((point, index) => {
      const distance = settings.metric === 'manhattan'
        ? Math.abs(point.x - target.x) + Math.abs(point.y - target.y)
        : Math.hypot(point.x - target.x, point.y - target.y);
      return { ...point, index, distance };
    })
    .filter(point => point.index !== excludedIndex)
    .sort((left, right) => left.distance - right.distance);
}

export function knnPrediction(points, target, settings, excludedIndex = null) {
  const ranked = findNeighbors(points, target, settings, excludedIndex);
  const neighbors = ranked.slice(0, settings.k);
  const vote = neighbors.reduce((sum, item) => sum + (item.c ? 1 : -1), 0);
  return { neighbors, prediction: vote > 0 ? 1 : 0 };
}

// Логистическая регрессия оставляет линейный score z=wᵀx+b, но переводит его
// в вероятность через сигмоиду. BCE — отрицательный log-likelihood Бернулли.
export function sigmoid(value) {
  if (value >= 0) return 1 / (1 + Math.exp(-value));
  const exponent = Math.exp(value);
  return exponent / (1 + exponent);
}

export function logisticScore(row, model) {
  return row.features.reduce((sum, feature, index) => sum + feature * model.w[index], model.b);
}

export function logisticProbability(row, model) {
  return sigmoid(logisticScore(row, model));
}

export function binaryCrossEntropy(rows, model) {
  const epsilon = 1e-12;
  const dataLoss = rows.reduce((total, row) => {
    const probability = Math.min(1 - epsilon, Math.max(epsilon, logisticProbability(row, model)));
    return total - row.target * Math.log(probability) - (1 - row.target) * Math.log(1 - probability);
  }, 0) / rows.length;
  return dataLoss + model.reg * model.w.reduce((total, weight) => total + weight ** 2, 0);
}

export function logisticGradients(rows, model) {
  const weights = Array(model.w.length).fill(0);
  let bias = 0;
  rows.forEach(row => {
    const error = logisticProbability(row, model) - row.target;
    row.features.forEach((feature, index) => { weights[index] += error * feature; });
    bias += error;
  });
  return {
    weights: weights.map((value, index) => value / rows.length + 2 * model.reg * model.w[index]),
    bias: bias / rows.length
  };
}

export function logisticStep(rows, model) {
  const gradients = logisticGradients(rows, model);
  return { ...model, w: model.w.map((weight, index) => weight - model.lr * gradients.weights[index]), b: model.b - model.lr * gradients.bias, steps: model.steps + 1 };
}

export function logisticAccuracy(rows, model) {
  return rows.filter(row => Number(logisticProbability(row, model) >= .5) === row.target).length / rows.length;
}

export function trainLogistic(rows, model, iterations = 3000, tolerance = 8e-4) {
  let next = { ...model, w: [...model.w] };
  for (let index = 0; index < iterations; index += 1) {
    const gradients = logisticGradients(rows, next);
    if (Math.hypot(...gradients.weights, gradients.bias) <= tolerance) return { ...next, converged: true };
    next = logisticStep(rows, next);
  }
  return { ...next, converged: false };
}

export function impurity(rows, criterion) {
  if (!rows.length) return 0;
  const greenShare = rows.filter(row => row.c).length / rows.length;
  if (criterion === 'entropy') {
    const part = value => value ? -value * Math.log2(value) : 0;
    return part(greenShare) + part(1 - greenShare);
  }
  return 2 * greenShare * (1 - greenShare);
}

export function candidateSplits(rows, criterion, minLeaf) {
  const result = [];
  ['x', 'y'].forEach(feature => {
    const values = [...new Set(rows.map(row => row[feature]))].sort((left, right) => left - right);
    values.slice(0, -1).forEach((value, index) => {
      const threshold = (value + values[index + 1]) / 2;
      const left = rows.filter(row => row[feature] <= threshold);
      const right = rows.filter(row => row[feature] > threshold);
      if (left.length < minLeaf || right.length < minLeaf) return;
      const before = impurity(rows, criterion);
      const after = (left.length * impurity(left, criterion) + right.length * impurity(right, criterion)) / rows.length;
      result.push({ feature, threshold, left, right, before, after, drop: before - after });
    });
  });
  return result.sort((left, right) => right.drop - left.drop);
}

export function buildTree(rows, depth, settings, forcedRoot = null) {
  const base = {
    rows,
    depth,
    impurity: impurity(rows, settings.criterion),
    class: rows.filter(row => row.c).length >= rows.length / 2 ? 1 : 0
  };
  if (depth >= settings.depth || base.impurity === 0 || rows.length < settings.minLeaf * 2) return base;
  const choices = candidateSplits(rows, settings.criterion, settings.minLeaf);
  const best = forcedRoot && depth === 0
    ? choices.find(choice => choice.feature === forcedRoot.feature && Math.abs(choice.threshold - forcedRoot.threshold) < .01)
    : choices[0];
  if (!best) return base;
  return { ...base, split: best, left: buildTree(best.left, depth + 1, settings), right: buildTree(best.right, depth + 1, settings) };
}

export function countTreeNodes(tree) {
  return tree.split ? 1 + countTreeNodes(tree.left) + countTreeNodes(tree.right) : 1;
}

export function treeAccuracy(tree, rows) {
  const predict = point => {
    let node = tree;
    while (node.split) node = point[node.split.feature] <= node.split.threshold ? node.left : node.right;
    return node.class;
  };
  return rows.filter(point => predict(point) === point.c).length / rows.length;
}

// Линейный soft-margin SVM. Мы минимизируем средний hinge loss вместе с
// 1/2 ||w||² и используем его субградиент: в точке излома производная
// не единственна, но выбранный вариант корректен для шага оптимизации.
export function svmScore(point, weights, bias) {
  return weights[0] * point.x + weights[1] * point.y + bias;
}

export function svmMargin(point, weights, bias) {
  return point.c * svmScore(point, weights, bias);
}

export function svmObjective(points, model) {
  const hinge = points.reduce((sum, point) => sum + Math.max(0, 1 - svmMargin(point, model.w, model.b)), 0) / points.length;
  return .5 * model.w.reduce((sum, weight) => sum + weight ** 2, 0) + model.c * hinge;
}

export function svmGradients(points, model) {
  const gradients = [...model.w];
  let bias = 0;
  const active = [];
  points.forEach((point, index) => {
    if (svmMargin(point, model.w, model.b) >= 1) return;
    active.push(index);
    gradients[0] -= model.c * point.c * point.x / points.length;
    gradients[1] -= model.c * point.c * point.y / points.length;
    bias -= model.c * point.c / points.length;
  });
  return { weights: gradients, bias, active };
}

export function svmStep(points, model) {
  const gradients = svmGradients(points, model);
  return {
    ...model,
    w: model.w.map((weight, index) => weight - model.lr * gradients.weights[index]),
    b: model.b - model.lr * gradients.bias,
    steps: model.steps + 1
  };
}

export function trainSvm(points, model, iterations = 2000) {
  let next = { ...model, w: [...model.w] };
  for (let index = 0; index < iterations; index += 1) next = svmStep(points, next);
  return next;
}

export function svmPrediction(point, model) {
  return svmScore(point, model.w, model.b) >= 0 ? 1 : -1;
}

export function svmAccuracy(points, model) {
  return points.filter(point => svmPrediction(point, model) === point.c).length / points.length;
}
