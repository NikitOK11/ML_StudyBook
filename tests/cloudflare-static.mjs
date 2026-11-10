import assert from 'node:assert/strict';

const base = process.env.TEST_BASE_URL || 'http://127.0.0.1:8787';
const cases = [
  ['/', 200, 'text/html'],
  ['/app.js', 200, 'javascript'],
  ['/src/algorithms.js', 200, 'javascript'],
  ['/vendor/mathjax/tex-svg.js', 200, 'javascript'],
  ['/output/pdf/fitpredict-linear-regression.pdf', 200, 'application/pdf'],
  ['/README.md', 404],
  ['/tests/user-flows.mjs', 404],
  ['/wrangler.jsonc', 404],
  ['/.git/config', 404],
  ['/unknown.js', 404],
];
for (const [path, expected, type] of cases) {
  const response = await fetch(new URL(path, base));
  assert.equal(response.status, expected, path);
  if (type) assert.ok(response.headers.get('content-type')?.includes(type), path);
  if (expected === 200) assert.equal(response.headers.get('cache-control'), 'no-cache', path);
}
console.log('Cloudflare static hosting: resources, MIME types, cache headers and excluded paths passed.');
