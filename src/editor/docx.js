// A Word file (.docx, as Word, Google Docs, and LibreOffice save it) to Markdown for the editor: paragraphs, headings,
// italics, bold, superscript and subscript (<sup>, <sub>), lists, links' text, equations as LaTeX ($…$, $$…$$, from
// Word's maths; src/math/omml.js), and figures: an image on a line of its own, with its caption and its number as a
// label. What it can't carry (footnotes, tables, images inside text, comments) is counted and named, never dropped
// silently. Plain JavaScript: the browser's DecompressionStream unzips, and DOMParser (or one passed in) reads the XML.
//
// The result is the projection the combined import works on (docs/import-fixture.md): one Markdown string, the
// regions in it (maths, figures, captions), a revision naming that exact string, the images to stage, and proposed
// edits ("Eq. 1" → {ref eq:1}) that nothing applies until the writer says so.
import { ommlToLatex, tidyLatex, text as symbolsToLatex } from '../math/omml.js';
import { findTeX } from '../math/math.js';

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
const escapeMd = s => s.replace(/([\\*_`$[\]<])/g, '\\$1');
const below = (n, name) => { const out = []; const go = x => { for (const c of kids(x)) { if (local(c) === name) out.push(c); go(c); } }; go(n); return out; };

/** A revision for an exact string: FNV-1a, 32 bits, as hex. Any change to the string changes it (in practice). */
export function revisionOf(text) {
  let h = 0x811c9dc5;
  for (let i = 0; i < text.length; i++) { h ^= text.charCodeAt(i); h = Math.imul(h, 0x01000193) >>> 0; }
  return h.toString(16).padStart(8, '0');
}

// A value in a {figure …} tag, quoted as the Figure block writes it: whole {…} markers and $…$ maths kept as they are,
// and elsewhere " and \ escaped (src/blocks/figure.js; the tests check the block reads these back unchanged).
function braceEnd(s, i) {
  for (let j = i, depth = 0; j < s.length; j++) {
    const c = s[j];
    if (c === '\\') { j++; continue; }
    if (c === '\n') return -1;
    if (c === '{') depth++;
    else if (c === '}' && --depth === 0) return j + 1;
  }
  return -1;
}
function mathEnd(s, i) {
  if (s[i + 1] === '$' || !s[i + 1] || /\s/.test(s[i + 1])) return -1;
  for (let j = i + 1; j < s.length; j++) {
    const c = s[j];
    if (c === '\\') { j++; continue; }
    if (c === '\n') return -1;
    if (c === '$' && !/\s/.test(s[j - 1]) && !/\d/.test(s[j + 1] || '')) return j + 1;
  }
  return -1;
}
export function quoteValue(v) {
  let out = '';
  for (let i = 0; i < v.length;) {
    const c = v[i], e = c === '{' ? braceEnd(v, i) : c === '$' ? mathEnd(v, i) : -1;
    if (e > 0) { out += v.slice(i, e); i = e; } else { out += /["\\]/.test(c) ? '\\' + c : c; i++; }
  }
  return '"' + out + '"';
}

/**
 * Markdown from a .docx.
 * @param {ArrayBuffer|Uint8Array} bytes
 * @param {{ parseXML?: (xml: string) => Document }} [options]
 * @returns {Promise<{ markdown: string, revision: string, regions: object[], media: object[], figures: number,
 *   proposals: object[], equations: number, notes: string[], checks: string[] }>}  notes: what didn't come in;
 *   checks: what came in and needs a look
 */
export async function docxToMarkdown(bytes, { parseXML = s => new DOMParser().parseFromString(s, 'application/xml'), mediaPath = name => 'media/' + name } = {}) {
  const zip = await unzip(bytes);
  const xml = await zip.read('word/document.xml');
  if (!xml) throw new Error('This isn\'t a Word document (no word/document.xml).');
  const doc = parseXML(new TextDecoder().decode(xml));
  // Where each image is: the document's relationships, by id (rId7 → media/image1.png).
  const rels = {};
  const relsXml = await zip.read('word/_rels/document.xml.rels');
  if (relsXml) for (const r of below(parseXML(new TextDecoder().decode(relsXml)), 'Relationship')) rels[attr(r, 'Id')] = attr(r, 'Target');
  const body = doc.getElementsByTagNameNS('*', 'body')[0] || (doc.documentElement && kid(doc.documentElement, 'body'));
  if (!body) throw new Error('This Word document has no body.');
  const lost = { footnotes: 0, tables: 0, images: 0, unknownMaths: new Set() };
  const media = [], figures = [];
  let equations = 0;

  const maths = (m, display) => {
    const unknown = [];
    const tex = tidyLatex(ommlToLatex(m, unknown));
    unknown.forEach(u => lost.unknownMaths.add(u));
    equations++;
    return display ? `$$ ${tex} $$` : `$${tex}$`;
  };
  // An equation set on a line of its own the way Google Docs (and many Word users) do it: maths inside an ordinary
  // paragraph, perhaps with part of the formula typed as text ("C ≥ 1-"), tabs to centre it, and its number typed
  // at the end ("(Eq 3)"). Such a paragraph becomes one displayed equation, its number a label ({#eq:3}). A paragraph
  // with words in it (three letters or more outside the maths) is prose, and its maths stays inline.
  function displayed(p) {
    const parts = [];
    for (const c of kids(p)) {
      if (local(c) === 'oMath') parts.push({ math: c });
      else if (local(c) === 'r') parts.push({ text: kids(c).map(x => (local(x) === 't' ? x.textContent : local(x) === 'tab' ? ' ' : '')).join('') });
      else if (local(c) !== 'pPr' && local(c) !== 'bookmarkStart' && local(c) !== 'bookmarkEnd') return null;
    }
    if (!parts.some(x => x.math)) return null;
    let words = parts.filter(x => x.text != null).map(x => x.text).join('');
    const tag = /\(\s*(?:Eq\.?|Equation)\s*(\d+)\s*\)\s*$/i.exec(words);
    if (tag) words = words.slice(0, tag.index);
    if (/[A-Za-z]{3,}/.test(words) || words.trim().length > 24) return null;
    // The number's own text run(s) are dropped; everything else, text and maths, in order.
    let tagLeft = tag ? tag[0].length : 0;
    for (let i = parts.length - 1; i >= 0 && tagLeft > 0; i--) {
      if (parts[i].text == null) break;
      const cut = Math.min(tagLeft, parts[i].text.length);
      parts[i].text = parts[i].text.slice(0, parts[i].text.length - cut); tagLeft -= cut;
    }
    const unknown = [];
    const tex = tidyLatex(parts.map(x => (x.math ? ommlToLatex(x.math, unknown) : symbolsToLatex(x.text))).join(' '));
    unknown.forEach(u => lost.unknownMaths.add(u));
    equations++;
    if (tag) labelled.push(tag[1]);
    return `$$ ${tex} $$` + (tag ? ` {#eq:${tag[1]}}` : '');
  }
  const labelled = [], asText = [], figLabelled = [];
  // A run's text, with its emphasis. Adjacent runs with the same emphasis are joined first, so "*a**b*" can't happen.
  function inline(p) {
    const pieces = [];
    const walk = n => {
      for (const c of kids(n)) {
        const k = local(c);
        if (k === 'r') {
          const pr = kid(c, 'rPr'), i = on(pr && kid(pr, 'i')), b = on(pr && kid(pr, 'b'));
          const va = attr(pr && kid(pr, 'vertAlign'), 'val'), v = va === 'superscript' ? 'sup' : va === 'subscript' ? 'sub' : '';
          let t = '';
          for (const x of kids(c)) {
            const kk = local(x);
            if (kk === 't') t += x.textContent;
            else if (kk === 'tab') t += '\t';
            else if (kk === 'br' || kk === 'cr') t += '\n';
            else if (kk === 'footnoteReference' || kk === 'endnoteReference') lost.footnotes++;
            else if (kk === 'drawing' || kk === 'pict' || kk === 'object') lost.images++;
          }
          if (t) pieces.push({ t, i, b, v });
        } else if (k === 'oMath') pieces.push({ raw: maths(c, false) });
        else if (k === 'hyperlink' || k === 'smartTag' || k === 'ins' || k === 'sdt' || k === 'sdtContent' || k === 'fldSimple') walk(c);
      }
    };
    walk(p);
    const merged = [];
    for (const x of pieces) {
      const last = merged[merged.length - 1];
      if (last && !x.raw && !last.raw && last.i === x.i && last.b === x.b && last.v === x.v) last.t += x.t; else merged.push({ ...x });
    }
    return merged.map(x => {
      if (x.raw) return x.raw;
      const m = /^(\s*)([\s\S]*?)(\s*)$/.exec(x.t), core = escapeMd(m[2]);
      if (!core) return x.t;
      const mark = x.b && x.i ? '***' : x.b ? '**' : x.i ? '*' : '';
      const v = x.v ? `<${x.v}>${core}</${x.v}>` : core;
      return m[1] + mark + v + mark + m[3];
    }).join('');
  }

  // A paragraph that is only an image (or images): each becomes a figure. Its picture is staged as media.
  async function figureParagraph(p) {
    const texts = below(p, 't').map(t => t.textContent).join('').trim();
    const drawings = [...below(p, 'drawing'), ...below(p, 'pict')];
    if (!drawings.length || texts) return null;
    const out = [];
    for (const d of drawings) {
      const blip = below(d, 'blip')[0], id = blip && (attr(blip, 'embed') || attr(blip, 'link'));
      const target = id && rels[id];
      const bytes = target && await zip.read('word/' + target.replace(/^\/?(word\/)?/, ''));
      if (!bytes) { lost.images++; continue; }
      const name = target.split('/').pop(), path = mediaPath(name);
      const pr = below(d, 'docPr')[0], alt = (pr && (attr(pr, 'descr') || '')).trim();
      media.push({ name, path, bytes, type: /\.png$/i.test(name) ? 'image/png' : /\.jpe?g$/i.test(name) ? 'image/jpeg' : /\.gif$/i.test(name) ? 'image/gif' : /\.svg$/i.test(name) ? 'image/svg+xml' : 'application/octet-stream' });
      const fig = { kind: 'figure', path, alt, caption: '', label: null };
      figures.push(fig); out.push(fig);
    }
    return out;
  }
  const blocks = [];
  for (const n of kids(body)) {
    const k = local(n);
    if (k === 'tbl') { lost.tables++; continue; }
    if (k !== 'p') continue;
    const figs = await figureParagraph(n);
    if (figs) { blocks.push(...figs); continue; }
    const pstyle = (attr(kid(n, 'pPr') && kid(kid(n, 'pPr'), 'pStyle'), 'val') || '').toLowerCase();
    if (pstyle === 'caption') { const t = inline(n).trim(); if (t) blocks.push({ kind: 'caption', text: t }); continue; }
    const para = kid(n, 'oMathPara');
    if (para) { blocks.push(maths(para, true)); continue; }
    const shown = displayed(n);
    if (shown) { blocks.push(shown); continue; }
    const pr = kid(n, 'pPr'), style = (attr(pr && kid(pr, 'pStyle'), 'val') || '').toLowerCase();
    const text = inline(n).replace(/\s+$/, '');
    // An equation typed as plain text, with its number: say so, since it can't become maths on its own.
    const typedEq = /\(\s*(?:Eq\.?|Equation)\s*(\d+)\s*\)\s*$/i.exec(text);
    if (typedEq && !/\$/.test(text) && !/[A-Za-z]{3,}/.test(text.slice(0, typedEq.index))) asText.push(typedEq[1]);   // no words: a formula
    if (!text.trim()) continue;
    const h = /^(heading|berschrift|titre)\s*([1-6])$/.exec(style) || (style === 'title' ? [0, 0, '1'] : null);
    if (h) { blocks.push('#'.repeat(+h[2]) + ' ' + text.replace(/^\*+|\*+$/g, '')); continue; }
    if (pr && kid(pr, 'numPr')) { blocks.push('- ' + text); continue; }
    blocks.push(text);
  }
  // A caption goes with the figure just before it (or, if none, just after it). "Figure 2." at its start becomes the
  // figure's label (fig:2), as "(Eq 3)" does for equations; the number itself is never written.
  // Google Docs has no caption style: a paragraph just after a figure that starts "Figure 2" is its caption.
  for (let i = 1; i < blocks.length; i++) {
    if (typeof blocks[i] === 'string' && blocks[i - 1]?.kind === 'figure' && /^\s*\**(?:Figure|Fig\.?)\s+\d+\b/i.test(blocks[i])) blocks[i] = { kind: 'caption', text: blocks[i] };
  }
  for (let i = 0; i < blocks.length; i++) {
    const c = blocks[i];
    if (c?.kind !== 'caption') continue;
    const fig = [blocks[i - 1], blocks[i + 1]].find(b => b?.kind === 'figure' && !b.caption);
    if (!fig) continue;
    const num = /^\s*(?:\*+)?(?:Figure|Fig\.?)\s+(\d+)\s*(?:\*+)?\s*[.:–—-]?\s*/i.exec(c.text);
    fig.caption = num ? c.text.slice(num[0].length) : c.text;
    if (num) { fig.label = 'fig:' + num[1]; figLabelled.push(num[1]); }
    blocks[i] = null;
  }
  const figLine = f => `{figure ${/[\s"|{}]/.test(f.path) ? quoteValue(f.path) : f.path}${f.alt ? ` | alt:${quoteValue(f.alt)}` : ''}${f.label ? ` | label:${f.label}` : ''}${f.caption ? ` | caption:${quoteValue(f.caption)}` : ''}}`;
  const lines = blocks.filter(Boolean).map(b => (typeof b === 'string' ? b : b.kind === 'figure' ? figLine(b) : b.text));
  // Consecutive list items stay one list.
  const markdown = lines.reduce((out, b, i) => out + (i ? (b.startsWith('- ') && lines[i - 1].startsWith('- ') ? '\n' : '\n\n') : '') + b, '') + '\n';
  const noAlt = figures.map((f, i) => (f.alt ? 0 : i + 1)).filter(Boolean);

  // The regions of the projection: maths (opaque to citation finding), figures, and captions (eligible).
  const regions = [];
  for (const m of markdown.matchAll(/^\{figure [^\n]*\}$/gm)) {
    regions.push({ kind: 'figure', start: m.index, end: m.index + m[0].length });
    const cap = /\| caption:"/.exec(m[0]);
    if (cap) regions.push({ kind: 'caption', start: m.index + cap.index + cap[0].length, end: m.index + m[0].length - 2 });
  }
  for (const t of findTeX(markdown)) regions.push({ kind: 'math', start: t.start, end: t.end });
  regions.sort((x, y) => x.start - y.start || y.end - x.end);

  // Proposed references: "Eq. 1" or "Figure 2" in the prose, for labels this file made. A mention inside a typed
  // citation's brackets ("(Eq. 1; Bell, 1992)") is left for the import review, where citations and references are
  // decided together; nothing here is applied until the writer says so.
  const labels = new Set([...labelled.map(n => 'eq:' + n), ...figures.filter(f => f.label).map(f => f.label)]);
  const opaque = regions.filter(r => r.kind === 'math' || r.kind === 'figure');
  const proposals = [], leftInCitations = [];
  for (const m of markdown.matchAll(/\b(Eq\.?|Equation|Figure|Fig\.)\s+(\d+)\b/g)) {
    const label = (/^Eq|^Equation/.test(m[1]) ? 'eq:' : 'fig:') + m[2];
    const start = m.index, end = m.index + m[0].length;
    if (!labels.has(label) || opaque.some(r => start < r.end && end > r.start)) continue;
    const open = markdown.lastIndexOf('(', start), close = markdown.indexOf(')', end);
    const para = markdown.lastIndexOf('\n\n', start);
    if (open > para && close > 0 && !markdown.slice(open, start).includes(')') && /\b(1[5-9]|20)\d\d[a-z]?\b/.test(markdown.slice(open, close))) { leftInCitations.push(m[0]); continue; }
    proposals.push({ start, end, replacement: `{ref ${label}}`, owner: 'ref', text: m[0] });
  }
  const notes = [];
  const checks = [];   // what came in but needs a look: labels made from numbers, missing alt text, and so on
  if (lost.footnotes) notes.push(`${lost.footnotes} footnote${lost.footnotes === 1 ? '' : 's'}`);
  if (lost.tables) notes.push(`${lost.tables} table${lost.tables === 1 ? '' : 's'}`);
  if (lost.images) notes.push(`${lost.images} image${lost.images === 1 ? '' : 's'} inside text (add ${lost.images === 1 ? 'it' : 'them'} with Figure)`);
  if (figLabelled.length) checks.push(`figure numbers ${figLabelled.join(', ')} became labels (fig:${figLabelled[0]}…)`);
  if (noAlt.length) checks.push(`figure${noAlt.length === 1 ? '' : 's'} ${noAlt.join(', ')} need${noAlt.length === 1 ? 's' : ''} alt text: say what ${noAlt.length === 1 ? 'it shows' : 'each shows'}, with Edit`);
  if (leftInCitations.length) checks.push(`${leftInCitations.length} mention${leftInCitations.length === 1 ? '' : 's'} such as "${leftInCitations[0]}" ${leftInCitations.length === 1 ? 'shares' : 'share'} brackets with a typed citation: rewrite ${leftInCitations.length === 1 ? 'it' : 'them'} by hand (neither a reference nor Import citations can take ${leftInCitations.length === 1 ? 'it' : 'them'} apart)`);
  if (labelled.length) checks.push(`equation numbers ${labelled.join(', ')} became labels (eq:${labelled[0]}…)`);
  if (asText.length) checks.push(`equation${asText.length === 1 ? '' : 's'} ${asText.join(', ')} ${asText.length === 1 ? 'is' : 'are'} typed as text, not as Word maths: retype ${asText.length === 1 ? 'it' : 'them'} with Equation`);
  if (lost.unknownMaths.size) checks.push(`maths the editor doesn't know (${[...lost.unknownMaths].join(', ')}) kept as text: check those equations`);
  return { markdown, revision: revisionOf(markdown), regions, media, figures: figures.length, proposals, equations, notes, checks };
}
