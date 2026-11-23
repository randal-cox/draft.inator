// The demo's whole-window editor: draft.inator's editor (src/editor/editor.js) with the sample article and images,
// marked (vendored) as the preview's Markdown renderer, and citation.inator's importer (a 0.4.0 preview, vendored).
// ?sample=import opens an essay with citations written out by hand, to try Import citations.
import { mountEditor } from '../../src/editor/editor.js';
import { render, SAMPLE_IMAGES, sample } from './setup.mjs';
import { processImportRequest } from '../../vendor/citation-inator/preview/citation-import.mjs';
import { describeCitation } from '../../vendor/citation-inator/citation-tools.mjs';

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
  importer: {
    process: processImportRequest,
    // The sample site's own citation records: a reference it already has is offered as that work, not a new one.
    siteCache: await (await fetch(new URL('../../examples/sample-site/citations.json', import.meta.url))).json(),
    describe: (id, cache) => describeCitation(id, cache, { citationStyle: 'chicago-author-date' }).text,
    onRecords: records => console.info(`New works: ${records.map(r => r.id).join(', ') || 'none'}. A site would keep them with the page.`)
  }
});
