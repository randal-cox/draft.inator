// The draft.inator live editor: Markdown on one side, the article on the other, with the real Cite and Figure blocks
// (src/blocks/) opening their forms in a dialog. Everything stays in this browser.
import { marked } from '../vendor/marked/marked.esm.js';

const S = window.DraftStandIn;
const cite = S.components.citation, figure = S.components.figure;
const WORKS = Object.fromEntries((window.DRAFT_WORKS || []).map(w => [w.id, w]));
const $ = id => document.getElementById(id);
const source = $('source'), preview = $('preview'), body = document.body;

// Sample images, written with the site's public path, as an upload would be.
S.imageSources = [
  { label: 'Red mask (sample)', path: '/uploads/red-mask.png' },
  { label: 'Blue mask (sample)', path: '/uploads/blue-mask.png' }
];
S.assets['/uploads/red-mask.png'] = '../sveltia/seed/static/uploads/red-mask.png';
S.assets['/uploads/blue-mask.png'] = '../sveltia/seed/static/uploads/blue-mask.png';
const assetURL = p => S.assets[p] || p;
const SAMPLES = new Set(S.imageSources.map(s => s.path));

// Browser storage is a convenience: the editor works the same without it.
const store = {
  get(k) { try { return localStorage.getItem('draft-inator-editor:' + k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem('draft-inator-editor:' + k, v); return true; } catch { return false; } }
};
const announce = msg => { $('announce').textContent = ''; setTimeout(() => { $('announce').textContent = msg; }, 30); };
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

// ---------- Finding blocks in the text ----------
const CODE = /```[\s\S]*?```|`[^`\n]*`/g;
const citeAll = () => new RegExp(cite.pattern.source, 'g');
const figureAll = () => new RegExp(figure.pattern.source, 'gm');
function codeRanges(text) { return [...text.matchAll(CODE)].map(m => [m.index, m.index + m[0].length]); }
const inCode = (ranges, at) => ranges.some(([a, b]) => at >= a && at < b);

function blocks(text) {
  const code = codeRanges(text), found = [];
  for (const m of text.matchAll(figureAll())) if (!inCode(code, m.index)) found.push({ kind: 'figure', start: m.index, end: m.index + m[0].length, match: m });
  for (const m of text.matchAll(citeAll())) if (!inCode(code, m.index)) found.push({ kind: 'citation', start: m.index, end: m.index + m[0].length, match: m });
  return found.sort((a, b) => a.start - b.start);
}
const blockAt = (text, at) => blocks(text).find(b => at >= b.start && at <= b.end);

// ---------- The preview ----------
// Raw HTML in the Markdown is shown as text, and links may only go to the web, mail, or the page itself.
marked.use({
  gfm: true,
  renderer: {
    html({ text }) { return esc(text); },
    link({ href, title, tokens }) {
      const ok = /^(https?:|mailto:|#|\/|\.{0,2}\/)/i.test(href || '');
      const inner = this.parser.parseInline(tokens);
      return ok ? `<a href="${esc(href)}"${title ? ` title="${esc(title)}"` : ''}>${inner}</a>` : inner;
    }
  }
});

function renderFigure(d) {
  const cls = ['fig', d.align && 'align-' + d.align, d.width && 'width-' + d.width, d.wrap && 'wrap'].filter(Boolean).join(' ');
  const credit = [d.credit, d.licence].filter(Boolean).join(', ');
  const cap = d.caption || credit ? `<figcaption>${esc(d.caption)}${credit ? ` <small>${esc(credit)}</small>` : ''}</figcaption>` : '';
  // An upload lives only in the browser it was made in; elsewhere, say so instead of showing a broken image.
  const img = !d.src ? '' : S.assets[d.src] || SAMPLES.has(d.src) || !d.src.startsWith(S.publicFolder + '/')
    ? `<img src="${esc(assetURL(d.src))}" alt="${esc(d.alt)}">`
    : `<div class="missing-image" role="img" aria-label="${esc(d.alt)}">${esc(d.src)} isn't in this browser. Uploads stay in the browser they were made in.</div>`;
  return `<figure class="${cls}">${img}${cap}</figure>`;
}

function render() {
  const text = source.value, code = codeRanges(text), cited = [], parts = [];
  const hold = html => `DRAFTPH${parts.push(html) - 1}X`;
  let out = '', last = 0;
  for (const b of blocks(text)) {
    out += text.slice(last, b.start);
    if (b.kind === 'figure') out += hold(renderFigure(figure.fromBlock(b.match)));
    else {
      const data = cite.fromBlock(b.match);
      data.items.forEach(it => { if (it.work && !cited.includes(it.work)) cited.push(it.work); });
      const first = data.items[0]?.work;
      out += hold(`<a class="cite" href="#ref-${esc(first)}">${esc(cite.toPreview(data))}</a>`);
    }
    last = b.end;
  }
  out += text.slice(last);
  // {citation endnote} places the list of works; without it, the list goes at the end.
  let placed = false;
  out = out.replace(/\{citation endnote(?:\s*\|[^}\n]*)?\}/g, (m, at) => (inCode(code, at) ? m : (placed = true, 'DRAFTENDNOTES')));
  const endnotes = cited.length ? `<section class="endnotes" aria-labelledby="endnotes-h"><h2 id="endnotes-h">Works cited</h2><ol>${
    cited.map(id => { const w = WORKS[id]; return `<li id="ref-${esc(id)}">${esc(w?.note || id)}${w?.title ? `. <cite>${esc(w.title)}</cite>.` : ' <span class="unresolved">(not yet found)</span>'}</li>`; }).join('')}</ol></section>` : '';
  let html = marked.parse(out + (placed || !cited.length ? '' : '\n\nDRAFTENDNOTES'));
  html = html.replace(/<p>DRAFTENDNOTES<\/p>|DRAFTENDNOTES/g, endnotes)
    .replace(/<p>DRAFTPH(\d+)X<\/p>/g, (m, n) => parts[n])
    .replace(/DRAFTPH(\d+)X/g, (m, n) => parts[n]);
  preview.innerHTML = html;
  const h1 = text.match(/^#\s+(.+)$/m);
  $('doc-title').textContent = h1 ? h1[1] : 'Untitled';
  document.title = (h1 ? h1[1] + ' · ' : '') + 'draft.inator editor';
  const prose = text.replace(citeAll(), '').replace(figureAll(), '').replace(/[#>*_`\[\]()-]/g, ' ');
  const words = (prose.match(/\S+/g) || []).length, all = blocks(text);
  $('counts').textContent = `${words} words · ${all.filter(b => b.kind === 'citation').length} citations · ${all.filter(b => b.kind === 'figure').length} figures`;
}

// ---------- Editing text ----------
// execCommand keeps the browser's undo history; setRangeText is the fallback.
function replace(start, end, text, select) {
  source.focus();
  source.setSelectionRange(start, end);
  if (!document.execCommand || !document.execCommand('insertText', false, text)) {
    source.setRangeText(text, start, end, 'end');
    source.dispatchEvent(new Event('input'));
  }
  if (select) source.setSelectionRange(start + select[0], start + select[1]);
}
function wrap(before, after, placeholder) {
  const { selectionStart: a, selectionEnd: b, value } = source;
  const inner = value.slice(a, b) || placeholder;
  replace(a, b, before + inner + after, [before.length, before.length + inner.length]);
}
function prefixLines(prefix) {
  const v = source.value, a = v.lastIndexOf('\n', source.selectionStart - 1) + 1;
  let b = v.indexOf('\n', source.selectionEnd); if (b < 0) b = v.length;
  const lines = v.slice(a, b).split('\n');
  const all = lines.every((l, i) => l.startsWith(typeof prefix === 'function' ? prefix(i) : prefix));
  const next = lines.map((l, i) => { const p = typeof prefix === 'function' ? prefix(i) : prefix; return all ? l.slice(p.length) : p + l; }).join('\n');
  replace(a, b, next, [0, next.length]);
}
const COMMANDS = {
  bold: () => wrap('**', '**', 'bold text'),
  italic: () => wrap('*', '*', 'italic text'),
  code: () => wrap('`', '`', 'code'),
  link: () => { const { selectionStart: a, selectionEnd: b, value } = source; const t = value.slice(a, b) || 'link text';
    replace(a, b, `[${t}](https://)`, [t.length + 3, t.length + 11]); },
  heading: () => prefixLines('## '),
  ul: () => prefixLines('- '),
  ol: () => prefixLines(i => `${i + 1}. `),
  quote: () => prefixLines('> '),
  citation: () => openBlock('citation'),
  figure: () => openBlock('figure'),
  edit: () => { const b = blockAt(source.value, source.selectionStart); if (b) openBlock(b.kind, b); }
};
$('toolbar').addEventListener('click', e => { const btn = e.target.closest('button[data-cmd]'); if (btn && !btn.disabled) COMMANDS[btn.dataset.cmd](); });

function updateEditButton() {
  const b = blockAt(source.value, source.selectionStart), btn = $('edit-block');
  btn.disabled = !b;
  btn.textContent = b ? `Edit ${b.kind}` : 'Edit';
}

// ---------- The block dialog ----------
const dialog = $('block-dialog');
let editing = null;   // { kind, range: {start, end} | null, data }
function openBlock(kind, range = null) {
  const component = kind === 'citation' ? cite : figure;
  const data = range ? component.fromBlock(range.match) : kind === 'citation' ? { items: [{}] } : {};
  editing = { kind, range: range && { start: range.start, end: range.end, raw: range.match[0] }, data };
  $('dialog-title').textContent = (range ? 'Edit ' : 'Insert a ') + kind;
  $('dialog-save').textContent = range ? 'Save' : 'Insert';
  $('dialog-error').textContent = '';
  const show = () => { $('dialog-out').textContent = component.toBlock(editing.data); };
  S.drawForm(component, $('dialog-fields'), editing.data, show);
  show();
  dialog.showModal();
  const first = $('dialog-fields').querySelector('select, input:not([type=hidden]):not(.visually-hidden)');
  if (first) first.focus();
}
function problems(kind, d) {
  if (kind === 'citation') return d.items?.some(it => it.work) ? '' : 'Choose a work to cite.';
  if (!d.src) return 'Choose or upload an image.';
  if (!d.alt) return 'Add alt text: what the image shows, for people who can\'t see it.';
  return '';
}
$('dialog-form').addEventListener('submit', e => {
  e.preventDefault();
  const { kind, range, data } = editing, component = kind === 'citation' ? cite : figure;
  const problem = problems(kind, data);
  if (problem) { $('dialog-error').textContent = problem; return; }
  let text = component.toBlock(data);
  dialog.close();
  if (range) {
    if (source.value.slice(range.start, range.end) !== range.raw) { announce('The text changed while the form was open; nothing was saved.'); return; }
    replace(range.start, range.end, text);
  } else {
    const at = source.selectionStart, v = source.value;
    if (kind === 'figure') {   // a figure is a line of its own
      const lineStart = v.lastIndexOf('\n', at - 1) + 1;
      text = (at > lineStart ? '\n\n' : (lineStart > 0 && v[lineStart - 2] !== '\n' ? '\n' : '')) + text + '\n\n';
    }
    replace(at, source.selectionEnd, text);
  }
  announce(`${kind[0].toUpperCase() + kind.slice(1)} ${range ? 'saved' : 'inserted'}.`);
});
$('dialog-cancel').addEventListener('click', () => { dialog.close(); source.focus(); });

// ---------- Layout, toolbar, plain ----------
function setLayout(name, quiet) {
  body.dataset.layout = name;
  for (const b of $('layout').querySelectorAll('button')) b.setAttribute('aria-checked', String(b.dataset.layout === name));
  store.set('layout', name);
  if (!quiet) announce(`Layout: ${$('layout').querySelector(`[data-layout="${name}"]`).textContent}.`);
}
$('layout').addEventListener('click', e => { const b = e.target.closest('button[data-layout]'); if (b) setLayout(b.dataset.layout); });
$('layout').addEventListener('keydown', e => {   // arrow keys move between layouts, as in any radio group
  const btns = [...$('layout').querySelectorAll('button')], i = btns.indexOf(document.activeElement);
  if (i < 0 || !['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)) return;
  e.preventDefault();
  const next = btns[(i + (e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? btns.length - 1 : 1)) % btns.length];
  next.focus(); setLayout(next.dataset.layout);
});
function setToolbar(on, quiet) {
  body.classList.toggle('no-toolbar', !on);
  $('toggle-toolbar').setAttribute('aria-pressed', String(on));
  store.set('toolbar', on ? '1' : '0');
  if (!quiet) announce(on ? 'Toolbar shown.' : 'Toolbar hidden.');
}
$('toggle-toolbar').addEventListener('click', () => setToolbar(body.classList.contains('no-toolbar')));
function setPlain(on) {
  body.classList.toggle('plain', on);
  $('toggle-plain').setAttribute('aria-pressed', String(on));
  $('exit-plain').hidden = !on;
  source.focus();
  announce(on ? 'Plain: just the text. Press Escape to leave.' : 'Left plain.');
}
$('toggle-plain').addEventListener('click', () => setPlain(true));
$('exit-plain').addEventListener('click', () => setPlain(false));
document.addEventListener('keydown', e => {
  const mod = e.ctrlKey || e.metaKey;
  if (e.key === 'Escape' && body.classList.contains('plain') && !dialog.open) { e.preventDefault(); setPlain(false); return; }
  if (!mod || dialog.open || document.activeElement !== source) return;
  const k = e.key.toLowerCase(), cmd = { b: 'bold', i: 'italic', k: 'link', e: 'edit' }[k];
  if (cmd) { e.preventDefault(); COMMANDS[cmd](); }
});

$('reset').addEventListener('click', async () => {
  replace(0, source.value.length, await sample());
  source.setSelectionRange(0, 0); source.scrollTop = 0;
  announce('Back to the sample article.');
});

// ---------- Scroll the preview along with the writing ----------
source.addEventListener('scroll', () => {
  if (body.dataset.layout === 'write' || body.dataset.layout === 'preview') return;
  const pane = $('preview-pane'), max = source.scrollHeight - source.clientHeight;
  if (max > 0) pane.scrollTop = (source.scrollTop / max) * (pane.scrollHeight - pane.clientHeight);
});

// Keep small uploads in this browser, so they survive a reload; bigger ones last until the page is closed.
S.onUpload = (path, file) => {
  if (file.size > 1_500_000) { announce('Uploaded. This image is too big to keep after you reload.'); return; }
  const reader = new FileReader();
  reader.onload = () => { if (!store.set('asset:' + path, reader.result)) announce('Uploaded, but it won\'t be kept after you reload.'); };
  reader.readAsDataURL(file);
};
function restoreUploads(text) {
  for (const m of text.matchAll(/\{figure "?([^"|}\s]+)/g)) {
    const kept = store.get('asset:' + m[1]);
    if (kept && kept.startsWith('data:image/')) {
      S.assets[m[1]] = kept;
      if (!S.imageSources.some(s => s.path === m[1])) S.imageSources.push({ label: m[1].split('/').pop() + ' (uploaded)', path: m[1] });
    }
  }
}

// ---------- Start ----------
async function sample() { const r = await fetch('sample.md'); return r.ok ? r.text() : '# Untitled\n'; }
let saveTimer;
source.addEventListener('input', () => {
  render(); updateEditButton();
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { $('saved').textContent = store.set('text', source.value) ? 'Saved in this browser' : 'Not saved: browser storage is off'; }, 400);
});
for (const ev of ['click', 'keyup', 'select']) source.addEventListener(ev, updateEditButton);

source.value = store.get('text') ?? await sample();
restoreUploads(source.value);
setLayout(store.get('layout') || 'split', true);
setToolbar(store.get('toolbar') !== '0', true);
$('saved').textContent = store.get('text') ? 'Restored from this browser' : 'Sample article';
render(); updateEditButton();
