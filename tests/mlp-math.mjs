import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { defaultConfig, validateConfig } from '../src/mlp/config.js';
import { xorExamples } from '../src/mlp/data.js';
import { createLessonModel, forwardWorkspace, setActivation, exampleOutputs } from '../src/mlp/lesson.js';
import { createModel, initialize, workspace, forward, backward, batchGradient, metrics, activate, derivative, binaryLoss, sigmoid, distribution } from '../src/mlp/core.js';
import { createStore } from '../src/state.js';

const close = (a, b, tolerance = 1e-9) => assert.ok(Math.abs(a - b) <= tolerance * Math.max(1, Math.abs(a), Math.abs(b)), `${a} ≠ ${b}`);
// Numerical helpers remain tested independently of the introductory UI.
const cfg = patch => ({ initSeed: 7, initialization: 'xavier-normal', bias: 0, ...patch });

// Independent scalar calculation; no engine calls in the reference equations.
const z1 = .5 * .8 + (-.4) * (-.5) + .1, z2 = .3 * .8 + .2 * (-.5) - .2;
const a1 = Math.tanh(z1), a2 = Math.tanh(z2), logit = .7 * a1 - .6 * a2 + .05;
const probability = 1 / (1 + Math.exp(-logit)), delta = probability - 1;
const d1 = .7 * delta * (1 - a1 ** 2), d2 = -.6 * delta * (1 - a2 ** 2);
export const workedExample = { z1, z2, a1, a2, logit, probability, loss: -Math.log(probability), delta, d1, d2,
  gradients: [d1 * .8, d1 * -.5, d2 * .8, d2 * -.5, d1, d2, delta * a1, delta * a2, delta] };
const initial = [.5, -.4, .3, .2, .1, -.2, .7, -.6, .05];
workedExample.updated = initial.map((p, i) => p - .1 * workedExample.gradients[i]);
const exampleModel = createModel([2, 2, 1], 'tanh'); exampleModel.params.set(initial);
const ew = workspace(exampleModel), eg = new Float64Array(9);
close(forward(exampleModel, [.8, -.5], ew), probability);
backward(exampleModel, 1, ew, eg);
eg.forEach((g, i) => close(g, workedExample.gradients[i]));
close(ew.z[0][0], z1); close(ew.z[0][1], z2); close(ew.z[1][0], logit);

for (const activation of ['tanh', 'sigmoid', 'relu']) for (const task of ['binary', 'regression']) {
  const m = createModel([2, 3, 2, 1], activation, task);
  initialize(m, cfg({ bias: .3 }));
  const ws = workspace(m), g = new Float64Array(m.params.length);
  const data = { x: new Float64Array([.2, -.4, .8, .1, -.3, .6]), y: new Float64Array(task === 'binary' ? [1, 0, 1] : [.4, -.7, .3]), count: 3 };
  const objective = () => {
    let loss = metrics(m, data, ws).loss;
    for (const l of m.layers) for (const w of l.w) loss += .5 * .07 * w * w;
    return loss;
  };
  batchGradient(m, data, null, 0, 3, .07, ws, g);
  for (let i = 0; i < m.params.length; i++) {
    const old = m.params[i], h = 1e-5;
    m.params[i] = old + h; const plus = objective();
    m.params[i] = old - h; const minus = objective(); m.params[i] = old;
    close(g[i], (plus - minus) / (2 * h), 3e-6);
  }
  // Average individual gradients, then add λW once, never to biases.
  const sum = new Float64Array(g.length);
  for (let i = 0; i < 3; i++) { forward(m, data.x, ws, i * 2); backward(m, data.y[i], ws, sum); }
  sum.forEach((v, i) => { sum[i] = v / 3; });
  for (const l of m.layers) l.w.forEach((w, j) => { sum[l.offset + j] += .07 * w; });
  sum.forEach((v, i) => close(g[i], v));
  // Derivative with respect to the input, using an independent perturbed loss.
  sum.fill(0); forward(m, data.x, ws); backward(m, data.y[0], ws, sum);
  const dx = [...ws.inputGradient];
  for (let j = 0; j < 2; j++) {
    const old = data.x[j], h = 1e-5;
    const loss = () => { const p = forward(m, data.x, ws); return task === 'binary' ? binaryLoss(ws.z.at(-1)[0], data.y[0]) : .5 * (p - data.y[0]) ** 2; };
    data.x[j] = old + h; const plus = loss(); data.x[j] = old - h; const minus = loss(); data.x[j] = old;
    close(dx[j], (plus - minus) / (2 * h), 1e-7);
  }
}
for (const kind of ['relu', 'tanh', 'sigmoid']) for (const z of [-3, -.2, .4, 2]) close(derivative(z, activate(z, kind), kind), (activate(z + 1e-5, kind) - activate(z - 1e-5, kind)) / 2e-5, 1e-8);
assert.equal(derivative(0, 0, 'relu'), 0);
for (const z of [-1e6, -1000, 0, 1000, 1e6]) for (const y of [0, 1]) { assert.ok(Number.isFinite(binaryLoss(z, y))); assert.ok(sigmoid(z) >= 0 && sigmoid(z) <= 1); }
close(binaryLoss(0, 0), Math.log(2)); close(binaryLoss(1000, 0), 1000);

for (const method of ['zero', 'uniform', 'normal', 'xavier-normal', 'xavier-uniform', 'he-normal', 'he-uniform']) {
  const c = cfg({ initialization: method, uniformMin: -2, uniformMax: 4, normalMean: 1, normalStd: .7 });
  const a = createModel([256, 256, 1]), b = createModel([256, 256, 1]);
  initialize(a, c); initialize(b, c); assert.deepEqual(a.params, b.params);
  const w = a.layers[0].w, d = distribution(c, 256, 256);
  const mean = w.reduce((s, v) => s + v, 0) / w.length, variance = w.reduce((s, v) => s + (v - mean) ** 2, 0) / w.length;
  // 65,536 samples: 6 standard errors of the mean, 4% variance tolerance.
  assert.ok(Math.abs(mean - d.mean) <= 6 * Math.sqrt(d.variance / w.length) + 1e-12);
  close(variance / (d.variance || 1), d.variance ? 1 : 0, .04);
  if (d.family === 'uniform') assert.ok(w.every(v => v >= d.min && v <= d.max));
  assert.ok(a.layers.every(l => l.b.every(v => v === 0)));
}

for (const act of ['relu', 'tanh', 'sigmoid']) {
  const model = createModel([2, 3, 1], act), ws = workspace(model), g = new Float64Array(model.params.length);
  forward(model, [.3, -.2], ws); backward(model, 1, ws, g);
  assert.ok(g.subarray(0, model.layers[0].biasOffset + 3).every(v => v === 0));
  close(g.at(-1), -.5); // Output bias learns even when every weight starts at zero.
  assert.ok(model.layers[1].w.every((_, j) => g[model.layers[1].offset + j] === (act === 'sigmoid' ? -.25 : 0)));
}
// Equal hidden neurons with nonzero parameters remain symmetric under full-batch SGD.
const symmetric = createModel([2, 2, 1], 'tanh'); symmetric.params.set([.2, -.1, .2, -.1, .1, .1, .3, .3, .05]);
const sx = { x: new Float64Array([.4, .8]), y: new Float64Array([1]), count: 1 };
const sg = new Float64Array(9), sw = workspace(symmetric);
for (let i = 0; i < 5; i++) { batchGradient(symmetric, sx, null, 0, 1, 0, sw, sg); symmetric.params.forEach((p, j) => { symmetric.params[j] = p - .1 * sg[j]; }); }
close(symmetric.params[0], symmetric.params[2]); close(symmetric.params[1], symmetric.params[3]); close(symmetric.params[6], symmetric.params[7]);
const randomModel = createModel([2, 3, 1], 'tanh'); initialize(randomModel, cfg({ bias: 0 }));
const rg = new Float64Array(randomModel.params.length); const rw = workspace(randomModel);
forward(randomModel, [.3, -.2], rw); backward(randomModel, 1, rw, rg);
assert.ok(rg.subarray(0, 6).some(v => Math.abs(v) > 1e-5));


// Exact reference coefficients and forward signals, all canonical XOR rows.
const reference = createLessonModel(defaultConfig), referenceBuffer = reference.params;
assert.deepEqual([...reference.params], [1,-1,-1,1,0,0,1,1,0]);
assert.deepEqual(exampleOutputs(reference), [0,1,1,0]);
assert.deepEqual(Object.keys(forwardWorkspace(reference)).sort(), ['a','z']);
const trace = forwardWorkspace(reference);
const rows = xorExamples.map(({input, target}) => {
  forward(reference, input, trace);
  return [...input, ...trace.z[0], ...trace.a[1], trace.a[2][0], target, 0];
});
assert.deepEqual(rows, [
  [0,0,0,0,0,0,0,0,0], [0,1,-1,1,0,1,1,1,0],
  [1,0,1,-1,1,0,1,1,0], [1,1,0,0,0,0,0,0,0]
]);
for (const input of [[3,0],[-2,3],[-.5,-1.5],[.4,.4]]) close(forward(reference,input,trace),Math.abs(input[0]-input[1]));
const parameters = [...reference.params];
setActivation(reference,'identity');
assert.equal(reference.params,referenceBuffer,'Activation switch must reuse the same parameter buffer');
assert.deepEqual([...reference.params],parameters);
assert.deepEqual(exampleOutputs(reference),[0,0,0,0]);
for (const input of [[3,0],[-2,3]]) close(forward(reference,input,trace),0);
setActivation(reference,'relu'); assert.deepEqual(exampleOutputs(reference),[0,1,1,0]);
assert.deepEqual([...reference.params],parameters);
assert.throws(()=>setActivation(reference,'sigmoid'));

const lessonConfig = patch => validateConfig({...defaultConfig,...patch});
assert.deepEqual(exampleOutputs(createLessonModel(lessonConfig({hidden:[]}))),[0,-1,1,0]);
assert.deepEqual(exampleOutputs(createLessonModel(lessonConfig({hidden:[1]}))),[0,0,1,0]);
assert.deepEqual(exampleOutputs(createLessonModel(lessonConfig({hidden:[3]}))),[0,2,2,2]);
assert.deepEqual(exampleOutputs(createLessonModel(lessonConfig({hidden:[2,2]}))),[0,1,1,0]);
assert.deepEqual(exampleOutputs(createLessonModel(lessonConfig({hidden:[4,1]}))),[0,0,1,0]);
assert.deepEqual(exampleOutputs(createLessonModel(lessonConfig({hidden:[1,4]}))),[0,0,1,0]);
for (const hidden of [[], ...[1,2,3,4].map(n=>[n]), ...[1,2,3,4].flatMap(a=>[1,2,3,4].map(b=>[a,b]))]) {
  for (const activation of ['relu','identity']) {
    const c=lessonConfig({hidden,activation}), model=createLessonModel(c), ws=forwardWorkspace(model);
    assert.deepEqual(model.params,createLessonModel(c).params);
    assert.equal(model.params.length,model.sizes.slice(1).reduce((p,n,i)=>p+n*(model.sizes[i]+1),0));
    for(const e of xorExamples) assert.ok(Number.isFinite(forward(model,e.input,ws)));
    assert.deepEqual(model.params,createLessonModel(c).params,'Selection/forward must never mutate parameters');
  }
}
for (const input of [undefined,null,'broken',{version:1,hidden:[16,16],activation:'tanh'},{version:2,hidden:Array(10000).fill(99),activation:'sigmoid',example:999}]) {
  assert.deepEqual(validateConfig(input),{version:2,hidden:[2],activation:'relu',example:1});
}
assert.deepEqual(validateConfig({...defaultConfig,hidden:[]}).hidden,[]);
const legacy = {version:1,hidden:[16,16],dataset:'wave',batchSize:128,params:Array(50000).fill(1)};
for (const route of ['mlp','dataset-profile']) {
  let saved=JSON.stringify({route,datasetProfile:{kind:'mlp',returnRoute:'mlp'},profile:{fullName:'Ученик',email:'user@example.com'},linear:{w:[1,2,3]},mlp:legacy});
  globalThis.localStorage={getItem:()=>saved,setItem:(_,value)=>{saved=value},removeItem:()=>{saved=null}};
  const store=createStore();
  assert.equal(store.get().route,'mlp'); assert.equal(store.get().datasetProfile,null);
  assert.deepEqual(store.get().mlp,{version:2,hidden:[2],activation:'relu',example:1});
  assert.equal(store.get().profile.fullName,'Ученик'); assert.deepEqual(store.get().linear.w,[1,2,3]);
  store.set({route:'mlp-theory'});
  assert.ok(saved.length<3000); assert.ok(!Object.hasOwn(JSON.parse(saved).mlp,'params'));
}
globalThis.localStorage={getItem(){throw Error('disabled')},setItem(){throw Error('disabled')},removeItem(){throw Error('disabled')}};
const memoryOnlyStore=createStore(); memoryOnlyStore.set({route:'mlp'}); assert.equal(memoryOnlyStore.get().route,'mlp');
delete globalThis.localStorage;

// Verify the visible Markdown table, not a hidden fixture.
const chapter=await readFile(new URL('../src/mlp-theory.md',import.meta.url),'utf8');
const worked=chapter.split('<a id="mlp-worked"></a>')[1].split('<a id="mlp-parameters"></a>')[0];
const published=[...worked.matchAll(/^\| ([\d -]+(?:\| [\d -]+){8})\|$/gm)].map(m=>m[1].split('|').map(v=>+v.trim()));
assert.deepEqual(published,rows,'Published forward table must match every actual intermediate value');
assert.ok(!/батч|backprop|оптимизатор|регуляризац|инициализац|градиент|Momentum|Adam|generalization/i.test(chapter));
console.log('MLP introductory lesson and retained numerical helpers: all checks passed.');
