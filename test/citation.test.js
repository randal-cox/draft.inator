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

test('unknown options separated by known ones each stay where they were', () => {
  const marker = '{citation bell-1992-ritual | note:"Bell 1992" | label:"chapter" | locator:3 | suppress-year-letter:yes}';
  assert.equal(roundtrip(cite, marker), marker);
  const [item] = window.DRAFT_CITATION.parse('bell-1992-ritual | label:"a" | locator:3 | x:1');
  item.extra = 'label:"b"';   // the writer edited "Other options": what's left goes where the first one was
  assert.equal(window.DRAFT_CITATION.build([item]), '{citation bell-1992-ritual | note:"Bell 1992" | label:"b" | locator:3}');
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

test('works added later (by an import) get their notes and appear in the form', () => {
  const { addWorks, build } = window.DRAFT_CITATION;
  assert.equal(build([{ work: 'ref-new' }]), '{citation ref-new | note:"ref-new"}');
  addWorks([{ id: 'ref-new', note: 'Cox 1995', title: 'Masks and makers' }]);
  assert.equal(build([{ work: 'ref-new' }]), '{citation ref-new | note:"Cox 1995"}');
  assert.equal(build(window.DRAFT_CITATION.parse('local:ref-new')), '{citation local:ref-new | note:"Cox 1995"}', 'written local:, found all the same');
  const options = cite.fields[0].fields.find(f => f.name === 'work').options;
  assert.ok(options.some(o => o.value === 'ref-new' && o.label === 'Cox 1995 · Masks and makers'));
  assert.equal(cite.toPreview(cite.fromBlock(['', 'local:ref-new | locator:3'])), '(Cox 1995, 3)');
});

test('local: ids are the same work: chosen in the picker, noted, and written back as they were', () => {
  const { parse, build } = window.DRAFT_CITATION;
  const [item] = parse('local:bell-1992-ritual | locator:"p. 94"');
  assert.equal(item.work, 'bell-1992-ritual', 'the picker sees the work');
  assert.equal(build([item]), '{citation local:bell-1992-ritual | note:"Bell 1992" | locator:"p. 94"}', 'the note is the work\'s; the form stays');
  const [bare] = parse('bell-1992-ritual');
  assert.equal(build([bare]), '{citation bell-1992-ritual | note:"Bell 1992"}', 'bare stays bare');
});

test('a changed or new work is written bare, unless that would read as a directive', () => {
  const { parse, build } = window.DRAFT_CITATION;
  const [item] = parse('local:bell-1992-ritual');
  item.work = 'turner-1969-ritual';
  assert.match(build([item]), /^\{citation turner-1969-ritual \|/);
  assert.match(build([{ work: 'list' }]), /^\{citation local:list \|/);
  assert.match(build([{ work: 'list-2001' }]), /^\{citation list-2001 \|/);
});

test('{cite …} and {citation …} are the same block; each keeps its keyword, and a new citation is {cite …} (#37)', () => {
  const pattern = new RegExp(cite.pattern.source);
  const read = m => cite.fromBlock(m.match(pattern));
  assert.equal(cite.toBlock(read('{cite bell-1992-ritual | locator:3}')), '{cite bell-1992-ritual | note:"Bell 1992" | locator:3}');
  assert.equal(cite.toBlock(read('{citation bell-1992-ritual | locator:3}')), '{citation bell-1992-ritual | note:"Bell 1992" | locator:3}');
  assert.equal(cite.toBlock({ items: [{ work: 'bell-1992-ritual' }] }), '{cite bell-1992-ritual | note:"Bell 1992"}', 'a new citation');
  assert.ok(!pattern.test('{cite endnote}') && !pattern.test('{cite list a; b}') && !pattern.test('{cite evidence}'), 'directives under cite are left alone');
  assert.ok(pattern.test('{cite list-2001}'), 'a work whose id starts with a directive word still opens');
  assert.equal(cite.toPreview(read('{cite bell-1992-ritual | locator:3}')), '(Bell 1992, 3)');
});
