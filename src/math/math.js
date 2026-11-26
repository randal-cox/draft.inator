// Maths in Markdown, for draft.inator and any host: finding $…$ and $$…$$ (with an optional {#eq:name} label), and
// drawing it safely. Plain JavaScript with no browser or Node APIs, and no imports from outside src/math/, so this
// folder can become its own package (formula.inator) when a second project needs it (Randal, 26 Nov 2026, #35).
//
//   Inline maths:     $p \ge 0.10$                     (Pandoc's rule: a $ opens only before a non-space, closes only
//                                                       after a non-space and not before a digit, so "$5 and $10" is prose)
//   Displayed maths:  $$ n \ge \frac{a}{b} $$ {#eq:n}   (a label is optional)
//
// This module reports maths and its labels; it doesn't number anything. Numbering and {ref …} belong to the host,
// which numbers equations, figures, and tables together (draft.inator: src/editor/crossref.js).

/** A label: kind:name, such as eq:sample-size or fig:depth. */
export const LABEL = '[a-z][a-z0-9]*:[a-z0-9][a-z0-9_-]*';
const DISPLAY = new RegExp(String.raw`\$\$([\s\S]+?)\$\$[ \t]*(?:\{#(${LABEL})\})?`, 'g');
const INLINE = /\$(?![\s$])((?:[^$\n\\]|\\[^\n])+?)(?<![\s\\])\$(?!\d)/g;

export const escaped = (text, at) => { let n = 0; while (at - n - 1 >= 0 && text[at - n - 1] === '\\') n++; return n % 2 === 1; };

/**
 * The maths in a text, in order, outside code.
 * @param {string} text
 * @param {(at: number) => boolean} [inCode]  Whether a position is inside code (code is text, not maths).
 * @returns {Array<{ kind: 'math', start: number, end: number, display: boolean, tex: string, label: string|null }>}
 */
export function findTeX(text, inCode = () => false) {
  const found = [];
  const taken = (a, b) => found.some(o => a < o.end && b > o.start);
  for (const m of text.matchAll(DISPLAY)) {
    if (inCode(m.index) || escaped(text, m.index) || /\n[ \t]*\n/.test(m[1])) continue;
    found.push({ kind: 'math', display: true, tex: m[1].trim(), label: m[2] || null, start: m.index, end: m.index + m[0].length });
  }
  for (const m of text.matchAll(INLINE)) {
    const end = m.index + m[0].length;
    if (inCode(m.index) || escaped(text, m.index) || taken(m.index, end) || text[m.index - 1] === '$') continue;
    found.push({ kind: 'math', display: false, tex: m[1], label: null, start: m.index, end });
  }
  return found.sort((x, y) => x.start - y.start);
}

// Safe by default: MathML only (no inline styles, so a strict security policy is fine), no \\href, \\url, \\html…
// or other trusted commands, and a limit on macro expansion.
export const SAFE = Object.freeze({ output: 'mathml', throwOnError: true, trust: false, strict: 'ignore', maxExpand: 1000, maxSize: 50 });

const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/**
 * One piece of maths as HTML: MathML from KaTeX, or the source marked as an error, with the error's message.
 * @param {{ tex: string, display: boolean, label?: string|null }} m
 * @param {object} katex  KaTeX (draft.inator vendors it: vendor/katex/katex.mjs), or null to show the source.
 * @param {{ number?: number, macros?: object }} [options]
 * @returns {{ html: string, error: string|null }}
 */
export function mathHTML(m, katex, { number, macros } = {}) {
  let body, error = null;
  if (katex) {
    try { body = katex.renderToString(m.tex, { ...SAFE, displayMode: m.display, macros: { ...(macros || {}) } }); }
    catch (e) { error = String(e.message || e).replace(/^KaTeX parse error: /, ''); }
  }
  if (!body) body = `<code class="di-math-source${error ? ' di-math-error' : ''}"${error ? ` title="${esc(error)}"` : ''}>${esc(m.display ? `$$${m.tex}$$` : `$${m.tex}$`)}</code>`;
  if (!m.display) return { html: `<span class="di-math">${body}</span>`, error };
  const id = m.label ? ` id="${esc(m.label)}"` : '';
  const num = number ? `<span class="di-eq-number">(${number})</span>` : '';
  const err = error ? `<p class="di-math-message" role="note">This equation has a mistake: ${esc(error)}</p>` : '';
  return { html: `<div class="di-equation"${id}>${body}${num}</div>${err}`, error };
}

