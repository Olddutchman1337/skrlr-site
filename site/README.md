# Skrlr AI Lab — Astro site

Source for [skrlr.com](https://skrlr.com). **GitHub Pages serves the repo root on `main`** (`index.html`, `CNAME`, `.nojekyll`, built assets). This directory holds editable source only.

## Public scrub denylist (required)

This repository is **public**. Real banned words must **never** be committed. The scrub step loads terms from **one** source, in order:

1. **`SCRUB_DENYLIST`** — newline-separated terms (CI via GitHub Actions secret).
2. **`SCRUB_DENYLIST_FILE`** — path to a local file.
3. **`site/.scrub-denylist.local`** — gitignored, for local dev.

If no source is configured or the list is empty, `npm run build` **fail closed** (`SCRUB_ALLOW_EMPTY=1` is local preview only).

Denylist matching runs on **publishable text** extracted from built HTML/XML at the **repo root** (after `sync-root`). Source (`src/`, `public/`) gets regex-only in the first pass. Logs show term **count** and **source** only; hits are masked.

Per-line option: prefix with `cs:` for case-sensitive matching (example placeholder: `cs:XX`).

See **Owner setup** in earlier commits / PR description for secret and local file instructions.

## Build & deploy to repo root

```bash
cd site
npm install
npm run build
```

Pipeline: source regex → `astro build` → `sync-root.mjs` (copies `site/dist/` to repo root, removes legacy `assets/`, keeps `CNAME`) → served scrub on root HTML/XML.

Commit the updated root `index.html`, `_astro/`, section folders, `rss.xml`, sitemaps, favicons, `CNAME`, and `.nojekyll`. Merge to `main` to go live — **no GitHub Pages setting change** when Pages already serves `/ (root)`.

## Run locally

```bash
cd site
npm run dev
```

Dev server only; production paths match repo root after a full build + sync.

## Editing content

- Benchmarks: `src/content/benchmarks/*.md` (schema in `src/content.config.ts`).
- Pages: `src/pages/`.
- Theme: `src/styles/global.css`.

After edits, run `npm run build` from `site/` and commit both source and root build output on the release branch.
