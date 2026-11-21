# Pasting a document with ordinary citations: a feasibility sketch (20 Nov 2026)

**The problem.** A contributor pastes an essay written in Word or Google Docs, with its citations already in APA or
Chicago: "(Cox, 1995)" in the text and a reference list at the end. Converting each one to
`{citation 10.xxxx/… | note:"Cox 1995"}` by hand is tedious enough that busy people won't. The site should do the
converting and ask a person only to confirm.

**Short answer: feasible for most of a typical essay, if it comes with its reference list.** Matching "(Cox, 1995)" to
the right entry in the document's own list is reliable. Finding a DOI for a full reference is good for journal articles
and weaker for books, chapters, and grey literature. A bare "(Cox, 1995)" with no list is the hard case: the site can
only suggest candidates for a person to choose from.

## The principle: algorithms first, AI last, and always a way down

Randal, 20 Nov 2026: use algorithmic methods wherever they can do the job. A call to an AI model costs money per
document, depends on a connection and a provider, and can't be checked the way a rule can. It may still be needed in
the end for the messiest input, so the design keeps a place for it, behind the rules and never in front of them.

- **Every step has a fallback that needs nothing outside the browser.** Rules parse what they can; what they can't is
  shown to the person as plain text to fill in, not dropped.
- **Lookups are optional.** If Crossref or Open Library is slow or down, the import still converts the citations to
  local records from the parsed fields; identifiers can be added later (a "find identifiers" pass on existing records).
- **An AI parser, if we ever add one, is a plug-in behind the rules**: used only for references the rules couldn't
  parse, only when it's switched on and reachable, with a cost limit, and its output goes through the same review
  table as everything else. When it's off or fails, the import behaves exactly as without it.
- **Measure before adding it.** Keep a test set of real pasted references (with their correct fields) and report how
  many the rules parse correctly. Add the AI plug-in only if that number stays too low for the references people
  actually paste.

## What happens, step by step

1. **Split the pasted text** into body and reference list (a heading such as "References", "Works cited",
   "Bibliography", or a run of hanging-indent entries at the end). Chicago notes-and-bibliography style puts citations
   in footnotes; a Word paste keeps them only if the footnotes come along, so the tool needs the .docx itself, not the
   clipboard.
2. **Parse each reference into fields**: authors, year, title, container (journal or book), volume, pages, publisher,
   DOI or URL if present. This is the hardest step to do well with rules alone: references vary by style and by how
   carefully they were typed. Options:
   - **first, rules** for APA and Chicago author-date: patterns for author lists, the year in parentheses or after the
     names, quoted article titles versus italic book titles, "In:" for chapters, volume(issue): pages, publishers, and
     any DOI, ISBN, or URL in the text (identifiers are the most reliable fields of all);
   - **then, a trained parser** such as AnyStyle or GROBID (algorithmic, not a language model, and good, but a separate
     service to host);
   - **last, and only if measured to be needed**, a language model asked for structured fields, as a plug-in behind the
     rules (see the principle above).
3. **Find each in-text citation** ("(Cox, 1995)", "Cox (1995)", "(Cox & Lee, 1995, p. 4)", "(Cox et al., 1995a;
   Bell, 1992)") and match it to a parsed reference by first author's surname and year (with the letter suffix when
   there is one). Reliable when the list is present.
4. **Resolve each reference to an identifier**, in order:
   - a DOI already in the reference: confirm it with Crossref (citation.inator can do this now);
   - journal articles: Crossref's bibliographic search (the whole reference string as the query) returns ranked works
     with a score; accept only when the first author, year, and title agree closely;
   - books: Open Library search by title and author (citation.inator can do this now), for an ISBN;
   - nothing found: a local record from the parsed fields (references.yaml already allows records without a DOI).
5. **Review.** A table: each reference with its match and how sure we are (exact identifier, strong match, choose one
   of three, no match). A person confirms or picks; nothing is guessed silently.
6. **Write the result**: the text with `{citation id | note:"Cox 1995"}` markers in place of the old citations, the
   reference list removed (the site builds its own), and the new records added to `content/references/`, as one pull
   request with a preview, like every CMS change.

## Who does what

**citation.inator (Theandra)**: the parts any site would want.
- A query API for host tools (F3 in the requests): `describeCitation(marker, cache)` → "Cox 1995", and
  `annotateMarkers(source, cache)` to add or refresh the notes.
- Crossref bibliographic search beside the existing DOI resolver: a reference string or fields in, ranked candidates
  out, each with the fields that matched; it changes nothing (like the Open Library search).
- `parseInTextCitations(text, style)` and `matchCitations(inText, references)`: find "(Cox, 1995)"-style citations and
  pair them with parsed references.
- `parseReference(text, style)` with a pluggable back end (rules first; a parser service or a language model as
  plug-ins), so the hard step can improve without changing the callers.
- All of it as plain functions on records and caches, so an editor, a command-line tool, or a build step can call them:
  this is the plug-in surface.

**Our side (the editor and the build)**
- An **Import citations** page in the admin (`/admin/cite.html`, like the page history tool): paste or upload, see the
  review table, confirm, and it opens the pull request with the editor's own GitHub sign-in.
- The admin's security policy must allow the lookup services (api.crossref.org, openlibrary.org); both answer browser
  requests directly.
- A build step that keeps every marker's `note:` current (F3's `annotateMarkers`), and a test that fails on a stale one.
- If the language-model parser is used: a Cloudflare function holding the key, so it never reaches the browser, and a
  line in the AI use policy saying reference lists are sent for parsing.

## What makes it hard, honestly

- **Messy input.** Word pastes lose italics, footnotes, and sometimes the line breaks between references.
- **Coverage.** Crossref covers most journal articles since about 2000 well; humanities books, chapters, older work,
  and non-academic sources less so. Expect a person to settle a good share of books by hand.
- **Ambiguity.** "(Turner, 1969)" with no reference list could be several works; the tool must ask, never pick.
- **Trust.** A wrong DOI that looks right is worse than none. The review step, and showing why each match was made,
  matter more than the matching itself.
- **Politeness and privacy.** Crossref asks heavy users to identify themselves; we'd use a generic project contact,
  never a person's address, and send only references, never the essay.

## Suggested order

1. F3 (notes in markers, and the query API): small, and useful on its own.
2. In-text parsing and matching against a reference list, plus Crossref bibliographic search: the core of the import,
   for the common case.
3. The import page and review table on our side.
4. Reference parsing back ends beyond rules, and suggestions for bare "(Cox, 1995)" with no list: the stretch.
