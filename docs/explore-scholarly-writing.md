# Exploration: a scholarly writing environment ("write.inator")

Status: **exploration only** (issue #35, 25 Nov 2026). Nothing here is a commitment to build, a milestone, or a new
repository. It answers one question: are the capabilities below ordinary draft.inator improvements, a scholarly
configuration of draft.inator, or a larger product built from draft.inator and cite.inator?

## The workflow being assessed

An author writes a paper in Markdown, inserts figures and equations with stable labels, and cites the passages that
support each claim. They revise after review. Moving an equation or figure renumbers it and every reference to it.
Hovering a citation connects the claim to its evidence. Reviewers comment; the author responds to each comment and
links the change that addresses it. Export keeps the manuscript, its sources, and its assets together.

## Recommendation: draft.inator improvements, assembled as a scholarly preset, not a new product yet

Every capability on the list lands on a seam draft.inator already has. A separate product would have to duplicate the
editor, the preview, the save workflow, and the forms, or depend on all of them anyway. Three repositories coordinating
through issues is already the expensive part of this project; a fourth should earn its place.

So the proposal is:

1. **Build the pieces as draft.inator features**, each useful on an ordinary site too: labelled figures and
   cross-references help any long article, and manuscript checks are the same kind of thing as `draft-inator notes`.
2. **Assemble them as a scholarly preset**: one configuration (blocks enabled, checks on, a manuscript layout, review
   files) with its own demo. "write.inator" can be the preset's name and demo, with no separate codebase.
3. **Revisit a separate product only if the experiment shows a different host.** The trigger would be evidence that
   the unit of work is a *project folder* (several chapter files, raw data, derived images, a review history), edited
   on the author's own computer and published mainly as PDF or Word, rather than a *page in a site's git repository*
   published as HTML. That is a different product, with a different save model, and it would be worth its own name.
   Until then, it isn't.

## What draft.inator has now (code-informed)

| Capability | Where it is | Use for scholarly writing |
|---|---|---|
| Markdown editor with live preview, layouts, plain mode | `src/editor/editor.js` | The writing surface, unchanged |
| Blocks with forms, round-trip safe (`fromBlock` / `toBlock` / `toPreview`) | `src/blocks/*.js`, `src/editor/forms.js` | Equations and cross-references are new blocks of the same shape |
| One pass over the text that finds every block (`findBlocks`, `renderArticle`) | `src/editor/editor.js` | The place to number figures, equations, and tables, and resolve references |
| Figures with alt, caption, credit, licence, source | `src/blocks/figure.js` | Needs only a `label:` option to be cross-referenceable |
| Citations, import, site works, compiled preview | `src/blocks/citation.js`, `src/editor/importer.js`, cite.inator | Already the citation half of a manuscript tool |
| Front matter edited byte for byte, Details panel from collection fields | `src/editor/yaml.js`, `details.js` | Manuscript metadata (authors, affiliations, keywords, review round) with no new code |
| Saving as a draft pull request | `src/editor/github.js` | Git history is the revision record; a review round can be a pull request |
| Checks that run in a pull request | `tools/` (`draft-inator notes`, `tags`, `works`) | The home for manuscript checks |

## What's missing

| Missing | Size | Notes |
|---|---|---|
| Labels and cross-references: `label:` on figures, an equation block, numbered tables, and a reference marker that renders "Figure 2" | Medium | Numbering is one more pass in `renderArticle`; the check is one more tool |
| Equations with live preview | Medium | Needs a maths renderer (KaTeX, MIT, vendored like `marked`); no build step needed |
| Manuscript checks: broken or unused references, uncited figures, undefined abbreviations, open TODOs | Small to medium | `draft-inator check`, reusing the tools' content scanning |
| Projects with nested asset folders, original and derived images | Large | This is roadmap 0.7, the media library; scholarly writing raises its priority, not its design |
| Anchored comments, human and optional AI | Large | Needs an anchor that survives edits (below) |
| Reviewer-response workflow | Medium to large | Explicitly endorsed by Randal; new data, new panel (below) |
| PDF and Word output | Large outside the browser | Pandoc in the site's build, from portable Markdown; print CSS for a first PDF |

## What belongs to cite.inator

- **Citation grammar and evidence.** Claim-to-passage links and their relation (supports, qualifies, challenges) are
  bibliographic evidence. They belong in cite.inator's notation and records, with its existing `{citation evidence}`
  and provenance as the starting point. draft.inator only gives the Cite block's form a field for it.
- **Hover from claim to evidence.** cite.inator's reader inspector already owns hover panels.
- **Bibliography export** for Word and PDF (CSL JSON, BibTeX).
- **Not cross-references.** "See Figure 2" is not bibliographic. It belongs to draft.inator, which owns figures. It
  must coexist with cite.inator's grammar without either one reading the other's markers. cite.inator already leaves
  other keywords as text, so the contract is to keep it that way and test it.

## New contracts this would need

1. **Anchors.** A stable id for a block or passage that survives edits around it, shared by comments, reviewer
   responses, cross-references, and evidence. This is the foundation; everything else hangs from it. It should be an
   option in the text (`label:` on blocks, an inline anchor marker for prose), not an offset, so it survives any editor.
2. **The evidence relation vocabulary** (supports, qualifies, challenges): cite.inator's, written down once.
3. **A review file** beside the manuscript: per round, each reviewer comment (anchored), the author's response, its
   status (open, addressed, declined with a reason), and links to the changes (commit or pull request). Its export is
   the response-to-reviewers letter. Linking a change records what the author did; it never implies the change is
   scientifically adequate, and the export should say so.
4. **The portable bundle.** cite.inator's article bundle (source plus cache) extended with assets and the review
   file.

## The smallest useful experiment

**Labelled figures, cross-references, and a check, in the existing editor demo.** Concretely:

- a `label:` option on the Figure block (round-trip tested, like every option);
- a reference marker that the preview renders as "Figure 2", updating when figures move;
- `draft-inator check`, which fails on a reference to a missing label and warns on a figure nobody references;
- the sample essay rewritten to use them.

It is small (no new dependency), useful on any site, and it builds the two things everything else needs: the
document-wide numbering pass and the anchor convention. If it goes well, the second experiment is the
**reviewer-response file and panel** on the same sample manuscript, because Randal has endorsed it and nothing else on
the list is as distinctive.

**Explicitly excluded from the experiment:** a new repository; equations (they follow once numbering exists); AI
criticism (optional, behind rules, measured first, per this project's rules); AI-authorship detection (it would need
its own justification, and is not proposed); PDF or Word export; real-time collaboration; LaTeX authoring beyond
maths.

## Decisions this needs

- Randal: is the recommendation (draft.inator features, a scholarly preset, revisit after the experiment) right?
- Randal: is the first experiment cross-references, or the reviewer-response workflow first?
- Theandra: the evidence relation vocabulary, and confirming that cite.inator leaves a cross-reference marker alone.
