// A small XML reader for the tests: elements, attributes, and text, shaped like the browser's DOM (localName,
// nodeType, childNodes, attributes, textContent). Enough for OMML and WordprocessingML; not a general parser.
const ENT = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'" };
const decode = s => s.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (m, e) => e[0] === '#' ? String.fromCodePoint(e[1] === 'x' ? parseInt(e.slice(2), 16) : +e.slice(1)) : ENT[e] ?? m);
class Node {
  constructor(type, name, attrs = []) { this.nodeType = type; this.nodeName = name; this.localName = name && name.replace(/^.*:/, ''); this.attributes = attrs; this.childNodes = []; this.data = ''; }
  get textContent() { return this.nodeType === 3 ? this.data : this.childNodes.map(c => c.textContent).join(''); }
  getElementsByTagNameNS(ns, name) { const out = []; const walk = n => { for (const c of n.childNodes) if (c.nodeType === 1) { if (c.localName === name) out.push(c); walk(c); } }; walk(this); return out; }
}
export function parseXML(xml) {
  const root = new Node(9, '#document'), stack = [root];
  const re = /<\?[\s\S]*?\?>|<!--[\s\S]*?-->|<(\/?)([\w:.-]+)((?:\s+[\w:.-]+\s*=\s*(?:"[^"]*"|'[^']*'))*)\s*(\/?)>|([^<]+)/g;
  for (const m of xml.matchAll(re)) {
    const top = stack[stack.length - 1];
    if (m[5] !== undefined) { const t = new Node(3); t.data = decode(m[5]); top.childNodes.push(t); continue; }
    if (!m[2]) continue;
    if (m[1]) { stack.pop(); continue; }
    const attrs = [...(m[3] || '').matchAll(/([\w:.-]+)\s*=\s*(?:"([^"]*)"|'([^']*)')/g)].map(a => ({ name: a[1], localName: a[1].replace(/^.*:/, ''), value: decode(a[2] ?? a[3]) }));
    const el = new Node(1, m[2], attrs); top.childNodes.push(el);
    if (!m[4]) stack.push(el);
  }
  root.documentElement = root.childNodes.find(c => c.nodeType === 1);
  return root;
}
