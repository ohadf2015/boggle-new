# Blast Mode — Full Fun Overhaul Design

**Date:** 2026-02-21
**Approach:** C — Comprehensive Polish (pre-game, juice, celebration moments, hint system)
**Scope:** Presentation layer only — no gameplay logic changes

---

## Problem Statement

Blast mode has solid mechanics (10 special tiles, cascade chains, wave system, haptics) but the experience has critical gaps that hurt playability:

1. No pre-game screen — always defaults to medium difficulty, no tile education
2. Special tile badges are tiny and cryptic ("col", "pull") — players don't know what tiles do
3. Grid feels static — tile idle animations are assigned CSS classes but most are undefined
4. Wave transition is a bare text overlay — no drama for completing a board
5. Board complete overlay always shows 3 filled stars regardless of actual performance (bug)
6. Dead-end handling is utilitarian — no hint system, just Shuffle + End Game buttons
7. Results screen has no confetti or number count-up drama

---

## Architecture

### Phase Flow Change

```
Before: playing → waveTransition → playing → results
After:  ready → playing → waveTransition → playing → results
```

`BlastView` adds a `'ready'` phase. `BlastPhase` type (in `types.ts`) extends to include `'ready'`.

### New Files

| File | Purpose |
|------|---------|
| `components/blast/BlastReadyScreen.tsx` | Pre-game screen: difficulty picker + tile legend |
| `components/blast/hooks/useBlastHint.ts` | Finds a valid word path from remaining tiles |

### Modified Files

| File | Change |
|------|--------|
| `components/blast/types.ts` | Add `'ready'` to `BlastPhase` union |
| `components/blast/BlastView.tsx` | Add `ready` phase; thread difficulty from ready screen |
| `components/blast/BlastWaveTransition.tsx` | Full cinematic overhaul (3-act sequence) |
| `components/blast/BlastGameLayout.tsx` | Fix star bug; wire hint path; replace dead-end panel |
| `components/blast/BlastResults.tsx` | Confetti on 3 stars; number count-up; word reveal |
| `components/blast/BlastTileOverlay.tsx` | Define per-type idle CSS animation classes |
| `fe-next/styles/blast.scss` (or global CSS) | Define `@keyframes` for each tile idle animation |

### Unchanged

All game logic: `useBlastGame`, `useBlastCascade`, `blastGravity`, `blastWaveConfig`, `blastDeadEndDetector`, `blastLetterGenerator`, `blastTileUtils`, `blastVerticalScanner`.

---

## Feature Designs

### 1. Pre-Game Ready Screen (`BlastReadyScreen.tsx`)

**Layout:** Full-screen portrait, neo-brutalist dark background.

**Difficulty Picker:** Three vertically stacked cards.
- Easy — neo-cyan border, "Fewer specials, relaxed cascades"
- Medium — neo-yellow border, "Balanced chaos" (default selected)
- Hard — neo-pink border, "Specials everywhere, brutal waves"

Each card shows a mini visual: colored tile icons representing the special tile density.

**Tile Legend Strip:** Horizontally scrollable row below difficulty cards. Each tile shown at ~48px with its Lucide icon, name, and one-line description. Wave 1 tiles (gold, bomb, rainbow, ice, wildcard) shown at full opacity. Wave 2+ tiles (lightning, magnet, prism, gem, frozen) shown at 50% opacity with a "Wave 2+" badge.

**CTA:** Large "BLAST OFF!" button (neo-yellow, shadow-hard-lg, full width).

**Props:**
```typescript
interface BlastReadyScreenProps {
  onStart: (difficulty: BlastDifficulty) => void;
}
```

---

### 2. Tile Idle Animations

Define `@keyframes` in `blast.scss` (or append to global CSS). Each animation class already assigned in `TILE_BACKGROUNDS` config:

| Tile | Class | Animation |
|------|-------|-----------|
| gold | `blast-tile-gold` | Diagonal shimmer sweep (pseudo-element, 2s loop) |
| bomb | `blast-tile-bomb` | Red pulse ring expands from center every 2s |
| lightning | `blast-tile-lightning` | Brief opacity flash + hue shift every 1.8s |
| prism | `blast-tile-prism` | Slow `filter: hue-rotate` rotation 360° over 4s |
| gem | `blast-tile-gem` | Box-shadow glow breathing, 1.5s ease-in-out |
| rainbow | `blast-tile-rainbow` | `filter: hue-rotate` 360° over 3s infinite |
| ice | `blast-tile-ice` | Subtle sparkle opacity flicker, 2.5s |
| wildcard | `blast-tile-wildcard` | Gentle scale pulse 1→1.03→1, 2s |
| magnet | `blast-tile-magnet` | Border color oscillation between purple and red |
| frozen | `blast-tile-frozen` | Slower opacity pulse + slight blue shift |

All animations use `animation-timing-function: ease-in-out` and `animation-iteration-count: infinite`. Keep subtle — max scale change 3%, max opacity change 15%.

---

### 3. Dead-End Hint System

**Hook: `useBlastHint.ts`**

Extends `blastDeadEndDetector` logic: BFS through remaining uncleared tiles, returns first valid word found as `{ word: string; path: Array<{row, col}> } | null`.

Takes `modifiedGrid` and `tileStates` as inputs. Returns `{ hint, requestHint, clearHint }`.

`requestHint()` sets the hint path → triggers `BlastGrid` `highlightedPath` → grid glows the word path for 2000ms → auto-clears.

**UI in `BlastGameLayout`:**

Replace current orange dead-end banner with:
```
┌─────────────────────────────────────────┐
│  🤔 STUCK?                              │
│  [💡 Hint]  [🔀 Shuffle]  [End Game]   │
└─────────────────────────────────────────┘
```

- Hint button: neo-lime, only shown if `hint !== null`
- After hint shown: button grays out for 3s cooldown
- If no valid words exist (`hint === null`): Hint button hidden, only Shuffle + End Game

---

### 4. Wave Transition Cinematic (3-Act)

**Act 1 — WAVE CLEAR! (0–400ms)**
- Full-screen overlay: fuchsia→purple gradient sweeps in from top (clip-path or height animation)
- "WAVE CLEAR!" text springs in from center (scale 0.3 → 1.0, spring stiffness 300)
- Particle burst: 8–12 `BlastExplosion` events dispatched at center with type `'cascade'`

**Act 2 — Stats Reveal (500–1500ms)**
- Score, words, clear% reveal one by one with 300ms stagger
- Each stat counts up from 0 using a `useCountUp` hook (animates integer from 0 to final over 600ms)
- Stats styled as neo-brutalist cards, slide in from left

**Act 3 — Next Wave Card (1600–2500ms)**
- "→ WAVE N" card slides in from right
- "Tap to continue" hint fades in at 2000ms

Auto-advances at 3000ms. Tap anywhere to skip.

**Props change:** Add `onSkip` alongside existing `onAdvance`.

---

### 5. Board Complete Overlay Fix + Confetti

**Bug fix:** Replace hardcoded 3 filled stars with computed `stars` value.

In `BlastGame.tsx`, when calling `onWaveComplete` or `onGameEnd`, the star count is already computed in `getResultsData`. For the mid-game board-complete overlay in `BlastGameLayout`, pass `tilesCleared / totalTiles` percentage and compute stars inline:
- ≥80% → 3 stars
- ≥50% → 2 stars
- <50% → 1 star

**Confetti:** On 3-star clears, mount a lightweight confetti component (reuse `ConfettiRetrigger` from `components/results/ConfettiRetrigger.tsx`) inside the overlay.

---

### 6. Results Screen Drama

**Number count-up:** `finalScore` animates 0→value over 1s. Words count, clear% count. Use a shared `useCountUp(target, duration, delay)` hook.

**3-star confetti:** Mount `ConfettiRetrigger` when `results.stars === 3`.

**Best word reveal:** Letters animate in from bottom one at a time (staggered by 80ms per letter) using `framer-motion` `AnimatePresence`.

**New Best badge:** Scale bounce (`scale: [1, 1.3, 0.9, 1.1, 1]`) + glow pulse on mount instead of static badge.

**Word list:** Show found words in a collapsible section that expands on tap, words animate in with stagger.

---

## Testing Plan

### Unit Tests
- `useBlastHint.ts` — returns valid path from known grid; returns null when no words exist; handles all-cleared grid
- `BlastReadyScreen.tsx` — renders all 3 difficulty cards; clicking card selects it; BLAST OFF calls `onStart` with correct difficulty; tile legend renders all 10 tile types

### Component Tests
- `BlastWaveTransition.tsx` — renders wave number; shows previous stats; auto-advances after timeout; tap triggers advance
- `BlastResults.tsx` — renders correct star count; renders confetti only on 3 stars; "new best" badge shown when `isNewBestScore`
- `BlastGameLayout.tsx` — board complete overlay shows correct stars (1/2/3); dead-end hint panel renders hint button; hint button triggers `requestHint`

### Integration
- `BlastView.tsx` — starts in `ready` phase; clicking BLAST OFF transitions to `playing`; difficulty flows through to config

---

## Translation Keys Required

```json
{
  "blast.ready.title": "Blast Mode",
  "blast.ready.subtitle": "Clear the board, chain combos, survive the waves",
  "blast.ready.play": "Blast Off!",
  "blast.ready.difficulty": "Difficulty",
  "blast.ready.tileGuide": "Tile Guide",
  "blast.ready.wave2Plus": "Wave 2+",
  "blast.hint": "Hint",
  "blast.stuck": "Stuck?",
  "blast.waveClear": "Wave Clear!",
  "blast.tapToContinue": "Tap to continue"
}
```

(Hebrew, Swedish, Japanese translations needed via clean-translations workflow)

---

## Constraints Respected

- All new UI text uses `t('key')` — no hardcoded strings
- RTL: BlastReadyScreen tiles strip uses `dir="ltr"` for icon layout consistency (same pattern as BlastTileOverlay)
- Max 500 lines per file — BlastReadyScreen split if needed
- TDD: Tests written before implementation for all new hooks and components
- No changes to gameplay logic files
