import { test } from 'node:test';
import assert from 'node:assert/strict';
import { splitFrontMatter, joinFrontMatter } from '../src/editor/frontmatter.js';

const cases = [
  '---\ntitle: Masks\norder: 3\n---\n\n# Masks\n\nBody {cite a}.\n',
  '---\r\ntitle: "Windows: line ends"\r\n---\r\nBody\r\n',
  '﻿---\ntitle: BOM\n---\nBody',
  '---\ntitle: closed with dots\n...\nBody',
  '---\n---\nEmpty front matter',
  '---\ntitle: no body\n---',
  'No front matter at all.\n\n---\n\nA rule, not front matter.',
  '--- not front matter\nBody',
  ''
];

test('split and join give back every byte', () => {
  for (const t of cases) assert.equal(joinFrontMatter(splitFrontMatter(t)), t, JSON.stringify(t));
});

test('the body is what the editor edits; the front matter is set aside', () => {
  assert.deepEqual(splitFrontMatter(cases[0]), { frontMatter: '---\ntitle: Masks\norder: 3\n---\n', body: '\n# Masks\n\nBody {cite a}.\n' });
  assert.equal(splitFrontMatter(cases[6]).frontMatter, '');
  assert.equal(splitFrontMatter(cases[7]).frontMatter, '');
  assert.equal(splitFrontMatter(cases[5]).body, '');
});

test('editing the body leaves the front matter untouched', () => {
  const { frontMatter, body } = splitFrontMatter(cases[1]);
  assert.equal(joinFrontMatter({ frontMatter, body: body.replace('Body', 'Edited') }), '---\r\ntitle: "Windows: line ends"\r\n---\r\nEdited\r\n');
});
