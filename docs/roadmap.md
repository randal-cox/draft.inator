# Roadmap

Ordered by what writers at the first host (korazonresearch.org) need next. Each milestone ends with a tagged release
and the host taking it.

## 0.1: Cite (done in the host; packaging here)

- [x] Cite block: pick works, page, prefix, form, topics; note from citation.inator; round-trip safe (163 markers).
- [x] Data contract: `DRAFT_WORKS`, `DRAFT_TOPICS`.
- [x] Tests on Node alone: round-trip, second pass stable, quoting kept, option order kept, unknown options kept.
- [ ] Licence decided; first tag `v0.1.0`; korazonresearch.org loads the block from a release instead of its own copy.
- [ ] A changelog.

## 0.2: Notes and tags kept current (with citation.inator 0.2+)

- [ ] Host build step: `annotateMarkers` over all content; check that fails a pull request with a stale note.
- [ ] Tag totals from markers (`collectMarkerTags`), with curator add/block per work; handed to citation.inator as
      record `tags`.
- [ ] Reference renderer for `{citation …}`: a thin call into citation.inator's compiler (documented, not
      reimplemented).

## 0.3: Figure

- [ ] Figure block (upload or choose; alt text, caption, credit, licence; alignment; width; wrap).
- [ ] Provenance record written from the form (korazonresearch.org keeps one per image).
- [ ] Renderer: `<figure>` with sized copies.
- [ ] Decide on Sveltia vs. the TipTap fallback from what this block needs.

## 0.4: Table, Embed, Callout

- [ ] Table with caption; raw-HTML escape hatch.
- [ ] Embed (YouTube, Vimeo) with the privacy player.
- [ ] Callout and pull quote.

## 0.5: Links and audience

- [ ] Page link and glossary link by id (pages from the host's route map; glossary from the host's Lexicon).
- [ ] Audience block (`data-for` roles).

## 0.6: Preview like the site

- [ ] Site fonts and styles in the preview (`registerPreviewStyle`); blocks drawn as the page will show them.

## 1.0: A plug-in other sites use

- [ ] One site file; nothing host-specific left in the blocks (see `origin.md`).
- [ ] JS reference renderers; packaging decided; docs for a new site.
- [ ] A second site adopts it.

## Stretch: Import citations (with citation.inator F4)

- [ ] In-text citation parsing and matching against the document's own reference list (citation.inator).
- [ ] Crossref bibliographic search (citation.inator).
- [ ] Import page: paste or upload; review table; confirm; one pull request.
- [ ] Measured test set of real pasted references; a parser plug-in beyond rules only if the numbers call for it.

## Later, when someone needs them

- Gallery, columns, reusable snippets, a site-wide link picker for external sources.
- Glossary auto-linking by use (Randal's note, 20 Nov 2026: link a term's uses, possibly found by embeddings).
