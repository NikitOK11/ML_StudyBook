import assert from 'node:assert/strict';
import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { createHash } from 'node:crypto';
import { equations, equationSelector as selector } from './math-typesetting.mjs';

const escape = value => String(value).replace(/[&<>\"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const names = { linear:'Линейная регрессия' };

// The same CSS is embedded in the editable HTML and used for the PDF. All
// equations are vector SVG; the complete MathJax runtime is embedded for offline
// editing. Neither the manuscript nor the PDF needs a network connection.
const css = `
@page{size:A4;margin:18mm 18mm 19mm}
h1,h2,h3,summary{break-inside:avoid}
.notation-card{break-inside:avoid}
#linear-noise-laws caption{display:block;width:100%}
#linear-noise-laws table,#linear-noise-laws tbody{display:block}#linear-noise-laws thead{display:none}#linear-noise-laws tr{display:grid;grid-template-columns:1fr 1fr;margin-bottom:10pt;border:1px solid #dcd9d0;break-inside:avoid}#linear-noise-laws th{grid-column:1/-1;font-weight:bold}#linear-noise-laws td{border:0;border-top:1px solid #e5e1d8;font-size:9pt;min-width:0}#linear-noise-laws td:last-child{grid-column:1/-1}#linear-noise-laws td:nth-child(2):before{content:'Плотность';display:block;color:#8a5b00;font-size:8pt;margin-bottom:5pt}#linear-noise-laws td:nth-child(3):before{content:'Отрицательный log-loss, без константы';display:block;color:#8a5b00;font-size:8pt;margin-bottom:5pt}
*{box-sizing:border-box}html{color:#242629;background:#eeeae2}body{margin:0;font-family:Arial,'Arial Unicode MS',sans-serif;font-size:10.5pt;line-height:1.55;background:white}main{max-width:174mm;margin:auto}p{margin:9pt 0;orphans:3;widows:3}h1,h2,h3{line-height:1.2;letter-spacing:-.025em;break-after:avoid}h1{font-size:32pt;margin:12pt 0 20pt}h2{font-size:20pt;margin:6pt 0 15pt}h3{font-size:13pt}b,strong{font-weight:700}a{color:#8a5b00;text-decoration:none;overflow-wrap:anywhere}small{font-size:8pt;letter-spacing:.13em;text-transform:uppercase;color:#8a5b00}code{font-family:inherit}sub,sup{line-height:0}li{margin:5pt 0;orphans:3;widows:3}ul,ol{padding-left:19pt}section{margin:28pt 0 30pt}section>small{display:block;break-after:avoid}section>h2{break-before:avoid}section>h2+p{break-before:avoid}section>h2+.notation-card{break-before:avoid}
.cover{break-after:page;min-height:240mm;padding:12mm 0 10mm;position:relative}.brand{font-size:14pt;font-weight:800;letter-spacing:.02em}.brand span{color:#b07800}.cover-rule{height:5pt;background:#e6ac1b;width:45mm;margin:15mm 0 24mm}.cover h1{font-size:42pt;line-height:1.07;max-width:150mm}.cover .subtitle{font-size:20pt;color:#8a5b00}.cover .description{max-width:133mm;color:#626468;font-size:12pt;margin-top:13mm}.cover .edition{margin-top:22mm;padding-top:8mm;border-top:1px solid #dedbd3;font-size:9pt;color:#626468}
.contents{break-after:page}.contents h1{font-size:30pt}.toc-group{margin:20pt 0}.toc-group h2{font-size:13pt;margin:12pt 0 7pt}.toc-list{columns:2;column-gap:20pt}.toc-list a{display:block;font-size:8.5pt;line-height:1.35;margin:0 0 5pt;break-inside:avoid;color:#42464a}.toc-num{color:#a57b22;display:inline-block;min-width:20pt}.toc-hint{font-size:9pt;color:#626468}
.book-chapter{break-before:page}.chapter-title{border-top:4pt solid #e6ac1b;padding-top:16pt;margin-bottom:30pt}.chapter-title h1 span{color:#8a5b00}.chapter-title p{font-size:12pt;color:#626468}.theory-block>small{color:#8a5b00}.theory-callout{border-left:3pt solid #c29332;background:#faf6ec;padding:10pt 13pt;margin:14pt 0;break-inside:avoid}.formula,.equation-card{margin:14pt 0;background:#faf8f2;border-left:2pt solid #c29332;padding:9pt 12pt;break-inside:avoid}.equation-card p{font-size:9pt;color:#5d6065;margin:6pt 0 0}.source-equation{font-size:10pt;line-height:1.3;display:block}.source-equation mjx-container{margin:5pt 0!important}.source-equation mjx-container[jax=SVG]>svg{max-width:100%;overflow:visible}.derivation-card{margin:16pt 0}.derivation-title{font-size:9pt;letter-spacing:.04em;font-weight:bold;color:#8a5b00;padding-bottom:8pt;break-after:avoid}.derivation-steps{border-left:1px solid #e4d8b7}.derivation-step{display:flex;gap:11pt;padding:9pt 0 10pt 10pt;break-inside:avoid}.derivation-step>span{font-size:8pt;color:#987124;min-width:14pt;padding-top:4pt}.derivation-step>div{flex:1;min-width:0}.derivation-step p{font-size:9.5pt;color:#53575b;margin:6pt 0 0}.proof-stack{padding:0;list-style:none}.proof-stack li{break-inside:avoid;border-left:1pt solid #ded6c5;padding:8pt 12pt}.proof-stack code{display:block}.proof-stack span{display:block;font-size:9.5pt;color:#53575b}
.notation-card{border:1px solid #dedbd3;margin:14pt 0;padding:10pt 12pt;background:#fcfbf8}.notation-card-title{font-size:8pt;letter-spacing:.05em;color:#8a5b00;margin-bottom:8pt;break-after:avoid}.notation-card dl{margin:0}.notation-card dl>div{display:flex;gap:12pt;padding:4pt 0;border-top:1px solid #ece8df;break-inside:avoid}.notation-card dt{width:37%;flex-shrink:0;font-family:'Arial Unicode MS',Arial,sans-serif;font-size:9pt}.notation-card dd{margin:0;font-size:9pt;color:#54595d;flex:1}.comparison-strip{display:flex;gap:10pt;margin:14pt 0;break-inside:avoid}.comparison-strip article{flex:1;background:#f5f3ee;padding:11pt}.comparison-strip b,.comparison-strip span{display:block}.comparison-strip span{font-size:9pt;color:#53575b;margin-top:5pt}.metric-formula-grid{display:grid;grid-template-columns:1fr 1fr;gap:8pt;margin:14pt 0}.metric-formula-grid article{border:1px solid #dedbd3;padding:9pt;break-inside:avoid}.metric-formula-grid span,.metric-formula-grid small{display:block}.metric-formula-grid small{font-size:8pt;letter-spacing:0;text-transform:none;color:#53575b}
.math-table-scroll{margin:14pt 0}table{border-collapse:collapse;width:100%;font-size:9pt;line-height:1.4;table-layout:fixed}caption{text-align:left;font-size:9pt;color:#8a5b00;font-weight:bold;margin-bottom:8pt;break-after:avoid}thead{display:table-header-group}tr{break-inside:avoid}th,td{border:1px solid #dcd9d0;padding:7pt;vertical-align:top;overflow-wrap:anywhere}th{text-align:left;background:#f5f1e6}tbody th{font-weight:500}
.theory-visual{margin:18pt 0;break-inside:avoid;border:1px solid #dedbd3;padding:12pt;background:#fcfbf7}.theory-visual svg{width:100%;max-height:78mm;display:block}.theory-visual text{font-family:Arial,sans-serif;font-size:12px;fill:#4c5056}.theory-visual figcaption{font-size:9pt;color:#53575b;margin-top:9pt;line-height:1.45}.theory-grid{fill:none;stroke:#e2dfd7;stroke-width:1}.theory-axis{fill:none;stroke:#777a7d;stroke-width:1.5}.theory-curve{fill:none;stroke:#b77d00;stroke-width:3}.theory-descent{fill:none;stroke:#4669a6;stroke-width:2;stroke-dasharray:5 4}.theory-step{fill:#d99d15;stroke:#a36d00;stroke-width:1}.math-residual{stroke:#8b8991;stroke-width:1.5;stroke-dasharray:4 4}.math-centroid{fill:#2c8b67;stroke:#176343;stroke-width:1}.math-contour{stroke:#8c8c96;stroke-width:1.4;fill:none}.math-constraint{stroke:#b77d00;stroke-width:2;fill:#e6ac1b18}.noise-curve{fill:none;stroke-width:2.5}.noise-0{stroke:#b77d00}.noise-1{stroke:#2d8466}.noise-2{stroke:#8661a4;stroke-dasharray:6 3}.noise-label-0{fill:#9e6d00!important}.noise-label-1{fill:#2d8466!important}.noise-label-2{fill:#8661a4!important}.theory-class-a{fill:#bd5f59;stroke:#82433d}.theory-class-b{fill:#4e9c7c;stroke:#2a7054}.theory-neighborhood{fill:#e6ac1b12;stroke:#bb8b20;stroke-dasharray:5 4}.theory-neighbor-link{stroke:#a77b20;stroke-dasharray:4 3;fill:none}.theory-query{fill:#dca91d;stroke:#8e6d16}.tree-edge,.svm-margin{stroke:#8d8e8e;fill:none;stroke-dasharray:4 4}.tree-node{fill:#f5eedc;stroke:#b38c39}.tree-leaf{fill:#e2efe7;stroke:#6c9d7b}.svm-boundary{stroke:#b77d00;stroke-width:3;fill:none}.svm-support{stroke:#ad7e0b;stroke-width:3;fill:none}
.theory-sources{margin:18pt 0;padding:12pt 0;border-top:1pt solid #dedbd3}.theory-sources>span{display:block;font-size:8pt;text-transform:uppercase;letter-spacing:.08em;color:#8a5b00;margin-bottom:8pt}.theory-reference{display:block;margin:5pt 0;font-size:9pt;break-inside:avoid}.theory-reference>span{display:none}.theory-reading{font-size:9pt;color:#626468}.math-exercise{border-top:1px solid #dedbd3;padding:10pt 0;margin:0;break-inside:avoid}.math-exercise summary{font-weight:bold;list-style:none}.math-exercise p{font-size:9.5pt;color:#53575b}.math-exercise summary:before{content:'Вопрос. ';color:#8a5b00}details{display:block}details>*{display:block}
@media screen{body{padding:18mm;margin:12mm auto;max-width:210mm;box-shadow:0 3px 30px #0001}.book-chapter{margin-top:28mm}.contents{margin:20mm 0}}
@media print{html,body{background:white}a{color:inherit}.cover{margin-top:0}main{max-width:none}*{-webkit-print-color-adjust:exact;print-color-adjust:exact}}
`;

export async function typesetBook({ page, root, source, inventory, output, scratch, sourceHash }) {
  const ids = inventory.map(section => section.id);
  assert.equal(new Set(ids).size, ids.length, 'Section IDs must be unique');
  const hashes = JSON.parse(await readFile(resolve(root,'scripts/theory-equation-hashes.json'),'utf8'));
  for (const section of inventory) {
    assert.equal((equations[section.id] || []).length, section.formulas.length, `Unmapped equations in ${section.id}`);
    const hash=createHash('sha256').update(JSON.stringify(section.formulas)).digest('hex');
    assert.equal(hash, hashes[section.id], `Website equations changed in ${section.id}: review TeX and update the equation baseline`);
  }
  for (const id of Object.keys(equations)) assert.ok(ids.includes(id), `Orphan TeX mapping ${id}`);

  // The initial DOM was built from the website, without a parallel manuscript.
  const parity = await page.evaluate(({ equations, selector, ids }) => {
    const originals = [...document.querySelectorAll('.algorithm-section')].map(s=>({id:s.id, paragraphs:[...s.querySelectorAll('p')].map(p=>p.innerHTML)}));
    for (const id of ids) {
      const section=document.getElementById(id);
      const nodes=[...section.querySelectorAll(selector)].filter(n=>n.closest('.algorithm-section')===section);
      nodes.forEach((node,i)=>{
        node.dataset.equation=`${id}:${i+1}`;
        node.classList.add('source-equation');
        node.textContent=`\\[${equations[id][i]}\\]`;
      });
    }
    document.querySelectorAll('details').forEach(node=>node.open=true);
    const paragraphsPreserved=originals.every(s=>{
      const current=[...document.getElementById(s.id).querySelectorAll('p')].map(p=>p.innerHTML);
      return JSON.stringify(current)===JSON.stringify(s.paragraphs);
    });
    return {paragraphsPreserved, paragraphCount:originals.reduce((n,s)=>n+s.paragraphs.length,0)};
  }, { equations, selector, ids });
  assert.ok(parity.paragraphsPreserved, 'PDF must retain every website paragraph');

  // Normalize only typographic dashes in text; leave minus signs and mathematical
  // symbols untouched. This avoids nonbreaking-dash font fallbacks in print.
  await page.evaluate(()=>{
    const walker=document.createTreeWalker(document.body,NodeFilter.SHOW_TEXT);
    while(walker.nextNode()) walker.currentNode.textContent=walker.currentNode.textContent.replace(/[\u2010-\u2015]/g,'-');
  });
  const chapters = await page.locator('body').innerHTML();
  const toc = Object.entries(names).map(([id,name],i)=>`<div class="toc-group"><h2><a href="#chapter-${id}">${i+1}. ${name}</a></h2><div class="toc-list">${inventory.filter(s=>s.chapter===id).map((s,j)=>`<a href="#${s.id}"><span class="toc-num">${String(j+1).padStart(2,'0')}</span>${escape(s.title)}</a>`).join('')}</div></div>`).join('');
  const runtime=await readFile(resolve(root,'vendor/mathjax/tex-svg.js'),'utf8');
  const runtimeLicense=await readFile(resolve(root,'vendor/mathjax/LICENSE'),'utf8');
  const config=`window.MathJax={tex:{packages:{'[+]':['ams']}},svg:{fontCache:'none'},options:{enableMenu:false,skipHtmlTags:['script','noscript','style','textarea','annotation','annotation-xml']},startup:{typeset:true}};`;
  const html=`<!DOCTYPE html>\n<html lang="ru"><head><meta charset="utf-8"><title>Fit & Predict - Линейная регрессия</title><meta name="description" content="Математическая теория линейной регрессии. Редактируемый офлайн-исходник: формулы записаны в TeX внутри source-equation."><meta name="source-sha256" content="${sourceHash}"><style>${css}</style></head><body><main>
<header class="cover"><div class="brand">FIT<span>&</span>PREDICT</div><div class="cover-rule"></div><small>Учебник машинного обучения</small><h1>Линейная<br>регрессия.</h1><div class="subtitle">Модель. Доказательства. Статистика.</div><p class="description">От производных и ковариации до матричной проекции, случайного шума и доверительных интервалов. Пошаговые выводы, вычислительные примеры и границы применимости.</p><div class="edition">Редакция для совместной работы · 12 ноября 2026<br>${inventory.length} разделов из теории сайта · формулы в векторном формате<br>Оглавление и ссылки на источники кликабельны.</div></header>
<nav class="contents" aria-label="Оглавление"><small>Маршрут чтения</small><h1>Содержание</h1><p class="toc-hint">Три взгляда на одну модель: математический анализ, линейная алгебра, теория вероятностей и статистика.</p>${toc}</nav>
${chapters}
</main><!-- Offline MathJax 3.2.2, Copyright (c) 2009-2022 The MathJax Consortium.\n${runtimeLicense}\n--><script>${config}</script><script>${runtime.replace(/<\/script/gi,'<\\/script')}</script></body></html>`;
  const manuscriptPath=resolve(output,'fitpredict-linear-regression.html');
  await writeFile(manuscriptPath,html);
  const browserErrors=[];
  page.on('pageerror',error=>browserErrors.push(error.message));
  await page.context().setOffline(true);
  await page.setContent(html,{waitUntil:'load'});
  await page.evaluate(()=>MathJax.startup.promise);
  await page.emulateMedia({media:'print'});
  // Match the PDF's 174mm live area when checking long equations, not the wide
  // desktop viewport. This catches rather than hides overflow before printing.
  await page.setViewportSize({width:658,height:1050});
  await page.evaluate(()=>document.fonts.ready);
  const audit=await page.evaluate(()=>({
    sections:document.querySelectorAll('.algorithm-section').length,
    math:document.querySelectorAll('.source-equation mjx-container').length,
    mathErrors:[...document.querySelectorAll('[data-mml-node="merror"],mjx-merror')].map(n=>n.textContent),
    overflow:[...document.querySelectorAll('.source-equation')].filter(n=>n.scrollWidth>n.clientWidth+2).map(n=>({id:n.dataset.equation,width:n.clientWidth,content:n.scrollWidth})),
    brokenLinks:[...document.querySelectorAll('.contents a')].filter(a=>!document.getElementById(a.hash.slice(1))).map(a=>a.hash),
    nestedSections:document.querySelectorAll('.algorithm-section .algorithm-section').length,
    figures:document.querySelectorAll('.theory-visual svg').length
  }));
  const formulaCount=inventory.reduce((n,s)=>n+s.formulas.length,0);
  assert.deepEqual(browserErrors,[], 'Manuscript browser errors');
  assert.deepEqual(audit.mathErrors,[], 'MathJax TeX errors');
  assert.equal(audit.math,formulaCount,'Every equation must be typeset');
  assert.deepEqual(audit.brokenLinks,[],'Broken contents links');
  assert.equal(audit.nestedSections,0,'Nested sections break the reading order');
  // We keep a detailed report even if a new long formula blocks publication.
  await writeFile(resolve(scratch,'layout-audit.json'),JSON.stringify(audit,null,2));
  assert.deepEqual(audit.overflow,[], 'Equation overflow: split the TeX into aligned lines');
  const pdfPath=resolve(output,'fitpredict-linear-regression.pdf');
  await page.pdf({path:pdfPath,format:'A4',printBackground:true,preferCSSPageSize:true,displayHeaderFooter:true,headerTemplate:'<span></span>',footerTemplate:'<div style="font-family:Arial,sans-serif;font-size:8px;color:#86837c;width:100%;padding:0 18mm;display:flex;justify-content:space-between"><span>FIT &amp; PREDICT · ЛИНЕЙНАЯ РЕГРЕССИЯ</span><span class="pageNumber"></span></div>',margin:{top:'18mm',bottom:'19mm',left:'18mm',right:'18mm'},tagged:true,outline:true});
  const manifest={sourceHash,source:'src/theory.js + src/linear-theory.js',paragraphCount:parity.paragraphCount,formulaCount,sectionCount:ids.length,chapters:Object.keys(names).map(id=>({id,title:names[id],sections:inventory.filter(s=>s.chapter===id).map(s=>({id:s.id,title:s.title,formulas:s.formulas.length}))})),audit};
  await writeFile(resolve(output,'theory-manifest.json'),JSON.stringify(manifest,null,2)+'\n');
  return {pdf:pdfPath,editable:manuscriptPath,sections:ids.length,formulas:formulaCount,paragraphs:parity.paragraphCount,figures:audit.figures};
}
