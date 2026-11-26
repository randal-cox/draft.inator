// The demo's stand-in for Zotero's web service: a small made-up library, answered in the shape api.zotero.org uses
// (items with csljson), so the Zotero dialog can be tried without an account. Key: samplesamplesamplesample.
// Nothing here is anyone's real library.
const library = { type: 'user', id: 1000001 };
const csl = (key, c) => ({ key, version: 7, library, data: { key, version: 7, itemType: c.type === 'book' ? 'book' : 'journalArticle', title: c.title }, csljson: { id: key, ...c } });
const ITEMS = [
  csl('BELL1992', { type: 'book', title: 'Ritual Theory, Ritual Practice', author: [{ family: 'Bell', given: 'Catherine' }], issued: { 'date-parts': [[1992]] }, publisher: 'Oxford University Press', 'publisher-place': 'New York' }),
  csl('OKAF2019', { type: 'article-journal', title: 'Masks and memory in river festivals', author: [{ family: 'Okafor', given: 'Ngozi' }], issued: { 'date-parts': [[2019]] }, 'container-title': 'Journal of Ritual Studies', volume: '33', issue: '2', page: '41–58', DOI: '10.1234/jrs.2019.041' }),
  csl('RIVE2020', { type: 'article-journal', title: 'Sampling and evidence in qualitative work', author: [{ family: 'Rivera', given: 'Ana' }, { family: 'Chen', given: 'Li' }], issued: { 'date-parts': [[2020]] }, 'container-title': 'Research Methods', volume: '12', issue: '2', page: '14–19' }),
  csl('GUES2006', { type: 'article-journal', title: 'How many interviews are enough?', author: [{ family: 'Guest', given: 'Greg' }, { family: 'Bunce', given: 'Arwen' }, { family: 'Johnson', given: 'Laura' }], issued: { 'date-parts': [[2006]] }, 'container-title': 'Field Methods', volume: '18', issue: '1', page: '59–82', URL: 'http://example.org/field-methods/18/59' }),
  csl('TURN1969', { type: 'book', title: 'The Ritual Process: Structure and Anti-Structure', author: [{ family: 'Turner', given: 'Victor' }], issued: { 'date-parts': [[1969]] }, publisher: 'Aldine', 'publisher-place': 'Chicago' }),
  csl('SCHE1985', { type: 'book', title: 'Between Theater and Anthropology', author: [{ family: 'Schechner', given: 'Richard' }], issued: { 'date-parts': [[1985]] }, publisher: 'University of Pennsylvania Press' })
];
export const SAMPLE_KEY = 'samplesamplesamplesample';
const json = (status, body) => new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
export async function sampleFetch(url, init = {}) {
  await new Promise(r => setTimeout(r, 250));   // a little like the network
  if ((init.headers || {})['Zotero-API-Key'] !== SAMPLE_KEY) return json(403, 'Invalid key');
  const u = new URL(url);
  if (u.pathname === '/keys/current') return json(200, { key: SAMPLE_KEY, userID: library.id, username: 'sample-library', access: { user: { library: true } } });
  const q = (u.searchParams.get('q') || '').toLowerCase();
  const hit = it => [it.csljson.title, ...(it.csljson.author || []).map(a => a.family), String(it.csljson.issued['date-parts'][0][0])].some(s => s.toLowerCase().includes(q));
  return json(200, ITEMS.filter(hit));
}
