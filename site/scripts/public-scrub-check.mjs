#!/usr/bin/env node
/**
 * Public-safety scrub for site source (src/, public/). Denylist terms never appear in repo;
 * load from SCRUB_DENYLIST, SCRUB_DENYLIST_FILE, or gitignored .scrub-denylist.local.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(__dirname, '..');
const LOCAL_DENYLIST = path.join(siteRoot, '.scrub-denylist.local');

const SCAN_DIRS = ['src', 'public'].map((d) => path.join(siteRoot, d));
const EXT = new Set(['.astro', '.md', '.css', '.js', '.mjs', '.ts', '.tsx', '.json', '.svg']);

const ALLOWED_EMAIL = /^Matt@skrlr\.com$/i;

/** Lines that only touch public, approved identifiers (skip regex on whole line). */
const LINE_ALLOW_PATTERNS = [
  /skrlr\.com/i,
  /x\.com\/therealskrlr/i,
  /Matt@skrlr\.com/i,
  /mailto:Matt@skrlr\.com/i,
  /@therealskrlr/i,
  /\[PLACEHOLDER\]/,
  /403 W/,
  /@astrojs\//,
];

const SUSPICIOUS_PORTS = new Set(['8080', '8188', '8300', '7860', '11434']);

const IPV4_OCTET = '(?:25[0-5]|2[0-4]\\d|1?\\d?\\d)';
const IPV4 = new RegExp(`\\b${IPV4_OCTET}(?:\\.${IPV4_OCTET}){3}\\b`, 'g');

const HOST_SUFFIX = /\.(?:local|lan|internal|ts\.net)\b/i;

const EMAIL =
  /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?)+\b/g;

const SSH_PATTERNS = [
  /\bssh\s+-p\b/i,
  /\bssh\s+[A-Za-z0-9._-]+@/i,
  /\bid_rsa\b/i,
  /\bid_ed25519\b/i,
];

const HOST_LIKE_PORT = new RegExp(
  String.raw`(?:https?:\/\/)?(?:[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]*[a-zA-Z0-9])?)+|localhost|\d{1,3}(?:\.\d{1,3}){3}):(\d{4,5})\b`,
  'gi',
);

const LOCALHOST_PORT = /\blocalhost:(\d{2,5})\b/gi;
const LOOPBACK_PORT = /\b127(?:\.\d{1,3}){3}:(\d{2,5})\b/gi;

function maskToken(token) {
  if (!token || token.length === 0) return '***';
  if (token.length === 1) return '*';
  return token[0] + '*'.repeat(token.length - 1);
}

function parseDenylistText(text) {
  return text
    .split('\n')
    .map((l) => l.trim())
    .filter((l) => l && !l.startsWith('#'));
}

function loadDenylistConfig() {
  if (Object.prototype.hasOwnProperty.call(process.env, 'SCRUB_DENYLIST')) {
    return {
      source: 'SCRUB_DENYLIST environment variable',
      terms: parseDenylistText(process.env.SCRUB_DENYLIST ?? ''),
    };
  }

  if (Object.prototype.hasOwnProperty.call(process.env, 'SCRUB_DENYLIST_FILE')) {
    const filePath = process.env.SCRUB_DENYLIST_FILE;
    if (!filePath || !fs.existsSync(filePath)) {
      return { source: null, terms: [], error: 'SCRUB_DENYLIST_FILE is set but the file is missing or unreadable.' };
    }
    return {
      source: 'SCRUB_DENYLIST_FILE environment variable',
      terms: parseDenylistText(fs.readFileSync(filePath, 'utf8')),
    };
  }

  if (fs.existsSync(LOCAL_DENYLIST)) {
    return {
      source: 'site/.scrub-denylist.local (gitignored)',
      terms: parseDenylistText(fs.readFileSync(LOCAL_DENYLIST, 'utf8')),
    };
  }

  return {
    source: null,
    terms: [],
    error:
      'Public scrub denylist is missing. Set SCRUB_DENYLIST, SCRUB_DENYLIST_FILE, or create site/.scrub-denylist.local (see site/README.md).',
  };
}

function denylistMatches(line, term) {
  const t = term.trim();
  if (!t) return false;
  if (/^\w+$/.test(t)) {
    const re = new RegExp(`\\b${t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    return re.test(line);
  }
  return line.toLowerCase().includes(t.toLowerCase());
}

function lineIsAllowlisted(line) {
  return LINE_ALLOW_PATTERNS.some((re) => re.test(line));
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

function findIpv4Matches(line) {
  const hits = [];
  for (const m of line.matchAll(IPV4)) {
    hits.push({ kind: 'IPv4 literal', raw: m[0] });
  }
  return hits;
}

function findEmails(line) {
  const hits = [];
  for (const m of line.matchAll(EMAIL)) {
    if (!ALLOWED_EMAIL.test(m[0])) {
      hits.push({ kind: 'email address', raw: m[0] });
    }
  }
  return hits;
}

function findHostPorts(line) {
  const hits = [];
  for (const re of [HOST_LIKE_PORT, LOCALHOST_PORT, LOOPBACK_PORT]) {
    re.lastIndex = 0;
    for (const m of line.matchAll(re)) {
      const port = m[1];
      if (SUSPICIOUS_PORTS.has(port) || port.length >= 4) {
        hits.push({ kind: 'host:port', raw: m[0] });
      }
    }
  }
  return hits;
}

function findOtherRules(line) {
  const hits = [];
  if (HOST_SUFFIX.test(line)) {
    const m = line.match(/[\w.-]+\.(?:local|lan|internal|ts\.net)\b/i);
    if (m) hits.push({ kind: 'internal hostname suffix', raw: m[0] });
  }
  for (const re of SSH_PATTERNS) {
    if (re.test(line)) {
      hits.push({ kind: 'ssh credential pattern', raw: 'ssh/***(masked)' });
    }
  }
  if (/\blocalhost\b/i.test(line) && !lineIsAllowlisted(line)) {
    hits.push({ kind: 'localhost reference', raw: 'localhost' });
  }
  if (/\\C:\\/i.test(line)) hits.push({ kind: 'Windows path', raw: 'C:\\***(masked)' });
  if (/\/home\//.test(line)) hits.push({ kind: 'Unix home path', raw: '/home/***(masked)' });
  return hits;
}

function checkDenylist(line, terms) {
  const hits = [];
  for (const term of terms) {
    if (denylistMatches(line, term)) {
      hits.push({ kind: 'denylist term', raw: term });
    }
  }
  return hits;
}

function checkFile(filePath, terms) {
  const rel = path.relative(siteRoot, filePath);
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  const hits = [];

  lines.forEach((line, i) => {
    if (lineIsAllowlisted(line) && !line.match(IPV4)) {
      // still scan for denylist on allowlisted lines
      for (const h of checkDenylist(line, terms)) {
        hits.push({ rel, line: i + 1, ...h });
      }
      return;
    }

    for (const h of [
      ...findIpv4Matches(line),
      ...findEmails(line),
      ...findHostPorts(line),
      ...findOtherRules(line),
      ...checkDenylist(line, terms),
    ]) {
      hits.push({ rel, line: i + 1, ...h });
    }
  });

  return hits;
}

const allowEmpty = process.env.SCRUB_ALLOW_EMPTY === '1';
const config = loadDenylistConfig();

if (config.error && !config.source) {
  if (allowEmpty) {
    console.warn('⚠️  WARNING: public-scrub-check has NO denylist source (SCRUB_ALLOW_EMPTY=1).');
    console.warn('⚠️  For local preview only — do not ship or merge without a real denylist.');
  } else {
    console.error(`public-scrub-check FAILED: ${config.error}`);
    process.exit(1);
  }
}

const source = config.source;
const terms = config.source ? config.terms : [];

if (terms.length === 0 && config.source) {
  if (allowEmpty) {
    console.warn(
      '⚠️  WARNING: public-scrub-check running with an EMPTY denylist (SCRUB_ALLOW_EMPTY=1).',
    );
    console.warn('⚠️  For local preview only — do not ship or merge without a real denylist.');
  } else {
    console.error(
      `public-scrub-check FAILED: denylist from ${source} is empty. Add terms or set SCRUB_ALLOW_EMPTY=1 for local preview only (see site/README.md).`,
    );
    process.exit(1);
  }
}

const files = SCAN_DIRS.flatMap((d) => walk(d));
const allHits = files.flatMap((f) => checkFile(f, terms));

if (allHits.length) {
  console.error('public-scrub-check FAILED:\n');
  for (const h of allHits) {
    const masked =
      h.kind === 'denylist term' ? maskToken(h.raw) : h.raw.includes('***') ? h.raw : maskToken(h.raw);
    console.error(`  ${h.rel}:${h.line} [${h.kind}] hit: ${masked}`);
  }
  process.exit(1);
}

const sourceLabel = source ?? (allowEmpty ? 'none (SCRUB_ALLOW_EMPTY override)' : 'unknown');
console.log(
  `public-scrub-check OK (${files.length} files scanned, ${terms.length} denylist terms, source: ${sourceLabel})`,
);
