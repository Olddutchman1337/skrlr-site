#!/usr/bin/env node
/**
 * Public-safety scrub. Denylist terms never live in the repo.
 * - source phase: regex on src/ + public/
 * - dist phase: regex on site/dist HTML/XML + denylist on extracted publishable text only
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const siteRoot = path.resolve(__dirname, '..');
const distRoot = path.join(siteRoot, 'dist');
const LOCAL_DENYLIST = path.join(siteRoot, '.scrub-denylist.local');

const phase = process.argv[2] === 'dist' ? 'dist' : 'source';

const SOURCE_DIRS = ['src', 'public'].map((d) => path.join(siteRoot, d));
const SOURCE_EXT = new Set(['.astro', '.md', '.css', '.js', '.mjs', '.ts', '.tsx', '.json', '.svg']);
const DIST_EXT = new Set(['.html', '.xml']);

const ALLOWED_EMAIL = /^Matt@skrlr\.com$/i;

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

/** @returns {{ term: string, caseSensitive: boolean }[]} */
function parseDenylistText(text) {
  return text
    .split('\n')
    .map((l) => l.replace(/\r$/, '').trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'))
    .map((line) => {
      if (line.startsWith('cs:')) {
        return { term: line.slice(3).trim(), caseSensitive: true };
      }
      return { term: line, caseSensitive: false };
    })
    .filter((e) => e.term.length > 0);
}

function denylistSourceLabel(longSource) {
  if (!longSource) return 'none';
  if (longSource.includes('SCRUB_DENYLIST environment')) return 'env';
  if (longSource.includes('SCRUB_DENYLIST_FILE')) return 'file';
  if (longSource.includes('gitignored')) return 'local';
  return 'unknown';
}

function logDenylistLoaded(count, longSource) {
  console.log(`denylist: ${count} terms loaded (source: ${denylistSourceLabel(longSource)})`);
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
      return {
        source: null,
        terms: [],
        error: 'SCRUB_DENYLIST_FILE is set but the file is missing or unreadable.',
      };
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

function denylistMatches(line, entry) {
  const t = entry.term.trim();
  if (!t) return false;
  const escaped = t.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const shortOrWord = t.length <= 4 || /^\w+$/.test(t);
  if (shortOrWord) {
    const flags = entry.caseSensitive ? '' : 'i';
    return new RegExp(`\\b${escaped}\\b`, flags).test(line);
  }
  if (entry.caseSensitive) return line.includes(t);
  return line.toLowerCase().includes(t.toLowerCase());
}

function lineIsAllowlisted(line) {
  return LINE_ALLOW_PATTERNS.some((re) => re.test(line));
}

function walk(dir, extSet, files = []) {
  if (!fs.existsSync(dir)) return files;
  for (const name of fs.readdirSync(dir)) {
    const full = path.join(dir, name);
    const st = fs.statSync(full);
    if (st.isDirectory()) {
      if (name === 'node_modules' || name === '.astro') continue;
      walk(full, extSet, files);
    } else if (extSet.has(path.extname(name))) {
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

function checkRegexLine(line) {
  if (lineIsAllowlisted(line) && !line.match(IPV4)) {
    return [];
  }
  return [
    ...findIpv4Matches(line),
    ...findEmails(line),
    ...findHostPorts(line),
    ...findOtherRules(line),
  ];
}

function checkFileRegex(filePath, relRoot) {
  const rel = path.relative(relRoot, filePath);
  const lines = fs.readFileSync(filePath, 'utf8').split('\n');
  const hits = [];

  lines.forEach((line, i) => {
    for (const h of checkRegexLine(line)) {
      hits.push({ rel, line: i + 1, ...h });
    }
  });

  return hits;
}

function checkDenylistLine(line, terms) {
  const hits = [];
  for (const entry of terms) {
    if (denylistMatches(line, entry)) {
      hits.push({ kind: 'denylist term', raw: entry.term });
    }
  }
  return hits;
}

/**
 * Publishable strings from built HTML/XML — no tag names or markup.
 */
function extractPublishableLines(content, ext) {
  const lines = [];
  let body = content;

  if (ext === '.html') {
    body = body
      .replace(/<script[\s\S]*?<\/script>/gi, '\n')
      .replace(/<style[\s\S]*?<\/style>/gi, '\n');

    const attrRe =
      /\b(alt|title|href|content)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;
    for (const m of body.matchAll(attrRe)) {
      const val = m[2] || m[3] || m[4] || '';
      if (val.trim()) lines.push(val.trim());
    }

    const visible = body.replace(/<[^>]+>/g, '\n');
    for (const chunk of visible.split('\n')) {
      const t = chunk.replace(/\s+/g, ' ').trim();
      if (t) lines.push(t);
    }
  } else if (ext === '.xml') {
    const attrRe = /\b(title|href|description|link)\s*=\s*(?:"([^"]*)"|'([^']*)')/gi;
    for (const m of body.matchAll(attrRe)) {
      const val = m[2] || m[3] || '';
      if (val.trim()) lines.push(val.trim());
    }
    const inner = body.replace(/<[^>]+>/g, '\n');
    for (const chunk of inner.split('\n')) {
      const t = chunk.replace(/\s+/g, ' ').trim();
      if (t) lines.push(t);
    }
  }

  return lines;
}

function checkDistFileDenylist(filePath, terms) {
  const rel = path.relative(siteRoot, filePath);
  const ext = path.extname(filePath);
  const publishable = extractPublishableLines(fs.readFileSync(filePath, 'utf8'), ext);
  const hits = [];

  publishable.forEach((line, idx) => {
    for (const h of checkDenylistLine(line, terms)) {
      hits.push({ rel, line: idx + 1, segment: 'publishable-text', ...h });
    }
  });

  return hits;
}

function resolveDenylistTerms() {
  const allowEmpty = process.env.SCRUB_ALLOW_EMPTY === '1';
  const config = loadDenylistConfig();

  if (config.error && !config.source) {
    if (allowEmpty) {
      console.warn('⚠️  WARNING: public-scrub-check has NO denylist source (SCRUB_ALLOW_EMPTY=1).');
      console.warn('⚠️  For local preview only — do not ship or merge without a real denylist.');
      return { source: null, terms: [], allowEmpty: true };
    }
    console.error(`public-scrub-check FAILED: ${config.error}`);
    process.exit(1);
  }

  const { source, terms } = config;

  if (terms.length === 0 && source) {
    if (allowEmpty) {
      console.warn(
        '⚠️  WARNING: public-scrub-check running with an EMPTY denylist (SCRUB_ALLOW_EMPTY=1).',
      );
      console.warn('⚠️  For local preview only — do not ship or merge without a real denylist.');
      return { source, terms: [], allowEmpty: true };
    }
    console.error(
      `public-scrub-check FAILED: denylist from ${source} is empty. Add terms or set SCRUB_ALLOW_EMPTY=1 for local preview only (see site/README.md).`,
    );
    process.exit(1);
  }

  logDenylistLoaded(terms.length, source);
  return { source, terms, allowEmpty: false };
}

function reportHits(allHits) {
  console.error('public-scrub-check FAILED:\n');
  for (const h of allHits) {
    const masked =
      h.kind === 'denylist term'
        ? maskToken(h.raw)
        : h.raw.includes('***')
          ? h.raw
          : maskToken(h.raw);
    const loc = h.segment ? `${h.rel} (publishable #${h.line})` : `${h.rel}:${h.line}`;
    console.error(`  ${loc} [${h.kind}] hit: ${masked}`);
  }
  process.exit(1);
}

function runSourcePhase() {
  resolveDenylistTerms();

  const files = SOURCE_DIRS.flatMap((d) => walk(d, SOURCE_EXT));
  const allHits = files.flatMap((f) => checkFileRegex(f, siteRoot));

  if (allHits.length) {
    reportHits(allHits);
  }

  console.log(`public-scrub-check source OK (${files.length} files, regex scan)`);
}

function runDistPhase() {
  if (!fs.existsSync(distRoot)) {
    console.error(
      'public-scrub-check FAILED: site/dist not found. Run astro build before the dist scrub phase.',
    );
    process.exit(1);
  }

  const { terms } = resolveDenylistTerms();
  const files = walk(distRoot, DIST_EXT);
  const regexHits = files.flatMap((f) => checkFileRegex(f, siteRoot));
  const denyHits =
    terms.length > 0 ? files.flatMap((f) => checkDistFileDenylist(f, terms)) : [];
  const allHits = [...regexHits, ...denyHits];

  if (allHits.length) {
    reportHits(allHits);
  }

  console.log(
    `public-scrub-check dist OK (${files.length} built files, ${denyHits.length} denylist hits)`,
  );
}

if (phase === 'dist') {
  runDistPhase();
} else {
  runSourcePhase();
}
