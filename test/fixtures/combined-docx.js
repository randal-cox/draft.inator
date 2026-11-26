// The combined import fixture (docs/import-fixture.md): one synthetic Word file with citations, equations, figures,
// and references. Built from XML strings, so nothing in it comes from a private manuscript.
import { zip } from '../zip.js';

const W = 'xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main" xmlns:m="http://schemas.openxmlformats.org/officeDocument/2006/math" ' +
  'xmlns:wp="http://schemas.openxmlformats.org/drawingml/2006/wordprocessingDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" ' +
  'xmlns:pic="http://schemas.openxmlformats.org/drawingml/2006/picture" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"';
const run = (t, pr = '') => `<w:r>${pr ? `<w:rPr>${pr}</w:rPr>` : ''}<w:t xml:space="preserve">${t}</w:t></w:r>`;
const sup = t => run(t, '<w:vertAlign w:val="superscript"/>');
const tab = '<w:r><w:tab/></w:r>';
const mr = t => `<m:r><m:t>${t}</m:t></m:r>`;
const math = inner => `<m:oMath>${inner}</m:oMath>`;
const p = (inner, style) => `<w:p>${style ? `<w:pPr><w:pStyle w:val="${style}"/></w:pPr>` : ''}${inner}</w:p>`;
const drawing = (rid, descr) => `<w:r><w:drawing><wp:inline><wp:docPr id="1" name="Picture 1" descr="${descr}"/><a:graphic><a:graphicData><pic:pic><pic:blipFill><a:blip r:embed="${rid}"/></pic:blipFill></pic:pic></a:graphicData></a:graphic></wp:inline></w:drawing></w:r>`;

export const documentXml = `<?xml version="1.0"?><w:document ${W}><w:body>
${p(run('Saturation in small interview studies'), 'Title')}
${p(run('A. Rivera') + sup('1') + run(', B. Okafor') + sup('2'))}
${p(sup('1') + run(' Example University; ') + sup('2') + run(' Sample Institute'))}
${p(run('Earlier work (Bell, 1992) set a rule: stop when ') + math(mr('𝑛')) + run(' interviews show nothing new, for ') + math(mr('𝑝 ≥ 0.10')) + run(' (Turner, 1969, p. 12).'))}
${p(tab + math(mr('𝑛 ≥ ') + `<m:f><m:num>${mr('ln(1−𝐶)')}</m:num><m:den>${mr('ln(1−𝑝)')}</m:den></m:f>`) + tab + run('(Eq 1)'))}
${p(run('As Eq. 1 shows, the number grows slowly.'))}
${p(run('This is the usual bound (Eq. 1; Bell, 1992).'))}
${p(run('The pair ') + math(mr('(Mason, 2010)')) + run(' is a coordinate, not a source.'))}
${p(drawing('rId9', ''))}
${p(run('Figure 1. Sample size against ') + math(mr('𝑝')) + run(' (Guest et al., 2006).'), 'Caption')}
${p(run('Figure 1 shows the curve.'))}
${p(run('References'), 'Heading1')}
${p(run('Bell, C. (1992). Ritual theory, ritual practice. Oxford University Press.'))}
${p(run('Guest, G., Bunce, A., &amp; Johnson, L. (2006). How many interviews are enough? Field Methods, 18(1), 59–82. https://doi.org/10.1177/1525822X05279903'))}
${p(run('Mason, M. (2010). Sample size and saturation in PhD studies. Forum: Qualitative Social Research, 11(3).'))}
${p(run('Turner, V. (1969). The ritual process. Aldine.'))}
</w:body></w:document>`;

// A 1×1 transparent PNG.
export const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==', 'base64');

export const rels = `<?xml version="1.0"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId9" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/image" Target="media/image1.png"/>
</Relationships>`;

export const combinedDocx = () => zip({ '[Content_Types].xml': '<Types/>', 'word/document.xml': documentXml, 'word/_rels/document.xml.rels': rels, 'word/media/image1.png': png });

// What the projection must be, exactly (docs/import-fixture.md).
export const expectedMarkdown = [
  '# Saturation in small interview studies', '',
  'A. Rivera<sup>1</sup>, B. Okafor<sup>2</sup>', '',
  '<sup>1</sup> Example University; <sup>2</sup> Sample Institute', '',
  'Earlier work (Bell, 1992) set a rule: stop when $n$ interviews show nothing new, for $p \\ge 0.10$ (Turner, 1969, p. 12).', '',
  '$$ n \\ge \\frac{\\ln(1-C)}{\\ln(1-p)} $$ {#eq:1}', '',
  'As Eq. 1 shows, the number grows slowly.', '',
  'This is the usual bound (Eq. 1; Bell, 1992).', '',
  'The pair $(Mason, 2010)$ is a coordinate, not a source.', '',
  '{figure media/image1.png | label:fig:1 | caption:"Sample size against $p$ (Guest et al., 2006)."}', '',
  'Figure 1 shows the curve.', '',
  '# References', '',
  'Bell, C. (1992). Ritual theory, ritual practice. Oxford University Press.', '',
  'Guest, G., Bunce, A., & Johnson, L. (2006). How many interviews are enough? Field Methods, 18(1), 59–82. https://doi.org/10.1177/1525822X05279903', '',
  'Mason, M. (2010). Sample size and saturation in PhD studies. Forum: Qualitative Social Research, 11(3).', '',
  'Turner, V. (1969). The ritual process. Aldine.', ''].join('\n');
