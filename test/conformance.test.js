// The Cite block must agree with citation.inator about which markers cite a work. The block can't load
// citation.inator in Sveltia, so it keeps its own pattern; this test holds that pattern to the vendored library.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { describeCitation } from '../vendor/citation-inator/citation-tools.mjs';
import { loadBlock } from './harness.js';

const { components } = loadBlock(new URL('../src/blocks/citation.js', import.meta.url).pathname);
const pattern = new RegExp('^' + components.citation.pattern.source + '$');
const cache = { schema: 'citation-inator.cache.v1', records: [] };

const markers = [
  '{citation bell-1992-ritual}', '{citation a; b | locator:3}', '{citation list-2001}', '{citation listing}',
  '{citation endnote-1}', '{citation endnotes-2}', '{citation credit-report}', '{citation evidence-base | locator:2}',
  '{citation nocite-2020}', '{citation endnote}', '{citation endnote | heading:"Notes"}', '{citation endnote }',
  '{citation list a; b}', '{citation list a | sort:year}', '{citation nocite a}', '{citation evidence}', '{citation credit}'
];

for (const marker of markers) {
  test(`${marker}: the block and citation.inator agree`, () => {
    const library = describeCitation(marker, cache).state !== 'malformed';   // unresolved still cites a work
    assert.equal(pattern.test(marker), library);
  });
}
