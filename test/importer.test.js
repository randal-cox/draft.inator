// The importer's one edit, against citation.inator's importer (0.4.0 preview, vendored).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { processImportRequest } from '../vendor/citation-inator/preview/citation-import.mjs';
import { planReplacement } from '../src/editor/importer.js';

const root = new URL('..', import.meta.url).pathname;
const source = fs.readFileSync(root + 'demo/editor/sample-import.md', 'utf8');
const ctx = { mode: 'document', source, style: 'auto', citationKeyword: 'citation', namespace: 't', limits: { references: 300 } };
const a = processImportRequest(ctx);
const decisions = a.review.matches.map((m, i) => m.items.every(it => it.candidates?.length === 1) &&
  { citationIndex: i, action: 'accept', targets: m.items.map(it => ({ recordId: it.candidates[0].recordId })) }).filter(Boolean);
const p = processImportRequest({ ...ctx, action: 'preview', review: a.review, reviewId: a.review.reviewId, decisions });
const apply = plan => source.slice(0, plan.start) + plan.text + source.slice(plan.end);

test('the sample has six convertible citations and one with no reference', () => {
  assert.equal(a.review.matches.length, 7);
  assert.equal(decisions.length, 6);
});

test('applying the one edit gives exactly citation.inator\'s converted text', () => {
  assert.equal(apply(planReplacement(source, p)), p.source);
});

test('the edit touches nothing outside the converted citations', () => {
  const plan = planReplacement(source, p);
  assert.equal(source.slice(0, plan.start), p.source.slice(0, plan.start));
  assert.ok(apply(plan).includes('(Rivera, 2020), so it stays as written'), 'the unmatched citation stays as written');
  assert.ok(apply(plan).includes('\nReferences\n'), 'the reference list stays unless asked');
});

test('replacing the reference list leaves {citation endnote} and the body unchanged', () => {
  const out = apply(planReplacement(source, p, a.document.bibliography));
  assert.ok(out.endsWith('so it stays as written.\n\n{citation endnote}\n'));
  assert.ok(!out.includes('Hollow Press'));
  assert.equal(out.slice(0, p.source.indexOf('References')), p.source.slice(0, p.source.indexOf('References')));
});

test('every converted marker is a citation the Cite block can open', async () => {
  const { markerKind } = await import('../vendor/citation-inator/citation-tools.mjs');
  for (const m of p.source.match(/\{citation [^}]*\}/g)) assert.equal(markerKind(m), 'citation', m);
});
