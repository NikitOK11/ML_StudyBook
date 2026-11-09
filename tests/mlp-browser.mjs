import assert from 'node:assert/strict';
import { spawn } from 'node:child_process';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const root = fileURLToPath(new URL('..', import.meta.url));
const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:4176';
const server = process.env.TEST_BASE_URL ? null : spawn('python3', ['-m','http.server','4176','--bind','127.0.0.1'], { cwd:root, stdio:'ignore' });
const artifacts = root + '/tmp/mlp-intro-qa', storageKey = 'fitpredict-ml-textbook-v6';
let browser;
try {
  for(let i=0;i<30;i++) { try {if((await fetch(base)).ok) break;} catch {} await new Promise(r=>setTimeout(r,100)); }
  await mkdir(artifacts,{recursive:true});
  browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
  context.setDefaultTimeout(15000);
  const page=await context.newPage(), errors=[], requests=[];
  page.on('pageerror',e=>errors.push(e.message));
  page.on('request',r=>requests.push(r.url()));
  await context.addInitScript(()=>{
    window.mlpTest={frames:new Set()};
    const raf=window.requestAnimationFrame,caf=window.cancelAnimationFrame;
    window.requestAnimationFrame=callback=>{const id=raf(t=>{mlpTest.frames.delete(id);callback(t)});mlpTest.frames.add(id);return id;};
    window.cancelAnimationFrame=id=>{mlpTest.frames.delete(id);caf(id)};
  });
  // Any accidental use of retained numerical training helpers fails the real UI.
  const core=await readFile(new URL('../src/mlp/core.js',import.meta.url),'utf8');
  const guardedCore=core.replace(/export function (initialize|backward|batchGradient|metrics)(\([^]*?\)\s*\{)/g,
    (_,name,args)=>'export function '+name+args+' throw new Error("Introductory lesson called '+name+'");');
  await context.route('**/src/mlp/core.js*',r=>r.fulfill({contentType:'text/javascript',body:guardedCore}));
  const noOverflow=async()=>assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),'Page overflow');
  const values=()=>page.locator('[data-mlp-example-output]').allTextContents();
  const weights=()=>page.locator('svg [data-mlp-edge],svg [data-mlp-bias]').evaluateAll(nodes=>nodes.map(n=>n.getAttribute('aria-label')));
  const openMlp=async()=>{
    await page.locator('.topbar [data-route="map"]').click();
    await page.locator('[data-select-module="mlp"]').click();
    assert.equal(await page.locator('[data-mlp-network]').count(),0);
    await page.locator('[data-action="open-module"]').click();
    await page.locator('[data-mlp-network]').waitFor();
  };
  await page.goto(base); await page.locator('.intro-screen').waitFor();
  assert.ok(!requests.some(r=>/mathjax|marked|mlp-theory\.md/.test(r)),'Math was loaded during onboarding');
  await page.evaluate(key=>localStorage.setItem(key,JSON.stringify({
    route:'dataset-profile',datasetProfile:{kind:'mlp'},profile:{fullName:'Сохранённый ученик',email:'test@example.com'},
    linear:{w:[1,2,3]},mlp:{version:1,hidden:[16,16],activation:'tanh',dataset:'wave',params:Array(50000).fill(1)}
  })),storageKey);
  await page.reload(); await page.locator('[data-mlp-network]').waitFor();
  assert.equal(await page.locator('.dataset-profile-screen').count(),0);
  assert.equal(await page.locator('[data-mlp-architecture]').textContent(),'2 → 2 → 1');
  assert.equal(await page.locator('[data-mlp-parameter-count]').textContent(),'Параметров: 9');
  assert.deepEqual(await values(),['0','1','1','0']);
  const initialWeights=await weights(), network=await page.locator('[data-mlp-network]').elementHandle();
  for(let i=0;i<4;i++){
    await page.locator('[data-mlp-example="'+i+'"]').click();
    assert.equal(await page.locator('[data-mlp-output]').textContent(),String([0,1,1,0][i]));
    assert.deepEqual(await weights(),initialWeights);
    assert.ok(await network.evaluate(n=>n.isConnected),'Example selection rebuilt the diagram');
  }
  await page.locator('[data-mlp-example="1"]').click();
  await page.locator('[data-mlp-neuron="1:0"]').focus(); await page.keyboard.press('Enter');
  assert.deepEqual(await page.locator('[data-mlp-inspector] tbody tr').allTextContents(),['x₁010','x₂1-1-1']);
  assert.deepEqual(await page.locator('[data-mlp-inspector] dd').allTextContents(),['0','-1','0']);
  await page.locator('[data-mlp-edge="1"]').focus(); await page.keyboard.press('Space');
  assert.match(await page.locator('[data-mlp-inspector]').textContent(),/1 × \(-1\) = -1/);
  await page.locator('[data-mlp-bias="4"]').focus(); await page.keyboard.press('Enter');
  assert.match(await page.locator('[data-mlp-inspector]').textContent(),/Смещение нейрона/);
  await page.locator('[data-mlp-activation="identity"]').click();
  assert.deepEqual(await values(),['0','0','0','0']); assert.deepEqual(await weights(),initialWeights);
  assert.ok(await network.evaluate(n=>n.isConnected),'Activation switching rebuilt the diagram');
  await page.locator('[data-mlp-activation="relu"]').click();
  assert.deepEqual(await values(),['0','1','1','0']); assert.deepEqual(await weights(),initialWeights);
  await page.locator('[data-mlp-action="forward"]').click();
  assert.equal(await page.evaluate(()=>mlpTest.frames.size),0,'Reduced motion should not animate');
  assert.deepEqual(await weights(),initialWeights); await network.dispose();

  await page.locator('[name="layers"]').selectOption('0');
  assert.equal(await page.locator('[data-mlp-neuron]').count(),3);
  assert.equal(await page.locator('[data-mlp-activation="relu"]').isDisabled(),true);
  assert.deepEqual(await values(),['0','-1','1','0']);
  await page.locator('[name="layers"]').selectOption('2');
  await page.locator('[data-mlp-setting="width"][data-layer="0"]').selectOption('4');
  await page.locator('[data-mlp-setting="width"][data-layer="1"]').selectOption('1');
  assert.deepEqual(await values(),['0','0','1','0']);
  assert.equal(await page.locator('[data-mlp-neuron]').count(),8);
  await page.locator('[data-mlp-neuron="2:0"]').click();
  await page.locator('[data-mlp-setting="width"][data-layer="1"]').selectOption('4');
  assert.equal(await page.locator('[data-mlp-neuron]').count(),11);
  await noOverflow();
  await page.locator('[data-mlp-action="reset"]').click();
  assert.deepEqual(await values(),['0','1','1','0']);
  assert.deepEqual(await weights(),initialWeights);
  assert.equal(await page.locator('[data-mlp-example="1"]').getAttribute('aria-pressed'),'true');
  const persisted=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),storageKey);
  assert.deepEqual(persisted.mlp,{version:2,hidden:[2],activation:'relu',example:1});
  assert.equal(persisted.profile.fullName,'Сохранённый ученик'); assert.deepEqual(persisted.linear.w,[1,2,3]);
  assert.ok(!/Обратный проход|Один вопрос|Скорость η|Паспорт инициализации|Размер батча|Эпох|Обучать|validation|learning rate|градиент/i.test(await page.locator('[data-mlp-lab]').innerText()));
  await page.locator('[data-mlp-neuron="1:0"]').click();
  await page.evaluate(()=>scrollTo(0,0));
  await page.screenshot({path:artifacts+'/lesson-desktop.png'});

  // The same Markdown lesson appears below the workbench, with exact links.
  await page.locator('.mlp-heading [data-mlp-section]').click();
  await page.locator('[data-typeset="ready"]').waitFor({timeout:30000});
  await page.locator('.mlp-chapter img').evaluateAll(images=>Promise.all(images.map(img=>{img.loading='eager';return img.decode();})));
  const chapter=await page.locator('.mlp-chapter').evaluate(n=>({
    ids:[...n.querySelectorAll('h2')].map(n=>n.id),formulas:n.querySelectorAll('mjx-container').length,
    errors:n.querySelectorAll('[data-mjx-error],mjx-merror').length,raw:/\$\$|\\begin\{|\\frac\{/.test(n.innerText)
  }));
  assert.equal(chapter.ids.length,11); assert.equal(new Set(chapter.ids).size,11); assert.ok(chapter.ids.every(Boolean));
  assert.ok(chapter.formulas>90); assert.equal(chapter.errors,0); assert.equal(chapter.raw,false);
  await page.locator('[data-mlp-toc] a[href="#mlp-worked"]').click();
  assert.ok(await page.locator('#mlp-worked').evaluate(n=>Math.abs(n.getBoundingClientRect().top-24)<5));
  await page.screenshot({path:artifacts+'/theory-desktop.png'});
  const equation=await page.locator('.mlp-chapter mjx-container').first().elementHandle();
  await page.locator('[data-mlp-toc-toggle]').click();
  assert.ok(await equation.evaluate(n=>n.isConnected)); await equation.dispose();
  await page.locator('[data-mlp-toc-toggle]').click();
  for(const id of await page.locator('[data-mlp-section]').evaluateAll(links=>links.map(n=>n.dataset.mlpSection))) assert.ok(chapter.ids.includes(id),'Broken theory link '+id);
  const sanitized=await page.evaluate(async()=> (await import('./src/mlp/theory-loader.js')).safeMarkdown('<script>alert(1)</script>\n\n<img src="https://example.com/x" onerror="alert(1)">\n\n<a href="javascript:alert(1)">x</a>\n\n$W_{ij}$'));
  assert.ok(!/script>|onerror|javascript:|https:\/\/example/.test(sanitized));
  assert.equal(requests.filter(r=>r.endsWith('/vendor/mathjax/tex-svg.js')).length,1);
  assert.ok(requests.every(url=>!url.startsWith('http')||new URL(url).origin===new URL(base).origin));

  // Repeated mounts: one event handler per owner; no background frame loops.
  await openMlp(); await page.locator('[data-mlp-action="reset"]').click();
  const cdp=await context.newCDPSession(page);
  await cdp.send('HeapProfiler.collectGarbage'); const before=await cdp.send('Memory.getDOMCounters');
  for(let i=0;i<8;i++) {await openMlp();await page.locator('[data-mlp-action="reset"]').click();}
  await cdp.send('HeapProfiler.collectGarbage'); const after=await cdp.send('Memory.getDOMCounters');
  assert.ok(after.jsEventListeners<=before.jsEventListeners+5,'Event listeners accumulated');
  assert.ok(after.nodes<=before.nodes+80,'DOM accumulated after navigation');
  assert.equal(await page.evaluate(()=>mlpTest.frames.size),0);

  await page.setViewportSize({width:390,height:844});
  await noOverflow(); await page.screenshot({path:artifacts+'/lesson-mobile.png'});
  await page.locator('[name="layers"]').selectOption('2');
  for(const control of await page.locator('[data-mlp-setting="width"]').all()) await control.selectOption('4');
  await noOverflow();
  assert.ok(await page.locator('.mlp-network-scroll').evaluate(n=>n.scrollWidth>n.clientWidth));
  await page.locator('[data-mlp-action="reset"]').click();
  await page.locator('.mlp-inspector').scrollIntoViewIfNeeded();
  await page.screenshot({path:artifacts+'/inspector-mobile.png'});
  await page.locator('.mlp-heading [data-mlp-section]').click();
  await page.locator('[data-typeset="ready"]').waitFor();
  await page.locator('[data-mlp-toc] a[href="#mlp-matrices"]').click(); await noOverflow();
  await page.screenshot({path:artifacts+'/theory-mobile.png'});
  await page.locator('.topbar [data-route="map"]').click();
  assert.deepEqual(await page.locator('[data-select-module]').evaluateAll(nodes=>nodes.map(n=>n.dataset.selectModule)),['knn','linear','logistic','tree','svm','mlp']);
  for(const node of await page.locator('[data-select-module]').all()) {
    await node.scrollIntoViewIfNeeded(); const box=await node.boundingBox();
    assert.ok(box.x>=0&&box.x+box.width<=391);
  }
  await noOverflow();

  // Persisted mlp-theory URLs still open the simplified material.
  await page.evaluate(key=>localStorage.setItem(key,JSON.stringify({route:'mlp-theory',profile:{fullName:'Ученик'}})),storageKey);
  await page.reload(); await page.locator('[data-typeset="ready"]').waitFor();
  assert.equal(await page.locator('.mlp-chapter h2').count(),11); await noOverflow();
  const back=await page.locator('.mlp-reading-nav [data-route="mlp"]').boundingBox(), collapse=await page.locator('[data-mlp-toc-toggle]').boundingBox();
  assert.ok(back.y<collapse.y&&back.height>collapse.height);
  await page.locator('.mlp-reading-nav [data-route="mlp"]').click(); await page.locator('[data-mlp-network]').waitFor();

  const motionContext=await browser.newContext({viewport:{width:1440,height:1000},reducedMotion:'no-preference'});
  motionContext.setDefaultTimeout(15000);
  await motionContext.addInitScript(key=>localStorage.setItem(key,JSON.stringify({route:'mlp'})),storageKey);
  const motionPage=await motionContext.newPage(); motionPage.on('pageerror',e=>errors.push(e.message));
  await motionPage.goto(base); await motionPage.locator('[data-mlp-network]').waitFor();
  await motionPage.evaluate(()=>{
    window.phases=[];window.watch=new MutationObserver(()=>{
      const phase=document.querySelector('[data-mlp-network]').dataset.phase;
      if(phase&&phases.at(-1)!==phase)phases.push(phase);
    });watch.observe(document.querySelector('[data-mlp-network]'),{attributes:true,attributeFilter:['data-phase']});
  });
  await motionPage.locator('[data-mlp-action="forward"]').click();
  await motionPage.waitForFunction(()=>!document.querySelector('[data-mlp-action="forward"]').disabled);
  assert.deepEqual(await motionPage.evaluate(()=>{watch.disconnect();return phases;}),['0','1','2']);
  await motionPage.locator('[data-mlp-action="forward"]').click();
  await motionPage.locator('[data-mlp-example="2"]').click();
  assert.equal(await motionPage.locator('[data-mlp-action="forward"]').isEnabled(),true);
  assert.equal(await motionPage.locator('[data-mlp-output]').textContent(),'1');
  await motionPage.locator('[data-mlp-action="forward"]').click();
  await motionPage.locator('.topbar [data-route="map"]').click();
  await motionPage.waitForTimeout(1200); assert.equal(await motionPage.locator('.map-six').count(),1);
  await motionContext.close();

  // Delayed or failing local Markdown never replaces a newer route.
  const extra=await browser.newContext();
  extra.setDefaultTimeout(15000);
  await extra.addInitScript(key=>localStorage.setItem(key,JSON.stringify({route:'mlp-theory'})),storageKey);
  const race=await extra.newPage(); race.on('pageerror',e=>errors.push(e.message));
  await race.route('**/src/mlp-theory.md*',async r=>{await new Promise(resolve=>setTimeout(resolve,300));await r.continue().catch(()=>{});});
  await race.goto(base); await race.locator('.topbar [data-route="map"]').click();
  await race.waitForTimeout(500); assert.equal(await race.locator('.map-six').count(),1);
  const retry=await extra.newPage(); let fail=true;
  await retry.route('**/src/mlp-theory.md*',r=>fail?r.fulfill({status:503,body:'unavailable'}):r.continue());
  await retry.goto(base); await retry.locator('[data-mlp-theory-retry]').waitFor();
  fail=false;await retry.locator('[data-mlp-theory-retry]').click(); await retry.locator('[data-typeset="ready"]').waitFor();
  assert.equal(await retry.locator('.mlp-chapter h2').count(),11); await extra.close();

  assert.deepEqual(errors,[]);
  await writeFile(artifacts+'/checks.json',JSON.stringify({chapter,before,after,errors},null,2));
  console.log('MLP introductory browser checks passed.',JSON.stringify({sections:chapter.ids.length,formulas:chapter.formulas,before,after}));
} finally {await browser?.close();server?.kill();}
