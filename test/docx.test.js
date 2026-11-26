// A Word file to Markdown (src/editor/docx.js): text, headings, emphasis, lists, and Word's equations as LaTeX.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import zlib from 'node:zlib';
import katex from '../vendor/katex/katex.mjs';
import { docxToMarkdown } from '../src/editor/docx.js';
import { findMath } from '../src/editor/crossref.js';
import { parseXML } from './xml.js';

// A minimal zip writer for the test: deflated entries, a central directory, and its end record.
function zip(files) {
  const parts = [], central = []; let offset = 0;
  for (const [name, text] of Object.entries(files)) {
    const data = Buffer.from(text), comp = zlib.deflateRawSync(data), nm = Buffer.from(name);
    const head = Buffer.alloc(30); head.writeUInt32LE(0x04034b50, 0); head.writeUInt16LE(20, 4); head.writeUInt16LE(8, 8);
    head.writeUInt32LE(comp.length, 18); head.writeUInt32LE(data.length, 22); head.writeUInt16LE(nm.length, 26);
    const dir = Buffer.alloc(46); dir.writeUInt32LE(0x02014b50, 0); dir.writeUInt16LE(20, 4); dir.writeUInt16LE(20, 6); dir.writeUInt16LE(8, 10);
    dir.writeUInt32LE(comp.length, 20); dir.writeUInt32LE(data.length, 24); dir.writeUInt16LE(nm.length, 28); dir.writeUInt32LE(offset, 42);
    parts.push(head, nm, comp); central.push(dir, nm); offset += 30 + nm.length + comp.length;
  }
  const cd = Buffer.concat(central), end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0); end.writeUInt16LE(central.length / 2, 8); end.writeUInt16LE(central.length / 2, 10);
  end.writeUInt32LE(cd.length, 12); end.writeUInt32LE(offset, 16);
  return new Uint8Array(Buffer.concat([...parts, cd, end]));
}
const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math"';
const run = (t, pr = '') => `<w:r>${pr ? `<w:rPr>${pr}</w:rPr>` : ''}<w:t xml:space="preserve">${t}</w:t></w:r>`;
const mr = t => `<m:r><m:t>${t}</m:t></m:r>`;
const documentXml = `<?xml version="1.0"?><w:document ${W}><w:body>
<w:p><w:pPr><w:pStyle w:val="Title"/></w:pPr>${run('How many interviews')}</w:p>
<w:p><w:pPr><w:pStyle w:val="Heading2"/></w:pPr>${run('Method')}</w:p>
<w:p>${run('The chance of ')}${run('not', '<w:i/>')}${run(' meeting it after ')}<m:oMath>${mr('𝑛')}</m:oMath>${run(' samples costs $5 (Bell, 1992).')}<w:r><w:footnoteReference w:id="1"/></w:r></w:p>
<w:p><m:oMathPara><m:oMath>${mr('𝑛 ≥ ')}<m:f><m:num>${mr('𝑙𝑜𝑔(1−𝐶)')}</m:num><m:den>${mr('𝑙𝑜𝑔(1−𝑝)')}</m:den></m:f></m:oMath></m:oMathPara></w:p>
<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/></w:numPr></w:pPr>${run('first')}</w:p>
<w:p><w:pPr><w:numPr><w:ilvl w:val="0"/></w:numPr></w:pPr>${run('second', '<w:b/>')}</w:p>
<w:tbl><w:tr><w:tc><w:p>${run('cell')}</w:p></w:tc></w:tr></w:tbl>
<w:p>${run('   ')}</w:p>
</w:body></w:document>`;

test('a Word file becomes Markdown, with its equations as LaTeX that KaTeX draws', async () => {
  const r = await docxToMarkdown(zip({ '[Content_Types].xml': '<Types/>', 'word/document.xml': documentXml }), { parseXML });
  assert.equal(r.markdown, [
    '# How many interviews', '',
    '## Method', '',
    'The chance of *not* meeting it after $n$ samples costs \\$5 (Bell, 1992).', '',
    '$$ n \\ge \\frac{\\log(1-C)}{\\log(1-p)} $$', '',
    '- first', '- **second**', ''].join('\n'));
  assert.equal(r.equations, 2);
  assert.deepEqual(r.notes, ['1 footnote', '1 table']);
  for (const m of findMath(r.markdown).filter(x => x.kind === 'math')) katex.renderToString(m.tex, { output: 'mathml', throwOnError: true });
});

test('something that isn\'t a Word file is refused with a reason', async () => {
  await assert.rejects(docxToMarkdown(new Uint8Array([1, 2, 3]), { parseXML }), /isn't a Word file/);
  await assert.rejects(docxToMarkdown(zip({ 'a.txt': 'x' }), { parseXML }), /no word\/document\.xml/);
});

test('an equation on a line of its own, Google Docs style, becomes a displayed, labelled equation', async () => {
  const p1 = `<w:p><w:r><w:tab/><w:t xml:space="preserve">C ≥ 1- </w:t></w:r><m:oMath><m:nary><m:naryPr><m:chr m:val="∑"/></m:naryPr><m:sub>${mr('k=0')}</m:sub><m:sup>${mr('O-1')}</m:sup></m:nary><m:sSub><m:e>${mr('x')}</m:e><m:sub/></m:sSub></m:oMath><w:r><w:tab/><w:t>(Eq 3)</w:t></w:r></w:p>`;
  const p2 = `<w:p>${run('Words around it: ')}<m:oMath>${mr('𝑛')}</m:oMath>${run(' are prose (Eq 9)')}</w:p>`;
  const p3 = `<w:p>${run('R ± zC * SE(R)')}<w:r><w:tab/><w:t>(Eq 6)</w:t></w:r></w:p>`;
  const r = await docxToMarkdown(zip({ 'word/document.xml': `<w:document ${W}><w:body>${p1}${p2}${p3}</w:body></w:document>` }), { parseXML });
  assert.equal(r.markdown, '$$ C \\ge 1- \\sum_{k=0}^{O-1} x $$ {#eq:3}\n\nWords around it: $n$ are prose (Eq 9)\n\nR ± zC \\* SE(R)\t(Eq 6)\n');
  assert.match(r.notes.join(' | '), /equation numbers 3 became labels/);
  assert.match(r.notes.join(' | '), /equation 6 is typed as text/);
});
