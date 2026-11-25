// draft-inator check: an article's equations, labels, and cross-references, as the editor sees them
// (src/editor/crossref.js): maths that doesn't parse, {ref …} to a label that doesn't exist, and labels used twice.
import { checkCrossrefs, LABEL } from '../src/editor/crossref.js';

// Code is text, not maths: fenced and inline code in Markdown, and code, pre, script, and style in HTML.
const CODE = /(```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]*`|<(code|pre|script|style)\b[^>]*>[\s\S]*?<\/\2\s*>)/gi;
const FIGURE_LABEL = new RegExp(String.raw`\{figure\b[^}\n]*?\|\s*label:"?(${LABEL})"?`, 'g');

/**
 * @param {string} text  One article.
 * @param {{ katex?: object, macros?: object }} [options]  KaTeX to check the maths parses (vendor/katex/katex.mjs).
 * @returns {object[]} diagnostics: { code, label?, at, message }
 */
export function checkText(text, { katex = null, macros } = {}) {
  const code = [...text.matchAll(CODE)].map(m => [m.index, m.index + m[0].length]);
  const inCode = at => code.some(([a, z]) => at >= a && at < z);
  const figureLabels = [...text.matchAll(FIGURE_LABEL)].filter(m => !inCode(m.index)).map(m => ({ start: m.index, label: m[1] }));
  return checkCrossrefs(text, { inCode, figureLabels, katex, macros });
}
