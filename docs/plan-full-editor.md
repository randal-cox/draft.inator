# Plan: a full article editor

Randal, 21 Nov 2026. The main decisions are made (see [Decided](#decided)); nothing here is built unless marked.

**Goal.** Writing and managing articles the way people do in WordPress or Joomla, for a site whose content lives in a
git repository and is published as static pages. That means editing, article handling, metadata, media, and the people
who may do each, and only those. No themes, plugins, comments, newsletters, memberships, payments, or site settings.

**Sources.**
- WordPress's documentation: the block editor, post settings, Media Library, revisions, post status, and roles,
  read 21 Nov 2026.
- Ghost's help pages: the editor, cards, post settings, publishing, team, and history.
- Joomla's documentation site refused automated reading, so the Joomla column is from general knowledge of Joomla
  4 and 5, not checked against its docs. Treat it as indicative.

## How a git-based editor differs

| Comes free with git | Has to be built | Needs a server or the host's help |
|---|---|---|
| Full history of every page, with who and when | A history view a writer can read, and Restore | Pages only some readers may see |
| Review before publishing (pull requests) | Draft, review, and scheduled states shown as such | Permissions finer than "can write to the repository" |
| Locking by open draft (one branch per entry) | Trash and restore | Publishing at a set time (a scheduled build) |
| Roll back anything | A media library over a folder | Large media (object storage) |

draft.inator already saves the way Sveltia's editorial workflow does: one branch and one draft pull request per entry,
merged by people. Most of article handling builds on that.

## 1. Editing

Key: ✅ done · 🟡 partly · ⬜ not yet. Priority: **M** must, **S** should, **L** later.

| Feature | WordPress | Joomla | Ghost | draft.inator | Pri |
|---|---|---|---|---|---|
| Write in Markdown with a live preview | Code editor view | Editor plug-ins | Markdown card | ✅ side by side, stacked, write or preview only | M |
| Formatting: headings, bold, italic, links, lists, quotes, code | ✅ | ✅ (TinyMCE) | ✅ | ✅ toolbar and Ctrl+B/I/K | M |
| Hide the toolbar; distraction-free writing | Distraction free, Spotlight | — | — | ✅ toolbar switch, plain mode | M |
| Citations | — | — | — | ✅ Cite block | M |
| Images with caption, alt, credit, placement | Image block | Images and Links tab | Image card | ✅ Figure block | M |
| Undo and redo | ✅ | ✅ | ✅ | 🟡 the browser's own (block edits are undoable) | M |
| Autosave and recovery after a crash | One autosave per user per post | — | ✅ | 🟡 draft kept in the browser; ⬜ offer to recover it | M |
| Word count, reading time, outline | Document Overview | — | — | 🟡 word count; ⬜ outline, reading time | S |
| Links to other pages that survive a move | — | Menu item links | @ mentions, Cmd+K | ⬜ Page link block (roadmap 0.6) | S |
| Tables | Table block | ✅ | — (HTML card) | ⬜ Table block (0.5) | S |
| Video and audio embeds, privacy player | Embed blocks | — | Video, Audio, Embed cards | ⬜ Embed block (0.5) | S |
| Callouts, pull quotes, toggles, dividers | Blocks | — | Callout, Toggle, Divider | ⬜ Callout block (0.5) | S |
| Galleries and columns | Gallery, Columns | — | Gallery (up to 9) | ⬜ later | L |
| Paste from Word or Google Docs, cleaned | ✅ | ✅ | ✅ | ⬜ with citation.inator's importer (#16) | S |
| Find and replace | Plug-in | Editor | — | ⬜ | S |
| Spell check | Browser | Browser | Browser | ✅ browser (`spellcheck`) | M |
| Raw HTML escape hatch, with limits | Custom HTML (needs `unfiltered_html`) | Editor setting | HTML card | ⬜ allowed tags only (see 6) | L |
| Rich-text (WYSIWYG) editing | Default | Default | Default | **Not doing** (Randal, 21 Nov 2026): Markdown with a preview | — |
| Keyboard and screen reader use | ✅ | ✅ | ✅ | ✅ for what exists; keep testing | M |

## 2. Article handling

| Feature | WordPress | Joomla | Ghost | draft.inator (git) | Pri |
|---|---|---|---|---|---|
| States: draft, pending review, published | draft, pending, publish | unpublished, published | draft, published | 🟡 draft PR = draft; label = pending review; merged = published. ⬜ shown in a list | M |
| Scheduled publishing | future status, calendar | Start Publishing date | Schedule for later | ⬜ `publish_at` honoured by the build, plus a scheduled build | S |
| Unpublish without deleting | Draft again | Unpublished | Unpublish | ⬜ `status: unpublished` in front matter; the build skips it | M |
| Archive | — | Archived | — | ⬜ `status: archived`: kept, shown in archives only | L |
| Trash and restore; delete | Trash, 30 days | Trashed, then delete | Delete (permanent) | ⬜ delete = a PR that removes the file; restore from history. A trash list from git | M |
| Revisions: compare and restore | Revisions screen, colour diff, Restore | Versions | Post history | ⬜ history from git commits, a readable diff, Restore as a new draft | M |
| Locking while someone edits | — (warning) | Check-in, check-out | — | 🟡 the open draft branch is the lock; ⬜ show "Ann is editing" | S |
| A list of all articles: search, filter, sort | Posts list | Articles list, batch | Posts list | ⬜ the article list (below) | M |
| Batch actions | Bulk edit, trash | Batch | — | ⬜ later | L |
| New article from a template | Patterns | — | — | ⬜ per collection | S |
| Duplicate an article | Plug-in | Save as Copy | Duplicate | ⬜ | L |
| Preview as readers will see it | Preview | Preview | Desktop, mobile, social | 🟡 live preview; the PR's preview deploy for exact output | M |
| Featured or sticky | Sticky | Featured | Featured | ⬜ `featured: true` | S |
| Ordering | Page order | Ordering | — | ⬜ `order` (KR already has it) | S |

## 3. Media library

| Feature | WordPress | Joomla | Ghost | draft.inator | Pri |
|---|---|---|---|---|---|
| Upload; drag and paste | ✅ | ✅ | ✅ | 🟡 in Sveltia and the editor's Figure form; ⬜ a library screen | M |
| Browse: grid and list, folders, filter by type and date, search | Grid and list, filters | Folders | — | ⬜ over the media folder | M |
| Details per item: alt, caption, title, description | ✅ | ✅ | Alt, caption | ⬜ a sidecar record per file (below) | M |
| Provenance: credit, licence, source | — | — | — | 🟡 in the Figure tag; ⬜ library default per image | M |
| Where it's used; find unused | Uploaded to, Attach | — | — | ⬜ from the build's index of tags | S |
| Edit: crop, rotate, scale, focal point | Edit image | Crop, resize | Built-in image editor | ⬜ crop and rotate in the browser; focal point in the sidecar | S |
| Sized copies and modern formats | Generated sizes | — | ✅ | ⬜ at build time, in the renderer | S |
| Replace a file everywhere | Plug-in | — | — | ⬜ keep the path, swap the file, in one PR | L |
| Video and audio, documents | ✅ | ✅ | Video, Audio, File cards | Deferred, perhaps for a long time (Randal); embeds of hosted video come with the Embed block | — |
| Stock photo services | Openverse | — | GIF search | Off by default (privacy, provenance) | — |

A **sidecar record** per file, `static/uploads/mask.jpg.yml`, holds what belongs to the image rather than to one use
of it: alt text (a default, overridable per figure), credit, licence, source, focal point, and who uploaded it and when.
It's reviewable in the same PR as the upload. A Figure can then default from it, so provenance is entered once.

## 4. Metadata

Proposed front matter, per article. Fields a site doesn't use are simply absent. ✱ marks fields KR already has in
some form.

| Group | Field | Meaning | Like |
|---|---|---|---|
| Identity | `title` ✱ | Headline | All |
| | `slug` ✱ | URL part; changing it leaves a redirect | WP slug, Ghost Post URL |
| | `id` | Stable id that survives renames (for links and redirects) | — |
| | `collection` | Essays, pages, news… (from the folder) | Post types, categories |
| People | `authors` ✱ | One or more, linked to people records | WP Author, Ghost Authors (multiple) |
| | `contributors` | Roles such as editor, translator, photographer | Joomla Created by alias |
| | `created`, `created_by` | From git: the first commit | Joomla Created |
| | `modified`, `modified_by` | From git: the last commit | Joomla Modified |
| Publishing | `status` | `draft`, `published`, `unpublished`, `archived` (review state stays in the PR) | WP statuses, Joomla states |
| | `published` | Publication date shown to readers; may be backdated | WP Publish date |
| | `publish_at`, `unpublish_at` | Scheduled start and finish | Joomla Start and Finish Publishing |
| | `featured`, `order` ✱ | Featuring and ordering | Sticky, Featured, Ordering |
| | `revision_note` | Optional public "updated on … because …" | — |
| Description | `excerpt` ✱ | Summary for lists and search results | WP Excerpt, Ghost Custom excerpt |
| | `image`, `image_alt`, `image_caption` | Preview or feature image, its alt text and caption | WP Featured image, Ghost feature image |
| | `tags` ✱, `topics` ✱ | Tags and the site's topic scheme | Categories and tags |
| | `language` | Language of the article; links to translations | Joomla Associations |
| Discovery | `seo_title`, `seo_description` | For search engines, if different | Ghost Meta data |
| | `social_title`, `social_description`, `social_image` | Link previews | Ghost X and Facebook cards |
| | `canonical` | Where the original lives | Ghost Canonical URL |
| | `noindex` | Keep out of search engines and the sitemap | Joomla Robots |
| | `redirect_from` | Old URLs that should land here | — |
| Access | `visibility` | `public`, `unlisted` (not in lists), `members`, `group:<name>` | WP Private and password; Joomla Access; Ghost Post access |
| | `editors` | Who may edit, beyond the defaults (see 5) | Joomla Permissions tab |
| Presentation | `template`, `layout` | Which page template | WP Template, Ghost Custom template |
| | `toc` | Show a table of contents | — |
| Citations | `references` (derived) | Works cited, from citation.inator | — |
| Provenance | `sources`, `licence` | Licence of the text itself | — |

Derived, not stored: word count and reading time, history, the works cited, where each image is used, and the "Edit
this page" link. The **data contract** gets a section for these fields (additive); `tests/test_cms.py`-style checks
on the host keep them valid.

## 5. People and permissions

| Need | WordPress | Joomla | Ghost | Git-based answer |
|---|---|---|---|---|
| Roles | Contributor, Author, Editor, Administrator | Groups with ACL | Contributor, Author, Editor, Administrator | Map to: **contributor** (can open drafts), **editor** (can merge), **admin**. Enforced by the repository: write access and branch protection on `main` |
| Edit own versus others' | `edit_others_posts` | Edit Own | Editor edits others' | ⬜ CODEOWNERS on content paths, or a per-article `editors` list checked in CI. GitHub alone can't stop a writer opening a PR on any file, but nothing merges without review |
| Publish | `publish_posts` | Edit State | Author and up | Merging to `main`, gated by branch protection and required reviews |
| Who can see a page | Private, password | Access levels | Public, members, paid, tiers | draft.inator exposes the structure; the host enforces it (see [the permission structure](#the-permission-structure)) |
| Upload | `upload_files` | Media permissions | — | Same as editing; limits checked in CI |
| Audit | — | Action logs | History log | git log, PRs, reviews: free |

## The article list

Randal: "we need searches and all kinds of annoying things." Everything WordPress's Posts screen and Joomla's
Articles list let an editor do, over the site's content:

- **Search** the text of every article (title, body, excerpt, authors, tags), not only titles.
- **Filter**, combinably:
  - collection; status, including *has an open draft* and *in review*; author; tag and topic; visibility;
  - date ranges (published, modified, created);
  - problems: unresolved citations, missing alt text, missing excerpt or preview image, an HTML body.
- **Sort** by modified, published, title, author, or order.
- **Columns** chosen by the editor (title, status, authors, dates, visibility, tags, words, citations, figures).
- **Saved views**, such as "my drafts", "in review", "members only", or "needs alt text", remembered per person.
- **Counts per status** at the top, as WordPress shows them (All, Published, Drafts, In review, Trash).
- **Quick actions on a row:** edit, view, history, unpublish, move to trash, restore. Bulk actions later.
- **Paging and speed:** fast with thousands of articles. One list across collections, with the collection as a filter.

**Where the data comes from:** an index the site's build writes (`articles.json`: every article's front matter,
counts, problems, and path), searched in the browser with a small index draft.inator builds (no dependencies). It's
overlaid live with open drafts and their review state from the GitHub API, so a draft opened a minute ago shows at
once. The index never includes the text of pages a reader couldn't see, if the list is ever shown outside the CMS.

## Entities

Randal: editing people, tags, and so on also uses the editor, with small changes relevant to each entity.

- **One editor for every collection.** Articles, people, topics, tags, glossary terms: each is an entry in a
  collection, opened in the same editor box, saved the same way (one draft branch and pull request per entry).
- **Fields come from the collection's description.** Each collection lists its fields: name, label, widget (string,
  text, date, select, relation, image, list, object, boolean), whether required, and help text. The settings panel draws
  them, with draft.inator's forms. The format is Sveltia's collection config, which sites such as KR already have, so
  one description serves both and nothing is written twice.
- **Body or no body.** An article has a Markdown body and front matter. A person or topic may be only fields: a YAML
  file such as `content/people/ann-cox.yml`. Then the editor shows the fields and no writing pane, or a writing pane for
  the one long-text field (a biography, a definition).
- **Relations.** An article's `authors` picks from the people collection; `tags` and `topics` from theirs, with a
  link to open that person or topic in the editor. Renaming an entity updates every reference in one pull request.
- **Entity pages.** Each entity's page (a person's page, a topic's page) gets "Edit this page" like an article.
- **The article list** becomes an entry list per collection, with the same search, filters, and saved views.

## The permission structure

Randal: pages only some readers may see are needed; KR can do some of the lifting, and draft.inator must at least
expose the permission structure. So draft.inator **describes and checks** who may see and edit what, and the **host
enforces** reading at its edge (KR: a Cloudflare Pages function or Access, checking sign-in).

**1. The site declares its groups** (in the site file):

```yaml
access:
  groups:
    members: { label: "Members", description: "Signed-in members" }
    board:   { label: "Board" }
  editing:
    contributors: [ "@Teatro-Korazon/writers" ]   # may open drafts
    editors:      [ "@Teatro-Korazon/editors" ]   # may review and merge
```

**2. Each article says who may see it, and optionally who may edit it:**

```yaml
visibility: public          # or: unlisted | members | [board, members]
editors: [ann-cox, board]   # optional: beyond the site's editors
```

**3. draft.inator does its part:**
- **The editor:** a visibility control in the settings panel, offering only the site's groups. A clear "Visible to:
  Board" badge on the box and in the preview.
- **The article list:** filters by visibility.
- **The build tool:** `draft-inator access` writes `access.json` (each page's path and the groups that may read it)
  for the host to enforce.
- **A check that fails a pull request if a restricted page would leak:** linked from a public page, in the public
  sitemap or search index, in a feed, or in a public works-cited "Cited in" list.
- **Editing:** turns `editors` into a CODEOWNERS file, or a CI check, so a change to a page needs a review from someone
  allowed to edit it. Merging stays gated by branch protection.
- **The data contract** gets the fields and `access.json`'s shape. Audience passages inside a page (the roadmap's
  Audience block) use the same groups.

**4. The host does its part:** serves a restricted page only to readers in its groups, using `access.json`, and keeps
restricted pages out of public caches.

Limit: in a git-based site, anyone who can read the repository can read every page's source. Restricted pages
therefore need the repository itself to be private, as KR's is.

## 6. Security and limits

- **Tokens.** The editor uses the signed-in writer's GitHub token, on the CMS's own pages only (as KR does under
  `/admin`), never on public pages with third-party scripts. Prefer a fine-grained token scoped to one repository where
  the host's sign-in allows it.
- **Content safety.** The preview and renderers escape raw HTML (done). A raw-HTML block, if ever added, keeps to an
  allowed list of tags and attributes, as WordPress keeps `unfiltered_html` from untrusted users.
- **Uploads.**
  - Allowed types (JPEG, PNG, WebP, AVIF, and sanitised SVG only), a size limit (for example 10 MB per image), and
    a pixel limit, checked in the browser and again in CI.
  - Strip EXIF location data on upload, since phones record where a photo was taken.
  - No executable files, ever (WordPress grants `unfiltered_upload` to no one by default).
- **Rate and size.** Limits on files per PR and article size, so a mistake can't flood the repository.
- **CSP.** Strict everywhere (done): no inline scripts or handlers, same-origin modules.
- **Privacy.** No tracking, no third-party fetches from the editor (stock photos off), and lookups send only
  references (PRD principle 6).

## Decided

Randal, 21 Nov 2026:

1. **No visual editing.** Writers edit Markdown with a live preview. Not WYSIWYG, not later.
2. **Pages only some readers may see: yes.** draft.inator exposes the permission structure and checks it; KR and other
   hosts enforce reading (see [the permission structure](#the-permission-structure)).
3. **Media: the repository, with a sidecar record per image.** That's the plan. Video is deferred, perhaps for a long
   time.
4. **The article list needs search and "all kinds of annoying things":** see [the article list](#the-article-list).

5. **People, tags, topics, and other entities use the same editor,** "in usual CMS fashion", with small changes
   for each kind of entity. See [Entities](#entities). Sveltia is no longer needed for them.

## Order

| Milestone | Contents |
|---|---|
| 0.4 (now) | KR's "Edit this page"; real citations in the preview (#14); the import widget (#16); recover an unsaved draft |
| 0.5 | **Metadata, entities, and the permission structure**: a settings panel drawn from each collection's fields (Sveltia's config format), so the same editor edits articles, people, topics, and tags; YAML-only entries; relations; `visibility` and `editors`; the data contract |
| 0.6 | **The entry list and handling**: search, filters, saved views, counts; history with readable diffs and Restore; unpublish, trash, restore; scheduled publishing |
| 0.7 | **Media library** (images): browse, details, sidecar provenance, usage, crop and rotate, upload limits, EXIF stripping |
| 0.8 | **Access checks**: `access.json` for hosts, the leak check, CODEOWNERS or an `editors` check; Table, Embed, Callout, page links |
| 1.0 | A second site adopts it; docs for a new site |