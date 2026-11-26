/* draft.inator: cite from Zotero. Search the writer's Zotero library from the editor and insert a citation, with the
   work converted by cite.inator (fromZotero) and checked against the site's own works (reconcileZoteroItem) first.
   draft.inator owns the connection, the key, the search, and the picker; cite.inator converts and compares, and makes
   no network requests (issue #40).

   - The key: the writer pastes a Zotero API key (read-only is enough). It's kept for this browser session only
     (sessionStorage), never in the page, a draft, or the repository. Forget removes it at once.
   - Search: Zotero's Web API (api.zotero.org), items only (no notes or attachments), as CSL-JSON.
   - Bindings: which Zotero item became which site work, kept in this browser (localStorage) to mark "Already cited"
     and reuse a work's id. Disposable: losing them never blocks a save; it only means choosing again.
   - Nothing guessed silently: a likely match with a work the site already has, and anything cite.inator flags for
     review, are shown for the writer to decide before inserting. */
import { siteStyleId, siteEvidence } from './importer.js';

export const API = 'https://api.zotero.org';
const KEY_STORE = 'draft-inator-zotero-key';
const BINDINGS = 'draft-inator-zotero-bindings';
const safe = (f, fallback = null) => { try { return f(); } catch { return fallback; } };

/** The session's connection: { key, userID, username }, or null. */
export const connection = {
  get: () => safe(() => JSON.parse(sessionStorage.getItem(KEY_STORE))),
  set: c => safe(() => sessionStorage.setItem(KEY_STORE, JSON.stringify(c))),
  forget: () => safe(() => sessionStorage.removeItem(KEY_STORE))
};

/** Which Zotero items became which site works, in this browser. */
export const bindings = {
  all: () => safe(() => JSON.parse(localStorage.getItem(BINDINGS)), {}) || {},
  set: (zkey, recordId) => safe(() => { const b = bindings.all(); b[zkey] = recordId; localStorage.setItem(BINDINGS, JSON.stringify(b)); })
};
// A binding's key names the site too (scope), so two sites on one origin don't share them (issue #53).
export const bindingKey = (item, scope = '') => `${scope ? scope + '|' : ''}${item.library?.type || 'user'}:${item.library?.id}:${item.key}`;

const headers = key => ({ 'Zotero-API-Version': '3', 'Zotero-API-Key': key });
function failure(r) {
  if (r.status === 403) return new Error('Zotero refused this key. Check it at zotero.org/settings/keys, or make a new one.');
  if (r.status === 429) return new Error('Zotero asked us to slow down. Wait a moment and search again.');
  return new Error(`Zotero answered ${r.status}. Try again in a moment.`);
}

/**
 * Check a key and learn whose library it opens.
 * @returns {Promise<{ key: string, userID: number, username: string, access: object }>}
 */
export async function connect(key, { fetch = globalThis.fetch } = {}) {
  key = String(key || '').trim();
  if (!/^[A-Za-z0-9]{24}$/.test(key)) throw new Error('A Zotero key is 24 letters and digits. Copy it from zotero.org/settings/keys.');
  let r;
  try { r = await fetch(`${API}/keys/current`, { headers: headers(key) }); }
  catch { throw new Error('Couldn\'t reach Zotero. Check the connection, or ask the site to allow api.zotero.org.'); }
  if (!r.ok) throw failure(r);
  const k = await r.json();
  if (!k.userID) throw new Error('This key doesn\'t open a personal library.');
  return { key, userID: k.userID, username: k.username || '', access: k.access || {} };
}

/**
 * Search the library: titles, creators, and years, items only, as CSL-JSON.
 * @returns {Promise<object[]>} Zotero items ({ key, version, library, csljson, data })
 */
export async function searchZotero(conn, q, { fetch = globalThis.fetch, limit = 20, signal } = {}) {
  const params = new URLSearchParams({ q, qmode: 'titleCreatorYear', itemType: '-attachment || note', include: 'csljson,data', limit: String(limit), sort: 'dateModified' });
  let r;
  try { r = await fetch(`${API}/users/${conn.userID}/items?${params}`, { headers: headers(conn.key), signal }); }
  catch (e) { if (e.name === 'AbortError') throw e; throw new Error('Couldn\'t reach Zotero. Check the connection, or ask the site to allow api.zotero.org.'); }
  if (!r.ok) throw failure(r);
  return r.json();
}

const cslOf = item => { const c = typeof item.csljson === 'string' ? safe(() => JSON.parse(item.csljson)) : item.csljson; return Array.isArray(c) ? c[0] : c || {}; };

/** A Zotero item as a writer knows it: "Rivera 2020", and its title. */
export function describeItem(item) {
  const c = cslOf(item);
  const names = (c.author || c.editor || []).map(a => a.family || a.literal).filter(Boolean);
  const who = names.length > 2 ? names[0] + ' et al.' : names.join(' and ') || 'Anonymous';
  const year = c.issued?.['date-parts']?.[0]?.[0] ?? (c.issued?.literal || 'n.d.');
  return { label: `${who} ${year}`, title: c.title || item.data?.title || '(untitled)', type: c.type || item.data?.itemType || '' };
}

/**
 * Convert a chosen item, give it a site-style id, and compare it with the site's works.
 * @param {object} item  A Zotero item from searchZotero.
 * @param {{ fromZotero: Function, reconcileZoteroItem: Function }} manager  cite.inator's manager module.
 * @param {{ siteCache?: object, taken?: string[], recordId?: Function }} [options]
 * @returns {{ selection: object, proposal: object|null, bound: string|null }}
 */
export function prepare(item, manager, { siteCache = null, taken = [], recordId = siteStyleId, bound = bindings.all(), scope = '' } = {}) {
  const hint = bound[bindingKey(item, scope)] || null;
  // A first conversion only to learn the authors, year, and title the id is made from; then the real one. The id is
  // always a fresh one: a browser binding is a hint, never identity (issue #53). It's used only when cite.inator's
  // own comparison finds the work it points to among this item's candidates.
  const draft = manager.fromZotero(item, { recordId: 'draft-inator-provisional', transport: 'web' });
  const known = new Set([...taken, ...((siteCache?.records) || []).map(r => r.id)]);
  let id = recordId(draft.record, { taken: [...known] });
  for (let n = 2; known.has(id); n++) id = `${recordId(draft.record, { taken: [] })}-${n}`;
  const selection = manager.fromZotero(item, { recordId: id, transport: 'web' });
  const proposal = siteCache ? manager.reconcileZoteroItem(selection, siteCache) : null;
  const confirmed = hint && proposal?.candidates?.some(c => c.recordId === hint) ? hint : null;
  return { selection, proposal, bound: confirmed, staleBinding: hint && !confirmed ? hint : null };
}

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/**
 * Open the Zotero dialog.
 * @param {object} editor  The editor's bridge: { el, root, getText, getSelection, replace, announce, focus, addWorks, cited }.
 * @param {{ manager: object, siteCache?: object, fetch?: Function, recordId?: Function, onRecords?: Function }} options
 */
export function openZotero(editor, options) {
  const { el } = editor, fetchFn = options.fetch || globalThis.fetch;
  const scope = options.bindingsScope ?? (typeof location !== 'undefined' ? location.host + location.pathname : '');
  // The works to compare with: the site's, and any added while editing (so a work added earlier is recognised).
  const knownCache = () => ({ schema: 'citation-inator.cache.v1', records: editor.records ? editor.records() : ((options.siteCache?.records) || []) });
  const opener = document.activeElement;
  const [selStart, selEnd] = editor.getSelection();
  const title = el('h2', { id: 'di-z-title', text: 'Cite from Zotero', tabindex: '-1' });
  const body = el('div', { class: 'di-z-body' });
  const status = el('p', { class: 'di-z-status', role: 'status' });
  const error = el('p', { class: 'di-error', role: 'alert' });
  const close = el('button', { type: 'button', class: 'di-quiet', text: 'Close' });
  const dialog = el('dialog', { class: 'di-dialog di-zotero', 'aria-labelledby': 'di-z-title' }, [title, body, status, error, el('div', { class: 'di-actions' }, [close])]);
  editor.root.append(dialog);
  const done = () => { dialog.close(); dialog.remove(); if (opener?.isConnected) opener.focus(); else editor.focus(); };
  close.addEventListener('click', done);
  dialog.addEventListener('cancel', e => { e.preventDefault(); done(); });
  const busy = (on, text = '') => { status.replaceChildren(...(on ? [el('span', { class: 'di-spinner', 'aria-hidden': 'true' })] : []), document.createTextNode(text)); };

  // ---------- Connect ----------
  function drawConnect() {
    const key = el('input', { type: 'password', id: 'di-z-key', autocomplete: 'off', spellcheck: 'false', 'aria-describedby': 'di-z-key-hint' });
    const go = el('button', { type: 'submit', class: 'di-primary', text: 'Connect' });
    const form = el('form', { class: 'di-z-connect' }, [
      el('p', { text: 'Search your Zotero library and cite from it. The editor needs a Zotero API key to read your library.' }),
      el('label', { for: 'di-z-key', text: 'Zotero API key' }), key,
      el('p', { class: 'hint', id: 'di-z-key-hint' }, [document.createTextNode('Make one at '),
        el('a', { href: 'https://www.zotero.org/settings/keys/new', target: '_blank', rel: 'noopener', text: 'zotero.org/settings/keys' }),
        document.createTextNode(' with "Allow library access" (read only is enough). It stays in this browser tab only, until you close it or choose Forget.')]),
      el('div', { class: 'di-actions' }, [go])]);
    form.addEventListener('submit', async e => {
      e.preventDefault(); error.textContent = ''; go.disabled = true; busy(true, 'Checking the key…');
      try { const c = await connect(key.value, { fetch: fetchFn }); connection.set(c); key.value = ''; busy(false, ''); drawSearch(c); }
      catch (err) { busy(false, ''); error.textContent = err.message; go.disabled = false; key.focus(); }
    });
    body.replaceChildren(form); key.focus();
  }

  // ---------- Search ----------
  function drawSearch(conn) {
    const q = el('input', { type: 'search', id: 'di-z-q', role: 'combobox', 'aria-expanded': 'false', 'aria-controls': 'di-z-list', 'aria-autocomplete': 'list', autocomplete: 'off', placeholder: 'Author, title, or year' });
    const list = el('ul', { id: 'di-z-list', role: 'listbox', class: 'di-z-list', 'aria-label': 'Works in your Zotero library' });
    const forget = el('button', { type: 'button', class: 'di-quiet', text: 'Forget the key' });
    forget.addEventListener('click', () => { connection.forget(); editor.announce('The Zotero key is forgotten.'); drawConnect(); });
    body.replaceChildren(
      el('p', { class: 'hint' }, [document.createTextNode(`Connected to ${conn.username ? conn.username + '\'s' : 'your'} Zotero library. `), forget]),
      el('label', { for: 'di-z-q', text: 'Search' }), q, list);
    let items = [], active = -1, timer, ctl;
    const cited = editor.cited();
    const mark = (i) => {
      active = i;
      [...list.children].forEach((li, j) => li.setAttribute('aria-selected', String(j === i)));
      if (i >= 0) { q.setAttribute('aria-activedescendant', `di-z-opt-${i}`); list.children[i].scrollIntoView({ block: 'nearest' }); }
      else q.removeAttribute('aria-activedescendant');
    };
    const draw = () => {
      const b = bindings.all();
      list.replaceChildren(...items.map((it, i) => {
        const d = describeItem(it), was = b[bindingKey(it, scope)];
        const li = el('li', { id: `di-z-opt-${i}`, role: 'option', 'aria-selected': 'false', 'data-i': String(i) }, [
          el('span', { class: 'di-z-label', text: d.label }), el('span', { class: 'di-z-title-text', text: ' · ' + d.title }),
          was && cited.includes(was) ? el('small', { class: 'di-z-cited', text: ' · already cited here' }) : null]);
        return li;
      }));
      q.setAttribute('aria-expanded', String(items.length > 0)); mark(items.length ? 0 : -1);
    };
    const run = async () => {
      const text = q.value.trim();
      if (ctl) ctl.abort();
      if (text.length < 2) { items = []; draw(); busy(false, ''); return; }
      ctl = new AbortController(); busy(true, 'Searching…'); error.textContent = '';
      try { items = await searchZotero(conn, text, { fetch: fetchFn, signal: ctl.signal }); draw(); busy(false, items.length ? `${items.length} found. Arrow keys to move, Enter to choose.` : 'Nothing found.'); }
      catch (e) { if (e.name !== 'AbortError') { busy(false, ''); error.textContent = e.message; } }
    };
    q.addEventListener('input', () => { clearTimeout(timer); timer = setTimeout(run, 300); });
    q.addEventListener('keydown', e => {
      if (e.key === 'ArrowDown' && items.length) { e.preventDefault(); mark(Math.min(items.length - 1, active + 1)); }
      else if (e.key === 'ArrowUp' && items.length) { e.preventDefault(); mark(Math.max(0, active - 1)); }
      else if (e.key === 'Enter' && active >= 0) { e.preventDefault(); drawChoice(conn, items[active]); }
    });
    list.addEventListener('click', e => { const li = e.target.closest('li[data-i]'); if (li) drawChoice(conn, items[+li.dataset.i]); });
    q.focus();
  }

  // ---------- Review and insert ----------
  function drawChoice(conn, item) {
    error.textContent = ''; busy(false, '');
    const cache = knownCache();
    const taken = [...new Set([...(window.DRAFT_WORKS || []).map(w => w.id), ...cache.records.map(r => r.id)])];
    let prepared;
    try { prepared = prepare(item, options.manager, { siteCache: cache, taken, recordId: options.recordId || siteStyleId, scope }); }
    catch (e) { error.textContent = 'cite.inator couldn\'t convert this item: ' + e.message; return; }
    const { selection, proposal, bound, staleBinding } = prepared, d = describeItem(item);
    const site = proposal?.candidates || [];
    // A confirmed binding preselects its work; otherwise a site candidate waits for the writer; a new work is the
    // only choice when there's none. An id collision is never resolved for the writer.
    let use = bound || (site.length ? undefined : proposal?.state === 'id-collision' ? undefined : selection.record.id);
    const parts = [el('h3', { text: `${d.label}: ${d.title}` })];
    if (staleBinding) parts.push(el('p', { class: 'hint', role: 'note', text: `This Zotero item was linked to ${staleBinding} in this browser before, but ${staleBinding} doesn't match it, so that link is ignored.` }));
    if (proposal?.state === 'id-collision') parts.push(el('p', { class: 'di-error', role: 'note', text: `The site already has a different work called ${selection.record.id}. Choose which work this is below.` }));
    if (selection.requiresReview || selection.diagnostics?.length) {
      parts.push(el('div', { class: 'di-z-review', role: 'note' }, [el('p', { text: 'Check before citing: cite.inator flagged this item\'s details.' }),
        el('ul', {}, (selection.diagnostics || []).map(x => el('li', { text: x.message || x.code })))]));
    }
    const choose = el('fieldset', { class: 'di-import-item' }, [el('legend', { text: 'Which work is it?' })]);
    const radio = (value, label, small) => {
      const id = `di-z-use-${value}`;
      const r = el('input', { type: 'radio', name: 'di-z-use', id, value, checked: use === value });
      r.addEventListener('change', () => { use = value; });
      choose.append(el('div', { class: 'di-import-choice' }, [r, el('label', { for: id }, [el('span', { text: label }), small ? el('small', { text: ' · ' + small }) : null])]));
    };
    for (const c of site) {
      const rec = cache.records.find(r => r.id === c.recordId);
      radio(c.recordId, `The site's “${rec?.title || c.title || 'untitled work'}”`, siteEvidence(c, selection.record, rec));
    }
    if (proposal?.state !== 'id-collision') radio(selection.record.id, site.length ? 'Add it as a new work (the site would then have two copies)' : `Add it to the site's works as ${selection.record.id}`);
    parts.push(choose);
    const loc = el('input', { type: 'text', id: 'di-z-loc', autocomplete: 'off', placeholder: 'such as 94, or pp. 4–6' });
    parts.push(el('label', { for: 'di-z-loc', text: 'Page or section (optional)' }), loc);
    const back = el('button', { type: 'button', class: 'di-quiet', text: 'Back to the results' });
    const insert = el('button', { type: 'button', class: 'di-primary', text: 'Insert the citation' });
    parts.push(el('div', { class: 'di-actions' }, [back, insert]));
    body.replaceChildren(...parts);
    back.addEventListener('click', () => drawSearch(conn));
    insert.addEventListener('click', async () => {
      if (!use) { error.textContent = 'Choose which work it is first.'; return; }
      const isNew = use === selection.record.id && !taken.includes(use);
      // The site takes the new work first (onRecords, which may return a promise). Only when it has does anything
      // in the editor change, so a failure leaves the text, the works, and the preview exactly as they were (#54).
      if (isNew && options.onRecords) {
        insert.disabled = true; error.textContent = ''; busy(true, 'Adding the work to the site…');
        try { await options.onRecords([selection.record], null); }
        catch (e) {
          insert.disabled = false; busy(false, '');
          error.textContent = `The site couldn't take this work${e?.message ? ` (${e.message})` : ''}. Nothing was changed; try Insert again.`;
          return;
        }
        busy(false, '');
      }
      if (isNew) editor.addWorks([{ id: use, note: d.label, title: selection.record.title || d.title }], [selection.record]);
      bindings.set(bindingKey(item, scope), use);
      const build = window.DRAFT_CITATION?.build;
      const marker = build ? build([{ work: use, locator: loc.value.trim() }]) : `{cite ${use}${loc.value.trim() ? ` | locator:"${loc.value.trim().replace(/"/g, '\\"')}"` : ''}}`;
      done();
      editor.replace(selStart, selEnd, marker, [marker.length, marker.length]);
      editor.announce(`Cited ${d.label}${isNew ? ', added to the site\'s works' : ''}.`);
    });
    choose.querySelector('input:checked, input')?.focus();
  }

  const c = connection.get();
  if (c) drawSearch(c); else drawConnect();
  dialog.showModal();
  // showModal moves focus to the first control; the search box (or the key) is where to start.
  dialog.querySelector('#di-z-q, #di-z-key')?.focus();
}

export { esc as _esc };
