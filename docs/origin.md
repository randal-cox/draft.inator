# Where this came from, and what is still site-specific

Everything here started in korazonresearch.org (repository `Teatro-Korazon/korazonresearch`, private), 18–21 Nov
2026. That repository is the first host and keeps running its own copy until it takes a draft.inator release.

| Here | In korazonresearch.org | Notes |
|---|---|---|
| `src/blocks/citation.js` | `admin/draft-inator/citation.js` | Same code (the header comment differs). Fixes go here first, then to the host. |
| `test/` | `tests/test_draft_inator.py` | The host's test runs the block over its own 163 real markers; ours uses synthetic fixtures. |
| `docs/data-contract.md` | `kr_build/draft_inator/__init__.py` (`works()`, `works_js()`) | The host's build writes `works.js`: every reference record, its note from citation.inator's `describeCitation`, and the reference topics. |
| `docs/prd.md`, `docs/roadmap.md` | `docs/process/editor-plan.md`, `docs/process/roadmap.md` | The plan Randal approved on 21 Nov 2026: keep Sveltia, add our own blocks, Cite first. |
| `docs/import-sketch.md` | `docs/process/citation-import-sketch.md` | Copied as it was. Paths in it (`data/references.yaml`, `/admin/cite.html`) are the host's. |
| (none yet) | `docs/process/citation-inator-requests-2026-11-20.md` | The F1–F5 requests to citation.inator that draft.inator relies on. |

## Still tied to the host (to remove before 1.0)

- **The works list's shape** comes from the host's records (`content/references/<id>.yml`, with `cited_as` for works
  not yet resolved). The contract is generic; the producer isn't. A reference producer in JS, reading citation.inator
  records and a cache, would let any site generate `works.js`.
- **The topics** are the host's reference-topic list (6 groups, 34 topics, 9 kinds), shown as "Group › Topic".
- **The skipped marker words** (`endnote`, `list`, `nocite`, `evidence`, `credit`) match citation.inator 0.2.0's
  directives; they should come from citation.inator, not a hard-coded list.
- **Sign-in, page history, and the route map** are the host's (a Cloudflare Pages function for GitHub sign-in;
  `/admin/history.html`; `kr_build/routes.py`). The page-link block will need a route map in the data contract.
- **The Sveltia version** (0.262.4) is pinned by the host.

## People

- Randal Cox: owner; directs the work.
- Theandra: citation.inator, the citation library under the Cite block. She receives requests as pasted text (Randal
  copies files; he doesn't share links).
- Christopher Fuelling: writer and curator at korazonresearch.org, the first user.
