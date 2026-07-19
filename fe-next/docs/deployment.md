# Deployment & Live-Site Verification

Quick reference so verification lanes don't dead-end looking for the production URL.
(The README's "Deploy on Vercel" section is stale boilerplate — the app deploys to Railway.)

## Production URL

- **Web (production):** https://www.lexiclash.live
- **Android package:** `live.lexiclash.app` — https://play.google.com/store/apps/details?id=live.lexiclash.app

The web URL is hardcoded across SEO-critical surfaces (`app/layout.tsx` `metadataBase`,
`app/robots.ts`, `app/sitemap.ts`, `capacitor.config.ts` remote URL, hreflang alternates).
It is **not** exposed via a `NEXT_PUBLIC_SITE_URL` env var — grepping for one turns up nothing.

## Deploy target

- Deploys to **Railway** — see `railway.toml` and `Dockerfile`.
- Liveness health check: **`/health/live`** (`server/healthRoutes.ts`, `railway.toml healthcheckPath`).
- Note: `railway.toml` confirms the app *deploys* to Railway; whether the `lexiclash.live`
  domain is served directly by Railway or fronted by a CDN/proxy is not recorded here — treat
  these as two separate facts.

## Verify the live site

```bash
curl -sS -m 10 -o /dev/null -w "%{http_code}\n" https://www.lexiclash.live/health/live
# expect: 200
```

Last checked: 2026-07-19 → `200`.
