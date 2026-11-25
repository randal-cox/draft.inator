// The importer's one edit, against citation.inator's importer (0.4.0, vendored).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { processImportRequest } from '../vendor/citation-inator/citation-import.mjs';
import { planReplacement, siteStyleId, worksToKeep, findHandTyped, isProbablyRight } from '../src/editor/importer.js';

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

test('new works get site-style ids, unique against what the site has', () => {
  const r = { authors: [{ family: 'Muñoz', given: 'J. E.' }], issued: [2019], title: 'Cruising utopia: The then and there' };
  assert.equal(siteStyleId(r, { taken: [] }), 'munoz-2019-cruising');
  assert.equal(siteStyleId(r, { taken: ['munoz-2019-cruising'] }), 'munoz-2019-cruising-2');
  assert.equal(siteStyleId({ authors: [{ literal: 'World Health Organization' }], issued: [2020], title: 'The atlas' }), 'world-2020-atlas');
  assert.equal(siteStyleId({ title: 'A note', issued: [] }), 'anon-nd-note');
});

test('with the site\'s works: a proposed site work is reused, new ones are named and kept, uncited ones are not', () => {
  const siteCache = JSON.parse(fs.readFileSync(root + 'examples/sample-site/citations.json', 'utf8'));
  const sctx = { ...ctx, siteCache };
  const sa = processImportRequest(sctx);
  const bellSource = sa.referenceRecords.find(r => r.title.startsWith('Ritual theory')).id;
  const proposal = sa.siteMatches.find(m => m.recordId === bellSource);
  assert.deepEqual(proposal.candidates.map(c => c.recordId), ['bell-1992-ritual'], 'Bell is proposed as the site\'s own');
  assert.ok(proposal.candidates[0].requiresReview, 'and needs the writer to confirm it');
  const recordDecisions = [{ recordId: bellSource, siteRecordId: 'bell-1992-ritual' }];
  // Only some citations are converted, so one reference stays uncited.
  const some = decisions.filter(d => !/Ainsworth/.test(sa.review.matches[d.citationIndex].citation.raw));
  const sp = processImportRequest({ ...sctx, action: 'preview', review: sa.review, reviewId: sa.review.reviewId, decisions: some, recordDecisions, recordId: siteStyleId });
  assert.match(sp.source, /\{citation (local:)?bell-1992-ritual \| locator:"p\. 94"\}/, 'the site\'s own id is cited');
  const kept = worksToKeep(sp, some).map(r => r.id).sort();
  assert.deepEqual(kept, ['cox-1995-masks', 'cox-1995-rites', 'turner-1969-ritual-2'], 'new and cited only: not Bell (the site has it), not Ainsworth (not cited)');
  for (const id of kept) assert.ok(sp.source.includes(id), `${id} is in the text`);
});

test('a site work with a shorter title is still proposed, and reusing it adds no duplicate (#16)', () => {
  const siteCache = JSON.parse(fs.readFileSync(root + 'examples/sample-site/citations.json', 'utf8'));
  const sctx = { ...ctx, siteCache };
  const sa = processImportRequest(sctx);
  const turner = sa.referenceRecords.find(r => r.title.startsWith('The ritual process')).id;
  const proposal = sa.siteMatches.find(m => m.recordId === turner);
  assert.deepEqual(proposal.candidates.map(c => c.recordId), ['turner-1969-ritual'], 'site: "The Ritual Process"; source adds a subtitle');
  assert.ok(proposal.candidates[0].requiresReview);
  const sp = processImportRequest({ ...sctx, action: 'preview', review: sa.review, reviewId: sa.review.reviewId, decisions,
    recordDecisions: [{ recordId: turner, siteRecordId: 'turner-1969-ritual' }], recordId: siteStyleId });
  assert.ok(sp.reusedRecordIds.includes('turner-1969-ritual'));
  assert.ok(!worksToKeep(sp, decisions).some(r => r.id.startsWith('turner-')), 'no turner-1969-ritual-2');
  assert.match(sp.source, /\{citation turner-1969-ritual[;|}]/, 'written bare, as the site writes it (#26)');
});

test('citations typed by hand are found; markers, code, and bare years are not', () => {
  const text = 'Already {citation bell-1992-ritual} and {cite turner-1969-ritual}. Practice first (Bell, 1992, p. 94). Turner (1969) says so. Code `(Smith, 2001)`. A year (1992) alone.';
  const r = findHandTyped(text, processImportRequest);
  assert.equal(r.count, 2);
  assert.deepEqual(r.examples, ['(Bell, 1992, p. 94)', 'Turner (1969)']);
  assert.deepEqual(findHandTyped('Nothing here {citation bell-1992-ritual}.', processImportRequest), { count: 0, examples: [] });
  assert.equal(findHandTyped(source, processImportRequest).count, 7, 'the import sample: seven, before importing');
  assert.equal(findHandTyped(p.source, processImportRequest).count, 1, 'after importing: only the one with no reference');
});

test('the review sorts citations into probably right and needs attention', () => {
  const probable = a.review.matches.filter(isProbablyRight).length;
  assert.equal(probable, 6);
  assert.equal(a.review.matches.length - probable, 1, 'Rivera, with no reference, needs attention');
});
