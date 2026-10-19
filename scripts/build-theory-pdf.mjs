import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';
import { theoryPages } from '../src/theory.js';
import { equationSelector } from './math-typesetting.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const scratch = resolve(root, 'tmp/pdfs');
const output = resolve(root, 'output/pdf');
await mkdir(scratch, { recursive: true });
await mkdir(output, { recursive: true });
const order = ['linear'];
const browser = await chromium.launch({ headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 } });
  const source = order.map((kind,i) => {
    const chapter=theoryPages[kind];
    return `<article class="book-chapter" id="chapter-${kind}" data-chapter="${kind}"><header class="chapter-title"><small>ГЛАВА ${i+1}</small><h1>${chapter.title.replace(/<br>/g,' ')}</h1><p>${chapter.lead}</p></header>${chapter.content}</article>`;
  }).join('');
  await page.setContent(`<html lang="ru"><meta charset="utf-8"><body>${source}</body></html>`);
  const inventory = await page.evaluate(selector => {
    const result=[];
    document.querySelectorAll('.book-chapter').forEach(chapter=>{
      chapter.querySelectorAll('.algorithm-section').forEach(section=>{
        const nodes=[...section.querySelectorAll(selector)].filter(n=>n.closest('.algorithm-section')===section);
        result.push({chapter:chapter.dataset.chapter,id:section.id,title:section.querySelector('h2').textContent,formulas:nodes.map(n=>n.innerHTML.replace(/<br\s*\/?\s*>/g,'\n'))});
      });
    });
    return result;
  }, equationSelector);
  await writeFile(resolve(scratch,'equations.json'), JSON.stringify(inventory,null,2));
  if (process.argv.includes('--inventory')) {
    for(const section of inventory) console.log(section.id, section.formulas.length, JSON.stringify(section.formulas));
  } else {
    const { typesetBook } = await import('./typeset-theory-book.mjs');
    const result = await typesetBook({page,root,source,inventory,output,scratch,sourceHash:createHash('sha256').update(source).digest('hex')});
    console.log(JSON.stringify(result,null,2));
  }
} finally { await browser.close(); }
