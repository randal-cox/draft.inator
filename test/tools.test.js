// The build tools, on the sample site (examples/sample-site). Each test works on a fresh copy.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { loadSettings } from '../tools/site.js';
import { checkNotes } from '../tools/notes.js';
import { totalTags, recordTags } from '../tools/tags.js';
import { buildWorks, worksJs, topicsFrom } from '../tools/works.js';
import { main } from '../tools/cli.js';
import { loadBlock, roundtrip, roundtripMarkdown } from './harness.js';

const here = path.dirname(new URL(import.meta.url).pathname);
function site() {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'draft-inator-'));
  fs.cpSync(path.join(here, '../examples/sample-site'), dir, { recursive: true });
  return { dir, settings: loadSettings(path.join(dir, 'draft-inator.json')), read: f => fs.readFileSync(path.join(dir, 'content/essays', f), 'utf8') };
}
const quiet = () => { const lines = []; return { out: s => lines.push(s), err: s => lines.push(s), lines }; };
const withoutNotes = s => s.replace(/ \| note:"(?:[^"\\]|\\.)*"/g, '');

test('notes: check mode finds stale and missing notes and changes nothing', () => {
  const { settings, read } = site();
  const before = read('ritual.md');
  const result = checkNotes(settings);
  assert.equal(result.stale, 2);
  assert.deepEqual(result.files[0].stale.map(s => [s.was, s.now]),
    [['', ' | note:"Turner 1969"'], ['note:"Bell 1991"', 'note:"Bell 1992"']]);
  assert.equal(read('ritual.md'), before);
});

test('notes: writing changes nothing but notes, and a second pass changes nothing', () => {
  const { settings, read } = site();
  const before = read('ritual.md');
  checkNotes(settings, { write: true });
  const after = read('ritual.md');
  assert.equal(withoutNotes(after), withoutNotes(before));
  assert.ok(after.includes('`{citation bell-1992-ritual}`'), 'code is left alone (the migration left it too)');
  assert.ok(after.includes('{cite smith-2003-rites | note:"Smith 2003"}'), 'an unresolved work keeps its note');
  assert.ok(after.includes('{cite endnote}'));
  const again = checkNotes(settings, { write: true });
  assert.equal(again.stale, 0);
  assert.deepEqual(again.written, []);
});

test('notes: unresolved works are reported, not rewritten', () => {
  const { settings } = site();
  const d = checkNotes(settings).files.flatMap(f => f.diagnostics);
  assert.ok(d.some(x => x.code === 'citation-unresolved' && x.identifier === 'local:smith-2003-rites'));
});

test('tags: totals from markers, with curator additions and blocks, all reported', () => {
  const { settings } = site();
  const result = totalTags(settings);
  assert.deepEqual(recordTags(result), {
    'ainsworth-1978-patterns': ['attachment'],
    'bell-1992-ritual': ['consent', 'ritual-theory'],
    'turner-1969-ritual': ['ritual-theory']
  });
  assert.deepEqual(result.works['bell-1992-ritual'].counts, { attachment: 1, 'ritual-theory': 3 });
  assert.deepEqual(result.works['bell-1992-ritual'].added, ['consent']);
  assert.deepEqual(result.works['bell-1992-ritual'].blocked, ['attachment']);
  // cite.inator 0.5.1's tools also report the sample's deliberately unresolved work, which is right.
  assert.deepEqual(result.notes.map(n => n.replace(/^.*: /, '')), ['citation-unresolved local:smith-2003-rites']);
});

test('tags: unknown topics and stray curation are noted, never dropped silently', () => {
  const { settings } = site();
  settings.curation = { 'turner-1969-ritual': { add: ['liminality'] }, 'nobody-2000': { add: ['consent'] } };
  const { works, notes } = totalTags(settings);
  assert.ok(works['turner-1969-ritual'].tags.includes('performance'), 'kept: unknown topics are a note, not a removal');
  assert.ok(notes.includes('turner-1969-ritual: performance is not a known topic'));
  assert.ok(notes.includes('turner-1969-ritual: liminality is not a known topic'));
  assert.ok(notes.includes('curation for nobody-2000: no citation of it carries tags'));
  assert.ok(notes.includes('nobody-2000: not in the citation cache'));
});

test('works: every record, its note in the site style, unresolved ones listed', () => {
  const { settings } = site();
  const { works, unresolved } = buildWorks(settings);
  assert.deepEqual(works.map(w => [w.id, w.note]), [
    ['ainsworth-1978-patterns', 'Ainsworth et al. 1978'], ['bell-1992-ritual', 'Bell 1992'],
    ['smith-2003-rites', 'Smith 2003'], ['turner-1969-ritual', 'Turner 1969']]);
  assert.deepEqual(unresolved, [{ id: 'smith-2003-rites', note: 'Smith 2003', from: 'citationText' }]);
  assert.equal(buildWorks({ ...settings, style: undefined }).works[1].note, 'Bell, 1992', 'the style decides the wording');
});

test('works: works.js loads in a browser context and is stable', () => {
  const { settings } = site();
  const text = worksJs({ ...buildWorks(settings), topics: topicsFrom(settings) });
  const window = {};
  vm.runInNewContext(text, { window });
  assert.equal(window.DRAFT_WORKS.length, 4);
  assert.equal(window.DRAFT_TOPICS[0].id, 'ritual-theory');
  assert.equal(worksJs({ ...buildWorks(settings), topics: topicsFrom(settings) }), text);
});

test('the Cite block and the notes check agree, so saving in the editor never makes a note stale', () => {
  const { settings, read } = site();
  const { components } = loadBlock(path.join(here, '../src/blocks/citation.js'), buildWorks(settings).works);
  const file = path.join(settings.content[0], 'essays/ritual.md');
  fs.writeFileSync(file, roundtrip(components.citation, read('ritual.md')));
  assert.equal(checkNotes(settings).stale, 0);
});

test('command line: notes exits 1 when stale, 0 after --write; works --check', () => {
  const { dir } = site();
  const config = path.join(dir, 'draft-inator.json');
  assert.equal(main(['notes', '--config', config], quiet()), 1);
  assert.equal(main(['notes', '--config', config, '--write'], quiet()), 0);
  assert.equal(main(['notes', '--config', config], quiet()), 0);
  fs.rmSync(path.join(dir, 'works.js'));
  assert.equal(main(['works', '--config', config, '--check'], quiet()), 1, 'no works.js yet');
  assert.equal(main(['works', '--config', config], quiet()), 0);
  assert.equal(main(['works', '--config', config, '--check'], quiet()), 0);
  assert.equal(main(['bogus'], quiet()), 2);
});

test('the sample site\'s works.js (used by the demos) is current', () => {
  const config = path.join(here, '../examples/sample-site/draft-inator.json');
  assert.equal(main(['works', '--config', config, '--check'], quiet()), 0, 'run: node tools/cli.js works --config examples/sample-site/draft-inator.json');
});

test('year letters: the notes check, works.js, and the Cite block all say "Cox 1995", so they never undo each other', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'draft-inator-'));
  const rec = (id, given) => ({ id, type: 'book', state: 'resolved', title: 'On ' + given, authors: [{ family: 'Cox', given }], issued: [1995] });
  const cache = { schema: 'citation-inator.cache.v1', records: [rec('cox-1995-rites', 'Ann'), rec('cox-1995-masks', 'Ann')] };
  fs.writeFileSync(path.join(dir, 'page.md'), 'Rites {cite cox-1995-rites} and masks {cite cox-1995-masks | locator:4}.\n');
  const settings = { cache, style: 'chicago-author-date', content: [dir] };
  checkNotes(settings, { write: true });
  const written = fs.readFileSync(path.join(dir, 'page.md'), 'utf8');
  assert.equal(written, 'Rites {cite cox-1995-rites | note:"Cox 1995"} and masks {cite cox-1995-masks | locator:4 | note:"Cox 1995"}.\n');
  const { components } = loadBlock(path.join(here, '../src/blocks/citation.js'), buildWorks(settings).works);
  fs.writeFileSync(path.join(dir, 'page.md'), roundtrip(components.citation, written));
  assert.equal(checkNotes(settings).stale, 0, 'saving in the editor leaves nothing stale');
  settings.noteContext = 'article';
  assert.equal(checkNotes(settings).stale, 2, 'a site that wants article notes can still have them');
});

test('repeated cycles of editor save, notes --write, and check stay stable', () => {
  const { settings, read } = site();
  const { components } = loadBlock(path.join(here, '../src/blocks/citation.js'), buildWorks(settings).works);
  const file = path.join(settings.content[0], 'essays/ritual.md');
  checkNotes(settings, { write: true });
  const settled = read('ritual.md');
  for (let i = 0; i < 3; i++) {
    fs.writeFileSync(file, roundtripMarkdown(components.citation, read('ritual.md')));   // a writer opens and saves every citation
    assert.equal(checkNotes(settings, { write: true }).written.length, 0, `cycle ${i + 1}: notes --write changed nothing`);
    assert.equal(checkNotes(settings).stale, 0, `cycle ${i + 1}: the check passes`);
    assert.equal(read('ritual.md'), settled, `cycle ${i + 1}: the file is byte-for-byte the same`);
  }
});
