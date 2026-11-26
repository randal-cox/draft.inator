import { mountEditor } from '../../src/editor/editor.js';
import { render } from '../../demo/editor/setup.mjs';
import { compileHTML } from '../../vendor/citation-inator/citation-compiler.mjs';
import * as manager from '../../vendor/citation-inator/citation-manager.mjs';
import { sampleFetch } from '../../demo/editor/zotero-sample.mjs';

const siteCache = await (await fetch(new URL('../../examples/sample-site/citations.json', import.meta.url))).json();
const stage = new URLSearchParams(location.search).get('stage');
window.staged = [];
let failures = stage === 'fail-once' ? 1 : stage === 'fail-async' ? 1 : 0;
mountEditor(document.querySelector('#editor'), {
  text: 'A claim.\n\n{cite endnote}\n', render,
  citations: { compileHTML, cache: structuredClone(siteCache), citationStyle: 'chicago-author-date' },
  zotero: { manager, fetch: sampleFetch, bindingsScope: 'test-host' },
  importer: { siteCache, handTyped: 'off',
    onRecords(records) {
      if (failures > 0) { failures--; if (stage === 'fail-async') return Promise.reject(new Error('STAGING_FAILURE_CANARY')); throw new Error('STAGING_FAILURE_CANARY'); }
      window.staged.push(...records.map(r => r.id));
    } }
});
window.hostReady = true;
