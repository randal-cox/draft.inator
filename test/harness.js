// Loads a block the way Sveltia would: a fake window.CMS that captures registerEditorComponent.
import fs from 'node:fs';
import vm from 'node:vm';

export function loadBlock(file, works = [], topics = []) {
  const captured = {};
  const window = { DRAFT_WORKS: works, DRAFT_TOPICS: topics };
  window.CMS = { registerEditorComponent: c => { captured[c.id] = c; } };
  vm.runInNewContext(fs.readFileSync(file, 'utf8'), { window, CMS: window.CMS });
  return { components: captured, window };
}

// Run every marker in a source through the block: read it, write it back.
export function roundtrip(block, src) {
  return src.replace(new RegExp(block.pattern.source, 'g'), (m, body) => block.toBlock(block.fromBlock([m, body])));
}
