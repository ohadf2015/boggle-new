# Technical Debt Register

Last updated: 2026-04-22
Total items: 14 (rolled up from 100+ raw findings) | Estimated total effort: 3×XL + 5×L + 4×M + 2×S

Source: CCGS `ccgs-tech-debt scan` run on `fe-next/` 2026-04-22.

## Priority score: (impact × frequency) / effort. Critical=4, High=3, Med=2, Low=1. Effort XL=4, L=3, M=2, S=1.

| ID | Category | Description | Files | Effort | Impact | Priority | Added | Sprint | Why accepted |
|----|----------|-------------|-------|--------|--------|----------|-------|--------|--------------|
| TD-001 | Architecture | ~~20+ rune abilities stubbed as `TODO` no-ops~~ **RESOLVED** — removed 20 unimplemented rune defs from catalog (60→40), added `hasEvaluator()` + catalog/evaluator parity test. Non-scoring allowlist (timeWarp/hintWhisper/bigGrid) documented. | `lib/wordForge/runeCatalog.ts`, `runeEngine.ts`, `__tests__/runeParity.test.ts` | L | Critical | 4.0 | 2026-04-22 | 2026-04-22 | Shipped engine without full rune coverage; users hit inert abilities |
| TD-002 | Architecture | ~~`GameStateContext` marked `@deprecated` but still in provider tree~~ **RESOLVED** — file deleted; all consumers on Zustand selector hooks. Stale header comments kept. | `contexts/GameStateContext.tsx` (removed) | M | High | 3.0 | 2026-04-22 | 2026-04-22 | Zustand migration mid-flight |
| TD-003 | Architecture | 60+ production files >500 lines — violates project rule (`CLAUDE.md: Max 500 lines per file`) | `HeaderMobileMenu.tsx:1032`, `ProgressionContext.tsx:1002`, `SurvivalPromoVideo*.tsx:1584/1595`, `supabaseRealtime.ts:568` etc. | XL | High | 2.25 | 2026-04-22 | Backlog | Incremental accretion |
| TD-004 | Architecture | Duplicate He/En promo video components — ~3,100 lines near-identical, no i18n abstraction | `components/promo/SurvivalPromoVideoHe.tsx`, `SurvivalPromoVideo.tsx` | L | Med | 2.0 | 2026-04-22 | Backlog | Speed to ship He variant |
| TD-005 | Code Quality | 178 `eslint-disable react-hooks/exhaustive-deps` — ~half bare (no justification), mask stale-closure risk | repo-wide | XL | High | 2.25 | 2026-04-22 | Backlog | Easier than restructuring effects |
| TD-006 | Code Quality | 226 `any` / `as any` in prod source — type-safety gaps concentrated in Supabase realtime + PixiJS effects + admin API | `supabaseRealtime.ts` (13), `blastJuiceKit.ts` (13), `app/api/admin/game-logs/route.ts` (12) + ~50 files | L | High | 3.0 | 2026-04-22 | Backlog | External API typing friction |
| TD-007 | Architecture | Deprecated util duplicates — `formatTimeHHMMSS`/`formatTimeAdaptive` live in 3 places, callers not migrated to `shared/utils` | `hooks/useWinStreak.ts:9` (621 lines), `utils/dailyChallenge/dateUtils.ts:77`, `hooks/useNewYearDetection.ts:136` | S | Med | 4.0 | 2026-04-22 | Backlog | Migration started, not finished |
| TD-008 | Test | 2 e2e `test.skip` reference a "dedicated integration suite" that does not exist | `e2e/daily-word-hunt.spec.ts:334,359` | S | Med | 4.0 | 2026-04-22 | Backlog | Deferred, never followed up |
| TD-009 | Test | 2 Adventure test files opening with `TODO: Fix type mismatches` — tests likely skipped/red | `AdventureGame.bossIntegration.test.tsx:2`, `AdventureGame.playerHealth.test.tsx:2` | M | Med | 2.0 | 2026-04-22 | Backlog | Refactor broke type contracts |
| TD-010 | Architecture | 35 `@deprecated` symbols still imported — dead code kept alive | repo-wide | M | Med | 2.0 | 2026-04-22 | Backlog | No sweep cadence |
| TD-011 | Documentation | 36 TODO comments, 20 clustered in `runeEngine.ts` — rest scattered | repo-wide | M | Low | 1.0 | 2026-04-22 | Backlog | Deferred work markers |
| TD-012 | Code Quality | `ProgressionContext.tsx` 1,002 lines — monolithic context, 2 bare `exhaustive-deps` suppressions | `contexts/ProgressionContext.tsx` | L | High | 3.0 | 2026-04-22 | Backlog | Central state grew organically |
| TD-013 | Code Quality | `HeaderMobileMenu.tsx` 1,032 lines — owns nav + notifications + coins + lang + auth | `components/header/HeaderMobileMenu.tsx` | L | Med | 2.0 | 2026-04-22 | Backlog | Single-file convenience |
| TD-014 | Code Quality | `useWinStreak.ts` 621 lines — hook far exceeds reasonable hook size | `hooks/useWinStreak.ts` | M | Med | 2.0 | 2026-04-22 | Backlog | Streak logic accreted |

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
