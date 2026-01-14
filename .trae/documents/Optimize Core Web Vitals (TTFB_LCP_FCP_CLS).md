## Current Findings (Repo-Specific)
- The whole app is currently forced into dynamic SSR via [layout.tsx](file:///Users/ohadfisher/git/boggle-new/fe-next/app/%5Blocale%5D/layout.tsx#L22-L26), which prevents static rendering/ISR and is a major lever for TTFB.
- Express sets `Cache-Control: no-store` for all `/api/*` requests in [middleware.ts](file:///Users/ohadfisher/git/boggle-new/fe-next/server/middleware.ts#L107-L113), which can unintentionally defeat cache headers on Next App Router route handlers (some already configured in [next.config.mjs](file:///Users/ohadfisher/git/boggle-new/fe-next/next.config.mjs#L119-L149)).
- Landing is a large client component ([LandingView.tsx](file:///Users/ohadfisher/git/boggle-new/fe-next/components/landing/LandingView.tsx)) and intentionally renders a loading UI until `useEffect` runs, which delays FCP/LCP.
- There is RUM collection via [WebVitalsReporter.tsx](file:///Users/ohadfisher/git/boggle-new/fe-next/components/WebVitalsReporter.tsx) but no Lighthouse CI / Lighthouse configuration in the repo.

## Goals (Aligned to Your Success Criteria)
- Drive Lighthouse CWV to “Good” by addressing the biggest systematic issues: global SSR, ineffective caching, large client bundles, and above-the-fold rendering.
- Make TTFB consistently low for cacheable pages by enabling static/ISR + CDN caching (while keeping auth-sensitive pages dynamic and `no-store`).
- Keep CLS < 0.1 by eliminating layout shifts from media/dynamic injections and by reserving space consistently.

## Plan: Measurement First
1. Add a repeatable Lighthouse workflow (local + CI)
   - Introduce a Lighthouse CI config that runs on a representative set of routes (landing, daily, leaderboard, multiplayer, profile) for both mobile and desktop.
   - Set budgets/threshold gates (TTFB, LCP, FCP, CLS) and store artifacts.
2. Improve RUM usefulness (no functional changes)
   - Extend the web-vitals payload to include an experiment variant id (for A/B), plus high-level navigation hints.
   - Add optional Server-Timing collection support (so we can correlate backend work to TTFB).

## Plan: TTFB (Biggest Lever)
3. Stop forcing dynamic SSR globally
   - Remove `export const dynamic = 'force-dynamic'` from the locale root layout.
   - Explicitly mark only the routes that truly require per-request rendering as dynamic (profile/settings/auth flows, any pages depending on cookies/headers/session).
   - For public content pages, enable static or ISR with appropriate `revalidate` windows.
4. Fix caching headers so Next route handlers can be cached
   - Update Express cache header middleware to avoid blanket `no-store` for `/api/*`.
   - Apply `no-store` only to sensitive endpoints (auth/session/user-specific) and allow cacheable Next route handlers to set `s-maxage` / `stale-while-revalidate`.
5. Add server-side caching for hot dynamic endpoints
   - Extend Redis-backed caching + request coalescing patterns already used in [leaderboard.ts](file:///Users/ohadfisher/git/boggle-new/fe-next/backend/routes/leaderboard.ts) to other high-traffic reads (e.g., daily challenge leaderboard/puzzle).
   - Reduce redundant Supabase queries (combine queries where possible; cache counts where acceptable).

## Plan: LCP
6. Make the actual LCP element fast on each key page
   - Identify the LCP element per page using Lighthouse + web-vitals.
   - Ensure above-the-fold images use Next Image with `priority`, correct `sizes`, and modern formats.
   - Replace plain `<img>` usages on critical paths (e.g. preview images) with `next/image` or ensure fixed aspect-ratio placeholders.
7. Reduce render-blocking work
   - Ensure third-party scripts stay `afterInteractive`/`lazyOnload` and are not in the critical path.
   - Defer non-critical UI effects (e.g., heavy animations/backgrounds) until idle time on slower devices.

## Plan: FCP
8. Remove artificial “wait until mounted” gates on initial content
   - Replace mount-gated loading UI on the landing experience with hydration-safe rendering that paints meaningful content immediately.
9. Reduce initial JS and main-thread work
   - Split large client pages into a server-rendered shell + small client islands (stats, onboarding, modals).
   - Move non-critical code (animations/toasts/extra UI) behind dynamic imports triggered after interaction/idle.

## Plan: CLS
10. Enforce stable layout everywhere
   - Ensure all media have explicit dimensions or a fixed aspect-ratio container.
   - Reserve space for dynamic injections (banners/modals/prompts) so they don’t push content.
   - Audit top CLS offenders with Lighthouse + RUM and fix systematically.

## Plan: Incremental Rollout + A/B Testing
11. Use feature flags for safe rollout
   - Add perf-related flags (e.g., landing-shell-v2, image-optimization-v2) and ship changes behind flags.
   - Assign variants via existing feature-flag mechanism and attach variant ids to web-vitals events for analysis.

## Plan: Documentation
12. Document performance improvements
   - Add a performance doc covering: baseline metrics, what changed, how to run Lighthouse locally/CI, how to interpret RUM metrics, and rollback strategy.

## Verification Strategy
- Lighthouse runs before/after on the same routes and device profiles (mobile throttling + desktop).
- Web-vitals RUM trend checks segmented by device/connection type.
- Ensure accessibility remains intact (existing e2e/a11y pages, plus Lighthouse a11y checks).

If you confirm this plan, I’ll start implementing in the order above (measurement + removing global dynamic SSR + cache header fixes first), because those usually yield the largest CWV gains quickly.