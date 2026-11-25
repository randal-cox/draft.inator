// Tag totals: what writers tagged each work with while citing it (cite.inator's collectMarkerTags), plus a
// curator's own additions and blocks per work. The result is each work's record `tags` for cite.inator.
import fs from 'node:fs';
import { tagTotals, recordTags } from './core.js';
import { contentFiles, formatOf, readJSON } from './site.js';
export { recordTags };

/**
 * @param {object} settings  { content, cache, curation: path or { "<work id>": { add: [], block: [] } },
 *                             topics: path or [{ id, label }], minimum: 1, style, keyword }
 * @returns {{ works: { [id]: { tags, counts, added, blocked } }, notes: string[] }}
 */
export function totalTags(settings) {
  const load = v => (typeof v === 'string' ? readJSON(v) : v);
  const sources = contentFiles(settings.content).map(file => ({ name: file, source: fs.readFileSync(file, 'utf8'), format: formatOf(file) }));
  return tagTotals(sources, load(settings.cache), { ...settings, curation: load(settings.curation) || {}, topics: load(settings.topics) });
}
