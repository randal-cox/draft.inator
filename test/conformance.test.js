// The Cite block must agree with citation.inator about which markers cite a work. The block can't load
// citation.inator inside Sveltia (Sveltia needs a regular expression to find blocks), so it keeps its own pattern;
// this test holds that pattern to citation.inator's own classifier, markerKind.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { markerKind } from '../vendor/citation-inator/citation-tools.mjs';
import { loadBlock } from './harness.js';

const { components, window } = loadBlock(new URL('../src/blocks/citation.js', import.meta.url).pathname);
const pattern = new RegExp('^' + components.citation.pattern.source + '$');

const markers = [
  '{cite bell-1992-ritual}', '{cite a; b | locator:3}', '{cite list-2001}', '{cite listing}',
  '{cite endnote-1}', '{cite endnotes-2}', '{cite credit-report}', '{cite evidence-base | locator:2}',
  '{cite nocite-2020}', '{cite endnote}', '{cite endnote | heading:"Notes"}', '{cite endnote }',
  '{cite list a; b}', '{cite list a | sort:year}', '{cite nocite a}', '{cite evidence}', '{cite credit}',
  '{cite bell-1992-ritual | note:"Bell 1992" | tags:a,b}', '{cite 10.1177/1363460704040142 | prefix:"see"}',
  '{cite local:bell-1992-ritual}', '{cite local:list}', '{cite local:endnote}', '{cite local:evidence}',
  '{cite local:credit | locator:2}', '{cite local:nocite; bell-1992-ritual}',
  // cite.inator 0.5.1: fields separated by spaces, the tags directive, directives with space-separated options.
  '{cite bell-1992-ritual locator:12}', '{cite bell-1992-ritual note:"Bell 1992" locator:12 prefix:"see"}',
  '{cite a; b locator:3}', '{cite tags bell-1992-ritual methods:"Methods"}', '{cite endnote heading:"Notes"}',
  '{cite local:tags}', '{cite tagsy-2001}'
];

for (const marker of markers) {
  test(`${marker}: the block and citation.inator agree`, () => {
    const kind = markerKind(marker);
    assert.notEqual(kind, 'malformed', 'the test list should hold well-formed markers only');
    assert.equal(pattern.test(marker), kind === 'citation', `citation.inator calls it ${kind}`);
  });
}

test('every id the block writes for a newly chosen work is read by citation.inator as a citation of that work', () => {
  const { writeId } = window.DRAFT_CITATION;
  for (const work of ['bell-1992-ritual', 'list-2001', 'list', 'endnote', 'nocite', 'evidence', 'credit']) {
    const marker = `{cite ${writeId({ work })}}`;
    assert.equal(markerKind(marker), 'citation', marker);
    assert.ok(pattern.test(marker), `the block opens ${marker}`);
  }
});

// Issue #26: one rule for writing a work's id. The block can't import citation.inator inside Sveltia (blocks are
// classic scripts), so it keeps its own copy; this holds that copy to citation.inator's formatRecordId.
test('the block writes ids exactly as citation.inator\'s formatRecordId does', async () => {
  const { formatRecordId } = await import('../vendor/citation-inator/citation-tools.mjs');
  const { writeId } = window.DRAFT_CITATION;
  const ids = ['bell-1992-ritual', 'list-2001', 'listing', 'endnote-1', 'credit-report', 'nocite-2020', 'evidence-base',
    'list', 'endnote', 'nocite', 'evidence', 'credit', 'a', '10.1177-x', 'cox-1995-masks', 'ref-a3160b437c6a2485c029'];
  for (const id of ids) assert.equal(writeId({ work: id }), formatRecordId(id), id);
});

// A site configured with another keyword (cite.inator 0.5.1 allows one, and only one): the block follows it exactly.
test('a site that keeps the citation keyword: the block reads only {citation …}, as cite.inator does', async () => {
  const fs = await import('node:fs'), vm = await import('node:vm');
  const captured = {}, win = { DRAFT_WORKS: [], DRAFT_CITATION_KEYWORD: 'citation' };
  win.CMS = { registerEditorComponent: c => { captured[c.id] = c; } };
  vm.runInNewContext(fs.readFileSync(new URL('../src/blocks/citation.js', import.meta.url), 'utf8'), { window: win, CMS: win.CMS });
  const p = new RegExp('^' + captured.citation.pattern.source + '$');
  for (const m of ['{citation bell-1992-ritual}', '{citation endnote}', '{citation bell-1992-ritual locator:3}', '{cite bell-1992-ritual}', '{citation tags x m:"M"}'])
    assert.equal(p.test(m), markerKind(m, { citationKeyword: 'citation' }) === 'citation', m);
  assert.equal(captured.citation.toBlock({ items: [{ work: 'x' }] }), '{citation x | note:"x"}');
});
