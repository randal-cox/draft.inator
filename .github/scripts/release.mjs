// Release the version in package.json if it has no tag yet: tag the current commit and publish its CHANGELOG.md
// section as the release notes. Used by .github/workflows/release.yml. `--dry-run` prints what it would do.
import fs from 'node:fs';
import { execFileSync } from 'node:child_process';

const dry = process.argv.includes('--dry-run');
const run = (cmd, args) => execFileSync(cmd, args, { encoding: 'utf8' }).trim();
const { version } = JSON.parse(fs.readFileSync('package.json', 'utf8'));
const tag = `v${version}`;

if (version.includes('-')) { console.log(`${version} is a development version; nothing to release.`); process.exit(0); }
if (run('git', ['tag', '--list', tag])) { console.log(`${tag} already exists; nothing to release.`); process.exit(0); }

// The section is "## 0.2.0 · 2026-11-22 · Optional title", up to the next "## ".
const changelog = fs.readFileSync('CHANGELOG.md', 'utf8');
const sections = changelog.split(/^(?=## )/m);
const section = sections.find(s => s.split('\n')[0].replace(/^## /, '').split(' · ')[0].trim() === version);
if (!section) {
  console.error(`CHANGELOG.md has no "## ${version} · date" section. Add one before releasing ${tag}.`);
  process.exit(1);
}
const [heading, ...body] = section.trimEnd().split('\n');
const title = heading.replace(/^## /, '').split(' · ')[2]?.trim();
const name = `draft.inator ${version}${title ? ': ' + title : ''}`;
const notes = body.join('\n').trim();

if (dry) { console.log(`Would tag ${tag} and publish "${name}":\n\n${notes}`); process.exit(0); }
const file = `${process.env.RUNNER_TEMP || '.'}/release-notes.md`;
fs.writeFileSync(file, notes + '\n');
run('gh', ['release', 'create', tag, '--target', process.env.GITHUB_SHA || run('git', ['rev-parse', 'HEAD']), '--title', name, '--notes-file', file]);
console.log(`Released ${tag}.`);
