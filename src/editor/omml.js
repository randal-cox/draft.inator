// Word's maths (Office Math Markup, OMML: <m:oMath> in a .docx, which is also how Google Docs exports its equations)
// to LaTeX, for draft.inator's $…$ and $$…$$. Plain JavaScript over a DOM-like tree (the browser's DOMParser, or any
// object with the same small surface), so it runs in the editor and in the tests. What it doesn't know it keeps as
// text, and says so: nothing is dropped silently.

// Characters Word writes as themselves, and the LaTeX for them.
const SYMBOLS = {
  '≤': '\\le ', '≥': '\\ge ', '≠': '\\ne ', '≈': '\\approx ', '≡': '\\equiv ', '∝': '\\propto ', '±': '\\pm ', '∓': '\\mp ',
  '×': '\\times ', '·': '\\cdot ', '⋅': '\\cdot ', '÷': '\\div ', '∞': '\\infty ', '→': '\\to ', '←': '\\leftarrow ', '⇒': '\\Rightarrow ',
  '⇔': '\\Leftrightarrow ', '∈': '\\in ', '∉': '\\notin ', '⊂': '\\subset ', '⊆': '\\subseteq ', '∪': '\\cup ', '∩': '\\cap ',
  '∂': '\\partial ', '∇': '\\nabla ', '…': '\\ldots ', '⋯': '\\cdots ', '∀': '\\forall ', '∃': '\\exists ', '¬': '\\neg ',
  '∧': '\\wedge ', '∨': '\\vee ', '∘': '\\circ ', '°': '^\\circ ', '′': "'", '−': '-', '∗': '*', '∼': '\\sim ', '≅': '\\cong ',
  'α': '\\alpha ', 'β': '\\beta ', 'γ': '\\gamma ', 'δ': '\\delta ', 'ε': '\\varepsilon ', 'ϵ': '\\epsilon ', 'ζ': '\\zeta ',
  'η': '\\eta ', 'θ': '\\theta ', 'ϑ': '\\vartheta ', 'ι': '\\iota ', 'κ': '\\kappa ', 'λ': '\\lambda ', 'μ': '\\mu ', 'ν': '\\nu ',
  'ξ': '\\xi ', 'π': '\\pi ', 'ρ': '\\rho ', 'σ': '\\sigma ', 'τ': '\\tau ', 'υ': '\\upsilon ', 'φ': '\\varphi ', 'ϕ': '\\phi ',
  'χ': '\\chi ', 'ψ': '\\psi ', 'ω': '\\omega ', 'Γ': '\\Gamma ', 'Δ': '\\Delta ', 'Θ': '\\Theta ', 'Λ': '\\Lambda ', 'Ξ': '\\Xi ',
  'Π': '\\Pi ', 'Σ': '\\Sigma ', 'Υ': '\\Upsilon ', 'Φ': '\\Phi ', 'Ψ': '\\Psi ', 'Ω': '\\Omega ',
  '{': '\\{', '}': '\\}', '%': '\\%', '#': '\\#', '&': '\\&', '_': '\\_', '$': '\\$'
};
// Word's "math italic" letters (𝑛, 𝑝, as Google Docs writes them) are ordinary letters to LaTeX.
const MATH_ALPHA = [[0x1D434, 'A'], [0x1D44E, 'a']];   // italic capitals and smalls (h is U+210E)
function plainLetter(ch) {
  const c = ch.codePointAt(0);
  if (c === 0x210E) return 'h';
  for (const [start, base] of MATH_ALPHA) if (c >= start && c < start + 26) return String.fromCharCode(base.charCodeAt(0) + c - start);
  return null;
}
const NARY = { '∑': '\\sum', '∏': '\\prod', '∐': '\\coprod', '∫': '\\int', '∬': '\\iint', '∭': '\\iiint', '∮': '\\oint', '⋃': '\\bigcup', '⋂': '\\bigcap' };
const FUNCS = ['sin', 'cos', 'tan', 'cot', 'sec', 'csc', 'arcsin', 'arccos', 'arctan', 'sinh', 'cosh', 'tanh', 'log', 'ln', 'lg', 'exp', 'lim', 'max', 'min', 'sup', 'inf', 'det', 'dim', 'gcd', 'Pr', 'arg', 'deg'];
const ACCENTS = { '̂': '\\hat', '̃': '\\tilde', '̄': '\\bar', '̅': '\\overline', '̇': '\\dot', '̈': '\\ddot', '⃗': '\\vec', 'ˆ': '\\hat', '~': '\\tilde' };
const DELIMS = { '(': '(', ')': ')', '[': '[', ']': ']', '{': '\\{', '}': '\\}', '|': '|', '‖': '\\|', '⟨': '\\langle', '⟩': '\\rangle', '⌈': '\\lceil', '⌉': '\\rceil', '⌊': '\\lfloor', '⌋': '\\rfloor', '': '.' };

const local = n => (n.localName || n.nodeName || '').replace(/^.*:/, '');
const kids = n => [...(n.childNodes || [])].filter(c => c.nodeType === 1);
const kid = (n, name) => kids(n).find(c => local(c) === name);
const attr = (n, name) => {
  if (!n) return null;
  for (const a of n.attributes || []) if ((a.localName || a.name).replace(/^.*:/, '') === name) return a.value;
  return null;
};
const prop = (n, pr, name) => { const p = kid(n, pr); const e = p && kid(p, name); return e ? (attr(e, 'val') ?? '') : null; };

function text(s) {
  let out = '';
  for (const ch of s) {
    const plain = plainLetter(ch);
    out += plain ?? SYMBOLS[ch] ?? ch;
  }
  return out;
}
const group = s => (s.length === 1 || /^\\[a-zA-Z]+ ?$/.test(s) ? s.trim() : `{${s.trim()}}`);

/**
 * One OMML element (and its children) as LaTeX.
 * @param {Element} n
 * @param {string[]} [unknown]  Collects the names of elements it didn't know (kept as their text).
 */
export function ommlToLatex(n, unknown = []) {
  const all = c => kids(c).map(k => ommlToLatex(k, unknown)).join('');
  const arg = name => { const e = kid(n, name); return e ? all(e) : ''; };
  switch (local(n)) {
    case 'oMathPara': return kids(n).filter(k => local(k) === 'oMath').map(k => ommlToLatex(k, unknown)).join(' \\\\ ');
    case 'oMath': case 'e': case 'num': case 'den': case 'sub': case 'sup': case 'deg': case 'lim': case 'fName':
      return all(n);
    case 'r': {
      const t = kids(n).filter(k => local(k) === 't').map(k => k.textContent).join('');
      const normal = prop(n, 'rPr', 'nor') !== null;
      if (normal && /[A-Za-z]{2,}/.test(t)) return `\\text{${t}}`;
      // Function names typed as letters (Google Docs writes "log" as italic l, o, g) read as \log.
      return text(t).replace(new RegExp(`(?<![\\\\a-zA-Z])(${FUNCS.join('|')})(?![a-zA-Z])`, 'g'), '\\$1 ');
    }
    case 'f': {
      const type = prop(n, 'fPr', 'type');
      const num = arg('num'), den = arg('den');
      return type === 'lin' ? `${group(num)}/${group(den)}` : type === 'noBar' ? `\\genfrac{}{}{0pt}{}{${num}}{${den}}` : `\\frac{${num}}{${den}}`;
    }
    case 'sSup': return `${group(arg('e'))}^{${arg('sup')}}`;
    case 'sSub': return `${group(arg('e'))}_{${arg('sub')}}`;
    case 'sSubSup': return `${group(arg('e'))}_{${arg('sub')}}^{${arg('sup')}}`;
    case 'sPre': return `{}_{${arg('sub')}}^{${arg('sup')}}${group(arg('e'))}`;
    case 'rad': {
      const deg = arg('deg'), hide = prop(n, 'radPr', 'degHide');
      return deg && hide !== '1' && hide !== 'on' ? `\\sqrt[${deg}]{${arg('e')}}` : `\\sqrt{${arg('e')}}`;
    }
    case 'nary': {
      const chr = prop(n, 'naryPr', 'chr') ?? '∫';
      const op = NARY[chr] || text(chr);
      const sub = arg('sub'), sup = arg('sup');
      return `${op}${sub ? `_{${sub}}` : ''}${sup ? `^{${sup}}` : ''} ${arg('e')}`;
    }
    case 'd': {
      const beg = prop(n, 'dPr', 'begChr'), end = prop(n, 'dPr', 'endChr'), sep = prop(n, 'dPr', 'sepChr') ?? '|';
      const parts = kids(n).filter(k => local(k) === 'e').map(k => ommlToLatex(k, unknown));
      const l = DELIMS[beg ?? '('] ?? text(beg), r = DELIMS[end ?? ')'] ?? text(end);
      const inside = parts.join(sep === '|' ? ' \\mid ' : text(sep));
      // A binomial Word writes as a bracketed "no bar" fraction reads better as \binom.
      const lone = kids(n).filter(k => local(k) === 'e');
      if ((beg ?? '(') === '(' && (end ?? ')') === ')' && lone.length === 1) {
        const f = kids(lone[0]).length === 1 && local(kids(lone[0])[0]) === 'f' ? kids(lone[0])[0] : null;
        if (f && prop(f, 'fPr', 'type') === 'noBar') return `\\binom{${ommlToLatex(kid(f, 'num'), unknown)}}{${ommlToLatex(kid(f, 'den'), unknown)}}`;
      }
      return `\\left${l} ${inside} \\right${r}`;
    }
    case 'func': return `${arg('fName').trim()} ${group(arg('e'))}`.replace(/\\([a-z]+) \{/, '\\$1{');
    case 'acc': {
      const chr = prop(n, 'accPr', 'chr') ?? '̂';
      return `${ACCENTS[chr] || '\\hat'}{${arg('e')}}`;
    }
    case 'bar': return prop(n, 'barPr', 'pos') === 'bot' ? `\\underline{${arg('e')}}` : `\\overline{${arg('e')}}`;
    case 'limLow': return `${arg('e').trim()}_{${arg('lim')}}`;
    case 'limUpp': return `${arg('e').trim()}^{${arg('lim')}}`;
    case 'groupChr': {
      const chr = prop(n, 'groupChrPr', 'chr') ?? '⏟', top = prop(n, 'groupChrPr', 'pos') === 'top';
      return chr === '⏞' || top ? `\\overbrace{${arg('e')}}` : `\\underbrace{${arg('e')}}`;
    }
    case 'box': case 'borderBox': case 'phant': return arg('e');
    case 'm': {
      const rows = kids(n).filter(k => local(k) === 'mr').map(r => kids(r).filter(k => local(k) === 'e').map(e => ommlToLatex(e, unknown)).join(' & '));
      return `\\begin{matrix} ${rows.join(' \\\\ ')} \\end{matrix}`;
    }
    case 'eqArr': return `\\begin{aligned} ${kids(n).filter(k => local(k) === 'e').map(e => ommlToLatex(e, unknown).replace(/&/, '&')).join(' \\\\ ')} \\end{aligned}`;
    case 'ctrlPr': case 'rPr': case 'fPr': case 'naryPr': case 'dPr': case 'radPr': case 'sSupPr': case 'sSubPr': case 'sSubSupPr':
    case 'accPr': case 'barPr': case 'funcPr': case 'limLowPr': case 'limUppPr': case 'mPr': case 'eqArrPr': case 'boxPr':
    case 'groupChrPr': case 'sPrePr': case 'oMathParaPr': case 'argPr': case 'mrPr': return '';
    default:
      if (!/^(bookmarkStart|bookmarkEnd|proofErr|del|ins)$/.test(local(n))) unknown.push(local(n));
      return text(n.textContent || '');
  }
}

/** Tidy LaTeX: no doubled spaces, none before a closing brace or after an opening one. */
export function tidyLatex(s) {
  return s.replace(/\s+/g, ' ').replace(/\{ /g, '{').replace(/ \}/g, '}').replace(/ ([\^_])/g, '$1').replace(/(\\[a-zA-Z]+) \(/g, '$1(').trim();
}
