# citation.inator tools (vendored)

`citation-tools.mjs` is citation.inator's self-contained tools bundle (`dist/citation-tools.mjs`), copied unchanged
so draft.inator's build tools and tests need nothing installed.

| | |
|---|---|
| Version | **0.3.0** (tag `v0.3.0`, commit `daaf3cc378ec9ad58af816ec5c31fe5786f8b158`) |
| Source | The release tarball `citation-inator-0.3.0.tgz`, `package/dist/citation-tools.mjs` (identical to `dist/citation-tools.mjs` at the tag) |
| Tarball SHA-256 | `c841f1b26370ccfbd5e94c35907e8167afd1676ecf8ef0aefd6c169590d50b60` (matches the release's `SHA256SUMS`) |
| Bundle SHA-256 | `d0277703df8b0e10b9175ac33017b964b1284785c100a883adf14be7ecd38ba1` |
| Licence | MIT (`LICENSE`); bundled parse5, marked, and entities notices in `THIRD_PARTY_LICENSES.txt` and the file header |
| Exports | `describeCitation`, `annotateMarkers` (with `noteContext`), `collectMarkerTags`, `createSiteOccurrenceIndex`, `markerKind` |

To update: download the release tarball, check it against the release's `SHA256SUMS`, and copy
`package/dist/citation-tools.mjs`, `LICENSE`, and `THIRD_PARTY_LICENSES.txt` from it;
update this table, run `npm test`, and note it in `CHANGELOG.md`. Never edit the bundle here; changes go to
citation.inator.
