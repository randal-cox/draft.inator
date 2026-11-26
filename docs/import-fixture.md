# The combined import fixture

A specification for one synthetic Word document that exercises citations, equations, figures, and cross-references
in a single import, agreed between draft.inator and cite.inator on
[#35](https://github.com/randal-cox/draft.inator/issues/35). It is written before any code so both projects can check
it. Nothing in it comes from a private manuscript.

Draft owns this fixture, the projection, numbering, figures, and the single transaction. cite.inator owns citation
recognition, the opaque-range input, and the review classifier.

## The contract it tests

- **Projection.** Draft turns the .docx into one Markdown string, plus `regions` and a `revision`:
  - `regions: [{ kind, start, end, original? }]`, where `kind` is `math`, `figure`, `caption`, or `code`;
  - offsets are zero-based UTF-16 code units, end-exclusive, over that exact string, never positions in the .docx;
  - regions may nest (a caption holding maths);
  - `revision` is a hash of the exact string, and any change to the string invalidates every result.
- **Analysers** each get `(text, regions, revision)` and return `{ revision, edits, records, diagnostics }`:
  - `edits: [{ start, end, replacement, owner }]`;
  - an analyser never writes the text.
- **cite** takes `opaque: [{ start, end }]`, the `math` and `code` regions:
  - it validates them whole: integers within bounds, sorted, non-overlapping; it refuses bad input, never clamping or
    guessing;
  - a recognition span that intersects an opaque range is not proposed.
  - Captions and prose stay eligible.
- **The host:**
  - refuses a result whose revision isn't current;
  - refuses overlapping edits and shows both;
  - applies disjoint edits against their common original revision, from the end;
  - makes one replace, so one Undo.

## The document

Built in the test from XML strings, the way `test/docx.test.js` already builds one, with one image part
(`word/media/image1.png`, a 1×1 PNG). In reading order:

1. **Title:** `Saturation in small interview studies`
2. **Authors:** `A. Rivera`, superscript `1`, `, B. Okafor`, superscript `2` (`w:vertAlign w:val="superscript"`)
3. **Affiliations:** superscript `1` + ` Example University; `, then superscript `2` + ` Sample Institute`
4. **Prose with inline maths and citations:** `Earlier work (Bell, 1992) set a rule: stop when ` + maths `n` +
   ` interviews show nothing new, for ` + maths `p ≥ 0.10` + ` (Turner, 1969, p. 12).`
5. **A displayed, numbered equation, Google Docs style:** a tab, maths `n ≥ ln(1−C) / ln(1−p)` (a real `m:f`
   fraction), a tab, `(Eq 1)`
6. **A reference to it:** `As Eq. 1 shows, the number grows slowly.`
7. **A deliberate overlap:** `This is the usual bound (Eq. 1; Bell, 1992).`
8. **Maths that looks like a citation:** `The pair ` + maths `(Mason, 2010)` + ` is a coordinate, not a source.`
9. **A figure:** an image paragraph (`w:drawing` pointing at `image1.png`, with `wp:docPr descr=""`, so no alt text)
10. **Its caption** (style `Caption`): `Figure 1. Sample size against ` + maths `p` + ` (Guest et al., 2006).`
11. **A reference to the figure:** `Figure 1 shows the curve.`
12. **Heading** `References`, then four entries:
    - `Bell, C. (1992). Ritual theory, ritual practice. Oxford University Press.`
    - `Guest, G., Bunce, A., & Johnson, L. (2006). How many interviews are enough? Field Methods, 18(1), 59–82. https://doi.org/10.1177/1525822X05279903`
    - `Mason, M. (2010). Sample size and saturation in PhD studies. Forum: Qualitative Social Research, 11(3).`
    - `Turner, V. (1969). The ritual process. Aldine.`

Mason 2010 is listed but cited only inside maths (paragraph 8), so it must end up unused, not cited.

## The expected projection

The Markdown string exactly, a trailing newline included:

```markdown
# Saturation in small interview studies

A. Rivera<sup>1</sup>, B. Okafor<sup>2</sup>

<sup>1</sup> Example University; <sup>2</sup> Sample Institute

Earlier work (Bell, 1992) set a rule: stop when $n$ interviews show nothing new, for $p \ge 0.10$ (Turner, 1969, p. 12).

$$ n \ge \frac{\ln(1-C)}{\ln(1-p)} $$ {#eq:1}

As Eq. 1 shows, the number grows slowly.

This is the usual bound (Eq. 1; Bell, 1992).

The pair $(Mason, 2010)$ is a coordinate, not a source.

{figure media/image1.png | alt:"" | label:fig:1 | caption:"Sample size against $p$ (Guest et al., 2006)."}

Figure 1 shows the curve.

## References

Bell, C. (1992). …
(the four entries, one paragraph each, as written above)
```

**Regions** (the test computes the offsets; listed here by their text):
- `math`: each `$…$` and the `$$…$$`, including the one in the figure caption. The caption's maths nests inside the
  caption region.
- `figure`: the whole `{figure …}` line.
- `caption`: the caption's value inside the quotes.
- There is no `code` region in this document. A second, smaller fixture checks code (a fenced block holding
  `(Bell, 1992)`).

**Projection notes**, which draft reports and never applies silently:
- `equation number 1 became the label eq:1`;
- `figure 1 has no alt text`;
- `the figure's caption number "Figure 1." became the label fig:1`.

## The expected proposals

All three analysers run on the same revision.

**cite** (citation recognition, with the `math` regions opaque):
- `(Bell, 1992)` in paragraph 4 becomes a citation of Bell 1992.
- `(Turner, 1969, p. 12)` becomes Turner 1969 with `locator:"p. 12"`.
- `(Guest et al., 2006)` inside the caption becomes Guest 2006. It is eligible because the caption isn't opaque.
- `(Mason, 2010)` inside `$…$` is **not** proposed. It's opaque.
- Paragraph 7 is the overlap case, described below.
- The reference list becomes `{cite endnote}`. Mason 2010 is reported as unused.
- `records`: Bell, Guest (with its DOI), and Turner.

**References** (draft, owner `ref`):
- `Eq. 1` in paragraph 6 becomes `{ref eq:1}`.
- `Figure 1` in paragraph 11 becomes `{ref fig:1}`.
- `Eq. 1` in paragraph 7 is proposed too.

**The overlap.** In paragraph 7, cite is expected to propose the whole parenthesis `(Eq. 1; Bell, 1992)`, with
`Eq. 1` kept as a prefix or left as text (cite.inator to confirm which), while `ref` proposes `Eq. 1` inside it. The host must refuse both and show them side by side, with a choice:
- "citation only", or
- "reference, then citation": `({ref eq:1}; {cite bell-1992-ritual})`.

Nothing in that paragraph changes until the writer chooses.

**Figure** (draft): the alt text is needed, a Needs your attention item that blocks Apply until the writer writes it
or marks the image decorative. Nothing is guessed.

## What happens to staged state

Staged state here means the text, the new citation records (`onRecords`), and the figure's image (the site's media
folder). Equation labels live in the text, so they need no records.

| Moment | Text | Records | Image |
| --- | --- | --- | --- |
| **Cancel** before Apply | unchanged | none staged | none staged |
| **Stale Apply** (the article changed since the projection) | unchanged | none staged | none staged |
| **Staging fails** (`onRecords` or the image upload throws or rejects) | unchanged | the host rolls back its partial staging | the host rolls back its partial staging |
| **Apply succeeds** | one replace, one Undo step | staged | staged |
| **Undo** after Apply | back to before, in one step | still staged | still staged |
| **Save** after Undo | as shown | not saved: nothing in the text refers to them | not saved: nothing in the text refers to it |
| **Redo**, then Save | the import again | saved | saved |

Text Undo and full rollback are **separate claims**, tested separately. Undo only moves the text; the save rule keeps
the page honest.

## The smallest host change

One addition to the data contract (`docs/data-contract.md`), so Undo needs no hooks into the host:

> **At save, a host keeps only the staged records and media that the saved text refers to.** Staged items nothing
> refers to are dropped, and the save says so ("2 unused works not saved").

KR's staging already works this way for citation records. Media is new. Staging that fails must leave nothing behind,
as `onRecords` already must since #54.

## What this fixture needs before it can pass

| Piece | Owner | Today |
| --- | --- | --- |
| Superscript and subscript as `<sup>` / `<sub>` | draft (`docx.js`) | flattened |
| Images and captions as a `{figure}` marker with a label | draft (`docx.js`) | counted, not imported |
| A caption that can hold a citation | draft (Figure block) | **can't**: the marker's pattern forbids `{` and `}` inside it, so `{cite …}` or `\frac{}{}` can't go in a caption. This needs a decision (Randal) |
| `Eq. 1` → `{ref eq:1}` as a proposed edit | draft | only a suggestion in the import notes |
| Regions and a revision from the projection | draft | not yet |
| Opaque ranges | cite | not yet |
| Refusing overlaps and showing them as a choice | draft (review UI) | not yet |
| The save rule for unreferenced staged items | the host (contract) | records only |

Two decisions are for Randal:
- **Superscript as `<sup>`**, not Pandoc's `^1^`: cite's projection already maps exact attribute-free tags, and every
  Markdown renderer passes them.
- **How a caption holds a citation or maths with braces:** for example, the Figure block reading a quoted value with
  balanced `{…}` inside. This changes what the block reads.
