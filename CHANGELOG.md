# Changelog

## Unreleased

- **Cite from Zotero** (issue #40; cite.inator 0.6.0-preview.1, for testing): search your Zotero library from the
  editor, with a key kept for the browser tab only; each item converted and compared with the site's works by
  cite.inator, reviewed, then inserted. The demo has a small made-up library.
  From Theandra's independent review: a stale browser binding can no longer make the picker cite a different work
  (#53), and a failing `onRecords` (thrown or rejected) changes nothing and says so (#54). `npm run test:browser` runs
  both through the real dialog in Chromium.
- **Equations and cross-references** (Randal, 25 Nov 2026). LaTeX maths between `$…$` and `$$…$$`, drawn by KaTeX
  0.16.11 (vendored, MIT) as MathML: no fonts, styles, or scripts, so it suits a strict security policy, and screen
  readers read it. Label a displayed equation with `{#eq:name}` and a figure with `label:fig:name`; `{ref …}` reads
  "Eq. 3" or "Figure 2". Files hold labels, never numbers, so moving things renumbers them and every reference.
  Mistakes and missing labels are marked in the preview and counted in the status line. `draft-inator check` fails a
  pull request on them. Demo: `demo/editor/?sample=equations`.
- **`draft-inator migrate` names each line to check** (`file:line:column`); 0.4.0 printed `undefined:undefined`.
- **Replacing a work doesn't carry the old work's options** (Theandra's point on #40; a bug in 0.4.0). When a
  writer changes the work a citation points to, the old work's page and other options are set aside and shown, with
  **Keep them**; nothing moves by default, and going back restores them. Finishing a placeholder drops its
  `unresolved:`. Same-work edits keep every option, as before.

## 0.4.0 · 2026-11-25 · The live editor, citation import, and one keyword

**Upgrading (breaking):** markers are now written `{cite …}` (cite.inator 0.5.1, #33). Run
`npx draft-inator migrate --config draft-inator.json --write` once, and check anything it prints as `check:`; or set
`DRAFT_CITATION_KEYWORD` and the `keyword` setting to keep another word.

- **cite.inator 0.5.1** (tag `v0.5.1`, commit `1bbee65`), vendored from its release tarball (SHA-256 checked against
  `SHA256SUMS`): one configured keyword, default `cite`; optional pipes; the `tags` directive; unresolved placeholders.
- **Save without importing keeps them as unresolved citations** (Randal, 25 Nov 2026; cite.inator 0.5.1). Typed
  citations with no reference become flagged placeholders that keep the words typed, instead of plain text; the
  status line counts unresolved citations until they're finished. Placeholder ids read `pending-rivera-2020`.
- **A site can forbid saving citations typed by hand** (Randal, 25 Nov 2026): `importer.handTyped: 'require'` holds Save
  until every one is imported, with no Save without importing.
- **Citations typed by hand can't be missed** (Randal's review, 25 Nov 2026). While an article has author–date
  citations that aren't markers yet, a banner names them and offers **Import citations**; by default Save waits
  until they're imported (`importer.handTyped`: `block`, `warn`, or `off`). Pasting them in says so at once.
- **Import review, second round.** Three sections as disclosures with live counts ("1 to decide", "all decided ✓"):
  Needs your attention, where nothing is chosen for you and Convert waits until each is decided; the works the site
  already has; and probably right, closed to start; the reference list as its own decision, with unused entries
  flagged; each citation shows exactly what it becomes; evidence in plain words; the review runs on opening; Cancel and Convert always in view; a site policy for its own works (`importer.siteWorks`: `offer`, `prefer`,
  `require`); radios and checkboxes drawn the same in light and dark.
- **Import review, after an outside review.** No selection after converting (the next keystroke would have replaced
  the converted text); a result line with Undo; each citation says in words which works it cites, with Show code;
  leaving one work of a group explains that the whole citation stays; choices remembered while the page is open;
  evidence without internal ids; a warning before adding a duplicate of a site work; "Save without importing" offered from the start, and citations left as typed in an import count as allowed; focus returns to the
  opener; the style selector re-runs the review; a quieter live region; the reference-list choice is a fieldset.
- **The typed reference list** (Randal, 25 Nov 2026): put as one list or two, since keeping the typed list means readers
  see two; one list (replace) is chosen to start. The banner's escape hatch is now **Save without importing**.
- **citation.inator 0.4.0** (tag `v0.4.0`), vendored from its release tarball: the tools bundle (now with
  `formatRecordId`), and new, the import bundle and the browser compiler. `vendor/citation-inator/README.md` has the
  checksums.
- **Import citations** in the editor, with citation.inator's importer: finds author–date citations and the reference
  list, shows each citation in its sentence with its matched work and the evidence, and converts the accepted ones to
  `{citation …}` markers in one undoable step, optionally replacing the reference list with `{citation endnote}`.
  Unmatched citations stay as written. Try it: `demo/editor/?sample=import`.
- **The site's own works.** With the site's citation cache (`importer.siteCache`), a reference that looks like a work
  the site already has is offered as that work, for the writer to confirm, so it isn't added twice. New works get
  site-style ids (`bell-1992-ritual`; a site can give its own `recordId`), and only new works the converted citations
  cite are added and handed to the site.
- **Formatted citations in the preview.** With citation.inator's browser compiler and the site's cache (the
  `citations` option), the preview shows citations and endnotes as the published page will. Without them, or if the
  compiler stops, it shows each work's note, as before. Works added by an import are formatted at once.
- The Cite block takes works added while editing (`DRAFT_CITATION.addWorks`), so imported works get notes at once.
- Toolbar buttons are named by their visible text for screen readers (a tooltip no longer replaces it).
- **`local:` ids are read as the work they name.** `{citation local:bell-1992-ritual}` (as citation.inator's importer
  writes) opens with Bell selected and Bell's note, and is written back in the form it had. A newly chosen work is
  written bare, or `local:` when its id is a directive word such as `list`. Checked against citation.inator's
  `markerKind`.
- **The Details panel (0.5).** With `collection` (or `fields`), the editor takes the whole file: front matter as a
  document's properties above the text, drawn from the site's collection fields in Sveltia's format
  (`DRAFT_COLLECTIONS`): the title large, a summary that opens when wanted, and compact rows whose choosers (authors,
  topics, keywords, card image, order) open only when asked for, search hundreds of entries, and work from the
  keyboard. Choices come from `DRAFT_ENTRIES`; an order is chosen as a place among the other entries. Save checks required fields, patterns, and number
  ranges first and shows each problem beside its field. The demos' landing page now opens with the editor, and
  `npm run demo` serves it at the bare address too. Only the keys a writer changes are written, in their own
  style; everything else in the front matter stays byte for byte (`src/editor/yaml.js`). Additive: without
  `collection`, the editor works as before. The editor demo shows it.
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
