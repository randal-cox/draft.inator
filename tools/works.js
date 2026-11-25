// Produce the data contract's works.js (window.DRAFT_WORKS and window.DRAFT_TOPICS) from a cite.inator cache,
// so any site can generate it. Each note is cite.inator's own description of the work, in the site's style.
import { worksFromCache, worksJs } from './core.js';
import { readJSON } from './site.js';
export { worksJs };

/** @param {object} settings  { cache: path or object, style, keyword } */
export function buildWorks(settings) {
  const cache = typeof settings.cache === 'string' ? readJSON(settings.cache) : settings.cache;
  if (!cache) throw new Error('No citation cache given (settings.cache).');
  return worksFromCache(cache, settings);
}

export function topicsFrom(settings) {
  return typeof settings.topics === 'string' ? readJSON(settings.topics) : settings.topics;
}
