#!/usr/bin/env node
/**
 * Build-time public-safety scrub. Scans site source (not node_modules/dist).
 * Fails on IPv4/IPv6 patterns, port-like strings, path leaks, and denylist terms.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(__dirname, '..');

const SCAN_DIRS = ['src', 'public'].map((d) => path.join(siteRoot, d));
const SCAN_FILES = [path.join(siteRoot, 'scripts', 'denylist.txt')];
const EXT = new Set(['.astro', '.md', '.css', '.js', '.mjs', '.ts', '.tsx', '.json', '.svg', '.txt']);

const ALLOW_SUBSTRINGS = [
  'skrlr.com',
  'x.com/therealskrlr',
  'Matt@skrlr.com',
  'mailto:Matt@skrlr.com',
  'public-scrub-check.mjs',
  'denylist.txt',
  '# Owner:',
  'PLACEHOLDER',
  '[PLACEHOLDER]',
  '403 W', // power cap, not a port
];

const IPV4 =
  /\b(?!(?:25[0-5]|2[0-4]\d|1?\d?\d)\.)(?:\d{1,3}\.){3}\d{1,3}\b|\b(?:25[0-5]|2[0-4]\d|1?\d?\d)(?:\.(?:25[0-5]|2[0-4]\d|1?\d?\d)){3}\b/;

const IPV6 = /\b(?:[0-9a-f]{0,4}:){2,7}[0-9a-f]{0,4}\b/i;

const PORT_IN_PROSE = /(?<![\w@])(:\d{2,5})\b/;

const FORBIDDEN_LITERALS = [
  /\blocalhost\b/i,
  /\.local\b/i,
  /\\C:\\/i,
  /\/home\//,
  /\b127\.0\.0\.1\b/,
];

function loadDenylist() {
  const file = path.join(__dirname, 'denylist.txt');
  const lines = fs.readFileSync(file, 'utf8').split('\n');
  return lines
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
}

function walk(dir, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === 'dist' || name === '.astro') continue;
      walk(full, files);
    } else if (EXT.has(path.extname(name))) {
      files.push(full);
    }
  }
  return files;
}

function lineAllowed(line) {
  return ALLOW_SUBSTRINGS.some((a) => line.includes(a));
}

function checkFile(filePath, denylist) {
  const rel = path.relative(siteRoot, filePath);
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  const hits = [];

  lines.forEach((line, i) => {
    if (lineAllowed(line)) return;

    if (IPV4.test(line)) hits.push({ rel, line: i + 1, rule: 'IPv4', snippet: line.trim().slice(0, 120) });
    if (IPV6.test(line) && line.includes('::')) {
      hits.push({ rel, line: i + 1, rule: 'IPv6', snippet: line.trim().slice(0, 120) });
    }
    for (const re of FORBIDDEN_LITERALS) {
      if (re.test(line)) hits.push({ rel, line: i + 1, rule: re.toString(), snippet: line.trim().slice(0, 120) });
    }
    const portMatch = line.match(PORT_IN_PROSE);
    if (portMatch && !line.includes('403 W')) {
      hits.push({ rel, line: i + 1, rule: 'port-like', snippet: line.trim().slice(0, 120) });
    }
    for (const term of denylist) {
      if (line.toLowerCase().includes(term.toLowerCase())) {
        hits.push({ rel, line: i + 1, rule: `denylist:${term}`, snippet: line.trim().slice(0, 120) });
      }
    }
  });

  return hits;
}

const denylist = loadDenylist();
const files = [...SCAN_DIRS.flatMap((d) => walk(d)), ...SCAN_FILES.filter((f) => fs.existsSync(f))];
const allHits = files.flatMap((f) => checkFile(f, denylist));

if (allHits.length) {
  console.error('public-scrub-check FAILED:\n');
  for (const h of allHits) {
    console.error(`  ${h.rel}:${h.line} [${h.rule}] ${h.snippet}`);
  }
  process.exit(1);
}

console.log(`public-scrub-check OK (${files.length} files scanned, ${denylist.length} denylist terms active)`);
