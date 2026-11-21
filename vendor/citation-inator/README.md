# citation.inator tools (vendored)

`citation-tools.mjs` is citation.inator's self-contained tools bundle (`dist/citation-tools.mjs`), copied unchanged
so draft.inator's build tools and tests need nothing installed.

| | |
|---|---|
| Version | 0.2.0 (tag `v0.2.0`) |
| Source | https://github.com/randal-cox/citation.inator, `dist/citation-tools.mjs` |
| SHA-256 | `28d74f566abbfe1807a5e9c3095b8ebb36a15c385b4a44c95e85210cb2102e42` |
| Licence | MIT (`LICENSE`); bundled parse5, marked, and entities notices in `THIRD_PARTY_LICENSES.txt` and the file header |
| Exports | `describeCitation`, `annotateMarkers`, `collectMarkerTags`, `createSiteOccurrenceIndex` |

To update: copy `dist/citation-tools.mjs`, `dist/LICENSE`, and `dist/THIRD_PARTY_LICENSES.txt` from the new tag,
update this table, run `npm test`, and note it in `CHANGELOG.md`. Never edit the bundle here; changes go to
citation.inator.
