// renderArticle (src/editor/editor.js): the article as readers see it, from the same blocks the editor uses.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const root = new URL('..', import.meta.url).pathname;
const works = JSON.parse(fs.readFileSync(root + 'test/fixtures/works.json', 'utf8'));
globalThis.window = { DRAFT_WORKS: works };
const ctx = vm.createContext({ window: globalThis.window });
for (const f of ['src/editor/forms.js', 'src/blocks/citation.js', 'src/blocks/figure.js']) {
  vm.runInContext(fs.readFileSync(root + f, 'utf8'), Object.assign(ctx, { CMS: globalThis.window.CMS }));
}
const { renderArticle } = await import('../src/editor/editor.js');
const md = s => s.split(/\n{2,}/).map(p => (p.startsWith('<') || /^DRAFT/.test(p) ? p : `<p>${p}</p>`)).join('\n');

test('figures are laid out as their tags say, escaped', () => {
  const r = renderArticle('{figure /uploads/a.png | alt:"A <mask>" | caption:"Cap & co" | credit:"Ann" | align:right | width:half | wrap:yes}', { render: md });
  assert.equal(r.html, '<figure class="fig align-right width-half wrap"><img src="/uploads/a.png" alt="A &lt;mask&gt;"><figcaption>Cap &amp; co <small>Ann</small></figcaption></figure>');
  assert.equal(r.figures, 1);
});

test('citations show their notes and are listed at {citation endnote}', () => {
  const r = renderArticle('First {citation bell-1992-ritual | locator:12}.\n\n{citation endnote}\n\nAfter.', { render: md });
  assert.match(r.html, /<a class="cite" href="#di-ref-bell-1992-ritual">\(Bell 1992, 12\)<\/a>/);
  assert.ok(r.html.indexOf('Works cited') < r.html.indexOf('After.'), 'the list goes where {citation endnote} is');
  assert.match(r.html, /<li id="di-ref-bell-1992-ritual">Bell 1992\. <cite>Ritual Theory, Ritual Practice<\/cite>\.<\/li>/);
});

test('without {citation endnote} the list goes at the end; unknown works are marked', () => {
  const r = renderArticle('A {citation someone-2001-unknown}.', { render: md });
  assert.ok(r.html.trimEnd().endsWith('</section>'));
  assert.match(r.html, /someone-2001-unknown <span class="unresolved">\(not yet found\)<\/span>/);
});

test('markers in code are left as text', () => {
  const r = renderArticle('Code: `{citation bell-1992-ritual}` and `{figure /a.png | alt:x}`', { render: md });
  assert.equal(r.citations, 0);
  assert.ok(r.html.includes('`{citation bell-1992-ritual}`'));
});

test('an image that is not available says so instead of breaking', () => {
  const r = renderArticle('{figure /uploads/gone.png | alt:"Gone"}', { render: md, imageURL: () => null });
  assert.match(r.html, /<div class="di-missing" role="img" aria-label="Gone">\/uploads\/gone\.png isn't in this browser/);
});

test('title and counts', () => {
  const r = renderArticle('# A title\n\nTwo words {citation bell-1992-ritual}.', { render: md });
  assert.equal(r.title, 'A title');
  assert.equal(r.words, 4);
  assert.equal(r.citations, 1);
});

test('a block that is not enabled is skipped: its tags stay as text', async () => {
  const r = renderArticle('A {citation bell-1992-ritual}.\n\n{figure /a.png | alt:"x"}', { render: md, blocks: ['citation'] });
  assert.equal(r.citations, 1);
  assert.equal(r.figures, 0);
  assert.ok(r.html.includes('{figure /a.png | alt:"x"}'));
});

test('with a block not loaded at all, rendering still works', async () => {
  const saved = globalThis.window.DraftForms.components.figure;
  delete globalThis.window.DraftForms.components.figure;
  try {
    const r = renderArticle('A {citation bell-1992-ritual}. {figure /a.png | alt:"x"}', { render: md });
    assert.equal(r.citations, 1);
  } finally { globalThis.window.DraftForms.components.figure = saved; }
});

test('bodyKind tells an HTML body from a Markdown one', async () => {
  const { bodyKind } = await import('../src/editor/editor.js');
  assert.equal(bodyKind('# Title\n\nA paragraph with <em>a little</em> HTML.\n'), 'markdown');
  assert.equal(bodyKind('<p data-comment-target="a">One.</p>\n<ul class="cc-list"><li>Two</li></ul>\n<p>Three, longer, and more.</p>'), 'html');
  assert.equal(bodyKind(''), 'markdown');
});

test('the editor box stays hidden when a site hides it', () => {
  const css = fs.readFileSync(root + 'src/editor/editor.css', 'utf8');
  assert.match(css, /\.di-editor\[hidden\]\s*\{\s*display:\s*none\s*!important;?\s*\}/,
    '.di-editor sets display: flex, which would otherwise override the hidden attribute');
});

test('a kept draft is offered, never loaded unasked', async () => {
  const { recoveryChoice } = await import('../src/editor/editor.js');
  assert.equal(recoveryChoice('page', null), 'none');
  assert.equal(recoveryChoice('page', { text: 'page' }), 'same', 'identical: nothing to offer');
  assert.equal(recoveryChoice('page v1', { text: 'my edit', base: 'page v1' }), 'offer');
  assert.equal(recoveryChoice('page v2', { text: 'my edit', base: 'page v1' }), 'offer-changed', 'someone saved since: warn');
  assert.equal(recoveryChoice('page', { text: 'old plain draft' }), 'offer', 'drafts kept by 0.3.0 (no base) are offered');
});

test('with citation.inator\'s compiler and a cache, the preview has formatted citations and endnotes', async () => {
  const { compileHTML } = await import('../vendor/citation-inator/preview/citation-compiler.mjs');
  const cache = JSON.parse(fs.readFileSync(root + 'examples/sample-site/citations.json', 'utf8'));
  const text = 'Practice *first* {citation bell-1992-ritual | note:"Bell 1992" | locator:12}.\n\n{figure /uploads/a.png | alt:"A"}\n\nCode: `{citation bell-1992-ritual}`';
  const withCode = m => md(m).replace(/`([^`]+)`/g, '<code>$1</code>');   // as marked does
  const r = renderArticle(text, { render: withCode, citations: { compileHTML, cache } });
  assert.equal(r.formatted, true);
  assert.match(r.html, /class="citation-cite"[^>]*>Bell 1992, 12<\/a>/, 'formatted, Chicago author-date');
  assert.match(r.html, /citation-endnotes[\s\S]*Ritual Theory, Ritual Practice/, 'endnotes added though the text has no endnote marker');
  assert.match(r.html, /<figure class="fig"><img src="\/uploads\/a.png" alt="A">/, 'figures as before');
  assert.equal((r.html.match(/citation-cite/g) || []).length, 1, 'the marker in code is not a citation');
});

test('if the compiler stops, the preview shows notes and says why', () => {
  const r = renderArticle('A {citation bell-1992-ritual}.', { render: md, citations: { compileHTML: () => { throw new Error('boom'); }, cache: { records: [] } } });
  assert.equal(r.formatted, false);
  assert.equal(r.compileError, 'boom');
  assert.match(r.html, /<a class="cite"/);
});
