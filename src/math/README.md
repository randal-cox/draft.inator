# src/math: maths for draft.inator, kept separable

This folder holds the maths draft.inator uses. It has no imports from outside this folder. If a second project needs
it, it can become its own package (formula.inator) by copying the folder (Randal, 26 Nov 2026, #35). A test enforces
this: `test/math.test.js`.

| File | What it does |
| --- | --- |
| `math.js` | Finds `$…$` and `$$…$$ {#eq:name}` in Markdown (`findTeX`). Draws one piece of maths safely (`mathHTML`): MathML only, no trusted commands, and a limit on macro expansion (`SAFE`). Exports the label grammar (`LABEL`). |
| `omml.js` | Word's maths (OMML, also how Google Docs exports equations) to LaTeX. Anything it doesn't know is kept as text and named, never dropped. |

What doesn't belong here:
- **Numbering, `{ref …}`, and figures.** The host numbers equations, figures, and tables together, so there is one
  numbering engine (`src/editor/crossref.js`).
- **The Equation dialog.** It's editor UI (`src/editor/equation.js`).
- **Reading a Word file.** That's the import projection (`src/editor/docx.js`), which calls `omml.js`.

KaTeX is passed in, never imported, so the host chooses its copy and version. draft.inator vendors 0.16.11 in
`vendor/katex/`.
