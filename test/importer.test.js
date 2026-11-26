// The importer's one edit, against citation.inator's importer (0.4.0, vendored).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import { processImportRequest } from '../vendor/citation-inator/citation-import.mjs';
import { markerKind } from '../vendor/citation-inator/citation-tools.mjs';
import { planReplacement, siteStyleId, worksToKeep, findHandTyped, isProbablyRight, siteEvidence, citationContext, decisionFor, PLACEHOLDER, planUnresolved } from '../src/editor/importer.js';

const root = new URL('..', import.meta.url).pathname;
const source = fs.readFileSync(root + 'demo/editor/sample-import.md', 'utf8');
const ctx = { mode: 'document', source, style: 'auto', citationKeyword: 'cite', namespace: 't', limits: { references: 300 } };
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

test('replacing the reference list leaves {cite endnote} and the body unchanged', () => {
  const out = apply(planReplacement(source, p, a.document.bibliography));
  assert.ok(out.endsWith('so it stays as written.\n\n{cite endnote}\n'));
  assert.ok(!out.includes('Hollow Press'));
  assert.equal(out.slice(0, p.source.indexOf('References')), p.source.slice(0, p.source.indexOf('References')));
});

test('every converted marker is a citation the Cite block can open', async () => {
  const { markerKind } = await import('../vendor/citation-inator/citation-tools.mjs');
  for (const m of p.source.match(/\{cite [^}]*\}/g)) assert.equal(markerKind(m), 'citation', m);
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
  assert.match(sp.source, /\{cite (local:)?bell-1992-ritual \| locator:"p\. 94"\}/, 'the site\'s own id is cited');
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
  assert.match(sp.source, /\{cite turner-1969-ritual[;|}]/, 'written bare, as the site writes it (#26)');
});

test('citations typed by hand are found; markers, code, and bare years are not', () => {
  const text = 'Already {cite bell-1992-ritual} and {cite turner-1969-ritual}. Practice first (Bell, 1992, p. 94). Turner (1969) says so. Code `(Smith, 2001)`. A year (1992) alone.';
  const r = findHandTyped(text, processImportRequest);
  assert.equal(r.count, 2);
  assert.deepEqual(r.examples, ['(Bell, 1992, p. 94)', 'Turner (1969)']);
  assert.deepEqual(findHandTyped('Nothing here {cite bell-1992-ritual}.', processImportRequest), { count: 0, examples: [] });
  assert.equal(findHandTyped(source, processImportRequest).count, 7, 'the import sample: seven, before importing');
  assert.equal(findHandTyped(p.source, processImportRequest).count, 1, 'after importing: only the one with no reference');
});

test('the review sorts citations into probably right and needs attention', () => {
  const probable = a.review.matches.filter(isProbablyRight).length;
  assert.equal(probable, 6);
  assert.equal(a.review.matches.length - probable, 1, 'Rivera, with no reference, needs attention');
});

test('site evidence ignores capitals and initials, and names a missing subtitle', () => {
  const ev = { evidence: { assessment: { comparisons: { title: true, authors: true, year: true } }, differences: ['title', 'authors', 'type'] } };
  const bellSrc = { title: 'Ritual theory, ritual practice', authors: [{ family: 'Bell', given: 'C.' }], issued: [1992] };
  const bellSite = { title: 'Ritual Theory, Ritual Practice', authors: [{ family: 'Bell', given: 'Catherine' }], issued: [1992] };
  assert.equal(siteEvidence(ev, bellSrc, bellSite), 'Same title, authors, and year.');
  const turnerSrc = { title: 'The ritual process: Structure and anti-structure', authors: [{ family: 'Turner', given: 'V.' }], issued: [1969] };
  const turnerSite = { title: 'The Ritual Process', authors: [{ family: 'Turner', given: 'Victor' }], issued: [1969] };
  assert.equal(siteEvidence({ evidence: { mainTitleMatch: true, assessment: { comparisons: { authors: true, year: true } } } }, turnerSrc, turnerSite),
    "Same main title, authors, and year; the site's copy has no subtitle.");
  assert.equal(siteEvidence(ev, bellSrc, { ...bellSite, authors: [{ family: 'Bel' }] }), 'Same title and year; the authors differ.');
});

test('a citation is shown in its own sentence', () => {
  const text = 'First sentence ends here. Practice comes before theory (Bell, 1992, p. 94). In the threshold it rests.';
  const at = text.indexOf('(Bell'), end = text.indexOf(').') + 1;
  assert.deepEqual(citationContext(text, at, end), { before: 'Practice comes before theory ', after: '.' });
  const para = 'Heading\n\nMasks recur (Cox, 1995a), and so do river rites (Cox, 1995b). Next.';
  const a2 = para.indexOf('(Cox, 1995b)');
  assert.deepEqual(citationContext(para, a2, a2 + 12), { before: 'Masks recur (Cox, 1995a), and so do river rites ', after: '.' });
});

test('a citation with no reference kept as unresolved: a flagged marker, its record kept, and nothing left typed by hand (#34)', async () => {
  const { compileMarkdown } = await import('../vendor/citation-inator/citation-compiler.mjs');
  const rivera = a.review.matches.findIndex(m => /Rivera/.test(m.citation.raw));
  const all = [...decisions, decisionFor(rivera, [PLACEHOLDER])];
  assert.deepEqual(decisionFor(rivera, [PLACEHOLDER]), { citationIndex: rivera, action: 'placeholder' });
  const pp = processImportRequest({ ...ctx, action: 'preview', review: a.review, reviewId: a.review.reviewId, decisions: all, recordId: siteStyleId });
  // cite.inator 0.6: a placeholder carries a short cue and the original wording as a comment (no unresolved: copy).
  const marker = pp.source.match(/\{cite pending-[^}]*\}/)[0];
  assert.match(marker, /cue:"Rivera, 2020"/);
  assert.match(marker, /comment:"Original: \(Rivera, 2020\)/);
  assert.equal(markerKind(marker), 'citation');
  const kept = worksToKeep(pp, all);
  const placeholder = kept.find(r => r.state === 'unresolved');
  assert.ok(placeholder && marker.includes(placeholder.id), 'the placeholder record goes to the site with the page');
  const c = compileMarkdown(pp.source, pp.cache);
  assert.ok(c.diagnostics.some(d => d.code === 'citation-unresolved-placeholder'), 'the build flags it');
  assert.equal(findHandTyped(pp.source, processImportRequest).count, 0, 'nothing is typed by hand any more');
});

test('save without importing: citations with no reference become unresolved placeholders; the rest are counted, not guessed', () => {
  const text = 'Masks recur (Okafor, 2019), and (Bell, 1992).\n\nReferences\n\nBell, C. (1992). Ritual theory, ritual practice. Oxford University Press.\n';
  const r = planUnresolved(text, processImportRequest, { keyword: 'cite' });
  assert.equal(r.kept, 1); assert.equal(r.left, 1);
  const after = text.slice(0, r.plan.start) + r.plan.text + text.slice(r.plan.end);
  assert.match(after, /\{cite pending-okafor-2019 \| cue:"Okafor, 2019" \| comment:"Original: \(Okafor, 2019\)[^"]*"\}/);
  assert.ok(after.includes('(Bell, 1992)'), 'a citation with a reference is left as typed');
  assert.equal(markerKind(after.match(/\{cite [^}]*\}/)[0]), 'citation');
  assert.deepEqual(r.records.map(x => [x.id, x.state]), [['pending-okafor-2019', 'unresolved']]);
  assert.equal(findHandTyped(after, processImportRequest).count, 1, 'only Bell is still typed by hand');
});
