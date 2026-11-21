// Keep every marker's note: current. Runs citation.inator's annotateMarkers over a site's content.
// Check mode (the default) changes nothing and reports stale notes; write mode saves the refreshed files.
import fs from 'node:fs';
import path from 'node:path';
import { noteEdits } from './core.js';
import { contentFiles, formatOf, readJSON } from './site.js';

/**
 * @param {object} settings  { content: [folders or files], cache: path or object, style, keyword }
 * @param {object} [how]     { write: false }
 * @returns {{ files: Array<{file, stale: Array<{at, was, now}>, diagnostics}>, stale: number, written: string[] }}
 */
export function checkNotes(settings, { write = false } = {}) {
  const cache = typeof settings.cache === 'string' ? readJSON(settings.cache) : settings.cache;
  if (!cache) throw new Error('No citation cache given (settings.cache).');
  const files = [], written = [];
  let stale = 0;
  for (const file of contentFiles(settings.content)) {
    const result = noteEdits(fs.readFileSync(file, 'utf8'), cache, settings, formatOf(file));
    stale += result.stale.length;
    if (result.stale.length || result.diagnostics.length) files.push({ file, stale: result.stale, diagnostics: result.diagnostics });
    if (write && result.changed) { fs.writeFileSync(file, result.source); written.push(file); }
  }
  return { files, stale, written };
}

export function report({ files, stale, written }, { write = false } = {}) {
  const lines = [];
  for (const f of files.map(f => ({ ...f, file: path.relative(process.cwd(), f.file) || f.file }))) {
    for (const s of f.stale) lines.push(`${f.file}:${s.at}  ${s.was ? `${s.was} → ${s.now}` : `add ${s.now.replace(/^ \| /, '')}`}`);
    for (const d of f.diagnostics) lines.push(`${f.file}${d.at ? ':' + d.at : ''}  (${d.code || d.state}${d.identifier ? ' ' + d.identifier : ''}${d.source && d.code !== 'citation-unresolved' ? ' ' + d.source : ''})`);
  }
  if (write) lines.push(written.length ? `Refreshed notes in ${written.length} file(s).` : 'All notes were already current.');
  else lines.push(stale ? `${stale} stale or missing note(s). Run with --write to refresh them.` : 'All notes are current.');
  return lines.join('\n');
}
