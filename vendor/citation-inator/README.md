# citation.inator tools (vendored)

`citation-tools.mjs` is citation.inator's self-contained tools bundle (`dist/citation-tools.mjs`), copied unchanged
so draft.inator's build tools and tests need nothing installed.

| | |
|---|---|
| Version | 0.2.0 plus unreleased work: commit `adbb07e` on branch `codex/citation-import` (the file's header still says v0.2.0) |
| Source | https://github.com/randal-cox/citation.inator, `dist/citation-tools.mjs` at `adbb07e` |
| SHA-256 | `41455a4eddcb25d1f255be6461cfef617cce39686290381df70247f7e4170538` |
| Licence | MIT (`LICENSE`); bundled parse5, marked, and entities notices in `THIRD_PARTY_LICENSES.txt` and the file header |
| Exports | `describeCitation`, `annotateMarkers` (with `noteContext`), `collectMarkerTags`, `createSiteOccurrenceIndex`, `markerKind` |

Replace this with the same file from citation.inator's next tagged release once it has one.

To update: copy `dist/citation-tools.mjs`, `dist/LICENSE`, and `dist/THIRD_PARTY_LICENSES.txt` from the new tag,
update this table, run `npm test`, and note it in `CHANGELOG.md`. Never edit the bundle here; changes go to
citation.inator.
