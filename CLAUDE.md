# CLAUDE.md

Guidance for Claude working on draft.inator.

## What this is

Blocks for Sveltia CMS (citations first), built around citation.inator. Read `docs/prd.md` and `docs/roadmap.md`
first; `docs/origin.md` says what came from korazonresearch.org and what is still site-specific.

## Rules

- **Round-trip safety is the first requirement.** Every block gets a test that reads tags and writes them back
  unchanged except for fields the block owns (the Cite block owns `note:`), and that a second pass changes nothing.
  Never drop an option the block doesn't understand.
- **Algorithms first, AI last, with a way down.** No language model in any path unless measured to be needed, behind
  rules, optional, and the tool works the same without it.
- **Nothing guessed silently.** Inferred matches go to a review a person confirms.
- **No inline event handlers** (host sites run a strict Content Security Policy). Keyboard and screen-reader usable.
- **Plain browser JavaScript, no build step,** for `src/`. Tests on Node 22 alone: `npm test`.
- **The data contract** (`docs/data-contract.md`) is the only coupling to a host; change it additively, and record
  changes there.
- Work on a branch and open a pull request; Randal reviews and merges. Don't merge your own.
- **Releasing:** bump `version` in `package.json` and add a `## X.Y.Z · date · title` section to `CHANGELOG.md` in the
  same pull request. When it merges, `.github/workflows/release.yml` tags it and publishes the release with that
  section as its notes. Versions with a `-` are never released.
- Base every pull request on `main`; don't stack them.
- House style for prose: Oxford comma, including before "&"; sentence case for headings; "consent" lowercase except
  at the start of a sentence or in a title.
- Anything for Theandra (citation.inator) is given to Randal as paste-ready text.
