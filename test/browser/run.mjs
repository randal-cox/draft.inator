// Browser regression tests for the editor's Zotero picker (issues #53 and #54), through the real dialog in Chromium.
// Needs Playwright with Chromium installed (not a dependency of draft.inator): npm run test:browser
import { createRequire } from 'node:module';
import { spawn } from 'node:child_process';
import { test, after } from 'node:test';
import assert from 'node:assert/strict';
const { chromium } = createRequire(import.meta.url)('playwright');

const port = 4400 + Math.floor(Math.random() * 500);
const server = spawn(process.execPath, [new URL('../../scripts/serve.js', import.meta.url).pathname, String(port)], { stdio: 'ignore' });
await new Promise(r => setTimeout(r, 600));
const browser = await chromium.launch();
after(async () => { await browser.close(); server.kill(); });
const KEY = 'samplesamplesamplesample';

async function open(stage = '') {
  const page = await browser.newPage();
  const errors = []; page.on('pageerror', e => errors.push(e.message));
  await page.goto(`http://127.0.0.1:${port}/test/browser/zotero-host.html${stage ? '?stage=' + stage : ''}`);
  await page.evaluate(() => { localStorage.clear(); sessionStorage.clear(); });
  await page.reload(); await page.waitForFunction(() => window.hostReady);
  return { page, errors };
}
async function pick(page, q) {
  await page.evaluate(() => { const t = document.querySelector('.di-source'); t.focus(); t.setSelectionRange(8, 8); });
  await page.click('.di-toolbar button:has-text("Zotero")');
  await page.waitForSelector('.di-zotero[open] #di-z-key, .di-zotero[open] #di-z-q');
  if (await page.locator('#di-z-key').count()) { await page.fill('#di-z-key', KEY); await page.click('.di-zotero button:has-text("Connect")'); }
  await page.waitForSelector('#di-z-q'); await page.fill('#di-z-q', q);
  await page.waitForSelector('#di-z-list li'); await page.press('#di-z-q', 'Enter');
  await page.waitForSelector('.di-zotero fieldset');
}

test('#53: a stale binding cannot make the picker cite a different work', async () => {
  const { page, errors } = await open();
  await page.evaluate(() => localStorage.setItem('draft-inator-zotero-bindings', JSON.stringify({ 'test-host|user:1000001:OKAF2019': 'bell-1992-ritual' })));
  await pick(page, 'okafor');
  assert.match(await page.textContent('.di-zotero'), /linked to bell-1992-ritual .* doesn't match it/);
  const checked = await page.$eval('.di-zotero fieldset input:checked', i => i.value).catch(() => null);
  assert.notEqual(checked, 'bell-1992-ritual');
  await page.click('.di-zotero button:has-text("Insert the citation")'); await page.waitForTimeout(300);
  const text = await page.inputValue('.di-source');
  assert.ok(!/\{cite bell-1992-ritual/.test(text), 'Bell was not cited for Okafor');
  assert.match(text, /\{cite okafor-2019-masks/);
  assert.deepEqual(errors, []);
});

test('#53: the same item again reuses its work, recognised by cite.inator', async () => {
  const { page } = await open();
  await pick(page, 'okafor'); await page.click('.di-zotero button:has-text("Insert the citation")'); await page.waitForTimeout(300);
  await pick(page, 'okafor');
  assert.equal(await page.$eval('.di-zotero fieldset input:checked', i => i.value), 'okafor-2019-masks');
  await page.click('.di-zotero button:has-text("Insert the citation")'); await page.waitForTimeout(300);
  assert.equal((await page.inputValue('.di-source')).match(/\{cite okafor-2019-masks/g).length, 2);
  assert.deepEqual(await page.evaluate(() => window.staged), ['okafor-2019-masks'], 'staged once, not twice');
});

for (const stage of ['fail-once', 'fail-async']) {
  test(`#54: a failing onRecords (${stage === 'fail-once' ? 'thrown' : 'rejected'}) changes nothing, says so, and a retry succeeds once`, async () => {
    const { page, errors } = await open(stage);
    const before = await page.evaluate(() => ({ text: document.querySelector('.di-source').value, works: window.DRAFT_WORKS.length }));
    await pick(page, 'rivera');
    await page.click('.di-zotero button:has-text("Insert the citation")');
    await page.waitForFunction(() => /couldn't take this work/.test(document.querySelector('.di-zotero .di-error').textContent));
    const mid = await page.evaluate(() => ({ text: document.querySelector('.di-source').value, works: window.DRAFT_WORKS.length, open: !!document.querySelector('.di-zotero[open]') }));
    assert.deepEqual(mid, { ...before, open: true }, 'text and works unchanged, dialog still open');
    await page.click('.di-zotero button:has-text("Insert the citation")'); await page.waitForTimeout(300);
    const after = await page.evaluate(() => ({ text: document.querySelector('.di-source').value, works: window.DRAFT_WORKS.length, staged: window.staged }));
    assert.equal(after.text.match(/\{cite rivera-2020-sampling/g).length, 1);
    assert.equal(after.works, before.works + 1);
    assert.deepEqual(after.staged, ['rivera-2020-sampling']);
    assert.deepEqual(errors, [], 'no unhandled error');
  });
}
