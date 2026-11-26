// Labels and cross-references in an article's Markdown: draft.inator numbers equations, figures, and tables together,
// and resolves {ref …}. The maths itself (finding and drawing it) is src/math/math.js. Plain JavaScript with no browser
// or Node APIs, so the editor's preview and a site's build number and check things the same way.
//
//   A labelled equation: $$ … $$ {#eq:n}
//   A figure's label:    {figure … | label:fig:depth}
//   A reference:         {ref eq:n}  →  "Eq. 1"            {ref fig:depth}  →  "Figure 2"
//
// Files hold labels, never numbers: numbers come from the order things appear in, each time the page is drawn.
import { LABEL, findTeX, mathHTML, escaped } from '../math/math.js';

export { LABEL, mathHTML };
const REF = new RegExp(String.raw`\{ref (${LABEL})\}`, 'g');

/** How a reference reads, by the label's kind. A site can pass its own. */
export const REF_NAMES = { eq: n => `Eq. ${n}`, fig: n => `Figure ${n}`, tab: n => `Table ${n}` };

/**
 * Maths and references in the text, in order, outside code.
 * @param {string} text
 * @param {(at: number) => boolean} [inCode]  Whether a position is inside code (code is text, not maths).
 * @returns {Array<{ kind: 'math' | 'ref', start: number, end: number, display?: boolean, tex?: string, label?: string|null }>}
 */
export function findMath(text, inCode = () => false) {
  const found = findTeX(text, inCode);
  const taken = (a, b) => found.some(o => a < o.end && b > o.start);
  for (const m of text.matchAll(REF)) {
    if (inCode(m.index) || escaped(text, m.index) || taken(m.index, m.index + m[0].length)) continue;
    found.push({ kind: 'ref', label: m[1], start: m.index, end: m.index + m[0].length });
  }
  return found.sort((x, y) => x.start - y.start);
}

/**
 * Numbers for every label, by kind, in the order the labelled things appear.
 * @param {Array<{ start: number, label?: string|null }>} labelled  Labelled equations and figures (and later tables).
 * @returns {{ numbers: Map<string, number>, diagnostics: object[] }}
 */
export function numberLabels(labelled) {
  const numbers = new Map(), count = {}, diagnostics = [];
  for (const it of [...labelled].sort((x, y) => x.start - y.start)) {
    if (!it.label) continue;
    if (numbers.has(it.label)) { diagnostics.push({ code: 'label-duplicate', label: it.label, at: it.start, message: `The label ${it.label} is used twice.` }); continue; }
    const kind = it.label.split(':')[0];
    numbers.set(it.label, (count[kind] = (count[kind] || 0) + 1));
  }
  return { numbers, diagnostics };
}

/** What a reference reads as, or null when its label doesn't exist. */
export function refText(label, numbers, names = REF_NAMES) {
  if (!numbers.has(label)) return null;
  const kind = label.split(':')[0], n = numbers.get(label);
  return (names[kind] || (k => `${kind} ${k}`))(n);
}

/**
 * Check an article's labels and references without drawing anything: duplicate labels, references to labels that
 * don't exist, and (given KaTeX) maths that doesn't parse. For `draft-inator check` and the editor.
 * @param {string} text
 * @param {{ inCode?: Function, figureLabels?: Array<{ label: string, start: number }>, katex?: object }} [options]
 * @returns {object[]} diagnostics: { code, label?, at, message }
 */
export function checkCrossrefs(text, { inCode, figureLabels = [], katex = null, macros } = {}) {
  const found = findMath(text, inCode);
  const { numbers, diagnostics } = numberLabels([...found.filter(f => f.kind === 'math' && f.label), ...figureLabels]);
  for (const f of found) {
    if (f.kind === 'ref' && !numbers.has(f.label)) diagnostics.push({ code: 'ref-missing', label: f.label, at: f.start, message: `{ref ${f.label}} points to a label that doesn't exist.` });
    if (f.kind === 'math' && katex) {
      const { error } = mathHTML(f, katex, { macros });
      if (error) diagnostics.push({ code: 'math-error', at: f.start, message: `Maths that doesn't parse: ${error}` });
    }
  }
  return diagnostics.sort((x, y) => x.at - y.at);
}
