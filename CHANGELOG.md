# Changelog

## Unreleased (0.4)

- **`local:` ids are read as the work they name.** `{citation local:bell-1992-ritual}` (as citation.inator's importer
  writes) opens with Bell selected and Bell's note, and is written back in the form it had. A newly chosen work is
  written bare, or `local:` when its id is a directive word such as `list`. Checked against citation.inator's
  `markerKind`.
- **Kept drafts are offered, not loaded silently.** The editor always opens the page's own text; changes kept in the
  browser are offered with their time (Restore them, or Discard), with a warning if the page has changed since, so a
  newer save is never hidden. Restore is one undoable step; a successful save forgets the kept draft.

## 0.3.0 · 2026-11-21 · Figures and the live editor

The Figure block, and draft.inator's own article editor: in a whole window or in a box inside a site's page, saving
as a pull request the way Sveltia's editorial workflow does.

- **The live editor** (`demo/editor/`, on GitHub Pages): write an article in Markdown with the preview beside it,
  above it, or hidden, or the preview alone. Hide the toolbar, or go plain for nothing but text. Citation and Figure
  open the blocks' real forms in a dialog (Ctrl+E edits the one under the cursor); images upload or come from the
  samples; the preview lays out figures and lists the works cited. The draft, small uploads, and the layout are kept
  in the browser. No server, nothing sent anywhere.
- **The editor is a component** (`src/editor/`): `mountEditor(element, options)` puts it in a whole window or in a
  rounded, marked box inside a site's own page, in the site's colours; the site gives it a Markdown renderer and a
  save function (`docs/editor.md`). `renderArticle()` renders a page the way the preview does. A **View** menu holds
  the layouts, the toolbar switch, and plain mode.
- **Front matter and saving** (`src/editor/frontmatter.js`, `src/editor/github.js`): set a page's front matter
  aside byte for byte, and save as Sveltia's editorial workflow does (a `cms/<collection>/<slug>` branch and one
  draft pull request labelled `sveltia-cms/draft`, never merged), refusing a save that would overwrite someone
  else's. Tested against a fake GitHub.
- **Editing inside a site** demo (`demo/site/`): a made-up archive whose "Edit this page" swaps the article for the
  editor, with the site's menus in view.
- An editor box a site hides (`hidden`) now stays hidden.
- `npm run demo` serves the demos on your own computer, to try a pull request before it's merged
  (`docs/try-a-pull-request.md`).
- **Figure block** (`src/blocks/figure.js`): place an image with required alt text, a caption, its provenance
  (credit, licence, source), and how it sits (alignment, width, wrap). Upload or choose from the site's images; the
  preview shows an upload before it's published; stock photo services are never offered. It writes one readable line,
  `{figure /uploads/mask.jpg | alt:"…" | caption:"…" | credit:"…" | align:right | width:half}`, and round-trips it
  unchanged, keeping unknown options and values where they were. Checked in Sveltia 0.262.4.
- Data contract 0.3 (additive): the `{figure …}` tag.
- **Demo in real Sveltia CMS** (`demo/sveltia/`): the Cite and Figure blocks in Sveltia 0.262.4 with its test backend,
  seeded with a sample essay and images. No sign-in; changes stay in the browser.

## 0.2.0 · 2026-11-21 · Notes, tags, and works

Build tools that keep a site's citations tidy, documentation and live demos, and citation.inator 0.3.0.

- **Build tools** (`docs/tools.md`), plain Node with nothing to install, run as `draft-inator <command>`:
  - `notes` checks every marker's `note:` against citation.inator and exits 1 if one is stale or missing, so it can
    fail a pull request. `--write` refreshes them and changes nothing else.
  - `tags` totals the topics writers gave each work while citing it, with a curator's additions and blocks. Anything
    a person should look at is reported; nothing is dropped silently.
  - `works` writes the data contract's `works.js` from a citation.inator cache, so any site can make it. `--check`
    fails if it's out of date.
  - One settings file (`draft-inator.json`) for all three, so the notes and the works list use the same style.
- **Year letters settled:** notes describe the work alone ("Cox 1995"), with citation.inator's `noteContext: "work"`,
  so `notes`, `works.js`, and the Cite block always agree. `"noteContext": "article"` is available.
- **Cite block:** the directives it leaves alone now match citation.inator exactly, held there by a test against
  citation.inator's `markerKind`. A work whose id starts with `list`, `endnote`, `nocite`, `evidence`, or `credit`
  (such as `list-2001`) can now be opened in the form.
- **Cite block fix:** unknown options separated by a known one (`{citation x | label:"a" | locator:3 | foo:1}`) were
  regrouped on save. Each now stays where it was. Present since 0.1.0.
- **Documentation** for each reader (`docs/README.md`): writers, getting started, the build tools, and how
  draft.inator and citation.inator fit together. The 0.3 evidence on Sveltia and the Figure block is in
  `docs/decisions/`.
- **Live demos** on GitHub Pages (`demo/`): the Cite block in a stand-in editor, and the build tools on the sample
  site (`examples/sample-site/`), running the same code as the commands.
- **citation.inator 0.3.0** is vendored in `vendor/citation-inator/` (MIT, notices kept), from its release tarball,
  checked against the published checksums.

## 0.1.0 · 2026-11-21

The first release: the Cite block, packaged from korazonresearch.org, where it was built.

- **Cite block** (`src/blocks/citation.js`): a Sveltia CMS editor component that reads and writes citation.inator
  markers (`{citation id | note:"Bell 1992" | locator:12 | prefix:"see also" | form:narrative | tags:a,b; id2}`).
  Pick one or more works by author, title, or year; give each a page, prefix, form, and topics.
- **Round-trip safe.** Opening and saving a marker changes nothing but its `note:`, and a second pass changes nothing.
  Options the form doesn't show are kept in place, option order is kept, and quoting is kept. In korazonresearch.org
  it round-trips all 163 real markers unchanged.
- **Data contract 0.1** (`docs/data-contract.md`): the host provides `window.DRAFT_WORKS` and, optionally,
  `window.DRAFT_TOPICS`.
- Tests on Node 22 alone (`npm test`), no dependencies.
- Product requirements, roadmap, origin notes, and an import feasibility sketch in `docs/`.
- Licensed MIT, as citation.inator is.
