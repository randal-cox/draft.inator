/* draft.inator: save to GitHub the way Sveltia CMS's editorial workflow does, so Sveltia sees the drafts as its own.
   One branch per entry, `cms/<collection>/<slug>`; one draft pull request on it, labelled `<prefix>draft`
   (`sveltia-cms/draft` by default); later saves add commits to that branch. People review and merge; this never
   merges. Plain browser JavaScript (fetch); the token is the signed-in writer's, given by the site.

     const saver = createWorkflowSaver({ token, owner: 'org', repo: 'site' });
     const { text, sha } = await saver.load({ collection: 'essays', slug: 'masks', path: 'content/essays/masks.md' });
     const { pr } = await saver.save({ collection: 'essays', slug: 'masks', path, text: edited, sha,
                                       message: 'CMS: edit essays "masks"' });
*/

const enc = new TextEncoder(), dec = new TextDecoder();
const toBase64 = text => { let s = ''; const b = enc.encode(text); for (let i = 0; i < b.length; i += 0x8000) s += String.fromCharCode(...b.subarray(i, i + 0x8000)); return btoa(s); };
const fromBase64 = b64 => dec.decode(Uint8Array.from(atob(b64.replace(/\s/g, '')), c => c.charCodeAt(0)));

/** The editorial-workflow branch for an entry, as Sveltia names it (a slash or percent in the slug is encoded). */
export const workflowBranch = (collection, slug) => `cms/${collection}/${slug.replaceAll('%', '%25').replaceAll('/', '%2F')}`;

export class SaveConflict extends Error {
  constructor() { super('Someone else saved this page since you opened it. Copy your changes, reload, and try again.'); this.name = 'SaveConflict'; }
}

/**
 * @param {object} o
 * @param {string} o.token  The writer's GitHub token.
 * @param {string} o.owner
 * @param {string} o.repo
 * @param {string} [o.base]  The branch drafts start from and pull requests go into (default `main`).
 * @param {string} [o.labelPrefix]  The site's CMS label prefix (default `sveltia-cms/`).
 * @param {string} [o.api]  GitHub API root (default `https://api.github.com`).
 * @param {typeof fetch} [o.fetch]  For tests.
 */
export function createWorkflowSaver({ token, owner, repo, base = 'main', labelPrefix = 'sveltia-cms/', api = 'https://api.github.com', fetch: f = globalThis.fetch.bind(globalThis) }) {
  const root = `${api}/repos/${owner}/${repo}`;
  async function call(path, { method = 'GET', body, ok404 = false } = {}) {
    const res = await f(root + path, {
      method,
      headers: { Accept: 'application/vnd.github+json', Authorization: `Bearer ${token}`, 'X-GitHub-Api-Version': '2022-11-28',
        ...(body && { 'Content-Type': 'application/json' }) },
      ...(body && { body: JSON.stringify(body) })
    });
    if (ok404 && res.status === 404) return null;
    if (res.status === 409 || res.status === 422 && method === 'PUT') throw new SaveConflict();
    if (!res.ok) {
      let detail = ''; try { detail = (await res.json()).message || ''; } catch {}
      throw new Error(`GitHub said ${res.status}${detail ? ': ' + detail : ''} (${method} ${path})`);
    }
    return res.status === 204 ? null : res.json();
  }
  const file = async (path, ref) => call(`/contents/${path.split('/').map(encodeURIComponent).join('/')}?ref=${encodeURIComponent(ref)}`, { ok404: true });
  const openPull = async branch => (await call(`/pulls?state=open&head=${encodeURIComponent(owner + ':' + branch)}&base=${encodeURIComponent(base)}`))[0] || null;

  return {
    /**
     * The entry's current text: from its open draft if there is one (so nobody forks an entry), else from `base`.
     * @returns {Promise<{ text: string | null, sha: string | null, branch: string, draft: boolean, pr: object | null }>}
     */
    async load({ collection, slug, path }) {
      const branch = workflowBranch(collection, slug), pr = await openPull(branch);
      const found = await file(path, pr ? branch : base);
      return { text: found ? fromBase64(found.content) : null, sha: found?.sha ?? null, branch, draft: !!pr,
        pr: pr && { number: pr.number, url: pr.html_url } };
    },

    /**
     * Commit `text` to the entry's draft branch (making it from `base` if needed) and make sure a draft pull request
     * is open for it. `sha` is required: the file's sha as load() (or the previous save) gave it, null for a new file.
     * If the file changed since, a SaveConflict is thrown and nothing is written. Keep the returned `sha` for the
     * next save.
     * @returns {Promise<{ pr: { number, url }, created: boolean, commit: string, sha: string }>}
     */
    async save({ collection, slug, path, text, sha, message, title }) {
      if (sha === undefined) throw new TypeError('save() needs the file\'s sha as load() gave it (null for a new file), so it never overwrites a newer save.');
      const branch = workflowBranch(collection, slug);
      message = message || `Edit ${collection} "${slug}"`;
      if (!(await call(`/git/ref/heads/${branch.split('/').map(encodeURIComponent).join('/')}`, { ok404: true }))) {
        const head = await call(`/git/ref/heads/${encodeURIComponent(base)}`);
        await call('/git/refs', { method: 'POST', body: { ref: `refs/heads/${branch}`, sha: head.object.sha } });
      }
      const current = await file(path, branch);
      if ((current?.sha ?? null) !== sha) throw new SaveConflict();
      const put = await call(`/contents/${path.split('/').map(encodeURIComponent).join('/')}`, {
        method: 'PUT', body: { message, content: toBase64(text), branch, ...(sha && { sha }) }
      });
      let pr = await openPull(branch), created = false;
      if (!pr) {
        pr = await call('/pulls', { method: 'POST', body: { title: title || message, head: branch, base, draft: true, body: '' } });
        await call(`/issues/${pr.number}/labels`, { method: 'POST', body: { labels: [labelPrefix + 'draft'] } });
        created = true;
      }
      return { pr: { number: pr.number, url: pr.html_url }, created, commit: put.commit.sha, sha: put.content.sha };
    }
  };
}
