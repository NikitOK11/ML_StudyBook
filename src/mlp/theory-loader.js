import { Marked } from '../../vendor/marked/marked.esm.js';
import { escape } from './view.js?v=2';

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

export function mountTheory(root, initialSection, { embedded = false } = {}) {
  let disposed = false, scrollFrame = 0, requestedSection = initialSection, ready = false;
  const abort = new AbortController();
  root.innerHTML = '<div class="mlp-reading-status" role="status">Оформляем объяснение и формулы…</div>' +
    '<div class="mlp-reading-layout ' + (embedded ? 'mlp-reading-embedded' : '') + '" hidden>' +
    '<aside class="mlp-reading-nav">' + (embedded ? '' : '<button class="secondary" data-route="mlp">← К сети</button>') +
    '<button class="mlp-link" data-mlp-toc-toggle aria-expanded="true">Свернуть оглавление</button><nav aria-label="Оглавление главы MLP" data-mlp-toc></nav></aside><article class="mlp-chapter"></article></div>';
  const article = root.querySelector('article'), status = root.querySelector('[role="status"]');
  const clearMath = () => {
    window.MathJax?.typesetClear?.([article]);
    const doc = window.MathJax?.startup?.document;
    if (doc?.options.elements?.includes(article)) doc.options.elements = [];
  };
  function scroll(id) {
    const target = article.querySelector('[id="' + (id || 'mlp-start').replace(/[^a-z0-9-]/g, '') + '"]') || article.querySelector('h2');
    target?.scrollIntoView({ block: 'start', behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth' });
  }
  function load() {
    status.setAttribute('role', 'status');
    status.textContent = 'Оформляем объяснение и формулы…';
    if (!sourcePromise) sourcePromise = fetch('./src/mlp-theory.md?v=2').then(response => {
      if (!response.ok) throw new Error('Глава: HTTP ' + response.status);
      return response.text();
    }).catch(error => { sourcePromise = null; throw error; });
    Promise.all([sourcePromise, loadMath()]).then(([source]) => {
      if (disposed) return;
      clearMath();
      article.innerHTML = safeMarkdown(source);
      const headings = [...article.querySelectorAll('h2')];
      for (const heading of headings) {
        const previous = heading.previousElementSibling;
        const anchor = previous?.matches('a[id]') ? previous : previous?.querySelector('a[id]');
        if (anchor) { heading.id = anchor.id; anchor.removeAttribute('id'); }
      }
      root.querySelector('[data-mlp-toc]').innerHTML = headings.map(heading =>
        '<a href="#' + heading.id + '">' + escape(heading.textContent) + '</a>').join('');
      typesetQueue = typesetQueue.catch(() => {}).then(async () => {
        if (disposed) return;
        await window.MathJax.typesetPromise([article]);
        if (disposed) { clearMath(); return; }
        if (article.querySelector('[data-mjx-error], mjx-merror')) throw new Error('Ошибка оформления формулы');
        root.querySelector('.mlp-reading-layout').hidden = false; status.hidden = true;
        root.dataset.typeset = 'ready'; ready = true;
        if (requestedSection) scrollFrame = requestAnimationFrame(() => { if (!disposed) scroll(requestedSection); });
      });
      return typesetQueue;
    }).catch(error => {
      if (disposed) return;
      status.hidden = false; status.setAttribute('role', 'alert');
      status.innerHTML = 'Не удалось оформить объяснение. <button class="secondary" data-mlp-theory-retry>Повторить загрузку</button>' +
        (embedded ? '' : '<button class="secondary" data-route="mlp">К сети</button>');
    });
  }
  root.addEventListener('click', event => {
    const toggle = event.target.closest('[data-mlp-toc-toggle]');
    if (toggle) {
      const collapsed = root.classList.toggle('mlp-toc-collapsed');
      toggle.textContent = collapsed ? 'Показать оглавление' : 'Свернуть оглавление';
      toggle.setAttribute('aria-expanded', String(!collapsed));
    }
    const link = event.target.closest('a[href^="#mlp-"]');
    if (link) { event.preventDefault(); scroll(link.getAttribute('href').slice(1)); }
    if (event.target.closest('[data-mlp-theory-retry]')) load();
  }, { signal: abort.signal });
  load();
  const dispose = () => { disposed = true; abort.abort(); cancelAnimationFrame(scrollFrame); clearMath(); };
  dispose.scrollTo = id => { requestedSection = id; if (ready) scroll(id); };
  return dispose;
}
