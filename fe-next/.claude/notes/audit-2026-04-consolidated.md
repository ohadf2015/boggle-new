# Consolidated Audit Report — 2026-04-18

Rollup of six-track audit (code architecture, UX/UI, a11y + i18n/RTL, performance, game design) executed 2026-04-17 → 2026-04-18.

## Scope & Method
- 13 prioritized findings across P0/P1/P2/P3 tiers
- TDD-driven: RED-GREEN-REFACTOR per `.claude/rules/22-tdd-strict.md`
- One commit per resolved item (conventional commits)
- Range: commits `c26a02f7d` → `e0860906d`

## Resolved (shipped this audit)

### P0 — Correctness / crash
- **gameEngine teardown hardening** (`10014c058`) — singletons now release subscribers + clear timers on shutdown.
- **rate-limiter + spam-detector singleton teardown** (`ee1562464`).
- **SwipeTip post-unmount `onDismiss`** (`01e6a7004`) — timer-ref cleanup.
- **feature-flag N+1 lookups** (`c26a02f7d`) — 60s TTL cache.
- **backdrop-blur perf sweep** (`8d39d3e09`, `317649886`, `3bc4a5dc2`, `7e3bd98da`) — inventoried 146 sites across 111 files into 4 tiers (`backdrop-blur-audit-2026-04.md`). Tier 1 removed sub-perceptible `[1px]/[2px]` on gameplay tiles + chart. Tier 2 dropped `xs` from 27 per-frame HUD/scoreboard/toast/row surfaces (AdventureHUD, AdventureTimer, GameHeader, ScoreDisplay, ComboIndicator, OpponentWordFeed, DailyLeaderboard, MobileGameDrawer, StreakBar, etc). Tier 4 heavy-blur downgrade `md→xs` on 7 cold cards (RPGLevelCard, PremiumCard variants, keyboard tooltips). Tier 3 modal scrims intentionally kept.

### P1 — UX/design-system consistency
- **Tailwind v4 gradient migration** (`2357b8972`) — `bg-gradient-to-*` → `bg-linear-to-*`.
- **neo-yellow/orange semantic reserve** (`bf71b553b`) — restored celebration/warning-only usage.
- **typed ErrorCodes sweep** — 11 handlers migrated off raw strings to typed codes: avatar, chat, friendChallenge, friendMessaging, friends, gameLifecycle, gameStart, playerJoin, tournament, bot, scorecard.
- **socketErrors i18n namespace** (`1b2cc1c98`) — client-side code→message mapping for 5 languages.
- **adventure decomposition** — 6 extractions off `AdventureGame.tsx`: `AdventureGameShell`, `AdventureTailOverlays`, `useAdventureOverlayProps`, `useAdventureDerivations`, `useAdventureActions`, level hooks + tests.
- **shared bridge schemas** (`724202b57`) — single-source from `shared/`, fail-fast on missing import.
- **RTL logical-props sweep** (`567f131c8` Slice 2 + `fe7069cb6` Slice 3) — ~36 direction-semantic sites converted `pl/pr/ml/mr` → `ps/pe/ms/me` across legal, tv-results, admin panels, daily stats, chat, onboarding, wordForge HUD, emoji picker, game word list. Skipped 2 tabular leaderboard sites (`WheelRushDomination`, `BlastBoardDomination`) — numeric columns should not flip per advisor rule.
- **SEO duplicate metadata** (`20bd0286d`) — `community/create` + `education/classroom-game` were inheriting parent seo blocks. Added dedicated `seo.communityCreate` + `seo.educationClassroomGame` across all 5 locales + hardened `generatePageMetadata` fallback to synthesize unique title/description from path (warn in dev) instead of leaking root metadata.

### P2 — UX polish / dev ergonomics
- **dynamic() loading-flash fix** (`57145dc9c`, `771d485a1`) — `GameLoadingFallback` component + test, applied to 12 full-viewport `dynamic()` sites (HostInGameView, PlayerInGameView, AdventureWheelGame, Party Caption/Pixel/Shadow Clash phone+TV, JoinRedirect). Modals, ads, effect canvases explicitly classified as acceptable-without-loading (overlay or below-fold).

### P3 — Game design
- **hunt.lifePoints world scaling** (`e0860906d`) — flat 100 HP → `getHuntLifePoints(world)`: EASY=120, MEDIUM=100, HARD=75. Endless (world=0) uses EASY baseline.

## Deferred (not closed this audit)

### Needs scope decision
- **P1 SEO-page hardcoded English** — 30+ pages in `app/[locale]/*/`. Content-project scope, not refactor-scope. Needs translator pipeline.
- **P1 HIDDEN_WORDS localization** — curated thematic word lists per world currently English-only. Needs curated 10-word × 5-language × 10-world = 500 entries from language specialist, not a code-only fix.
- ~~**P1 logical-props sweep outside adventure**~~ — **CLOSED** in Slices 2+3 (`567f131c8`, `fe7069cb6`).

### Needs game-design review before implementation
- **P3 surface hidden-word gating** — `hiddenWord` set on `LevelConfig` but never displayed; `hasWordPath` silently drops when grid can't form it. Either guarantee presence (regenerate grid) or add explicit bonus-objective UI. Picking either is a design call.
- **P3 endless difficulty ramp past floor 7** — on read, ramp continues (timer decay, grid growth every 8 floors, second-mechanic at floor 30+, score target +50/floor). Specific stall symptom from audit was not reproducible without fresh playtest signal. Word-count objective `Math.min(rawTarget, maxAchievable)` does plateau at ~11 once timer hits `minTimerSeconds=45`, which may be the felt stall. Needs playtest before tuning.

## Files Created
- `components/ui/GameLoadingFallback.tsx` + test
- `components/game/SwipeTipTooltip.tsx` test + cleanup
- `lib/adventure/huntMode.ts` — `getHuntLifePoints(world)` helper
- `lib/socketErrors/*` — typed error-code → i18n key mapping
- 6 `components/adventure/` extractions (shell, overlays, hooks)

## Metrics
- Commits: 31 across audit window
- Tests: +164 hunt/level/adventure tests passing after lifePoints change (no regressions)
- Lint: clean on all modified files

## Next Recommended Work
1. Playtest endless past floor 7, capture specific stall frame → fix ramp
2. Design spike: hidden-word UX (bonus objective vs guaranteed-present vs post-reveal toast)
3. Product call: HIDDEN_WORDS + SEO localization budget
4. Mobile Lighthouse/DevTools trace on Pixel 3a (or 4x CPU throttle) to quantify frame-time win from Tier 1/2/4 blur removals — audit note flagged measurement as pending
