# LexiClash — Full Game Modes Audit (2026-03-18)

> 5 expert agents audited all 17 game modes across Game Design, UX/UI, Code Quality, Performance, and Backend/Security.

---

## Executive Summary

| Mode | Game Design | UX/UI | Code Quality | Performance | Backend | Overall |
|------|------------|-------|-------------|-------------|---------|---------|
| Classic MP | ADEQUATE | STRONG | ADEQUATE | ADEQUATE | STRONG | **ADEQUATE** |
| Blast MP | ADEQUATE | STRONG | STRONG | ADEQUATE | STRONG | **STRONG** |
| Word Hunt MP | STRONG | ADEQUATE | ADEQUATE | STRONG | ADEQUATE | **ADEQUATE** |
| Singleplayer Classic | ADEQUATE | STRONG | ADEQUATE | ADEQUATE | N/A | **ADEQUATE** |
| Daily Challenge | STRONG | ADEQUATE | ADEQUATE | ADEQUATE | N/A | **ADEQUATE** |
| Blast SP | ADEQUATE | STRONG | STRONG | ADEQUATE | N/A | **ADEQUATE** |
| Adventure | ADEQUATE | ADEQUATE | WEAK | WEAK | ADEQUATE | **WEAK** |
| Combo Master | ADEQUATE | WEAK | WEAK | ADEQUATE | N/A | **WEAK** |
| Lightning Round | ADEQUATE | WEAK | WEAK | ADEQUATE | N/A | **WEAK** |
| Memory Hunt | STRONG | WEAK | ADEQUATE | ADEQUATE | N/A | **ADEQUATE** |
| Pattern Switcher | WEAK | WEAK | WEAK | ADEQUATE | N/A | **WEAK** |
| Rare Gems | ADEQUATE | WEAK | WEAK | ADEQUATE | N/A | **WEAK** |
| Education/Classroom | ADEQUATE | ADEQUATE | ADEQUATE | ADEQUATE | WEAK | **ADEQUATE** |
| Practice (7 modes) | ADEQUATE | STRONG | STRONG | ADEQUATE | N/A | **STRONG** |
| Education Duels | ADEQUATE | ADEQUATE | ADEQUATE | ADEQUATE | N/A | **ADEQUATE** |
| Custom Puzzles | ADEQUATE | ADEQUATE | ADEQUATE | ADEQUATE | N/A | **ADEQUATE** |
| Multiplayer Lobby | ADEQUATE | STRONG | ADEQUATE | ADEQUATE | N/A | **ADEQUATE** |

**Strongest modes**: Blast (best architecture), Practice (well-decomposed), Daily Challenge (best retention)
**Weakest modes**: Brain Drills (systemic issues across all 5), Adventure (ambitious but incomplete), Pattern Switcher (has impossible states)

---

## CRITICAL Issues (Fix Immediately)

| # | Issue | Source | Severity |
|---|-------|--------|----------|
| C1 | **Classroom handler has NO auth or input validation** — any socket can impersonate a teacher, create/join classroom games | Backend | CRITICAL |
| C2 | **Client-side coin economy fully exploitable** — localStorage-based, devtools can set unlimited coins | Backend | CRITICAL |
| C3 | **Pattern Switcher generates impossible states** — requests word lengths that don't exist on the board | Game Design | CRITICAL (UX) |
| C4 | **All 5 drills have ZERO accessibility** — no ARIA, no focus-visible, no touch targets, no screen reader support | UX/UI | CRITICAL (a11y) |
| C5 | **All 5 drills have ZERO RTL support** — Hebrew users see broken layout | UX/UI | CRITICAL (i18n) |

---

## HIGH Issues

| # | Issue | Source |
|---|-------|--------|
| H1 | Classic MP trusts client-provided `letterGrid` — host can craft favorable boards | Backend |
| H2 | Word Hunt `submitTargetWord` has no Zod validation schema | Backend |
| H3 | Classroom handler broadcasts to rooms without membership verification | Backend |
| H4 | Adventure `complete` endpoint trusts client `stars` without server validation | Backend |
| H5 | Adventure progression update has no optimistic lock (race condition on gold/XP) | Backend |
| H6 | No error boundaries on: all 5 drills, Daily Challenge, Practice, Custom Puzzle, Word Hunt | UX/UI |
| H7 | No `dvh`/safe-area on: all 5 drills, Word Hunt, SP, Education, Practice (only Adventure uses `h-dvh`) | UX/UI |
| H8 | All 5 drills use raw `motion` not `AdaptiveMotion` — no reduced-motion support | UX/UI + Perf |
| H9 | Adventure mode: ZERO `AdaptiveMotion` usage (432 raw `motion.*`) — heaviest animation mode ignores reduced-motion | Performance |
| H10 | `ComboMaster.tsx:134` — stale `combo` closure in `handleWordSubmit` useCallback (bug) | Code Quality |
| H11 | `ComboMaster.tsx:102` — `setState` inside another `setState` updater (React anti-pattern) | Code Quality |
| H12 | `AdventureGame.tsx:220` — `as any` cast hides missing `PlayerProgression` fields | Code Quality |
| H13 | 4 Adventure Word Forge upgrades display in shop but do nothing (gemDetector, blastShield, wordDynamite, timeFreeze) | Game Design |
| H14 | Economy incoherence: coins (localStorage) vs gold (Supabase) — no connection between them | Game Design |

---

## MEDIUM Issues

### Game Design
| # | Issue |
|---|-------|
| M1 | Scoring feels flat — `baseScore = wordLength - 1` means 7-letter word = 6 points. Recommend 10x multiplier |
| M2 | No "words missed" post-game reveal in Classic (Word Hunt has it, Classic doesn't) |
| M3 | Daily streak bonus caps at 7 days — no incentive beyond week 1 |
| M4 | Drill isolation — no XP, no gold, no persistent leaderboards, no profile connection |
| M5 | UGC has zero discoverability — puzzles only accessible by shared code |
| M6 | No ranked/ELO mode anywhere — competitive players have no ladder |
| M7 | Blast orphaned components never mounted: `BlastComboDiscovery`, `useBlastComboStreak` |
| M8 | Blast SP has no persistent wave saves — sessions restart at Wave 1 |
| M9 | Drill boards reuse same grid per session — players memorize rather than train |

### UX/UI
| # | Issue |
|---|-------|
| M10 | Drills: unnecessary `useTheme()`/`isDarkMode` ternaries (app is dark-only) |
| M11 | MemoryHunt study modal: `fixed inset-0` overlay without focus trap |
| M12 | RareGems rarity legend: color-only differentiation, fails WCAG 1.4.1 |
| M13 | Education: hardcoded English string `"Setting up your classroom..."` (ClassroomGameLobby:258) |
| M14 | InGameScreen:322 — UA sniffing for desktop detection (should use media query) |

### Code Quality
| # | Issue |
|---|-------|
| M15 | 60-line word submission logic duplicated across ComboMaster, LightningRound, RareGems |
| M16 | `useSurvivalGameLogic.ts` — 731 lines (needs splitting into 3-4 hooks) |
| M17 | Raw `setInterval` in drills should use existing `useSafeInterval` hook |
| M18 | 8 files exceed 500-line limit: ComboMaster(554), LightningRound(535), RareGems(559), PatternSwitcher(515), SinglePlayerView(589), CustomPuzzleCreator(576), ClassroomGameLobby(588), AdventureGame(815) |
| M19 | Adventure: `bossConfig: any`, `checkBossWord: any`, `recordCompletion: any` — production type holes |
| M20 | Only 1 test file for all 5 drills combined |

### Performance
| # | Issue |
|---|-------|
| M21 | Blast `clearTilesForWord`: 4 separate `setState` calls outside React event handler — no batching, causes jank |
| M22 | Memory leak: `useBlastGame.ts:357` — `setTimeout` for cascade with no cleanup ref |
| M23 | Memory leak: `AdventureGame.tsx:403` — bare `setTimeout` for hint with no cleanup |
| M24 | Memory leak: `useDailyConfetti.ts:59` — RAF loop without cancelable ID |
| M25 | Grid tiles not individually memoized in `GridComponent` — 25-36 recalculations per selection |
| M26 | `DailyLeaderboard.tsx` (605L) — full player list with no virtualization |
| M27 | `hasValidWords` DFS still on main thread (uses `requestIdleCallback` but no Web Worker) |
| M28 | Blast: 82 raw `motion.*` bypassing reduced-motion |

### Backend
| # | Issue |
|---|-------|
| M29 | Rate limit: 150 msg/10s per socket is very permissive (15 msg/sec) |
| M30 | `debugGameState` event leaks game info in production |
| M31 | Classroom game data has no TTL/cleanup in Redis |
| M32 | Scoring O(n) lookup for `existingDetails` — should be Map for O(1) |
| M33 | Final score recalculation may diverge from live scores (combo bonus handling) |

---

## What's Working Well

### Architecture
- **Blast mode** is best-in-class: pure logic utilities, React hooks, UI components in clean layers
- **Practice modes** are well-decomposed with proper hook extraction pattern
- **MemoryHunt** is the correct pattern other drills should follow (extracted `useMemoryHuntGame`)
- **Zustand** selectors are properly atomic — no over-subscription

### Backend
- Zod validation on most socket events with XSS prevention
- Server-side combo/fire-round derivation — never trusts client
- Profanity filter on word submissions
- Grace period locking for post-game with distributed lock
- Optimistic locking on adventure purchases
- IP extraction uses rightmost proxy IP (correct for X-Forwarded-For)

### Infrastructure
- Million.js compiler active in production
- `optimizePackageImports` for lucide-react, framer-motion, radix-ui
- Dictionary caching: O(1) memory Set + IndexedDB 24h TTL
- AVIF/WebP image optimization with 1-year TTL

### Design
- Word Hunt is genuinely differentiated (life drain + target word race)
- Daily Challenge has strongest retention mechanics (streak, leaderboard, one-per-day)
- Adventure Word Forge upgrade system is well-designed (11 upgrades, 4 categories)
- i18n discipline is excellent — virtually all strings use `t()`

---

## Recommended Fix Sprints

### Sprint 1: Security & Critical Bugs (1-2 days)
1. Add auth + Zod validation to classroom handler (C1)
2. Migrate coin mutations to server-side only (C2)
3. Fix Pattern Switcher: filter requested lengths to available words (C3)
4. Add Zod schema to Word Hunt `submitTargetWord` (H2)
5. Server-side grid generation for ranked Classic (H1)
6. Fix stale `combo` closure in ComboMaster (H10)

### Sprint 2: Drill Rehabilitation (2-3 days)
1. Add `dir` from `useLanguage()` to all 5 drills (C5)
2. Add ARIA labels, `focus-visible`, `min-h-[44px]` touch targets, `aria-live` on scores/timers (C4)
3. Wrap all 5 drills in `FeatureErrorBoundary` (H6)
4. Replace raw `motion` with `AdaptiveMotion` in all drills (H8)
5. Extract `useDrillWordSubmit` shared hook (M15)
6. Remove unnecessary `useTheme()`/`isDarkMode` (M10)
7. Add `h-dvh` + safe-area insets (H7)
8. Extract drill hooks following MemoryHunt pattern (M18)

### Sprint 3: Adventure Stabilization (2-3 days)
1. Replace 432 raw `motion.*` with `AdaptiveMotion` (H9)
2. Wire 4 dead Word Forge upgrades (H13)
3. Fix `as any` casts — extend `PlayerProgression` type (H12, M19)
4. Fix memory leaks: bare `setTimeout` refs (M22, M23)
5. Validate adventure `stars` server-side (H4)
6. Use atomic SQL increments for progression (H5)
7. Split `AdventureGame.tsx` (815→<500 lines) (M18)

### Sprint 4: Performance & Polish (1-2 days)
1. Fix Blast batching: consolidate 4 `setState` into `useReducer` (M21)
2. Fix `useDailyConfetti` RAF leak (M24)
3. Memoize grid tiles as `<GridCell>` sub-component (M25)
4. Virtualize `DailyLeaderboard` (M26)
5. Dynamic import `CreateRoomModal`/`JoinRoomModal` (bundle split)
6. Remove orphaned Blast imports (M7)

### Sprint 5: Game Design Enhancements (2-3 days)
1. Add "words missed" post-game reveal to Classic (M2)
2. Remove Daily streak cap at 7 days — add 30/100 day milestones (M3)
3. Add Drill → Profile XP pipeline (M4)
4. Multiply base scores by 10 for perceived value (M1)
5. UGC browse/discovery page (M5)
6. Mount orphaned Blast components (M7)

### Future: Strategic Features
- Ranked/ELO matchmaking system (M6)
- Unified currency system (H14)
- Education: wire spaced repetition to DB
- Blast: persistent wave saves (M8)
- Web Worker for `hasValidWords` (M27)

---

## Issue Counts by Severity

| Severity | Count |
|----------|-------|
| CRITICAL | 5 |
| HIGH | 14 |
| MEDIUM | 33 |
| **Total** | **52** |

## Issue Counts by Category

| Category | CRITICAL | HIGH | MEDIUM | Total |
|----------|----------|------|--------|-------|
| Backend/Security | 2 | 5 | 5 | 12 |
| UX/UI/a11y | 2 | 3 | 5 | 10 |
| Code Quality | 0 | 3 | 6 | 9 |
| Performance | 0 | 1 | 8 | 9 |
| Game Design | 1 | 2 | 9 | 12 |
| **Total** | **5** | **14** | **33** | **52** |
