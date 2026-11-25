# Getting started: add draft.inator to a site

For whoever looks after a site's build. By the end, writers have a **Citation** block in the editor and a pull-request
check keeps citations tidy. Try the [demos](https://randal-cox.github.io/draft.inator/demo/) first if
you'd like to see what you're adding.

## What you need

- A site whose pages live in a git repository, edited with [Sveltia CMS](https://github.com/sveltia/sveltia-cms)
  (its `/admin/` page).
- cite.inator in the site's build, with a cache of the works writers cite (`citations.json`). See its
  [integration guide](https://github.com/randal-cox/cite.inator/blob/main/docs/integration.md).
- Node 22 wherever the build runs, for draft.inator's tools.

## 1. Get draft.inator

Take a tagged release, so the site only changes when you choose. Either copy the release's files into the site (as
korazonresearch.org does), or install it from git:

```sh
npm install --save-dev github:randal-cox/draft.inator#v0.2.0
```

(The build tools arrive in 0.2.0; 0.1.0 has the block only.) Nothing else is installed with it: draft.inator has no
dependencies.

## 2. Settings

Create `draft-inator.json` at the top of the site:

```json
{
  "cache": "data/citations.json",
  "style": "chicago-author-date",
  "content": ["content"],
  "topics": "data/topics.json",
  "works": "admin/draft-inator/works.js"
}
```

Use the **same citation style** your build gives cite.inator. Every setting is explained in [the tools guide](tools.md#settings).
`topics` is optional; leave it out and the block's topic field offers nothing.

## 3. Make the works list

```sh
npx draft-inator works --config draft-inator.json
```

This writes `admin/draft-inator/works.js`. Re-run it whenever the cache changes; add it to the build so it always is.
It prints a `note:` for each work cite.inator can't describe yet, with the wording it used instead.

## 4. Load the block in the editor

Copy `src/blocks/citation.js` to `admin/draft-inator/citation.js` and load it after Sveltia and the works list, in
`admin/index.html`:

```html
<script src="https://unpkg.com/@sveltia/cms@0.262.4/dist/sveltia-cms.js"></script>
<script src="/admin/draft-inator/works.js"></script>
<script src="/admin/draft-inator/citation.js"></script>
<script src="/admin/draft-inator/figure.js"></script>
```

The Figure block (`src/blocks/figure.js`, copied the same way) needs no data from the build. It uploads to the site's
`media_folder` and writes paths with its `public_folder`, as Sveltia's own image field does, and it never offers stock
photo services. Your build renders `{figure …}` lines (see `docs/data-contract.md`).

The order matters: the Cite block reads the works list when it loads. Neither file uses inline scripts or event handlers,
so a strict Content Security Policy is fine. Open the editor: **Citation** and **Figure** are now in the text editor's Insert menu.

## 5. Check notes in pull requests

Add to the site's checks:

```yaml
- run: npx draft-inator works --config draft-inator.json --check
- run: npx draft-inator notes --config draft-inator.json
```

The first fails if `works.js` is out of date; the second if any citation's note is. To fix notes:

```sh
npx draft-inator notes --config draft-inator.json --write
```

It changes only `note:` options. Run it once now: older citations may have no notes yet.

## 6. Optional: tag totals

If writers tag citations with topics, total them when you rebuild the cache:

```sh
npx draft-inator tags --config draft-inator.json --out data/record-tags.json
```

See [the tools guide](tools.md#tag-totals-draft-inator-tags) for curator additions and blocks.

## 7. Render citations for readers

The block writes cite.inator markers; your build already compiles those with cite.inator. Nothing else to do.

## Check it worked

- Open a page with citations in the editor, open one, and save without changing anything. Your pull request should
  show at most a changed `note:`.
- `npx draft-inator notes --config draft-inator.json` reports "All notes are current."

## Something not working?

| Symptom | Likely cause |
|---|---|
| No Citation block in the editor | `citation.js` loaded before Sveltia, or not at all; check the browser console |
| The works list is empty | `works.js` didn't load, or loaded after `citation.js` |
| Notes keep coming back stale after saving in the editor | `works.js` and `notes` use different styles, or `noteContext` is set to `article` ([year letters](tools.md#year-letters)) |
| `Unsupported citation cache schema` | `cache` isn't a cite.inator cache (`citation-inator.cache.v1`) |
