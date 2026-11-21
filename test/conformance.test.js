// The Cite block must agree with citation.inator about which markers cite a work. The block can't load
// citation.inator inside Sveltia (Sveltia needs a regular expression to find blocks), so it keeps its own pattern;
// this test holds that pattern to citation.inator's own classifier, markerKind.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { markerKind } from '../vendor/citation-inator/citation-tools.mjs';
import { loadBlock } from './harness.js';

const { components } = loadBlock(new URL('../src/blocks/citation.js', import.meta.url).pathname);
const pattern = new RegExp('^' + components.citation.pattern.source + '$');

const markers = [
  '{citation bell-1992-ritual}', '{citation a; b | locator:3}', '{citation list-2001}', '{citation listing}',
  '{citation endnote-1}', '{citation endnotes-2}', '{citation credit-report}', '{citation evidence-base | locator:2}',
  '{citation nocite-2020}', '{citation endnote}', '{citation endnote | heading:"Notes"}', '{citation endnote }',
  '{citation list a; b}', '{citation list a | sort:year}', '{citation nocite a}', '{citation evidence}', '{citation credit}',
  '{citation bell-1992-ritual | note:"Bell 1992" | tags:a,b}', '{citation 10.1177/1363460704040142 | prefix:"see"}'
];

for (const marker of markers) {
  test(`${marker}: the block and citation.inator agree`, () => {
    const kind = markerKind(marker);
    assert.notEqual(kind, 'malformed', 'the test list should hold well-formed markers only');
    assert.equal(pattern.test(marker), kind === 'citation', `citation.inator calls it ${kind}`);
  });
}
