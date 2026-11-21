# draft.inator: product requirements (draft, 21 Nov 2026)

Owner: Randal Cox. First host: korazonresearch.org (Korazon Research). Companion library: citation.inator (Theandra).

## The problem

Static sites built from a git repository are fast, cheap, private by default, and every change is reviewable. Their
weak spot is writing. A git-based CMS such as Sveltia gives writers a form and a Markdown editor, but none of what
WordPress or Joomla writers take for granted: placing an image with a caption, a table, a video, a callout, a link to
another page that survives the page moving. And none of those systems does what a scholarly site most needs:
**citations** that a writer can add by picking a work, that stay correct when the record changes, and that compile
into proper references.

Writers at korazonresearch.org (scholars, artists, & practitioners, most of them busy and not technical) said it
plainly: "we will rapidly need lots of other tools, in particular images (alignment, wrapping, captions, etc.),
tables, etc." (Randal, 21 Nov 2026).

## Who it's for

| Who | What they need |
|---|---|
| **Writers** (essayists, curators) | Add citations, images, tables, and links without learning a markup; see the page roughly as readers will |
| **Reviewers** (curators, admins) | Every change as a readable diff in a pull request with a preview; nothing hidden in opaque JSON |
| **Site builders** | Drop the blocks into a Sveltia site, tell them where content lives, render the tags in their build |
| **citation.inator sites** | A writing front end for citation.inator's markers and query API |

## What it is

A set of **blocks** for Sveltia CMS's text editor, plus the **build-side renderers** for the tags they write, plus a
**site file** that configures them.

- Each block is a Sveltia editor component (`registerEditorComponent`): a form, a pattern that finds the block in
  the text, a writer, and a preview.
- Each block saves as a short, readable tag in the Markdown (`{citation …}`, `{figure …}`, `{video …}`), never as
  HTML soup, so files stay readable and diffs reviewable.
- The host's build turns tags into HTML. draft.inator ships a reference renderer for each tag; a site can use it or
  its own.

## Principles

1. **Round-trip safety first.** Opening and saving a page must never change what readers see. Every block has a test
   that reads every existing tag in a corpus and writes it back unchanged (the Cite block does this for all 163 of
   korazonresearch.org's markers).
2. **Plain text in the file.** Tags a person can read and edit by hand. Unknown options are kept, never dropped.
3. **A full article editor that real sites use** (Randal, 21 Nov 2026). Sveltia is one host for the blocks, and the
   current one, but draft.inator's editor is meant to cover every collection, entities included; draft.inator's own editor (begun as the live editor demo, 0.4) is another. Whichever a site uses, the
   blocks, the tags, and the round-trip guarantee are the same. Choices between them are made on evidence, not taste.
4. **Algorithms first, AI last, always a way down.** Matching, parsing, and lookups use rules and open services
   (Crossref, Open Library). A language model, if ever used, is an optional plug-in behind the rules, measured
   before it's added, with a cost limit, and the tool works the same when it's off. (Randal, 20 Nov 2026.)
5. **Nothing guessed silently.** Anything inferred (a DOI match, a parsed reference) goes through a review a person
   confirms, showing why each match was made. A wrong DOI that looks right is worse than none.
6. **Accessible and safe.** Every form usable by keyboard and screen reader. No inline event handlers (sites run a
   strict Content Security Policy). No tracking; lookups send only references, never the writer's text, and identify
   with a generic project contact, never a person's address.
7. **Small, plain dependencies.** The blocks are plain browser JavaScript with no build step; tests run on Node alone.

## Requirements

### Blocks (in order; details in the roadmap)

| # | Block | Must | Saves as |
|---|---|---|---|
| 1 | **Cite** (done, 0.1) | Search works by author, title, or year; several works per citation; page, prefix, form, topics; the note from citation.inator; existing markers open in the form; round-trip safe | `{citation id \| note:"…" \| …}` |
| 2 | **Figure** | Upload or choose an image; alt text (required), caption, credit, licence; alignment (left, right, centre, wide, full); width (third, half, two thirds, full); wrap or not; writes a provenance record | `{figure …}` |
| 3 | **Table** | Header row, caption; simple tables in the editor, raw HTML as an escape hatch | Markdown table in `{table …}` |
| 4 | **Embed** | YouTube or Vimeo by address; privacy player (no third-party load until play) | `{video youtube:ID}` |
| 5 | **Callout and pull quote** | Note, warning, pull quote, in the site's styles | `{callout …}` |
| 6 | **Page and glossary links** | Search the site's pages or glossary terms; a link by id that survives a page moving | `{link page-id}` |
| 7 | **Audience** | Show a passage only to readers who chose a role | `{for roles …}` |
| 8 | **Gallery, columns** | When a writer needs them | |
| 9 | **Preview like the site** | Site fonts and styles in the preview; blocks drawn as the page will show them | (`registerPreviewStyle`) |

### Citations, with citation.inator

- **Notes stay current.** A host build step (`annotateMarkers`) refreshes every marker's `note:`; a check fails a
  pull request with a stale note. (citation.inator F3, delivered in 0.2.0.)
- **Tags given while citing** accumulate into a work's topics (citation.inator F5: `tags:` in markers,
  `collectMarkerTags`). The block writes them; the host totals them.
- **Works editable in the CMS.** One file per work, so writers can add a work they want to cite, with its topics and
  kind. (korazonresearch.org did this on 21 Nov 2026: `content/references/<id>.yml`.)
- **Import** (stretch): paste an essay with APA or Chicago citations and a reference list; get markers and new
  records, after a review table. Feasibility and division of labour with citation.inator: `docs/import-sketch.md`
  (citation.inator F4).

### Articles, metadata, and access

The full set is planned in `docs/plan-full-editor.md`: article metadata (authors, dates, status, excerpt, preview image,
tags, SEO, visibility), an article list with search and filters, history and restore, trash, scheduling, and a media
library. **The same editor edits every collection:** people, topics, and tags as well as articles, each with its own
fields, read from the site's collection config (Randal, 21 Nov 2026). **Who may see and edit a page** is part of each
article's metadata: draft.inator exposes the structure and
checks it, and the host enforces reading (Randal, 21 Nov 2026).

### Being a plug-in

- **One site file** (name to be decided; e.g. `draft-inator.yml`): which blocks are on, where uploads go, where
  works and topics come from, how a page id maps to a path.
- **The data contract** (`docs/data-contract.md`) is the only coupling between blocks and host.
- **Reference renderers** for each tag. Language is open (see below); the tags are simple enough to render in any.
- **Packaged** so a site can take a tagged release (vendored file or npm), with a changelog.

## Not doing (for now)

- Visual (WYSIWYG) editing: writers edit Markdown with a live preview (Randal, 21 Nov 2026).
- Video and audio hosting, perhaps for a long time; hosted video comes in through the Embed block.
- A CMS, a host, or sign-in: Sveltia and the host site do those.
- Hosting media: uploads go to the site's repository or its own storage.
- AI-written prose, summaries, or rewrites.

## Measures of success

- korazonresearch.org writers cite, place images, and add tables without asking a developer.
- Zero reader-visible changes from opening and saving any page (tested on every corpus).
- A second site adopts it with only a site file and its build's renderers.
- For import: share of pasted references matched correctly, measured on a kept test set before any AI is considered.

## Open questions

1. ~~**Licence.**~~ Decided: MIT, as citation.inator, so anyone can take it (Randal, 21 Nov 2026).
2. **Renderer language.** korazonresearch.org renders in Python; most static-site builders are JavaScript. Ship JS
   renderers and keep the Python ones in the host? Both?
3. **Packaging.** Vendored tarball (as korazonresearch.org takes citation.inator) or npm? Decided in part (Randal,
   21 Nov 2026): small blocks stay in draft.inator; larger plug-ins (import, perhaps) may become their own projects,
   coupled only through the data contract.
4. **Sveltia's limits.** Does its editor component API carry Figure (uploads inside a component, previews with
   images)? The Figure block is the test; if not, the TipTap fallback.
5. **Where the import page lives.** A page in draft.inator that any host serves under `/admin/`, or host-built?
6. **The works list at scale.** A `select` with ~270 works is fine; at thousands, a search field backed by an index.
