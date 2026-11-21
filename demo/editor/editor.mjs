// The demo's whole-window editor: draft.inator's editor (src/editor/editor.js) with the sample article and images,
// and marked (vendored) as the preview's Markdown renderer.
import { mountEditor } from '../../src/editor/editor.js';
import { render, SAMPLE_IMAGES, sample } from './setup.mjs';

mountEditor(document.getElementById('editor'), {
  fullWindow: true,
  label: 'draft.inator',
  text: sample,
  reset: sample,
  render,
  images: SAMPLE_IMAGES,
  storageKey: 'draft-inator-editor'
});
