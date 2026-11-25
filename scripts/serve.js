#!/usr/bin/env node
// Serve this repository on your own computer, so the demos run exactly as they will on GitHub Pages:
//   npm run demo            → http://localhost:4321/demo/  (and opens it in your browser)
//   npm run demo -- 8080    → on another port
// Plain Node, no dependencies. Only your computer can reach it (it listens on 127.0.0.1).
import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const port = Number(process.argv[2]) || 4321;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8', '.yml': 'application/yaml; charset=utf-8',
  '.md': 'text/markdown; charset=utf-8', '.txt': 'text/plain; charset=utf-8', '.svg': 'image/svg+xml',
  '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.gif': 'image/gif', '.webp': 'image/webp'
};

const server = http.createServer((req, res) => {
  let rel;
  try { rel = decodeURIComponent(new URL(req.url, 'http://localhost').pathname); } catch { res.writeHead(400).end(); return; }
  if (rel === '/') { res.writeHead(302, { location: '/demo/' }).end(); return; }   // the demos are the front door
  let file = path.join(root, rel);
  if (!file.startsWith(root + path.sep) && file !== root) { res.writeHead(403).end(); return; }   // nothing outside the repository
  if (path.relative(root, file).split(path.sep).some(p => p.startsWith('.') && p.length > 1)) { res.writeHead(404).end(); return; }  // no .git
  try { if (fs.statSync(file).isDirectory()) file = path.join(file, 'index.html'); } catch { /* falls through to 404 */ }
  fs.readFile(file, (error, body) => {
    if (error) { res.writeHead(404, { 'content-type': 'text/plain' }).end('Not found: ' + rel); return; }
    res.writeHead(200, { 'content-type': TYPES[path.extname(file).toLowerCase()] || 'application/octet-stream', 'cache-control': 'no-store' });
    res.end(body);
  });
});

server.listen(port, '127.0.0.1', () => {
  const url = `http://localhost:${port}/demo/`;
  console.log(`draft.inator demos: ${url}\nServing ${root}. Press Ctrl+C to stop.`);
  if (!process.env.NO_OPEN) {
    const opener = process.platform === 'darwin' ? 'open' : process.platform === 'win32' ? 'explorer' : 'xdg-open';
    execFile(opener, [url], () => {});   // if there's no browser to open, the address above is enough
  }
});
server.on('error', e => { console.error(e.code === 'EADDRINUSE' ? `Port ${port} is in use. Try: npm run demo -- ${port + 1}` : e.message); process.exit(1); });
