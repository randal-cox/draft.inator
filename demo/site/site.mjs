// The made-up site's page: the article as readers see it, and "Edit this page", which puts draft.inator's editor in
// its place, inside the site's own header and footer. Save keeps the text in this browser; on a real site it would
// open a pull request.
import { mountEditor, renderArticle } from '../../src/editor/editor.js';
import { render, SAMPLE_IMAGES, sample } from '../editor/setup.mjs';

const KEY = 'draft-inator-site-demo';
const essay = document.getElementById('essay'), slot = document.getElementById('editor-slot'), editButton = document.getElementById('edit-page');
const images = Object.fromEntries(SAMPLE_IMAGES.map(i => [i.path, i.url]));
const kept = { get() { try { return localStorage.getItem(KEY + ':published'); } catch { return null; } },
               set(v) { try { localStorage.setItem(KEY + ':published', v); return true; } catch { return false; } } };
let text = kept.get() ?? await sample(), editor = null;

function show() {
  const r = renderArticle(text, { render, imageURL: p => images[p] || window.DraftForms.assets[p] || null });
  essay.innerHTML = r.html;
  document.title = (r.title ? r.title + ' · ' : '') + 'Hollowmere Archive';
}

function edit() {
  essay.hidden = true; editButton.hidden = true; slot.hidden = false;
  if (!editor) {
    editor = mountEditor(slot, {
      text, render, images: SAMPLE_IMAGES, previewClass: 'essay', label: 'Editing this page',
      save: async value => { text = value; kept.set(value); show(); return 'Saved in this browser. On a real site, Save opens a pull request.'; },
      done: value => { text = value; kept.set(value); leave(); }
    });
  } else editor.text = text;
  editor.ready.then(() => editor.focus());
}
function leave() {
  slot.hidden = true; essay.hidden = false; editButton.hidden = false;
  show();
  editButton.focus();
}
editButton.addEventListener('click', edit);
show();
