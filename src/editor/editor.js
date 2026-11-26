/* draft.inator: the article editor. Markdown with draft.inator's blocks (Cite, Figure) and a live preview, mounted
   into any element: a whole window, or a box inside the site's own page so its menus stay in view.

     import { mountEditor } from '/admin/draft-inator/editor/editor.js';
     mountEditor(document.querySelector('#edit-here'), {
       text: markdown,                       // the page's Markdown
       render: md => html,                   // the site's Markdown renderer (escape raw HTML in it)
       save: async text => 'Pull request opened',   // optional: where Save sends the text
     });

   With `fields` (or `collection`), the editor takes the whole file: front matter in a Details panel drawn from the
   collection's fields, the body in the text box; `save` and `text` then carry the whole file.

   Load src/editor/forms.js, the works list, and the blocks (src/blocks/*.js) first, as classic scripts. Plain
   browser JavaScript, no dependencies, no inline handlers, so it runs under a strict Content Security Policy. */
import { findMath, numberLabels, refText, mathHTML, REF_NAMES } from './crossref.js';
import { splitFrontMatter } from './frontmatter.js';
import { drawDetails, checkDetails } from './details.js';

const LAYOUTS = [
  { id: 'split', label: 'Side by side' },
  { id: 'stacked', label: 'Stacked' },
  { id: 'write', label: 'Write only' },
  { id: 'preview', label: 'Preview only' }
];
const CODE = /```[\s\S]*?```|`[^`\n]*`/g;
const esc = v => String(v ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function el(tag, attrs = {}, kids = []) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'text') n.textContent = v;
    else if (k === 'class') n.className = v;
    else if (v === true) n.setAttribute(k, '');
    else if (v !== false && v != null) n.setAttribute(k, v);
  }
  for (const kid of [].concat(kids)) if (kid) n.append(kid);
  return n;
}

// Blocks found in Markdown: figures (lines of their own) and citations, outside code. A block that isn't loaded (or
// isn't enabled) is skipped, and its tags stay as text.
function findBlocks(text, cite, figure) {
  const code = [...text.matchAll(CODE)].map(m => [m.index, m.index + m[0].length]);
  const inCode = at => code.some(([x, y]) => at >= x && at < y);
  const found = [];
  if (figure) for (const m of text.matchAll(new RegExp(figure.pattern.source, 'gm'))) if (!inCode(m.index)) found.push({ kind: 'figure', start: m.index, end: m.index + m[0].length, match: m });
  if (cite) for (const m of text.matchAll(new RegExp(cite.pattern.source, 'g'))) if (!inCode(m.index)) found.push({ kind: 'citation', start: m.index, end: m.index + m[0].length, match: m });
  found.inCode = inCode;
  return found.sort((x, y) => x.start - y.start);
}

// The blocks the page loaded, limited to `allowed` (ids such as ['citation']) when given.
function enabledBlocks(allowed) {
  const all = (window.DraftForms && window.DraftForms.components) || {};
  const on = id => all[id] && (!allowed || allowed.includes(id)) ? all[id] : null;
  return { cite: on('citation'), figure: on('figure') };
}

/**
 * Whether a page body is written in HTML rather than Markdown (most of its text is inside HTML elements). The editor
 * edits Markdown; an HTML body would show its tags as text in the preview, so a site may prefer not to offer it.
 * @param {string} body
 * @returns {'markdown' | 'html'}
 */
export function bodyKind(body) {
  const text = body.replace(CODE, '').trim();
  if (!text) return 'markdown';
  const inTags = (text.match(/<(p|div|ul|ol|li|section|table|h[1-6]|blockquote|figure)\b[^>]*>[\s\S]*?<\/\1>/gi) || []).join('').length;
  return inTags / text.length > 0.5 ? 'html' : 'markdown';
}

/**
 * The article as readers see it: Markdown through the site's renderer, with figures laid out as their tags say and
 * citations shown by their notes, plus a list of the works cited (at {cite endnote}, or at the end).
 * @param {string} text  Markdown with draft.inator blocks.
 * @param {object} [options]
 * @param {(markdown: string) => string} [options.render]  The site's Markdown renderer (it must escape raw HTML).
 * @param {string[]} [options.blocks]  Only these blocks (ids, such as ['citation']); default: every block loaded.
 * @param {(path: string) => string | null} [options.imageURL]  Where to load an image from; null if it isn't
 *   available (shown as a note, not a broken image). Default: the path itself.
 * @returns {{ html: string, title: string, words: number, citations: number, figures: number }}
 */
export function renderArticle(text, options = {}) {
  const { cite, figure } = enabledBlocks(options.blocks);
  const WORKS = Object.fromEntries((window.DRAFT_WORKS || []).map(w => [w.id, w]));
  const imageURL = options.imageURL || (p => p);
  const compiler = options.citations?.compileHTML && options.citations.cache ? options.citations : null;
  const blocks = findBlocks(text, cite, figure), cited = [], parts = [];
  // Maths and cross-references ({ref eq:n}), outside code and outside other blocks; then numbers for every label.
  const inBlock = (a, z) => blocks.some(b => a < b.end && z > b.start);
  const maths = findMath(text, blocks.inCode).filter(m => !inBlock(m.start, m.end));
  const found = [...blocks, ...maths].sort((x, y) => x.start - y.start);
  found.inCode = blocks.inCode;
  for (const b of blocks) if (b.kind === 'figure') b.data = figure.fromBlock(b.match);
  const { numbers, diagnostics: refProblems } = numberLabels([
    ...maths.filter(m => m.kind === 'math' && m.label),
    ...blocks.filter(b => b.kind === 'figure' && b.data.label).map(b => ({ start: b.start, label: b.data.label }))]);
  const crossref = [...refProblems];
  const hold = html => `DRAFTPH${parts.push(html) - 1}X`;
  let out = '', last = 0;
  for (const b of found) {
    out += text.slice(last, b.start);
    if (b.kind === 'math') {
      const r = mathHTML(b, options.math || null, { number: b.label ? numbers.get(b.label) : undefined, macros: options.mathMacros });
      if (r.error) crossref.push({ code: 'math-error', at: b.start, message: `Maths that doesn't parse: ${r.error}` });
      out += hold(r.html);
    } else if (b.kind === 'ref') {
      const said = refText(b.label, numbers, { ...REF_NAMES, ...(options.refNames || {}) });
      if (!said) crossref.push({ code: 'ref-missing', label: b.label, at: b.start, message: `{ref ${b.label}} points to a label that doesn't exist.` });
      out += hold(said ? `<a class="di-ref" href="#${esc(b.label)}">${esc(said)}</a>`
        : `<span class="di-ref-missing" title="No ${esc(b.label)} in this article">${esc(`{ref ${b.label}}`)}</span>`);
    } else if (b.kind === 'figure') {
      const d = b.data, n = d.label && numbers.get(d.label);
      const cls = ['fig', d.align && 'align-' + d.align, d.width && 'width-' + d.width, d.wrap && 'wrap'].filter(Boolean).join(' ');
      const credit = [d.credit, d.licence].filter(Boolean).join(', ');
      const name = n ? `<span class="di-fig-number">${esc(refText(d.label, numbers, { ...REF_NAMES, ...(options.refNames || {}) }))}.</span> ` : '';
      const cap = d.caption || credit || name ? `<figcaption>${name}${esc(d.caption)}${credit ? ` <small>${esc(credit)}</small>` : ''}</figcaption>` : '';
      const url = d.src ? imageURL(d.src) : null;
      const img = !d.src ? '' : url ? `<img src="${esc(url)}" alt="${esc(d.alt)}">`
        : `<div class="di-missing" role="img" aria-label="${esc(d.alt)}">${esc(d.src)} isn't in this browser. Uploads stay in the browser they were made in.</div>`;
      out += hold(`<figure class="${cls}"${n ? ` id="${esc(d.label)}"` : ''}>${img}${cap}</figure>`);
    } else {
      const data = cite.fromBlock(b.match);
      data.items.forEach(it => { if (it.work && !cited.includes(it.work)) cited.push(it.work); });
      // With citation.inator's compiler, the marker itself is kept (safe from Markdown) for the compiler to format.
      out += hold(compiler ? esc(b.match[0]) : `<a class="cite" href="#di-ref-${esc(data.items[0]?.work)}">${esc(cite.toPreview(data))}</a>`);
    }
    last = b.end;
  }
  out += text.slice(last);
  let placed = false;
  const kw = window.DRAFT_CITATION?.keyword || window.DRAFT_CITATION_KEYWORD || 'cite';
  out = out.replace(new RegExp(`\\{${kw} endnote(?:[\\s|][^}\\n]*)?\\}`, 'g'), (m, at) => (found.inCode(at) ? m : (placed = true, compiler ? hold(esc(m)) : 'DRAFTENDNOTES')));
  const endnotes = cited.length ? `<section class="endnotes"><h2>Works cited</h2><ol>${cited.map(id => { const w = WORKS[id];
    return `<li id="di-ref-${esc(id)}">${esc(w?.note || id)}${w?.title ? `. <cite>${esc(w.title)}</cite>.` : ' <span class="unresolved">(not yet found)</span>'}</li>`; }).join('')}</ol></section>` : '';
  const md = options.render || (m => m.split(/\n{2,}/).map(p => `<p>${esc(p)}</p>`).join(''));
  if (compiler && !placed && cited.length) out += '\n\n' + hold(`{${kw} endnote}`);
  let html = md(out + (compiler || placed || !cited.length ? '' : '\n\nDRAFTENDNOTES'))
    .replace(/<p>DRAFTENDNOTES<\/p>|DRAFTENDNOTES/g, endnotes)
    .replace(/<p>DRAFTPH(\d+)X<\/p>/g, (m, n) => parts[n]).replace(/DRAFTPH(\d+)X/g, (m, n) => parts[n]);
  let formatted = false, diagnostics = [];
  if (compiler) {
    try {
      const r = compiler.compileHTML(html, compiler.cache, { citationStyle: compiler.citationStyle || 'chicago-author-date', citationKeyword: kw, namespace: 'di-preview' });
      // Each citation's reference on hover, as on the site (whose inspector panel isn't loaded in the preview).
      html = options.hoverTitles === false ? r.html
        : r.html.replace(/(<a class="citation-cite"[^>]*?) data-ci-bibliography="([^"]*)"/g, (m, a, bib) => (/ title="/.test(a) ? m : `${a} title="${bib}" data-ci-bibliography="${bib}"`));
      formatted = true; diagnostics = r.diagnostics || [];
    } catch (e) {
      // The compiler stopped: show the notes instead, and say why, rather than a blank preview.
      return { ...renderArticle(text, { ...options, citations: null }), compileError: e.message };
    }
  }
  const h1 = text.match(/^#\s+(.+)$/m);
  const prose = found.filter(b => b.kind !== 'ref').reduceRight((t, b) => t.slice(0, b.start) + t.slice(b.end), text).replace(/[#>*_`[\]()-]/g, ' ');
  return { html, title: h1 ? h1[1] : '', words: (prose.match(/[\p{L}\p{N}][\p{L}\p{N}'’-]*/gu) || []).length,
    citations: found.filter(b => b.kind === 'citation').length, figures: found.filter(b => b.kind === 'figure').length,
    equations: maths.filter(m => m.kind === 'math' && m.display).length, crossref, formatted, diagnostics };
}

/**
 * What to do with a draft kept in this browser when the editor opens. The page's own text always loads; a kept draft
 * that differs is offered, never applied unasked.
 * @param {string} given  The page's text as the site gave it now.
 * @param {{ text: string, base?: string, at?: number } | null} kept  The kept draft: its text, the text it started
 *   from, and when it was kept.
 * @returns {'none' | 'same' | 'offer' | 'offer-changed'}  Nothing kept; kept but identical (forget it); offer it;
 *   offer it, warning that the page has changed since the draft began.
 */
export function recoveryChoice(given, kept) {
  if (!kept || typeof kept.text !== 'string') return 'none';
  if (kept.text === given) return 'same';
  return kept.base === undefined || kept.base === given ? 'offer' : 'offer-changed';
}

/**
 * @param {HTMLElement} root  Where the editor goes. It fills the element; give it a height (or `fullWindow`).
 * @param {object} options
 * @param {string | (() => Promise<string>)} options.text  The Markdown to edit.
 * @param {(markdown: string) => string} [options.render]  Markdown to HTML for the preview. Without it the preview
 *   shows paragraphs of plain text.
 * @param {(text: string) => Promise<string | void>} [options.save]  Adds a Save button; the returned text is shown.
 * @param {() => void} [options.done]  Adds a Done button (to leave the editor).
 * @param {() => Promise<string>} [options.reset]  Adds a Reset button that loads this text.
 * @param {string} [options.label]  What the box says it is ("Editing").
 * @param {string | null} [options.storageKey]  Keep the draft and settings in this browser under this name.
 * @param {Array<{label, path, url?}>} [options.images]  Images a figure can use; `url` if the path isn't servable.
 * @param {string} [options.publicFolder]  Where uploads are written (default `/uploads`).
 * @param {string} [options.previewClass]  The site's own class for article text, so the preview looks like the site.
 * @param {boolean} [options.fullWindow]  Fill the window instead of a box.
 * @param {string[]} [options.blocks]  Only these blocks (such as ['citation']); default: every block the page loaded.
 * @param {Array<object>} [options.fields]  The page's collection fields (Sveltia's format). With them, `text` is the
 *   whole file, and its front matter is edited in a Details panel; without, `text` is the body alone, as before.
 * @param {string} [options.collection]  Or: a collection name to find in `window.DRAFT_COLLECTIONS`.
 * @param {string} [options.slug]  The page's slug, so it isn't listed among its collection's other entries.
 * @param {Record<string, Array<object>>} [options.entries]  Entries for relation fields, by collection
 *   (default `window.DRAFT_ENTRIES`).
 * @param {{ katex: object, macros?: object, refNames?: object }} [options.math]  LaTeX maths ($…$, $$…$$ {#eq:…}) drawn by
 *   KaTeX (vendor/katex/katex.mjs) as MathML, with the site's macros; numbered equations and figures, and {ref …}
 *   worded by refNames (default "Eq. 3", "Figure 2"). Without it, maths shows as its source.
 * @param {{ compileHTML: Function, cache: object, citationStyle?: string }} [options.citations]  Formatted citations
 *   and endnotes in the preview: citation.inator's browser compiler (citation-compiler.mjs) and the site's citation
 *   cache. Without it the preview shows each work's note.
 * @param {boolean} [options.showImport]  Show the Import citations button even without an importer (disabled).
 * @param {object} [options.importer]  Turns on Import citations: { process, describe?, siteCache?, recordId?,
 *   onRecords? } (see src/editor/importer.js). `process` is citation.inator's processImportRequest.
 */
export function mountEditor(root, options = {}) {
  const F = window.DraftForms;
  if (!F) throw new Error('Load src/editor/forms.js (and the blocks) before mounting the editor.');
  const o = { label: 'Editing', publicFolder: '/uploads', storageKey: null, ...options };
  // Only the blocks the page loaded (and, if `blocks` is given, allowed) appear: no button, no form, tags left as text.
  const { cite, figure } = enabledBlocks(o.blocks);
  F.publicFolder = o.publicFolder;
  for (const img of o.images || []) {
    if (!F.imageSources.some(s => s.path === img.path)) F.imageSources.push({ label: img.label, path: img.path });
    if (img.url) F.assets[img.path] = img.url;
  }
  const collection = o.collection && (window.DRAFT_COLLECTIONS || []).find(c => c.name === o.collection);
  if (o.collection && !collection && !o.fields) throw new Error(`No collection "${o.collection}" in window.DRAFT_COLLECTIONS.`);
  const fields = o.fields || collection?.fields || null;
  const entries = o.entries || window.DRAFT_ENTRIES || {};
  const SAMPLES = new Set((o.images || []).map(i => i.path));

  const store = {
    get(k) { if (!o.storageKey) return null; try { return localStorage.getItem(o.storageKey + ':' + k); } catch { return null; } },
    set(k, v) { if (!o.storageKey) return false; try { localStorage.setItem(o.storageKey + ':' + k, v); return true; } catch { return false; } }
  };

  // ---------- Build the editor ----------
  root.classList.add('di-editor');
  if (o.fullWindow) root.classList.add('di-full');
  root.textContent = '';
  const title = el('span', { class: 'di-title', text: '' });
  const viewButton = el('button', { type: 'button', class: 'di-menu-button', 'aria-haspopup': 'menu', 'aria-expanded': 'false' });
  const menu = el('div', { class: 'di-menu', role: 'menu', 'aria-label': 'View', hidden: true });
  const layoutItems = LAYOUTS.map(l => el('button', { type: 'button', role: 'menuitemradio', 'aria-checked': 'false', 'data-layout': l.id, text: l.label }));
  const toolbarItem = el('button', { type: 'button', role: 'menuitemcheckbox', 'aria-checked': 'true', text: 'Toolbar' });
  const plainItem = el('button', { type: 'button', role: 'menuitem', text: 'Plain: just the text' });
  menu.append(...layoutItems, el('div', { role: 'separator' }), toolbarItem, plainItem);
  const head = el('div', { class: 'di-head' }, [
    el('span', { class: 'di-label', text: o.label }), title, el('span', { class: 'di-spacer' }),
    el('div', { class: 'di-view' }, [viewButton, menu])
  ]);
  const resetButton = o.reset && el('button', { type: 'button', class: 'di-quiet', text: 'Reset', title: 'Start again from the sample' });
  const doneButton = o.done && el('button', { type: 'button', class: 'di-quiet', text: 'Done' });
  const saveButton = o.save && el('button', { type: 'button', class: 'di-primary', text: 'Save' });
  head.append(...[resetButton, doneButton, saveButton].filter(Boolean));

  // The tooltip (title) may say more; the spoken name is the visible text, except for one-letter buttons (`name`).
  const tb = (cmd, text, label, extra = {}) => el('button', { type: 'button', 'data-cmd': cmd, title: label, ...extra }, typeof text === 'string' ? [document.createTextNode(text)] : text);
  const editButton = tb('edit', 'Edit', 'Put the cursor in a citation or figure (Ctrl+E)', { disabled: true });
  const toolbar = el('div', { class: 'di-toolbar', role: 'toolbar', 'aria-label': 'Formatting' }, [
    el('div', { class: 'di-group' }, [tb('heading', 'H', 'Heading', { 'aria-label': 'Heading' }), tb('bold', [el('b', { text: 'B' })], 'Bold (Ctrl+B)', { 'aria-label': 'Bold' }),
      tb('italic', [el('i', { text: 'I' })], 'Italic (Ctrl+I)', { 'aria-label': 'Italic' }), tb('link', 'Link', 'Link (Ctrl+K)'), tb('code', 'Code', 'Code')]),
    el('div', { class: 'di-group' }, [tb('ul', '• List', 'Bulleted list'), tb('ol', '1. List', 'Numbered list'), tb('quote', 'Quote', 'Quotation')]),
    el('div', { class: 'di-group di-blocks' }, [cite && tb('citation', 'Citation', 'Insert a citation'), figure && tb('figure', 'Figure', 'Insert a figure'),
      o.math?.katex && tb('equation', 'Equation', 'Insert an equation, or edit the one the cursor is in (Ctrl+M)'),
      (cite || figure) && editButton, o.openFiles !== false && tb('open', 'Open a file', 'Bring in a Word file (.docx, from Word or Google Docs), with its equations, or a Markdown or text file'),
      (o.importer || o.showImport) && tb('import', 'Import citations',
        o.importer ? 'Find citations such as (Bell, 1992) and convert them' : 'Coming with citation.inator\'s importer', { disabled: !o.importer })])
  ]);
  const source = el('textarea', { class: 'di-source', spellcheck: 'true', 'aria-label': 'The article, in Markdown' });
  const preview = el('article', { class: ['di-article', o.previewClass].filter(Boolean).join(' '), 'aria-label': 'Preview' });
  const readPane = el('div', { class: 'di-pane di-read' }, [preview]);
  const note = el('p', { class: 'di-note', text: 'Citations here show each work\'s note. Give the editor the site\'s citation records (the citations option) to see them formatted, with endnotes.' });
  readPane.append(note);
  const panes = el('div', { class: 'di-panes' }, [el('div', { class: 'di-pane di-write' }, [source]), readPane]);
  const counts = el('span'), saved = el('span'), live = el('span', { class: 'di-sr', role: 'status', 'aria-live': 'polite' });
  // A small working sign: the preview catching up with a long article, or a file being brought in.
  const updating = el('span', { class: 'di-busy-note', hidden: true }, [el('span', { class: 'di-spinner', 'aria-hidden': 'true' }), document.createTextNode('Updating the preview…')]);
  const status = el('div', { class: 'di-status' }, [counts, updating, saved, live]);
  const exitPlain = el('button', { type: 'button', class: 'di-exit-plain', text: 'Leave plain (Esc)', hidden: true });
  const recoverText = el('span'), recoverButton = el('button', { type: 'button', class: 'di-primary', text: 'Restore them' });
  const discardButton = el('button', { type: 'button', class: 'di-quiet', text: 'Discard' });
  const recover = el('div', { class: 'di-recover', role: 'region', 'aria-label': 'Unsaved changes', hidden: true },
    [recoverText, el('span', { class: 'di-recover-actions' }, [recoverButton, discardButton])]);

  // Citations typed by hand (not yet markers): a banner that can't be missed, and Save waits (importer.handTyped).
  // 'block' (Save waits; Save without importing is the way out), 'require' (Save waits, no way out: the site forbids
  // saving citations typed by hand), 'warn' (the banner only), or 'off'.
  const typedPolicy = o.importer ? (o.importer.handTyped || 'block') : 'off';
  const typedHolds = typedPolicy === 'block' || typedPolicy === 'require';
  const typedText = el('span', { class: 'di-typed-text' });
  const typedReview = el('button', { type: 'button', class: 'di-primary', text: 'Import citations' });
  const typedAnyway = el('button', { type: 'button', class: 'di-quiet', text: 'Save without importing', hidden: true });
  const typedBar = el('div', { class: 'di-typed', role: 'region', 'aria-label': 'Citations typed by hand', hidden: true },
    [el('span', { class: 'di-typed-icon', 'aria-hidden': 'true', text: '!' }), typedText, el('span', { class: 'di-typed-actions' }, [typedReview, typedAnyway])]);

  // What an import did, where a sighted writer sees it, with Undo (a phone has no Ctrl+Z).
  const doneText = el('span');
  const doneUndo = el('button', { type: 'button', class: 'di-quiet', text: 'Undo' });
  const doneClose = el('button', { type: 'button', class: 'di-quiet di-done-close', 'aria-label': 'Dismiss', text: '×' });
  const doneBar = el('div', { class: 'di-done', role: 'region', 'aria-label': 'Import result', hidden: true }, [doneText, el('span', { class: 'di-typed-actions' }, [doneUndo, doneClose])]);

  const dTitle = el('h2', { text: 'Citation' }), dFields = el('div'), dOut = el('output', { class: 'di-code' });
  const dError = el('p', { class: 'di-error', role: 'alert' });
  const dCancel = el('button', { type: 'button', class: 'di-quiet', text: 'Cancel' }), dSave = el('button', { type: 'submit', class: 'di-primary', text: 'Insert' });
  const dForm = el('form', { method: 'dialog' }, [dTitle, dFields, el('h3', { text: 'What it writes' }), dOut, dError, el('div', { class: 'di-actions' }, [dCancel, dSave])]);
  const dialog = el('dialog', { class: 'di-dialog' }, [dForm]);
  dialog.setAttribute('aria-label', 'Block');
  const detailsHost = el('div', { class: 'di-details-body' });
  // Open, except on a narrow screen, where the text comes first and Details is a tap away.
  const details = fields && el('details', { class: 'di-details', open: !window.matchMedia?.('(max-width: 40rem)').matches }, [el('summary', { text: 'Details' }), detailsHost]);
  root.append(...[head, recover, typedBar, doneBar, details, toolbar, panes, status, exitPlain, dialog].filter(Boolean));

  const announce = msg => { live.textContent = ''; setTimeout(() => { live.textContent = msg; }, 30); };

  // ---------- The whole file: front matter (the Details panel) and body (the text box) ----------
  // Without `fields` there is no front matter here: the text box holds everything given, as before 0.5.
  let frontMatter = '', panel = null;
  const whole = () => frontMatter + source.value;
  // Take a whole file: draw its front matter into the panel; return the body for the text box.
  function load(text) {
    if (!fields) return text;
    const parts = splitFrontMatter(text);
    frontMatter = parts.frontMatter;
    panel = drawDetails(detailsHost, { fields, frontMatter, entries, images: o.images || [], collection: collection?.name || o.collection || null, slug: o.slug || null,
      change: fm => { frontMatter = fm; changed(); } });
    return parts.body;
  }

  // ---------- Blocks in the text, and the preview ----------
  const blocks = text => findBlocks(text, cite, figure);
  const blockAt = (text, at) => blocks(text).find(b => at >= b.start && at <= b.end);
  // An upload lives only in the browser it was made in; elsewhere renderArticle says so instead of a broken image.
  const imageURL = p => F.assets[p] || (SAMPLES.has(p) || !p.startsWith(o.publicFolder + '/') || !o.storageKey ? p : null);
  // A long paper takes a while to draw (a 30,000-character article with citations and equations, about a second or
  // two), so the preview catches up just after typing pauses, with a quiet cue; a short one is drawn at once.
  let renderTimer = null, renderCost = 0;
  const rendered = [];   // waiting for the preview to catch up (opening a file)
  const caughtUp = (limit = 8000) => (preview.classList.contains('di-updating') ? new Promise(r => { rendered.push(r); setTimeout(r, limit); }) : Promise.resolve());
  function renderSoon() {
    clearTimeout(renderTimer);
    if (renderCost < 60 && source.value.length < 12000) { render(); return; }
    preview.classList.add('di-updating'); preview.setAttribute('aria-busy', 'true'); updating.hidden = false;
    renderTimer = setTimeout(render, Math.min(900, 150 + renderCost / 2));
  }
  function render() {
    clearTimeout(renderTimer);
    const started = performance.now();
    // cite.inator's citation panel, as on the site, when the host has loaded it (citation-inspector.mjs and .css);
    // otherwise each citation's reference shows as a plain tooltip.
    const inspector = !!(o.citations && window.customElements?.get('citation-inspector'));
    const r = renderArticle(source.value, { render: o.render, imageURL, blocks: o.blocks, citations: o.citations, hoverTitles: !inspector,
      math: o.math?.katex || null, mathMacros: o.math?.macros, refNames: o.math?.refNames });
    if (inspector && r.formatted) {
      const panel = document.createElement('citation-inspector');
      for (const [k, v] of Object.entries({ 'panel-title': 'Citation details', 'panel-icon': 'none', 'access-settings': 'off', 'access-layout': 'flat', activation: 'hover', ...(o.citations.inspectorAttributes || {}) })) panel.setAttribute(k, v);
      panel.innerHTML = r.html;
      preview.replaceChildren(panel);
      try { panel.cache = o.citations.cache; } catch { /* the panel is a nicety: the formatted citations stand without it */ }
    } else preview.innerHTML = r.html;
    note.hidden = r.formatted;
    if (r.compileError) { note.hidden = false; note.textContent = 'Citations show each work\'s note: the citation compiler stopped (' + r.compileError + ').'; }
    title.textContent = (panel && typeof panel.values().title === 'string' && panel.values().title) || r.title;
    // Unresolved placeholders stay visible until someone finishes them (opens each and chooses its work).
    const kw = window.DRAFT_CITATION?.keyword || 'cite';
    const unresolved = (source.value.match(new RegExp(`\\{${kw}\\s[^}]*\\bunresolved:`, 'g')) || []).length;
    // Maths that doesn't parse, references to missing labels, and labels used twice: counted, and listed on hover.
    const fix = r.crossref || [];
    counts.textContent = `${r.words} words · ${r.citations} citations · ${r.figures} figures` + (r.equations ? ` · ${r.equations} equations` : '') +
      (unresolved ? ` · ${unresolved} unresolved` : '') + (fix.length ? ` · ${fix.length} to fix` : '');
    counts.title = fix.map(d => d.message).join('\n');
    counts.classList.toggle('di-counts-warn', unresolved > 0 || fix.length > 0);
    preview.classList.remove('di-updating'); preview.removeAttribute('aria-busy'); updating.hidden = true;
    renderCost = performance.now() - started;
    for (const done of rendered.splice(0)) done();
    if (document.activeElement === source) followCaret();
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
    const p = i => (typeof prefix === 'function' ? prefix(i) : prefix), lines = v.slice(a, b).split('\n');
    const all = lines.every((l, i) => l.startsWith(p(i)));
    const next = lines.map((l, i) => (all ? l.slice(p(i).length) : p(i) + l)).join('\n');
    replace(a, b, next, [0, next.length]);
  }
  function addImportedWorks(works, records) {
    window.DRAFT_CITATION?.addWorks(works);
    // New works join the records the preview compiles with, so their citations are formatted at once.
    if (o.citations?.cache && records?.length) {
      const have = new Set(o.citations.cache.records.map(r => r.id));
      o.citations.cache = { ...o.citations.cache, records: [...o.citations.cache.records, ...records.filter(r => !have.has(r.id))] };
    }
    render();
  }
  // Replace the article with an opened file, or put it in at the cursor? Resolves 'replace', 'insert', or null.
  function askHow(name, equations) {
    return new Promise(resolve => {
      const replaceB = el('button', { type: 'button', class: 'di-primary', text: 'Replace the article' });
      const insertB = el('button', { type: 'button', class: 'di-quiet', text: 'Insert at the cursor' });
      const cancelB = el('button', { type: 'button', class: 'di-quiet', text: 'Cancel' });
      const ask = el('dialog', { class: 'di-dialog di-ask', 'aria-labelledby': 'di-ask-title' }, [
        el('h2', { id: 'di-ask-title', text: `Bring in ${name}` }),
        el('p', { text: `It's ready${equations ? `, with ${equations} equation${equations === 1 ? '' : 's'}` : ''}. Replace this article with it, or put it in where the cursor is? Either way, Undo takes it out again.` }),
        el('div', { class: 'di-actions' }, [cancelB, insertB, replaceB])]);
      const done = v => { ask.close(); ask.remove(); resolve(v); };
      replaceB.addEventListener('click', () => done('replace'));
      insertB.addEventListener('click', () => done('insert'));
      cancelB.addEventListener('click', () => done(null));
      ask.addEventListener('cancel', e => { e.preventDefault(); done(null); });
      root.append(ask); ask.showModal(); replaceB.focus();
    });
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
    equation: async () => {
      const { openEquation } = await import('./equation.js');
      openEquation({ el, root, getText: () => source.value, getSelection: () => [source.selectionStart, source.selectionEnd],
        replace, announce, focus: () => source.focus() }, o.math);
    },
    // A Word file (or Markdown, or text) comes in at the cursor, as one undoable step; an empty article is replaced.
    // Its typed citations then show in the banner, ready for Import citations.
    open: () => {
      const pick = el('input', { type: 'file', accept: '.docx,.md,.markdown,.txt,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/markdown,text/plain', hidden: true });
      pick.addEventListener('change', async () => {
        const file = pick.files[0]; pick.remove();
        if (!file) return;
        doneText.textContent = `Bringing in ${file.name}…`; doneBar.hidden = false; doneBar.classList.add('di-busy'); announce(doneText.textContent);
        const shownAt = performance.now();
        await new Promise(r => setTimeout(r, 30));   // let the message show before the work starts
        let markdown, notes = [], equations = 0;
        try {
          if (/\.docx$/i.test(file.name)) {
            const { docxToMarkdown } = await import('./docx.js');
            ({ markdown, notes, equations } = await docxToMarkdown(await file.arrayBuffer()));
          } else if (/\.(md|markdown|txt)$/i.test(file.name) || /^text\//.test(file.type)) markdown = await file.text();
          else throw new Error('The editor opens Word (.docx), Markdown, and text files.');
        } catch (e) { doneBar.classList.remove('di-busy'); doneText.textContent = `${file.name} couldn't be opened: ${e.message}`; doneBar.hidden = false; announce(doneText.textContent); return; }
        doneBar.classList.remove('di-busy');   // waiting on the writer's choice, not on work
        const empty = !source.value.trim();
        // An article with text in it: ask whether the file replaces it or goes in at the cursor.
        const how = empty ? 'replace' : await askHow(file.name, equations);
        if (!how) { doneText.textContent = `${file.name} wasn't brought in.`; announce(doneText.textContent); return; }
        doneBar.classList.add('di-busy');
        const all = how === 'replace';
        const at = all ? 0 : source.selectionStart, end = all ? source.value.length : source.selectionEnd;
        // Its own paragraphs: a blank line before and after, unless the article already has one there.
        doneText.textContent = `Bringing in ${file.name}…`;
        const before = source.value.slice(0, at), after = source.value.slice(end);
        markdown = markdown.replace(/\n+$/, '');
        if (before && !/\n\n$/.test(before)) markdown = (/\n$/.test(before) ? '\n' : '\n\n') + markdown;
        markdown += after ? (/^\n\n/.test(after) ? '' : /^\n/.test(after) ? '\n' : '\n\n') : '\n';
        replace(at, end, markdown, [0, 0]);
        // The work isn't done until the preview shows it; and long enough to be seen either way (a sign that flashes for
        // a few milliseconds reads as a glitch, not as work).
        await caughtUp();
        await new Promise(r => setTimeout(r, Math.max(0, 350 - (performance.now() - shownAt))));
        doneBar.classList.remove('di-busy');
        doneText.textContent = `${file.name} brought in${equations ? `, with ${equations} equation${equations === 1 ? '' : 's'}` : ''}.` +
          (notes.length ? ` Not carried over: ${notes.join('; ')}.` : '') + ' Undo takes it out again.';
        doneBar.hidden = false; announce(doneText.textContent); checkTyped();
      });
      root.append(pick); pick.click();
    },
    edit: () => { const b = blockAt(source.value, source.selectionStart); if (b) openBlock(b.kind, b); else if (mathAt()) COMMANDS.equation(); },
    import: async () => {
      typed.reviewed = true;
      const { openImport } = await import('./importer.js');
      openImport({ el, root, getText: () => source.value, replace, announce, focus: () => source.focus(), memory: importMemory,
        recheck: () => checkTyped(),
        // Citations the writer chose to leave as typed count as permission to save with them.
        leftAsTyped: n => { typed.acceptedLeft = n; },
        report: msg => { doneText.textContent = msg; doneBar.hidden = false; },
        addWorks: addImportedWorks }, o.importer);
    }
  };
  toolbar.addEventListener('click', e => { const b = e.target.closest('button[data-cmd]'); if (b && !b.disabled && COMMANDS[b.dataset.cmd]) COMMANDS[b.dataset.cmd](); });
  // Maths the cursor is in (with the maths option): the Edit button and Ctrl+E open it in the Equation dialog.
  const mathAt = () => o.math?.katex && findMath(source.value).find(m => m.kind === 'math' && source.selectionStart >= m.start && source.selectionStart <= m.end);
  function updateEditButton() {
    const b = blockAt(source.value, source.selectionStart), m = !b && mathAt();
    editButton.disabled = !b && !m;
    editButton.textContent = b ? `Edit ${b.kind}` : m ? 'Edit equation' : 'Edit';
  }

  // ---------- The block dialog ----------
  let editing = null;
  function openBlock(kind, range = null) {
    const component = kind === 'citation' ? cite : figure;
    const data = range ? component.fromBlock(range.match) : kind === 'citation' ? { items: [{}] } : {};
    editing = { kind, range: range && { start: range.start, end: range.end, raw: range.match[0] }, data };
    dTitle.textContent = (range ? 'Edit ' : 'Insert a ') + kind;
    dSave.textContent = range ? 'Save' : 'Insert';
    dError.textContent = '';
    const show = () => { dOut.textContent = component.toBlock(editing.data); };
    F.drawForm(component, dFields, editing.data, show);
    show();
    dialog.showModal();
    const first = dFields.querySelector('select, input:not([type=hidden]):not(.visually-hidden)');
    if (first) first.focus();
  }
  function problem(kind, d) {
    if (kind === 'citation') return d.items?.some(it => it.work) ? '' : 'Choose a work to cite.';
    if (!d.src) return 'Choose or upload an image.';
    if (!d.alt) return 'Add alt text: what the image shows, for people who can\'t see it.';
    return '';
  }
  dForm.addEventListener('submit', e => {
    e.preventDefault();
    const { kind, range, data } = editing, component = kind === 'citation' ? cite : figure;
    const p = problem(kind, data);
    if (p) { dError.textContent = p; return; }
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
  dCancel.addEventListener('click', () => { dialog.close(); source.focus(); });

  // ---------- The View menu ----------
  function setLayout(id, quiet) {
    root.dataset.layout = id;
    for (const item of layoutItems) item.setAttribute('aria-checked', String(item.dataset.layout === id));
    viewButton.textContent = 'View: ' + LAYOUTS.find(l => l.id === id).label;
    store.set('layout', id);
    if (!quiet) announce(`Layout: ${LAYOUTS.find(l => l.id === id).label}.`);
  }
  function setToolbar(on, quiet) {
    root.classList.toggle('di-no-toolbar', !on);
    toolbarItem.setAttribute('aria-checked', String(on));
    store.set('toolbar', on ? '1' : '0');
    if (!quiet) announce(on ? 'Toolbar shown.' : 'Toolbar hidden.');
  }
  function setPlain(on) {
    root.classList.toggle('di-plain', on);
    exitPlain.hidden = !on;
    source.focus();
    announce(on ? 'Plain: just the text. Press Escape to leave.' : 'Left plain.');
  }
  const items = () => [...menu.querySelectorAll('[role^=menuitem]')];
  function openMenu(focusLast) {
    menu.hidden = false; viewButton.setAttribute('aria-expanded', 'true');
    const list = items(), checked = list.find(i => i.getAttribute('aria-checked') === 'true' && i.dataset.layout);
    (focusLast ? list[list.length - 1] : checked || list[0]).focus();
  }
  function closeMenu(refocus) { menu.hidden = true; viewButton.setAttribute('aria-expanded', 'false'); if (refocus) viewButton.focus(); }
  viewButton.addEventListener('click', () => (menu.hidden ? openMenu() : closeMenu()));
  viewButton.addEventListener('keydown', e => { if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); openMenu(e.key === 'ArrowUp'); } });
  menu.addEventListener('keydown', e => {
    const list = items(), i = list.indexOf(document.activeElement);
    if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); closeMenu(true); }
    else if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); list[(i + (e.key === 'ArrowDown' ? 1 : list.length - 1)) % list.length].focus(); }
    else if (e.key === 'Home' || e.key === 'End') { e.preventDefault(); list[e.key === 'Home' ? 0 : list.length - 1].focus(); }
    else if (e.key === 'Tab') closeMenu(false);
  });
  menu.addEventListener('click', e => {
    const item = e.target.closest('[role^=menuitem]');
    if (!item) return;
    closeMenu(true);
    if (item.dataset.layout) setLayout(item.dataset.layout);
    else if (item === toolbarItem) setToolbar(root.classList.contains('di-no-toolbar'));
    else if (item === plainItem) setPlain(true);
  });
  document.addEventListener('click', e => { if (!menu.hidden && !e.target.closest('.di-view')) closeMenu(false); });
  exitPlain.addEventListener('click', () => setPlain(false));

  // ---------- Keys ----------
  document.addEventListener('keydown', e => {
    if (e.key === 'Escape' && root.classList.contains('di-plain') && !dialog.open) { e.preventDefault(); setPlain(false); }
  });
  source.addEventListener('keydown', e => {
    if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
    const cmd = { b: 'bold', i: 'italic', k: 'link', e: 'edit', ...(o.math?.katex && { m: 'equation' }) }[e.key.toLowerCase()];
    if (cmd) { e.preventDefault(); COMMANDS[cmd](); }
  });

  // ---------- Save, Done, Reset ----------
  if (saveButton) saveButton.addEventListener('click', async () => {
    saveButton.disabled = true; saved.textContent = 'Saving…';
    try {
      await checkTyped();
      if (typedHolds && typed.count && !typed.override) {
        typedBar.hidden = false; typedReview.focus();
        throw new Error(`${typed.count} citation${typed.count === 1 ? ' is' : 's are'} typed by hand. Import ${typed.count === 1 ? 'it' : 'them'}` + (typedPolicy === 'require' ? ' first: this site doesn\'t save citations typed by hand.' : ', or choose Save without importing.'));
      }
      if (panel) {
        const problems = checkDetails(fields, panel.values());
        if (problems.length) {
          details.open = true; panel.show(problems);
          throw new Error(problems.length === 1 ? problems[0].message : `${problems.length} details need attention: ${problems.map(p => p.label).join(', ')}.`);
        }
      }
      const text = whole(), msg = await o.save(text);
      base = text; forgetDraft();   // saved: the kept copy has done its job
      saved.textContent = msg || 'Saved'; announce(saved.textContent);
    }
    catch (error) { saved.textContent = 'Not saved: ' + (error?.message || error); announce(saved.textContent); }
    finally { saveButton.disabled = false; }
  });
  if (doneButton) doneButton.addEventListener('click', () => o.done(whole()));
  if (resetButton) resetButton.addEventListener('click', async () => {
    const text = await o.reset();
    base = text;
    replace(0, source.value.length, load(text));
    source.setSelectionRange(0, 0); source.scrollTop = 0;
    announce('Back to the sample article.');
  });

  // ---------- Keep the preview with the writing ----------
  // The preview shows the paragraph being written: where the cursor is (clicked, typed, or moved), centred, or, when
  // the text is scrolled, the paragraph at the top of the text. Paragraphs are matched by their words, and equations
  // and figures by their order, so a long article with tall equations, figures, and endnotes stays in step.
  const words = t => (t.replace(/\{[^}]*\}|\$\$[\s\S]*?\$\$|\$[^$\n]*\$|<[^>]+>|\[([^\]]*)\]\([^)]*\)/g, ' $1 ')
    .toLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || []);
  function previewTarget(at) {
    const text = source.value;
    const start = Math.max(0, text.lastIndexOf('\n\n', at - 1) + 2), stop = text.indexOf('\n\n', at);
    const block = text.slice(start, stop < 0 ? text.length : stop);
    const nth = (re, sel) => { const n = (text.slice(0, start).match(re) || []).length; return preview.querySelectorAll(sel)[n] || null; };
    if (/^\s*\$\$/.test(block)) return nth(/(^|\n)\s*\$\$[\s\S]*?\$\$/g, '.di-equation');
    if (/^\s*\{figure\b/.test(block)) return nth(/(^|\n)\s*\{figure\b/g, 'figure');
    const want = words(block).slice(0, 8);
    if (!want.length) return null;
    // The element whose words start the same way; among several, the one nearest where it would be by position.
    const els = [...preview.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li, blockquote, figcaption, td, dt, dd')];
    const fits = els.filter(e => { const w = words(e.textContent); return want.slice(0, 4).every((x, i) => w[i] === x); });
    if (!fits.length) return null;
    const guess = (at / Math.max(1, text.length)) * preview.scrollHeight;
    return fits.sort((x, y) => Math.abs(x.offsetTop - guess) - Math.abs(y.offsetTop - guess))[0];
  }
  let followTimer, followQuietUntil = 0, caretMovedAt = 0, previewQuietUntil = 0;
  function follow(at, where) {
    const l = root.dataset.layout;
    if (l === 'write' || l === 'preview') return;
    const t = previewTarget(at);
    if (!t) return;
    const pane = readPane.getBoundingClientRect(), r = t.getBoundingClientRect();
    if (where === 'center' && r.top >= pane.top + 24 && r.bottom <= pane.bottom - 24) return;   // already in view: leave it
    const offset = where === 'center' ? (pane.height - Math.min(r.height, pane.height)) / 2 : 16;
    followQuietUntil = Date.now() + 400; previewQuietUntil = Date.now() + 250;
    readPane.scrollTop += r.top - pane.top - offset;
    if (where === 'center') { t.classList.remove('di-here'); void t.offsetWidth; t.classList.add('di-here'); }
  }
  const followCaret = () => { caretMovedAt = Date.now(); clearTimeout(followTimer); followTimer = setTimeout(() => follow(source.selectionStart, 'center'), 120); };
  // The cursor moved by clicking or by moving keys: follow it. Typing is followed once the preview has caught up
  // (render), so a keystroke doesn't search the preview.
  const MOVES = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'PageUp', 'PageDown', 'Home', 'End']);
  source.addEventListener('mousedown', followCaret);
  source.addEventListener('click', followCaret);
  source.addEventListener('keyup', e => { if (MOVES.has(e.key) || e.ctrlKey || e.metaKey) followCaret(); });
  source.addEventListener('input', () => { caretMovedAt = Date.now(); });

  // Where each paragraph of the text sits, measured in a hidden copy of the text pane laid out the same way (same
  // width, font, and wrapping), so scrolling maps to the right paragraph even when long lines wrap.
  let layoutCache = null;
  const mirror = el('div', { class: 'di-mirror', 'aria-hidden': 'true' });
  function paragraphs() {
    const text = source.value, width = source.clientWidth;
    if (layoutCache && layoutCache.text === text && layoutCache.width === width) return layoutCache.list;
    const cs = getComputedStyle(source);
    for (const k of ['fontFamily', 'fontSize', 'fontWeight', 'lineHeight', 'letterSpacing', 'paddingTop', 'paddingRight', 'paddingBottom', 'paddingLeft', 'borderTopWidth', 'borderLeftWidth', 'borderRightWidth', 'tabSize', 'boxSizing']) mirror.style[k] = cs[k];
    mirror.style.width = source.offsetWidth + 'px';
    if (!mirror.isConnected) root.append(mirror);
    const starts = [0]; for (const m of text.matchAll(/\n[ \t]*\n+/g)) starts.push(m.index + m[0].length);
    const frag = document.createDocumentFragment(), marks = [];
    starts.forEach((at, i) => { const mark = el('span'); marks.push(mark); frag.append(mark, document.createTextNode(text.slice(at, starts[i + 1] ?? text.length))); });
    mirror.replaceChildren(frag);
    const top0 = marks[0].offsetTop;
    const list = starts.map((at, i) => ({ at, y: marks[i].offsetTop - top0 }));
    mirror.replaceChildren();
    layoutCache = { text, width, list };
    return list;
  }
  source.addEventListener('scroll', () => {
    // Scrolling the cursor into view (after a click, typing, or a jump) is the cursor's doing: it's followed already.
    if (Date.now() < followQuietUntil || Date.now() - caretMovedAt < 500 || document.activeElement === source && source.selectionStart !== source.selectionEnd) return;
    clearTimeout(followTimer);
    followTimer = setTimeout(() => {
      if (source.scrollTop <= 0) { previewQuietUntil = Date.now() + 250; readPane.scrollTop = 0; return; }
      // The paragraph at the top of the text.
      const list = paragraphs();
      let top = list[0];
      for (const p of list) { if (p.y <= source.scrollTop + 4) top = p; else break; }
      follow(top.at + 1, 'top');
    }, 60);
  });
  // And the other way: scrolling the preview brings the same paragraph to the top of the text.
  let previewTimer;
  readPane.addEventListener('scroll', () => {
    if (Date.now() < previewQuietUntil) return;
    const l = root.dataset.layout;
    if (l === 'write' || l === 'preview') return;
    clearTimeout(previewTimer);
    previewTimer = setTimeout(() => {
      if (readPane.scrollTop <= 0) { followQuietUntil = Date.now() + 400; source.scrollTop = 0; return; }
      const paneTop = readPane.getBoundingClientRect().top;
      const blocks = [...preview.querySelectorAll('h1, h2, h3, h4, h5, h6, p, li, blockquote, figure, .di-equation')];
      const first = blocks.find(b => b.getBoundingClientRect().bottom > paneTop + 8);
      if (!first) return;
      const list = paragraphs(), text = source.value;
      let at = null;
      const nth = (sel, re) => { const i = [...preview.querySelectorAll(sel)].indexOf(first); const m = [...text.matchAll(re)][i]; return m ? m.index : null; };
      if (first.matches('.di-equation')) at = nth('.di-equation', /(^|\n)[ \t]*\$\$[\s\S]*?\$\$/g);
      else if (first.matches('figure')) at = nth('figure', /(^|\n)[ \t]*\{figure\b/g);
      else {
        const want = words(first.textContent).slice(0, 4);
        if (want.length) {
          const guess = (readPane.scrollTop / Math.max(1, readPane.scrollHeight)) * text.length;
          const hits = list.filter((p, i) => { const w = words(text.slice(p.at, list[i + 1]?.at ?? text.length)); return want.every((x, k) => w[k] === x); });
          if (hits.length) at = hits.sort((x, y) => Math.abs(x.at - guess) - Math.abs(y.at - guess))[0].at;
        }
      }
      if (at == null) return;
      let target = list[0];
      for (const p of list) { if (p.at <= at + 1) target = p; else break; }
      followQuietUntil = Date.now() + 400;
      source.scrollTop = Math.max(0, target.y - 8);
    }, 60);
  });

  // ---------- Uploads kept in this browser ----------
  F.onUpload = (path, file) => {
    if (!o.storageKey) return;
    if (file.size > 1_500_000) { announce('Uploaded. This image is too big to keep after you reload.'); return; }
    const reader = new FileReader();
    reader.onload = () => { if (!store.set('asset:' + path, reader.result)) announce('Uploaded, but it won\'t be kept after you reload.'); };
    reader.readAsDataURL(file);
  };
  function restoreUploads(text) {
    for (const m of text.matchAll(/\{figure "?([^"|}\s]+)/g)) {
      const kept = store.get('asset:' + m[1]);
      if (kept && kept.startsWith('data:image/')) {
        F.assets[m[1]] = kept;
        if (!F.imageSources.some(s => s.path === m[1])) F.imageSources.push({ label: m[1].split('/').pop() + ' (uploaded)', path: m[1] });
      }
    }
  }

  // ---------- Drafts kept in this browser ----------
  // Kept as { text, base, at }: the writer's text, the page text it started from, and when. On opening, the page's
  // own text always loads and a kept draft that differs is offered (recoveryChoice), never applied unasked, so a
  // newer save by someone else is never hidden. Saving forgets the kept draft.
  let base = '';
  const readDraft = () => {
    const raw = store.get('draft');
    if (raw) { try { return JSON.parse(raw); } catch { return null; } }
    const old = store.get('text');   // drafts kept by 0.3.0, as plain text
    return old == null ? null : { text: old };
  };
  const keepDraft = text => store.set('draft', JSON.stringify({ text, base, at: Date.now() }));
  const forgetDraft = () => { if (o.storageKey) try { localStorage.removeItem(o.storageKey + ':draft'); localStorage.removeItem(o.storageKey + ':text'); } catch {} };
  function offerDraft(kept, changed) {
    const when = kept.at ? new Date(kept.at).toLocaleString(undefined, { dateStyle: 'medium', timeStyle: 'short' }) : 'an earlier visit';
    recoverText.textContent = `You have changes kept in this browser from ${when}.` +
      (changed ? ' The page has changed since you made them, so restoring them would replace the newer version.' : '');
    recover.hidden = false;
    recover.classList.toggle('di-recover-changed', changed);
    const done = msg => { recover.hidden = true; announce(msg); source.focus(); };
    recoverButton.onclick = () => { restoreUploads(kept.text); replace(0, source.value.length, load(kept.text)); done(fields ? 'Your kept changes are back. Reload the page to see it as it was.' : 'Your kept changes are back. Undo returns to the page as it was.'); };
    discardButton.onclick = () => { forgetDraft(); done('Kept changes discarded.'); };
    announce(recoverText.textContent);
  }

  // ---------- Citations typed by hand ----------
  const typed = { count: 0, examples: [], reviewed: false, override: false, acceptedLeft: 0 };
  const importMemory = new Map();   // the writer's choices in the import review, kept while the page is open
  doneUndo.addEventListener('click', () => { source.focus(); document.execCommand && document.execCommand('undo'); doneBar.hidden = true; changed(); checkTyped(); announce('Import undone.'); });
  doneClose.addEventListener('click', () => { doneBar.hidden = true; source.focus(); });
  let typedTimer;
  async function checkTyped() {
    if (typedPolicy === 'off') return;
    const { findHandTyped } = await import('./importer.js');
    const found = findHandTyped(source.value, o.importer.process);
    if (found.count > typed.count && found.count > typed.acceptedLeft) typed.override = false;   // new ones aren't covered
    Object.assign(typed, found);
    if (typed.acceptedLeft && typed.count <= typed.acceptedLeft) typed.override = true;
    if (typedPolicy === 'require') typed.override = false;   // leaving some as typed in an import doesn't count either
    const n = typed.count;
    typedBar.hidden = !n;
    if (!n) { showSaveBlocked(); return; }
    const one = n === 1, ex = typed.examples;
    const list = ex.length > 2 ? ex.slice(0, -1).join(', ') + ', and ' + ex[ex.length - 1] : ex.join(' and ');
    typedText.textContent = (one ? `1 citation is typed by hand: ${list}. It isn't linked to a work, so readers won't get a real citation or endnote.`
      : `${n} citations are typed by hand, such as ${list}. They aren't linked to works, so readers won't get real citations or endnotes.`) +
      (!typedHolds ? ` Import ${one ? 'it' : 'them'} to fix this.` : typed.override ? ` You chose to save without importing ${one ? 'it' : 'them'}.` : ` Import ${one ? 'it' : 'them'} before saving.`);
    typedAnyway.hidden = typedPolicy !== 'block' || typed.override;   // never offered under 'require'
    showSaveBlocked();
  }
  // While Save would refuse, it looks unavailable, but stays focusable so pressing it still says why.
  function showSaveBlocked() {
    if (!saveButton) return;
    const blocked = typedHolds && typed.count > 0 && !typed.override;
    if (blocked) { saveButton.setAttribute('aria-disabled', 'true'); saveButton.title = 'Import the citations typed by hand first'; }
    else {
      saveButton.removeAttribute('aria-disabled'); saveButton.removeAttribute('title');
      if (/^Not saved: .*typed by hand/.test(saved.textContent)) saved.textContent = '';   // no stale refusal beside a working Save
    }
  }
  // Looking for typed citations reads the whole article; in a long one, wait for a real pause, then use idle time.
  const checkTypedSoon = () => {
    clearTimeout(typedTimer);
    const long = source.value.length > 12000;
    typedTimer = setTimeout(() => (long && window.requestIdleCallback ? requestIdleCallback(() => checkTyped(), { timeout: 2000 }) : checkTyped()), long ? 1500 : 600);
  };
  typedReview.addEventListener('click', () => COMMANDS.import());
  // Save without importing: each typed citation cite.inator can hold becomes an unresolved placeholder, a flagged
  // citation that keeps the words typed and is finished later (cite.inator 0.5.1). One undoable step, reported with
  // Undo. Any it can't hold (those with an entry in the typed reference list) stay as plain text.
  typedAnyway.addEventListener('click', async () => {
    const { planUnresolved } = await import('./importer.js');
    let r = null;
    try { r = planUnresolved(source.value, o.importer.process, { siteCache: o.importer.siteCache, ...(o.importer.recordId && { recordId: o.importer.recordId }) }); } catch { r = null; }
    if (r?.plan) {
      source.focus();
      replace(r.plan.start, r.plan.end, r.plan.text, [0, 0]);
      addImportedWorks(r.records.map(rec => ({ id: rec.id, note: rec.unresolvedText || rec.original || rec.id, title: '' })), r.records);
      o.importer.onRecords?.(r.records, r.cache);
    }
    const kept = r?.kept || 0, left = r ? r.left : typed.count;
    if (left) { typed.override = true; typed.acceptedLeft = left; }
    await checkTyped();
    const msg = [kept && `${kept} kept as unresolved citation${kept === 1 ? '' : 's'}, flagged to finish later`,
      left && `${left} left as plain text, because ${left === 1 ? 'its work is' : 'their works are'} in your reference list (Import citations links ${left === 1 ? 'it' : 'them'})`].filter(Boolean).join('; ') + '.';
    doneText.textContent = msg[0].toUpperCase() + msg.slice(1); doneBar.hidden = false;
    announce(doneText.textContent);
    (saveButton || source).focus();
  });
  // Pasting is when hand-typed citations usually arrive: say so at once.
  source.addEventListener('paste', () => setTimeout(async () => { const before = typed.count; await checkTyped();
    if (typed.count > before) announce(`${typed.count - before} citation${typed.count - before === 1 ? '' : 's'} typed by hand pasted in. Review and import them.`); }, 0));

  // ---------- Start ----------
  let timer;
  let editTimer;
  function changed() {
    renderSoon(); clearTimeout(editTimer); editTimer = setTimeout(updateEditButton, 120); checkTypedSoon();
    if (!o.storageKey) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (whole() === base) { forgetDraft(); saved.textContent = ''; return; }
      saved.textContent = keepDraft(whole()) ? 'Draft kept in this browser' : 'Draft not kept: browser storage is off';
    }, 400);
  }
  source.addEventListener('input', changed);
  for (const ev of ['click', 'keyup', 'select']) source.addEventListener(ev, () => { clearTimeout(editTimer); editTimer = setTimeout(updateEditButton, 120); });

  const ready = (async () => {
    const given = typeof o.text === 'function' ? await o.text() : o.text || '';
    base = given;
    source.value = load(given);
    restoreUploads(given);
    setLayout(store.get('layout') || o.layout || 'split', true);
    setToolbar(store.get('toolbar') !== '0', true);
    let kept = readDraft();
    // A body kept before the panel was turned on would replace the front matter with nothing: never offered.
    if (fields && kept?.text != null && splitFrontMatter(given).frontMatter && !splitFrontMatter(kept.text).frontMatter) kept = null;
    const choice = recoveryChoice(given, kept);
    if (choice === 'same') forgetDraft();
    if (choice === 'offer' || choice === 'offer-changed') offerDraft(kept, choice === 'offer-changed');
    render(); updateEditButton();
    await checkTyped();
  })();

  return {
    ready,
    get text() { return whole(); },
    /** Citations still typed by hand: { count, examples }. */
    get handTyped() { return { count: typed.count, examples: typed.examples.slice() }; },
    set text(v) { base = v; source.value = load(v); render(); updateEditButton(); },
    focus() { source.focus(); },
    setLayout
  };
}
