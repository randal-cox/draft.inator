# Changelog

## Unreleased (0.3)

- **Figure block** (`src/blocks/figure.js`): place an image with required alt text, a caption, its provenance
  (credit, licence, source), and how it sits (alignment, width, wrap). Upload or choose from the site's images; the
  preview shows an upload before it's published; stock photo services are never offered. It writes one readable line,
  `{figure /uploads/mask.jpg | alt:"…" | caption:"…" | credit:"…" | align:right | width:half}`, and round-trips it
  unchanged, keeping unknown options and values where they were. Checked in Sveltia 0.262.4.
- Data contract 0.3 (additive): the `{figure …}` tag.

## Unreleased (0.2)

- **Build tools** (`docs/tools.md`), plain Node with nothing to install:
  - `draft-inator notes` checks every marker's `note:` against citation.inator and fails on a stale one; `--write`
    refreshes them, changing nothing else.
  - `draft-inator tags` totals the topics writers gave each work, with a curator's additions and blocks.
  - `draft-inator works` writes the data contract's `works.js` from a citation.inator cache.
- **Documentation** for each reader (`docs/README.md`): writers, getting started, the build tools, and how
  draft.inator and citation.inator fit together.
- **Live demos** (`demo/`, served by GitHub Pages): the Cite block in a stand-in editor, and the build tools on the
  sample site (`examples/sample-site/`), running the same code as the commands.
- citation.inator's tools bundle is vendored in `vendor/citation-inator/` (MIT, notices kept): **0.3.0**, from the
  release tarball, checked against its published checksums. It adds the two things draft.inator asked for.
- **Year letters settled:** notes describe the work alone ("Cox 1995"), with citation.inator's `noteContext: "work"`,
  so `draft-inator notes`, `works.js`, and the Cite block always agree. `"noteContext": "article"` is available.
- The Cite block's directive test is now held to citation.inator's own `markerKind`.
- **Cite block:** the directives it leaves alone now match citation.inator exactly. A work whose id starts with
  `list`, `endnote`, `nocite`, `evidence`, or `credit` (such as `list-2001`) can now be opened in the form.

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
