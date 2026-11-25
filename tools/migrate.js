// Move a site's citation markers to one keyword (cite.inator 0.5.1: one configured keyword, default `cite`; draft.inator
// issue #33). Only the keyword changes, byte for byte; everything else in the file is left alone. Plain Node and
// browser-safe (no file system here; tools/cli.js reads and writes the files).

const DIRECTIVES = ['endnote', 'list', 'nocite', 'evidence', 'credit', 'tags'];
// Directive words the old grammar didn't have: under the old keyword these were works, so they become local:.
const NEW_IN_051 = ['tags'];
// Code is text, not markers: fenced and inline code in Markdown, and code, pre, script, and style in HTML.
const CODE = /(```[\s\S]*?```|~~~[\s\S]*?~~~|`[^`\n]*`|<(code|pre|script|style)\b[^>]*>[\s\S]*?<\/\2\s*>)/gi;

/**
 * Rewrite the citation keyword in one file's text.
 * @param {string} text
 * @param {{ from?: string, to?: string }} [options]  The old keyword (default `citation`) and the site's keyword
 *   (default `cite`).
 * @returns {{ text: string, changes: Array<{ at: number, before: string, after: string, review?: string }> }}  A change with
 *   `review` rewrites nothing; it needs a person.
 */
export function migrateText(text, { from = 'citation', to = 'cite' } = {}) {
  for (const k of [from, to]) if (!/^[a-z][a-z-]*$/.test(k)) throw new TypeError(`Not a keyword: ${k}`);
  if (from === to) return { text, changes: [] };
  const changes = [];
  let out = '', last = 0;
  // A marker starts at "{keyword" followed by a space, a pipe, or the closing brace, and not after a backslash.
  const START = new RegExp(`(?<!\\\\)\\{(${from}|cite|endnotes)(?=[\\s|}])(\\s*)([^\\s|;}]*)`, 'g');
  const parts = text.split(CODE);
  // Only a file that still has old markers is being migrated; in one already moved, {cite …} is the new grammar.
  const unmigrated = parts.some((p, i) => i % 3 === 0 && new RegExp(`(?<!\\\\)\\{(${from}(?=[\\s|}])|endnotes\\})`).test(p || ''));
  // split with two capture groups yields [text, code, tagname, text, code, tagname, …]
  for (let i = 0; i < parts.length; i += 3) {
    const segment = parts[i] ?? '';
    out += segment.replace(START, (m, kw, space, first, offset) => {
      const at = last + offset;
      let after = m;
      if (kw === 'endnotes') {
        if (space || first) return m;                          // only the bare legacy {endnotes}
        after = `{${to} endnote`;
      } else if (kw === from) {
        // The old keyword: a directive stays a directive; a work whose id is now a directive word becomes local:.
        after = `{${to}${space}${NEW_IN_051.includes(first) ? 'local:' + first : first}`;
      } else if (kw === 'cite' && from !== 'cite') {
        // The old work-only short form. Moving to another keyword, it's rewritten (a directive word, which was a work,
        // becomes local:). Moving to cite, it's left alone: an old {cite endnote} (a work named "endnote") and a new
        // {cite endnote} (the directive) can't be told apart, so it's flagged for a person, never guessed.
        if (to === 'cite') {
          if (unmigrated && DIRECTIVES.includes(first)) changes.push({ at, before: m, after: m, review: `"{cite ${first}…}" was a citation of a work named "${first}" before 0.5.1, and is the ${first} directive now. Check it by hand.` });
          return m;
        }
        after = `{${to}${space}${DIRECTIVES.includes(first) ? 'local:' + first : first}`;
      } else return m;
      changes.push({ at, before: m, after });
      return after;
    });
    last += segment.length;
    if (i + 1 < parts.length) { out += parts[i + 1]; last += parts[i + 1].length; }
  }
  return { text: out, changes };
}
