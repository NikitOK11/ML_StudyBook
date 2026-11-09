import { Marked } from '../../vendor/marked/marked.esm.js';
import { escape } from './view.js';

// Math tokens must be recognized before Markdown's underscore/emphasis handling.
const markdown = new Marked({ gfm: true, breaks: false, extensions: [
  { name: 'displayMath', level: 'block', start: source => source.indexOf('$$'),
    tokenizer(source) { const match = /^\$\$\s*\n?([\s\S]+?)\n?\$\$(?:\n|$)/.exec(source); if (match) return { type: 'displayMath', raw: match[0], text: match[1] }; },
    renderer: token => `<div class="mlp-equation">$$${escape(token.text)}$$</div>\n` },
  { name: 'inlineMath', level: 'inline', start: source => source.indexOf('$'),
    tokenizer(source) { const match = /^\$([^$\n]+?)\$/.exec(source); if (match) return { type: 'inlineMath', raw: match[0], text: match[1] }; },
    renderer: token => `<span class="mlp-inline-math">$${escape(token.text)}$</span>` }
] });

export function safeMarkdown(source) {
  const template = document.createElement('template');
  template.innerHTML = markdown.parse(source);
  const allowed = new Set(['H1', 'H2', 'H3', 'H4', 'P', 'A', 'UL', 'OL', 'LI', 'EM', 'STRONG', 'BLOCKQUOTE', 'HR', 'BR', 'TABLE', 'THEAD', 'TBODY', 'TR', 'TH', 'TD', 'DETAILS', 'SUMMARY', 'DIV', 'SPAN', 'CODE', 'PRE', 'IMG']);
  for (const element of [...template.content.querySelectorAll('*')]) {
    if (!allowed.has(element.tagName)) { element.remove(); continue; }
    for (const attr of [...element.attributes]) {
      const permitted = (attr.name === 'id' && /^mlp-[a-z0-9-]+$/.test(attr.value)) ||
        (attr.name === 'class' && ['mlp-equation', 'mlp-inline-math'].includes(attr.value)) ||
        (element.tagName === 'A' && attr.name === 'href' && /^(https:\/\/|#mlp-)/.test(attr.value)) ||
        (element.tagName === 'IMG' && attr.name === 'src' && /^assets\/mlp-[a-z-]+\.svg$/.test(attr.value)) ||
        (element.tagName === 'IMG' && attr.name === 'alt');
      if (!permitted) element.removeAttribute(attr.name);
    }
    if (element.tagName === 'A' && element.getAttribute('href')?.startsWith('https:')) { element.target = '_blank'; element.rel = 'noopener noreferrer'; }
    if (element.tagName === 'IMG') {
      element.loading = 'lazy';
      // Reserve the local illustrations' aspect ratio before lazy loading so an
      // exact-section jump does not drift when an earlier image finishes.
      const xor = element.getAttribute('src')?.endsWith('mlp-xor.svg');
      element.width = xor ? 800 : 1000; element.height = xor ? 350 : 360;
    }
  }
  // Strip comments, including the audit fixture, from the learner's chapter.
  const walker = document.createTreeWalker(template.content, NodeFilter.SHOW_COMMENT), comments = [];
  while (walker.nextNode()) comments.push(walker.currentNode);
  comments.forEach(comment => comment.remove());
  return template.innerHTML;
}

let mathPromise;
let sourcePromise;
let typesetQueue = Promise.resolve();
function loadMath() {
  if (!mathPromise) mathPromise = new Promise((resolve, reject) => {
    window.MathJax = { tex: { inlineMath: [['$', '$']], displayMath: [['$$', '$$']], packages: ['base', 'ams', 'newcommand', 'noundefined'] },
      svg: { fontCache: 'local' }, options: { enableMenu: false }, startup: { typeset: false } };
    const script = document.createElement('script'); script.src = './vendor/mathjax/tex-svg.js'; script.dataset.mlpMath = '';
    script.onload = () => window.MathJax.startup.promise.then(resolve, reject);
    script.onerror = () => { mathPromise = null; script.remove(); reject(new Error('MathJax не загрузился')); };
    document.head.append(script);
  });
  return mathPromise;
}

export function mountTheory(root, initialSection) {
  let disposed = false;
  let scrollFrame = 0;
  const abort = new AbortController();
  root.innerHTML = `<div class="mlp-reading-status" role="status">Загружаем главу и оформляем формулы…</div><div class="mlp-reading-layout" hidden><aside class="mlp-reading-nav"><button class="secondary" data-route="mlp">← К лаборатории</button><button class="mlp-link" data-mlp-toc-toggle aria-expanded="true">Свернуть оглавление</button><nav aria-label="Оглавление главы MLP" data-mlp-toc></nav></aside><article class="mlp-chapter"></article></div>`;
  const article = root.querySelector('article'), status = root.querySelector('[role="status"]');
  const clearMath = () => {
    window.MathJax?.typesetClear?.([article]);
    const doc = window.MathJax?.startup?.document;
    if (doc?.options.elements?.includes(article)) doc.options.elements = [];
  };
  const scroll = id => {
    const target = document.getElementById(id);
    if (target && root.contains(target)) target.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  };
  root.addEventListener('click', event => {
    const toggle = event.target.closest('[data-mlp-toc-toggle]');
    if (toggle) { const collapsed = root.classList.toggle('mlp-toc-collapsed'); toggle.textContent = collapsed ? 'Показать оглавление' : 'Свернуть оглавление'; toggle.setAttribute('aria-expanded', String(!collapsed)); }
    const link = event.target.closest('a[href^="#mlp-"]');
    if (link) { event.preventDefault(); scroll(link.getAttribute('href').slice(1)); }
  }, { signal: abort.signal });
  if (!sourcePromise) sourcePromise = fetch('./src/mlp-theory.md').then(response => { if (!response.ok) throw new Error(`Глава: HTTP ${response.status}`); return response.text(); }).catch(error => { sourcePromise = null; throw error; });
  Promise.all([sourcePromise, loadMath()]).then(([source]) => {
    if (disposed) return;
    article.innerHTML = safeMarkdown(source);
    const headings = [...article.querySelectorAll('h2')];
    for (const heading of headings) {
      const anchor = heading.previousElementSibling;
      const innerAnchor = anchor?.querySelector('a[id]');
      const id = anchor?.id || innerAnchor?.id;
      if (id) { (innerAnchor || anchor).removeAttribute('id'); heading.id = id; }
    }
    root.querySelector('[data-mlp-toc]').innerHTML = headings.map((heading, i) => `<a href="#${heading.id}"><span>${String(i + 1).padStart(2, '0')}</span>${escape(heading.textContent)}</a>`).join('');
    typesetQueue = typesetQueue.catch(() => {}).then(async () => {
      if (disposed) return;
      await window.MathJax.typesetPromise([article]);
      if (disposed) { clearMath(); return; }
      if (article.querySelector('[data-mjx-error], mjx-merror')) throw new Error('Ошибка оформления формулы');
      root.querySelector('.mlp-reading-layout').hidden = false; status.remove();
      root.dataset.typeset = 'ready';
      if (initialSection) scrollFrame = requestAnimationFrame(() => { if (!disposed) scroll(initialSection); });
    });
    return typesetQueue;
  }).catch(error => {
    if (disposed) return;
    console.error('Глава MLP:', error);
    status.setAttribute('role', 'alert');
    status.innerHTML = 'Не удалось оформить главу. Можно повторить загрузку или вернуться к лаборатории.<br><button class="secondary" data-route="mlp-theory">Повторить</button> <button class="secondary" data-route="mlp">К лаборатории</button>';
  });
  return () => { disposed = true; abort.abort(); cancelAnimationFrame(scrollFrame); clearMath(); };
}
