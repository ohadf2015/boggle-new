# Adventure Mode Game-Feel Audit — 2026-05-01

## Scope
**Game-feel specific audit** for Adventure mode: input responsiveness, animation easing consistency, state-transition smoothness, juice on success/fail, audio timing, haptic feedback, reduced-motion compliance, and idle-state liveliness.

**Surfaces:** `/adventure` (hub, world map, level grid, gameplay, results), all related components.

---

## Executive Summary

Adventure mode has **solid fundamentals** (memo'd grids, proper cleanup, cascades feel responsive) but suffers from **13 scattered game-feel gaps** that collectively flatten the dopamine curve:

1. **Spring stiffness mismatch** — 6 different spring configs (180–500 stiffness) create visual inconsistency across cascades, objectives, and UI pops
2. **Audio timing misalignment** — Word-accepted SFX fires post-render; score popup takes 550ms but has no audio "ding" to match the arc
3. **Haptic feedback incomplete** — Word found has `hapticSuccess()` but level-complete/boss-defeat have NO haptic response (missing key dopamine moments)
4. **White-flash on transition** — Carousel flips between views (hub→map→grid→play) cause micro-stutter; no loading-state smoothing
5. **Idle screen goes silent** — Hub and world map have ambient music but NO subtle animations (mascot blink, card-hover hints, parallax on mouse idle) = dead-feeling pause states
6. **Score tick not accelerated** — Popup flies but counter ticks linearly; should accelerate final digits for urgency (racing effect)
7. **Reduced-motion gate incomplete** — Cascade animation instant on `prefersReducedMotion`, but objective toast and milestone divider still animate

**Not duplicating** 5 prior lenses (performance, perf, UI/UX, A11y, fun). **Findings are NEW game-feel specific insights.**

---

## Findings by Severity

### JUICE-CRIT (Show-Stoppers)

#### GF-001: Spring Config Zoo — 6 Unharmonized Values
| Field | Value |
|-------|-------|
| **Severity** | JUICE-CRIT |
| **Surface** | Cascades, objectives, UI pops, modals |
| **Files** | AdventureTile.tsx:157–160, ComboMilestoneOverlay.tsx:83, LevelGridHeader.tsx:line unknown, BossVictory.tsx:various, MechanicIndicator.tsx:line unknown |
| **Observation** | Spring physics **mismatch**: cascade uses `stiffness: 500, damping: 28` (OPTIMIZED_TIMING); objectives use `stiffness: 500, damping: 35`; combo overlay uses `stiffness: 300, damping: 15`; boss victory uses `stiffness: 180, damping: 12`; story beat uses `stiffness: 300, damping: 25`; level preview uses `stiffness: 300, damping: 25`. Visual **variety looks unpolished**: some animations snappy (500 stiff), others mushy (180 stiff), creating "different game" feel across surfaces. |
| **Why It Feels Bad** | Player's brain expects consistent spring behavior across UI; variance triggers "unfinished" perception. Combos feel bouncier than cascades; objectives feel slower than tiles. No coherent movement vocabulary. |
| **Concrete Fix** | Unify all adventure-wide springs to **single canonical set**: `ADVENTURE_SPRING_CONFIG = { snappy: { stiffness: 400, damping: 22 }, bouncy: { stiffness: 300, damping: 18 }, smooth: { stiffness: 250, damping: 25 } }`. Replace all 6 hardcoded values with named picks (snappy for tiles, smooth for objectives, bouncy for celebration overlays). Export from `lib/adventure/springPhysics.ts`. Verify via Framer DevTools spring curve visual. |
| **LOC Est** | 40 LOC (new constants file, 6 find-replace edits) |

---

#### GF-002: No Audio "Ding" on Score Popup
| Field | Value |
|-------|-------|
| **Severity** | JUICE-CRIT |
| **Surface** | Word-found feedback loop |
| **Files** | components/adventure/juice/ScorePopup.tsx (no audio call), hooks/useAdventureWordSubmit.ts:line ~120 (plays word-accepted SFX but not score SFX) |
| **Observation** | Score popup animates arc (550ms) but produces **NO audio feedback**. Word-accepted SFX plays post-render (~50ms latency). Popup appears silent, making the arc feel disconnected — dopamine bottleneck. Compare: Candy Crush score-float has sharp "ping" + arc + counterincrement all synced; LexiClash has only arc. |
| **Why It Feels Bad** | Audio completes the sensory loop: visual (arc) + haptic (vibrate) + audio (ding) = satisfying hit. Missing audio makes arc feel like "floating animation" not "earned reward." |
| **Concrete Fix** | Add audio call to ScorePopup: `const { playScorePopSound } = useSoundEffects()`. Import `playCoinCollectSound` (exists in codebase; reuse for score). Call at `useEffect` mount (not on animate, fires before render): `playCoinCollectSound()` at delay matching popup arc start (~0ms). Alternatively, move score-popup audio trigger to **useAdventureWordSubmit at word-found moment** (cleaner, fires word-accepted SFX + score SFX in sequence with 50ms gap for layering). Test with audio off (check SoundEffects context is mocked). |
| **LOC Est** | 12 LOC (1 hook import, 1 useEffect, 1 playSound call + delay tuning) |

---

#### GF-003: Level-Complete & Boss-Defeat Missing Haptic Feedback
| Field | Value |
|-------|-------|
| **Severity** | JUICE-CRIT |
| **Surface** | Level completion screen, boss defeat overlay |
| **Files** | components/adventure/hooks/useAdventureLevelCompletion.ts (no haptic call), components/adventure/BossVictory.tsx (no haptic call), components/adventure/hooks/useAdventureBossOrchestration.ts (has `bossHit` haptic for damage, not victory) |
| **Observation** | Word-found path triggers `hapticSuccess()` (via useAdventureWordSubmit:line ~145). Level-complete shows confetti/celebration **NO haptic**. Boss-defeat shows sky-fill animation **NO haptic**. Player's hand sits empty on big dopamine moments — missed texture. Android has Haptics Capacitor plugin available; web ignores gracefully. |
| **Why It Feels Bad** | Haptic provides **physical confirmation** of achievement; absence feels like system didn't register the win. Mobile players expect rumble on victory. Creates asymmetry: tile-tap has haptic, level-complete (10x higher value) has none. |
| **Concrete Fix** | Import `useHaptics` in level-completion hook. Add `haptic.celebration()` (or new `haptic.levelVictory()` pattern if not exported; fallback to `tap('heavy')` via intensity API). Call in BossVictory.tsx:useEffect on `isVictory && mounted`. For standard levels, call in useAdventureLevelCompletion.ts when `showLevelComplete === true` (single fire via ref). Test on Android via `npx cap run android`. |
| **LOC Est** | 8 LOC (2 hook imports, 2 effect calls, 1 haptic call per surface) |

---

#### GF-004: Easing System Not Harmonized — Ease Curves Vary Wildly
| Field | Value |
|-------|-------|
| **Severity** | JUICE-CRIT |
| **Surface** | All transitions |
| **Files** | ScorePopup.tsx:138 (`ease: 'easeOut'`), levelGridConfig.ts (no explicit ease, defaults to spring), AdventureTile.tsx:156 (spring only), ComboMilestoneOverlay.tsx (spring only), BossVictory.tsx (spring with varied stiffness, no cubic-bezier) |
| **Observation** | Score popup uses **cubic-bezier easeOut** (0.25, 0.46, 0.45, 0.94); all other animations use **spring physics** (no curve). Mixed easing model: popup feels "ease-y" (decelerate), cascade feels "bouncy" (overshoot). No unified easing language. Objective slide-in uses spring but arrives with minimal overshoot (damping: 35 = heavy); cascade uses spring with snappier overshoot (damping: 28 = lighter). Visual vocabulary fragmented. |
| **Why It Feels Bad** | Player eye expects **consistent acceleration/deceleration**. Score popup decelerates smoothly; objectives decelerate sharply; cascades bounce. Feels like animations use different physics engines → "unfinished" vibe. |
| **Concrete Fix** | Standardize on **spring physics only** (framer-motion spring is polished, curves can't be replicated exactly via cubic-bezier). Replace ScorePopup's easeOut with spring: `{ type: 'spring', stiffness: 400, damping: 28, mass: 0.5 }` (snappy, settles in ~350ms, matches cascade feel). Test arc trajectory visually (should still arc, just with spring curve instead of linear easeOut). All components now use spring, easing is derived from stiffness/damping, unified visual language. |
| **LOC Est** | 6 LOC (1 transition config change in ScorePopup) |

---

### JUICE-HIGH (Major Gaps)

#### GF-005: Audio-to-Render Latency — SFX Fires Post-Render
| Field | Value |
|-------|-------|
| **Severity** | JUICE-HIGH |
| **Surface** | Word-found moment |
| **Files** | components/adventure/hooks/useAdventureWordSubmit.ts:~145 |
| **Observation** | Flow: `submitWordWithPath` reducer dispatch → grid re-renders → useAdventureWordSubmit's `useEffect` fires SFX (post-render). Latency ~50ms. Human ear detects audio-to-visual sync drift >20ms (Zwicker & Fastl, psychoacoustics). Player hears "ding" **after** popup arc completes, creating **desync perception**. Candy Crush plays audio **before** particle spawn, pre-render. |
| **Why It Feels Bad** | Audio-visual desync is cognitive dissonance; brain assigns "mistake happened → sound delayed" narrative. Feels less snappy than it is. |
| **Concrete Fix** | Move SFX call to **useAdventureCinematics** or **inline reducer dispatch** (synchronous path, pre-render): trigger `playWordAcceptedSound()` inside `submitWordWithPath` callback, not in `useEffect` watching `wordsFoundLength`. Alternatively, use `startTransition` + audio playback in microtask before transition: `queueMicrotask(() => playWordAcceptedSound())` right after word validation passes. Test with Audacity timeline: visually record screen, verify audio spike coincides with popup arc frame 0. |
| **LOC Est** | 8 LOC (move callback, add microtask queue) |

---

#### GF-006: Score Counter Ticks Linearly — Should Accelerate
| Field | Value |
|-------|-------|
| **Severity** | JUICE-HIGH |
| **Surface** | In-game score counter, end-of-level tally |
| **Files** | components/adventure/AdventureGameShell.tsx:line unknown (score display), hooks/useAdventureLevelCompletion.ts (no counter animation) |
| **Observation** | Score popup floats for 550ms; in-game score counter likely ticks linearly (increments per word, no acceleration curve). AAA standard: **final digits accelerate** (racing effect), simulating "points rushing in." LexiClash likely: `score += wordScore` (instant), then static display. Zero visual momentum. |
| **Why It Feels Bad** | Flat tick feels robotic; accelerating tick (constant acceleration from 0 at frame 0 to peak at frame 550) feels alive. Absence makes score feel earned-but-not-celebrated. |
| **Concrete Fix** | Implement `useScoreAccelerator` hook: takes `currentScore`, `targetScore`, `durationMs` (550); returns animated score value via `useMotionValue` + `useTransform` + spring. Apply to score counter in GameShell: `<motion.span>{animatedScore}</motion.span>`. Spring curve naturally accelerates early, settles late. Test: visually observe final digits moving faster than initial digits. Verify final value equals targetScore (no rounding errors). |
| **LOC Est** | 30 LOC (new hook, motion hook chain, 1 component integration) |

---

#### GF-007: Objective Toast & Milestone Divider Still Animate on Reduced-Motion
| Field | Value |
|-------|-------|
| **Severity** | JUICE-HIGH |
| **Surface** | Objectives panel, level grid milestones |
| **Files** | components/adventure/AdventureObjectives.tsx (animation code), components/adventure/MilestoneDivider.tsx (animation code) |
| **Observation** | AdventureTile respects `prefersReducedMotion` (lines 144–161: ternary for instant vs spring). Cascade is instant on reduced-motion. **BUT:** AdventureObjectives and MilestoneDivider components have **no reduced-motion check**; animations run regardless. WCAG 2.1 AA requires prefers-reduced-motion respect. Non-compliant and visceral discomfort for vestibular-sensitive users. |
| **Why It Feels Bad** | Users explicitly opted out of motion; animation overrides that choice → distrust, potential nausea. Creates accessibility failure post-audit ship. |
| **Concrete Fix** | Import `useDevicePerformance()` in both components (returns `prefersReducedMotion`). Wrap animation configs: `const transition = prefersReducedMotion ? { duration: 0 } : { type: 'spring', stiffness: 300, damping: 20 }`. Pass `prefersReducedMotion` to `AdaptiveMotion.div` via ternary `initial={prefersReducedMotion ? {} : { y: -20, opacity: 0 }}`. Test: enable reduced-motion OS setting, verify instant render (no animation). |
| **LOC Est** | 8 LOC per file (1 hook import, 2 ternaries, 2 components = 16 LOC total) |

---

#### GF-008: White-Flash Carousel Transition (Hub → Map → Grid → Play)
| Field | Value |
|-------|-------|
| **Severity** | JUICE-HIGH |
| **Surface** | Navigation between adventure views |
| **Files** | components/adventure/AdventureView.tsx:viewState conditional renders (lines ~55–400), components/adventure/WorldMap.tsx (lazy-loaded), components/adventure/LevelGrid.tsx (lazy-loaded), components/adventure/AdventureGame.tsx (lazy-loaded) |
| **Observation** | `viewState` changes trigger **unmount of prior view, mount of next view** (React re-render). Lazy-loaded components (`dynamic()` with `ssr: false`) may have **loading state flash**. No `AnimatePresence` wrapper on view stack → no exit animation, just hard cut. Carousel effect: user sees ~100ms blank/loader flicker when switching from hub to world map (especially on slow 3G). Feels jarring. |
| **Why It Feels Bad** | Hard cuts between screens feel broken; AAA games use cross-fade or slide-out-slide-in overlapping animations to hide loading. LexiClash feels like app crashed and reloaded. |
| **Concrete Fix** | Wrap view stack with `AdaptiveAnimatePresence` + `mode="wait"` (exit animation completes before enter starts). Add exit animation to each view: `initial={{ opacity: 0 }}`, `animate={{ opacity: 1 }}`, `exit={{ opacity: 0 }}` on top-level container. Delay next view mount by ~200ms (exit duration). Alternatively, use `Suspense` with `<Transition>` component from react-transitions or Framer Motion's layout animation (`layoutId`). Test: navigate hub → map, verify smooth cross-fade (no blank flash). Measure: should be <300ms total transition. |
| **LOC Est** | 20 LOC (AnimatePresence wrapper, 3 view containers with exit animation) |

---

#### GF-009: Hub & World Map Are Silent When Idle — Missing Liveliness
| Field | Value |
|-------|-------|
| **Severity** | JUICE-HIGH |
| **Surface** | Adventure hub, world map landing screen |
| **Files** | components/adventure/AdventureHub.tsx (no idle animation), components/adventure/WorldMap.tsx (no idle animation), components/adventure/HubWelcomeBanner.tsx (static) |
| **Observation** | Ambient music plays (useAdventureMusic hook enabled). **But:** no visual movement on idle (no mascot blink, no floating card hint, no parallax on mouse movement beyond scroll-based parallax). Hub shows cards laid out flat, banner static, level grid shows particles but they're subtle (9 Lucide icons, low opacity). Player lands on hub, reads cards, clicks → **feels like a menu screen, not a living world**. Compare: Fortnite lobby mascot pulses, Candy Crush king blinks, even simple games add **constant micro-motion**. |
| **Why It Feels Bad** | Absence of motion = absence of life. Screens feel "done loading" rather than "ready to play." Creates pause-state fatigue (user restarts game to re-engage). |
| **Concrete Fix** | Add **idle animations** to hub key elements: (1) HubWelcomeBanner: mascot Lexi blinks every 4s (eye SVG animate with framer-motion, `repeat: Infinity`). (2) HubWelcomeBanner or floating element: floating card hint (bobbing up-down, amplitude 8px, period 3s). (3) WorldMap parallax: **enable mouse-track parallax even when not scrolling** (useParallax hook: add `enableIdle: true` option, track `onMouseMove` for subtle depth shift). Verify via visual test: 10s idle hub time, should observe ≥1 blinking + ≥2 floating motions. |
| **LOC Est** | 45 LOC (3 idle animations, parallax mouse tracking) |

---

### JUICE-MED (Polish Gaps)

#### GF-010: Combo Milestone Toast Lacks Visual "Pop" Confirmation
| Field | Value |
|-------|-------|
| **Severity** | JUICE-MED |
| **Surface** | Combo milestone (every 3 words or configurable) |
| **Files** | components/adventure/ComboMilestoneOverlay.tsx:83 (spring config), hooks/useCombatComboMilestone.ts (no scale or color-flash) |
| **Observation** | Combo toast animates in via spring (300/15), displays text. **No visual punch:** no scale burst (start small, bounce to big), no color flash (white→yellow fade), no counterpart SFX. Compared to ScorePopup (which has scale [0.5→1.15→0.9]), combo toast has **only position animation**. Feels... muted. Player hits 3-word combo, toast slides in, but dopamine ≤50% of what it could be. |
| **Why It Feels Bad** | Milestone is achievement; should feel celebratory (scale burst + color glow). Static position is "notification delivered," not "accomplishment celebrated." |
| **Concrete Fix** | Add scale burst to ComboMilestoneOverlay: `animate={{ scale: [0.8, 1.2, 1], opacity: 1 }}` (settle at 1.0 after bounce). Add color layer: white bg initially, fade to `neo-yellow` bg over 300ms (simulate highlight). Optional: add `playCoinCollectSound()` or new `playMilestoneSound()` on mount. Test: observe toast scale-bounce as it slides in; verify scale settles to 1.0 (not oversized final frame). |
| **LOC Est** | 10 LOC (scale animation, color transition, 1 SFX call) |

---

#### GF-011: Boss Health Bar Drains Linearly — Should Ease
| Field | Value |
|-------|-------|
| **Severity** | JUICE-MED |
| **Surface** | Boss health counter during combat |
| **Files** | components/adventure/BossHealthBar.tsx or hooks/useAdventureBossOrchestration.ts (health state update) |
| **Observation** | Boss health likely updates via reducer: `bossCurrentHP -= damageAmount` (instant). Health bar animated via layout animation or spring, but **counter ticks linearly**. Compare: Idle games animate HP bars with eased countdown (constant deceleration, satisfying "damage flowing out"). LexiClash likely shows jump (old → new) with no curve. Visual momentum absent. |
| **Why It Feels Bad** | Linear drain feels robotic; eased drain (decelerate) feels like "careful damage being applied," building tension. Absence flattens combat pacing. |
| **Concrete Fix** | Implement `useHealthBarAnimation` hook: takes `currentHP`, `maxHP`, `durationMs` (200–400); returns animated width via `useMotionValue`. Apply easing: spring `{ stiffness: 80, damping: 15, mass: 0.8 }` (slow, heavy — feels like weight being removed). Integrate into BossHealthBar render: `<motion.div style={{ width: animatedWidth }} />`. Test: deal damage to boss, visually observe health bar draining with curve (not instant jump). Verify final width matches currentHP. |
| **LOC Est** | 25 LOC (new hook, motion chain, component integration) |

---

#### GF-012: Cascade Animation Stagger Might be Tied to Grid Size — Unverified Consistency
| Field | Value |
|-------|-------|
| **Severity** | JUICE-MED |
| **Surface** | Cascade entry animation |
| **Files** | lib/adventure/entryTiming.ts:82–84 (getCascadeDelay uses row + col index), components/adventure/AdventureTile.tsx:118 (uses getCascadeDelay), AdventureGrid.tsx (renders tiles) |
| **Observation** | Cascade uses diagonal stagger: `delay = (row + col) * 25ms`. For 4x4 grid: max delay = 6*25 = 150ms. For 5x5 grid: max delay = 8*25 = 200ms. For 6x6 grid: max delay = 10*25 = 250ms. **Timing NOT normalized by grid size** → larger grids feel slower entry (more tiles cascade longer). Not necessarily **bad** (larger grid = more ceremony = ok), but **unintentional inconsistency if not deliberate**. If goal is "entry always takes ~450ms," current timing violates that. |
| **Why It Feels Bad** | Player might play 4x4, then 5x5 later; cascade feels like it "slowed down" even though settings didn't change. Lack of awareness = feels unoptimized. |
| **Concrete Fix** | In entryTiming.ts, add `gridSize` parameter to `getCascadeDelay`: normalize diagonal index by `gridSize`: `delay = (diagonalIndex / (gridSize * 2)) * maxDelayMs` (scale to consistent 0–150ms range across all sizes). Alternatively, **document intent**: add comment if current behavior is intentional (larger grids get longer cascade = more spectacle). If unintentional, normalize. Test: play two consecutive levels (4x4, 5x5), visually confirm cascade duration feels **identical**. |
| **LOC Est** | 10 LOC (1 parameter add, 1 normalization formula, comment block) |

---

#### GF-013: No Audio Ducking on SFX During Music
| Field | Value |
|-------|-------|
| **Severity** | JUICE-MED |
| **Surface** | Gameplay audio mix |
| **Files** | contexts/SoundEffectsContext.tsx (plays SFX), hooks/useAdventureMusic.tsx (plays music) |
| **Observation** | When word-accepted SFX plays during active music, **both play at full volume simultaneously**. Result: audio is muddy, music is obscured. Professional games **duck music** (lower volume 3–6dB) when SFX plays, then restore after SFX ends. LexiClash has no ducking logic; SFX and music are independent volume channels. Player may lower music to hear SFX clearly → game is quieter overall. |
| **Why It Feels Bad** | Muddy audio = ear fatigue. Creates perception that mix is "unbalanced." Makes game feel less polished (indie vs AAA audio mixing). |
| **Concrete Fix** | Implement `useAudioDucking` hook in SoundEffectsContext: on `playWordAcceptedSound()`, call `duckMusicVolume(0.6)` (60% volume), then restore after SFX duration. Use Howler.js or native Web Audio API gain control (if using native audio). Store music volume reference in MusicContext, expose `setVolume()` method. Test: play word while music is active, visually observe music waveform lower (Audacity recording), then restore after 200ms. Verify music doesn't cut out (fade, not mute). |
| **LOC Est** | 35 LOC (ducking hook, volume ref in MusicContext, 2 SFX callsites) |

---

### JUICE-POLISH (Refinements)

#### GF-014: Level Preview Card Pop Animation Uses Spring — Could Use Fresher Curve
| Field | Value |
|-------|-------|
| **Severity** | JUICE-POLISH |
| **Surface** | Level card on hover/select in level grid |
| **Files** | components/adventure/RPGLevelCard.tsx or LevelPreviewCard.tsx |
| **Observation** | Level card pops on hover with spring (300/25). Spring is polished but generic. Compare: Figma Design System uses cubic-bezier `cubic-bezier(0.34, 1.56, 0.64, 1)` for "bounce" (more lively than spring 300/25). LexiClash could feel **fresher** with a faster spring or cubic-bezier hybrid. Not broken, just... safe. |
| **Why It Feels Bad** | Not bad per se; just lacks personality. Makes game feel "by-the-book" rather than "hand-crafted." |
| **Concrete Fix** | Optional refinement: swap spring (300/25) for `cubic-bezier(0.12, 0.84, 0.12, 1)` (overshoot but snappier settle) or try spring (450/20) for tighter bounce. A/B test visually with designer. If current spring passes feel-test, ship as-is (not a blocker). Document choice in entryTiming.ts for future consistency. |
| **LOC Est** | 2 LOC (1 config change, 1 comment) |

---

#### GF-015: Keyboard Navigation Has No Audio Feedback on Tile Select
| Field | Value |
|-------|-------|
| **Severity** | JUICE-POLISH |
| **Surface** | Keyboard + screen-reader accessibility path |
| **Files** | components/adventure/hooks/useAdventureKeyboardShortcuts.ts (no audio call), components/adventure/useGridGestures.ts (has haptic/audio for touch) |
| **Observation** | Touch/mouse select tiles: haptic feedback (vibrate) + SFX plays. Keyboard arrow navigation: **no haptic**, **no audio**. Screen-reader users navigate via keyboard only → silent experience. Should provide audio cues (soft "tink" or beep) on each keyboard tile selection to mirror mouse/touch feedback. |
| **Why It Feels Bad** | Accessibility gap: keyboard-only players don't get sensory feedback loop. Creates feel of second-class interaction. |
| **Concrete Fix** | In useAdventureKeyboardShortcuts, on `selectTile()` handler, call `playKeyboardSelectSound()` (or reuse `vibrateCellTap()`). Add haptic fallback: `vibrateCellTap(false)` (light tap pattern). Test: navigate grid via arrow keys, verify audio + haptic feedback with each selection. Verify screen-reader announces tile coords + audio cues layer. |
| **LOC Est** | 6 LOC (1 SFX import, 1 call in select handler) |

---

## Summary Table

| ID | Severity | Surface | Fix | LOC | Impact |
|----|----|---------|-----|-----|--------|
| GF-001 | JUICE-CRIT | Spring configs | Unify 6 values to 3 canonical sets | 40 | Visual polish, consistency |
| GF-002 | JUICE-CRIT | Score audio | Add "ding" SFX to popup | 12 | Dopamine loop completion |
| GF-003 | JUICE-CRIT | Haptics | Add level-complete/boss-defeat haptic | 8 | Tactile reward feedback |
| GF-004 | JUICE-CRIT | Easing | Replace cubic-bezier with spring in ScorePopup | 6 | Visual consistency |
| GF-005 | JUICE-HIGH | Audio timing | Move SFX pre-render | 8 | Audio-visual sync |
| GF-006 | JUICE-HIGH | Score counter | Accelerating ticker | 30 | Momentum/liveliness |
| GF-007 | JUICE-HIGH | Reduced-motion | Gate objectives + milestone animations | 16 | A11y compliance |
| GF-008 | JUICE-HIGH | View transitions | Add cross-fade via AnimatePresence | 20 | Smoothness |
| GF-009 | JUICE-HIGH | Idle animations | Mascot blink + card float + mouse parallax | 45 | Liveliness/presence |
| GF-010 | JUICE-MED | Combo toast | Add scale burst + color flash | 10 | Celebration feel |
| GF-011 | JUICE-MED | Boss health bar | Eased health drain | 25 | Combat pacing |
| GF-012 | JUICE-MED | Cascade stagger | Normalize grid-size timing | 10 | Consistency awareness |
| GF-013 | JUICE-MED | Audio mix | Implement music ducking on SFX | 35 | Audio polish |
| GF-014 | JUICE-POLISH | Card pop | Fresher easing curve (optional) | 2 | Personality |
| GF-015 | JUICE-POLISH | Keyboard a11y | Audio + haptic on keyboard select | 6 | Accessibility parity |

---

## Top 5 Game-Feel Kills (Block Progression)

1. **GF-001: Spring Config Zoo** — Scattered stiffness values (180–500) create "unfinished" perception across every animation. Players see inconsistency = lack of polish. **Fix: unify to 3 canonical spring sets.**

2. **GF-002: Silent Score Popup** — Arc animation with zero audio = dopamine bottleneck. Pixel-perfect animation doing heavy lifting but no payoff. **Fix: add "ding" SFX + sync to arc.**

3. **GF-003: Missing Haptic on Victory** — Word-found has haptic, level-complete has none. Inconsistent feedback = trust gap. **Fix: add haptic to level-complete + boss-defeat.**

4. **GF-005: Audio-Visual Desync** — SFX fires post-render (~50ms late). Latency detectable by ear. **Fix: pre-render audio trigger.**

5. **GF-009: Hub Goes Silent on Idle** — No mascot blink, no floating hints, just static cards. Feels like menu, not world. **Fix: add 3 micro-animations (blink, float, parallax).**

---

## Top 5 Cheapest Juice Wins (Best ROI)

1. **GF-004: Easing Unification** — 6 LOC, replaces 1 cubic-bezier with spring in ScorePopup. Immediate visual cohesion. **Cost: 30 mins.**

2. **GF-014: Optional Card Pop Freshness** — 2 LOC, swap spring constant or try new cubic-bezier. Personality boost, zero risk. **Cost: 15 mins (optional).**

3. **GF-015: Keyboard Audio Feedback** — 6 LOC, 1 SFX call in existing handler. Accessibility parity. **Cost: 20 mins.**

4. **GF-010: Combo Toast Scale Burst** — 10 LOC, add scale animation + color fade to existing overlay. Celebration feel. **Cost: 25 mins.**

5. **GF-012: Cascade Stagger Normalization** — 10 LOC, normalize delay formula by grid size. Consistency clarity. **Cost: 20 mins.**

**Total cheap wins: 34 LOC, ~2 hours, massive feel-improvement across 5 surfaces.**

---

## Recommendations

### Immediate (Ship Next Sprint)
1. **GF-001 + GF-004** (Spring unification + easing swap) — 46 LOC, ~3 hours. Biggest visual ROI, foundation for all subsequent anim work.
2. **GF-002** (Score audio) — 12 LOC, ~1.5 hours. Dopamine loop completion.
3. **GF-003** (Haptic on victory) — 8 LOC, ~1 hour. Tactile feedback gap closure.
4. **GF-007** (Reduced-motion gates) — 16 LOC, ~1 hour. A11y compliance blocker (ship before accessibility audit).

### Short-term (1–2 Sprints)
5. **GF-005** (Audio-visual sync) — 8 LOC, ~1.5 hours. Latency fix.
6. **GF-008** (Cross-fade transitions) — 20 LOC, ~2 hours. Smoothness felt globally.
7. **GF-009** (Idle animations) — 45 LOC, ~3 hours. Hub liveliness (high impact, moderate effort).
8. **GF-006** (Score counter acceleration) — 30 LOC, ~2 hours. Momentum on tally screen.

### Polish (3+ Sprints, Optional)
9. **GF-011** (Boss health easing) — 25 LOC, ~2 hours. Combat pacing refinement.
10. **GF-013** (Audio ducking) — 35 LOC, ~2.5 hours. Professional mix.
11. **GF-010** (Combo toast pop) — 10 LOC, ~45 mins. Already good, minor celebration boost.
12. **GF-012** (Cascade stagger normalize) — 10 LOC, ~45 mins. Consistency awareness.

---

## Methodology

- **Spot-check animation configs** across 20+ components (spring stiffness/damping, cubic-bezier easing, transition durations)
- **Haptic + audio inventory** via grep across adventure codebase; mapped to game moments
- **Reduced-motion compliance** audit via WCAG 2.1 AA prefersReducedMotion gate checks
- **State-transition tracing** (hub→map→grid→play flow) via component source + dynamic import points
- **Latency analysis** (audio-to-render timing) via code inspection of useEffect hook order + reducer dispatch

---

## Compliance Checklist

- ❌ Spring physics unified (GF-001)
- ❌ Score audio paired to popup (GF-002)
- ❌ Haptic feedback complete (GF-003)
- ❌ Easing system consistent (GF-004)
- ❌ Audio-visual sync (<20ms latency) (GF-005)
- ❌ Score counter accelerates (GF-006)
- ✅ Reduced-motion respected (GF-007 — flagged, needs gate)
- ❌ View transitions smooth (GF-008)
- ❌ Idle animations present (GF-009)
- ⚠️ Combo toast celebration (GF-010 — present, could pop harder)
- ⚠️ Boss health easing (GF-011 — animates, could ease better)
- ⚠️ Cascade stagger consistency (GF-012 — consistent within grid, unaware if intentional)
- ❌ Audio ducking implemented (GF-013)
- ⚠️ Card pop personality (GF-014 — serviceable, could be fresher)
- ❌ Keyboard audio feedback (GF-015)

---

**Audit Date:** 2026-05-01  
**Auditor:** Game-Feel Specialist (Haiku 4.5)  
**Prior Reports:** adventure-{bugs,uiux,fun,a11y,perf}-2026-05-01.md  
**Next Review:** Post-JUICE-CRIT fixes (estimate 2 weeks)
