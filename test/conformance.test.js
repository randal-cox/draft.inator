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
  '{citation bell-1992-ritual}', '{citation a; b | locator:3}', '{citation list-2001}', '{citation listing}',
  '{citation endnote-1}', '{citation endnotes-2}', '{citation credit-report}', '{citation evidence-base | locator:2}',
  '{citation nocite-2020}', '{citation endnote}', '{citation endnote | heading:"Notes"}', '{citation endnote }',
  '{citation list a; b}', '{citation list a | sort:year}', '{citation nocite a}', '{citation evidence}', '{citation credit}',
  '{citation bell-1992-ritual | note:"Bell 1992" | tags:a,b}', '{citation 10.1177/1363460704040142 | prefix:"see"}',
  '{citation local:bell-1992-ritual}', '{citation local:list}', '{citation local:endnote}', '{citation local:evidence}',
  '{citation local:credit | locator:2}', '{citation local:nocite; bell-1992-ritual}'
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
    const marker = `{citation ${writeId({ work })}}`;
    assert.equal(markerKind(marker), 'citation', marker);
    assert.ok(pattern.test(marker), `the block opens ${marker}`);
  }
});

// Issue #26: one rule for writing a work's id. The block can't import citation.inator inside Sveltia (blocks are
// classic scripts), so it keeps its own copy; this holds that copy to citation.inator's formatRecordId.
test('the block writes ids exactly as citation.inator\'s formatRecordId does', async () => {
  const { formatRecordId } = await import('../vendor/citation-inator/preview/citation-import.mjs');
  const { writeId } = window.DRAFT_CITATION;
  const ids = ['bell-1992-ritual', 'list-2001', 'listing', 'endnote-1', 'credit-report', 'nocite-2020', 'evidence-base',
    'list', 'endnote', 'nocite', 'evidence', 'credit', 'a', '10.1177-x', 'cox-1995-masks', 'ref-a3160b437c6a2485c029'];
  for (const id of ids) assert.equal(writeId({ work: id }), formatRecordId(id), id);
});
