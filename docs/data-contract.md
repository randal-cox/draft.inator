# The data contract (0.3)

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
- A work's id may be written bare (`bell-1992-ritual`) or explicitly local (`local:bell-1992-ritual`); both are the
  same work, looked up in `DRAFT_WORKS` by the bare id. An unchanged work is written back in the form it had. A newly
  chosen work is written bare, unless the bare id is a directive word (`endnote`, `list`, `nocite`, `evidence`,
  `credit`), which is written `local:list`. (Issue #26 may replace this rule with one shared with citation.inator.)
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

### Figure (0.3)

One line of its own (a block, not inline):

```
{figure /uploads/mask.jpg | alt:"A carved wooden mask" | caption:"Mask, about 1910" | credit:"Ann Cox" |
 licence:"CC BY 4.0" | source:"https://example.org/mask" | align:right | width:half | wrap:yes}
```

(Shown on two lines here; in a page it is one line.)

| Option | Meaning |
|---|---|
| first part | The image's path, as Sveltia's `public_folder` writes it (`/uploads/…`). Quoted if it has spaces |
| `alt` | What the image shows, for people who can't see it. The form requires it |
| `caption` | Shown under the image |
| `credit`, `licence`, `source` | The image's provenance: who made it, on what terms, and where it came from |
| `align` | `left`, `right`, `centre`, `wide`, or `full`. None: the site's default |
| `width` | `third`, `half`, `two-thirds`, or `full`. None: the site's default |
| `wrap` | `yes`: text wraps around the image. `no` or none: it doesn't |

- The same notation as citation markers: options separated by `|`, values quoted when they hold `;|"{}\:` or edge
  spaces, `\` escapes.
- Options the form doesn't show, and values the menus don't offer (`align:middle`), are kept as written, in place.
  Renderers should ignore options they don't know.
- The image's provenance is in the tag, so every change to it shows in a diff. A host that keeps provenance records
  builds them from the tags; a block can't write a second file.
- A `{figure …}` inside a paragraph or in code is not a block, and the block leaves it alone.

Guarantee (tested, and checked in Sveltia 0.262.4): reading a figure and writing it back changes nothing, and a
second pass changes nothing.

## Changes to this contract

- 0.2 (additive): `draft-inator works` produces `works.js`; the skipped directives now match citation.inator exactly.
- 0.3 (additive): the Figure block's `{figure …}` tag.
- 0.4 (additive): `local:` ids are read as the bare work id and kept as written.


Additive only within 0.x where possible. A breaking change bumps the minor version and is listed in the roadmap.
