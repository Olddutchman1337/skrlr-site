#!/usr/bin/env node
import { spawn } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(__dirname, '..');
const outDir = path.resolve(siteRoot, '..', 'artifacts');

const PREVIEW_PORT = 4321;
const BASE = `http://127.0.0.1:${PREVIEW_PORT}`;

function runPreview() {
  return spawn('npm', ['run', 'preview', '--', '--port', String(PREVIEW_PORT), '--host', '127.0.0.1'], {
    cwd: siteRoot,
    stdio: 'pipe',
    shell: true,
  });
}

async function waitForServer(ms = 15000) {
  const start = Date.now();
  while (Date.now() - start < ms) {
    try {
      const res = await fetch(`${BASE}/`);
      if (res.ok) return;
    } catch {
      /* retry */
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  throw new Error('Preview server did not become ready');
}

const preview = runPreview();
try {
  await waitForServer();
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1280, height: 900 } });
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(outDir, 'home.png'), fullPage: true });
  await page.goto(`${BASE}/benchmarks/2026-10-27-local-llm-decode/`, { waitUntil: 'networkidle' });
  await page.screenshot({ path: path.join(outDir, 'benchmark.png'), fullPage: true });
  await browser.close();
  console.log('Screenshots saved to', outDir);
} finally {
  preview.kill('SIGTERM');
}
