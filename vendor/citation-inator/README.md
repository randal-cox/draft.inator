# cite.inator tools (vendored)

Three of citation.inator's self-contained browser bundles, copied unchanged so draft.inator's editor, build tools, and
tests need nothing installed:

- `citation-tools.mjs`: describing works, refreshing notes, collecting tags, classifying markers, writing ids.
- `citation-import.mjs`: finding author–date citations and reference lists, and reviewed conversion (the importer).
- `citation-compiler.mjs`: compiling an article's citations and endnotes in the browser (the editor's preview).

| | |
|---|---|
| Version | **0.6.0-preview.8**, for testing on the `feature/cue` branch only (commit `4b9c0929b10570df3e6f0fe6e0863851805d6ce9`, branch `codex/cite-0.6-zotero`). Not for `main` until 0.6 is released |
| Source | `dist/` at that commit (tracked in citation.inator's repository) |
| Bundle SHA-256 | `citation-tools.mjs` `a10f0a965b06f108b3abe66566dcb87fc4fa2a9a3391dacc2cab384a9025fca6`; `citation-import.mjs` `a7154509a9a59b48ccb90f845f020d5c3b3ee8bd70ee59a5ae58d2c1b5e1edc5`; `citation-compiler.mjs` `3e272324decbf55369da718c979a5fdba6e10549a11701ed010a87c7ce920d0f` |
| Licence | MIT (`LICENSE`); bundled notices in `THIRD_PARTY_LICENSES.txt` and the file headers |
| Tools exports used | `describeCitation`, `annotateMarkers` (with `noteContext`), `collectMarkerTags`, `markerKind`, `formatRecordId`, `migrateCitationCues` |

To update: download the release tarball, check it against the release's `SHA256SUMS`, and copy
the three bundles from `package/dist/`, `LICENSE`, and `THIRD_PARTY_LICENSES.txt` from it;
update this table, run `npm test`, and note it in `CHANGELOG.md`. Never edit the bundle here; changes go to
citation.inator.
