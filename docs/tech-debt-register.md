# Technical Debt Register

Last updated: 2026-04-25
Total items: 19 (rolled up from 100+ raw findings + react-doctor residuals + knip dead-code triage) | Estimated total effort: 3×XL + 7×L + 6×M + 3×S

Source: CCGS `ccgs-tech-debt scan` run on `fe-next/` 2026-04-22. React-doctor residuals (TD-015..TD-018) from batches 1–19 sweep on 2026-04-24. Knip triage (TD-019) 2026-04-25.

## Priority score: (impact × frequency) / effort. Critical=4, High=3, Med=2, Low=1. Effort XL=4, L=3, M=2, S=1.

| ID | Category | Description | Files | Effort | Impact | Priority | Added | Sprint | Why accepted |
|----|----------|-------------|-------|--------|--------|----------|-------|--------|--------------|
| TD-001 | Architecture | ~~20+ rune abilities stubbed as `TODO` no-ops~~ **RESOLVED** — removed 20 unimplemented rune defs from catalog (60→40), added `hasEvaluator()` + catalog/evaluator parity test. Non-scoring allowlist (timeWarp/hintWhisper/bigGrid) documented. | `lib/wordForge/runeCatalog.ts`, `runeEngine.ts`, `__tests__/runeParity.test.ts` | L | Critical | 4.0 | 2026-04-22 | 2026-04-22 | Shipped engine without full rune coverage; users hit inert abilities |
| TD-002 | Architecture | ~~`GameStateContext` marked `@deprecated` but still in provider tree~~ **RESOLVED** — file deleted; all consumers on Zustand selector hooks. Stale header comments kept. | `contexts/GameStateContext.tsx` (removed) | M | High | 3.0 | 2026-04-22 | 2026-04-22 | Zustand migration mid-flight |
| TD-003 | Architecture | 60+ production files >500 lines — violates project rule (`CLAUDE.md: Max 500 lines per file`) | `HeaderMobileMenu.tsx:1032`, `ProgressionContext.tsx:1002`, `SurvivalPromoVideo*.tsx:1584/1595`, `supabaseRealtime.ts:568` etc. | XL | High | 2.25 | 2026-04-22 | Backlog | Incremental accretion |
| TD-004 | Architecture | Duplicate He/En promo video components — ~3,100 lines near-identical, no i18n abstraction | `components/promo/SurvivalPromoVideoHe.tsx`, `SurvivalPromoVideo.tsx` | L | Med | 2.0 | 2026-04-22 | Backlog | Speed to ship He variant |
| TD-005 | Code Quality | 178 `eslint-disable react-hooks/exhaustive-deps` — ~half bare (no justification), mask stale-closure risk | repo-wide | XL | High | 2.25 | 2026-04-22 | Backlog | Easier than restructuring effects |
| TD-006 | Code Quality | 226 `any` / `as any` — **partial**: `supabaseRealtime.ts` 13→0, `blastJuiceKit.ts` 13→0, `app/api/admin/game-logs/route.ts` 12→0, `player/hooks/socket/usePlayerGameEvents.ts` 29→0, `backend/modules/gameState/persistence.ts` 27→0, `host/hooks/socket/useHostGameEvents.ts` 13→0, `player/hooks/socket/usePlayerSessionEvents.ts` 9→0, `player/hooks/socket/usePlayerWordEvents.ts` 9→0, `player/hooks/socket/usePlayerTournamentEvents.ts` 5→0, `backend/modules/workerRuntime.ts` 8→0, `host/hooks/socket/useHostWordEvents.ts` 5→0, `host/hooks/socket/useHostTournamentEvents.ts` 5→0, `host/hooks/socket/useHostPlayerEvents.ts` 10→0. Remaining: ~42 files | `lib/supabaseRealtime.ts` (done), `blastJuiceKit.ts` (done), `app/api/admin/game-logs/route.ts` (done), `player/hooks/socket/usePlayerGameEvents.ts` (done), `backend/modules/gameState/persistence.ts` (done), `host/hooks/socket/useHostGameEvents.ts` (done), `player/hooks/socket/usePlayerSessionEvents.ts` (done), `player/hooks/socket/usePlayerWordEvents.ts` (done), `player/hooks/socket/usePlayerTournamentEvents.ts` (done), `backend/modules/workerRuntime.ts` (done), `host/hooks/socket/useHostWordEvents.ts` (done), `host/hooks/socket/useHostTournamentEvents.ts` (done), `host/hooks/socket/useHostPlayerEvents.ts` (done) | L | High | 3.0 | 2026-04-22 | In progress | External API typing friction |
| TD-007 | Architecture | Deprecated util duplicates — `formatTimeHHMMSS`/`formatTimeAdaptive` live in 3 places, callers not migrated to `shared/utils` | `hooks/useWinStreak.ts:9` (621 lines), `utils/dailyChallenge/dateUtils.ts:77`, `hooks/useNewYearDetection.ts:136` | S | Med | 4.0 | 2026-04-22 | Backlog | Migration started, not finished |
| TD-008 | Test | 2 e2e `test.skip` reference a "dedicated integration suite" that does not exist | `e2e/daily-word-hunt.spec.ts:334,359` | S | Med | 4.0 | 2026-04-22 | Backlog | Deferred, never followed up |
| TD-009 | Test | 2 Adventure test files opening with `TODO: Fix type mismatches` — tests likely skipped/red | `AdventureGame.bossIntegration.test.tsx:2`, `AdventureGame.playerHealth.test.tsx:2` | M | Med | 2.0 | 2026-04-22 | Backlog | Refactor broke type contracts |
| TD-010 | Architecture | 35 `@deprecated` symbols still imported — dead code kept alive | repo-wide | M | Med | 2.0 | 2026-04-22 | Backlog | No sweep cadence |
| TD-011 | Documentation | 36 TODO comments, 20 clustered in `runeEngine.ts` — rest scattered | repo-wide | M | Low | 1.0 | 2026-04-22 | Backlog | Deferred work markers |
| TD-012 | Code Quality | `ProgressionContext.tsx` 1,002 lines — monolithic context, 2 bare `exhaustive-deps` suppressions | `contexts/ProgressionContext.tsx` | L | High | 3.0 | 2026-04-22 | Backlog | Central state grew organically |
| TD-013 | Code Quality | `HeaderMobileMenu.tsx` 1,032 lines — owns nav + notifications + coins + lang + auth | `components/header/HeaderMobileMenu.tsx` | L | Med | 2.0 | 2026-04-22 | Backlog | Single-file convenience |
| TD-014 | Code Quality | `useWinStreak.ts` 621 lines — hook far exceeds reasonable hook size | `hooks/useWinStreak.ts` | M | Med | 2.0 | 2026-04-22 | Backlog | Streak logic accreted |
| TD-015 | Performance | `no-layout-property-animation` — 71 errors. Framer-motion animating `width`/`height` (layout props) instead of `scaleX`/`scaleY` + `transformOrigin`. | adventure/boss/* (9), practice/* (4), party/* (2), singleplayer (1), ui/Collapsible+CollapsibleSection+PullToRefreshIndicator, daily/survival/*, 29 files total | L | Med | 2.0 | 2026-04-24 | Backlog | RTL origin-flip blocks blanket scaleX fix — `start-0` logical anchoring means `originX:0` breaks Hebrew visual direction. Needs per-component RTL-aware refactor. |
| TD-016 | Performance | `todo` rule (React Compiler bailouts) — 169 errors. "React Compiler can't optimize this code" diagnostics, NOT literal TODO comments. Blocks memoization. | repo-wide, clustered in CrazyGamesSDK + similar SDK wrappers using try/catch + empty catch blocks | L | Med | 2.0 | 2026-04-24 | Backlog | React Compiler bailouts, case-by-case. Common causes: empty `catch {}`, sessionStorage access in try/catch, non-idempotent side effects. Not mechanical. |
| TD-017 | Code Quality | `set-state-in-effect` — 219 errors. useEffect calling setState after mount. | repo-wide | L | Low | 1.33 | 2026-04-24 | Backlog | Sampled — predominantly legitimate transition refs / matchMedia subscriptions / animation flashes. False-positive heavy for this codebase's motion patterns. |
| TD-018 | Code Quality | `no-array-index-as-key` — 260 residuals after 19-batch sweep. Remaining sites are truly index-stable OR the array itself is stable-identity. | repo-wide | M | Low | 1.0 | 2026-04-24 | Backlog | Stable-identity sites exhausted in batches 1–19. Residuals need data-shape refactor (introduce stable IDs at source) rather than key-swap. |
| TD-019 | Code Quality | Knip dead-code triage — `npx knip@latest` (with `fe-next/knip.json`): **103 unused files**, **1,884 unused exports** across 1,162 files, **1,777 unused types**, **375 duplicate exports** (mostly named-export + default-export of same symbol). Sample of 37 flagged files via `rg "from '.*/<base>'"` shows **~95% genuine** (only 1–2 had real importers). False-positive bucket: untracked WIP (3 files: `CoinAnimationSystem.tsx`, `CoinBurstSource.tsx`, `CoinTrajectory.tsx` — current branch in-progress). Test-only refs (e.g. `BotControls.tsx`, `ResultsCtaSection.tsx` chain) — knip excludes test entries by default in this config. Top buckets: `components/results` (9), `components/adventure` (6), `components/daily` (5), `components/blastEngine` (4), `components/ui` (4), `hooks/*` (13 orphaned hooks), `shared/data/wordCategories.{he,es,ja,sv}.ts` (4 — replaced by per-locale strategy). Generated `utils/supabase/database.types.ts` should regenerate, not delete. | repo-wide; full list in `/tmp/knip-unused-files.txt` (run `npx knip@latest --reporter json` to refresh) | L | Med | 2.0 | 2026-04-25 | Backlog | Risky to bulk-delete: WIP branches accrete forward-declared scaffolding (battlepass, ranked, party games). Recommend per-area batches (audio/adaptive engine, battlepass scaffold, blastEngine alt impl) with ≥2 reviewer eyes per batch. Duplicates (375) are mechanical: prefer named export, drop default — separate cheap PR. Unused exports (1,884) likely contains real candidates for tree-shake gain on backend/redisClient.ts (~30 exports flagged) — sample first before sweep. |

## Clean signals (no debt found)

- **0 FIXME comments** — codebase uses `TODO` exclusively
- **0 HACK comments**
- **0 `@ts-ignore` in production** — `@ts-expect-error` only in tests with justifications
- **0 explicit performance debt markers**

## Sprint recommendation

Next sprint (priority ≥3.0):
- TD-001 (rune engine): finish or gate with feature flag + warning
- TD-007 (util dedup): S-effort, clears 3 files
- TD-008 (unskip e2e): S-effort, restores coverage
- TD-002 (GameStateContext): unblocks Zustand migration
- TD-006 (any cleanup): start with `supabaseRealtime.ts` — generate types via `mcp__supabase__generate_typescript_types`

## Rules

- Run `/ccgs-tech-debt scan` once per sprint to catch new debt
- Items older than 3 sprints without action → fix or consciously accept with new Why
