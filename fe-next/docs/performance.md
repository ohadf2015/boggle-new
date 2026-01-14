# Performance (Core Web Vitals)

## Measurement

### Lighthouse (local)
- Run mobile + desktop Lighthouse CI:
  - `npm run lighthouse:ci`
- Run mobile only:
  - `npm run lighthouse:ci:mobile`
- Run desktop only:
  - `npm run lighthouse:ci:desktop`

The configs are:
- [lighthouserc.mobile.cjs](file:///Users/ohadfisher/git/boggle-new/fe-next/lighthouserc.mobile.cjs)
- [lighthouserc.desktop.cjs](file:///Users/ohadfisher/git/boggle-new/fe-next/lighthouserc.desktop.cjs)

### RUM (Web Vitals)
Client-side metrics are collected in [WebVitalsReporter](file:///Users/ohadfisher/git/boggle-new/fe-next/components/WebVitalsReporter.tsx) and sent to:
- Google Analytics event `web_vitals`
- `/api/web-vitals` for persistence

The payload includes:
- device/connection classification
- session id
- `metadata.perfVariant` (A/B variant)
- `metadata.navigationTiming` (high-level navigation breakdown)

## Rollout / A/B

The server sets a `perf_variant` cookie for HTML page loads:
- `perf_v1` (default)
- `control`

Override on any page load:
- `?perf_variant=control`
- `?perf_variant=perf_v1`

This is implemented in [server middleware](file:///Users/ohadfisher/git/boggle-new/fe-next/server/middleware.ts).

## Implemented Improvements

### TTFB
- Removed global `force-dynamic` so more routes can be statically generated or cached.
- Unblocked caching headers for Next Route Handlers by not forcing `no-store` on all `/api/*` requests at the Express layer.
- Added Redis caching + request coalescing for hot daily endpoints to reduce Supabase load.

### LCP
- Migrated key preview/hero imagery to `next/image` with stable containers and appropriate sizing hints.
- Reduced non-critical visuals by default on the landing experience (heavy decorative background is disabled unless explicitly in `control`).

### FCP
- Removed the landing “wait until mounted” gate, allowing meaningful content to render immediately.

### CLS
- Ensured explicit dimensions or stable aspect behavior for media in key UI surfaces.

## Verification Checklist
- `npm run test`
- `npm run build`
- `npm run lighthouse:ci`
