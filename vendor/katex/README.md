# KaTeX (vendored)

KaTeX renders the LaTeX maths in articles (`$…$` inline, `$$…$$` displayed). draft.inator asks it for MathML
only (`output: 'mathml'`): every current browser draws MathML, screen readers read it, and it needs no fonts, no
stylesheet, and no inline styles, so it suits a strict Content Security Policy.

| | |
|---|---|
| Version | **0.16.11** (npm `katex@0.16.11`) |
| File | `katex.mjs` from the package's `dist/`, unchanged (no imports; loaded only on pages with maths) |
| SHA-256 | `3de582c88577c17a667658525d0387138a02467d822fda25cc00e5886ca496ef` |
| Licence | MIT (`LICENSE`) |

To update: install the new version, copy `dist/katex.mjs` and `LICENSE`, update this table, and run `npm test`.
