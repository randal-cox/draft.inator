// Equations, labels, and cross-references (src/editor/crossref.js), and how the preview draws them.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import katex from '../vendor/katex/katex.mjs';
import { findMath, numberLabels, refText, checkCrossrefs, mathHTML } from '../src/editor/crossref.js';

const root = new URL('..', import.meta.url).pathname;
globalThis.window = globalThis.window || { DRAFT_WORKS: [] };
const ctx = vm.createContext({ window: globalThis.window });
for (const f of ['src/editor/forms.js', 'src/blocks/citation.js', 'src/blocks/figure.js']) vm.runInContext(fs.readFileSync(root + f, 'utf8'), Object.assign(ctx, { CMS: globalThis.window.CMS }));
const { renderArticle } = await import('../src/editor/editor.js');
const md = s => s.split(/\n{2,}/).map(p => (/^DRAFTPH\d+X$/.test(p.trim()) ? p : `<p>${p}</p>`)).join('\n');
const tex = t => findMath(t).filter(m => m.kind === 'math').map(m => m.tex);

test('inline maths follows Pandoc\'s dollar rule, so prices stay prose', () => {
  assert.deepEqual(tex('If $p \\ge 0.10$ then $n = 29$.'), ['p \\ge 0.10', 'n = 29']);
  assert.deepEqual(tex('It cost $5 and $10 to print.'), [], 'two prices');
  assert.deepEqual(tex('Between $5-$10.'), [], 'a closing $ before a digit');
  assert.deepEqual(tex('A literal \\$x$ is not maths.'), [], 'an escaped dollar');
  assert.deepEqual(tex('$ x$ and $x $'), [], 'a space just inside');
  assert.deepEqual(findMath('Use `$x$` in code.', at => at >= 4 && at < 9), [], 'code is text');
});

test('displayed maths, with an optional label; a blank line ends it', () => {
  const f = findMath('Solving for n:\n\n$$ n \\ge \\frac{\\log(1-C)}{\\log(1-p)} $$ {#eq:sample-size}\n\nThen $$a\n\nb$$.');
  const d = f.filter(m => m.display);
  assert.equal(d.length, 1);
  assert.equal(d[0].label, 'eq:sample-size');
  assert.equal(d[0].tex, '\\frac{\\log(1-C)}{\\log(1-p)}'.replace(/^/, 'n \\ge '));
});

test('labels are numbered in order, by kind; duplicates and missing references are reported', () => {
  const { numbers, diagnostics } = numberLabels([{ start: 30, label: 'eq:b' }, { start: 10, label: 'eq:a' }, { start: 20, label: 'fig:x' }, { start: 40, label: 'eq:a' }]);
  assert.deepEqual([...numbers], [['eq:a', 1], ['fig:x', 1], ['eq:b', 2]]);
  assert.equal(diagnostics[0].code, 'label-duplicate');
  assert.equal(refText('eq:b', numbers), 'Eq. 2');
  assert.equal(refText('fig:x', numbers), 'Figure 1');
  assert.equal(refText('eq:zz', numbers), null);
  const problems = checkCrossrefs('$$x$$ {#eq:a}\n\nSee {ref eq:a} and {ref eq:gone}; also $\\frac{a}{b$.', { katex });
  assert.deepEqual(problems.map(p => p.code), ['ref-missing', 'math-error']);
});

test('maths renders as MathML with no inline styles; a mistake shows the source and says what is wrong', () => {
  const ok = mathHTML({ tex: 'R \\approx \\frac{f_1}{m}', display: true, label: 'eq:r' }, katex, { number: 4 });
  assert.match(ok.html, /^<div class="di-equation" id="eq:r"><span class="katex"><math/);
  assert.match(ok.html, /<span class="di-eq-number">\(4\)<\/span><\/div>$/);
  assert.ok(!/style=/.test(ok.html), 'no inline styles (strict CSP)');
  const bad = mathHTML({ tex: '\\frac{a}{b', display: false }, katex);
  assert.ok(bad.error);
  assert.match(bad.html, /class="di-math-source di-math-error"/);
});

test('the preview numbers equations and figures, resolves references, and renumbers when things move', () => {
  const a = '$$ x $$ {#eq:one}\n\n{figure /a.png | alt:"A" | caption:"Depth" | label:fig:depth}\n\n$$ y $$ {#eq:two}\n\nBy {ref eq:two} and {ref fig:depth}.';
  const r = renderArticle(a, { render: md, math: katex });
  assert.match(r.html, /id="eq:one"[\s\S]*\(1\)[\s\S]*id="eq:two"[\s\S]*\(2\)/);
  assert.match(r.html, /<figure class="fig" id="fig:depth">[\s\S]*<span class="di-fig-number">Figure 1\.<\/span> Depth/);
  assert.match(r.html, /<a class="di-ref" href="#eq:two">Eq\. 2<\/a> and <a class="di-ref" href="#fig:depth">Figure 1<\/a>/);
  assert.equal(r.equations, 2);
  // Swap the equations: the numbers, and the reference, follow. The file holds no numbers to fix.
  const b = a.replace('$$ x $$ {#eq:one}', () => 'TEMP').replace('$$ y $$ {#eq:two}', () => '$$ x $$ {#eq:one}').replace('TEMP', () => '$$ y $$ {#eq:two}');
  assert.match(renderArticle(b, { render: md, math: katex }).html, /href="#eq:two">Eq\. 1</);
  const gone = renderArticle('See {ref fig:nope}.', { render: md, math: katex });
  assert.match(gone.html, /<span class="di-ref-missing"/);
  assert.equal(gone.crossref[0].code, 'ref-missing');
});

test('a site can word references its own way', () => {
  const r = renderArticle('$$ x $$ {#eq:a}\n\n{ref eq:a}', { render: md, math: katex, refNames: { eq: n => `(${n})` } });
  assert.match(r.html, /href="#eq:a">\(1\)</);
});

test('draft-inator check reports problems with their places, and passes a clean article', async () => {
  const { checkText } = await import('../tools/check.js');
  const bad = '$$x$$ {#eq:a}\n\n$$y$$ {#eq:a}\n\n{figure /a.png | alt:"A" | label:fig:one}\n\n{ref fig:one} {ref fig:two} $\\frac{1}{$\n\n`{ref eq:code}`';
  assert.deepEqual(checkText(bad, { katex }).map(d => d.code), ['label-duplicate', 'ref-missing', 'math-error']);
  assert.deepEqual(checkText('$$x$$ {#eq:a}\n\nSee {ref eq:a}.', { katex }), []);
});

test('draft-inator check finds a figure label written after a caption that holds a citation and maths', async () => {
  const { checkText } = await import('../tools/check.js');
  const text = '{figure a.png | alt:"x" | caption:"Size against $\\frac{a}{b}$ {cite bell-1992-ritual | note:"Bell 1992"}" | label:fig:curve}\n\nAs {ref fig:curve} shows.\n';
  assert.deepEqual(checkText(text, { katex }).map(d => d.code), [], 'the label is found, so the reference is fine');
});

test('a caption draws its own citations, maths, and references once, inside the figure', () => {
  const a = '{figure /a.png | alt:"A" | label:fig:depth | caption:"Size against $\\frac{a}{b}$ {cite bell-1992-ritual | note:"Bell 1992"}, as {ref fig:depth}."}\n\nAfter.';
  const r = renderArticle(a, { render: md, math: katex });
  const cap = /<figcaption>([\s\S]*?)<\/figcaption>/.exec(r.html)[1];
  assert.match(cap, /<math/, 'the maths is drawn');
  assert.match(cap, /class="di-ref" href="#fig:depth">Figure 1</, 'the reference is resolved');
  assert.match(cap, /class="cite"/, 'the citation is drawn in the caption');
  assert.equal((r.html.match(/class="cite"/g) || []).length, 1, 'and not drawn again after the figure');
  assert.match(r.html, /Works cited/, 'it counts as cited');
});
