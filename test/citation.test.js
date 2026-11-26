import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadBlock, roundtrip } from './harness.js';

const here = new URL('.', import.meta.url).pathname;
const works = JSON.parse(fs.readFileSync(here + 'fixtures/works.json', 'utf8'));
const src = fs.readFileSync(here + 'fixtures/markers.txt', 'utf8');
const { components, window } = loadBlock(here + '../src/blocks/citation.js', works);
const cite = components.citation;
const withoutNotes = s => s.replace(/ \| cue:"(?:[^"\\]|\\.)*"/g, '');

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
  assert.match(out, /\{cite bell-1992-ritual \| cue:"Bell 1992" \| locator:2\}/, 'a stale note is refreshed');
  assert.match(out, /\{cite ainsworth-1978-patterns \| cue:"Ainsworth et al\. 1978" \| form:narrative \| locator:7\}/,
    'the marker keeps its own option order');
  assert.ok(out.includes('{cite endnote} {cite list | tags:consent} {cite nocite bell-1992-ritual}'));
});

test('options the form does not show are kept', () => {
  const out = roundtrip(cite, src);
  assert.ok(out.includes('label:"chapter"'));
});

test('unknown options separated by known ones each stay where they were', () => {
  const marker = '{cite bell-1992-ritual | cue:"Bell 1992" | label:"chapter" | locator:3 | suppress-year-letter:yes}';
  assert.equal(roundtrip(cite, marker), marker);
  const [item] = window.DRAFT_CITATION.parse('bell-1992-ritual | label:"a" | locator:3 | x:1');
  item.extra = 'label:"b"';   // the writer edited "Other options": what's left goes where the first one was
  assert.equal(window.DRAFT_CITATION.build([item]), '{cite bell-1992-ritual | cue:"Bell 1992" | label:"b" | locator:3}');
});

test('parse and build agree', () => {
  const { parse, build } = window.DRAFT_CITATION;
  const items = parse('bell-1992-ritual | locator:12 | tags:a,b; turner-1969-ritual | prefix:"see also"');
  assert.deepEqual(JSON.parse(JSON.stringify(items.map(i => [i.work, i.locator, i.prefix, i.tags]))),
    [['bell-1992-ritual', '12', '', ['a', 'b']], ['turner-1969-ritual', '', 'see also', []]]);
  assert.equal(build(items),
    '{cite bell-1992-ritual | cue:"Bell 1992" | locator:12 | tags:a,b; turner-1969-ritual | cue:"Turner 1969" | prefix:"see also"}');
});

test('an unknown work keeps its id as its note', () => {
  assert.equal(window.DRAFT_CITATION.build([{ work: 'someone-2001-unknown' }]),
    '{cite someone-2001-unknown | cue:"someone-2001-unknown"}');
});

test('the preview reads like the page', () => {
  assert.equal(cite.toPreview(cite.fromBlock(['', 'bell-1992-ritual | locator:12'])), '(Bell 1992, 12)');
  assert.equal(cite.toPreview(cite.fromBlock(['', 'bell-1992-ritual; turner-1969-ritual | prefix:"see also"'])),
    '(Bell 1992; see also Turner 1969)');
});

test('works added later (by an import) get their notes and appear in the form', () => {
  const { addWorks, build } = window.DRAFT_CITATION;
  assert.equal(build([{ work: 'ref-new' }]), '{cite ref-new | cue:"ref-new"}');
  addWorks([{ id: 'ref-new', note: 'Cox 1995', title: 'Masks and makers' }]);
  assert.equal(build([{ work: 'ref-new' }]), '{cite ref-new | cue:"Cox 1995"}');
  assert.equal(build(window.DRAFT_CITATION.parse('local:ref-new')), '{cite local:ref-new | cue:"Cox 1995"}', 'written local:, found all the same');
  const options = cite.fields[0].fields.find(f => f.name === 'work').options;
  assert.ok(options.some(o => o.value === 'ref-new' && o.label === 'Cox 1995 · Masks and makers'));
  assert.equal(cite.toPreview(cite.fromBlock(['', 'local:ref-new | locator:3'])), '(Cox 1995, 3)');
});

test('local: ids are the same work: chosen in the picker, noted, and written back as they were', () => {
  const { parse, build } = window.DRAFT_CITATION;
  const [item] = parse('local:bell-1992-ritual | locator:"p. 94"');
  assert.equal(item.work, 'bell-1992-ritual', 'the picker sees the work');
  assert.equal(build([item]), '{cite local:bell-1992-ritual | cue:"Bell 1992" | locator:"p. 94"}', 'the note is the work\'s; the form stays');
  const [bare] = parse('bell-1992-ritual');
  assert.equal(build([bare]), '{cite bell-1992-ritual | cue:"Bell 1992"}', 'bare stays bare');
});

test('a changed or new work is written bare, unless that would read as a directive', () => {
  const { parse, build } = window.DRAFT_CITATION;
  const [item] = parse('local:bell-1992-ritual');
  item.work = 'turner-1969-ritual';
  assert.match(build([item]), /^\{cite turner-1969-ritual \|/);
  assert.match(build([{ work: 'list' }]), /^\{cite local:list \|/);
  assert.match(build([{ work: 'list-2001' }]), /^\{cite list-2001 \|/);
});

test('fields separated by spaces (cite.inator 0.5.1) are read, and written back in the style they had', () => {
  const pattern = new RegExp(cite.pattern.source);
  const again = m => cite.toBlock(cite.fromBlock(m.match(pattern)));
  assert.equal(again('{cite bell-1992-ritual cue:"Bell 1992" locator:12}'), '{cite bell-1992-ritual cue:"Bell 1992" locator:12}', 'spaces stay spaces');
  assert.equal(again('{cite bell-1992-ritual cue:"Bell 1991" locator:12}'), '{cite bell-1992-ritual cue:"Bell 1992" locator:12}', 'a refreshed note keeps them');
  assert.equal(again('{cite bell-1992-ritual locator:12}'), '{cite bell-1992-ritual cue:"Bell 1992" locator:12}', 'a new note follows the style');
  assert.equal(again('{cite bell-1992-ritual | locator:12}'), '{cite bell-1992-ritual | cue:"Bell 1992" | locator:12}', 'pipes stay pipes');
  assert.equal(again('{cite bell-1992-ritual  |  cue:"Bell 1992"  |  locator:12}'), '{cite bell-1992-ritual  |  cue:"Bell 1992"  |  locator:12}', 'exact separators kept');
  const [item] = window.DRAFT_CITATION.parse('bell-1992-ritual prefix:see also locator:"p. 4" label:"a | b"');
  assert.deepEqual([item.prefix, item.locator, item.extra], ['see also', 'p. 4', 'label:"a | b"'], 'quoted pipes and spaced values');
  assert.ok(!pattern.test('{cite tags bell-1992-ritual methods:"Methods"}'), 'the tags directive is left alone');
  assert.ok(!pattern.test('{cite endnote heading:"Notes"}'), 'a directive with space-separated options is left alone');
});

test('an import placeholder opens as a citation and keeps its unresolved: option (cite.inator 0.5.1)', () => {
  const pattern = new RegExp(cite.pattern.source);
  const raw = '{cite pending-rivera-2020 | cue:"(Rivera, 2020)" | unresolved:"(Rivera, 2020)"}';
  assert.ok(pattern.test(raw), 'a placeholder is a citation');
  const once = cite.toBlock(cite.fromBlock(raw.match(pattern)));
  assert.equal(once, raw, 'its words are kept: the site has no description of a placeholder');
  assert.equal(cite.toBlock(cite.fromBlock(once.match(pattern))), once, 'a second pass changes nothing');
});

test('finishing a placeholder drops its unresolved:, and only that; a same-work edit keeps everything', () => {
  const pattern = new RegExp(cite.pattern.source);
  const raw = '{cite pending-rivera-2020 | unresolved:"(Rivera, 2020)" | label:"chapter" | locator:12}';
  const data = cite.fromBlock(raw.match(pattern));
  assert.equal(cite.toBlock(data), '{cite pending-rivera-2020 | cue:"pending-rivera-2020" | unresolved:"(Rivera, 2020)" | label:"chapter" | locator:12}', 'same work: kept (no words to keep, so its id)');
  data.items[0].work = 'bell-1992-ritual';
  assert.equal(cite.toBlock(data), '{cite bell-1992-ritual | cue:"Bell 1992" | label:"chapter" | locator:12}', 'new work: unresolved: dropped, the rest left to the writer');
  const again = cite.toBlock(cite.fromBlock(cite.toBlock(data).match(pattern)));
  assert.equal(again, cite.toBlock(data), 'a second pass changes nothing');
  assert.equal(JSON.stringify(cite.bound.fields), '["locator","extra"]', 'the form sets these aside when the work changes');
});

test('a placeholder keeps its words after a reload; a new work never inherits them', () => {
  const pattern = new RegExp(cite.pattern.source);
  const raw = '{cite missing-cox | cue:"Cox, 1995" | locator:"p. 42"}';
  const data = cite.fromBlock(raw.match(pattern));
  assert.equal(cite.toBlock(data), raw, 'the words stay: nothing describes missing-cox');
  assert.equal(cite.toPreview(data), '(Cox, 1995, p. 42)');
  data.items[0].work = 'bell-1992-ritual';
  assert.match(cite.toBlock(data), /^\{cite bell-1992-ritual \| cue:"Bell 1992"/, 'the site describes the new work');
  data.items[0].work = 'other-unknown';
  assert.match(cite.toBlock(data), /^\{cite other-unknown \| cue:"other-unknown"/, 'the old words belong to the old work');
  const known = cite.fromBlock('{cite bell-1992-ritual | cue:"Bell 1991"}'.match(pattern));
  assert.equal(cite.toBlock(known), '{cite bell-1992-ritual | cue:"Bell 1992"}', 'a described work is still refreshed');
});

test('markers written on several lines open in the block and keep their lines', () => {
  const pattern = new RegExp(cite.pattern.source);
  const again = m => cite.toBlock(cite.fromBlock(m.match(pattern)));
  const multi = '{\n  cite\n  bell-1992-ritual\n  cue:"Bell 1992"\n  locator:"p. 2"\n}';
  assert.ok(pattern.test(multi), 'space and line breaks around the keyword');
  assert.equal(again(multi), multi, 'kept byte for byte');
  assert.equal(again(again(multi)), multi, 'a second pass changes nothing');
  assert.equal(again('{cite\n  bell-1992-ritual\n  locator:12\n}'), '{cite\n  bell-1992-ritual\n  cue:"Bell 1992"\n  locator:12\n}', 'a new note goes on its own line');
  const data = cite.fromBlock(multi.match(pattern));
  data.items[0].prefix = 'see';
  assert.equal(cite.toBlock(data), '{\n  cite\n  bell-1992-ritual\n  cue:"Bell 1992"\n  locator:"p. 2"\n  prefix:see\n}', 'an added field goes on its own line');
  const two = '{cite bell-1992-ritual | cue:"Bell 1992";\n  turner-1969-ritual | cue:"Turner 1969"}';
  assert.equal(again(two), two, 'the break between works is kept');
  const three = cite.fromBlock(two.match(pattern));
  three.items.push({ work: 'bell-1992-ritual' });
  assert.equal(cite.toBlock(three), '{cite bell-1992-ritual | cue:"Bell 1992";\n  turner-1969-ritual | cue:"Turner 1969";\n  bell-1992-ritual | cue:"Bell 1992"}', 'an added work follows it');
  assert.equal(again('{cite  bell-1992-ritual | cue:"Bell 1992" }'), '{cite  bell-1992-ritual | cue:"Bell 1992" }', 'odd spacing kept');
  for (const d of ['{\n cite\n endnote\n}', '{cite\nlist tags:consent}', '{ cite nocite\n bell-1992-ritual}', '{cite\n  tags bell-1992-ritual methods:"M"}'])
    assert.ok(!pattern.test(d), 'a directive on several lines is still left alone: ' + JSON.stringify(d));
  assert.ok(!pattern.test('{citex bell-1992-ritual}') && !pattern.test('{cite}'), 'only the keyword, followed by a work');
});

test('several-line markers survive a whole page round trip', () => {
  const page = 'Before {\n  cite\n  bell-1992-ritual\n  cue:"Bell 1991"\n} and {cite turner-1969-ritual | locator:3} after.\n';
  const once = roundtrip(cite, page);
  assert.equal(once, 'Before {\n  cite\n  bell-1992-ritual\n  cue:"Bell 1992"\n} and {cite turner-1969-ritual | cue:"Turner 1969" | locator:3} after.\n');
  assert.equal(roundtrip(cite, once), once);
});

// cite.inator 0.6: cue: replaces note: (Randal, 26 Nov 2026, #55).
test('an old note: opens as the cue and is saved as cue:; a new marker writes cue:', () => {
  const pattern = new RegExp(cite.pattern.source);
  const again = m => cite.toBlock(cite.fromBlock(m.match(pattern)));
  assert.equal(again('{cite bell-1992-ritual | note:"Bell 1991" | locator:12}'), '{cite bell-1992-ritual | cue:"Bell 1992" | locator:12}', 'note: becomes cue:, in place, refreshed');
  assert.equal(again('{cite missing-cox note:"Cox, 1995"}'), '{cite missing-cox cue:"Cox, 1995"}', 'an unknown work keeps its words, now as cue:');
  assert.equal(again('{cite bell-1992-ritual | cue:"Bell 1992" | note:"Old"}'), '{cite bell-1992-ritual | cue:"Bell 1992"}', 'with both, cue: wins and note: is retired');
  assert.equal(again('{cite bell-1992-ritual | note:"Old" | cue:"Bell 1992"}'), '{cite bell-1992-ritual | cue:"Bell 1992"}', 'in either order');
  assert.equal(window.DRAFT_CITATION.build([{ work: 'turner-1969-ritual' }]), '{cite turner-1969-ritual | cue:"Turner 1969"}');
  const once = again('{cite bell-1992-ritual | note:"Bell 1991"}');
  assert.equal(again(once), once, 'a second pass changes nothing');
});

test('comment: is the writer\'s: same-work edits keep it and the layout byte for byte; a new work sets it aside', () => {
  const pattern = new RegExp(cite.pattern.source);
  const multi = '{cite missing-cox\n  cue:"Cox, 1995"\n  locator:"p. 42"\n  comment:"Original: (Cox, 1995, p. 42). No matching bibliography entry."\n}';
  const data = cite.fromBlock(multi.match(pattern));
  assert.equal(cite.toBlock(data), multi, 'unchanged, with no description cache: the cue survives a reopen');
  data.items[0].locator = 'p. 43';
  assert.equal(cite.toBlock(data), multi.replace('p. 42"\n', 'p. 43"\n'), 'a same-work edit changes only that field');
  assert.ok(JSON.stringify(cite.bound.fields).includes('extra'), 'comment: is among the options set aside when the work changes (forms.js)');
});
