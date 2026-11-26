// Keep every marker's cue: current, and move markers written with the old note: (before cite.inator 0.6) to cue:.
// Runs cite.inator's migrateCitationCues and annotateMarkers over a site's content. Check mode (the default) changes
// nothing and reports what would change; write mode saves the refreshed files.
import fs from 'node:fs';
import path from 'node:path';
import { cueEdits } from './core.js';
import { contentFiles, formatOf, readJSON } from './site.js';

/**
 * @param {object} settings  { content: [folders or files], cache: path or object, style, keyword }
 * @param {object} [how]     { write: false }
 * @returns {{ files: Array<{file, stale: Array<{at, was, now}>, diagnostics}>, stale: number, written: string[] }}
 */
export function checkCues(settings, { write = false } = {}) {
  const cache = typeof settings.cache === 'string' ? readJSON(settings.cache) : settings.cache;
  if (!cache) throw new Error('No citation cache given (settings.cache).');
  const files = [], written = [];
  let stale = 0, migrated = 0;
  for (const file of contentFiles(settings.content)) {
    const result = cueEdits(fs.readFileSync(file, 'utf8'), cache, settings, formatOf(file));
    stale += result.stale.length; migrated += result.migrated.length;
    if (result.stale.length || result.migrated.length || result.diagnostics.length) files.push({ file, stale: result.stale, migrated: result.migrated, diagnostics: result.diagnostics });
    if (write && result.changed) { fs.writeFileSync(file, result.source); written.push(file); }
  }
  return { files, stale, migrated, written };
}

export function report({ files, stale, migrated = 0, written }, { write = false } = {}) {
  const lines = [];
  for (const f of files.map(f => ({ ...f, file: path.relative(process.cwd(), f.file) || f.file }))) {
    for (const m of f.migrated || []) lines.push(`${f.file}:${m.at}  note: → cue:`);
    for (const s of f.stale) lines.push(`${f.file}:${s.at}  ${s.was ? `${s.was} → ${s.now}` : `add ${s.now.replace(/^ \| /, '')}`}`);
    for (const d of f.diagnostics) lines.push(`${f.file}${d.at ? ':' + d.at : ''}  (${d.code || d.state}${d.identifier ? ' ' + d.identifier : ''}${d.source && d.code !== 'citation-unresolved' ? ' ' + d.source : ''})`);
  }
  if (write) lines.push(written.length ? `Refreshed cues in ${written.length} file(s)${migrated ? `, moving ${migrated} old note: to cue:` : ''}.` : 'All cues were already current.');
  else lines.push(stale || migrated ? [migrated && `${migrated} marker(s) still say note: (cite.inator 0.6 calls it cue:)`, stale && `${stale} stale or missing cue(s)`].filter(Boolean).join('; ') + '. Run with --write to update them.' : 'All cues are current.');
  return lines.join('\n');
}

export const checkNotes = checkCues;   // the name before cite.inator 0.6
