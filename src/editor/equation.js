/* draft.inator: the Equation dialog. LaTeX on one side, the typeset result beside it as you type (KaTeX, MathML), a
   palette of common pieces so nobody has to remember \begin{pmatrix}, and a label so the equation is numbered and
   can be referred to with {ref eq:…}. It writes plain Markdown maths, never anything else:
     inline     $p \ge 0.10$
     displayed  $$ n \ge \frac{\ln(1-C)}{\ln(1-p)} $$ {#eq:sample-size}
   Loaded only when it's opened. No inline event handlers. */
import { findMath, mathHTML, LABEL } from './crossref.js';

// The palette. "|" marks where the cursor goes; the first empty {} after it is where typing continues.
export const PALETTE = [
  { group: 'Structures', items: [
    ['a/b', String.raw`\frac{|}{}`, 'Fraction'], ['√', String.raw`\sqrt{|}`, 'Square root'], ['xⁿ', '^{|}', 'Superscript'],
    ['xₙ', '_{|}', 'Subscript'], ['∑', String.raw`\sum_{|}^{}`, 'Sum'], ['∏', String.raw`\prod_{|}^{}`, 'Product'],
    ['∫', String.raw`\int_{|}^{}`, 'Integral'], ['lim', String.raw`\lim_{| \to }`, 'Limit'], ['(n k)', String.raw`\binom{|}{}`, 'Binomial'],
    ['( )', String.raw`\left( | \right)`, 'Brackets that grow'], ['[ ]', String.raw`\begin{pmatrix} | & \\ & \end{pmatrix}`, 'Matrix'],
    ['{ cases', String.raw`\begin{cases} | & \text{if } \\ & \text{otherwise} \end{cases}`, 'Cases'],
    ['aligned', String.raw`\begin{aligned} | &= \\ &= \end{aligned}`, 'Lines aligned at ='], ['text', String.raw`\text{|}`, 'Words inside maths']] },
  { group: 'Relations and operators', items: [
    ['≤', String.raw`\le `], ['≥', String.raw`\ge `], ['≠', String.raw`\ne `], ['≈', String.raw`\approx `], ['≡', String.raw`\equiv `],
    ['∝', String.raw`\propto `], ['±', String.raw`\pm `], ['×', String.raw`\times `], ['·', String.raw`\cdot `], ['÷', String.raw`\div `],
    ['∞', String.raw`\infty `], ['→', String.raw`\to `], ['⇒', String.raw`\Rightarrow `], ['∈', String.raw`\in `], ['∂', String.raw`\partial `],
    ['∇', String.raw`\nabla `], ['…', String.raw`\ldots `], ['ln', String.raw`\ln `], ['log', String.raw`\log `], ['exp', String.raw`\exp `]] },
  { group: 'Greek', items: [
    ['α', String.raw`\alpha `], ['β', String.raw`\beta `], ['γ', String.raw`\gamma `], ['δ', String.raw`\delta `], ['ε', String.raw`\varepsilon `],
    ['θ', String.raw`\theta `], ['λ', String.raw`\lambda `], ['μ', String.raw`\mu `], ['π', String.raw`\pi `], ['ρ', String.raw`\rho `],
    ['σ', String.raw`\sigma `], ['τ', String.raw`\tau `], ['φ', String.raw`\varphi `], ['χ', String.raw`\chi `], ['ω', String.raw`\omega `],
    ['Γ', String.raw`\Gamma `], ['Δ', String.raw`\Delta `], ['Σ', String.raw`\Sigma `], ['Φ', String.raw`\Phi `], ['Ω', String.raw`\Omega `]] }
];

/**
 * Insert a palette snippet into LaTeX at a selection: any selected text goes where "|" is; the caret ends there (or
 * after the selected text). Pure, for the tests.
 * @returns {{ text: string, caret: number }}
 */
export function insertSnippet(tex, start, end, snippet) {
  const selected = tex.slice(start, end), at = snippet.indexOf('|');
  const filled = at < 0 ? snippet + selected : snippet.slice(0, at) + selected + snippet.slice(at + 1);
  const caret = start + (at < 0 ? filled.length : at + selected.length);
  return { text: tex.slice(0, start) + filled + tex.slice(end), caret };
}

/** The Markdown an equation is written as. */
export function writeEquation({ tex, display, name }) {
  tex = tex.trim();
  if (!display) return `$${tex}$`;
  return `$$ ${tex} $$` + (name ? ` {#eq:${name}}` : '');
}

/**
 * Open the dialog: to insert at the caret, or to edit the maths the caret is in.
 * @param {object} editor  The editor's bridge: { el, root, getText, getSelection, replace, announce, focus }.
 * @param {{ katex: object, macros?: object }} math
 */
export function openEquation(editor, math) {
  const { el } = editor;
  const text = editor.getText(), [selStart, selEnd] = editor.getSelection();
  const existing = findMath(text).find(m => m.kind === 'math' && selStart >= m.start && selStart <= m.end) || null;
  const taken = new Set(findMath(text).filter(m => m.label && m !== existing).map(m => m.label));
  const opener = document.activeElement;

  const state = existing
    ? { tex: existing.tex, display: existing.display, name: existing.label ? existing.label.replace(/^eq:/, '') : '' }
    : { tex: selStart !== selEnd ? text.slice(selStart, selEnd).replace(/^\$+|\$+$/g, '').trim() : '', display: true, name: '' };

  const title = el('h2', { text: existing ? 'Edit equation' : 'Insert an equation', tabindex: '-1' });
  const texArea = el('textarea', { class: 'di-eq-tex', rows: '4', spellcheck: 'false', 'aria-label': 'The equation, in LaTeX', placeholder: String.raw`n \ge \frac{\ln(1-C)}{\ln(1-p)}` });
  texArea.value = state.tex;
  const shown = el('div', { class: 'di-eq-shown di-article', 'aria-live': 'polite', 'aria-label': 'How it reads' });
  const problem = el('p', { class: 'di-error', role: 'alert' });

  const radio = (value, label) => {
    const id = `di-eq-${value}`;
    const r = el('input', { type: 'radio', name: 'di-eq-display', id, value, checked: String(state.display) === value });
    r.addEventListener('change', () => { state.display = value === 'true'; draw(); });
    return el('div', { class: 'di-import-choice' }, [r, el('label', { for: id, text: label })]);
  };
  const how = el('fieldset', { class: 'di-import-item' }, [el('legend', { text: 'Where it goes' }),
    radio('true', 'On a line of its own (can be numbered)'), radio('false', 'Inside the sentence')]);

  const nameInput = el('input', { type: 'text', id: 'di-eq-name', value: state.name, spellcheck: 'false', autocomplete: 'off',
    'aria-describedby': 'di-eq-name-hint' });
  const nameRow = el('div', { class: 'di-eq-name' }, [
    el('label', { for: 'di-eq-name', text: 'Label, to number it and refer to it' }),
    el('div', { class: 'di-eq-label' }, [el('span', { text: 'eq:', 'aria-hidden': 'true' }), nameInput]),
    el('p', { class: 'hint', id: 'di-eq-name-hint', text: 'Such as sample-size. Leave empty for an unnumbered equation. Refer to it as {ref eq:sample-size}.' })]);

  const palette = el('div', { class: 'di-eq-palette' }, PALETTE.map(g => el('div', { role: 'group', 'aria-label': g.group }, [
    el('h3', { text: g.group }),
    el('div', { class: 'di-eq-keys' }, g.items.map(([face, snippet, name]) => el('button', { type: 'button', class: 'di-quiet', 'data-snippet': snippet,
      title: (name ? name + ': ' : '') + snippet.replace('|', ''), 'aria-label': name || snippet.trim(), text: face })))])));
  palette.addEventListener('click', e => {
    const b = e.target.closest('button[data-snippet]'); if (!b) return;
    const r = insertSnippet(texArea.value, texArea.selectionStart, texArea.selectionEnd, b.dataset.snippet);
    texArea.value = r.text; texArea.focus(); texArea.setSelectionRange(r.caret, r.caret); draw();
  });

  const out = el('code', { class: 'di-code' });
  const cancel = el('button', { type: 'button', class: 'di-quiet', text: 'Cancel' });
  const save = el('button', { type: 'submit', class: 'di-primary', text: existing ? 'Save' : 'Insert' });
  const form = el('form', { method: 'dialog', class: 'di-eq-form' }, [title,
    el('div', { class: 'di-eq-sides' }, [el('div', {}, [el('label', { for: 'di-eq-tex-area', text: 'LaTeX' }), texArea]), el('div', {}, [el('span', { class: 'di-eq-caption', text: 'How it reads' }), shown])]),
    problem, palette, how, nameRow, el('h3', { text: 'What it writes' }), out, el('div', { class: 'di-actions' }, [cancel, save])]);
  texArea.id = 'di-eq-tex-area';
  const dialog = el('dialog', { class: 'di-dialog di-equation-dialog', 'aria-labelledby': 'di-eq-title' }, [form]);
  title.id = 'di-eq-title';
  editor.root.append(dialog);

  function check() {
    const name = nameInput.value.trim();
    if (!texArea.value.trim()) return 'Write the equation first.';
    if (state.display && name && !new RegExp(`^${LABEL}$`).test('eq:' + name)) return 'A label uses lowercase letters, digits, and hyphens, such as sample-size.';
    if (state.display && name && taken.has('eq:' + name)) return `eq:${name} is already used in this article. Choose another label.`;
    return '';
  }
  function draw() {
    state.tex = texArea.value; state.name = nameInput.value.trim();
    nameRow.hidden = !state.display;
    const r = mathHTML({ tex: state.tex || ' ', display: state.display, label: null }, math.katex, { macros: math.macros });
    shown.innerHTML = state.tex.trim() ? r.html : '';
    problem.textContent = state.tex.trim() && r.error ? 'Not yet valid LaTeX: ' + r.error : '';
    out.textContent = writeEquation({ ...state, name: state.display ? state.name : '' });
  }
  texArea.addEventListener('input', draw);
  nameInput.addEventListener('input', draw);

  const close = () => { dialog.close(); dialog.remove(); if (opener?.isConnected) opener.focus(); else editor.focus(); };
  cancel.addEventListener('click', close);
  dialog.addEventListener('cancel', e => { e.preventDefault(); close(); });
  form.addEventListener('submit', e => {
    e.preventDefault();
    const p = check(); if (p) { problem.textContent = p; return; }
    let md = writeEquation({ ...state, name: state.display ? state.name : '' });
    const now = editor.getText();
    if (existing) {
      if (now.slice(existing.start, existing.end) !== text.slice(existing.start, existing.end)) { problem.textContent = 'The article changed while this was open. Cancel and try again.'; return; }
      dialog.close(); dialog.remove();
      editor.replace(existing.start, existing.end, md, [md.length, md.length]);
    } else {
      // A displayed equation is a paragraph of its own.
      if (state.display) {
        const before = now.slice(0, selStart), after = now.slice(selEnd);
        md = (before && !/\n\n$/.test(before) ? (/\n$/.test(before) ? '\n' : '\n\n') : '') + md + (after && !/^\n\n/.test(after) ? (/^\n/.test(after) ? '\n' : '\n\n') : '');
      }
      dialog.close(); dialog.remove();
      editor.replace(selStart, selEnd, md, [md.length, md.length]);
    }
    editor.announce(`Equation ${existing ? 'saved' : 'inserted'}${state.display && state.name ? `, labelled eq:${state.name}` : ''}.`);
  });

  draw();
  dialog.showModal();
  texArea.focus();
}
