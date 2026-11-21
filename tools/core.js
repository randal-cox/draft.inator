// The browser-safe heart of the build tools: no file system, only citation.inator's tools. The Node commands
// (notes.js, tags.js, works.js) and the live demos (demo/) both run this, so the demos show the real behaviour.
import { describeCitation, annotateMarkers, collectMarkerTags } from '../vendor/citation-inator/citation-tools.mjs';
export { describeCitation, annotateMarkers, collectMarkerTags };

// The settings every tool must share. Notes written by the build and notes in works.js have to agree, so the
// citation style lives in one place.
export function citationOptions(settings = {}) {
  const options = {};
  if (settings.style) options.citationStyle = settings.style;
  if (settings.keyword) options.citationKeyword = settings.keyword;
  return options;
}

// Line and column (1-based) of an offset, for messages a person can follow.
export function lineCol(source, offset) {
  const before = source.slice(0, offset).split('\n');
  return `${before.length}:${before[before.length - 1].length + 1}`;
}

// One file's notes: what is stale or missing, what citation.inator wants a person to see, and the refreshed text.
export function noteEdits(source, cache, settings = {}, format = 'text') {
  const result = annotateMarkers(source, cache, { ...citationOptions(settings), format });
  return {
    source: result.source,
    changed: result.changed,
    stale: result.edits.map(e => ({ start: e.start, end: e.end, at: lineCol(source, e.start), was: source.slice(e.start, e.end), now: e.text })),
    diagnostics: result.diagnostics.map(d => ({ ...d, ...(Number.isInteger(d.start) && { at: lineCol(source, d.start) }) }))
  };
}

/**
 * Tag totals from marker tags, with a curator's additions and blocks.
 * @param {Array<{name, source, format}>} sources
 * @returns {{ works: { [id]: { tags, counts, added, blocked } }, notes: string[] }}
 *   `notes` lists everything a person should look at: tags that aren't known topics, and curation for works
 *   nobody has cited or that aren't in the cache. Nothing is dropped without a note.
 */
export function tagTotals(sources, cache, { curation = {}, topics, minimum = 1, ...settings } = {}) {
  const { counts, diagnostics } = collectMarkerTags(sources, cache, { ...citationOptions(settings), includeDiagnostics: true });
  const known = topics ? new Set(topics.map(t => t.id)) : null;
  const inCache = cache ? new Set(cache.records.map(r => r.id)) : null;
  const notes = diagnostics.map(d => `${d.source}: ${d.code || d.state}${d.identifier ? ' ' + d.identifier : ''}`);
  const works = {};
  for (const id of [...new Set([...Object.keys(counts), ...Object.keys(curation)])].sort()) {
    const tally = counts[id] || {}, cure = curation[id] || {};
    const add = [].concat(cure.add || []), block = new Set([].concat(cure.block || []));
    if (!counts[id]) notes.push(`curation for ${id}: no citation of it carries tags`);
    if (inCache && !inCache.has(id)) notes.push(`${id}: not in the citation cache`);
    const fromMarkers = Object.keys(tally).filter(t => tally[t] >= minimum);
    const tags = [...new Set([...fromMarkers, ...add])].filter(t => !block.has(t)).sort();
    for (const t of block) if (!(t in tally) && !add.includes(t)) notes.push(`curation for ${id}: blocks ${t}, which no citation gives it`);
    if (known) for (const t of tags) if (!known.has(t)) notes.push(`${id}: ${t} is not a known topic`);
    works[id] = {
      tags,
      counts: Object.fromEntries(Object.entries(tally).sort(([a], [b]) => (a < b ? -1 : 1))),
      added: add.filter(t => !block.has(t) && !fromMarkers.includes(t)).sort(),
      blocked: [...block].filter(t => t in tally || add.includes(t)).sort()
    };
  }
  return { works, notes };
}

// Just the part citation.inator takes: { "<work id>": ["tag", ...] }.
export function recordTags({ works }) {
  return Object.fromEntries(Object.entries(works).map(([id, w]) => [id, w.tags]));
}

// citation.inator dates are [year, month?, day?].
const year = record => (Array.isArray(record.issued) && Number.isInteger(record.issued[0]) ? record.issued[0] : undefined);

/**
 * The data contract's works list, from a citation.inator cache.
 * @returns {{ works: Array<{id, note, title, year?}>, unresolved: Array<{id, note, from}> }}
 *   Works citation.inator can't describe yet get their in-text wording as their note (the record's citationText,
 *   then its original text, then its id). `unresolved` lists each one and where its note came from, so a person
 *   can see it rather than finding a guess in the picker.
 */
export function worksFromCache(cache, settings = {}) {
  const options = citationOptions(settings);
  const works = [], unresolved = [];
  for (const record of cache.records) {
    const description = describeCitation(record.id, cache, options);
    let note = description.text;
    if (description.state === 'unresolved' || description.state === 'malformed' || !note) {
      const from = record.citationText ? 'citationText' : record.original ? 'original' : 'id';
      note = record.citationText || record.original || record.id;
      unresolved.push({ id: record.id, note, from });
    }
    const work = { id: record.id, note, title: record.title || '' };
    const y = year(record);
    if (y !== undefined) work.year = y;
    works.push(work);
  }
  const key = w => `${w.note}\u0000${w.title}\u0000${w.id}`.normalize('NFKC').toLowerCase();
  works.sort((a, b) => (key(a) < key(b) ? -1 : key(a) > key(b) ? 1 : 0));
  return { works, unresolved };
}

// The file a site serves before the blocks. One work per line, so a change to one work is a one-line diff.
export function worksJs({ works, topics }) {
  const list = items => (items.length ? '[\n' + items.map(i => '  ' + JSON.stringify(i)).join(',\n') + '\n]' : '[]');
  return '// Written by draft.inator (tools/works.js). Do not edit by hand; regenerate it from the citation cache.\n' +
    `window.DRAFT_WORKS = ${list(works)};\n` +
    (topics ? `window.DRAFT_TOPICS = ${list(topics)};\n` : '');
}
