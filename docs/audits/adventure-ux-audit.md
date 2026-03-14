# Adventure Mode UX/UI Audit
**Date**: 2026-03-14
**Auditor**: UI/UX Designer
**Scope**: Adventure mode immersion, emotional engagement, mobile-first experience

---

## Audit Baseline

From reading the codebase directly:

- `WorldMap.tsx`: Trail-based scrollable map, world nodes with `WorldOrbitingLetters`, `TrailPath` SVG connector with animated dot. Worlds auto-scroll to bottom (World 1) on mount. Locked worlds: grayscale + Lock icon. Next world: `neo-lime` badge. Background: starfield, nebulae, shooting stars, parallax gyroscope.
- `LevelGrid.tsx`: 2-5 column grid, `PremiumCard` component with tilt, floating emoji particles, per-world parallax background image. Stars animate in per-level. Difficulty bars shown.
- `WorldMapDecorations.tsx`: `TrailPath` uses SVG `animateMotion` dot traversal (3s loop, reverse direction = World 10 down to 1). `OrbitingLetter` uses CSS custom properties for radius/duration.
- `WorldMapBackground.tsx`: 6 parallax layers (base, Milky Way band, cosmic dust, nebula clouds, shooting stars, starfield). Clouds drift from `WorldMapDecorations.Cloud`.
- No `BossArena`, `AdventureHUD`, `UpgradeShop`, or `SkillTreeView` files found — these are either planned or located elsewhere.

Design system: neo-brutalist, dark-only, `border-3`/`border-4`/`border-neo-thick`, `shadow-hard`, `rounded-neo`, Fredoka + Rubik fonts, Framer Motion + AdaptiveMotion.

---

## 1. World Map Journey Feel

### Current State
The trail works mechanically. World nodes are circular image thumbnails with orbiting letters. The `TrailPath` draws a bezier curve with an animated dot. Fog-of-war is simulated via grayscale + opacity on locked worlds. Scroll direction (bottom = World 1, top = World 10) mirrors a vertical climb but is not communicated visually to new players.

### Problems Identified

**P1 - HIGH: Trail dot travels the wrong direction**
The SVG `animateMotion` uses `keyPoints="1;0"` (reversal), meaning the dot travels from the next world down to the current world. It should travel upward (from completed world toward the locked one) to imply forward momentum and reinforce the "climb" narrative.

**P2 - HIGH: No "You Are Here" presence on the map**
The `isNextWorld` badge is a small `neo-lime` pill in the top-left of the node. There is no distinct visual anchor that orients the player spatially. First-time users must infer which node is theirs.

**P3 - MEDIUM: Locked world fog is binary**
Locked worlds use `grayscale(1) brightness(0.5)` — fully opaque, just desaturated. True fog-of-war would show a silhouette with mystery, hinting at what lies ahead without fully revealing it.

**P4 - MEDIUM: Trail path has no visual history**
Completed trail segments look identical to the current segment. There is no "beaten path" vs "road ahead" visual grammar.

**P5 - LOW: Scroll-to-bottom on mount is jarring**
`bottomRef.current?.scrollIntoView({ behavior: 'smooth' })` fires after 100ms. On slow devices this causes a visible jump. There is no splash orientation moment before the map loads.

### Recommendations

**R1 - "You Are Here" Player Pin**

Place a dedicated player avatar pin on the `nextWorldId` node, rendered above the world button as an absolutely positioned element. The pin should:
- Use the player's `CustomAvatarConfig` fallback chain (customAvatar > avatarImage > default icon).
- Animate: idle breathing scale `[1, 1.06, 1]` on a 2.5s loop with `ease-in-out`.
- Drop a soft shadow circle below it (`w-6 h-2 bg-neo-black/40 rounded-full blur-sm`) to simulate ground contact.
- On first mount, perform a "drop in" spring animation from `y: -30` to `y: 0`.

Wireframe sketch:
```
     [Avatar pin - 48x48 circle, neo-yellow border-3]
            |  (vertical stem 12px tall, border-l-2 border-neo-yellow)
           [ ]  (3px dot anchor)
     [World node button]
```

**R2 - Trail History vs. Future Grammar**

Split the `TrailPath` into two visual states:

| Segment state | Stroke | Glyph | Meaning |
|---|---|---|---|
| Both worlds complete | neo-lime solid, 6px, glow | Footprints emoji every 30px along path | "You walked this" |
| Current-to-next | neo-yellow solid, 4px, animated dot (forward direction) | Arrow chevron at midpoint | "Your path forward" |
| Locked-to-locked | white/12 dashed, 3px | Lock icon at midpoint | "Unexplored" |

Fix `keyPoints` direction: change `keyPoints="1;0"` to `keyPoints="0;1"` so the dot travels upward (World N to World N+1), consistent with the player's forward direction of travel.

**R3 - Fog of War with Silhouette Mystery**

For locked worlds (id > nextWorldId + 1), replace `grayscale(1) brightness(0.5)` with:
- A blurred (`blur-md`) dark overlay at 70% opacity on the world image.
- Show only the world name as `?????` or keep it visible but dim.
- The world's `colorPrimary` glow should be visible at ~15% opacity beneath the fog, hinting at the world's color identity without giving away the image.

For the immediately next locked world (nextWorldId + 1), apply a "preview" state: no grayscale, but add an animated shimmering overlay (`shimmer-sweep` keyframe from left to right, 4s loop, 20% opacity white gradient) to imply "almost there."

**R4 - Scroll Orientation Splash**

On first render, before scrolling to World 1, briefly hold at the top (World 10) for 800ms, showing a `motion.div` overlay with `t('adventure.map.journeyAhead')` text fading in and out. Then scroll to the player's current position (not always the bottom). This gives the player a sense of scale — they see the full summit before being placed at their position.

Implementation note: Replace the `setTimeout(() => bottomRef.current?.scrollIntoView(...), 100)` with a two-phase mount: (1) instant scroll to `nextWorldRef` with no animation, (2) delayed smooth scroll back to `nextWorldRef` after the overlay fades. This removes the visible jump entirely.

---

## 2. Level Completion Celebration

### Current State
Level cards show star icons that animate in (`scale: 0 -> 1, rotate: -180 -> 0`) with staggered delays. `isPerfect` adds a `neo-yellow` crown badge. No loot, no reward sequence, no fanfare beyond standard star animation.

### Problems Identified

**P1 - HIGH: Stars animate on every render, not just on new completion**
The `initial={{ scale: 0, rotate: -180 }}` / `animate={{ scale: 1, rotate: 0 }}` runs every time the component mounts. Replaying old stars with entrance animation is false drama — it trains the player to ignore the animation because it happens even for weeks-old completions.

**P2 - HIGH: No distinction between "first time 3 stars" and "replay 3 stars"**
A player who just got 3 stars for the first time sees the same card state as one revisiting a completed level. The emotional peak moment is lost.

**P3 - MEDIUM: No reward reveal sequence between level exit and map return**
After completing a level, the player presumably sees a results screen, then returns to the level grid. There is no interstitial that bridges completion to progression.

### Recommendations

**R1 - Gate Star Entrance Animation Behind `isNewCompletion` Flag**

Pass a `newlyCompletedLevel?: { world: number; level: number; stars: number }` prop into `LevelGrid`. Only animate the star entrance for that specific card. All other cards should render in their final state immediately (`initial` = final values).

This makes the animation meaningful: it fires once, when it matters.

**R2 - Level Completion Reward Sequence (New Component: `LevelCompleteReveal`)**

Trigger this as a full-screen overlay immediately after a level ends, before returning to the level grid. Duration: ~3 seconds total, skippable by tap anywhere.

Sequence timing:
```
0ms     - Dark overlay fades in (200ms)
200ms   - World-themed particle burst from center (emoji from WORLD_PARTICLES config)
400ms   - Three star slots appear (empty, outlined in neo-white/20)
600ms   - Star 1 flips in with coin-style Y-rotation (400ms), followed by score number increment animation
1000ms  - Star 2 flips in (if earned)
1400ms  - Star 3 flips in (if earned)
1800ms  - XP bar at bottom ticks up from previous value to new value with bounce
2200ms  - If new high score: neo-yellow "NEW BEST!" badge bounces in from top
2600ms  - Chest opens (see R3) or "Continue" button pulses neo-yellow
3000ms  - Auto-advance if player hasn't tapped
```

The star flip uses a CSS `rotateY` keyframe: `0deg -> 90deg (empty) -> 0deg (filled)`, identical to a coin flip. This is a well-understood "reveal" pattern from mobile games (Clash Royale, Candy Crush).

**R3 - Loot Chest for 3-Star Completions**

When a player earns all 3 stars for the first time on a level, show a chest open sequence after the stars reveal:
- Chest uses neo-brutalist aesthetic: flat 2D illustration, `border-4 border-neo-black shadow-hard-lg`, chunky proportions.
- Tap to open: chest lid springs up (rotate `-30deg` spring), coins/gems spray upward using CSS `@keyframes` with individual delays.
- Reward text fades in below: "+50 XP" or "+ Power-up name".

For repeat 3-star completions (already had 3 stars): skip the chest. Show a smaller "+XP" badge instead. This prevents devaluing the chest reveal.

**R4 - "New High Score" Fanfare**

When score exceeds personal best, add above the overlay:
- A marquee-style horizontal `neo-yellow` banner with `t('adventure.newBest')` text, scrolling left-to-right once.
- Behind the banner: brief screen flash (white, 80ms, 30% opacity) simulating a camera flash.
- Neo-brutalist confetti: 12 colored squares (not circles) with `border-2 border-neo-black`, each rotating and falling from random x positions at top.

---

## 3. Boss Battle Atmosphere

### Current State
Boss HP bar and phase indicators exist (referenced in audit brief). Remotion-based cinematics for entrance/defeat at 30fps. No `BossArena.tsx` file found in the codebase — arena may be part of another component or not yet built.

### Recommendations

**R1 - Arena Transition (New: `BossArenaTransition`)**

Before the boss level begins, play a 1.5-second arena entry sequence rather than cutting directly to gameplay:

Phase 1 (0-500ms): Screen wipes to black using a `clip-path: inset(0 0 100% 0)` animation closing downward, with a deep bass rumble (Web Audio API oscillator, 60Hz, 200ms fade-out).

Phase 2 (500-900ms): Arena floor sweeps in from bottom using `translateY(100%) -> translateY(0)` with `ease-out` on a 400ms spring. The arena has the world's `colorPrimary` as a glowing border at the bottom edge.

Phase 3 (900-1500ms): Boss silhouette drops from above (`translateY(-200%)` to `translateY(0)`, spring with overshoot: stiffness 200, damping 12) with screen shake on landing.

Screen shake implementation: apply `translate(x, y)` to the root arena container using a short keyframe sequence: `0px, -4px, 3px, -2px, 1px, 0px` over 300ms. Do NOT use CSS `transform` on the game grid tiles themselves, only the wrapper.

**R2 - Phase Change Dramatic Moments**

When the boss transitions between phases (HP crosses 66% and 33% thresholds):

- Pause the game timer for 1.5 seconds (server-side: extend deadline; client-side: freeze timer animation).
- Full-screen flash in the boss's rage color (`neo-red` at 40% opacity, 100ms).
- Boss sprite shakes using `animate-neo-shake` then transforms: scale up to `1.15` over 200ms, then snap back to `1.0`.
- HP bar changes color: phase 1 = `neo-lime`, phase 2 = `neo-orange`, phase 3 = `neo-red`. Transition with a horizontal "drain and refill" animation — bar drains to 0 in the old color, then fills to the new phase percentage in the new color.
- Short 2-word dialogue line appears above the boss in a speech bubble: `t('adventure.boss.phase2Taunt')`. Speech bubble uses neo-brutalist styling: `border-3 border-neo-black shadow-hard-sm bg-neo-red/90`, tail pointing down toward boss. Auto-dismisses after 1.5s.

**R3 - Boss Rage Visual (Near-Defeat State)**

When boss HP drops below 20%:

- Boss container gets a persistent red vignette: `box-shadow: inset 0 0 60px rgba(255, 30, 30, 0.4)`.
- Grid tiles pulse with a subtle red tint on idle frames: `background: rgba(255, 50, 50, 0.05)` cycled via CSS animation.
- Boss sprite gets a "heat shimmer" distortion: CSS `filter: blur(0px) -> blur(1px) -> blur(0px)` on a 0.4s loop.
- Timer display changes color to `neo-red` and gains a fast pulse animation (0.8s loop).

All rage effects must be gated behind `prefers-reduced-motion: no-preference` and the app's existing `AdaptiveMotion` system.

**R4 - Boss Defeat "Slow Mo" Frame**

At the moment the player submits the word that defeats the boss (HP crosses 0):

1. Freeze all tile animations immediately.
2. Apply `filter: brightness(2)` to the entire screen for 80ms (white flash).
3. Slow time: reduce all `motion` animation speeds by applying a CSS `animation-play-rate: 0.25` for 600ms via a class toggle on the arena root.
4. Boss shatter: split the boss image into a 3x3 grid of CSS `clip-path` regions, each flying outward in a different direction with rotation.
5. Resume normal speed. Play the existing Remotion `BossDefeat` cinematic.

---

## 4. Progress Visualization

### Current State
Player level 1-50 exists (referenced in audit brief). XP bar in HUD exists. No avatar evolution or border/frame upgrade system found in the codebase.

### Recommendations

**R1 - Level Milestone Visual Rewards (New: `LevelMilestoneBadge`)**

Define 5 visual tiers keyed to player level:

| Level range | Frame style | Title prefix | Avatar aura |
|---|---|---|---|
| 1-9 | `border-3 border-neo-white/40` (plain) | "Wanderer" | none |
| 10-19 | `border-3 border-neo-lime shadow-hard` (solid) | "Explorer" | subtle lime glow |
| 20-29 | `border-4 border-neo-yellow animate-spin-slow` (rotating) | "Veteran" | yellow pulse |
| 30-39 | `border-4 border-neo-orange` with corner gem insets | "Champion" | orange shimmer |
| 40-50 | `border-[5px]` gradient from `neo-pink` to `neo-purple` with animated gradient-angle | "Legend" | full halo |

These frames apply globally to the player avatar wherever it appears (HUD, leaderboards, profile).

**R2 - XP Bar with Level-Up Burst**

On level-up, the XP bar should:
1. Fill to 100% with a fast `ease-in` (300ms).
2. Flash `neo-yellow` at 100% for 200ms.
3. Reset to 0% instantly (no animation on the reset).
4. Animate to the new level's starting XP percentage with a `spring` (stiffness 120, damping 20).
5. Show a burst overlay: `+LEVEL UP` text in Fredoka, scales from `0.5` to `1.2` to `1.0` with spring, then fades out over 600ms.

**R3 - World Completion Power Indicator**

After completing all 7 levels of a world, the player's avatar on the World Map gains that world's `colorPrimary` as a small orbiting ring. By World 10, the avatar has 10 rings orbiting it — a visible power accumulation metaphor.

Implementation: In `WorldNode`, check if `completedLevels === LEVELS_PER_WORLD` for each world the player has cleared. Pass an array of completed world color primaries to the avatar pin component. Render each as an `OrbitingLetter`-style ring using the same CSS custom property orbit system, but with a 2px `border-full` ring div instead of a letter.

**R4 - Skill Tree Visual Power Nodes**

On the Skills page, already-unlocked nodes should have an animated "power flowing" effect between connected nodes: an SVG `<polyline>` connector with an `animateMotion` particle traversing it, identical to `TrailPath` but for the skill graph. This makes the skill tree feel alive and shows the player that power flows through their build.

---

## 5. Upgrade Shop Feel

### Current State
3 simple upgrade stacks referenced in brief. No `UpgradeShop.tsx` found — likely unbuilt or in-progress.

### Recommendations

**R1 - Card Collection Layout (not a list)**

Replace any list/stack UI with a card grid using the existing `PremiumCard` component. Each upgrade is a card with:
- Top half: large upgrade icon (64x64, world-themed illustration or emoji in a neo-brutalist frame).
- Bottom half: upgrade name (Fredoka, 16px), effect description (Rubik, 12px, neo-white/60), current level pip indicators (3-5 pips, filled = owned, empty = not yet).
- Cost display: `neo-yellow` coin icon + number in bottom-right corner, `border-2 border-neo-yellow rounded-neo`.

Cards have 3 states:
- Affordable: normal `PremiumCard` with `variant="default"`, `glowColor` = upgrade's color.
- Not affordable: `opacity-60`, coin cost shown in `neo-red`.
- Max level: `variant="perfect"`, replace cost with "MAX" badge in `neo-lime`.

**R2 - Purchase Confirmation Micro-Interaction**

On tap of an affordable card:
1. Card performs `animate-neo-press` (existing class).
2. Coin count in header animates: old value -> new value using a number increment animation (rAF loop, 400ms, easeOut).
3. Upgrade level pip at the appropriate index flips from empty to filled using the same coin-flip `rotateY` technique as star reveals.
4. Card's `glowColor` briefly intensifies (`filter: drop-shadow` opacity 100% -> 30%) over 600ms.

No confirmation modal for small purchases (< 50 coins). Modal only for purchases > 200 coins, using the existing `border-4 border-neo-black shadow-hard-lg` modal pattern.

**R3 - "Just One More" Compulsion Loop**

Show a persistent "Next unlock at X coins" progress bar below the card grid. It fills as the player earns coins, and pulses when close (< 20% away from next affordable upgrade). This mirrors how battle pass progress bars drive engagement — the player always has a near-term goal visible.

**R4 - Equipment Slot Grid**

For players who reach World 4+, introduce an "Equipped" section above the shop cards: a 3-slot horizontal row representing active power-ups (Power-up A, B, C from the existing power-up bar). Each slot is a `border-3 border-neo-black shadow-hard` box with a drag-reorder affordance (long-press on mobile). This gives the shop a strategic loadout feel.

---

## 6. Between-Level Flow

### Current State
No between-level flow component found. Player presumably goes: level end -> results -> back to level grid. No story beats or momentum maintenance.

### Recommendations

**R1 - Inter-Level Story Beat (New: `StoryBeatCard`)**

After every 2 levels within a world (levels 2, 4, 6), show a brief full-screen story card before returning to the level grid. Duration: 3-4 seconds, skippable.

Layout:
```
[Full-screen dark overlay]
[World image — blurred, 60% opacity — as background]
[Center panel — border-4 border-neo-black shadow-hard-lg bg-neo-navy/95 — max-w-sm mx-auto]
  [World icon — 80x80 — top center, -mt-10, overlapping panel top border]
  [Character name — neo-white/60 — small caps — 12px]
  [Dialogue text — Fredoka — 20px — neo-white — max 2 lines]
  [Skip indicator — "Tap to skip" — neo-white/30 — 11px — bottom center]
```

Dialogue is world-specific, pulled from `t('adventure.story.world{N}.beat{M}')` translation keys. 4 beats per world (2, 4, 6, and post-boss). These are flavor text only — no gameplay branching needed.

**R2 - "Next Level" Preview Card**

After completing a level (before `StoryBeatCard` if applicable), show a 2-second preview of the next level's card, sliding in from the right:

- Shows: level number, difficulty bars, special tile types as badges, estimated time.
- A "play" button appears after 1.5s and pulses.
- Tap anywhere skips to the level grid with the next level pre-highlighted.

This preview functions as both a reward (knowing what's next) and a hook (building anticipation for the next challenge type).

**R3 - World Completion Interstitial**

When a player completes Level 7 of a world, play the existing Remotion `WorldUnlock` cinematic, then follow it with a 3-step swipeable card sequence:
1. "World X Complete" — total stars earned, compared to max.
2. "Rewards Earned" — list of XP, coins, any unlocked power-ups.
3. "World X+1 Preview" — brief tease of the next world with its name revealed and image shown for the first time (if locked). The world image should have a "reveal" animation: a horizontal wipe from left to right, `clip-path: inset(0 100% 0 0) -> inset(0 0% 0 0)` over 800ms.

**R4 - Loading Screen Anticipation**

Replace any blank loading state between level select and game start with a world-themed anticipation screen. Duration: actual load time, minimum 800ms for the animation to complete.

Layout:
- Background: world image at 30% opacity, blurred.
- Center: an animated letter grid forming (tiles drop in one by one, 6x6 or 4x4 depending on level) with placeholder tiles. The animation completes into a silhouette of the actual grid.
- Bottom: `t('adventure.loading.hint')` — a random word-game tip, different per load.

This converts dead time into a game mechanic preview and a learning moment.

---

## 7. Mobile-First Adventure

### Current State
Responsive breakpoints exist (`sm:`, `md:`, `lg:`) but use viewport-relative sizing. Container queries mentioned in `CLAUDE.md` but not observed in adventure components. World nodes: `w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 lg:w-36 lg:h-36` — viewport-based. Info card: fixed `w-[140px]` on mobile.

### Problems Identified

**P1 - CRITICAL: Info card width is fixed at 140px on mobile**
`w-[140px] sm:w-[200px]` — this is a fixed pixel value, violating the CLAUDE.md container query guidance and causing text truncation on narrow screens (320px iPhones, Japanese/Hebrew long strings).

**P2 - HIGH: World node tap target size**
`w-24 h-24` = 96x96px on mobile. This passes the 44px minimum but is tight when combined with the orbiting letters and surrounding elements. The effective tap area may be smaller than the visual node if the `motion.button` has no explicit hitslop.

**P3 - HIGH: Level grid uses 2 columns on mobile**
`grid-cols-2` on mobile gives ~160-170px wide cards on a 375px phone. The card content (level number, 3 stars, objective text, special tile badges) is cramped. Text truncation is visible on the `title` attribute but not the displayed text.

**P4 - MEDIUM: Thumb zone not considered for primary actions**
On a 6-inch phone, the top 30% of the screen is unreachable one-handed. The world header in `LevelGrid` occupies the top with stat info, pushing the first level card down. The "Play" button for each card is rendered in the card's top-right corner — the hardest zone to reach on mobile.

**P5 - MEDIUM: No haptic feedback on interactions**
The `PremiumCard` and world node buttons use `animate-neo-press` visual feedback but no `navigator.vibrate()`. Mobile game interactions benefit from haptic confirmation.

### Recommendations

**R1 - Fix Info Card Width with Container Queries**

Replace `w-[140px] sm:w-[200px]` with:
```
container-type: inline-size  (on the parent flex row)
@container (min-width: 340px) { width: 180px; }
@container (min-width: 420px) { width: 220px; }
```

Or in Tailwind: wrap the world node row in `@container` and use `@container/row:w-[200px]` on the info card.

**R2 - Thumb Zone Layout for Level Grid**

Reorder the mobile `LevelGrid` layout:
- Top: sticky world header (collapses on scroll to just world name + star count, 48px height). Use `position: sticky; top: 0;` with backdrop blur.
- Middle: level cards grid — this is where thumbs spend most time.
- Move the difficulty/stats info into the card bottom (already done), not the header.

Primary CTA per card: move the "Play" indicator from top-right to bottom-center of the card as a full-width `border-t-2 border-neo-white/10` region: `[PLAY]` in neo-yellow, 12px, uppercase. This puts the action in the thumb's natural sweep zone.

**R3 - Level Grid Single Column Option for < 360px**

Add `grid-cols-1` for very narrow viewports using a container query:
```
@container (max-width: 320px) { grid-template-columns: 1fr; }
```

Single-column cards at this width can show more information per card and avoid truncation entirely.

**R4 - Haptic Feedback Layer**

Create a shared `useHaptics` hook:
```typescript
// hooks/useHaptics.ts
export function useHaptics() {
  const tap = useCallback(() => {
    if ('vibrate' in navigator) navigator.vibrate(8);
  }, []);
  const success = useCallback(() => {
    if ('vibrate' in navigator) navigator.vibrate([12, 30, 20]);
  }, []);
  const error = useCallback(() => {
    if ('vibrate' in navigator) navigator.vibrate([8, 20, 8, 20, 8]);
  }, []);
  return { tap, success, error };
}
```

Call `tap()` on world node press, `success()` on level completion, `error()` on rejected words. Haptics must be gated on user gesture (already satisfied since these are touch handlers).

**R5 - World Map One-Thumb Navigation**

Add a floating "Jump to My World" FAB (floating action button) in the bottom-right corner of the world map, only visible when the player has scrolled away from their current world:
- 56x56px circle, `bg-neo-yellow border-3 border-neo-black shadow-hard rounded-full`.
- Icon: player's avatar (small, 32x32).
- On tap: smooth scroll to `nextWorldRef`.
- Uses `IntersectionObserver` on the player's world node to show/hide the FAB.

This solves the problem of being lost on the map after exploring higher worlds.

**R6 - Gesture Shortcuts**

On the world map, implement swipe-left from the right edge to open a quick summary panel: total stars, current level, coins. This panel slides in at 80% screen height, using `touch-action: pan-y` on the main scroll container and detecting horizontal swipe (deltaX > 40px, deltaY < 20px). The panel dismisses on swipe-right or tap outside.

This avoids adding a persistent UI element that competes with the map for space.

---

## Priority Matrix

| ID | Area | Impact | Effort | Priority |
|---|---|---|---|---|
| R1-1 | Player pin "You Are Here" | High | Medium | P1 |
| R2-1 | Gate star animation on new completion only | High | Low | P1 |
| R7-5 | Jump-to-my-world FAB | High | Low | P1 |
| R1-2 | Trail history grammar + dot direction fix | High | Low | P1 |
| R2-2 | Level completion reward sequence | High | High | P2 |
| R3-1 | Arena transition + screen shake | High | Medium | P2 |
| R3-2 | Boss phase change moments | High | Medium | P2 |
| R7-1 | Info card container query fix | Medium | Low | P2 |
| R7-4 | Haptic feedback hook | Medium | Low | P2 |
| R4-1 | Level milestone frame tiers | Medium | Medium | P3 |
| R5-1 | Shop card collection layout | Medium | High | P3 |
| R6-1 | Inter-level story beats | Medium | Medium | P3 |
| R6-4 | Loading screen anticipation | Medium | Medium | P3 |
| R1-3 | Fog of war with silhouette | Low | Medium | P4 |
| R3-4 | Boss defeat slow-mo frame | Low | High | P4 |
| R7-6 | Swipe gesture quick summary | Low | Medium | P4 |

---

## Implementation Notes for Developers

**Animation safety**: All new animations must use `AdaptiveMotion` / `AdaptiveAnimatePresence` from `components/motion/AdaptiveMotion`. Check `prefers-reduced-motion` before adding CSS keyframe animations not covered by Framer Motion.

**Translation keys needed**: All new UI text must have keys added to all 4 language files. Key namespaces:
- `adventure.map.*` (journey text, fog labels)
- `adventure.story.world{N}.beat{M}` (dialogue)
- `adventure.levelComplete.*` (reward sequence)
- `adventure.boss.*` (phase taunts)
- `adventure.loading.hint` (loading tips array)
- `adventure.milestone.*` (level tier titles)

**RTL**: Chest open animation, trail direction, and FAB position must all account for Hebrew RTL layout. The trail `fromLeft` prop already handles RTL alternation — extend this to the trail history grammar. FAB should be `bottom-right` for LTR, `bottom-left` for RTL.

**File size**: Each new component must stay under 500 lines. Suggested splits:
- `LevelCompleteReveal.tsx` + `LevelCompleteReveal.star.tsx` + `LevelCompleteReveal.chest.tsx`
- `BossArenaTransition.tsx` (entry) + `BossPhaseChange.tsx` (mid-fight) + `BossDefeatSlowMo.tsx`
- `StoryBeatCard.tsx`
- `useHaptics.ts`

**Testing**: New visual components need tests for: render without crashing, `prefers-reduced-motion` fallback (no animation classes applied), RTL layout correctness, and prop-driven state changes (isNewCompletion, bossPhase, etc.).
