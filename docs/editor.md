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
| `storageKey` | Keep the draft, small uploads, and the view in this browser under this name. Off by default |
| `fullWindow` | Fill the window instead of a box |

`mountEditor` returns `{ ready, text, focus(), setLayout(id) }`. `text` reads and replaces the Markdown.

Saving is the site's job. A site might open a pull request, commit to a draft branch, or post to its own server.
draft.inator never decides where text goes.

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
