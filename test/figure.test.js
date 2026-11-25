import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadBlock, roundtripMarkdown } from './harness.js';

const here = new URL('.', import.meta.url).pathname;
const src = fs.readFileSync(here + 'fixtures/figures.md', 'utf8');
const { components, window } = loadBlock(here + '../src/blocks/figure.js');
const figure = components.figure;
const { parse, build } = window.DRAFT_FIGURE;
const all = new RegExp(figure.pattern.source, 'gm');

test('registers a Figure block that Sveltia treats as a block, not inline', () => {
  assert.ok(figure, 'registerEditorComponent was not called with id "figure"');
  assert.equal(figure.label, 'Figure');
  assert.ok(figure.pattern.flags.includes('m'), 'Sveltia treats a pattern with the m flag as a block');
});

test('reading and writing back changes nothing at all', () => {
  assert.equal(roundtripMarkdown(figure, src), src);
});

test('a second pass changes nothing', () => {
  const once = roundtripMarkdown(figure, src);
  assert.equal(roundtripMarkdown(figure, once), once);
});

test('every figure line is found; inline mentions and code are not', () => {
  const prose = src.split(/(```[\s\S]*?```|`[^`\n]*`)/).filter((_, i) => i % 2 === 0).join('');   // as Sveltia: code is text
  const found = [...prose.matchAll(all)].map(m => m[0]);
  assert.equal(found.length, 6);
  assert.ok(!found.some(f => f.includes('/uploads/e.png') || f.includes('in-code')));
});

test('values the menus do not offer are kept as written, not lost', () => {
  const d = parse('/uploads/c.png | alt:x | align:middle | width:quarter | wrap:maybe');
  assert.equal(d.align, undefined);
  assert.equal(d.width, undefined);
  assert.equal(d.extra, 'align:middle | width:quarter | wrap:maybe');
});

test('a new figure from the form', () => {
  assert.equal(build({ src: '/uploads/new.png', alt: 'A blue: square', caption: 'Square', credit: 'Ann Cox',
    licence: 'CC BY 4.0', align: 'right', width: 'half', wrap: true }),
  '{figure /uploads/new.png | alt:"A blue: square" | caption:"Square" | credit:"Ann Cox" | licence:"CC BY 4.0" | align:right | width:half | wrap:yes}');
  assert.equal(build({ src: '/uploads/my photo.png', alt: 'x' }), '{figure "/uploads/my photo.png" | alt:"x"}');
});

test('editing in the form changes only what was edited', () => {
  const d = parse('/uploads/d.png | caption:"Caption before alt" | data-id:7 | alt:"Order kept" | wrap:no');
  d.caption = 'A new caption';
  d.wrap = true;
  assert.equal(build(d), '{figure /uploads/d.png | caption:"A new caption" | data-id:7 | alt:"Order kept" | wrap:yes}');
  delete d.caption;
  assert.equal(build(d), '{figure /uploads/d.png | data-id:7 | alt:"Order kept" | wrap:yes}');
});

test('the preview shows the image, escaped, with caption and credit', () => {
  const html = figure.toPreview(parse('/uploads/a.png | alt:"<b>x</b>" | caption:"A & B" | credit:"Ann" | licence:"CC BY"'),
    path => ({ url: 'blob:' + path }));
  assert.equal(html, '<figure><img src="blob:/uploads/a.png" alt="&lt;b&gt;x&lt;/b&gt;"><figcaption>A &amp; B <small>Ann, CC BY</small></figcaption></figure>');
  assert.equal(figure.toPreview({}), '', 'an empty figure (as Sveltia first calls it) previews as nothing');
  assert.equal(figure.toBlock({}), '{figure ""}', 'and toBlock copes with no values');
});

test('the image field never offers stock photo services', () => {
  const image = figure.fields.find(f => f.name === 'src');
  assert.equal(JSON.stringify(image.media_libraries), '{"stock_assets":false}');
});

test('a label is read, written back as it was, and a bad one is kept as another option', () => {
  const pattern = new RegExp(figure.pattern.source);
  const again = t => figure.toBlock(figure.fromBlock(t.match(pattern)));
  const t = '{figure /a.png | alt:"A" | label:fig:depth | width:half}';
  assert.equal(again(t), t);
  assert.equal(figure.fromBlock(t.match(pattern)).label, 'fig:depth');
  const odd = '{figure /a.png | alt:"A" | label:Not A Label}';
  assert.equal(again(odd), odd);
  assert.equal(figure.fromBlock(odd.match(pattern)).label, undefined);
});
