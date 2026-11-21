# Plan: a full article editor

Draft for Randal, 21 Nov 2026. Not yet decided; nothing here is built unless marked.

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
| Rich-text (WYSIWYG) editing | Default | Default | Default | ⬜ decide (see decisions) | S |
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
| A list of all articles: search, filter, sort | Posts list | Articles list, batch | Posts list | ⬜ from the repository or a build index | M |
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
| Video and audio, documents | ✅ | ✅ | Video, Audio, File cards | ⬜ after images; big files to object storage | L |
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
| Who can see a page | Private, password | Access levels | Public, members, paid, tiers | Static pages are public. `unlisted` is free; real restriction needs the host to gate paths (Cloudflare Access, or a Pages function checking sign-in). ⬜ decide |
| Upload | `upload_files` | Media permissions | — | Same as editing; limits checked in CI |
| Audit | — | Action logs | History log | git log, PRs, reviews: free |

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

## Decisions for Randal

1. **Rich text or Markdown?** WordPress, Joomla, and Ghost all edit visually. Today draft.inator edits Markdown beside
   a preview. A visual mode, typing into the formatted article, is the largest single piece of work here. Options:
   Markdown with preview (now); a visual editor built on ProseMirror or TipTap that still saves the same Markdown and
   tags; or both, switchable. I'd recommend both, visual added after 1.0's basics, because the blocks and round-trip
   rules don't change.
2. **Private pages.** Do some readers need pages others can't see (members, groups)? If yes, the host must gate paths.
   That's a host feature draft.inator describes in its contract, not something a static editor can enforce.
3. **Where media lives.** In the repository (simple, reviewable, fine for images) or in object storage such as R2 (for
   video and large files). I'd start with the repository and sidecar records, and add object storage when video comes.
4. **The article list.** Read it from the GitHub API live (no build needed, slower on big sites) or from an index the
   build writes (fast, slightly stale). I'd use the build index, with live status for open drafts.
5. **Sveltia's role.** With draft.inator's editor doing all of this, Sveltia remains useful for form-shaped
   collections (people, topics, settings). Keep both, sharing the blocks and the save path?

## A possible order

| Milestone | Contents |
|---|---|
| 0.4 (now) | KR's "Edit this page"; real citations in the preview (#14); the import widget (#16); recover an unsaved draft |
| 0.5 | **Article metadata**: a settings panel beside the editor for the fields in 4 (title, slug, authors, dates, status, excerpt, image, tags, SEO, social, visibility), validated against the data contract |
| 0.6 | **Article handling**: the article list (search, filter, states); history with readable diffs and Restore; unpublish, trash, and restore; scheduled publishing with a scheduled build |
| 0.7 | **Media library**: browse, details, sidecar provenance, usage, crop and rotate, upload limits and EXIF stripping |
| 0.8 | Table, Embed, Callout, page links; find and replace; templates |
| 0.9 | **Permissions**: roles mapped to repository access, CODEOWNERS or an `editors` check in CI, and the visibility contract for hosts |
| 1.0 | A second site adopts it; docs for a new site; then the visual editing mode |
