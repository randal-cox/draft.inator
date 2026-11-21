# Changelog

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
