// src/math/ stands alone: no imports from outside the folder, so it can become its own package (#35).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import katex from '../vendor/katex/katex.mjs';
import { findTeX, mathHTML, SAFE, LABEL } from '../src/math/math.js';

const dir = new URL('../src/math/', import.meta.url).pathname;

test('src/math imports nothing from outside its folder', () => {
  for (const f of fs.readdirSync(dir).filter(f => f.endsWith('.js'))) {
    const text = fs.readFileSync(dir + f, 'utf8');
    for (const m of text.matchAll(/\bimport\b[^'"]*['"]([^'"]+)['"]|\bimport\(\s*['"]([^'"]+)['"]/g)) {
      const spec = m[1] || m[2];
      assert.ok(spec.startsWith('./'), `${f} imports ${spec}`);
    }
  }
});

test('findTeX finds maths only, with labels; money is prose', () => {
  const t = 'Costs $5 and $10. Then $p \\ge 0.1$.\n\n$$ n \\ge 1 $$ {#eq:n}\n\nSee {ref eq:n}.';
  const found = findTeX(t);
  assert.deepEqual(found.map(f => [f.display, f.tex, f.label]), [[false, 'p \\ge 0.1', null], [true, 'n \\ge 1', 'eq:n']]);
  assert.ok(new RegExp(`^${LABEL}$`).test('eq:sample-size'));
});

test('drawing is safe: MathML only, and trusted commands are refused', () => {
  assert.equal(SAFE.trust, false);
  assert.equal(SAFE.output, 'mathml');
  const ok = mathHTML({ tex: '\\frac{a}{b}', display: false }, katex);
  assert.ok(!ok.error && /<math/.test(ok.html) && !/style=/.test(ok.html));
  const link = mathHTML({ tex: '\\href{javascript:alert(1)}{x}', display: false }, katex);
  assert.ok(!/href="javascript/.test(link.html), 'no link is made');
  const bomb = mathHTML({ tex: '\\def\\a{\\a\\a}\\a', display: false }, katex);
  assert.ok(bomb.error, 'runaway macros stop with a message');
});
