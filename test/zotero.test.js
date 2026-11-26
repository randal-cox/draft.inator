// Cite from Zotero (src/editor/zotero.js): connecting, searching, and preparing a chosen item with cite.inator's
// manager module, against the demo's stand-in for api.zotero.org.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import * as manager from '../vendor/citation-inator/citation-manager.mjs';
import { connect, searchZotero, describeItem, prepare, bindingKey, API } from '../src/editor/zotero.js';
import { sampleFetch, SAMPLE_KEY } from '../demo/editor/zotero-sample.mjs';

const siteCache = JSON.parse(fs.readFileSync(new URL('../examples/sample-site/citations.json', import.meta.url)));
const calls = [];
const fetch = (url, init) => { calls.push({ url, init }); return sampleFetch(url, init); };

test('connecting checks the key with Zotero and learns whose library it opens; a bad key says why', async () => {
  const c = await connect(SAMPLE_KEY, { fetch });
  assert.deepEqual([c.userID, c.username], [1000001, 'sample-library']);
  assert.equal(calls.at(-1).url, `${API}/keys/current`);
  assert.equal(calls.at(-1).init.headers['Zotero-API-Version'], '3');
  await assert.rejects(connect('short', { fetch }), /24 letters and digits/);
  await assert.rejects(connect('x'.repeat(24), { fetch }), /refused this key/);
});

test('search asks for items only, as CSL-JSON, and finds by author, title, or year', async () => {
  const c = await connect(SAMPLE_KEY, { fetch });
  const items = await searchZotero(c, 'ritual', { fetch });
  const u = new URL(calls.at(-1).url);
  assert.equal(u.pathname, '/users/1000001/items');
  assert.equal(u.searchParams.get('itemType'), '-attachment || note');
  assert.match(u.searchParams.get('include'), /csljson/);
  assert.deepEqual(items.map(i => describeItem(i).label), ['Bell 1992', 'Turner 1969']);
  assert.equal(describeItem((await searchZotero(c, 'guest', { fetch }))[0]).label, 'Guest et al. 2006');
});

test('a chosen item gets a site-style id, and a work the site already has is offered, not merged', async () => {
  const c = await connect(SAMPLE_KEY, { fetch });
  const [bell] = await searchZotero(c, 'bell', { fetch });
  const p = prepare(bell, manager, { siteCache, taken: siteCache.records.map(r => r.id), bound: {} });
  assert.equal(p.proposal.state, 'candidate-review');
  assert.equal(p.proposal.candidates[0].recordId, 'bell-1992-ritual');
  assert.notEqual(p.selection.record.id, 'bell-1992-ritual', 'a new id would not take the site\'s');
  const [okafor] = await searchZotero(c, 'okafor', { fetch });
  const q = prepare(okafor, manager, { siteCache, taken: [], bound: {} });
  assert.equal(q.selection.record.id, 'okafor-2019-masks');
  assert.equal(q.proposal.state, 'new');
  assert.ok(!JSON.stringify(q.selection.record).includes('OKAF2019'), 'Zotero\'s own key stays out of the record');
});

test('an item cite.inator flags (an http address) carries its review notes', async () => {
  const c = await connect(SAMPLE_KEY, { fetch });
  const [guest] = await searchZotero(c, 'guest', { fetch });
  const p = prepare(guest, manager, { siteCache, taken: [], bound: {} });
  assert.equal(p.selection.requiresReview, true);
  assert.ok(p.selection.diagnostics.length > 0);
});

test('a browser binding is a hint: reused only when cite.inator finds that work among the item\'s candidates (#53)', async () => {
  const c = await connect(SAMPLE_KEY, { fetch });
  const [okafor] = await searchZotero(c, 'okafor', { fetch });
  // Stale: Okafor's binding points at Bell. Ignored, named, and never used as the id.
  const stale = prepare(okafor, manager, { siteCache, taken: siteCache.records.map(r => r.id), bound: { [bindingKey(okafor)]: 'bell-1992-ritual' } });
  assert.equal(stale.bound, null);
  assert.equal(stale.staleBinding, 'bell-1992-ritual');
  assert.equal(stale.selection.record.id, 'okafor-2019-masks');
  assert.notEqual(stale.proposal.state, 'id-collision');
  // Confirmed: Okafor was added earlier (its record is now among the site's works); the binding finds it.
  const added = prepare(okafor, manager, { siteCache, bound: {} }).selection.record;
  const withOkafor = { ...siteCache, records: [...siteCache.records, added] };
  const again = prepare(okafor, manager, { siteCache: withOkafor, taken: withOkafor.records.map(r => r.id), bound: { [bindingKey(okafor)]: added.id } });
  assert.equal(again.bound, added.id);
  assert.equal(again.staleBinding, null);
  // Bindings are kept per site, so two sites on one origin don't share them.
  assert.notEqual(bindingKey(okafor, 'a.example/admin/'), bindingKey(okafor, 'b.example/admin/'));
});
