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
- [x] The editor in `src/editor/` (`mountEditor`, `renderArticle`, the blocks' forms), with tests.
- [x] Front matter kept byte for byte; saving as a Sveltia-compatible draft pull request (`github.js`).

## 0.5: Metadata, entities, and the permission structure

From `docs/plan-full-editor.md` (decided 21 Nov 2026).

- [ ] A settings panel beside the editor: title, slug, authors, dates, status, excerpt, preview image with alt text,
      tags and topics, SEO and social cards, canonical address, noindex, redirects.
- [ ] Who may see a page (`visibility`: public, unlisted, members, or the site's groups) and who may edit it
      (`editors`), from groups the site declares.
- [ ] Entities in the same editor (Randal, 21 Nov 2026): the settings panel is drawn from each collection's fields,
      read from Sveltia's collection config, so articles, people, topics, and tags all use one editor. Entries that
      are only fields (YAML files) get the fields and no writing pane. Relations (`authors` → people, `topics`) pick
      from their collection.
- [ ] The data contract for these fields, validated in the editor and by a build check.

## 0.6: The article list and article handling

- [ ] The article list: full-text search, combinable filters (collection, status and open drafts, author, tag,
      visibility, dates, problems such as missing alt text), sorting, chosen columns, saved views, counts per status.
- [ ] History with readable diffs and Restore.
- [x] Recover an unsaved draft: offered, never loaded silently.
- [ ] Unpublish, trash, and restore; scheduled publishing with a scheduled build.

## 0.7: The media library (images)

- [ ] Browse and search the site's images; details with a sidecar record (alt, credit, licence, source, focal point).
- [ ] Where each image is used; unused images; crop and rotate; upload limits; GPS data stripped.
- [ ] `draft-inator figures`: collect each image's provenance from the tags, for hosts that keep records, and check
      for missing alt text or conflicting credits. (Moved from 0.4, Randal, 24 Nov 2026.)
- [ ] Sized copies of figure images in the reference renderer. (Moved from 0.4.)
- Video and audio deferred.

## 0.8: Access checks and more blocks

- [ ] `draft-inator access`: `access.json` for hosts to enforce; a check that fails a pull request if a restricted
      page would leak (public links, sitemap, search index, feeds); CODEOWNERS or an `editors` check.
- [ ] Table, Embed (privacy player), Callout and pull quote; page and glossary links; the Audience block.
- [ ] Site fonts and styles in the preview.

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
