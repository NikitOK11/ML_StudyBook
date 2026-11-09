import {chromium} from 'playwright';
import {spawn} from 'node:child_process';
import {mkdir} from 'node:fs/promises';
import assert from 'node:assert/strict';
const cwd=process.cwd(),server=spawn('python3',['-m','http.server','4178','--bind','127.0.0.1'],{cwd,stdio:'ignore'});await new Promise(r=>setTimeout(r,500));
const b=await chromium.launch();const p=await b.newPage({viewport:{width:1280,height:900}}),errors=[];p.on('pageerror',e=>errors.push(e.message));
try{await mkdir('tmp/formula-qa',{recursive:true});for(const name of ['linear','knn','logistic','tree','svm']){
await p.goto('http://127.0.0.1:4178');await p.evaluate(name=>localStorage.setItem('fitpredict-ml-textbook-v6',JSON.stringify({route:name+'-theory'})),name);await p.reload();
await p.waitForFunction(()=>document.querySelectorAll('.math-display').length>0&&[...document.querySelectorAll('.math-display')].every(n=>n.querySelector('mjx-container')),{},{timeout:60000});
assert.equal(await p.locator('[data-mjx-error],mjx-merror').count(),0);console.log(name,await p.locator('.math-display').count());await p.locator(name==='linear'?'#linear-analytic':'.math-display').first().scrollIntoViewIfNeeded();await p.screenshot({path:'tmp/formula-qa/'+name+'.png'});
await p.setViewportSize({width:390,height:844});assert.ok(await p.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await p.setViewportSize({width:1280,height:900});
}
await p.evaluate(async()=>{const {mathHTML}=await import('/src/math/renderer.js');const box=document.createElement('div');box.id='dynamic-math-check';box.innerHTML=mathHTML(String.raw`\frac{1}{1+e^{-z}}`);document.querySelector('#app').append(box);});
await p.locator('#dynamic-math-check mjx-container').waitFor();
assert.equal(await p.locator('script[src*="mathjax/tex-svg"]').count(),1);
await p.locator('.topbar [data-route="map"]').click();
assert.equal(await p.locator('#dynamic-math-check').count(),0);
assert.deepEqual(errors,[]);}finally{await b.close();server.kill();}
