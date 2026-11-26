// Word's maths (OMML, as Word and Google Docs write it in a .docx) to LaTeX that KaTeX draws.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import katex from '../vendor/katex/katex.mjs';
import { ommlToLatex, tidyLatex } from '../src/editor/omml.js';
import { parseXML } from './xml.js';

const M = 'xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"';
const r = t => `<m:r><m:t>${t}</m:t></m:r>`;
const latex = body => { const unknown = []; const s = tidyLatex(ommlToLatex(parseXML(`<m:oMath ${M}>${body}</m:oMath>`).documentElement, unknown)); return { s, unknown }; };
const parses = s => katex.renderToString(s, { output: 'mathml', throwOnError: true });

test('a fraction of logarithms, with Word\'s italic letters (𝑛, 𝑝) read as plain letters', () => {
  const { s } = latex(`${r('𝑛 ≥ ')}<m:f><m:num>${r('𝑙𝑜𝑔(1−𝐶)')}</m:num><m:den>${r('𝑙𝑜𝑔(1−𝑝)')}</m:den></m:f>`);
  assert.equal(s, 'n \\ge \\frac{\\log(1-C)}{\\log(1-p)}');
  parses(s);
});

test('a sum with limits, a binomial (Word writes it as a bracketed fraction with no bar), and powers', () => {
  const binom = `<m:d><m:e><m:f><m:fPr><m:type m:val="noBar"/></m:fPr><m:num>${r('𝑛')}</m:num><m:den>${r('𝑘')}</m:den></m:f></m:e></m:d>`;
  const body = `${r('C ≥ 1- ')}<m:nary><m:naryPr><m:chr m:val="∑"/></m:naryPr><m:sub>${r('𝑘=0')}</m:sub><m:sup>${r('𝑂−1')}</m:sup><m:e>${binom}<m:sSup><m:e>${r('𝑝')}</m:e><m:sup>${r('𝑘')}</m:sup></m:sSup><m:sSup><m:e><m:d><m:e>${r('1 − 𝑝')}</m:e></m:d></m:e><m:sup>${r('𝑛−𝑘')}</m:sup></m:sSup></m:e></m:nary>`;
  const { s, unknown } = latex(body);
  assert.equal(s, 'C \\ge 1- \\sum_{k=0}^{O-1} \\binom{n}{k}p^{k}{\\left( 1 - p \\right)}^{n-k}');
  assert.deepEqual(unknown, []);
  parses(s);
});

test('roots, subscripts, an exponent with a fraction, and approximately', () => {
  const { s } = latex(`${r('SE(R) ≈ ')}<m:f><m:num><m:rad><m:radPr><m:degHide m:val="1"/></m:radPr><m:deg/><m:e><m:sSub><m:e>${r('𝑓')}</m:e><m:sub>${r('1')}</m:sub></m:sSub></m:e></m:rad></m:num><m:den>${r('𝑚')}</m:den></m:f>`);
  assert.equal(s, 'SE(R) \\approx \\frac{\\sqrt{f_{1}}}{m}');
  parses(s);
  const e = latex(`${r('𝑝≥1 − ')}<m:sSup><m:e>${r('𝑒')}</m:e><m:sup>${r('𝑙𝑛(1−𝐶) / 𝑛')}</m:sup></m:sSup>`).s;
  assert.equal(e, 'p\\ge 1 - e^{\\ln(1-C) / n}');
  parses(e);
});

test('functions, accents, matrices, and an element it doesn\'t know (kept as text, and named)', () => {
  assert.equal(latex(`<m:func><m:fName>${r('ln')}</m:fName><m:e>${r('x')}</m:e></m:func>`).s, '\\ln x');
  assert.equal(latex(`<m:acc><m:accPr><m:chr m:val="&#x0302;"/></m:accPr><m:e>${r('𝑝')}</m:e></m:acc>`).s, '\\hat{p}');
  const mat = latex(`<m:d><m:e><m:m><m:mr><m:e>${r('a')}</m:e><m:e>${r('b')}</m:e></m:mr><m:mr><m:e>${r('c')}</m:e><m:e>${r('d')}</m:e></m:mr></m:m></m:e></m:d>`).s;
  assert.equal(mat, '\\left( \\begin{matrix} a & b \\\\ c & d \\end{matrix} \\right)');
  parses(mat);
  const odd = latex(`${r('x')}<m:mystery>${r('y')}</m:mystery>`);
  assert.equal(odd.s, 'xy'); assert.deepEqual(odd.unknown, ['mystery']);
});
