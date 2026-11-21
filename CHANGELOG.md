# Changelog

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
