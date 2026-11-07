/* Resumable SMO for the binary C-SVC dual. */
function kernel(a, b, kind, gamma, degree) {
  if (kind === 'rbf') {
    return Math.exp(-gamma * ((a.x - b.x) ** 2 + (a.y - b.y) ** 2));
  }
  const dot = a.x * b.x + a.y * b.y;
  return kind === 'poly' ? (gamma * dot + 1) ** degree : dot;
}

function sampleRbfGrid(xs, ys, support, gamma, bias) {
  const scores = ys.map(() => new Float64Array(xs.length).fill(bias));
  const horizontal = new Float64Array(xs.length);
  for (const vector of support) {
    // The Gaussian factors along the two axes, so each exponential can be reused.
    for (let column = 0; column < xs.length; column++) {
      horizontal[column] = Math.exp(-gamma * (xs[column] - vector.x) ** 2);
    }
    for (let row = 0; row < ys.length; row++) {
      const vertical = vector.alpha * vector.label * Math.exp(-gamma * (ys[row] - vector.y) ** 2);
      const values = scores[row];
      for (let column = 0; column < xs.length; column++) {
        values[column] += horizontal[column] * vertical;
      }
    }
  }
  return scores;
}

export function createSvmTrainer(points, { C = 1, gamma = .7, degree = 3, kind = 'linear', maxSweeps = 240, start } = {}) {
  const count = points.length;
  const alpha = new Float64Array(count);
  const errors = Float64Array.from(points, point => -point.label);
  const ready = new Set(points.map(point => point.label)).size === 2;
  const matrix = Array.from({ length: count }, () => new Float64Array(count));
  for (let i = 0; i < count; i++) {
    for (let j = 0; j <= i; j++) {
      matrix[i][j] = matrix[j][i] = kernel(points[i], points[j], kind, gamma, degree);
    }
  }

  const epsilon = 1e-7;
  const tolerance = 1e-3;
  const indices = points.map((_, index) => index);
  let bias = 0;
  if (start) {
    // Scaling every coefficient keeps the dual equality feasible when C decreases.
    const scale = Math.min(1, C / Math.max(...start.alpha));
    bias = start.bias * scale;
    for (let i = 0; i < count; i++) alpha[i] = start.alpha[i] * scale;
    for (let i = 0; i < count; i++) {
      errors[i] += bias;
      for (let j = 0; j < count; j++) {
        errors[i] += alpha[j] * points[j].label * matrix[i][j];
      }
    }
  }
  let idleSweeps = 0;
  let sweeps = 0;

  function updatePair(i, j) {
    const yi = points[i].label;
    const yj = points[j].label;
    const ai = alpha[i];
    const aj = alpha[j];
    const lower = yi === yj ? Math.max(0, ai + aj - C) : Math.max(0, aj - ai);
    const upper = yi === yj ? Math.min(C, ai + aj) : Math.min(C, C + aj - ai);
    if (upper - lower < 1e-10) return false;

    const curvature = matrix[i][i] + matrix[j][j] - 2 * matrix[i][j];
    const direction = yj * (errors[i] - errors[j]);
    let next = aj;
    if (curvature > 1e-12) {
      next = Math.min(upper, Math.max(lower, aj + direction / curvature));
    } else if (direction !== 0) {
      // With coincident points the objective along the segment is linear.
      next = direction > 0 ? upper : lower;
    }
    if (Math.abs(next - aj) < epsilon) return false;

    alpha[j] = next;
    alpha[i] = ai + yi * yj * (aj - next);
    const changeI = yi * (alpha[i] - ai);
    const changeJ = yj * (alpha[j] - aj);
    const oldBias = bias;
    const biasI = bias - errors[i] - changeI * matrix[i][i] - changeJ * matrix[i][j];
    const biasJ = bias - errors[j] - changeI * matrix[i][j] - changeJ * matrix[j][j];
    const insideBox = index => alpha[index] > epsilon && alpha[index] < C - epsilon;
    bias = insideBox(i) ? biasI : insideBox(j) ? biasJ : (biasI + biasJ) / 2;
    for (let k = 0; k < count; k++) {
      errors[k] += changeI * matrix[i][k] + changeJ * matrix[j][k] + bias - oldBias;
    }
    return true;
  }

  function* optimize() {
    while (idleSweeps < 12 && sweeps < maxSweeps) {
      sweeps++;
      let changed = false;
      for (let i = 0; i < count; i++) {
        const error = errors[i];
        const violation = points[i].label * error;
        if ((violation < -tolerance && alpha[i] < C - epsilon) ||
            (violation > tolerance && alpha[i] > epsilon)) {
          const candidates = indices.filter(j => j !== i).sort((a, b) =>
            Math.abs(error - errors[b]) - Math.abs(error - errors[a])
          );
          if (candidates.some(j => updatePair(i, j))) changed = true;
        }
        yield;
      }
      idleSweeps = changed ? 0 : idleSweeps + 1;
    }
  }

  const iterator = optimize();
  let done = !ready;

  function step(budgetMs = 8) {
    if (done) return;
    const deadline = performance.now() + budgetMs;
    // Yield after each coordinate so paint and slider events can run between chunks.
    do {
      done = iterator.next().done;
    } while (!done && performance.now() < deadline);
  }

  function snapshot() {
    const coefficients = alpha.slice();
    const intercept = bias;
    const support = points
      .map((point, index) => ({ ...point, alpha: coefficients[index] }))
      .filter(point => point.alpha > 1e-6);
    let predict;
    if (kind === 'linear') {
      const weights = points.reduce((sum, point, index) => {
        const factor = coefficients[index] * point.label;
        sum.x += factor * point.x;
        sum.y += factor * point.y;
        return sum;
      }, { x: 0, y: 0 });
      predict = point => weights.x * point.x + weights.y * point.y + intercept;
    } else {
      predict = point => {
        let score = intercept;
        for (const vector of support) {
          score += vector.alpha * vector.label * kernel(vector, point, kind, gamma, degree);
        }
        return score;
      };
    }
    const accuracy = ready ? points.filter(point => (predict(point) >= 0 ? 1 : -1) === point.label).length / count : null;
    function sampleGrid(xs, ys) {
      if (kind === 'rbf') return sampleRbfGrid(xs, ys, support, gamma, intercept);
      return ys.map(y => Float64Array.from(xs, x => predict({ x, y })));
    }
    return {
      alpha: coefficients, bias: intercept, support, predict, sampleGrid, accuracy, ready,
      limited: done && idleSweeps < 12 && sweeps >= maxSweeps
    };
  }

  return { step, snapshot, get done() { return done; } };
}
