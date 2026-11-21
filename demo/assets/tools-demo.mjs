// Runs the build tools' shared core on the sample site, in the browser.
import { noteEdits, tagTotals, worksFromCache, worksJs } from '../../tools/core.js';

const SITE = '../examples/sample-site/';
const FILES = { 'content/essays/ritual.md': 'markdown', 'content/essays/attachment.html': 'html' };
const $ = id => document.getElementById(id);
const get = async (path, json = true) => { const r = await fetch(SITE + path); if (!r.ok) throw new Error(path + ': ' + r.status); return json ? r.json() : r.text(); };
const el = (tag, text, cls) => { const n = document.createElement(tag); if (text != null) n.textContent = text; if (cls) n.className = cls; return n; };

const [cache, topics, curation] = await Promise.all([get('citations.json'), get('topics.json'), get('curation.json')]);
const texts = {};
for (const f of Object.keys(FILES)) texts[f] = await get(f, false);

for (const f of Object.keys(FILES)) $('file').append(new Option(f, f));
$('article').value = texts[$('file').value];
$('curation').value = JSON.stringify(curation, null, 2);
const settings = () => ({ style: $('style').value || undefined });

function notes() {
  const file = $('file').value, source = $('article').value;
  const result = noteEdits(source, cache, settings(), FILES[file]);
  const report = $('notes-report');
  report.textContent = '';
  const list = el('ul');
  for (const s of result.stale) list.append(el('li', `${file}:${s.at}  ${s.was ? `${s.was} → ${s.now}` : 'add ' + s.now.replace(/^ \| /, '')}`));
  for (const d of result.diagnostics) list.append(el('li', `${file}${d.at ? ':' + d.at : ''}  (${d.code || d.state}${d.identifier ? ' ' + d.identifier : ''}): reported, not changed`, 'warn'));
  if (list.childNodes.length) report.append(list);
  report.append(el('p', result.stale.length ? `${result.stale.length} stale or missing note(s): the check fails.` : 'All notes are current: the check passes.', result.stale.length ? 'warn' : 'ok'));
  // The refreshed text, with each edit marked. Edits are in source order and don't overlap.
  const after = $('notes-after');
  after.textContent = '';
  let cursor = 0;
  for (const s of result.stale) {
    after.append(source.slice(cursor, s.start), el('mark', s.now));
    cursor = s.end;
  }
  after.append(source.slice(cursor));
}

function tags() {
  let cure;
  try { cure = JSON.parse($('curation').value || '{}'); $('curation-error').textContent = ''; }
  catch (error) { $('curation-error').textContent = 'Not valid JSON yet: ' + error.message; return; }
  const sources = Object.keys(FILES).map(f => ({ name: f, source: f === $('file').value ? $('article').value : texts[f], format: FILES[f] }));
  const { works, notes } = tagTotals(sources, cache, { ...settings(), curation: cure, topics });
  const body = $('tags-table').tBodies[0];
  body.textContent = '';
  const fmt = o => Object.entries(o).map(([t, n]) => `${t} ×${n}`).join(', ') || '–';
  for (const [id, w] of Object.entries(works)) {
    const row = el('tr');
    row.append(el('th', id), el('td', fmt(w.counts)), el('td', w.added.join(', ') || '–'), el('td', w.blocked.join(', ') || '–'), el('td', w.tags.join(', ') || '–'));
    row.firstChild.scope = 'row';
    body.append(row);
  }
  const list = $('tags-notes');
  list.textContent = '';
  for (const n of notes) list.append(el('li', n));
  if (!notes.length) list.append(el('li', 'Nothing to look at.'));
}

function works() {
  const { works, unresolved } = worksFromCache(cache, settings());
  $('works-js').textContent = worksJs({ works, topics });
  const list = $('works-notes');
  list.textContent = '';
  for (const u of unresolved) list.append(el('li', `${u.id} is not resolved yet; its note "${u.note}" comes from its ${u.from}.`));
}

const all = () => { notes(); tags(); works(); };
$('file').addEventListener('change', () => { $('article').value = texts[$('file').value]; all(); });
$('article').addEventListener('input', () => { texts[$('file').value] = $('article').value; notes(); tags(); });
$('curation').addEventListener('input', tags);
$('style').addEventListener('change', all);
all();
