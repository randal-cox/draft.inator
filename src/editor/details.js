/* draft.inator: the Details panel. A page's front matter, edited as a form drawn from the site's collection fields
   (Sveltia CMS's field format: name, label, widget, required, hint, pattern, options, multiple, min, max, and, for
   relations, collection, value_field, display_fields). Every change is written with writeFrontMatter, so only the
   keys a writer changes are touched; keys the collection doesn't describe, and values too complex for a form, are
   kept exactly as written. Plain browser JavaScript; the parts without a page also run in Node. */
import { readFrontMatter, writeFrontMatter } from './yaml.js';

// Widgets the panel edits. Anything else (object, code, map, a list of objects, a site's own widget) is kept as is.
const EDITED = new Set(['string', 'text', 'number', 'boolean', 'datetime', 'date', 'select', 'relation', 'list', 'image', 'file']);

/**
 * The fields the panel shows, from a collection's fields: defaults filled in (widget `string`, required true, as in
 * Sveltia), the body left out (it is the text being written), and each marked `edited` or kept as is.
 * @param {Array<object>} fields  A collection's `fields`.
 */
export function panelFields(fields = []) {
  return fields
    .filter(f => f && f.name && !(f.name === 'body' && (!f.widget || f.widget === 'markdown')))
    .map(f => {
      const widget = f.widget || 'string';
      // A list is edited only as a list of plain values: no sub-fields, or a single string sub-field.
      const simpleList = widget === 'list' && !f.fields && !f.types && (!f.field || (f.field.widget || 'string') === 'string');
      return { ...f, widget, label: f.label || (f.name[0].toUpperCase() + f.name.slice(1)).replace(/[_-]+/g, ' '), required: f.required !== false,
        edited: widget !== 'hidden' && EDITED.has(widget) && (widget !== 'list' || simpleList) };
    });
}

// `{{slug}}`, `{{fields.name}}`, or a bare field name, read from an entry ({ slug, ...fields }).
function pick(entry, template) {
  const one = t => { const k = t.trim().replace(/^fields\./, ''); const v = entry[k]; return v == null ? '' : String(v); };
  return /\{\{/.test(template) ? template.replace(/\{\{([^}]+)\}\}/g, (_, t) => one(t)) : one(template);
}

/**
 * The choices for a relation field, from the host's entries for that collection.
 * @param {object} field  A relation field.
 * @param {Record<string, Array<object>>} entries  `window.DRAFT_ENTRIES`: entries by collection name.
 * @returns {Array<{ value: string, label: string }>}
 */
export function relationOptions(field, entries = {}) {
  const list = entries[field.collection] || [];
  const valueField = field.value_field || '{{slug}}';
  const display = [].concat(field.display_fields || [valueField]);
  return list.map(e => ({ value: pick(e, valueField), label: display.map(d => pick(e, d)).filter(Boolean).join(' · ') || pick(e, valueField) }))
    .filter(o => o.value)
    .sort((a, b) => a.label.localeCompare(b.label));
}

const isEmpty = v => v == null || v === '' || (Array.isArray(v) && v.length === 0);

/**
 * What stops a page being saved: required fields left empty, patterns not matched, numbers out of range. Values the
 * panel keeps as is are never judged.
 * @returns {Array<{ name: string, label: string, message: string }>}
 */
export function checkDetails(fields, values) {
  const out = [];
  for (const f of panelFields(fields)) {
    if (!f.edited) continue;
    const v = values[f.name], say = message => out.push({ name: f.name, label: f.label, message });
    if (isEmpty(v)) { if (f.required) say(`${f.label} is required.`); continue; }
    if (f.pattern && typeof v === 'string') {
      const [re, msg] = Array.isArray(f.pattern) ? f.pattern : [f.pattern];
      try { if (!new RegExp(re).test(v)) say(msg || `${f.label} isn't in the expected form.`); } catch { /* a pattern this browser can't read isn't the writer's fault */ }
    }
    if (f.widget === 'number') {
      if (typeof v !== 'number' || Number.isNaN(v)) say(`${f.label} must be a number.`);
      else {
        if (f.value_type === 'int' && !Number.isInteger(v)) say(`${f.label} must be a whole number.`);
        if (f.min != null && v < f.min) say(`${f.label} must be at least ${f.min}.`);
        if (f.max != null && v > f.max) say(`${f.label} must be at most ${f.max}.`);
      }
    }
    if ((f.widget === 'list' || (f.multiple && (f.widget === 'select' || f.widget === 'relation'))) && Array.isArray(v)) {
      if (f.min != null && v.length < f.min) say(`${f.label} needs at least ${f.min}.`);
      if (f.max != null && v.length > f.max) say(`${f.label} takes at most ${f.max}.`);
    }
  }
  return out;
}

/**
 * The change one field makes to the front matter. Clearing a field the page didn't have leaves it out, rather
 * than writing an empty key.
 */
export function applyDetail(frontMatter, name, value, hadKey) {
  return writeFrontMatter(frontMatter, { [name]: isEmpty(value) && !hadKey ? undefined : value });
}

// ---------- The panel (needs a page) ----------

let uid = 0;
function el(tag, attrs = {}, kids = []) {
  const n = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'text') n.textContent = v;
    else if (v === true) n.setAttribute(k, '');
    else if (v !== false && v != null) n.setAttribute(k, v);
  }
  for (const kid of kids) if (kid) n.append(kid);
  return n;
}

const DATE = /^\d{4}-\d{2}-\d{2}$/, DATETIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/;

/**
 * Draw the Details panel into `host`.
 * @param {HTMLElement} host
 * @param {object} options
 * @param {Array<object>} options.fields  The collection's fields.
 * @param {string} options.frontMatter  The page's front matter, delimiters included ('' for none).
 * @param {(frontMatter: string, message?: string) => void} options.change  Called with the new front matter.
 * @param {Record<string, Array<object>>} [options.entries]  Entries for relation fields, by collection.
 * @param {Array<{label, path}>} [options.images]  Images an image field can offer.
 * @returns {{ show(problems: Array<{name, message}>): void, values(): object }}
 */
export function drawDetails(host, { fields, frontMatter, change, entries = {}, images = [] }) {
  let fm = frontMatter;
  const start = readFrontMatter(fm);
  const had = new Set(start.order);
  const values = { ...start.values };
  const shown = panelFields(fields);
  const errors = {};
  host.textContent = '';
  host.classList.add('di-fields');

  const set = (name, value) => {
    values[name] = value;
    fm = applyDetail(fm, name, value, had.has(name));
    if (errors[name]) { errors[name].textContent = ''; errors[name].hidden = true; }
    change(fm);
  };

  for (const f of shown) {
    if (f.widget === 'hidden') continue;
    const id = 'di-d' + (++uid), errId = id + '-err', hintId = id + '-hint';
    const err = errors[f.name] = el('p', { class: 'di-field-error', id: errId, hidden: true });
    const hint = f.hint ? el('p', { class: 'di-hint', id: hintId, text: f.hint }) : null;
    const described = [hint && hintId, errId].filter(Boolean).join(' ');
    const labelText = f.label + (f.required && f.edited ? ' (required)' : '');
    const wrap = el('div', { class: 'di-field', 'data-name': f.name });
    const v = values[f.name];
    const complex = had.has(f.name) && start.editable[f.name] === false;

    if (!f.edited || complex) {
      // Shown so nothing in the page is invisible, but not editable here.
      wrap.append(el('span', { class: 'di-field-label', text: f.label }),
        el('p', { class: 'di-kept', text: had.has(f.name) ? 'Kept as written; edit it in the file.' : 'Not set. This kind of field is edited in the file.' }));
      host.append(wrap); continue;
    }

    let input;
    const label = el('label', { for: id, text: labelText });
    const common = { id, 'aria-describedby': described };
    if (f.widget === 'boolean') {
      input = el('input', { ...common, type: 'checkbox', checked: v === true });
      input.addEventListener('change', () => set(f.name, input.checked));
      wrap.classList.add('di-field-check');
      wrap.append(...[input, el('label', { for: id, text: f.label }), hint, err].filter(Boolean));
      host.append(wrap); continue;
    }
    if ((f.widget === 'select' || f.widget === 'relation') && f.multiple) {
      const options = f.widget === 'relation' ? relationOptions(f, entries) : (f.options || []).map(o => (typeof o === 'object' ? o : { value: String(o), label: String(o) }));
      const chosen = Array.isArray(v) ? v.map(String) : [];
      const box = el('fieldset', { class: 'di-checks', 'aria-describedby': described }, [el('legend', { text: labelText })]);
      let filter = null;
      if (options.length > 8) {
        filter = el('input', { type: 'search', class: 'di-filter', 'aria-label': `Find in ${f.label}`, placeholder: 'Find…' });
        box.append(filter);
      }
      const list = el('div', { class: 'di-check-list' });
      for (const o of options) {
        const cid = 'di-d' + (++uid);
        const c = el('input', { type: 'checkbox', id: cid, value: o.value, checked: chosen.includes(o.value) });
        c.addEventListener('change', () => {
          const i = chosen.indexOf(o.value);
          if (c.checked && i < 0) chosen.push(o.value);
          if (!c.checked && i >= 0) chosen.splice(i, 1);
          set(f.name, chosen.slice());
        });
        list.append(el('label', { for: cid, 'data-text': (o.label + ' ' + o.value).toLowerCase() }, [c, document.createTextNode(' ' + o.label)]));
      }
      if (!options.length) list.append(el('p', { class: 'di-hint', text: f.widget === 'relation' ? `This site has no ${f.collection} yet.` : 'No choices.' }));
      if (filter) filter.addEventListener('input', () => {
        const q = filter.value.trim().toLowerCase();
        for (const l of list.querySelectorAll('label')) l.hidden = !!q && !l.dataset.text.includes(q);
      });
      box.append(list);
      // Values not among the choices (an entry since renamed) are kept, and said, so nothing vanishes unseen.
      const unknown = chosen.filter(x => !options.some(o => o.value === x));
      if (unknown.length) box.append(el('p', { class: 'di-hint', text: 'Also kept, not in the list: ' + unknown.join(', ') }));
      box.append(...[hint, err].filter(Boolean));
      wrap.append(box); host.append(wrap); continue;
    }
    if (f.widget === 'select' || f.widget === 'relation') {
      const options = f.widget === 'relation' ? relationOptions(f, entries) : (f.options || []).map(o => (typeof o === 'object' ? o : { value: String(o), label: String(o) }));
      const cur = v == null ? '' : String(v);
      input = el('select', common);
      input.append(el('option', { value: '', text: f.required ? 'Choose…' : '(none)', selected: !cur }));
      if (cur && !options.some(o => String(o.value) === cur)) input.append(el('option', { value: cur, text: cur + ' (not in the list)', selected: true }));
      for (const o of options) input.append(el('option', { value: o.value, text: o.label, selected: String(o.value) === cur }));
      input.addEventListener('change', () => {
        const o = options.find(x => String(x.value) === input.value);
        set(f.name, o ? o.value : input.value);
      });
    } else if (f.widget === 'text') {
      input = el('textarea', { ...common, rows: 3 });
      input.value = v == null ? '' : String(v);
      input.addEventListener('input', () => set(f.name, input.value));
    } else if (f.widget === 'list') {
      input = el('textarea', { ...common, rows: 3 });
      input.value = Array.isArray(v) ? v.join('\n') : v == null ? '' : String(v);
      label.textContent = labelText + ', one per line';
      input.addEventListener('input', () => set(f.name, input.value.split('\n').map(s => s.trim()).filter(Boolean)));
    } else if (f.widget === 'number') {
      input = el('input', { ...common, type: 'number', step: f.step ?? (f.value_type === 'int' ? 1 : 'any'), min: f.min, max: f.max });
      input.value = v == null ? '' : String(v);
      input.addEventListener('input', () => set(f.name, input.value === '' ? '' : Number(input.value)));
    } else if (f.widget === 'datetime' || f.widget === 'date') {
      const dateOnly = f.widget === 'date' || f.time_format === false;
      const cur = v == null ? '' : String(v);
      // A value in a form the browser's picker can't show stays editable as text.
      const fits = !cur || (dateOnly ? DATE : DATETIME).test(cur);
      input = el('input', { ...common, type: fits ? (dateOnly ? 'date' : 'datetime-local') : 'text' });
      input.value = cur;
      input.addEventListener('input', () => set(f.name, input.value));
    } else {
      // string, image, file: a line of text; image and file suggest the site's images.
      input = el('input', { ...common, type: 'text' });
      input.value = v == null ? '' : String(v);
      if ((f.widget === 'image' || f.widget === 'file') && images.length) {
        const listId = id + '-list';
        input.setAttribute('list', listId);
        host.append(el('datalist', { id: listId }, images.map(i => el('option', { value: i.path, text: i.label }))));
      }
      input.addEventListener('input', () => set(f.name, input.value));
    }
    wrap.append(...[label, input, hint, err].filter(Boolean));
    host.append(wrap);
  }

  const extra = start.order.filter(k => !shown.some(f => f.name === k));
  if (extra.length) host.append(el('p', { class: 'di-hint di-extra', text: 'Also in this page, kept as written: ' + extra.join(', ') }));

  return {
    values: () => ({ ...values }),
    /** Show problems beside their fields; focus the first. */
    show(problems) {
      for (const e of Object.values(errors)) { e.textContent = ''; e.hidden = true; }
      for (const p of problems) {
        const e = errors[p.name];
        if (e) { e.textContent = e.textContent ? e.textContent + ' ' + p.message : p.message; e.hidden = false; }
      }
      const first = problems[0] && host.querySelector(`[data-name="${CSS.escape(problems[0].name)}"] input, [data-name="${CSS.escape(problems[0].name)}"] select, [data-name="${CSS.escape(problems[0].name)}"] textarea`);
      if (first) first.focus();
    }
  };
}
