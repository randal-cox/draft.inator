// Front matter edited without disturbing anything else (src/editor/yaml.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readYaml, writeYaml, readFrontMatter, writeFrontMatter } from '../src/editor/yaml.js';

const doc = `# Written by hand; keep this comment.
title: Masks in ritual
subtitle: "On thresholds: a note"
slug: 'masks-in-ritual'
order: 3
featured: true
published: 2026-11-21
excerpt:   A short summary   # trailing comment stays
tags: [ritual, masks, "rites, of passage"]
authors:
  - ann-cox
  - ben-ito
topics:
- ritual-theory
bio: |
  First line.

  Second paragraph.
seo:
  title: Masks
  description: A nested map the editor keeps as is.
gallery:
  - src: a.png
    alt: A
empty:
`;

test('reading: values, types, and what is editable', () => {
  const { values, editable, order } = readYaml(doc);
  assert.deepEqual(order, ['title', 'subtitle', 'slug', 'order', 'featured', 'published', 'excerpt', 'tags', 'authors', 'topics', 'bio', 'seo', 'gallery', 'empty']);
  assert.equal(values.title, 'Masks in ritual');
  assert.equal(values.subtitle, 'On thresholds: a note');
  assert.equal(values.slug, 'masks-in-ritual');
  assert.equal(values.order, 3);
  assert.equal(values.featured, true);
  assert.equal(values.published, '2026-11-21');
  assert.equal(values.excerpt, 'A short summary');
  assert.deepEqual(values.tags, ['ritual', 'masks', 'rites, of passage']);
  assert.deepEqual(values.authors, ['ann-cox', 'ben-ito']);
  assert.deepEqual(values.topics, ['ritual-theory']);
  assert.equal(values.bio, 'First line.\n\nSecond paragraph.\n');
  assert.equal(values.empty, null);
  assert.equal(editable.seo, false);
  assert.equal(editable.gallery, false);
  assert.ok(!('seo' in values));
});

test('no change gives back every byte', () => {
  assert.equal(writeYaml(doc, {}), doc);
  const { values } = readYaml(doc);
  assert.equal(writeYaml(doc, values), doc, 'writing the same values changes nothing');
});

test('one change touches only that key\'s line', () => {
  const out = writeYaml(doc, { title: 'Masks and thresholds' });
  assert.equal(out, doc.replace('title: Masks in ritual', 'title: Masks and thresholds'));
});

test('each key keeps its style: quotes, comments, flow and block lists', () => {
  let out = writeYaml(doc, { subtitle: 'New: subtitle', slug: 'masks', excerpt: 'Shorter' });
  assert.ok(out.includes('subtitle: "New: subtitle"\n'), 'double quotes stay');
  assert.ok(out.includes("slug: 'masks'\n"), 'single quotes stay');
  assert.ok(out.includes('excerpt:   Shorter # trailing comment stays\n'), 'spacing and comment stay');
  out = writeYaml(doc, { tags: ['ritual', 'masks'], authors: ['ann-cox'], topics: ['ritual-theory', 'liminality'] });
  assert.ok(out.includes('tags: [ritual, masks]\n'), 'a flow list stays a flow list');
  assert.ok(out.includes('authors:\n  - ann-cox\nbio:') || out.includes('authors:\n  - ann-cox\ntopics:'), 'a block list stays a block list, same indent');
  assert.ok(out.includes('topics:\n- ritual-theory\n- liminality\n'), 'compact block lists keep their compact form');
  assert.equal(out.split('\n').filter(l => l.startsWith('#')).length, 1, 'the comment line is still there');
});

test('text blocks, adding, and removing', () => {
  let out = writeYaml(doc, { bio: 'One line only.\n' });
  assert.ok(out.includes('bio: |\n  One line only.\nseo:'));
  out = writeYaml(doc, { visibility: 'members', excerpt: undefined });
  assert.ok(!out.includes('excerpt:'), 'removed');
  assert.ok(out.endsWith('empty:\nvisibility: members\n'), 'new keys go at the end');
  assert.equal(writeYaml(out, { visibility: undefined, excerpt: 'A short summary' }).includes('excerpt: A short summary\n'), true);
});

test('values that would read as something else are quoted', () => {
  const out = writeYaml('a: x\n', { a: 'true', b: '1992', c: 'see: this', d: '#tag', e: 'plain words', f: 12, g: false, h: null });
  assert.equal(out, 'a: "true"\nb: "1992"\nc: "see: this"\nd: "#tag"\ne: plain words\nf: 12\ng: false\nh: null\n');
  assert.equal(readYaml(out).values.b, '1992', 'and read back as written');
});

test('what the editor keeps as is can not be changed by mistake, and survives other changes', () => {
  assert.throws(() => writeYaml(doc, { seo: { title: 'x' } }), /keeps as is/);
  const out = writeYaml(doc, { title: 'X' });
  assert.ok(out.includes('seo:\n  title: Masks\n  description: A nested map the editor keeps as is.\ngallery:\n  - src: a.png\n    alt: A\n'));
});

test('line endings and a missing final newline are kept', () => {
  const crlf = 'title: A\r\ntags: [x]\r\n';
  assert.equal(writeYaml(crlf, { title: 'B' }), 'title: B\r\ntags: [x]\r\n');
  assert.equal(writeYaml(crlf, { order: 1 }), 'title: A\r\ntags: [x]\r\norder: 1\r\n');
  assert.equal(writeYaml('title: A', { title: 'B' }), 'title: B');
});

test('front matter blocks keep their delimiters; none becomes a new block', () => {
  const fm = '---\ntitle: A\n---\n';
  assert.deepEqual(readFrontMatter(fm).values, { title: 'A' });
  assert.equal(writeFrontMatter(fm, { title: 'B' }), '---\ntitle: B\n---\n');
  assert.equal(writeFrontMatter(fm, {}), fm);
  assert.equal(writeFrontMatter('', { title: 'New' }), '---\ntitle: New\n---\n');
  assert.equal(writeFrontMatter('', {}), '');
  assert.equal(writeFrontMatter('﻿---\r\ntitle: A\r\n...\r\n', { title: 'B' }), '﻿---\r\ntitle: B\r\n...\r\n');
});
