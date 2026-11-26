# The data contract (0.5)

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

### `window.DRAFT_COLLECTIONS`: what a page's front matter holds (0.5)

```js
window.DRAFT_COLLECTIONS = [
  { "name": "essays", "label": "Essays", "folder": "content/essays", "fields": [
    { "name": "title", "label": "Title" },
    { "name": "authors", "label": "Authors", "widget": "relation", "collection": "people", "multiple": true, "display_fields": ["{{name}}"] },
    { "name": "body", "label": "Body", "widget": "markdown" }
  ] },
  ...
]
```

Optional; only the editor's Details panel reads it (`mountEditor(el, { collection: 'essays' })`). The format is
Sveltia CMS's `collections`, so a site with a Sveltia config passes its collections as they are (JSON, or YAML parsed
by its build). Of each field the panel reads `name`, `label`, `widget` (default `string`), `required` (default true),
`hint`, `pattern`, `options`, `multiple`, `min`, `max`, `value_type`, `time_format`, and, for relations,
`collection`, `value_field` (default `{{slug}}`), and `display_fields`. Anything else is ignored, not an error.

It edits the widgets `string`, `text`, `number`, `boolean`, `datetime`, `date`, `select`, `relation`, `image`,
`file`, and `list` (of plain values). Other fields (`object`, a list of objects, `code`, a site's own widget) and any
value too complex for a form are shown as kept and written back exactly as they were; so are keys the collection
doesn't describe. A `markdown` field named `body` is the text being written.

### `window.DRAFT_ENTRIES`: what a relation field can point to (0.5)

```js
window.DRAFT_ENTRIES = {
  "people": [ { "slug": "mara-ellison", "name": "Mara Ellison" }, ... ],
  "topics": [ { "id": "ritual-theory", "label": "Theory › Ritual theory" }, ... ]
}
```

Optional. Entries by collection name, each `{ slug, ...fields }` (whatever `value_field` and `display_fields` name).
A relation whose collection has no entries offers nothing, and values already in a page are kept and shown.

### `window.DRAFT_CITATION_KEYWORD`: the site's citation keyword (0.5.1)

```js
window.DRAFT_CITATION_KEYWORD = 'cite';   // the default; set it before src/blocks/citation.js loads
```

One word, lowercase letters and hyphens. The Cite block reads and writes markers with it, the importer and the
hand-typed check look for it, and every call into citation.inator passes it as `citationKeyword`. A site has one
keyword, with no alias (cite.inator 0.5.1; issue #33). `draft-inator migrate` moves a site's pages from an old
keyword. The block reports the keyword it uses as `window.DRAFT_CITATION.keyword`.

## What the blocks write

### Cite

cite.inator's marker grammar (0.5.1), shown with the default keyword:

```
{cite <id> | note:"Bell 1992" | locator:12 | prefix:"see also" | form:narrative | tags:a,b; <id2> | ...}
```

- Several works are separated by `;`, options by `|`; cite.inator 0.5.1 also reads options separated by whitespace
  alone (`{cite bell-1992-ritual locator:12}`). The block keeps the separators a marker was written with, and writes
  pipes in a new marker. Values with `;|"{}\:` or edge spaces are quoted; `\` escapes.
- `note:` is always written and always quoted; it is refreshed from `DRAFT_WORKS` on every save.
- A work's id may be written bare (`bell-1992-ritual`) or explicitly local (`local:bell-1992-ritual`); both are the
  same work, looked up in `DRAFT_WORKS` by the bare id. An unchanged work is written back in the form it had. A newly
  chosen work is written bare, unless the bare id is a directive word (`endnote`, `list`, `nocite`, `evidence`,
  `credit`, `tags`), which is written `local:list`.
- Options the form doesn't show (`label:`, fallback words, anything newer) are kept as written, in place.
- **Changing the work an item cites** (0.4.1): in draft.inator's own form, the old work's page and other options are
  set aside and shown, and kept only if the writer chooses "Keep them"; going back to the old work restores them. A
  placeholder's `unresolved:` is never carried to the work that replaces it (that is what finishing it means). In
  Sveltia's form, which can't ask, the fields stay visible for the writer to clear; only `unresolved:` is dropped.
- The marker's own option order is kept, and an option written quoted stays quoted.
- `{cite endnote}` (and `{cite endnote | …}`), `{cite list …}`, `{cite nocite …}`, `{cite tags …}`,
  `{cite evidence}`, and `{cite credit}` are not citations of a work, and the block leaves them alone. A work whose id only starts
  with one of those words (`list-2001`) is a citation. This follows citation.inator exactly and is tested against its
  `markerKind` (`test/conformance.test.js`).
- A placeholder from an import, `{cite pending-… | unresolved:"(Rivera, 2020)"}`, is a citation of a staged work
  and opens in the form like any other; its `unresolved:` option is kept as written.

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
- A value may hold whole `{…}` markers (up to two deep) and `$…$` maths (0.4.1). Inside them nothing is an escape,
  and their quotes and pipes don't end the value, so a caption can cite a work, refer to an equation, or hold maths:
  `caption:"Size against $\frac{a}{b}$ {cite guest-2006 | note:"Guest et al. 2006"}"`. A host renders a caption's
  citations, maths, and `{ref …}`s as it does the article's, and counts its citations as cited.
- Options the form doesn't show, and values the menus don't offer (`align:middle`), are kept as written, in place.
  Renderers should ignore options they don't know.
- The image's provenance is in the tag, so every change to it shows in a diff. A host that keeps provenance records
  builds them from the tags; a block can't write a second file.
- A `{figure …}` inside a paragraph or in code is not a block, and the block leaves it alone.

Guarantee (tested, and checked in Sveltia 0.262.4): reading a figure and writing it back changes nothing, and a
second pass changes nothing.

- `label:fig:depth` (0.4.1) names the figure for cross-references. It's read only when it's a valid label
  (`kind:name`, lowercase letters, digits, and hyphens); anything else is kept as another option, as before.

### Equations and cross-references (0.4.1)

The article's own Markdown, not a block, so Sveltia leaves it as text and nothing round-trips through a form:

```
Inline $p \ge 0.10$ and displayed maths, with an optional label:

$$ n \ge \frac{\ln(1-C)}{\ln(1-p)} $$ {#eq:sample-size}

As {ref eq:sample-size} shows … and {ref fig:depth}.
```

- Maths is LaTeX between `$…$` (inline) or `$$…$$` (displayed). A `$` opens maths only before a non-space and closes
  only after a non-space and not before a digit (Pandoc's rule), so "$5 and $10" stays prose; `\$` is a dollar sign.
  Code is never maths.
- A label follows a displayed equation as `{#kind:name}` (Pandoc's form); figures take `label:`. Only labelled
  equations and figures are numbered, by kind, in the order they appear.
- `{ref kind:name}` reads as the label's number, worded by the site ("Eq. 3", "Figure 2" by default). **Files hold
  labels, never numbers.** A host renders the same way with `src/editor/crossref.js`, and `draft-inator check` fails
  on maths that doesn't parse, a reference to a missing label, or a label used twice.

### Front matter (0.5)

With the Details panel, the editor writes a page's YAML front matter. Only the keys a writer changes are written,
each in the style it had (plain or quoted, flow `[a, b]` or block `- a` list, `|` text), with its comment and line
endings. Keys the panel doesn't edit, comments, blank lines, and order stay byte for byte. A cleared field the page
didn't have is left out; new keys go at the end. A value that would read as something else (`"true"`, `"1992"`,
`"a: b"`) is quoted.

Guarantee (tested, `test/yaml.test.js` and `test/details.test.js`): writing a page's own values back changes nothing,
and one change touches only that key's lines.

## Changes to this contract

- 0.2 (additive): `draft-inator works` produces `works.js`; the skipped directives now match citation.inator exactly.
- 0.3 (additive): the Figure block's `{figure …}` tag.
- 0.4 (additive): `local:` ids are read as the bare work id and kept as written.
- 0.5 (additive): `DRAFT_COLLECTIONS` and `DRAFT_ENTRIES`, for the Details panel. What the editor writes in front
  matter is below.
- 0.5.1 (**breaking**, Randal's decision on #33): one configured keyword, `DRAFT_CITATION_KEYWORD`, default `cite`.
  Markers written `{citation …}` are no longer read under the default; run `draft-inator migrate` (or set the keyword
  to `citation`). Also: whitespace-separated options, the `tags` directive, and import placeholders.
- 0.4.1 (additive): equations (`$…$`, `$$…$$ {#eq:…}`), a figure's `label:`, and `{ref …}`.


- 0.4.1: replacing a work no longer carries the old work's options silently (above).
- 0.4.1 (additive): a figure's values may hold whole `{…}` markers and `$…$` maths, kept as written.

Additive only within 0.x where possible. A breaking change bumps the minor version and is listed in the roadmap.
