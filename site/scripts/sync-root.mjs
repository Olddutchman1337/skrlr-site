#!/usr/bin/env node
/**
 * Copy Astro build output to repo root for GitHub Pages (main / root).
 * Preserves CNAME; ensures .nojekyll; removes legacy single-page assets.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(__dirname, '..');
const distDir = path.join(siteRoot, 'dist');
const repoRoot = path.resolve(siteRoot, '..');

const LEGACY_ROOT = ['assets'];

function copyEntry(src, dest) {
  const st = fs.statSync(src);
  if (st.isDirectory()) {
    fs.mkdirSync(dest, { recursive: true });
    for (const name of fs.readdirSync(src)) {
      copyEntry(path.join(src, name), path.join(dest, name));
    }
  } else {
    fs.mkdirSync(path.dirname(dest), { recursive: true });
    fs.copyFileSync(src, dest);
  }
}

if (!fs.existsSync(distDir)) {
  console.error('sync-root FAILED: site/dist not found. Run astro build first.');
  process.exit(1);
}

for (const name of LEGACY_ROOT) {
  const target = path.join(repoRoot, name);
  if (fs.existsSync(target)) {
    fs.rmSync(target, { recursive: true, force: true });
    console.log(`sync-root: removed legacy ${name}/`);
  }
}

for (const name of fs.readdirSync(distDir)) {
  const src = path.join(distDir, name);
  const dest = path.join(repoRoot, name);
  if (fs.existsSync(dest)) {
    fs.rmSync(dest, { recursive: true, force: true });
  }
  copyEntry(src, dest);
}

const cnamePath = path.join(repoRoot, 'CNAME');
const expectedCname = 'skrlr.com';
if (!fs.existsSync(cnamePath) || fs.readFileSync(cnamePath, 'utf8').trim() !== expectedCname) {
  fs.writeFileSync(cnamePath, `${expectedCname}\n`);
  console.log('sync-root: wrote CNAME (skrlr.com)');
}

const nojekyll = path.join(repoRoot, '.nojekyll');
if (!fs.existsSync(nojekyll)) {
  fs.writeFileSync(nojekyll, '');
  console.log('sync-root: wrote .nojekyll');
}

console.log('sync-root OK: site/dist → repo root');
