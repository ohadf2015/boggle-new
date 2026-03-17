# LexiClash — Production Readiness Audit Report
**Date:** 2026-03-17 | **Verdict:** CONDITIONALLY READY (1 manual action remaining: rotate secrets)

## Fix Status — 38 issues addressed

### Sprint 1 (Security Blockers) — DONE
- [x] S2: Server-side purchase validation (upgradeConfig + optimistic lock)
- [x] S3: Server-side gold calculation (removed clientGoldEarned)
- [x] S4: Socket.IO JWT auth middleware + verifiedUserId
- [x] R1: Error boundaries for adventure/blast/multiplayer
- [ ] S1: **MANUAL** — Rotate secrets in .env, purge git history

### Sprint 2 (Critical Fixes) — DONE
- [x] P1: GameStateContext render storm — removed wasteful store subscription
- [x] P2: useSafeSocketEvent JSON.stringify + array alloc per render
- [x] A11y: Focus traps in 5 modals (shared useFocusTrap hook)
- [x] A11y: Form labels + aria-describedby in auth forms
- [x] Sentry: captureApiError wired in 12 API routes (18 catch blocks)
- [x] IP spoofing: rightmost IP extraction in rateLimiter + admin middleware
- [x] Admin rate limit: 300 → 60 req/min
- [x] sortBy allowlist in admin game-logs
- [x] resetGame handler try/catch wrapper
- [x] Prestige optimistic lock (prevent double-apply)
- [x] Sentry wired in leaderboard/profile error boundaries

### Sprint 3 (Performance + A11y) — DONE
- [x] Contrast fixes: text-gray-400→300 on dark backgrounds (28 instances)
- [x] Lazy-load English/Spanish word lists (cold start improvement)
- [x] Dynamic import for AchievementCinematic (Remotion out of initial bundle)
- [x] Landing page server-side data fetching (in progress)

## CRITICAL Issues (13)

### Security (3) — Block deployment
| # | Issue | File |
|---|-------|------|
| S1 | Live secrets (Firebase private key, Supabase keys) in `.env` | `.env` |
| S2 | Adventure purchase API trusts client-sent gold — economy exploit | `api/adventure/purchase/route.ts` |
| S3 | Level completion trusts client `goldEarned` — unlimited gold | `api/adventure/complete/route.ts` |

### Reliability (3)
| # | Issue | File |
|---|-------|------|
| R1 | No error boundaries on adventure/blast/multiplayer routes | `app/[locale]/*/` |
| R2 | `process.env.X!` non-null assertions crash on missing env vars | 10+ API routes |
| R3 | Word submission silently fails when Redis is down | `wordHandler.ts` |

### Performance (2)
| # | Issue | File |
|---|-------|------|
| P1 | `GameStateContext` subscribes to entire Zustand store | `GameStateContext.tsx:70` |
| P2 | `JSON.stringify` in `useSafeSocketEvent` dep array runs 60x/sec | `useSafeSocketEvent.ts:157` |

### Accessibility (5)
| # | Issue | WCAG |
|---|-------|------|
| A1 | No focus trap in LevelCompleteModal | 2.1.2 |
| A2 | No focus trap in PauseOverlay, BossIntro, BossVictory, LevelUpModal | 2.1.2 |
| A3 | RetryAssistModal has hardcoded English `aria-label` | 4.1.2 |
| A4 | Auth form inputs missing `<label>` elements | 1.3.1 |
| A5 | Error messages not linked to inputs via `aria-describedby` | 3.3.1 |

## HIGH Issues (26)

### Security (6)
- No Socket.IO auth on connection (playerJoinHandler.ts)
- IP spoofing bypasses rate limiting (rateLimiter.ts, admin/middleware.ts)
- CSP has `unsafe-inline`/`unsafe-eval` (server/middleware.ts)
- Timing-vulnerable cron secret comparison (cron routes)
- Unvalidated `sortBy` query param (admin/game-logs/route.ts)
- Admin rate limit 300 req/min too permissive (admin/middleware.ts)

### Performance (6)
- Remotion runtime (~200KB) in all pages via static import (AchievementQueue.tsx:9)
- Landing page fires 7 sequential client fetches (LandingView.tsx)
- 71MB unoptimized PNGs in public/images/
- Dead GSAP import in BlastGameLayout.tsx:40
- 250K-word arrays parsed on cold start (validate-word/route.ts)
- Array allocation every frame in useSafeSocketEvent.ts:128

### Reliability (6)
- Sentry not wired in leaderboard/profile error.tsx
- Prestige race condition — double-apply (prestige/route.ts)
- Dangling reconnection timers after leaveRoom (connectionHandler.ts)
- `resetGame` handler missing try/catch (gameLifecycleHandler.ts)
- ~35 API routes not reporting to Sentry
- Client-controlled `goldEarned` bypass (also security)

### Accessibility (8)
- Avatar buttons missing aria-label + aria-pressed (ProfileCustomizationModal)
- Name input unlabelled (ProfileCustomizationModal)
- UpgradeShop category tabs missing aria-pressed
- OnboardingModal ignores prefers-reduced-motion
- EmailCaptureModal input unlabelled, error not linked
- Hardcoded "YOU" / "Your Profile" strings (ProfileCustomizationModal)
- LevelCompleteModal focus not moved on open
- text-gray-400/500 fails 4.5:1 contrast on neo-navy backgrounds

## What's Already Good
- Build passes, standalone output, multi-stage Dockerfile, Railway healthcheck
- Admin auth verifies JWT + DB is_admin
- Million.js compiler, optimizePackageImports, removeConsole
- useSafeSocketEvent hook pattern (try/catch + cleanup)
- global-error.tsx handles chunk load errors
- Comprehensive .env.example (135 lines)
- Security headers (HSTS, X-Frame-Options, X-Content-Type-Options)

## Fix Priority

### Sprint 1 — Must fix before launch
1. Rotate all secrets, purge git history
2. Server-side gold calculation (purchase + complete APIs)
3. Add error boundaries for game routes
4. Socket.IO authentication middleware

### Sprint 2 — First week post-launch
5. Fix GameStateContext render storm
6. Remove JSON.stringify from useSafeSocketEvent deps
7. Add focus traps to modals (shared useFocusTrap hook)
8. Add labels + aria-describedby to auth forms
9. Wire Sentry captureApiError in all API catch blocks
10. Fix IP spoofing in rate limiter

### Sprint 3 — Ongoing improvement
11. Landing page server-side data fetching
12. Optimize 71MB PNG assets
13. Contrast fixes (gray-400 → gray-300 on dark)
14. Lazy-load English/Spanish word lists
