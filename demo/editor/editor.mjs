// The demo's whole-window editor: draft.inator's editor (src/editor/editor.js) with the sample article and images,
// marked (vendored) as the preview's Markdown renderer, and citation.inator's importer and compiler (0.4.0, vendored).
// ?sample=import opens an essay with citations written out by hand, to try Import citations.
import { mountEditor } from '../../src/editor/editor.js';
import { render, SAMPLE_IMAGES, sample } from './setup.mjs';
import { processImportRequest } from '../../vendor/citation-inator/citation-import.mjs';
import { describeCitation } from '../../vendor/citation-inator/citation-tools.mjs';
import { compileHTML } from '../../vendor/citation-inator/citation-compiler.mjs';

// The sample site's own citation records: for the formatted preview, and so the importer can offer works it has.
const siteCache = await (await fetch(new URL('../../examples/sample-site/citations.json', import.meta.url))).json();

const importSample = new URLSearchParams(location.search).get('sample') === 'import';
const load = importSample ? async () => (await fetch(new URL('sample-import.md', import.meta.url))).text() : sample;

mountEditor(document.getElementById('editor'), {
  fullWindow: true,
  label: 'draft.inator',
  text: load,
  reset: load,
  render,
  images: SAMPLE_IMAGES,
  storageKey: importSample ? 'draft-inator-editor-import' : 'draft-inator-editor',
  citations: { compileHTML, cache: structuredClone(siteCache), citationStyle: 'chicago-author-date' },   // formatted, with endnotes
  importer: {
    process: processImportRequest,
    siteCache,   // a reference the site already has is offered as that work, not a new one
    describe: (id, cache) => describeCitation(id, cache, { citationStyle: 'chicago-author-date' }).text,
    onRecords: records => console.info(`New works: ${records.map(r => r.id).join(', ') || 'none'}. A site would keep them with the page.`)
  }
});
