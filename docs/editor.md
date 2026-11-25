# The editor: putting it in a site

draft.inator's article editor writes Markdown with the Cite and Figure blocks and shows a live preview. It can fill a
window, or sit in a clearly marked, rounded box inside a site's own page, with the site's header and menus still in
view. See both in the demos: [the live editor](https://randal-cox.github.io/draft.inator/demo/editor/) and
[editing inside a site](https://randal-cox.github.io/draft.inator/demo/site/).

## What to load

```html
<link rel="stylesheet" href="/admin/draft-inator/editor/editor.css">

<script src="/admin/draft-inator/editor/forms.js"></script>   <!-- first: draws the blocks' forms -->
<script src="/admin/draft-inator/works.js"></script>          <!-- the works a writer can cite (draft-inator works) -->
<script src="/admin/draft-inator/citation.js"></script>
<script src="/admin/draft-inator/figure.js"></script>
<script type="module" src="/your/edit-page.js"></script>
```

All plain files from `src/`, with no dependencies and no inline scripts, styles, or handlers, so a strict Content
Security Policy is fine (`script-src 'self'`; `img-src 'self' blob: data:` for upload previews).

## Mounting it

```js
import { mountEditor, renderArticle } from '/admin/draft-inator/editor/editor.js';

const editor = mountEditor(document.querySelector('#edit-here'), {
  text: pageMarkdown,                 // or an async function that fetches it
  render: md => mySiteMarkdown(md),   // your Markdown renderer; it must escape raw HTML
  previewClass: 'essay',              // your article class, so the preview looks like the page
  label: 'Editing this page',
  save: async text => { await openPullRequest(text); return 'Pull request opened'; },
  done: text => showPageAgain()
});
```

| Option | Meaning |
|---|---|
| `text` | The Markdown to edit, or an async function that returns it |
| `render(markdown)` | Markdown to HTML for the preview. Without it, the preview shows plain paragraphs |
| `save(text)` | Adds Save. Whatever it returns is shown; if it throws, the error is shown and nothing is lost |
| `done(text)` | Adds Done, to leave the editor |
| `reset()` | Adds Reset, which loads the text it returns |
| `label` | The badge on the box ("Editing") |
| `previewClass` | Your article class; your styles win over the editor's defaults |
| `images` | `[{ label, path, url? }]`: images a figure can use. `url` if the path isn't where the browser finds it |
| `publicFolder` | Where uploads are written in tags (default `/uploads`) |
| `storageKey` | Keep the draft, small uploads, and the view in this browser under this name. Off by default. The page's own text always loads; a kept draft that differs is offered (Restore or Discard), with a warning if the page has changed since, and is forgotten after a successful save |
| `fullWindow` | Fill the window instead of a box |
| `blocks` | Only these blocks, such as `['citation']`. Default: every block the page loaded. Others get no button, and their tags stay as text |
| `importer` | Turns on Import citations: `{ process, describe?, onRecords?, siteCache?, recordId? }` (see Importing citations) |
| `citations` | Formatted citations in the preview: `{ compileHTML, cache, citationStyle? }` (see Formatted citations in the preview) |
| `showImport` | Show the Import citations button even without an importer (disabled) |
| `collection` | A collection in `window.DRAFT_COLLECTIONS`: adds the Details panel, and `text` becomes the whole file (see below) |
| `fields` | Or the collection's fields directly |
| `entries` | Entries by collection: choices for relation fields, keyword suggestions (values the collection's other entries use), and places for an order field. Default: `window.DRAFT_ENTRIES` |
| `slug` | The page's slug, so it isn't counted among its collection's other entries |

`mountEditor` returns `{ ready, text, focus(), setLayout(id) }`. `text` reads and replaces the Markdown.

Saving is the site's job. A site might open a pull request, commit to a draft branch, or post to its own server.
draft.inator never decides where text goes.

## Importing citations

With citation.inator's importer, the toolbar's **Import citations** finds author–date citations such as
"(Bell, 1992, p. 94)" and the reference list in the article, and shows each citation in its sentence with the work it
matches and why ("authors match, year matches").
- **Proposed, not applied:** unique matches start selected and can be changed; others need a choice; "Leave as
  written" is always there.
- **One undoable step:** accepted citations become `{cite …}` markers, keeping locators, prefixes, and the
  narrative form, and the typed reference list can be replaced by `{cite endnote}`.
- **Unmatched citations stay exactly as written.**

```js
import { processImportRequest } from '/admin/draft-inator/citation-import.mjs';   // citation.inator 0.4.0
import { describeCitation } from '/admin/draft-inator/citation-tools.mjs';

mountEditor(el, { ..., importer: {
  process: processImportRequest,
  describe: (id, cache) => describeCitation(id, cache, { citationStyle: 'chicago-author-date' }).text,
  siteCache,                                             // the site's citation cache
  onRecords: (records, cache) => keepNewWorks(records)   // e.g. reference files in the page's pull request
} });
```

- **The site's own works.** With `siteCache`, a reference that looks like a work the site already has is offered as
  that work ("Use the site's *Ritual Theory, Ritual Practice*", with what matches), or as a new work. One proposal
  with nothing in conflict is selected, visibly; the writer confirms by converting. Nothing is merged unseen.
- **Ids for new works.** `siteStyleId` (exported from `importer.js`) gives `bell-1992-ritual`: first author's family
  name, year, and the title's first word, made unique. A site with another scheme passes `recordId(record, { taken })`.
- **Citations typed by hand.** While the article has author–date citations that aren't markers yet (pasted in from
  a word processor, say), a banner says so, with examples and an **Import citations** button, and checks again after
  every change and at once on paste. `importer.handTyped` sets how firm it is: `'require'` (Save refuses until they're imported, and there's no way
  round it: a site that forbids citations typed by hand), `'block'` (the default: Save refuses
  until they're imported, or until the writer chooses **Save without importing**, which lasts until more
  are added; citations left as typed in an import count as allowed), `'warn'` (the banner only), or `'off'`. `editor.handTyped` gives `{ count, examples }`.
- **Save without importing** (cite.inator 0.5.1; Randal, 25 Nov 2026) doesn't just let plain text through. Each typed
  citation with no entry in the reference list becomes an unresolved placeholder, `{cite pending-rivera-2020 |
  unresolved:"(Rivera, 2020)"}`: a real citation that keeps the words typed, flagged by the build, with its placeholder
  record saved with the page. The status line counts unresolved citations ("1 unresolved") until each is opened and
  given its work. Citations whose work is in the typed reference list can't be placeholders in cite.inator 0.5.1; they
  stay as plain text, and the result line says so and points to Import citations. One undoable step, with Undo.
- **The review's sections.** Three disclosures, each with a live count in its heading: **Needs your attention**
  (several candidates, or no reference; nothing is chosen for you), **Works this site already has**, and **Probably
  right** (one clear match each, selected and changeable; closed to start). Close one and its heading still says
  what's left ("1 to decide", "all decided ✓", "2 changed"). Convert waits, and says "Decide 1 more", until every
  citation in Needs your attention and every site work has a decision, "Leave as written" included. Cancel and
  Convert stay in view at the bottom.
- **What it becomes.** Each citation says in words which works it will cite, new or the site's own (two works by the
  same people in the same year are told apart by title), with **Show code** for the exact marker from cite.inator's
  own preview of the current choices, in the sentence it sits in. A citation is converted whole: leaving one of its
  works leaves all of them, and it says so. The review runs as soon as it opens, and again when the style changes.
- **Choices are remembered** while the page is open: reopening the review, or opening it after Undo, brings back what
  was decided for each citation and the reference list.
- **The typed reference list** is a decision of its own. Converted citations get an automatic list of works cited, so
  keeping the typed one means readers see two lists. One list (replace) is chosen to start; two lists is a choice.
  Its entries are shown, and any no converted citation uses are flagged, since replacing the list removes them.
- **Evidence in plain words.** "Same title, authors, and year." Capitals, punctuation, and initials against full
  names don't count as differences; a site title without the source's subtitle says "the site's copy has no
  subtitle". Internal ids aren't shown. Adding a work the site already has warns that the site would have two copies.
- **After converting**, a line above the text says what happened ("Converted 6 citations; 1 left as typed; 2 new works
  will be saved with the page …") with **Undo**, which reverses the whole import in one step. The caret goes to the
  start of the change, with nothing selected, so the next keystroke can't replace it. Closing the review, by Cancel
  or Escape, returns focus to where it was opened from.
- **The site's own works, by policy.** `importer.siteWorks`: `'offer'` (the default: one clear match is selected;
  anything written differently waits for a choice), `'prefer'` (one match is selected even when written a little
  differently), or `'require'` (no "Add it as a new work" where the site has a match).
- **What the site keeps.** Only new works that a converted citation cites join the works list (with notes) and go to
  `onRecords`. The site's own works, reused, are already there; references nobody cites are not kept.

## Formatted citations in the preview

```js
import { compileHTML } from '/admin/draft-inator/citation-compiler.mjs';   // citation.inator 0.4.0
mountEditor(el, { ..., citations: { compileHTML, cache: siteCache, citationStyle: 'chicago-author-date' } });
```

The preview then shows citations and endnotes as the published page will (and adds endnotes if the text has no
`{cite endnote}`). Without `citations`, or if the compiler stops, the preview shows each work's note and says so.
Use the same style as the site's build. Works added by an import are added to this cache, so they format at once.

## Bodies written in HTML

The editor edits Markdown. `bodyKind(body)` (from `editor.js`) returns `'html'` when most of a body is inside HTML
elements; such a page shows its tags as text in the preview. Until the editor handles HTML bodies, a site can send
those pages to its CMS instead.

## Front matter

### With the Details panel (0.5)

Give the editor the page's collection and the whole file. The front matter is edited as a form above the text, drawn
from the collection's fields (`docs/data-contract.md`); the body is edited in the text box; `save` and `done` get the
whole file back, and `editor.text` reads and replaces the whole file.

```js
mountEditor(el, { collection: 'essays', text: fileText, save: async file => saveFile(file) });
```

Only the keys a writer changes are written, in the style they had; everything else stays byte for byte. Save checks
the details first (required fields, patterns, number ranges): a problem is shown beside its field, which gets focus,
and nothing is sent.

Kept drafts hold the whole file. A site turning the panel on should change its `storageKey`, so a draft kept as a
body alone isn't offered in place of a whole file.

### Without it

Without `collection`, the editor edits a page's body. Set the YAML front matter aside and put it back exactly:

```js
import { splitFrontMatter, joinFrontMatter } from '/admin/draft-inator/editor/frontmatter.js';
const { frontMatter, body } = splitFrontMatter(fileText);
// … mountEditor(el, { text: body, save: async edited => save(joinFrontMatter({ frontMatter, body: edited })) })
```

`joinFrontMatter(splitFrontMatter(text))` is always `text`, byte for byte.

## Saving as a pull request, the way Sveltia does

For a site that uses Sveltia's editorial workflow, `src/editor/github.js` saves where Sveltia would, so its
Workflow view shows these drafts as its own. One branch per entry, `cms/<collection>/<slug>`, and one draft pull
request labelled `sveltia-cms/draft`; later saves add commits to it. It never merges.

```js
import { createWorkflowSaver, SaveConflict } from '/admin/draft-inator/editor/github.js';

const saver = createWorkflowSaver({ token, owner: 'org', repo: 'site', base: 'main', labelPrefix: 'sveltia-cms/' });
const entry = { collection: 'essays', slug: 'masks', path: 'content/essays/masks.md' };
let { text, sha } = await saver.load(entry);           // the open draft's text if there is one, else main's
// … edit …
const { pr, created } = await saver.save({ ...entry, text: edited, sha, message: 'CMS: edit essays "masks"' });
```

`load` reads from the entry's open draft when there is one, so two writers never fork an entry. `save` requires the
`sha` from `load` (or from the previous save; `null` for a new file) and throws `SaveConflict`, writing nothing, if
someone saved in between. The token is the signed-in
writer's; the site decides where it comes from (for a Sveltia site, the one Sveltia already holds).

## Matching the site

Set the editor's colours on its box; everything else follows:

```css
#edit-here.di-editor { --di-accent: #2f5d47; --di-accent-ink: #fff; --di-bg: #f3f5f1; --di-surface: #fff;
  --di-ink: #1f2a24; --di-muted: #5a6b61; --di-line: #cfd8d1; --di-radius: 14px; height: 78vh; }
```

The box follows the reader's light or dark setting; set `data-di-theme="light"` (or `"dark"`) on it to fix one.

## Rendering pages the same way

`renderArticle(markdown, { render, imageURL })` returns `{ html, title, words, citations, figures }`: the article as
the preview shows it, with figures placed as their tags say. A JavaScript site can render its pages with it; give the
article the `di-article` class to use the editor's figure layout, or copy those rules into your stylesheet. Until
citation.inator's compiler runs in the browser (#14), citations show each work's note and a list of works cited; a
site's build should compile citations with citation.inator.

## Using it

- **View** menu: side by side, stacked, write only, or preview only; the toolbar on or off; plain, for nothing but the
  text (Escape leaves).
- **Citation** and **Figure** open the blocks' own forms. With the cursor in a citation or a figure, **Edit**
  (Ctrl+E) opens it.
- Ctrl+B, Ctrl+I, and Ctrl+K for bold, italic, and a link.
