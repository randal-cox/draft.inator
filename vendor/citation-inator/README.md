# cite.inator tools (vendored)

Three of citation.inator's self-contained browser bundles, copied unchanged so draft.inator's editor, build tools, and
tests need nothing installed:

- `citation-tools.mjs`: describing works, refreshing notes, collecting tags, classifying markers, writing ids.
- `citation-import.mjs`: finding author–date citations and reference lists, and reviewed conversion (the importer).
- `citation-compiler.mjs`: compiling an article's citations and endnotes in the browser (the editor's preview).

| | |
|---|---|
| Version | **0.5.1** (tag `v0.5.1`, commit `1bbee6573fc0fdf10deca9fccd6e59ea175a7f6a`) |
| Source | The release tarball `cite-inator-0.5.1.tgz`, `package/dist/` (bundle file names unchanged from 0.4.0) |
| Tarball SHA-256 | `31d726ee52e54e5d6226900c8caae03a12abdb7db363a8328e3921bdd142edcf` (matches the release's `SHA256SUMS`) |
| Bundle SHA-256 | `citation-tools.mjs` `810e40a50ad1033d697abb3adfde2e6754caf1017a20c77636be3a6b57dbb256`; `citation-import.mjs` `e76f4891fa7641c0d2d9d24d1c380fe3dbc715f8e03179f8f99ec2417adf7716`; `citation-compiler.mjs` `f07ed16d3ad7cbfd8765340a3fb333ac84f6a898e0b8b2f2b73e322c3c4dcaab` |
| Licence | MIT (`LICENSE`); bundled parse5, marked, and entities notices in `THIRD_PARTY_LICENSES.txt` and the file headers |
| Tools exports | `describeCitation`, `annotateMarkers` (with `noteContext`), `collectMarkerTags`, `createSiteOccurrenceIndex`, `markerKind`, `formatRecordId` |

To update: download the release tarball, check it against the release's `SHA256SUMS`, and copy
the three bundles from `package/dist/`, `LICENSE`, and `THIRD_PARTY_LICENSES.txt` from it;
update this table, run `npm test`, and note it in `CHANGELOG.md`. Never edit the bundle here; changes go to
citation.inator.
