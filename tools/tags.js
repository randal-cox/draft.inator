// Tag totals: what writers tagged each work with while citing it (citation.inator's collectMarkerTags), plus a
// curator's own additions and blocks per work. The result is each work's record `tags` for citation.inator.
import fs from 'node:fs';
import { collectMarkerTags, citationOptions, contentFiles, formatOf, readJSON } from './site.js';

/**
 * @param {object} settings  { content, cache, curation: path or { "<work id>": { add: [], block: [] } },
 *                             topics: path or [{ id, label }], minimum: 1, style, keyword }
 * @returns {{ works: { [id]: { tags, counts, added, blocked } }, notes: string[] }}
 *   `notes` lists everything a person should look at: tags that aren't known topics, and curation for works
 *   nobody has cited or that aren't in the cache. Nothing is dropped without a note.
 */
export function totalTags(settings) {
  const load = v => (typeof v === 'string' ? readJSON(v) : v);
  const cache = load(settings.cache);
  const curation = load(settings.curation) || {};
  const topics = load(settings.topics);
  const minimum = settings.minimum ?? 1;
  const sources = contentFiles(settings.content).map(file => ({ name: file, source: fs.readFileSync(file, 'utf8'), format: formatOf(file) }));
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
