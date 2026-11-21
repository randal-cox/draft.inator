# draft.inator

Writing tools for sites whose content lives in a git repository and is edited in a browser.
draft.inator adds the blocks writers expect from WordPress or Joomla (citations, figures, tables, embeds,
callouts, links) to [Sveltia CMS](https://github.com/sveltia/sveltia-cms), with
[citation.inator](https://github.com/randal-cox/citation.inator) built in for scholarly citation.

> "Behold, my draft.inator! Now the entire Tri-State Area will have to address my reviewer comments!" (Theandra)

**Status: 0.1.0-dev.** One block works: **Cite**. It was built inside korazonresearch.org (Korazon Research), where it
reads and writes every one of that site's 163 citation markers without changing what readers see. This repository is
where it becomes a plug-in any site can use.

## What's here

| Path | What |
|---|---|
| `src/blocks/citation.js` | The Cite block: a Sveltia editor component that reads and writes citation.inator markers |
| `test/` | `npm test` (Node 22, no dependencies): round-trip, quoting, option order, and preview checks |
| `docs/prd.md` | **The product requirements**: who it's for, what it does, what it won't do |
| `docs/roadmap.md` | Milestones, in order |
| `docs/data-contract.md` | What a host site provides (the works list, the topics) and what the blocks write |
| `docs/origin.md` | Where each piece came from in korazonresearch.org, and what is still site-specific |
| `docs/import-sketch.md` | Feasibility sketch: turning pasted APA/Chicago citations into markers |
| `examples/sveltia/` | How a site loads the blocks |

## Try it

```bash
npm test
```

## Using it in a site (today)

See `examples/sveltia/index.html`. In short: load Sveltia, then a `works.js` your build writes
(`window.DRAFT_WORKS`, `window.DRAFT_TOPICS`; see `docs/data-contract.md`), then `src/blocks/citation.js`.

## Related

- citation.inator (Theandra): the citation compiler and query API the Cite block depends on.
- korazonresearch.org: the first host site, and the source of this code.
