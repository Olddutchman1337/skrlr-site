# Skrlr AI Lab — Astro v2

Static site source for the **v2** branch preview. Production today is still the root `index.html` on `main` (GitHub Pages repo root).

## Public scrub denylist (required)

This repository is **public**. Real banned words (internal hostnames, private model names, etc.) must **never** be committed. The scrub step loads terms from **one** source, in order:

1. **`SCRUB_DENYLIST`** — newline-separated terms (used in CI via GitHub Actions secret).
2. **`SCRUB_DENYLIST_FILE`** — path to a local file (for ad hoc checks).
3. **`site/.scrub-denylist.local`** — gitignored file for local dev (see below).

If no source is configured or the list is empty, `npm run scrub` and `npm run build` **fail closed**.

**Local preview override (not for CI):** `SCRUB_ALLOW_EMPTY=1` skips the empty-list failure and prints a loud warning. Do not use for production builds.

Output never prints denylist contents — only term **count** and **which source** was used. Matches show a **masked** hit (first character + asterisks).

**Where denylist runs:** After `astro build`, terms are matched against **publishable text only** — visible copy and selected attributes (`alt`, `title`, `href`, `content`) extracted from `site/dist` HTML and RSS/XML, with markup stripped. Tag names (e.g. heading tags), raw markup, `package-lock.json`, and `node_modules` are **not** scanned for denylist terms. Generic regex rules still run on **source** (`src/`, `public/`) and **built output** (`site/dist`).

**Per-line options:** Prefix a line with `cs:` for **case-sensitive** matching. Default is case-insensitive. Short terms use whole-word matching so they do not match inside unrelated words.

Example secret / local file (placeholders only):

```
example-host
cs:XX
```

(`cs:XX` means the literal token `XX` must match case exactly — use for short codes that would otherwise collide with markup if scanned naively.)

### Owner setup

**GitHub Actions (required for PR CI to pass)**

1. Repo → **Settings** → **Secrets and variables** → **Actions**.
2. Create secret **`SCRUB_DENYLIST`** with one sensitive term per line, for example:
   ```
   example-host
   example-internal-name
   ```
   Use your real internal terms — never commit them to the repo.

Until this secret exists, CI sets `SCRUB_DENYLIST` to empty and **scrub fails on purpose**.

**Local development**

Create `site/.scrub-denylist.local` (gitignored), same format as the secret:

```
example-host
example-internal-name
```

Replace with the same real terms you use in the secret.

Generic regex checks (private IP ranges, suspicious ports, ssh patterns, etc.) live in `scripts/public-scrub-check.mjs` and are safe to commit.

`npm run build` runs: source regex → Astro build → dist regex + denylist on publishable text. `npm run scrub` expects an existing `site/dist` (run build first).

## Run locally

```bash
cd site
npm install
npm run dev
```

For a quick UI-only preview without a denylist: `SCRUB_ALLOW_EMPTY=1 npm run dev` (scrub is not run by dev; use before `build`).

## Build

```bash
cd site
npm run build
```

Output goes to `site/dist/` — **not** the repo root. Scrub runs first.

## Cutover (do not run until owner approves)

1. Build on `v2`: `cd site && npm run build`
2. Archive current root site on `main` to a branch (e.g. `archive/pre-v2-static`)
3. Copy `site/dist/*` to repo root on `main`, keep `CNAME` as `skrlr.com`
4. Adjust GitHub Pages if needed (still root / static)
5. Verify HTTPS and www redirect

Until then, **do not** overwrite root `index.html` on `main`.
