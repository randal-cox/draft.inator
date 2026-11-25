// The demo's whole-window editor: draft.inator's editor (src/editor/editor.js) with the sample article, its Details
// panel (the sample site's collections), images, marked (vendored) as the preview's Markdown renderer, and
// cite.inator's importer and compiler (0.4.0, vendored). ?sample=import opens an essay with citations written out by
// hand (a body only, as if pasted from a word processor), to try Import citations.
import { mountEditor } from '../../src/editor/editor.js';
import { splitFrontMatter } from '../../src/editor/frontmatter.js';
import { render, SAMPLE_IMAGES, sampleArticle } from './setup.mjs';
import { processImportRequest } from '../../vendor/citation-inator/citation-import.mjs';
import { describeCitation } from '../../vendor/citation-inator/citation-tools.mjs';
import { compileHTML } from '../../vendor/citation-inator/citation-compiler.mjs';

// The sample site's own citation records: for the formatted preview, and so the importer can offer works it has.
const siteCache = await (await fetch(new URL('../../examples/sample-site/citations.json', import.meta.url))).json();

const importSample = new URLSearchParams(location.search).get('sample') === 'import';
const load = importSample ? async () => (await fetch(new URL('sample-import.md', import.meta.url))).text() : sampleArticle;

// Save here sends nothing: it says how much of the file a real save would change, against the sample.
const original = await load();
const changedLines = (a, b) => {   // lines added or removed, counted as a multiset
  const count = new Map();
  for (const l of a.split('\n')) count.set(l, (count.get(l) || 0) + 1);
  let n = 0;
  for (const l of b.split('\n')) { const c = count.get(l) || 0; if (c) count.set(l, c - 1); else n++; }
  return Math.max(n, [...count.values()].reduce((x, y) => x + y, 0));   // an edited line is one change, not two
};
function demoSave(text) {
  const was = splitFrontMatter(original), now = splitFrontMatter(text);
  const fm = changedLines(was.frontMatter, now.frontMatter), body = changedLines(was.body, now.body);
  if (!fm && !body) return 'Nothing changed (demo: nothing is sent)';
  const lines = n => `${n} line${n === 1 ? '' : 's'}`;
  return `Ready: ${lines(fm)} of front matter and ${lines(body)} of body changed (demo: nothing is sent)`;
}

mountEditor(document.getElementById('editor'), {
  fullWindow: true,
  label: 'draft.inator',
  ...(importSample ? {} : { collection: 'essays', slug: 'masks-in-ritual' }),   // the Details panel (collections.js)
  text: load,
  reset: load,
  save: async text => demoSave(text),
  render,
  images: SAMPLE_IMAGES,
  storageKey: importSample ? 'draft-inator-editor-import' : 'draft-inator-editor-file',   // whole files: a body-only draft from 0.4 isn't offered
  citations: { compileHTML, cache: structuredClone(siteCache), citationStyle: 'chicago-author-date' },   // formatted, with endnotes
  importer: {
    process: processImportRequest,
    siteCache,   // a reference the site already has is offered as that work, not a new one
    siteWorks: 'prefer',   // the site's own works are selected even when written a little differently
    // handTyped: 'block' is the default: Save waits while citations are typed by hand
    describe: (id, cache) => describeCitation(id, cache, { citationStyle: 'chicago-author-date' }).text,
    onRecords: records => console.info(`New works: ${records.map(r => r.id).join(', ') || 'none'}. A site would keep them with the page.`)
  }
});
