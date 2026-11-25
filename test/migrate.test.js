// Moving a site to one citation keyword (tools/migrate.js; cite.inator 0.5.1, draft.inator #33).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { migrateText } from '../tools/migrate.js';
import { main } from '../tools/cli.js';
import { markerKind } from '../vendor/citation-inator/citation-tools.mjs';

const before = 'A {citation bell-1992-ritual | locator:12}. Short {cite turner-1969}. Tagged {citation tags}.\n\n' +
  '`{citation in code}`\n\n```\n{citation fenced}\n```\n\nEscaped \\{citation x}. <code>{citation html}</code>\n\n{endnotes}\n\n{citation endnote}\n';

test('only the keyword changes; code, escapes, and other text are untouched', () => {
  const { text, changes } = migrateText(before);
  assert.equal(text, before
    .replace('{citation bell-1992-ritual', '{cite bell-1992-ritual')
    .replace('{citation tags}', '{cite local:tags}')
    .replace('{endnotes}', '{cite endnote}')
    .replace('{citation endnote}', '{cite endnote}'));
  assert.equal(changes.filter(c => !c.review).length, 4);
  for (const m of text.match(/(?<![`\\])\{cite [^}]*\}/g)) assert.notEqual(markerKind(m), 'malformed', m);
  assert.equal(markerKind('{cite local:tags}'), 'citation', 'a work named tags stays a work');
});

test('running it again changes nothing', () => {
  const once = migrateText(before).text;
  const twice = migrateText(once);
  assert.equal(twice.text, once);
  assert.deepEqual(twice.changes, []);
});

test('an old short-form {cite <directive word>} is flagged for a person, never rewritten', () => {
  const { text, changes } = migrateText('Old {citation a}. Ambiguous {cite endnote}.');
  assert.equal(text, 'Old {cite a}. Ambiguous {cite endnote}.');
  assert.match(changes.find(c => c.review).review, /Check it by hand/);
  assert.deepEqual(migrateText(text).changes, [], 'once migrated, {cite endnote} is the directive and not flagged again');
});

test('another target keyword rewrites the old short form too', () => {
  assert.equal(migrateText('{citation a} {cite b} {cite list}', { to: 'reference' }).text, '{reference a} {reference b} {reference local:list}');
});

test('the command: exits 1 while markers are left, rewrites with --write, then passes', () => {
  const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'draft-migrate-'));
  fs.writeFileSync(path.join(dir, 'a.md'), before);
  const lines = [], out = s => lines.push(s), err = s => lines.push(s);
  assert.equal(main(['migrate', dir], { out, err }), 1);
  assert.equal(fs.readFileSync(path.join(dir, 'a.md'), 'utf8'), before, 'check mode writes nothing');
  assert.equal(main(['migrate', '--write', dir], { out, err }), 0);
  assert.equal(main(['migrate', dir], { out, err }), 0);
  assert.match(lines.at(-1), /Every marker uses \{cite …\}/);
});
