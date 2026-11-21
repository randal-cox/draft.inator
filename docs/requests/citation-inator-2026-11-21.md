# For Theandra: two requests from draft.inator (21 Nov 2026)

Paste-ready. Randal passes this on as text.

---

Hi Theandra,

draft.inator's build tools now run citation.inator 0.2.0's tools bundle (`dist/citation-tools.mjs`):
`annotateMarkers` keeps notes current, `collectMarkerTags` totals tags, and `describeCitation` makes the editor's works
list. Thank you: it dropped in with nothing to install. Two requests came out of it.

**1. Tell a citation from a directive (small).** The Cite block in the editor has to decide which `{citation …}`
markers cite a work and which are directives (`endnote`, `list`, `nocite`, `evidence`, `credit`). Today it keeps its
own copy of your rules, and we test that copy against `describeCitation` (a directive comes back `malformed`). That
test caught us skipping `{citation list-2001}`, which you treat as a citation. We'd rather ask you than copy you.
Could the tools bundle (and the browser bundle) export one of these?

- `markerKind(raw, { citationKeyword })` returning `"citation"`, `"endnote"`, `"list"`, `"nocite"`, `"annotation"`,
  or `"malformed"`; or
- `scanCitationMarkers` and `parseDirectives`, as they are in `compiler.mjs`, which would also do.

Either would also cover the `{cite …}` short form.

**2. Notes without year letters (a question first).** When an article cites two works by the same author and year,
`annotateMarkers` writes `note:"Cox 1995a"`, which is right for that article. The editor's works list comes from
`describeCitation`, which has no article in view and gives `Cox 1995`. So saving the marker in the editor changes the
note back, and the next check calls it stale. Would an `annotateMarkers` option that writes the context-free
description (no year letters) make sense to you, given that notes are for editors reading source and not for readers?
Or would you rather we keep the letters the build wrote? Either is fine with us; we'd like your view before choosing.

Thanks,
Randal (for draft.inator)
