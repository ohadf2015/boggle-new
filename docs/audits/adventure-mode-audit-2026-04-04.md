# Adventure Mode 5-Expert Audit — 2026-04-04

## Executive Summary

5 expert agents audited Adventure Mode across Game Design, UX/UI, Engagement/Retention, Performance, and Playability (Fun Factor). **Total: ~100 findings** (11 CRITICAL, 25 HIGH, 40 MEDIUM, 24 LOW).

The mode has strong foundations — 10 themed worlds, boss fights with personality, flash challenges, an upgrade shop, weekly challenges, and endless mode. However, several critical systems are **configured but not wired** (ascension, world mechanics, W10 boss phases, collectibles), and the new-player experience has no tutorial. Boss HP math is broken (one-shottable), XP progression is unreachable, and 6+ files bypass reduced-motion accessibility.

---

## CRITICAL Findings (11)

### Game Design
| # | Finding | Impact |
|---|---------|--------|
| GD-C1 | **Boss HP trivially low** — W1 boss has 30 HP, one word scoring 30 kills it instantly. Code uses raw score as damage but comment says `ceil(score/3)`. | Every early boss is one-shottable |
| GD-C2 | **W10 boss 9-phase rotation is dead code** — `phaseOrder` array in bossConfig never consumed by useAdventureBossNew. Final boss fights identically to all others. | Climactic fight is flat |
| GD-C3 | **XP curve unreachable** — Max level 50 needs ~76K XP. Completing all 70 levels earns ~5.3K XP (~7%). XP doesn't scale with world number. | Progression bar barely moves |

### UX/UI
| # | Finding | Impact |
|---|---------|--------|
| UX-C1 | **Hardcoded "Loading adventure..." string** — `PageClient.tsx` bypasses i18n | English shown to all locales |
| UX-C2 | **Back button icon-only on mobile, no aria-label** — `AdventureViewHeader.tsx` | Invisible to screen readers |
| UX-C3 | **Error state emoji announced by screen readers** — Missing `aria-hidden` | Noise for assistive tech users |
| UX-C4 | **Currency aria-label hardcodes "gold" in English** — `CurrencyDisplay.tsx` | Mixed-language screen reader output |
| UX-C5 | **AdventureHub uses raw framer-motion, no reduced-motion** — WCAG 2.3 violation | Vestibular disorder trigger |

### Engagement
| # | Finding | Impact |
|---|---------|--------|
| EN-C1 | **No push notifications** — Streak system tracks 36h grace window but has zero re-engagement triggers | Streak mechanic is inert |
| EN-C2 | **Ghost Rival not wired into adventure** — `useGhostRival` exists for MP but not imported in any adventure component | Weekly leaderboard is passive |

### Performance
| # | Finding | Impact |
|---|---------|--------|
| PF-C1 | **Memory leak: untracked setTimeout in handleHintClick** — `AdventureGame.tsx:503`, fires on unmounted component | setState on unmounted component |

---

## HIGH Findings (25)

### Game Design (6)
| # | Finding | File/Config |
|---|---------|-------------|
| GD-H1 | Timer values inconsistent with grid complexity — W3 gives MORE time/tile than W2 | `constants.ts:227-238` |
| GD-H2 | Ice tile count formula creates impossible levels (8 ice on 5x5 = 32%) | `levelConfig.ts:654` |
| GD-H3 | Star requirements uneven — W2→W3 jump from 1.0 to 2.14 average stars needed | `constants.ts:261-267` |
| GD-H4 | Combo system has no visual/audio countdown for 3s decay | `useAdventureGame.ts:94` |
| GD-H5 | Loot system: only gold is functional, 7 other types are dead ends | `lootGenerator.ts` |
| GD-H6 | World mechanic bonuses (synonym, etymology, etc.) are config-only — not implemented in scoring | `worldMechanics.ts` |

### UX/UI (11)
| # | Finding | File |
|---|---------|------|
| UX-H1 | 6 files use raw framer-motion bypassing reduced-motion | WorldMap, Hub, BossDefeatShareCard, RollingNumber, PremiumCard, WorldMapBackground |
| UX-H2 | Level cards not keyboard navigable — no role/tabIndex/onKeyDown | `RPGLevelCard.tsx` |
| UX-H3 | No unlock requirement shown on locked levels | `RPGLevelCard.tsx` |
| UX-H4 | Title section hidden on mobile — no context about current location | `AdventureViewHeader.tsx` |
| UX-H5 | Loading spinner has no accessible text label | `AdventureView.tsx` |
| UX-H6 | `toLocaleString('en-US')` hardcodes English number formatting | `CurrencyDisplay.tsx` |
| UX-H7 | FlashChallengeToast overlaps header on small screens | `FlashChallengeToast.tsx` |
| UX-H8 | PlayerHealthBar breakpoint mismatch risks overlap | `AdventureGameOverlays.tsx` |
| UX-H9 | No adventure FTUE (first-time user experience) | All adventure components |
| UX-H10 | World themes only defined for W1-3, W4-10 fall back to W1 | `LevelEntryOverlay.tsx` |
| UX-H11 | Boss elapsed timer gives no sense of time pressure | `GameHeader.tsx` |

### Engagement (6)
| # | Finding | Impact |
|---|---------|--------|
| EN-H1 | Daily boss quests impossible for early-game players | `dailyQuests.ts:28-29` |
| EN-H2 | Endless Mode gated behind all 10 worlds — most players never reach it | `endlessMode.ts` |
| EN-H3 | Flash challenge fires only once per level at 30% time — becomes predictable | `useFlashChallenge.ts:76-90` |
| EN-H4 | No visual share card for 3-star level completions | `adventureShare.ts` |
| EN-H5 | Loot chest is fully deterministic — no variable ratio surprise | `lootConfig.ts` |
| EN-H6 | Ascension system fully coded but completely unwired from UI | `ascensionConfig.ts` |

### Performance (7)
| # | Finding | File |
|---|---------|------|
| PF-H1 | `lexiGameState` includes `timeRemaining` — re-render cascade every second | `AdventureGame.tsx:305-308` |
| PF-H2 | `init` object from useAdventureGameInit recreated on any sub-property change | `useAdventureGameInit.ts:195-253` |
| PF-H3 | `boxShadow` animated in framer-motion (non-GPU) on timer + boss overlay | `AdventureTimer.tsx:199-207`, `BossOverlay.tsx:411` |
| PF-H4 | `filter: blur(8px)` during framer-motion scale animation on boss attacks | `BossAttackEffect.tsx:186` |
| PF-H5 | SVG filter ID collision in WorldParticles — `glow-${index}` not unique | `WorldParticles.tsx:148` |
| PF-H6 | Inline arrow function `getPopupStartPosition` recreated every render | `AdventureGame.tsx:329-335` |
| PF-H7 | `EnhancedTimer` non-memoized urgency function called every render | `EnhancedTimer.tsx:101-108` |

### Playtester
| # | Finding | Severity |
|---|---------|----------|
| PT-H1 | **No tutorial exists** — first-session abandonment risk | CRITICAL-equivalent |
| PT-H2 | World mechanic bonuses invisible during play — can't deliberately engage | HIGH |
| PT-H3 | W10 "allMechanics" mechanic likely does nothing in regular levels | HIGH |

---

## MEDIUM Findings (40)

### Game Design (9)
- Boss `gridEffect` attack silently falls back to damage when config incomplete
- Ancient Relic drop uses deterministic seed — same player always/never gets it
- Power-up cooldown always 60s, no upgrade modifies it
- Breather levels applied silently without player awareness
- Objectives degenerate to two types: wordCount and scoreTarget
- Player health in boss fights has no visible recovery path
- Hidden words only on levels 4 and 7 — underutilized mechanic
- `deepDrill` + `wordRadar` stack to 8+ hints per level — trivializes gameplay
- Prestige system is a dead field with no implementation

### UX/UI (15)
- Deprecated `neo-yellow` in 3+ files
- PauseOverlay shows ESC shortcut on touch devices
- RetryAssistModal uses aria-label over aria-labelledby
- Score display overlaps controls on narrow screens
- Power-up buttons have no visible focus ring
- `W{n}·L{n}` label not localized or RTL-safe
- StoryBeatCard dialogueKey may render untranslated
- Boss card `col-span-2` breaks on single-column layouts
- No error boundary around AdventureGame
- Loot chest tier awards "wooden" for 0-star (should it?)
- LevelEntryOverlay skips entirely for reduced-motion users
- Title invisible on mobile (companion to H4)
- No loading state during level save
- Flash challenge description null param renders "null"
- Objective progress aria-label not localized per type

### Engagement (9)
- Weekly modifiers invisible on hub screen
- World mechanics have no first-time tutorial
- Near-miss messages not shown in retry modal
- Word Album has no sharing mechanism
- Streak milestones have no celebrations
- All 10 worlds share identical level structure (7 levels, boss at 7)
- Collectibles invisible — no collection gallery
- NextLevelPreview 3s forced delay breaks flow
- Flash challenges can repeat within same session

### Performance (11)
- `useFlashChallenge` polls at 200ms (5x/sec) — 1000ms sufficient
- Double `getBoundingClientRect()` on score popup target
- WorldParticles injects `<style jsx global>` on every render
- `useCascadeLoop` callback recreated every render
- `cascade` object in useEffect deps without stability guarantee
- `AdventureTimerDisplay` useMemo overhead on simple conditional
- Boss timers not cleaned up on unmount
- ScorePopup reads `window.innerWidth` during render
- Timer separator colon animates infinitely regardless of state
- EnhancedTimer memo wrapper inconsistency
- WorldBackground index/key mismatch risk

---

## LOW Findings (24)

- COMBO_TIMEOUT_MS conflicts between two files (3000 vs 8000)
- `locked` tile type defined but never generated
- `multiplier` tile type defined but never generated
- `collectGems` objective uses gold tiles, naming mismatch
- 3-star difficulty varies wildly with unstable secondary objective count
- Deprecated `neo-orange` in LevelEntryOverlay
- BossArena decorative animations missing `motion-reduce:` guard
- RollingNumber animates without reduced-motion check
- PowerUpButton cooldown shows "0s" at ready state
- Middle-dot separator not marked `aria-hidden`
- LevelGrid chapter dividers have no accessible label
- StoryBeatCard worldId not typed as enum
- WorldParticles imports framer-motion for simple fade
- Weekly modifiers recomputed on mount (not a real issue)
- `window.confirm` used for exit confirmation (blocking, non-accessible)
- `areAnagrams` sorts on every comparison instead of caching
- Multiple useEffect hooks to sync refs in boss hook
- Flash challenge "specific letter Q" can fire when Q not on board

---

## Recommended Sprint Plan

### Sprint 1 — Game-Breaking Fixes (Est. ~2 days)
**Goal**: Fix mechanics that are fundamentally broken
1. Fix boss HP/damage formula (GD-C1) — multiply HP by 3-5x or divide damage
2. Fix XP curve (GD-C3) — add world-based XP scaling or lower max level
3. Fix memory leak (PF-C1) — track setTimeout in existing ref
4. Fix `lexiGameState` timer leak (PF-H1) — remove `timeRemaining` from memo
5. Fix `init` object cascade (PF-H2) — destructure at call site
6. Fix star requirement jump W2→W3 (GD-H3)

### Sprint 2 — Accessibility & i18n (Est. ~2 days)
**Goal**: WCAG compliance and i18n correctness
1. Replace all raw `motion.*` with `AdaptiveMotion.*` (UX-C5, UX-H1) — 6 files
2. Fix hardcoded strings (UX-C1, UX-C4, UX-H6)
3. Add aria-labels (UX-C2, UX-C3, UX-H2, UX-H5)
4. Add keyboard navigation to level cards (UX-H2)
5. Add focus rings to power-up buttons
6. Fix RTL level badge format

### Sprint 3 — Onboarding & Player Experience (Est. ~2 days)
**Goal**: New players can understand and enjoy the game
1. Build FTUE tutorial (UX-H9, PT-H1) — 3-step coach marks using StoryBeatCard
2. Add world mechanic tutorials (EN-M10) — tooltip on first level of each world
3. Show unlock requirements on locked levels (UX-H3)
4. Show mobile title/context (UX-H4)
5. Define world themes for W4-10 (UX-H10)
6. Add combo countdown visual (GD-H4)

### Sprint 4 — Dead Systems Revival (Est. ~3 days)
**Goal**: Wire systems that are built but not connected
1. Wire W10 boss 9-phase rotation (GD-C2)
2. Wire world mechanic scoring bonuses (GD-H6)
3. Wire ascension system to AdventureHub (EN-H6)
4. Wire weekly modifiers display on hub (EN-M9)
5. Wire near-miss messages in retry modal (EN-M11)
6. Wire Ghost Rival into weekly challenge (EN-C2)

### Sprint 5 — Engagement & Retention (Est. ~2 days)
**Goal**: Give players reasons to return and share
1. Filter daily quests by player world (EN-H1) — one-line fix
2. Allow 2-3 flash challenges per level (EN-H3)
3. Add variable loot drops (EN-H5)
4. Add 3-star share card (EN-H4)
5. Add streak milestone celebrations (EN-M13)
6. Add collection gallery to hub (EN-M15)
7. Unlock Endless Mode prologue at W3 (EN-H2)

### Sprint 6 — Performance Polish (Est. ~1 day)
**Goal**: Smooth animations and reduced overhead
1. Replace boxShadow animations with opacity (PF-H3)
2. Remove blur during scale animations (PF-H4)
3. Fix SVG filter ID collision (PF-H5)
4. Wrap `getPopupStartPosition` in useCallback (PF-H6)
5. Reduce flash challenge polling to 1000ms
6. Consolidate double getBoundingClientRect calls
7. Add boss timer cleanup on unmount
8. Move WorldParticles keyframes to CSS file

---

## Key Architecture Observations

### What Works Well
- **AdventureTimerStore** pub/sub isolates per-second re-renders via `useSyncExternalStore`
- **Cinematics** are all `dynamic()` imported — no bundle impact on game load
- **Chapter structure** (2-2-3) with natural boss climax is well-designed
- **Boss personalities** are charming and distinct (Ms. Grammar, Spelling Bee, Lexicon Dragon)
- **Flash challenges** are genuinely fun micro-urgency moments
- **RetryAssistModal** is compassionate UX that prevents rage-quitting
- **Breather levels** at positions 3 and 5 show intentional pacing
- **Vowel-protection** for ice tile placement is a fairness safeguard
- **`sendBeacon` fallback** ensures progress persistence on page unload

### Systemic Issues
1. **Config-but-not-wired** pattern: Ascension, collectibles, world mechanics, W10 phases, weekly modifiers — all richly configured, none surfaced to players
2. **Client-side authority**: All scoring, boss HP, loot drops computed client-side with no server validation — gold farming is feasible
3. **`init` mega-object**: `useAdventureGameInit` aggregates 10+ concerns into one object, causing cascade re-renders on any sub-property change
4. **6 files bypass `AdaptiveMotion`**: Direct framer-motion usage violates the project's reduced-motion pattern

---

## Delight Moments (from Playtester)
- Flash challenges — micro-urgency that makes word games addictive
- Lexicon Dragon boss concept — cycling all 9 mechanics is brilliant if wired
- Word Album — organic social sharing hook
- RetryAssistModal — compassionate failure handling
- Breather levels — intentional pacing valleys
- Boss personalities — charming character concepts
- Mastery aura scaling — subtle "feel powerful" reward
- Story beats after levels 2, 4, 7 — episodic narrative rhythm
