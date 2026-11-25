#!/usr/bin/env node
// draft-inator: build-side tools for a site using draft.inator's blocks.
//   draft-inator notes [--write] [--config draft-inator.json] [--cache citations.json] [--style S] [content…]
//   draft-inator tags  [--out tags.json] [--curation curation.json] [--topics topics.json] [...]
//   draft-inator works [--out works.js | --check] [--topics topics.json] [...]
//   draft-inator migrate [--from citation] [--to cite] [--write] [content…]
// With no --write, notes only checks: it exits 1 if any note is stale or missing. works --check exits 1 if the
// works file on disk differs from what the cache gives.
import fs from 'node:fs';
import { parseArgs } from 'node:util';
import { fileURLToPath } from 'node:url';
import { loadSettings, contentFiles } from './site.js';
import { checkNotes, report } from './notes.js';
import { totalTags, recordTags } from './tags.js';
import { buildWorks, worksJs, topicsFrom } from './works.js';
import { migrateText } from './migrate.js';
import { lineCol } from './core.js';

const USAGE = `Usage: draft-inator <notes|tags|works|migrate> [options] [content folders or files]

  notes            Check every marker's note: against the citation cache (exit 1 if any is stale)
    --write        Refresh stale notes in place instead
    --strict       Also fail on unresolved or malformed citations
  tags             Total the tags writers gave each work, with the curator's additions and blocks
    --out FILE     Write { work id: [tags] } as JSON (default: print the full report)
  works            Write works.js (window.DRAFT_WORKS, window.DRAFT_TOPICS) from the citation cache
    --out FILE     Where to write it (default: settings.works, else print)
    --check        Fail if FILE is out of date instead of writing it

  migrate          Move citation markers to the site's one keyword (cite.inator 0.5.1). Exits 1 while any are left
    --from WORD    The old keyword (default: citation)
    --to WORD      The site's keyword (default: settings.keyword, else cite)
    --write        Rewrite the files instead (only the keyword changes)

  --config FILE    Site settings (JSON); flags override it. See docs/tools.md.
  --cache FILE     cite.inator cache (citations.json)
  --style NAME     cite.inator citation style (use the same one as the site's build)
  --curation FILE  Per-work tag additions and blocks
  --topics FILE    Topics as [{ id, label }]
`;

export function main(argv, { out = s => process.stdout.write(s + '\n'), err = s => process.stderr.write(s + '\n') } = {}) {
  let parsed;
  try {
    parsed = parseArgs({ args: argv, allowPositionals: true, options: {
      config: { type: 'string' }, cache: { type: 'string' }, style: { type: 'string' }, keyword: { type: 'string' },
      curation: { type: 'string' }, topics: { type: 'string' }, out: { type: 'string' },
      from: { type: 'string' }, to: { type: 'string' }, write: { type: 'boolean' }, check: { type: 'boolean' }, strict: { type: 'boolean' }, help: { type: 'boolean', short: 'h' }
    } });
  } catch (error) { err(error.message + '\n\n' + USAGE); return 2; }
  const { values: v, positionals: [command, ...content] } = parsed;
  if (v.help || !command) { out(USAGE); return v.help ? 0 : 2; }
  try {
    const settings = loadSettings(v.config, { cache: v.cache, style: v.style, keyword: v.keyword, curation: v.curation,
      topics: v.topics, content: content.length ? content : undefined });
    if (command === 'notes') {
      if ((!settings.content || !settings.content.length)) throw new Error('Name the content folders (or set "content" in the settings).');
      const result = checkNotes(settings, { write: v.write });
      out(report(result, { write: v.write }));
      const unresolved = result.files.some(f => f.diagnostics.length);
      return !v.write && (result.stale || (v.strict && unresolved)) ? 1 : 0;
    }
    if (command === 'tags') {
      const result = totalTags(settings);
      if (v.out) fs.writeFileSync(v.out, JSON.stringify(recordTags(result), null, 2) + '\n');
      else out(JSON.stringify(result.works, null, 2));
      for (const n of result.notes) err('note: ' + n);
      return 0;
    }
    if (command === 'works') {
      const { works, unresolved } = buildWorks(settings);
      const text = worksJs({ works, topics: topicsFrom(settings) });
      const file = v.out || settings.works;
      for (const u of unresolved) err(`note: ${u.id} is not resolved yet; its note "${u.note}" comes from its ${u.from}`);
      if (v.check) {
        if (!file) throw new Error('--check needs --out FILE (or "works" in the settings).');
        const current = fs.existsSync(file) ? fs.readFileSync(file, 'utf8') : null;
        if (current === text) { out(`${file} is current.`); return 0; }
        out(`${file} is out of date. Run draft-inator works to rewrite it.`); return 1;
      }
      if (file) { fs.writeFileSync(file, text); out(`Wrote ${works.length} works to ${file}.`); } else out(text);
      return 0;
    }
    if (command === 'migrate') {
      if ((!settings.content || !settings.content.length)) throw new Error('Name the content folders (or set "content" in the settings).');
      const from = v.from || 'citation', to = v.to || settings.keyword || 'cite';
      let pending = 0, files = 0, reviews = 0;
      for (const file of contentFiles(settings.content)) {
        const text = fs.readFileSync(file, 'utf8');
        const { text: next, changes } = migrateText(text, { from, to });
        const rewrites = changes.filter(c => !c.review);
        for (const c of changes.filter(c => c.review)) { const { line, column } = lineCol(text, c.at); err(`${file}:${line}:${column}: check: ${c.review}`); reviews++; }
        if (!rewrites.length) continue;
        files++; pending += rewrites.length;
        if (v.write) fs.writeFileSync(file, next);
        out(`${file}: ${rewrites.length} marker${rewrites.length === 1 ? '' : 's'} ${v.write ? 'moved' : 'to move'} to {${to} …}`);
      }
      if (!pending) out(`Every marker uses {${to} …}.${reviews ? ` ${reviews} to check by hand (above).` : ''}`);
      else if (!v.write) out(`${pending} marker${pending === 1 ? '' : 's'} in ${files} file${files === 1 ? '' : 's'} still use another keyword. Run with --write to move them.`);
      return !v.write && pending ? 1 : 0;
    }
    err(`Unknown command "${command}".\n\n${USAGE}`); return 2;
  } catch (error) { err(error.message); return 2; }
}

// Run when called as a command (directly, or through npm's bin link), not when imported by the tests.
if (process.argv[1] && fs.realpathSync(process.argv[1]) === fileURLToPath(import.meta.url)) process.exitCode = main(process.argv.slice(2));
