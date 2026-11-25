# cite.inator tools (vendored)

Three of citation.inator's self-contained browser bundles, copied unchanged so draft.inator's editor, build tools, and
tests need nothing installed:

- `citation-tools.mjs`: describing works, refreshing notes, collecting tags, classifying markers, writing ids.
- `citation-import.mjs`: finding author–date citations and reference lists, and reviewed conversion (the importer).
- `citation-compiler.mjs`: compiling an article's citations and endnotes in the browser (the editor's preview).

| | |
|---|---|
| Version | **0.5.1-preview.6** (commit `ce312c3`), **for testing only**: this branch can't merge until it carries the 0.5.1 release, from its tarball, checked against `SHA256SUMS` |
| Source | cite.inator's `dist/` at that commit (bundle file names unchanged from 0.4.0) |
| Bundle SHA-256 | `citation-tools.mjs` `4edd675282ce91805e0794f811e609822febee03aa01c80c4aa1355ec74d9e9b`; `citation-import.mjs` `5540d183d3fbbfd71d90be95c3d244bc4dcbd48eb1d255913946d6c05ea65082`; `citation-compiler.mjs` `308c5fe197e04456b887042ecf8d1e5ba311acb917089bfab59e5be6d511caa8` |
| Licence | MIT (`LICENSE`); bundled parse5, marked, and entities notices in `THIRD_PARTY_LICENSES.txt` and the file headers |
| Tools exports | `describeCitation`, `annotateMarkers` (with `noteContext`), `collectMarkerTags`, `createSiteOccurrenceIndex`, `markerKind`, `formatRecordId` |

To update: download the release tarball, check it against the release's `SHA256SUMS`, and copy
the three bundles from `package/dist/`, `LICENSE`, and `THIRD_PARTY_LICENSES.txt` from it;
update this table, run `npm test`, and note it in `CHANGELOG.md`. Never edit the bundle here; changes go to
citation.inator.
