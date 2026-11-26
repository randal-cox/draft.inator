// The combined import fixture, draft.inator's side (docs/import-fixture.md): the projection, its regions and
// revision, the staged image, and the proposed references. cite.inator's side (opaque ranges, the classifier) and the
// combined review are added as they arrive.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import katex from '../vendor/katex/katex.mjs';
import { docxToMarkdown, revisionOf } from '../src/editor/docx.js';
import { mathHTML } from '../src/math/math.js';
import { parseXML } from './xml.js';
import { loadBlock } from './harness.js';
import { combinedDocx, expectedMarkdown, png } from './fixtures/combined-docx.js';

const here = new URL('.', import.meta.url).pathname;
const run = () => docxToMarkdown(combinedDocx(), { parseXML });

test('the projection is exactly as specified', async () => {
  const r = await run();
  assert.equal(r.markdown, expectedMarkdown);
  assert.equal(r.revision, revisionOf(expectedMarkdown));
  assert.notEqual(revisionOf(expectedMarkdown + ' '), r.revision, 'any change makes a new revision');
  assert.equal(r.equations, 5);
  assert.equal(r.figures, 1);
});

test('regions: maths (including in the caption, nested), the figure, and its caption', async () => {
  const { markdown, regions } = await run();
  const text = r => markdown.slice(r.start, r.end);
  assert.deepEqual(regions.filter(r => r.kind === 'math').map(text),
    ['$n$', '$p \\ge 0.10$', '$$ n \\ge \\frac{\\ln(1-C)}{\\ln(1-p)} $$ {#eq:1}', '$(Mason, 2010)$', '$p$']);
  const fig = regions.find(r => r.kind === 'figure'), cap = regions.find(r => r.kind === 'caption');
  assert.ok(text(fig).startsWith('{figure ') && text(fig).endsWith('}'));
  assert.equal(text(cap), 'Sample size against $p$ (Guest et al., 2006).');
  const capMath = regions.filter(r => r.kind === 'math').at(-1);
  assert.ok(capMath.start >= cap.start && capMath.end <= cap.end, 'the caption holds its maths');
  for (const r of regions) assert.ok(Number.isInteger(r.start) && Number.isInteger(r.end) && r.start < r.end && r.end <= markdown.length);
});

test('the image is staged, and the figure needs alt text before anything is guessed', async () => {
  const r = await docxToMarkdown(combinedDocx(), { parseXML, mediaPath: n => `/uploads/best-${n}` });
  assert.equal(r.media.length, 1);
  assert.deepEqual([r.media[0].name, r.media[0].path, r.media[0].type], ['image1.png', '/uploads/best-image1.png', 'image/png']);
  assert.deepEqual(Buffer.from(r.media[0].bytes), png);
  assert.match(r.markdown, /^\{figure \/uploads\/best-image1\.png \| label:fig:1 \| caption:/m);
  assert.ok(r.checks.some(n => /figure 1 needs alt text/.test(n)));
  assert.ok(r.checks.some(n => /figure numbers 1 became labels/.test(n)));
  assert.ok(r.checks.some(n => /equation numbers 1 became labels/.test(n)));
});

test('proposed references: Eq. 1 and Figure 1 in prose; not inside maths, the figure, or a typed citation', async () => {
  const { markdown, proposals, checks } = await run();
  assert.deepEqual(proposals.map(p => [p.text, p.replacement, p.owner]), [['Eq. 1', '{ref eq:1}', 'ref'], ['Figure 1', '{ref fig:1}', 'ref']]);
  for (const p of proposals) assert.equal(markdown.slice(p.start, p.end), p.text);
  assert.ok(checks.some(n => /1 mention such as "Eq\. 1" shares brackets with a typed citation: rewrite it by hand/.test(n)));
});

test('the Figure block reads the imported figure, and writes it back unchanged', async () => {
  const { markdown } = await run();
  const { components } = loadBlock(here + '../src/blocks/figure.js');
  const figure = components.figure;
  const m = markdown.match(new RegExp(figure.pattern.source, 'm'));
  const d = figure.fromBlock(m);
  assert.deepEqual([d.alt || '', d.label, d.caption], ['', 'fig:1', 'Sample size against $p$ (Guest et al., 2006).']);
  assert.equal(figure.toBlock(d), m[0]);
});

test('all the maths draws', async () => {
  const { markdown, regions } = await run();
  for (const r of regions.filter(x => x.kind === 'math')) {
    const s = markdown.slice(r.start, r.end), display = s.startsWith('$$');
    const tex = display ? s.replace(/^\$\$|\$\$[\s\S]*$/g, '').trim() : s.slice(1, -1);
    assert.equal(mathHTML({ tex, display }, katex).error, null, s);
  }
});
