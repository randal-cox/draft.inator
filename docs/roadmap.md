# Roadmap

Ordered by what writers at the first host (korazonresearch.org) need next. Each milestone ends with a tagged release
and the host taking it.

## 0.1: Cite (released, v0.1.0)

- [x] Cite block: pick works, page, prefix, form, topics; note from citation.inator; round-trip safe (163 markers).
- [x] Data contract: `DRAFT_WORKS`, `DRAFT_TOPICS`.
- [x] Tests on Node alone: round-trip, second pass stable, quoting kept, option order kept, unknown options kept.
- [x] Licence: MIT, as citation.inator (Randal, 21 Nov 2026).
- [x] A changelog.
- [x] First tag `v0.1.0`.
- [ ] korazonresearch.org loads the block from the release instead of its own copy.

## 0.2: Notes and tags kept current (released, v0.2.0)

- [x] Host build step: `draft-inator notes` runs `annotateMarkers` over all content; it fails a pull request with a
      stale note, and `--write` fixes it.
- [x] Tag totals from markers (`draft-inator tags`, from `collectMarkerTags`), with curator add/block per work; handed
      to citation.inator as record `tags`.
- [x] A JS producer for `works.js` (`draft-inator works`), from a citation.inator cache, so any site can make it.
- [x] Skipped directive words match citation.inator exactly, tested against its own `markerKind` (delivered by
      Theandra on request, 21 Nov 2026).
- [x] Year letters: notes describe the work alone ("Cox 1995"), using citation.inator's `noteContext: "work"`
      (delivered on request), so the build check, `works.js`, and the editor agree.
- [x] Re-vendored citation.inator from its tagged 0.3.0 release (#8).
- [x] Documentation that holds a new site's hand: getting started, the Cite block for writers, the tools, and how
      draft.inator and citation.inator fit together (`docs/README.md`).
- [x] Live demos viewable from GitHub (GitHub Pages, `demo/`): the Cite block's form without installing Sveltia, a
      round trip, and the build tools' output on a sample site.
- [x] GitHub Pages turned on (Randal, 21 Nov 2026: `main`, `/ (root)`).
- Moved to 1.0: the reference renderer for `{citation …}` (a thin, documented call into citation.inator's compiler),
  with the other JS reference renderers.

## 0.3: Figure (released, v0.3.0, with the first of 0.4's editor)

- [x] Figure block (upload or choose; alt text, caption, credit, licence, source; alignment; width; wrap), round-trip
      tested and checked in Sveltia 0.262.4.
- [x] Provenance in the tag (credit, licence, source), since a block can't write a second file.
- [x] Renderer: `renderArticle()` places figures as their tags say. Moved on: `draft-inator figures` and sized copies
      (below, in 0.4).
- [x] Sveltia, not the TipTap fallback (Randal, 21 Nov 2026; `docs/decisions/0.3-figure-in-sveltia.md`).

## 0.4: The live article editor

draft.inator's own editor, first as an open demo on GitHub Pages (`demo/editor/`), built from the same blocks, so it
can grow into the editor real sites use (PRD principle 3).

- [x] Markdown beside, above, or instead of the preview; a toolbar that hides; plain mode with nothing but the text.
- [x] Cite and Figure open their real forms; images upload or come from the site; the draft stays in the browser.
- [x] The preview lays out figures (alignment, width, wrap): the first figure renderer (`renderArticle`).
- [x] A View menu for layouts, the toolbar, and plain.
- [x] Inside a site's own page: a marked, rounded box in the site's colours (`demo/site/`; `docs/editor.md`).
- [ ] In korazonresearch.org: Edit this page, saving as a pull request (built in KR from 0.3.0's editor; awaiting
      Randal's go-ahead there).
- [ ] Real citations and endnotes in the preview, from citation.inator's browser compiler (#14).
- [ ] citation.inator's import widget, in the editor's look and feel (with Theandra, #16).
- [ ] `draft-inator figures`: collect each image's provenance from the tags, for hosts that keep records, and check
      for missing alt text or conflicting credits.
- [ ] Sized copies of figure images in the reference renderer.
- [x] The editor in `src/editor/` (`mountEditor`, `renderArticle`, the blocks' forms), with tests.
- [x] Front matter kept byte for byte; saving as a Sveltia-compatible draft pull request (`github.js`).

## 0.5: Table, Embed, Callout

- [ ] Table with caption; raw-HTML escape hatch.
- [ ] Embed (YouTube, Vimeo) with the privacy player.
- [ ] Callout and pull quote.

## 0.6: Links and audience

- [ ] Page link and glossary link by id (pages from the host's route map; glossary from the host's Lexicon).
- [ ] Audience block (`data-for` roles).

## 0.7: Preview like the site

- [ ] Site fonts and styles in the preview (`registerPreviewStyle`); blocks drawn as the page will show them.

## 1.0: A plug-in other sites use

- [ ] One site file; nothing host-specific left in the blocks (see `origin.md`).
- [ ] JS reference renderers, starting with `{citation …}` as a thin, documented call into citation.inator's
      compiler; packaging decided; docs for a new site.
- [ ] A second site adopts it.

## Stretch: Import citations (with citation.inator F4)

- [ ] In-text citation parsing and matching against the document's own reference list (citation.inator).
- [ ] Crossref bibliographic search (citation.inator).
- [ ] Import page: paste or upload; review table; confirm; one pull request.
- [ ] Measured test set of real pasted references; a parser plug-in beyond rules only if the numbers call for it.

## Later, when someone needs them

- Gallery, columns, reusable snippets, a site-wide link picker for external sources.
- Glossary auto-linking by use (Randal's note, 20 Nov 2026: link a term's uses, possibly found by embeddings).
