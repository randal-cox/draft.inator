// The Details panel's rules (src/editor/details.js): which fields it edits, relation choices, what stops a save,
// and that a change touches only its own key.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { panelFields, relationOptions, checkDetails, applyDetail } from '../src/editor/details.js';

const fields = [
  { name: 'title', label: 'Title' },
  { name: 'summary', widget: 'text', required: false },
  { name: 'order', widget: 'number', value_type: 'int', min: 1, max: 99, required: false },
  { name: 'slug', pattern: ['^[a-z0-9-]+$', 'Use lower case letters, numbers, and hyphens.'] },
  { name: 'authors', widget: 'relation', collection: 'people', multiple: true, display_fields: ['{{name}}'], min: 1 },
  { name: 'tags', widget: 'list', required: false },
  { name: 'seo', widget: 'object', fields: [{ name: 'title' }] },
  { name: 'gallery', widget: 'list', fields: [{ name: 'src', widget: 'image' }] },
  { name: 'layout', widget: 'hidden', default: 'article' },
  { name: 'body', widget: 'markdown' }
];

test('which fields the panel edits, and what it keeps as is', () => {
  const shown = Object.fromEntries(panelFields(fields).map(f => [f.name, f]));
  assert.ok(!('body' in shown), 'the body is the text being written, not a detail');
  assert.equal(shown.title.widget, 'string');
  assert.equal(shown.title.required, true, 'required unless it says not, as in Sveltia');
  assert.equal(shown.summary.required, false);
  assert.equal(shown.tags.edited, true, 'a list of plain values is edited');
  assert.equal(shown.gallery.edited, false, 'a list of objects is kept as is');
  assert.equal(shown.seo.edited, false);
  assert.equal(shown.layout.edited, false);
});

test('relation choices come from the host\'s entries, labelled and sorted', () => {
  const entries = { people: [{ slug: 'ben-ito', name: 'Ben Ito' }, { slug: 'ann-cox', name: 'Ann Cox' }, { name: 'No slug' }] };
  assert.deepEqual(relationOptions(fields[4], entries), [{ value: 'ann-cox', label: 'Ann Cox' }, { value: 'ben-ito', label: 'Ben Ito' }]);
  assert.deepEqual(relationOptions({ collection: 'topics', value_field: 'id', display_fields: ['{{fields.label}}', 'id'] }, { topics: [{ id: 't1', label: 'Ritual' }] }),
    [{ value: 't1', label: 'Ritual · t1' }]);
  assert.deepEqual(relationOptions(fields[4], {}), [], 'no entries: no choices, no crash');
});

test('what stops a save', () => {
  const ok = { title: 'A', slug: 'a-b', authors: ['ann-cox'] };
  assert.deepEqual(checkDetails(fields, ok), []);
  const bad = checkDetails(fields, { title: '', slug: 'A B', authors: [], order: 2.5, tags: [] });
  assert.deepEqual(bad.map(p => p.name), ['title', 'order', 'slug', 'authors']);
  assert.equal(bad.find(p => p.name === 'slug').message, 'Use lower case letters, numbers, and hyphens.');
  assert.equal(bad.find(p => p.name === 'order').message, 'Order must be a whole number.');
  assert.deepEqual(checkDetails(fields, { ...ok, order: 100 }).map(p => p.message), ['Order must be at most 99.']);
  assert.deepEqual(checkDetails(fields, { ...ok, seo: null }), [], 'what the panel keeps as is is never judged');
});

test('a change touches only its own key; clearing a key the page lacked adds nothing', () => {
  const fm = '---\n# kept\ntitle: Masks\nseo:\n  title: X\nauthors:\n  - ann-cox\n---\n';
  assert.equal(applyDetail(fm, 'title', 'Masks and rites', true), fm.replace('title: Masks', 'title: Masks and rites'));
  assert.equal(applyDetail(fm, 'authors', ['ann-cox', 'ben-ito'], true), fm.replace('  - ann-cox\n', '  - ann-cox\n  - ben-ito\n'));
  assert.equal(applyDetail(fm, 'summary', '', false), fm, 'an untouched optional field writes nothing');
  assert.equal(applyDetail(fm, 'summary', 'Short', false), fm.replace('---\n', '---\n').replace(/---\n$/, 'summary: Short\n---\n'));
  assert.equal(applyDetail(fm, 'title', '', true), fm.replace('title: Masks', 'title: ""'), 'a cleared key the page had stays, empty');
  assert.equal(applyDetail('', 'title', 'New', false), '---\ntitle: New\n---\n', 'a page without front matter gets some');
});
