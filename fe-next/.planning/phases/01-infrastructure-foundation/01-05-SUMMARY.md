---
phase: 01-infrastructure-foundation
plan: 05
subsystem: infra
tags: [lighthouse-ci, bundlewatch, performance-budget, ci, github-actions, core-web-vitals]

# Dependency graph
requires:
  - phase: 01-03
    provides: "Asset size validation scripts (check-asset-sizes.ts)"
provides:
  - "Lighthouse CI with 90+ performance thresholds enforced as errors"
  - "BundleWatch for JavaScript/CSS bundle size tracking"
  - "GitHub Actions workflow integrating all performance checks"
  - "Performance gate blocking PR merge on regression"
affects: [phase-6-asset-generation, phase-8-performance-optimization]

# Tech tracking
tech-stack:
  added: [bundlewatch@0.4.1]
  patterns:
    - "Performance budgets enforced in CI as hard failures (errors not warnings)"
    - "Parallel CI jobs for fast performance feedback"
    - "Gzip-based bundle size limits matching production serving"

key-files:
  created:
    - .github/workflows/performance.yml
  modified:
    - lighthouserc.mobile.cjs
    - lighthouserc.desktop.cjs
    - package.json

key-decisions:
  - "Lighthouse CI thresholds upgraded to 90+ for all categories (performance, accessibility, best-practices, seo)"
  - "Changed severity from 'warn' to 'error' to fail CI on violations"
  - "BundleWatch limits: 250KB JS, 50KB CSS (gzip) based on Next.js game app research"
  - "Gzip compression for bundle limits (matches CDN serving)"
  - "Three parallel CI jobs: bundle-size, asset-sizes, lighthouse"
  - "Performance gate job requires all checks to pass before PR merge"

patterns-established:
  - "Performance CI pattern: Fast checks first (bundle/assets), slower checks (Lighthouse) in parallel"
  - "Gate job pattern: Aggregate results from all performance checks in final gate"
  - "Lighthouse artifacts uploaded with 7-day retention for debugging"
  - "Core Web Vitals enforced: LCP 2500ms, FCP 1800ms, CLS 0.1, TBT 200ms"

# Metrics
duration: 2min
completed: 2026-01-22
---

# Phase 01 Plan 05: Performance Budget CI Summary

**Lighthouse CI enforcing 90+ scores as CI errors, BundleWatch tracking 250KB JS bundles, integrated GitHub Actions workflow blocking performance regressions**

## Performance

- **Duration:** 2 min
- **Started:** 2026-01-22T14:56:09Z
- **Completed:** 2026-01-22T14:58:16Z
- **Tasks:** 3
- **Files modified:** 5

## Accomplishments
- Lighthouse CI thresholds upgraded to 90+ performance scores (from 80/85)
- Severity changed from 'warn' to 'error' - CI now fails on performance regressions
- BundleWatch configured for bundle size tracking (250KB JS, 50KB CSS gzip)
- GitHub Actions workflow created with parallel performance checks
- Performance gate blocks PR merge if any check fails

## Task Commits

Each task was committed atomically:

1. **Task 1: Upgrade Lighthouse CI thresholds to 90+ and error severity** - `0f8a4bb` (feat)
2. **Task 2: Add BundleWatch for bundle size tracking** - `a1e6873` (feat)
3. **Task 3: Create GitHub Actions performance workflow** - `5c44ea8` (feat)

## Files Created/Modified

**Created:**
- `.github/workflows/performance.yml` - CI workflow with bundle-size, asset-sizes, lighthouse, and gate jobs

**Modified:**
- `lighthouserc.mobile.cjs` - Upgraded to 0.9 minScore, 'error' severity, added TBT assertion
- `lighthouserc.desktop.cjs` - Upgraded to 0.9 minScore, 'error' severity, added TBT assertion
- `package.json` - Added bundlewatch@0.4.1, bundle:check script, bundlewatch config
- `package-lock.json` - Bundlewatch dependency tree

## Decisions Made

1. **Lighthouse CI thresholds 90+ as errors**: Changed from 80/85 'warn' to 90 'error' to enforce performance budget. Warnings don't block merge - errors do.

2. **BundleWatch limits 250KB JS / 50KB CSS (gzip)**: Research shows this is achievable for Next.js game app without aggressive code splitting. Gzip matches CDN serving.

3. **Three parallel CI jobs**: bundle-size and asset-sizes run fast checks first, lighthouse runs slower checks in parallel. Performance gate aggregates results.

4. **Core Web Vitals enforced**: Added TBT 200ms assertion (missing from existing config). All four Core Web Vitals now enforced: LCP, FCP, CLS, TBT.

5. **Lighthouse artifacts 7-day retention**: Upload `.lighthouseci/` for debugging failed runs. Auto-cleanup after 7 days to save storage.

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered

None - all three tasks completed without issues.

## User Setup Required

None - no external service configuration required.

**Optional setup:**
- `LHCI_GITHUB_APP_TOKEN` secret for Lighthouse CI PR comments (not required for CI to run)
- `BUNDLEWATCH_GITHUB_TOKEN` automatically uses GitHub Actions `GITHUB_TOKEN` (no setup needed)

## Next Phase Readiness

**Ready for Phase 6 (Asset Generation):**
- Performance budget in place - assets limited to 200KB (from Plan 01-03)
- Bundle size tracked - JS limited to 250KB, CSS to 50KB
- Lighthouse CI enforcing 90+ scores on mobile and desktop
- CI workflow blocks PR merge on any performance regression

**Concerns:**
- Current performance scores unknown - first CI run will establish baseline
- If existing app doesn't meet 90+ threshold, CI will fail immediately
- May need optimization work in Phase 8 if current scores are below budget

---
*Phase: 01-infrastructure-foundation*
*Completed: 2026-01-22*
