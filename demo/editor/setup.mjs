// Shared by the demos that mount the editor: the Markdown renderer for the preview, and the sample article and images.
import { marked } from '../vendor/marked/marked.esm.js';

const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const here = new URL('.', import.meta.url);

// Raw HTML in the Markdown is shown as text, and links may only go to the web, mail, or the page itself.
marked.use({
  gfm: true,
  renderer: {
    html({ text }) { return esc(text); },
    link({ href, title, tokens }) {
      const inner = this.parser.parseInline(tokens);
      return /^(https?:|mailto:|#|\/|\.{0,2}\/)/i.test(href || '') ? `<a href="${esc(href)}"${title ? ` title="${esc(title)}"` : ''}>${inner}</a>` : inner;
    }
  }
});
export const render = md => marked.parse(md);

export const SAMPLE_IMAGES = [
  { label: 'Red mask (sample)', path: '/uploads/red-mask.png', url: new URL('../sveltia/seed/static/uploads/red-mask.png', here).href },
  { label: 'Blue mask (sample)', path: '/uploads/blue-mask.png', url: new URL('../sveltia/seed/static/uploads/blue-mask.png', here).href }
];

export async function sample() {
  const r = await fetch(new URL('sample.md', here));
  return r.ok ? r.text() : '# Untitled\n';
}

// The same article as a whole file, front matter and all, for the editor with a Details panel.
export async function sampleArticle() {
  const r = await fetch(new URL('sample-article.md', here));
  return r.ok ? r.text() : '---\ntitle: Untitled\n---\n';
}
