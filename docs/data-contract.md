# The data contract (0.1)

draft.inator's blocks run in the browser and know nothing about the host site's build. The host gives them data as
globals, written by its build into one script loaded after Sveltia and before the blocks.

## What the host provides

### `window.DRAFT_WORKS`: the works a writer can cite

```js
window.DRAFT_WORKS = [
  { "id": "bell-1992-ritual", "note": "Bell 1992", "title": "Ritual Theory, Ritual Practice", "year": 1992 },
  ...
]
```

| Field | Required | Meaning |
|---|---|---|
| `id` | yes | The record id the marker cites (citation.inator's record id: a slug or a DOI) |
| `note` | yes | A short human description, as citation.inator's `describeCitation(id, cache)` gives it ("Bell 1992"; "Ainsworth et al. 1978") |
| `title` | yes | Shown in the picker beside the note; `""` is allowed |
| `year` | no | For sorting and search |

Every work a page already cites must be in the list, including works not yet resolved to a reference; give those
their in-text wording as `note`, so an existing marker never opens with a blank.

In korazonresearch.org the build makes this by running citation.inator's `describeCitation` (from
`citation-inator/tools`) in Node over every record. Any site can make it with `draft-inator works` (`docs/tools.md`),
which does the same from a citation.inator cache. Use the same citation style as the site's build, so notes match.

### `window.DRAFT_TOPICS`: the topics a citation can be tagged with

```js
window.DRAFT_TOPICS = [ { "id": "ritual-theory", "label": "Theory › Ritual theory" }, ... ]
```

Optional. With none, the Topics field offers nothing and tags already in markers are kept.

## What the blocks write

### Cite

citation.inator's marker grammar (0.2.0):

```
{citation <id> | note:"Bell 1992" | locator:12 | prefix:"see also" | form:narrative | tags:a,b; <id2> | ...}
```

- Several works are separated by `;`, options by `|`. Values with `;|"{}\:` or edge spaces are quoted; `\` escapes.
- `note:` is always written and always quoted; it is refreshed from `DRAFT_WORKS` on every save.
- Options the form doesn't show (`label:`, fallback words, anything newer) are kept as written, in place.
- The marker's own option order is kept, and an option written quoted stays quoted.
- `{citation endnote}` (and `{citation endnote | …}`), `{citation list …}`, `{citation nocite …}`, `{citation evidence}`,
  and `{citation credit}` are not citations of a work, and the block leaves them alone. A work whose id only starts
  with one of those words (`list-2001`) is a citation. This follows citation.inator exactly and is tested against its
  `markerKind` (`test/conformance.test.js`).
- `{cite …}` (citation.inator's short form) and a site's own `citationKeyword` are not opened by the block yet; they
  are left as written.

Guarantee (tested): reading a marker and writing it back changes nothing but its `note:`, and a second pass changes
nothing.

## Changes to this contract

- 0.2 (additive): `draft-inator works` produces `works.js`; the skipped directives now match citation.inator exactly.


Additive only within 0.x where possible. A breaking change bumps the minor version and is listed in the roadmap.
