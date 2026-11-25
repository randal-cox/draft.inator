# citation.inator tools (vendored)

Three of citation.inator's self-contained browser bundles, copied unchanged so draft.inator's editor, build tools, and
tests need nothing installed:

- `citation-tools.mjs`: describing works, refreshing notes, collecting tags, classifying markers, writing ids.
- `citation-import.mjs`: finding author–date citations and reference lists, and reviewed conversion (the importer).
- `citation-compiler.mjs`: compiling an article's citations and endnotes in the browser (the editor's preview).

| | |
|---|---|
| Version | **0.4.0** (tag `v0.4.0`, commit `b4b396c753ff4605b9e99cceb9244a69525c6108`) |
| Source | The release tarball `citation-inator-0.4.0.tgz`, `package/dist/` |
| Tarball SHA-256 | `45b06bf5808410a14ccbab68b3b0e2737253199a31eac52d989b3b092513c604` (matches the release's `SHA256SUMS`) |
| Bundle SHA-256 | `citation-tools.mjs` `b2b7b98ab15d90015840c95edd0c9c086a8f49f92098f18d3a118d959d5b305a`; `citation-import.mjs` `9c0595930a0e9a0b62bb1338ee5bccd8f9a05f8edffe50f67da61e9c4e516bea`; `citation-compiler.mjs` `631800613f37aeaa0c7df0d313e9a2d9c2de7429d22f3d76e298a9618c7abc7a` |
| Licence | MIT (`LICENSE`); bundled parse5, marked, and entities notices in `THIRD_PARTY_LICENSES.txt` and the file headers |
| Tools exports | `describeCitation`, `annotateMarkers` (with `noteContext`), `collectMarkerTags`, `createSiteOccurrenceIndex`, `markerKind`, `formatRecordId` |

To update: download the release tarball, check it against the release's `SHA256SUMS`, and copy
the three bundles from `package/dist/`, `LICENSE`, and `THIRD_PARTY_LICENSES.txt` from it;
update this table, run `npm test`, and note it in `CHANGELOG.md`. Never edit the bundle here; changes go to
citation.inator.
