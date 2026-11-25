// A Word file (.docx, as Word, Google Docs, and LibreOffice save it) to Markdown for the editor: paragraphs, headings,
// italics and bold, lists, links' text, and equations as LaTeX ($…$, $$…$$, from Word's maths; src/editor/omml.js).
// What it can't carry (footnotes, tables, images, comments) is counted and named, never dropped silently. Plain
// JavaScript: the browser's DecompressionStream unzips, and DOMParser (or one passed in) reads the XML.
import { ommlToLatex, tidyLatex } from './omml.js';

/** The files in a zip, by name, as bytes (stored or deflated entries; enough for Office files). */
export async function unzip(bytes) {
  const b = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  const dv = new DataView(b.buffer, b.byteOffset, b.byteLength);
  let eocd = -1;
  for (let i = b.length - 22; i >= Math.max(0, b.length - 65557); i--) if (dv.getUint32(i, true) === 0x06054b50) { eocd = i; break; }
  if (eocd < 0) throw new Error('This isn\'t a Word file (no zip directory found).');
  const count = dv.getUint16(eocd + 10, true);
  let p = dv.getUint32(eocd + 16, true);
  const files = {};
  for (let n = 0; n < count; n++) {
    if (dv.getUint32(p, true) !== 0x02014b50) throw new Error('This Word file is damaged (bad zip directory).');
    const method = dv.getUint16(p + 10, true), size = dv.getUint32(p + 20, true);
    const nameLen = dv.getUint16(p + 28, true), extraLen = dv.getUint16(p + 30, true), commentLen = dv.getUint16(p + 32, true);
    const offset = dv.getUint32(p + 42, true);
    const name = new TextDecoder().decode(b.subarray(p + 46, p + 46 + nameLen));
    files[name] = { method, size, offset };
    p += 46 + nameLen + extraLen + commentLen;
  }
  const read = async name => {
    const f = files[name]; if (!f) return null;
    const start = f.offset + 30 + dv.getUint16(f.offset + 26, true) + dv.getUint16(f.offset + 28, true);
    const raw = b.subarray(start, start + f.size);
    if (f.method === 0) return raw;
    if (f.method !== 8) throw new Error(`This Word file uses a compression the editor can't read (${f.method}).`);
    const out = await new Response(new Blob([raw]).stream().pipeThrough(new DecompressionStream('deflate-raw'))).arrayBuffer();
    return new Uint8Array(out);
  };
  return { names: Object.keys(files), read };
}

const local = n => (n.localName || n.nodeName || '').replace(/^.*:/, '');
const kids = n => [...(n.childNodes || [])].filter(c => c.nodeType === 1);
const kid = (n, name) => kids(n).find(c => local(c) === name);
const attr = (n, name) => { for (const a of n?.attributes || []) if ((a.localName || a.name).replace(/^.*:/, '') === name) return a.value; return null; };
const on = e => !!e && !['0', 'false', 'off'].includes(attr(e, 'val') ?? 'true');
const escapeMd = s => s.replace(/([\\*_`$[\]])/g, '\\$1');

/**
 * Markdown from a .docx.
 * @param {ArrayBuffer|Uint8Array} bytes
 * @param {{ parseXML?: (xml: string) => Document }} [options]
 * @returns {Promise<{ markdown: string, equations: number, notes: string[] }>}
 */
export async function docxToMarkdown(bytes, { parseXML = s => new DOMParser().parseFromString(s, 'application/xml') } = {}) {
  const zip = await unzip(bytes);
  const xml = await zip.read('word/document.xml');
  if (!xml) throw new Error('This isn\'t a Word document (no word/document.xml).');
  const doc = parseXML(new TextDecoder().decode(xml));
  const body = doc.getElementsByTagNameNS('*', 'body')[0] || (doc.documentElement && kid(doc.documentElement, 'body'));
  if (!body) throw new Error('This Word document has no body.');
  const lost = { footnotes: 0, tables: 0, images: 0, unknownMaths: new Set() };
  let equations = 0;

  const maths = (m, display) => {
    const unknown = [];
    const tex = tidyLatex(ommlToLatex(m, unknown));
    unknown.forEach(u => lost.unknownMaths.add(u));
    equations++;
    return display ? `$$ ${tex} $$` : `$${tex}$`;
  };
  // A run's text, with its emphasis. Adjacent runs with the same emphasis are joined first, so "*a**b*" can't happen.
  function inline(p) {
    const pieces = [];
    const walk = n => {
      for (const c of kids(n)) {
        const k = local(c);
        if (k === 'r') {
          const pr = kid(c, 'rPr'), i = on(pr && kid(pr, 'i')), b = on(pr && kid(pr, 'b'));
          let t = '';
          for (const x of kids(c)) {
            const kk = local(x);
            if (kk === 't') t += x.textContent;
            else if (kk === 'tab') t += '\t';
            else if (kk === 'br' || kk === 'cr') t += '\n';
            else if (kk === 'footnoteReference' || kk === 'endnoteReference') lost.footnotes++;
            else if (kk === 'drawing' || kk === 'pict' || kk === 'object') lost.images++;
          }
          if (t) pieces.push({ t, i, b });
        } else if (k === 'oMath') pieces.push({ raw: maths(c, false) });
        else if (k === 'hyperlink' || k === 'smartTag' || k === 'ins' || k === 'sdt' || k === 'sdtContent' || k === 'fldSimple') walk(c);
      }
    };
    walk(p);
    const merged = [];
    for (const x of pieces) {
      const last = merged[merged.length - 1];
      if (last && !x.raw && !last.raw && last.i === x.i && last.b === x.b) last.t += x.t; else merged.push({ ...x });
    }
    return merged.map(x => {
      if (x.raw) return x.raw;
      const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(x.t), core = escapeMd(m[2]);
      if (!core) return x.t;
      const mark = x.b && x.i ? '***' : x.b ? '**' : x.i ? '*' : '';
      return m[1] + mark + core + mark + m[3];
    }).join('');
  }

  const blocks = [];
  for (const n of kids(body)) {
    const k = local(n);
    if (k === 'tbl') { lost.tables++; continue; }
    if (k !== 'p') continue;
    const para = kid(n, 'oMathPara');
    if (para) { blocks.push(maths(para, true)); continue; }
    const pr = kid(n, 'pPr'), style = (attr(pr && kid(pr, 'pStyle'), 'val') || '').toLowerCase();
    const text = inline(n).replace(/\s+$/, '');
    if (!text.trim()) continue;
    const h = /^(heading|berschrift|titre)\s*([1-6])$/.exec(style) || (style === 'title' ? [0, 0, '1'] : null);
    if (h) { blocks.push('#'.repeat(+h[2]) + ' ' + text.replace(/^\*+|\*+$/g, '')); continue; }
    if (pr && kid(pr, 'numPr')) { blocks.push('- ' + text); continue; }
    blocks.push(text);
  }
  // Consecutive list items stay one list.
  const markdown = blocks.reduce((out, b, i) => out + (i ? (b.startsWith('- ') && blocks[i - 1].startsWith('- ') ? '\n' : '\n\n') : '') + b, '') + '\n';
  const notes = [];
  if (lost.footnotes) notes.push(`${lost.footnotes} footnote${lost.footnotes === 1 ? '' : 's'}`);
  if (lost.tables) notes.push(`${lost.tables} table${lost.tables === 1 ? '' : 's'}`);
  if (lost.images) notes.push(`${lost.images} image${lost.images === 1 ? '' : 's'} (add ${lost.images === 1 ? 'it' : 'them'} with Figure)`);
  if (lost.unknownMaths.size) notes.push(`maths the editor doesn't know (${[...lost.unknownMaths].join(', ')}) kept as text: check those equations`);
  return { markdown, equations, notes };
}
