// The demo's whole-window editor: draft.inator's editor (src/editor/editor.js) with the sample article, its Details
// panel (the sample site's collections), and images,
// and marked (vendored) as the preview's Markdown renderer.
import { mountEditor } from '../../src/editor/editor.js';
import { splitFrontMatter } from '../../src/editor/frontmatter.js';
import { render, SAMPLE_IMAGES, sampleArticle } from './setup.mjs';

// Save here sends nothing: it says how much of the file a real save would change, against the sample.
const original = await sampleArticle();
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
  collection: 'essays',
  slug: 'masks-in-ritual',      // the Details panel, from examples/sample-site/collections.js
  text: sampleArticle,
  reset: sampleArticle,
  save: async text => demoSave(text),
  render,
  images: SAMPLE_IMAGES,
  storageKey: 'draft-inator-editor-file',   // whole files now: a body-only draft from 0.4 isn't offered
  showImport: true
});
