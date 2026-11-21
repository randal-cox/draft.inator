// The editorial-workflow saver against a fake GitHub that keeps branches, files, and pull requests in memory.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createWorkflowSaver, workflowBranch, SaveConflict } from '../src/editor/github.js';

function fakeGitHub(files) {
  const b64 = s => Buffer.from(s, 'utf8').toString('base64');
  const state = { branches: { main: { sha: 'c0', files: { ...files } } }, pulls: [], labels: {}, calls: [], n: 0 };
  const sha = s => 'f' + Buffer.from(s).toString('hex').slice(0, 12);
  const json = (status, body) => ({ ok: status < 300, status, json: async () => body });
  const fetch = async (url, init = {}) => {
    const u = new URL(url), p = decodeURIComponent(u.pathname.replace('/repos/o/r', '')), method = init.method || 'GET';
    const body = init.body && JSON.parse(init.body);
    state.calls.push(`${method} ${p}`);
    assert.equal(init.headers.Authorization, 'Bearer T');
    let m;
    if (method === 'GET' && (m = /^\/git\/ref\/heads\/(.+)$/.exec(p))) return state.branches[m[1]] ? json(200, { object: { sha: state.branches[m[1]].sha } }) : json(404, {});
    if (method === 'POST' && p === '/git/refs') { const name = body.ref.slice(11); state.branches[name] = { sha: body.sha, files: { ...state.branches.main.files } }; return json(201, {}); }
    if (method === 'GET' && (m = /^\/contents\/(.+)$/.exec(p))) {
      const t = state.branches[u.searchParams.get('ref')]?.files[m[1]];
      return t == null ? json(404, {}) : json(200, { content: b64(t), sha: sha(t) });
    }
    if (method === 'PUT' && (m = /^\/contents\/(.+)$/.exec(p))) {
      const br = state.branches[body.branch], old = br.files[m[1]];
      if ((old == null ? undefined : sha(old)) !== body.sha) return json(409, { message: 'sha mismatch' });
      br.files[m[1]] = Buffer.from(body.content, 'base64').toString('utf8');
      br.sha = 'c' + (++state.n);
      return json(200, { commit: { sha: br.sha }, content: { sha: sha(br.files[m[1]]) } });
    }
    if (method === 'GET' && p === '/pulls') return json(200, state.pulls.filter(pr => `o:${pr.head}` === u.searchParams.get('head') && pr.state === 'open'));
    if (method === 'POST' && p === '/pulls') { const pr = { number: 100 + state.pulls.length, html_url: 'https://github.com/o/r/pull/' + (100 + state.pulls.length), ...body, state: 'open' }; state.pulls.push(pr); return json(201, pr); }
    if (method === 'POST' && (m = /^\/issues\/(\d+)\/labels$/.exec(p))) { state.labels[m[1]] = body.labels; return json(200, []); }
    return json(500, { message: 'unexpected ' + method + ' ' + p });
  };
  return { state, fetch };
}

const PATH = 'content/essays/masks.md';
const ENTRY = { collection: 'essays', slug: 'masks', path: PATH };

test('branch names follow Sveltia', () => {
  assert.equal(workflowBranch('essays', 'masks'), 'cms/essays/masks');
  assert.equal(workflowBranch('pages', 'about/us'), 'cms/pages/about%2Fus');
});

test('first save: a branch from main, a commit, and one draft pull request labelled for Sveltia', async () => {
  const gh = fakeGitHub({ [PATH]: '---\ntitle: Masks\n---\nOld — text\n' });
  const saver = createWorkflowSaver({ token: 'T', owner: 'o', repo: 'r', fetch: gh.fetch });
  const loaded = await saver.load(ENTRY);
  assert.equal(loaded.text, '---\ntitle: Masks\n---\nOld — text\n');
  assert.equal(loaded.draft, false);
  const r = await saver.save({ ...ENTRY, text: '---\ntitle: Masks\n---\nNew — text ✓\n', sha: loaded.sha, message: 'CMS: edit essays "masks"' });
  assert.equal(r.created, true);
  assert.equal(gh.state.branches['cms/essays/masks'].files[PATH], '---\ntitle: Masks\n---\nNew — text ✓\n');
  assert.equal(gh.state.branches.main.files[PATH], '---\ntitle: Masks\n---\nOld — text\n', 'main is untouched');
  const pr = gh.state.pulls[0];
  assert.deepEqual([pr.head, pr.base, pr.draft, pr.title], ['cms/essays/masks', 'main', true, 'CMS: edit essays "masks"']);
  assert.deepEqual(gh.state.labels[pr.number], ['sveltia-cms/draft']);
  assert.ok(!gh.state.calls.some(c => /merge/.test(c)), 'it never merges');
});

test('later saves continue the open draft: same branch, same pull request', async () => {
  const gh = fakeGitHub({ [PATH]: 'v1\n' });
  const saver = createWorkflowSaver({ token: 'T', owner: 'o', repo: 'r', fetch: gh.fetch });
  let s = await saver.load(ENTRY);
  const first = await saver.save({ ...ENTRY, text: 'v2\n', sha: s.sha });
  s = await saver.load(ENTRY);
  assert.equal(s.text, 'v2\n', 'load reads the open draft, not main');
  assert.equal(s.draft, true);
  const second = await saver.save({ ...ENTRY, text: 'v3\n', sha: s.sha });
  assert.equal(second.created, false);
  assert.equal(second.pr.number, first.pr.number);
  assert.equal(gh.state.pulls.length, 1);
});

test('a conflicting save writes nothing', async () => {
  const gh = fakeGitHub({ [PATH]: 'v1\n' });
  const saver = createWorkflowSaver({ token: 'T', owner: 'o', repo: 'r', fetch: gh.fetch });
  const stale = await saver.load(ENTRY);
  const other = await saver.load(ENTRY);
  await saver.save({ ...ENTRY, text: 'theirs\n', sha: other.sha });
  await assert.rejects(saver.save({ ...ENTRY, text: 'mine\n', sha: stale.sha }), SaveConflict);
  assert.equal(gh.state.branches['cms/essays/masks'].files[PATH], 'theirs\n');
});

test('a new file can be created, and a custom label prefix is used', async () => {
  const gh = fakeGitHub({});
  const saver = createWorkflowSaver({ token: 'T', owner: 'o', repo: 'r', labelPrefix: 'decap-cms/', fetch: gh.fetch });
  const s = await saver.load(ENTRY);
  assert.equal(s.text, null);
  await saver.save({ ...ENTRY, text: 'new\n', sha: s.sha });
  assert.deepEqual(Object.values(gh.state.labels)[0], ['decap-cms/draft']);
});
