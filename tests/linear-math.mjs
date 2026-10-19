import assert from 'node:assert/strict';
import { linearGradients, gradientStep, meanSquaredError } from '../src/algorithms.js';
import { linearDatasets } from '../src/data.js';

const sum = a => a.reduce((s, x) => s + x, 0);
const mean = a => sum(a) / a.length;
const close = (actual, expected, message, tolerance = 1e-9) =>
  assert.ok(Math.abs(actual - expected) <= tolerance * Math.max(1, Math.abs(expected)), `${message}: ${actual} ≠ ${expected}`);
const fit = (x, y) => {
  const mx = mean(x), my = mean(y);
  const sxx = sum(x.map(v => (v - mx) ** 2));
  if (sxx === 0) throw new Error('Unidentifiable slope');
  const a = sum(x.map((v, i) => (v - mx) * (y[i] - my))) / sxx;
  return { a, b: my - a * mx };
};

// Published four-point example, checked against the actual module's gradient.
const x = [1, 2, 3, 4], y = [2, 3, 5, 4];
const rows = x.map((v, i) => [v, y[i]]);
const optimum = fit(x, y);
close(optimum.a, .8, 'Worked slope');
close(optimum.b, 1.5, 'Worked intercept');
close(meanSquaredError(rows, .8, 1.5), .45, 'Worked MSE');
close(1 - 4 * .45 / sum(y.map(v => (v - mean(y)) ** 2)), .64, 'R²');
const atOptimum = linearGradients({ w: [.8], b: 1.5, reg: 0 }, rows);
close(atOptimum.weights[0], 0, 'Normal-equation residual for slope');
close(atOptimum.bias, 0, 'Normal-equation residual for intercept');
const first = gradientStep({ w: [0], b: 0, reg: 0, lr: .05, steps: 0 }, rows);
close(first.w[0], .975, 'First gradient step, slope');
close(first.b, .35, 'First gradient step, intercept');
assert.throws(() => fit([2, 2, 2], [1, 2, 5]), /Unidentifiable/);

// Check the chapter's MSE + lambda*||w||² convention by independent finite
// differences, on all real module datasets, including the correlated case.
for (const [name, dataset] of Object.entries(linearDatasets)) {
  for (const reg of [0, .07, .6]) {
    const model = { w: [.37, -.62, 1.15], b: -.21, reg };
    const objective = m => meanSquaredError(dataset.rows, m.w, m.b) + m.reg * sum(m.w.map(v => v * v));
    const actual = linearGradients(model, dataset.rows);
    const h = 1e-5;
    for (let j = 0; j <= model.w.length; j++) {
      const plus = { ...model, w: [...model.w] }, minus = { ...model, w: [...model.w] };
      if (j === model.w.length) { plus.b += h; minus.b -= h; }
      else { plus.w[j] += h; minus.w[j] -= h; }
      const numerical = (objective(plus) - objective(minus)) / (2 * h);
      close(j === model.w.length ? actual.bias : actual.weights[j], numerical, `${name}, lambda=${reg}, derivative ${j}`, 1e-7);
    }
    const duplicated = linearGradients(model, [...dataset.rows, ...dataset.rows]);
    actual.weights.forEach((value, j) => close(duplicated.weights[j], value, 'Duplicating data preserves MSE gradient'));
    close(duplicated.bias, actual.bias, 'No penalty on the intercept');
  }
}

// Exact expectation over every independent draw from a NON-Gaussian noise
// distribution with mean zero and variance one (3^4=81 outcomes). This verifies
// the stated scope: unbiasedness, covariance and E[SSE] do not need normality.
const noiseValues = [-Math.sqrt(1.5), 0, Math.sqrt(1.5)];
const samples = [];
for (let code = 0; code < 81; code++) {
  let digits = code;
  const noise = x.map(() => { const value = noiseValues[digits % 3]; digits = Math.floor(digits / 3); return value; });
  const observed = x.map((value, i) => 2 * value + 1 + noise[i]);
  const { a, b } = fit(x, observed);
  const sse = sum(x.map((value, i) => (observed[i] - a * value - b) ** 2));
  const competitor = a + observed[0] - 2 * observed[1] + observed[2];
  samples.push({ a, b, sse, competitor });
}
close(mean(samples.map(v => v.a)), 2, 'Unbiased slope with non-Gaussian noise');
close(mean(samples.map(v => v.b)), 1, 'Unbiased intercept');
close(mean(samples.map(v => (v.a - 2) ** 2)), .2, 'Var(slope)=1/Sxx');
close(mean(samples.map(v => (v.b - 1) ** 2)), 1.5, 'Var(intercept)');
close(mean(samples.map(v => (v.a - 2) * (v.b - 1))), -.5, 'Cov(slope,intercept)');
close(mean(samples.map(v => v.sse)), 2, 'Expected SSE=n-p');
close(mean(samples.map(v => v.competitor)), 2, 'Alternative linear estimator remains unbiased');
close(mean(samples.map(v => (v.competitor - 2) ** 2)) - .2, 6, 'Gauss–Markov variance gap = sigma²*||D||²');

// Matrix-vs-scalar analytical solution on the same data; solve two normal
// equations directly to detect an intercept order or normalization mistake.
const n=x.length, sx=sum(x), sxx=sum(x.map(v=>v*v)), sy=sum(y), sxy=sum(x.map((v,i)=>v*y[i]));
const determinant=n*sxx-sx*sx;
close((sxx*sy-sx*sxy)/determinant, optimum.b, 'Matrix intercept');
close((n*sxy-sx*sy)/determinant, optimum.a, 'Matrix slope');
const reg=.2;
const ridgeA=4/(5+n*reg), ridgeB=3.5-2.5*ridgeA;
const ridgeGradient=linearGradients({w:[ridgeA],b:ridgeB,reg},rows);
close(ridgeGradient.weights[0],0,'Ridge uses n*lambda in analytical solution');
close(ridgeGradient.bias,0,'Ridge intercept stays unpenalized');
const sigma2=.9,tau2=1.125;
close(sigma2/(n*tau2),reg,'Bayesian MSE lambda matches posterior scale');

// H = [[2,5],[5,15]] for beta=(b,a). Verify the spectral step bound.
const muMax=(17+Math.sqrt(269))/2;
const stable=gradientStep({w:[.8],b:1.5+1,reg:0,lr:1/muMax,steps:0},rows);
assert.ok(meanSquaredError(rows,stable.w,stable.b)<meanSquaredError(rows,[.8],2.5));
const direction=[5,muMax-2]; // eigenvector for muMax in (b,a) coordinates
const unstableStart={w:[.8+direction[1]],b:1.5+direction[0],reg:0,lr:2.1/muMax,steps:0};
const unstable=gradientStep(unstableStart,rows);
assert.ok(meanSquaredError(rows,unstable.w,unstable.b)>meanSquaredError(rows,unstableStart.w,unstableStart.b));

// The L1 proof uses MSE without 1/2: its exact scalar threshold is lambda/2.
for (const c of [-2, -.2, 0, .2, 2]) {
  for (const lambda of [0, .3, 1]) {
    const w = Math.sign(c) * Math.max(Math.abs(c) - lambda / 2, 0);
    const loss = value => (value - c) ** 2 + lambda * Math.abs(value);
    for (let value = -3; value <= 3; value += .01) assert.ok(loss(w) <= loss(value) + 1e-10);
    if (w !== 0) close(2 * (w - c) + lambda * Math.sign(w), 0, 'Nonzero Lasso coordinate');
    else assert.ok(2 * Math.abs(c) <= lambda + 1e-12, 'Zero Lasso coordinate subgradient');
  }
}

console.log('Passed linear mathematics: worked example, finite-difference gradients, exact noise moments, Gauss–Markov, ridge/MAP scaling, Lasso threshold and spectral step bound.');
