import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('..', import.meta.url));
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:4176';
const server = process.env.TEST_BASE_URL ? null : spawn('python3', ['-m', 'http.server', '4176', '--bind', '127.0.0.1'], { cwd: root, stdio: 'ignore' });
let browser;
const artifacts = `${root}/tmp/mlp-qa`;
const storageKey = 'fitpredict-ml-textbook-v6';
try {
  for (let i = 0; i < 30; i++) { try { if ((await fetch(base)).ok) break; } catch {} await new Promise(r => setTimeout(r, 100)); }
  await mkdir(artifacts, { recursive: true });
  browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 1000 }, reducedMotion: 'reduce' });
  const page = await context.newPage(), errors = [], requests = [];
  page.on('pageerror', e => errors.push(e.message));
  page.on('request', r => requests.push(r.url()));
  await page.addInitScript(() => {
    window.mlpTest = { writes: 0, frames: new Set() };
    const save = Storage.prototype.setItem, raf = window.requestAnimationFrame, caf = window.cancelAnimationFrame;
    Storage.prototype.setItem = function (...args) { window.mlpTest.writes++; return save.apply(this, args); };
    window.requestAnimationFrame = callback => { const id = raf(time => { window.mlpTest.frames.delete(id); callback(time); }); window.mlpTest.frames.add(id); return id; };
    window.cancelAnimationFrame = id => { window.mlpTest.frames.delete(id); caf(id); };
  });
  const noOverflow = async () => assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1), 'Page has horizontal overflow');
  const measureVisual = () => page.evaluate(() => {
    const control = document.querySelector('[data-mlp-example]'), costs = [];
    for (let i = 0; i < 23; i++) {
      control.value = String(i); control.dispatchEvent(new Event('change', { bubbles: true }));
      if (i >= 3) costs.push(+document.querySelector('[data-mlp-mount]').dataset.paintMs);
    }
    costs.sort((a,b) => a-b);
    return { medianMs:costs[10], p95Ms:costs[19], frames:20, field:'80×60' };
  });
  const eRead = async expression => page.evaluate(async code => {
    const { getExperiment } = await import('./src/mlp/lab.js');
    const e = getExperiment(JSON.parse(localStorage.getItem('fitpredict-ml-textbook-v6')).mlp);
    return new Function('e', `return (${code})`)(e);
  }, expression);
  const openMlp = async () => {
    await page.locator('.topbar [data-route="map"]').click();
    await page.locator('[data-select-module="mlp"]').click();
    assert.equal(await page.locator('[data-mlp-network]').count(), 0, 'Selecting must not directly open the module');
    await page.locator('[data-action="open-module"]').click();
    await page.locator('[data-mlp-network]').waitFor();
  };
  const step = async () => { const n = +(await page.locator('[data-mlp-stat="steps"]').textContent()); await page.locator('[data-mlp-action="step"]').click(); await page.waitForFunction(expected => +document.querySelector('[data-mlp-stat="steps"]').textContent === expected, n + 1); };
  await page.goto(base); await page.locator('.intro-screen').waitFor();
  assert.ok(!requests.some(r => /mathjax|marked|mlp-theory\.md/.test(r)), 'Chapter dependencies loaded during onboarding');
  await page.evaluate(key => localStorage.setItem(key, JSON.stringify({ route: 'map', profile: { fullName: 'Сохранённый ученик', email: 'test@example.com' }, mlp: { version: -1, hidden: Array(10000).fill(999), params: Array(50000).fill(1) } })), storageKey);
  await page.reload(); await page.locator('.map-six').waitFor();
  assert.deepEqual(await page.locator('[data-select-module]').evaluateAll(nodes => nodes.map(n => n.dataset.selectModule)), ['knn', 'linear', 'logistic', 'tree', 'svm', 'mlp']);
  await page.screenshot({ path: `${artifacts}/map-desktop.png` });
  await openMlp();
  assert.equal(await page.locator('[data-mlp-stat="parameters"]').textContent(), '105');
  assert.equal(await page.locator('[data-mlp-live="lr"]').evaluate(n => n.checkValidity()), true);
  const defaultVisual = await measureVisual();
  assert.deepEqual(await page.evaluate(key => { const s = JSON.parse(localStorage.getItem(key)); return [s.profile.fullName, s.mlp.hidden, 'params' in s.mlp]; }, storageKey), ['Сохранённый ученик', [8, 8], false]);
  const initial = await eRead('Array.from(e.model.params)');
  const network = await page.locator('[data-mlp-network]').elementHandle();
  for (const action of ['forward', 'backward']) {
    await page.locator(`[data-mlp-action="${action}"]`).click();
    await page.waitForFunction(() => document.querySelector('[data-mlp-action="pause"]').disabled);
    assert.deepEqual(await eRead('Array.from(e.model.params)'), initial);
  }
  await page.locator('[data-mlp-neuron="1:0"]').focus(); await page.keyboard.press('Enter');
  assert.match(await page.locator('[data-mlp-inspector]').textContent(), /Взвешенная сумма/);
  await page.locator('[data-mlp-select-edge]').selectOption('0');
  await step();
  assert.ok(await network.evaluate(node => node.isConnected), 'A training step reconstructed the network DOM');
  assert.notDeepEqual(await eRead('Array.from(e.model.params)'), initial);
  assert.match(await page.locator('[data-mlp-inspector]').textContent(), /Последнее обновление батчем/);
  const update = await eRead('[e.previous[0], e.lastGradient[0], e.lastLr, e.model.params[0]]');
  assert.ok(Math.abs(update[0] - update[1] * update[2] - update[3]) < 1e-12);
  await page.locator('[data-mlp-edit] input').fill('0.123'); await page.locator('[data-mlp-edit] button').click();
  assert.equal(await eRead('e.model.params[0]'), .123);
  assert.match(await page.locator('[data-mlp-inspector]').textContent(), /0\.1230/);
  const biasIndex = await eRead('e.model.layers[0].biasOffset');
  await page.locator(`svg [data-mlp-bias="${biasIndex}"]`).focus(); await page.keyboard.press('Enter');
  assert.match(await page.locator('[data-mlp-inspector]').textContent(), /смещение/);
  await page.locator('[data-mlp-action="reset"]').click(); assert.deepEqual(await eRead('Array.from(e.model.params)'), initial);
  const writes = await page.evaluate(() => mlpTest.writes);
  await page.locator('[data-mlp-action="train"]').click();
  await page.waitForFunction(() => +document.querySelector('[data-mlp-stat="steps"]').textContent > 100);
  await page.locator('[data-mlp-action="pause"]').click();
  const stopped = await eRead('e.steps'); await page.waitForTimeout(150); assert.equal(await eRead('e.steps'), stopped);
  assert.equal(await page.evaluate(() => mlpTest.writes), writes, 'Training serialized model state');
  assert.ok(await network.evaluate(node => node.isConnected), 'Continuous training rebuilt the network DOM');
  await network.dispose();
  assert.equal(await page.evaluate(() => mlpTest.frames.size), 0);
  assert.equal(await eRead('e.metricsRevision === e.model.revision'), true);
  await page.locator('.mlp-settings summary').click();
  await page.screenshot({ path: `${artifacts}/lab-desktop.png`, fullPage: true });

  // Navigation disposes the running loop but keeps the in-tab experiment.
  await page.locator('[data-mlp-action="train"]').click();
  await page.locator('[data-theory-section="mlp-backprop"]').first().click();
  await page.locator('[data-typeset="ready"]').waitFor({ timeout: 30000 });
  await page.locator('.mlp-chapter img').evaluateAll(images => Promise.all(images.map(image => { image.loading = 'eager'; return image.decode(); })));
  const leavingStep = await eRead('e.steps'); await page.waitForTimeout(150); assert.equal(await eRead('e.steps'), leavingStep);
  const chapterAudit = await page.locator('.mlp-chapter').evaluate(article => ({
    headings: [...article.querySelectorAll('h2')].map(n => n.id), formulas: article.querySelectorAll('mjx-container').length,
    errors: article.querySelectorAll('[data-mjx-error],mjx-merror').length,
    rawMath: /\$\$|\\begin\{|\\frac\{/.test(article.innerText),
    images: [...article.querySelectorAll('img')].map(img => img.complete && img.naturalWidth > 0)
  }));
  assert.ok(chapterAudit.headings.length >= 28); assert.equal(new Set(chapterAudit.headings).size, chapterAudit.headings.length); assert.ok(chapterAudit.headings.every(Boolean));
  assert.ok(chapterAudit.formulas > 200); assert.equal(chapterAudit.errors, 0); assert.equal(chapterAudit.rawMath, false);
  assert.ok(chapterAudit.images.every(Boolean)); await noOverflow();
  await page.waitForTimeout(50);
  assert.ok(await page.locator('#mlp-backprop').evaluate(n => Math.abs(n.getBoundingClientRect().top - 24) < 50), 'Exact theory section was not opened');
  await page.screenshot({ path: `${artifacts}/theory-backprop.png` });
  const equation = await page.locator('.mlp-chapter mjx-container').first().elementHandle();
  await page.locator('[data-mlp-toc-toggle]').click();
  assert.ok(await equation.evaluate(n => n.isConnected), 'Collapsing the outline re-typeset the chapter');
  await equation.dispose();
  await page.locator('[data-mlp-toc-toggle]').click();
  const returnButton = await page.locator('.mlp-reading-nav [data-route="mlp"]').boundingBox(), collapseButton = await page.locator('[data-mlp-toc-toggle]').boundingBox();
  assert.ok(returnButton.y < collapseButton.y && returnButton.height > collapseButton.height);
  // Allowlist removes executable markup and remote images while retaining math and details.
  const sanitized = await page.evaluate(async () => (await import('./src/mlp/theory-loader.js')).safeMarkdown('<script>alert(1)</script>\n\n<img src="https://example.com/x" onerror="alert(1)">\n\n<a href="javascript:alert(1)">x</a>\n\n$W_{ij}$'));
  assert.ok(!/script>|onerror|javascript:|https:\/\/example/.test(sanitized)); assert.match(sanitized, /mlp-inline-math/);
  await page.locator('.mlp-reading-nav [data-route="mlp"]').click(); await page.locator('[data-mlp-network]').waitFor();
  assert.equal(await eRead('e.steps'), leavingStep);
  assert.equal(await page.evaluate(() => mlpTest.frames.size), 0);

  await page.locator('[data-mlp-action="dataset"]').click(); await page.locator('.dataset-profile-screen').waitFor();
  assert.match(await page.locator('.dataset-profile-screen').textContent(), /128/);
  await page.locator('.dataset-profile-screen [data-route="mlp"]').click(); await page.locator('[data-mlp-network]').waitFor();
  const form = page.locator('[data-mlp-config]');
  for (const method of ['zero', 'uniform', 'normal', 'xavier-normal', 'xavier-uniform', 'he-normal', 'he-uniform']) {
    await form.locator('[name="initialization"]').selectOption(method);
    if (method === 'uniform') { await form.locator('[name="uniformMin"]').fill('-0.2'); await form.locator('[name="uniformMax"]').fill('0.3'); }
    if (method === 'normal') { await form.locator('[name="normalMean"]').fill('0.1'); await form.locator('[name="normalStd"]').fill('0.4'); }
    await form.locator('[type="submit"]').click();
    assert.equal(await page.locator('[data-mlp-stat="steps"]').textContent(), '0');
    const first = await eRead('Array.from(e.model.params)');
    await form.locator('[type="submit"]').click(); assert.deepEqual(await eRead('Array.from(e.model.params)'), first);
    assert.equal(await page.evaluate(() => mlpTest.frames.size), 0, 'Initialization left an active loop');
  }
  await form.locator('[name="layers"]').fill('4'); await form.locator('[name="layers"]').dispatchEvent('change');
  for (let i = 0; i < 4; i++) await form.locator(`[name="width${i}"]`).fill('16');
  await form.locator('[name="activation"]').selectOption('relu'); await form.locator('[name="initialization"]').selectOption('he-normal'); await form.locator('[name="bias"]').fill('0');
  await form.locator('[type="submit"]').click();
  assert.equal(await page.locator('[data-mlp-stat="parameters"]').textContent(), '881');
  assert.equal(await page.locator('[data-mlp-edge-mode]').inputValue(), 'selected');
  await page.locator('[data-mlp-action="train"]').click(); await page.waitForTimeout(400); await page.locator('[data-mlp-action="pause"]').click();
  await noOverflow();
  const largeVisual = await measureVisual();

  // Exact workload measurements, with time and resource observations retained as artifacts.
  const performanceResults = await page.evaluate(async () => {
    const { Experiment } = await import('./src/mlp/core.js'); const { validateConfig, defaultConfig } = await import('./src/mlp/config.js'); const { makeDataset } = await import('./src/mlp/data.js');
    const workloads = [];
    for (const hidden of [[8, 8], [16, 16, 16, 16]]) {
      const c = validateConfig({ ...defaultConfig, hidden }), e = new Experiment(c, makeDataset('xor', 42));
      for (let i = 0; i < 50; i++) e.step();
      const start = performance.now(); for (let i = 0; i < 500; i++) e.step(); const duration = performance.now() - start;
      workloads.push({ rows:128, validation:64, architecture: e.model.sizes, batch:32, parameters:e.model.params.length, stepsPerSecond:Math.round(500000/duration), buffers:e.bufferBytes });
    }
    return workloads;
  });
  const cdp = await context.newCDPSession(page);
  // Let style/layout and the browser's native DOM GC settle before sampling.
  await page.waitForTimeout(200); await cdp.send('HeapProfiler.collectGarbage');
  const beforeResources = await cdp.send('Memory.getDOMCounters'); const beforeHeap = await cdp.send('Runtime.getHeapUsage');
  const beforeAttached = await page.evaluate(() => document.querySelectorAll('*').length);
  for (let i = 0; i < 8; i++) { await openMlp(); await page.locator('[data-mlp-config] [type="submit"]').click(); }
  await page.waitForTimeout(200); await cdp.send('HeapProfiler.collectGarbage'); const afterResources = await cdp.send('Memory.getDOMCounters'); const afterHeap = await cdp.send('Runtime.getHeapUsage');
  const afterAttached = await page.evaluate(() => document.querySelectorAll('*').length);
  console.log('RESOURCE AUDIT', { beforeResources, afterResources, beforeAttached, afterAttached, heapDelta:afterHeap.usedSize-beforeHeap.usedSize });
  assert.ok(afterResources.jsEventListeners <= beforeResources.jsEventListeners + 10, 'Event listeners accumulated across mounts');
  assert.ok(afterResources.nodes <= beforeResources.nodes + 100, 'Detached UI nodes accumulated across mounts');
  assert.equal(await page.evaluate(() => mlpTest.frames.size), 0);
  await writeFile(`${artifacts}/performance.json`, JSON.stringify({ workloads: performanceResults, defaultVisual, largeVisual, beforeResources, afterResources, beforeHeap, afterHeap, chapterAudit }, null, 2));

  // Regression preset and mobile laboratory, then all six map vertices and chapter.
  await form.locator('[name="dataset"]').selectOption('wave'); await form.locator('[name="layers"]').fill('2'); await form.locator('[name="layers"]').dispatchEvent('change');
  await form.locator('[name="width0"]').fill('8'); await form.locator('[name="width1"]').fill('8'); await form.locator('[name="activation"]').selectOption('tanh'); await form.locator('[name="initialization"]').selectOption('xavier-normal'); await form.locator('[type="submit"]').click();
  assert.equal(await eRead('e.dataset.task'), 'regression'); await step();
  await page.setViewportSize({ width:390, height:844 });
  await noOverflow(); await page.screenshot({ path:`${artifacts}/lab-mobile.png`, fullPage:true });
  await page.locator('.topbar [data-route="map"]').click();
  for (const node of await page.locator('[data-select-module]').all()) { await node.scrollIntoViewIfNeeded(); const box = await node.boundingBox(); assert.ok(box.x >= 0 && box.x + box.width <= 391); }
  await noOverflow(); await page.screenshot({ path:`${artifacts}/map-mobile.png`, fullPage:true });
  await openMlp(); await page.locator('[data-theory-section="mlp-start"]').click(); await page.locator('[data-typeset="ready"]').waitFor(); await noOverflow();
  await page.locator('[data-mlp-toc] a[href="#mlp-worked"]').click(); await page.screenshot({ path:`${artifacts}/theory-mobile.png` });
  await page.locator('.mlp-chapter details').first().evaluate(n => { n.open = true; }); await noOverflow();
  assert.equal(requests.filter(r => r.endsWith('/vendor/mathjax/tex-svg.js')).length, 1, 'MathJax loaded more than once');
  assert.ok(requests.every(url => !url.startsWith('http') || new URL(url).origin === new URL(base).origin), 'A runtime dependency used an external origin');
  // A stale chapter fetch must never replace the map after navigation.
  const racePage = await context.newPage();
  racePage.on('pageerror', e => errors.push(e.message));
  await racePage.route('**/src/mlp-theory.md', async route => { await new Promise(r => setTimeout(r, 250)); await route.continue().catch(() => {}); });
  await racePage.goto(base); await racePage.locator('[data-mlp-mount]').waitFor();
  await racePage.locator('.topbar [data-route="map"]').click(); await racePage.waitForTimeout(400); assert.equal(await racePage.locator('.map-six').count(), 1);
  await racePage.close();
  // A failed local chapter request has a usable retry/return state.
  const errorPage = await context.newPage();
  await errorPage.goto(base); await errorPage.evaluate(key => localStorage.setItem(key, JSON.stringify({ route:'mlp-theory' })), storageKey);
  await errorPage.route('**/src/mlp-theory.md', route => route.fulfill({ status:503, body:'Temporarily unavailable' }));
  await errorPage.reload(); await errorPage.locator('[role="alert"]').waitFor();
  assert.match(await errorPage.locator('[role="alert"]').textContent(), /Повторить/);
  await errorPage.locator('[role="alert"] [data-route="mlp"]').click(); await errorPage.locator('[data-mlp-network]').waitFor();
  await errorPage.close();
  const animationContext = await browser.newContext({ viewport:{width:1440,height:1000}, reducedMotion:'no-preference' });
  const animationPage = await animationContext.newPage(); animationPage.on('pageerror', e => errors.push(e.message));
  await animationPage.goto(base); await animationPage.evaluate(key => localStorage.setItem(key, JSON.stringify({route:'mlp'})), storageKey); await animationPage.reload();
  await animationPage.locator('[data-mlp-network]').waitFor();
  await animationPage.evaluate(() => {
    window.phaseEvents=[];
    window.phaseObserver=new MutationObserver(() => {
      const phase=document.querySelector('[data-mlp-network]')?.dataset.phase;
      if (phase && phaseEvents.at(-1)?.phase!==phase) phaseEvents.push({phase,step:+document.querySelector('[data-mlp-stat="steps"]').textContent});
    });
    phaseObserver.observe(document.querySelector('[data-mlp-network]'),{attributes:true,attributeFilter:['data-phase']});
  });
  await animationPage.locator('[data-mlp-action="step"]').click();
  await animationPage.waitForFunction(() => document.querySelector('[data-mlp-network]').dataset.phase==='backward');
  await animationPage.locator('.mlp-network-head').scrollIntoViewIfNeeded();
  await animationPage.screenshot({path:`${artifacts}/backward-animation.png`});
  await animationPage.waitForFunction(() => document.querySelector('[data-mlp-stat="steps"]').textContent==='1');
  assert.deepEqual(await animationPage.evaluate(() => {phaseObserver.disconnect();return phaseEvents;}),[{phase:'forward',step:0},{phase:'backward',step:0},{phase:'update',step:0}]);
  await animationContext.close();
  assert.deepEqual(errors, []);
  console.log(JSON.stringify({ chapter:chapterAudit.headings.length, formulas:chapterAudit.formulas, performance:performanceResults, defaultVisual, largeVisual, beforeResources, afterResources }, null, 2));
  console.log('MLP browser flows passed: navigation, inspection, computation, initialization, persistence, resources, theory and mobile.');
} finally { await browser?.close(); server?.kill(); }
