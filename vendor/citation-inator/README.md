# cite.inator tools (vendored)

Three of citation.inator's self-contained browser bundles, copied unchanged so draft.inator's editor, build tools, and
tests need nothing installed:

- `citation-tools.mjs`: describing works, refreshing notes, collecting tags, classifying markers, writing ids.
- `citation-import.mjs`: finding author–date citations and reference lists, and reviewed conversion (the importer).
- `citation-compiler.mjs`: compiling an article's citations and endnotes in the browser (the editor's preview).

| | |
|---|---|
| Version | **0.6.0-preview.7**, for testing on the `feature/cue` branch only (commit `1f73d336bf666382c142ea170bfa06aae4d386de`, branch `codex/cite-0.6-zotero`). Not for `main` until 0.6 is released |
| Source | `dist/` at that commit (tracked in citation.inator's repository) |
| Bundle SHA-256 | `citation-tools.mjs` `58daa90ade9fd10c98ed5fff4f2cf265435214d4ad021a58747b208ac4f5fe5f`; `citation-import.mjs` `54c52eb4725b4d8fcfd17e5251671010cb3300d6a490137f03ced78e5ddc9c1a`; `citation-compiler.mjs` `4b786a235a9ab61f7ecaf61be0f38f17968f1ff51b76f91b180787c1a6830353` |
| Licence | MIT (`LICENSE`); bundled notices in `THIRD_PARTY_LICENSES.txt` and the file headers |
| Tools exports used | `describeCitation`, `annotateMarkers` (with `noteContext`), `collectMarkerTags`, `markerKind`, `formatRecordId`, `migrateCitationCues` |

To update: download the release tarball, check it against the release's `SHA256SUMS`, and copy
the three bundles from `package/dist/`, `LICENSE`, and `THIRD_PARTY_LICENSES.txt` from it;
update this table, run `npm test`, and note it in `CHANGELOG.md`. Never edit the bundle here; changes go to
citation.inator.
