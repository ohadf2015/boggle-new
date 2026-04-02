# Adventure Mode — Comprehensive 5-Expert Audit

**Date:** 2026-04-02
**Experts:** Gameplay & Fun, UX & Accessibility, Code Quality, Backend & Data, Performance
**Total Findings:** 78 (11 Critical, 22 High, 30 Medium, 15 Low)

---

## Executive Summary

Adventure Mode has a solid core loop — server-side gold validation, deterministic grids, boss twist mechanics, and world-specific vocabulary challenges are genuinely differentiated. However, significant issues exist across all domains:

1. **Security**: Client-trusted data (wordsFound, flashChallengeGold, longWords) enables exploits. RLS policies allow direct DB manipulation.
2. **Broken Features**: 4+ upgrades sold but not wired, achievements localStorage-only, rune system hardcoded, boss grid effects don't render.
3. **Performance**: AdventureView re-renders every second (timer tick), Remotion bundled synchronously, 49 infinite animations during boss fights.
4. **Mobile UX**: XP bar hidden, flash challenge dismiss button 20px, no world context in header.
5. **Fun Gaps**: No "words you missed" screen, boss mechanics invisible to players, no mid-level save, loot drops silent.

---

## CRITICAL FINDINGS (11)

### C1 — `wordsFound` accepted without server-side dictionary validation
**Domain:** Backend Security | **File:** `app/api/adventure/complete/route.ts:330-347`
Client sends arbitrary `wordsFound: string[]`. Server only checks 3-15 char length, never validates against dictionary or grid. Inflates word album → claims all milestones → free gold/badges.
**Attack:** POST with 500 fake words, then claim all milestones.

### C2 — `flashChallengeGold` fully client-controlled
**Domain:** Backend Security | **File:** `app/api/adventure/complete/route.ts:99,285-286`
Server caps at 100 but never verifies a flash challenge occurred. Any client can send `flashChallengeGold: 100` on every completion.

### C3 — `player_progression` RLS allows direct client UPDATE
**Domain:** Backend Security | **File:** `supabase/migrations/049_adventure_mode.sql:100-105`
No column restriction on UPDATE policy. Authenticated user can directly SET `gold = 99999999` via PostgREST API.

### C4 — `player_inventory` RLS allows client INSERT/UPDATE
**Domain:** Backend Security | **File:** `supabase/migrations/20260328100000_add_player_inventory.sql:33-43`
Users can inject arbitrary items (`bossTrophy`, `cosmicShard`) at any rarity directly.

### C5 — Achievements stored in localStorage only — no server sync
**Domain:** Gameplay | **File:** `hooks/useAdventureAchievements.ts`
Clearing browser data wipes all achievement progress. No `/api/adventure/achievements` endpoint exists.

### C6 — Rune system hardcoded — not functional
**Domain:** Gameplay | **File:** `components/adventure/hooks/useAdventureGameInit.ts:27-34`
`runeEffects = DEFAULT_RUNE_EFFECTS` unconditionally. No DB read, no selection UI, no unlock path.

### C7 — Boss victory double-fire race condition
**Domain:** Gameplay | **File:** `hooks/useAdventureBossNew.ts:301-356`
`dealDamage` does NOT set `isActiveRef.current = false`. Rapid dual word submissions can both see `hp > 0`, both trigger `endBattle('victory')` → double loot / duplicate API calls.

### C8 — XP bar completely hidden on mobile
**Domain:** UX | **File:** `components/adventure/hud/AdventureHUD.tsx`
`hidden sm:block` removes XP progress bar below 640px. Core progression feedback invisible on phones.

### C9 — FlashChallengeToast dismiss button is 20px
**Domain:** UX/A11y | **File:** `components/adventure/FlashChallengeToast.tsx`
Less than half WCAG 2.5.5 minimum (44px). During time-pressured gameplay.

### C10 — Remotion bundled synchronously via barrel export
**Domain:** Performance | **File:** `components/adventure/cinematics/index.ts`
Constants exported alongside Remotion imports pull entire library into initial chunk.

### C11 — AdventureView re-renders every second
**Domain:** Performance | **File:** `components/adventure/AdventureView.tsx`
`setGameTimerState` triggers re-render of 20+ hooks, header, modals, shop FAB on every timer tick.

---

## HIGH FINDINGS (22)

### H1 — Gold farming via rapid level replay
**Domain:** Backend | No daily cap, no per-user replay frequency limit, no minimum time-in-level enforcement. Rate limiting is in-memory only (bypassable across instances).

### H2 — `longWords` count fully client-reported
**Domain:** Backend | **File:** `complete/route.ts:281-283` | Clamped at 20 but never cross-referenced with `wordsFound`. Free `cargoBay` bonus.

### H3 — Weekly challenge accepts client-reported score without grid verification
**Domain:** Backend | **File:** `app/api/adventure/weekly-challenge/route.ts:88-98` | Leaderboard manipulable.

### H4 — Rate limiting in-memory per-instance (not distributed)
**Domain:** Backend | **File:** `lib/apiRateLimit.ts` | Redis-backed `checkApiRateLimitAsync()` exists but unused by adventure routes.

### H5 — Boss grid effects not rendered
**Domain:** Gameplay | `gridEffectTrigger` state fires but no component reads it. `cave-in-hide`, `tile-absorption`, `continuous-scramble` are invisible.

### H6 — Blast Shield upgrades (iceTileReduction, bombTimerInvert) not wired to tile logic
**Domain:** Gameplay | Effects computed but tile behavior defined statically in `levelConfig.ts`.

### H7 — Word Dynamite shuffle uses not wired
**Domain:** Gameplay | `shuffleUsesPerLevel` computed but shuffle action doesn't consume upgrade-gated uses.

### H8 — Player death doesn't end boss battle
**Domain:** Gameplay | No `useEffect` watching `playerHealth.healthState.currentHP === 0` to trigger defeat.

### H9 — XP lost on premature exit
**Domain:** Gameplay | `pendingUpdate` held in state. No `beforeunload` listener or cleanup flush.

### H10 — Boss twist mechanics invisible to players
**Domain:** Gameplay | No UI explains "find palindromes for 2x damage." Players discover by accident or not at all.

### H11 — No post-level "words you missed" screen
**Domain:** Gameplay | Standard in word games. Grid is seeded deterministically so all words are computable.

### H12 — Boss HP scaling too aggressive for late worlds
**Domain:** Balance | W10=350HP, damage=ceil(score/3). ~105 word submissions needed. 7s attack intervals in desperate phase.

### H13 — Flash challenge gold lost on concurrent retry
**Domain:** Code Quality | **File:** `complete/route.ts` optimistic lock retry path | `flashChallengeGold` not accessible in retry scope, defaults to 0.

### H14 — `bossState: {}` always empty, tests assert properties on it
**Domain:** Code Quality | **File:** `useAdventureBossOrchestration.ts:285` | Tests test the mock, not real orchestration.

### H15 — 7 `any` types in AdventureGameOverlays
**Domain:** Code Quality | **File:** `AdventureGameOverlays.tsx:25-44` | Disables compiler checks on entire overlay render path.

### H16 — Dead code: `bossEffectCallbacks` built but never called
**Domain:** Code Quality | **File:** `useAdventureBossOrchestration.ts:259-274`

### H17 — View transitions ignore prefers-reduced-motion
**Domain:** UX | `AdventureView.tsx` and `AdventureHub.tsx` use raw `motion` instead of `AdaptiveMotion`.

### H18 — World themes only defined for W1-3
**Domain:** UX | **File:** `LevelEntryOverlay.tsx` | Worlds 4-10 fall back to W1's lime/green palette.

### H19 — No world context on mobile header
**Domain:** UX | Title/breadcrumb `hidden sm:flex`. Mobile players don't know which world they're in.

### H20 — Hardcoded "Loading adventure..." string
**Domain:** i18n | **File:** `PageClient.tsx` | Not using `t()`.

### H21 — 49 infinite Framer Motion animations during boss fights
**Domain:** Performance | Tile overlays all run `repeat: Infinity` simultaneously on mobile.

### H22 — Uncleaned setTimeout in BossOverlay
**Domain:** Performance | **File:** `boss/BossOverlay.tsx:172` | Fires on unmounted component after quick boss death.

---

## MEDIUM FINDINGS (30)

| # | Domain | Finding |
|---|--------|---------|
| M1 | Backend | `solve-grid` exposes full dictionary for any grid |
| M2 | Backend | `skill-tree` accepts arbitrary skill IDs (no validation against game config) |
| M3 | Backend | `word_album` update not covered by optimistic lock (concurrent writes drop words) |
| M4 | Backend | XP sync to profiles is fire-and-forget with one retry |
| M5 | Backend | Loot drops in `after()` — silently lost on process kill |
| M6 | Backend | Level-skip check has off-by-one gap at world boundary on partial failure |
| M7 | Backend | `attempt` GET and `inventory` GET have no rate limit |
| M8 | Backend | `progress` POST has no rate limit |
| M9 | Backend | `retainedScore` accepted but silently discarded (Salvage Claw T2) |
| M10 | Gameplay | `bonusHintsPerLevel` (Deep Drill) likely not summed |
| M11 | Gameplay | `guaranteedGoldTile` (Gem Detector T3) has no consuming code |
| M12 | Gameplay | `retryScoreRetention` (Salvage Claw T2) not applied on retry |
| M13 | Gameplay | World mechanic multiplier inconsistency (W3 triggers constantly, W7 rarely) |
| M14 | Gameplay | Star gate W3→W4 requires near-perfect play |
| M15 | Gameplay | Combo decay eaten by network latency |
| M16 | Gameplay | Weekly modifier mid-session rollover changes active modifiers |
| M17 | Gameplay | No mid-level checkpoints or save points |
| M18 | Gameplay | Loot drop feedback is silent (no animation, no reveal) |
| M19 | UX | Hardcoded `en-US` number locale in AdventureHUD |
| M20 | UX | Auto-scroll jump surprises user (600ms delay) |
| M21 | UX | Locked worlds show no star requirement count |
| M22 | UX | No skip-to-content link on adventure pages |
| M23 | UX | PowerUpButton touch target 40px (below 44px minimum) |
| M24 | UX | Focus not restored after level completion |
| M25 | i18n | Hebrew boss rush/endless key parity unverified |
| M26 | Perf | 9 adventure files bypass AdaptiveMotion (direct framer-motion imports) |
| M27 | Perf | Per-particle SVG blur filters in WorldParticles (10 GPU textures) |
| M28 | Perf | `<style jsx global>` keyframes injected on every WorldParticles mount |
| M29 | Perf | AdventureThemeContext cascading re-renders (inline `isTransitioning`) |
| M30 | Perf | `getPerformanceConfig()` called per AdaptiveMotion instance (~60 calls on grid mount) |

---

## LOW FINDINGS (15)

| # | Domain | Finding |
|---|--------|---------|
| L1 | Backend | `chapter_quest_progress` accepts arbitrary quest keys |
| L2 | Backend | `calculate_player_level` DB function vs TypeScript divergence risk |
| L3 | Backend | `upsert_level_completion` orphaned SECURITY DEFINER function |
| L4 | Backend | Completion retry has no exponential backoff |
| L5 | Code | `_levelNumber` and `_timeRemaining` accepted but discarded |
| L6 | Code | `handleBossIntroStart` and `handleBossIntroSkip` are identical |
| L7 | Code | `supabase: any` in `updateWeeklyQuestProgress` |
| L8 | Code | `useMemo` for initial state should use `useReducer` lazy init |
| L9 | UX | Deprecated `neo-orange` in RetryAssistModal gradient |
| L10 | UX | Physical `left-0 right-0` instead of logical properties |
| L11 | UX | Hebrew "Lv." prefix not translated |
| L12 | UX | LevelGrid parallax not RTL-compensated |
| L13 | Perf | `canvas-confetti` loaded synchronously (deferrable) |
| L14 | Perf | No cinematic chunk preloading during countdown |
| L15 | Perf | Timer `setInterval` drift (~4-8s free time over 2min level) |

---

## Sprint Plan

### Sprint 1 — Security & Exploits (Critical)
**Goal:** Close all client-trust vulnerabilities and RLS gaps.

| Task | Findings | Est |
|------|----------|-----|
| Server-side word validation (dictionary + grid check) | C1 | L |
| Remove client-controlled `flashChallengeGold` — compute server-side | C2 | M |
| Restrict `player_progression` RLS to service-role writes only | C3 | M |
| Restrict `player_inventory` RLS to service-role writes only | C4 | S |
| Server-validate `longWords` count against `wordsFound` | H2 | S |
| Add grid proof to weekly challenge submission | H3 | M |
| Switch adventure routes to Redis-backed rate limiting | H4 | M |
| Add rate limits to `attempt` GET, `inventory` GET, `progress` POST | M7, M8 | S |
| Add daily gold earning cap + minimum time-in-level enforcement | H1 | M |

### Sprint 2 — Broken Features & Gameplay Bugs
**Goal:** Fix features that are sold/shown but don't work.

| Task | Findings | Est |
|------|----------|-----|
| Fix boss victory double-fire race (set `isActiveRef` in `dealDamage`) | C7 | S |
| Wire player death → defeat trigger in boss orchestration | H8 | S |
| Fix flash gold lost on concurrent retry (extract to outer scope) | H13 | S |
| Wire `iceTileReduction` and `bombTimerInvert` to tile logic | H6 | M |
| Wire `shuffleUsesPerLevel` to shuffle action | H7 | M |
| Wire `guaranteedGoldTile`, `bonusHintsPerLevel`, `retryScoreRetention` | M10-M12 | M |
| Render boss grid effects (`cave-in-hide`, `tile-absorption`, etc.) | H5 | L |
| Implement `retainedScore` in completion API (or remove from payload) | M9 | M |
| Add `beforeunload` XP flush | H9 | S |

### Sprint 3 — Mobile UX & Accessibility
**Goal:** Make adventure mode playable and accessible on phones.

| Task | Findings | Est |
|------|----------|-----|
| Show XP bar on mobile (responsive redesign) | C8 | M |
| Enlarge FlashChallengeToast dismiss to 44px+ | C9 | S |
| Enlarge PowerUpButton to 44px+ | M23 | S |
| Show world name on mobile header | H19 | S |
| Define world themes for W4-W10 | H18 | M |
| Replace raw `motion` with `AdaptiveMotion` in 9 files | H17, M26 | M |
| Fix hardcoded "Loading adventure..." → `t()` | H20 | S |
| Fix hardcoded `en-US` locale in number formatting | M19 | S |
| Add focus management after level completion | M24 | S |
| Add skip-to-content link | M22 | S |

### Sprint 4 — Performance
**Goal:** Eliminate render waste and reduce bundle size.

| Task | Findings | Est |
|------|----------|-----|
| Move `gameTimerState` out of AdventureView (stop per-second re-renders) | C11 | M |
| Split cinematic constants from Remotion imports | C10 | S |
| Replace per-particle SVG blur with shared filter | M27 | S |
| Extract `<style jsx global>` keyframes to static CSS | M28 | S |
| Memoize AdventureThemeContext value (fix `isTransitioning`) | M29 | S |
| Memoize `getPerformanceConfig()` at module level | M30 | S |
| Clean up BossOverlay setTimeout (add ref + cleanup) | H22 | S |
| Pass `getTileConfig` as prop instead of context to tiles | H21 relates | M |

### Sprint 5 — Engagement & Fun
**Goal:** Make adventure mode more fun and retain players.

| Task | Findings | Est |
|------|----------|-----|
| Boss twist mechanic tutorial UI | H10 | M |
| Post-level "words you missed" screen | H11 | L |
| Loot drop reveal animation + client callback | M18 | M |
| Achievement server persistence (new API endpoint) | C5 | L |
| Boss HP rebalance for W8-W10 | H12 | M |
| World mechanic multiplier normalization (W3 vs W7) | M13 | M |
| Star gate recalibration | M14 | S |
| Locked world star requirement display | M21 | S |

### Sprint 6 — Cleanup & Polish
**Goal:** Remove dead code, fix type safety, polish.

| Task | Findings | Est |
|------|----------|-----|
| Remove rune system or implement it | C6 | Decision needed |
| Remove `bossEffectCallbacks` dead code | H16 | S |
| Remove `bossState: {}` and fix tests | H14 | S |
| Type `AdventureGameOverlays` props (remove 7 `any`s) | H15 | M |
| Remove `_levelNumber`, `_timeRemaining` dead props | L5, L6 | S |
| Merge identical `handleBossIntroStart`/`handleBossIntroSkip` | L6 | S |
| Fix orphaned `upsert_level_completion` SECURITY DEFINER | L3 | S |
| Type `updateWeeklyQuestProgress` supabase param | L7 | S |

---

## Positive Findings

- **Server-side gold validation** with optimistic locking is well-implemented
- **Boss twist mechanics** (10 types) are genuinely creative word-game differentiators
- **World mechanics** use real linguistic analysis (palindromes, etymology, compound words)
- **WorldMap ARIA labels** are exemplary (locked state, star count, world name)
- **PauseOverlay** is a proper accessible dialog (role, modal, focus trap, ESC)
- **RTL alternating layout** on WorldMap works correctly
- **Safe-area insets** properly applied on HUD and header
- **Tile ARIA descriptions** for all special tile types in both en/he
- **LevelEntryOverlay reduced-motion** path correctly short-circuits
- **Boss arena decorative effects** all marked `aria-hidden="true"`
- **Timer architecture** with `useSyncExternalStore` isolation is smart
- **Upgrade effect computation** is clean and memoized
