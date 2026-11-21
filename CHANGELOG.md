# Changelog

## Unreleased (0.2)

- **Build tools** (`docs/tools.md`), plain Node with nothing to install:
  - `draft-inator notes` checks every marker's `note:` against citation.inator and fails on a stale one; `--write`
    refreshes them, changing nothing else.
  - `draft-inator tags` totals the topics writers gave each work, with a curator's additions and blocks.
  - `draft-inator works` writes the data contract's `works.js` from a citation.inator cache.
- citation.inator 0.2.0's tools bundle is vendored in `vendor/citation-inator/` (MIT, notices kept).
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
