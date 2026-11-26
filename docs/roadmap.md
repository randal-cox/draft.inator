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
- Moved to 1.0: the reference renderer for `{cite …}` (a thin, documented call into citation.inator's compiler),
  with the other JS reference renderers.

## 0.3: Figure (released, v0.3.0, with the first of 0.4's editor)

- [x] Figure block (upload or choose; alt text, caption, credit, licence, source; alignment; width; wrap), round-trip
      tested and checked in Sveltia 0.262.4.
- [x] Provenance in the tag (credit, licence, source), since a block can't write a second file.
- [x] Renderer: `renderArticle()` places figures as their tags say. Moved on: `draft-inator figures` and sized copies
      (below, in 0.4).
- [x] Sveltia, not the TipTap fallback (Randal, 21 Nov 2026; `docs/decisions/0.3-figure-in-sveltia.md`).

## 0.4: The live article editor (released, v0.4.0)

draft.inator's own editor, first as an open demo on GitHub Pages (`demo/editor/`), built from the same blocks, so it
can grow into the editor real sites use (PRD principle 3).

- [x] Markdown beside, above, or instead of the preview; a toolbar that hides; plain mode with nothing but the text.
- [x] Cite and Figure open their real forms; images upload or come from the site; the draft stays in the browser.
- [x] The preview lays out figures (alignment, width, wrap): the first figure renderer (`renderArticle`).
- [x] A View menu for layouts, the toolbar, and plain.
- [x] Inside a site's own page: a marked, rounded box in the site's colours (`demo/site/`; `docs/editor.md`).
- [x] In korazonresearch.org: Edit this page, saving as a pull request (KR #23, merged 22 Nov 2026, on 0.3.0's
      editor; KR moves to 0.4.0 next, which offers a kept draft instead of loading it silently).
- [x] Real citations and endnotes in the preview, from citation.inator's browser compiler (#14).
- [x] Import citations, in the editor's look and feel, on citation.inator 0.4.0 (#16, #22, #26): reviewed matches,
      the site's own works reused, site-style ids for new ones (`src/editor/importer.js`).
- [x] The editor in `src/editor/` (`mountEditor`, `renderArticle`, the blocks' forms), with tests.
- [x] Front matter kept byte for byte; saving as a Sveltia-compatible draft pull request (`github.js`).
- [x] A kept draft is offered, never loaded silently (Recover or Discard).

Also in the 0.4.0 release (25 Nov 2026), the most important features beyond the milestone:

- [x] **Citations typed by hand can't be missed:** a banner names them, Save waits until they're imported, and a site
      can forbid saving them at all (`importer.handTyped`: `require`, `block`, `warn`, `off`).
- [x] **The import review, second round:** sections as disclosures with live counts, Convert waiting until everything
      is decided, the site's own works by policy (`siteWorks`), plain-language evidence, each citation's result in
      words, one list or two for the typed references, a result line with Undo, and choices remembered; then fixes
      from an outside UX review (#39).
- [x] **One citation keyword, `{cite …}`** (cite.inator 0.5.1, #33), configurable per site, with
      `draft-inator migrate` to move a site's pages; whitespace-separated options and the `tags` directive read.
- [x] **Unresolved placeholders** (#34): a citation with no reference becomes a flagged marker that keeps the words
      typed, and **Save without importing** keeps them that way instead of as plain text; the status line counts them.
- [x] **The Details panel and minimal-edit front matter**, early from 0.5 (below).

## 0.5: Metadata, entities, and the permission structure

From `docs/plan-full-editor.md` (decided 21 Nov 2026).

- [x] Front matter edited without disturbing it: only changed keys are written, in their own style (`yaml.js`).
- [x] The Details panel, drawn from a collection's fields (`DRAFT_COLLECTIONS`), with relations from
      `DRAFT_ENTRIES`, and checked on Save (required, patterns, ranges). Shown in the editor demo.

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

## 0.6 planning: citing from Zotero

- [x] First prototype on the draft side (#40): connect with a session-only key, search, review against the site's
      works, insert; disposable browser-local bindings. Waiting for cite.inator 0.6's release, and KR's CSP change.
 (issue #40; planning only, after 0.5.1)

Randal keeps his library in Zotero and wants to insert works from it as `{cite …}` markers without leaving the
editor. Not started; nothing here is agreed beyond the split of work, and nothing reads a private library yet.

- **What Randal wants** (25 Nov 2026): a fast library search in the Cite dialog; **Already cited** shown for works
  this page cites; Zotero's curation respected, with any merge reviewed by a person; **Open in Zotero**; a quote and
  a page captured with the citation; a review of relevant updates when a Zotero record changes; and a bibliography file
  for one manuscript.
- **cite.inator owns** reading Zotero's data into records, identity and edition reconciliation, provenance, reviewed
  merges, and the CSL-JSON, BibTeX, and RIS writers (only `toCSL(record)` exists today).
- **draft.inator owns** the picker and its keyboard flow, choosing a library or collection, connection settings and
  credentials, saving the page and its new records together, and the download button that calls cite.inator's
  writers.
- **Who talks to Zotero** (agreed on #40, 25 Nov 2026): for the first prototype, draft.inator owns the web client,
  credentials, permissions, and the connection's lifecycle; cite.inator owns `fromZotero`, reconciliation, the
  reviewed difference, and the serializers. An adapter with an injected `fetch` is extracted only if a second host
  needs one. Web first; local access later, and only if tested (a hosted page reaching `localhost` is restricted by
  browsers); no implicit failover and no automatic two-way sync.
- **A quote with a citation** (`quote:`, proposed by cite.inator for 0.6): the writer's excerpt for that citation,
  next to its locator; draft.inator captures it from the selection. Not written by either project until the contract
  and its tests are agreed. **Who sees it is a site setting** (Randal, 25 Nov 2026), defaulting to readers seeing it
  on hover over the citation; a site can keep quotes private, and then they must never reach anything published or
  exported (tested, not just stated).
- **Smallest prototype:** search one Zotero library read-only through the web API, choose a work, reconcile it
  against the site's works (a match goes to the writer to confirm, never merged silently), insert the marker, and save
  the new record with the page. Direct connectors to other reference managers are deferred; file import and export
  stay in cite.inator's 0.6.

## Equations and cross-references (Randal, 25 Nov 2026)

- [x] LaTeX maths, `$…$` and `$$…$$`, drawn by KaTeX as MathML in the preview; mistakes marked with KaTeX's message.
- [x] Labels, never numbers: `{#eq:name}` on equations, `label:fig:name` on figures, `{ref …}` anywhere; numbered
      automatically, by kind, in order, and renumbered when things move.
- [x] `draft-inator check` for maths that doesn't parse, missing labels, and labels used twice.
- [ ] Rendering the same way in a site's build (`crossref.js` with KaTeX in Node), starting with korazonresearch.org.
- [ ] The Equation dialog: source and live render side by side, a palette (fractions, sums, integrals, Greek,
      matrices), the site's macros, a label field; completion for `\commands` in the text.
- [ ] Paste maths from Word, Google Docs (via .docx), Mathematica, and LibreOffice: MathML on the clipboard, and Word's
      maths in a .docx, converted to LaTeX.
- [ ] Numbered tables (`label:tab:name`).

## Republish elsewhere: Substack first (Randal, 25 Nov 2026; planned, not started)

Write once on the site, with real citations, and republish anywhere without redoing them. Christopher publishes on
Substack as well as korazonresearch.org; Patreon is likely second.

- [ ] **Copy for Substack** (and Patreon), and **Download Markdown**, from the editor. Copy and paste for now; better
      integration (each platform's API or import format) to be explored.
- [ ] What the copy holds: the article as readers see it (headings, italics, quotes, and images at the site's full
      addresses, with credits), without what only works on the site (the citation panel, curator-only notes).
- [ ] Citations as text, "(Bell 1992, 94)", each linking to its reference on the site's article (Randal: better than
      linking out). A References section at the end, each entry linking to its source (DOI, PubMed, or publisher)
      and to the work on the site.
- [ ] "Originally published at …", linking to the article (the canonical copy), worded per site.
- [ ] Checks before copying: unresolved citations, an article with no public address yet, images without alt text.
- [ ] Each platform a small profile (what formatting it keeps, plain links, where the line goes), so Medium, Ghost,
      LinkedIn articles, WordPress, and Joomla are additions, not rewrites.
- **Open question:** automatic text a site may want on every republished copy. The site has no comments, so
  discussion happens on the platform (Substack, say); what, if anything, to add is undecided.
- **Ownership (proposed):** cite.inator formats citations and the reference list without the site's panel, with full
  addresses; draft.inator owns the profiles, checks, copy, and download; the host gives each article's public address
  (an additive data-contract change).

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
- [ ] JS reference renderers, starting with `{cite …}` as a thin, documented call into citation.inator's
      compiler; packaging decided; docs for a new site.
- [ ] A second site adopts it.

## Stretch: Import citations (with cite.inator) — done in 0.4

- [x] In-text citation parsing and matching against the document's own reference list (cite.inator 0.4.0).
- [x] The site's own works offered for reuse; site-style ids for new works.
- [x] Import review in the editor; one undoable conversion (#23).
- [x] Import review, second round (Randal, 25 Nov 2026; released in 0.4.0): an unmissable "needs importing" indicator with Save blocked,
      three sections (probably right, needs attention, the site already has it), Cancel and Convert always visible,
      unmatched citations kept as flagged placeholders (#34), and a site policy to prefer or require the site's works.
- [ ] Placeholders for citations that do have a reference (cite.inator 0.6.0-preview.0, #34), so Save without
      importing can flag every typed citation.
- [ ] Crossref bibliographic search (cite.inator).

## Exploration: a scholarly writing environment ("write.inator")

Not a milestone or a commitment (issue #35). The question is whether labelled figures and equations,
cross-references, manuscript checks, claim-to-evidence links, and a reviewer-response workflow are draft.inator
improvements, a scholarly preset of draft.inator, or a separate product. Current recommendation: draft.inator features
assembled as a preset, revisited after a small experiment (labelled figures, cross-references, and a check). See
[the exploration](explore-scholarly-writing.md).

## Later, when someone needs them

- **Editing together** (Randal, 25 Nov 2026: level 2). Saving merges the writer's changes into the latest version,
  the way git does: untouched paragraphs go straight through, a paragraph both people changed is shown side by side
  to choose, and front matter merges field by field. A notice says when someone else is editing the page, and since
  when. No live server; live editing (shared cursors) stays out unless real users ask for it.

- Gallery, columns, reusable snippets, a site-wide link picker for external sources.
- Glossary auto-linking by use (Randal's note, 20 Nov 2026: link a term's uses, possibly found by embeddings).
