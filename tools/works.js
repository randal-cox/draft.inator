// Produce the data contract's works.js (window.DRAFT_WORKS and window.DRAFT_TOPICS) from a citation.inator cache,
// so any site can generate it. Each note is citation.inator's own description of the work, in the site's style.
import { describeCitation, citationOptions, readJSON } from './site.js';

// citation.inator dates are [year, month?, day?].
const year = record => (Array.isArray(record.issued) && Number.isInteger(record.issued[0]) ? record.issued[0] : undefined);

/**
 * @param {object} settings  { cache: path or object, style, keyword }
 * @returns {{ works: Array<{id, note, title, year?}>, unresolved: Array<{id, note, from}> }}
 *   Works citation.inator can't describe yet get their in-text wording as their note (the record's citationText,
 *   then its original text, then its id). `unresolved` lists each one and where its note came from, so a person
 *   can see it rather than finding a guess in the picker.
 */
export function buildWorks(settings) {
  const cache = typeof settings.cache === 'string' ? readJSON(settings.cache) : settings.cache;
  if (!cache) throw new Error('No citation cache given (settings.cache).');
  const options = citationOptions(settings);
  const works = [], unresolved = [];
  for (const record of cache.records) {
    const description = describeCitation(record.id, cache, options);
    let note = description.text, from = 'citation.inator';
    if (description.state === 'unresolved' || description.state === 'malformed' || !note) {
      from = record.citationText ? 'citationText' : record.original ? 'original' : 'id';
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

export function topicsFrom(settings) {
  return typeof settings.topics === 'string' ? readJSON(settings.topics) : settings.topics;
}
