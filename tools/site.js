// Shared by the build tools: the site's settings, its content files, and cite.inator's tools (vendored, so
// nothing needs installing). Plain Node, no dependencies.
import fs from 'node:fs';
import path from 'node:path';
export { citationOptions, lineCol } from './core.js';

// Which files hold content, and how cite.inator should read each.
export const FORMATS = { '.md': 'markdown', '.markdown': 'markdown', '.html': 'html', '.htm': 'html', '.txt': 'text' };

export function readJSON(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); }
  catch (error) { throw new Error(`Could not read ${file}: ${error.message}`); }
}

// Settings come from a JSON file (draft-inator.json) and then the command line, which wins. Paths in the file are
// relative to the file.
export function loadSettings(file, overrides = {}) {
  let settings = {};
  if (file) {
    settings = readJSON(file);
    const base = path.dirname(path.resolve(file));
    const at = p => (typeof p === 'string' ? path.resolve(base, p) : p);
    for (const key of ['cache', 'curation', 'topics', 'works']) if (settings[key]) settings[key] = at(settings[key]);
    if (settings.content) settings.content = [].concat(settings.content).map(at);
  }
  for (const [key, value] of Object.entries(overrides)) if (value !== undefined && !(Array.isArray(value) && !value.length)) settings[key] = value;
  return settings;
}

// Every content file under the given folders (or the files themselves), sorted so output never depends on the
// order the disk returns them. Hidden folders and node_modules are skipped.
export function contentFiles(roots) {
  const found = [];
  const walk = p => {
    const stat = fs.statSync(p);
    if (stat.isDirectory()) {
      for (const name of fs.readdirSync(p)) if (!name.startsWith('.') && name !== 'node_modules') walk(path.join(p, name));
    } else if (FORMATS[path.extname(p).toLowerCase()]) found.push(p);
  };
  for (const root of [].concat(roots || [])) walk(root);
  return [...new Set(found)].sort();
}

export function formatOf(file) { return FORMATS[path.extname(file).toLowerCase()] || 'text'; }
