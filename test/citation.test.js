import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadBlock, roundtrip } from './harness.js';

const here = new URL('.', import.meta.url).pathname;
const works = JSON.parse(fs.readFileSync(here + 'fixtures/works.json', 'utf8'));
const src = fs.readFileSync(here + 'fixtures/markers.txt', 'utf8');
const { components, window } = loadBlock(here + '../src/blocks/citation.js', works);
const cite = components.citation;
const withoutNotes = s => s.replace(/ \| note:"(?:[^"\\]|\\.)*"/g, '');

test('registers a Citation block', () => {
  assert.ok(cite, 'registerEditorComponent was not called with id "citation"');
  assert.equal(cite.label, 'Citation');
});

test('reading and writing back changes nothing but the notes', () => {
  const out = roundtrip(cite, src);
  assert.equal(withoutNotes(out), withoutNotes(src));
});

test('a second pass changes nothing', () => {
  const once = roundtrip(cite, src);
  assert.equal(roundtrip(cite, once), once);
});

test('every citing marker gets its current note; list, endnote, and nocite are left alone', () => {
  const out = roundtrip(cite, src);
  assert.match(out, /\{citation bell-1992-ritual \| note:"Bell 1992" \| locator:2\}/, 'a stale note is refreshed');
  assert.match(out, /\{citation ainsworth-1978-patterns \| note:"Ainsworth et al\. 1978" \| form:narrative \| locator:7\}/,
    'the marker keeps its own option order');
  assert.ok(out.includes('{citation endnote} {citation list | tags:consent} {citation nocite bell-1992-ritual}'));
});

test('options the form does not show are kept', () => {
  const out = roundtrip(cite, src);
  assert.ok(out.includes('label:"chapter"'));
});

test('parse and build agree', () => {
  const { parse, build } = window.DRAFT_CITATION;
  const items = parse('bell-1992-ritual | locator:12 | tags:a,b; turner-1969-ritual | prefix:"see also"');
  assert.deepEqual(JSON.parse(JSON.stringify(items.map(i => [i.work, i.locator, i.prefix, i.tags]))),
    [['bell-1992-ritual', '12', '', ['a', 'b']], ['turner-1969-ritual', '', 'see also', []]]);
  assert.equal(build(items),
    '{citation bell-1992-ritual | note:"Bell 1992" | locator:12 | tags:a,b; turner-1969-ritual | note:"Turner 1969" | prefix:"see also"}');
});

test('an unknown work keeps its id as its note', () => {
  assert.equal(window.DRAFT_CITATION.build([{ work: 'someone-2001-unknown' }]),
    '{citation someone-2001-unknown | note:"someone-2001-unknown"}');
});

test('the preview reads like the page', () => {
  assert.equal(cite.toPreview(cite.fromBlock(['', 'bell-1992-ritual | locator:12'])), '(Bell 1992, 12)');
  assert.equal(cite.toPreview(cite.fromBlock(['', 'bell-1992-ritual; turner-1969-ritual | prefix:"see also"'])),
    '(Bell 1992; see also Turner 1969)');
});
