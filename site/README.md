# Skrlr AI Lab — Astro v2

Static site source for the **v2** branch preview. Production today is still the root `index.html` on `main` (GitHub Pages repo root).

## Run locally

```bash
cd site
npm install
npm run dev
```

Open the URL printed by the dev server (default port 4321).

## Build

```bash
cd site
npm run build
```

Output goes to `site/dist/` — **not** the repo root. The public-safety scrub runs before every build (`npm run scrub`).

## Cutover (do not run until owner approves)

1. Build on `v2`: `cd site && npm run build`
2. Archive current root site on `main` to a branch (e.g. `archive/pre-v2-static`)
3. Copy `site/dist/*` to repo root on `main`, keep `CNAME` as `skrlr.com`
4. Adjust GitHub Pages if needed (still root / static)
5. Verify HTTPS and www redirect

Until then, **do not** overwrite root `index.html` on `main`.
