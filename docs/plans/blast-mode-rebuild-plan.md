# Blast Mode — Full Rebuild Plan

> **Goal**: Rebuild Blast Mode from scratch with animation-first architecture for Candy Crush feel
> **Approach**: Keep shared types + backend + pure utils. Rebuild all React components and hooks.

---

## What We Keep (Don't Touch)

| Item | Path | Why |
|------|------|-----|
| Tile types | `shared/types/blast.ts` | Canonical types used by backend + MP |
| Game types | `shared/types/game.ts` (Blast section) | MP state contract |
| Backend modules | `backend/modules/blastModeManager.ts` | Server-side blast logic |
| Backend handlers | `backend/handlers/gameStart/wordValidation` | Socket event handlers |
| MP constants | `shared/constants/blastMultiplayerConstants.ts` | Shared between client/server |
| Combo definitions | `blast/utils/blastCombos.ts` | 39 combos, well-tested pure logic |
| Gravity computation | `blast/utils/blastGravity.ts` | Pure function, deterministic |
| Wave config | `blast/utils/blastWaveConfig.ts` | Wave difficulty curves |
| Tile generation | `blast/utils/blastTileGeneration.ts` | Tile spawning logic |
| Letter generator | `blast/utils/blastLetterGenerator.ts` | Seeded RNG for MP |
| Star calculator | `blast/utils/blastStarCalculator.ts` | Pure scoring |
| Dead-end detector | `blast/utils/blastDeadEndDetector.ts` | Off-thread word check |
| Tile effects | `blast/utils/blastTileEffects.ts` | BFS bomb chains, lightning cols |
| DDA | `blast/utils/blastDDA.ts` | Difficulty adjustment |
| Combo effects | `blast/utils/blastComboEffects.ts` | Pure effect execution |

## What We Rebuild (New Architecture)

Everything in `components/blast/` — components and hooks. The current code has 73 components and hooks built logic-first with animations bolted on. The rebuild is **animation-first**: the sequencer drives the game feel, and logic feeds into it.

---

## New Architecture: Event → Sequencer → Stage

```
┌─────────────────────────────────────────────────────┐
│                    BlastView                         │
│  (phase router: ready → playing → results)          │
│                                                      │
│  ┌─────────────────────────────────────────────┐    │
│  │              BlastGame (NEW)                 │    │
│  │                                              │    │
│  │  useBlastEngine ──events──► useBlastSequencer│    │
│  │       │                         │            │    │
│  │   pure state              timed animation    │    │
│  │   (grid, score,           queue with phases  │    │
│  │    tiles, combos)         & callbacks        │    │
│  │                                              │    │
│  │  ┌──────────────────────────────────────┐   │    │
│  │  │           BlastStage                  │   │    │
│  │  │                                       │   │    │
│  │  │  BlastHUD          BlastEffectsLayer  │   │    │
│  │  │  (score, moves,    (particles, flash, │   │    │
│  │  │   combo, objectives) score fly, text) │   │    │
│  │  │                                       │   │    │
│  │  │  BlastBoard                           │   │    │
│  │  │  ┌─────────────────────────────┐      │   │    │
│  │  │  │ BlastTile × gridSize²       │      │   │    │
│  │  │  │ (self-animating via state)  │      │   │    │
│  │  │  └─────────────────────────────┘      │   │    │
│  │  └──────────────────────────────────────┘   │    │
│  └─────────────────────────────────────────────┘    │
└─────────────────────────────────────────────────────┘
```

### Key Design Decisions

1. **Tiles own their animation state** — each `BlastTile` receives a `tilePhase` prop (`idle | selected | anticipation | clearing | falling | appearing | landing`) and animates itself. No external overlay needed.

2. **Sequencer produces a timeline** — instead of "set phase → wait → set next phase", the sequencer builds a full timeline: `[0ms: anticipation, 120ms: clear, 320ms: pause, 400ms: fall, 700ms: land, 780ms: appear, 980ms: idle]`. Anime.js runs the timeline.

3. **Score flies to counter** — `BlastScoreFly` component spawns at clear position, arcs to score display, counter bumps on arrival.

4. **Chain escalation is built-in** — chain level drives particle density, shake intensity, text tier, and animation speed simultaneously through a single `chainPower` value.

5. **Grid is a flat CSS Grid** — no overlay system. Tiles animate in-place via CSS transforms + anime.js. Cleared tiles fade out, new tiles slide in from above.

---

## Contracts to Preserve

### BlastGame Props (consumed by PlayerInGameView, HostInGameView, MultiplayerInGameView)
```typescript
interface BlastGameProps {
  config: BlastGameConfig;
  mode?: 'singleplayer' | 'multiplayer';
  waveNumber?: number;
  waveConfig?: WaveConfig;
  cumulativeScore?: number;
  onWaveComplete?: (waveScore: number, waveWords: string[], clearPct: number) => void;
  onGameEnd: (results: BlastResultsData) => void;
  onQuit: () => void;
  onComboDetected?: (combos: SpecialCombo[]) => void;
  pendingDiscovery?: BlastComboType | null;
  acknowledgeDiscovery?: () => void;
  onWordWithComboType?: (word: string, comboType: string | null) => void;
  discoveredCombos?: Set<BlastComboType>;
  initialTileStates?: BlastTileState[][] | null;
  blastSeed?: number | null;
  remainingTime?: number | null;
  totalTime?: number;
  leaderboard?: Array<{ username: string; score: number; wordCount?: number; avatar?: any }>;
  username?: string;
}
```

### BlastResultsData (consumed by results screens + result saver)
```typescript
interface BlastResultsData {
  finalScore: number;
  tilesCleared: number;
  totalTiles: number;
  clearPercentage: number;
  wordsFound: string[];
  bestWord: string;
  maxCombo: number;
  stars: 1 | 2 | 3;
  wavesCompleted: number;
  waveResults: WaveResult[];
}
```

### useBlastMultiplayerBridge (consumed by PlayerInGameView, HostInGameView)
Must still export from `hooks/useBlastMultiplayerBridge.ts` with same interface.

---

## Sprint Plan (5 Sprints)

### Sprint 1: Core Engine + Grid + Basic Interaction
> Build the game board and word selection. No animations yet — just functional grid.

**New files:**
- `hooks/useBlastEngine.ts` — Pure game state machine (grid, tiles, score, moves, combos)
- `BlastBoard.tsx` — CSS Grid of BlastTile components
- `BlastTile.tsx` — Single tile with type-aware styling + selection state
- `BlastGame.tsx` — Orchestrator (preserves props contract)
- `BlastStage.tsx` — Layout shell (HUD + board + effects)
- `BlastHUD.tsx` — Score display, move counter, wave/combo info
- `types.ts` — Updated local types (re-exports shared + new animation types)

**Reused utils:** blastCombos, blastGravity, blastTileGeneration, blastLetterGenerator, blastWaveConfig, blastDeadEndDetector

**Deliverable:** Playable grid — form words, tiles clear (instant, no animation), score updates, wave objectives work, game ends correctly.

### Sprint 2: Animation Sequencer + Cascade Feel
> The "Candy Crush moment" — this sprint makes it feel good.

**New files:**
- `hooks/useBlastSequencer.ts` — Timeline-based animation queue
- `BlastCascadeTimeline.ts` — Timing constants + phase calculator

**Enhancements:**
- `BlastTile.tsx` — Add animation phases: anticipation (flash white, scale 110%), clearing (burst out), falling (gravity + bounce), appearing (pop in from above)
- `BlastBoard.tsx` — Column-staggered gravity (30ms offset per column), chain detection after settle
- `BlastStage.tsx` — Screen shake based on chain power

**Animation Rhythm (per cascade cycle):**
```
0ms    — Anticipation: tiles flash white, scale 110%, board dims
120ms  — Clear: tiles burst outward with type-colored particles
300ms  — Pause: empty spaces visible, eye registers
400ms  — Fall: tiles drop with gravity easing, column stagger
650ms  — Land: bounce (2px overshoot), subtle dust
730ms  — Appear: new tiles pop in from above, staggered
930ms  — Settle: board rescans for chain matches
1000ms — Chain pause (if chain found): brief beat before next cycle
```

**Chain acceleration:** Each chain level multiplies all durations by `max(0.6, 1 - chain * 0.12)`

**Deliverable:** Satisfying cascade with proper rhythm. One word submission → seconds of cascading spectacle.

### Sprint 3: Juice Layer — Score Fly, Celebrations, Effects
> Every interaction gets feedback. Small words = clean, big words = spectacular.

**New files:**
- `BlastEffectsLayer.tsx` — Unified effects renderer (particles, flashes, score fly, text)
- `BlastScoreFly.tsx` — Score number arcs from clear position to counter
- `BlastChainText.tsx` — Escalating text ("Nice!" → "Amazing!" → "INCREDIBLE!")
- `BlastComboFlash.tsx` — Tier-based screen overlay (rewrite, simpler)

**Enhancements:**
- `BlastHUD.tsx` — Score counter bump animation, move counter urgency (red pulse at ≤2)
- `BlastTile.tsx` — Type-specific destruction: ice shatters, lightning beams, bombs ripple, gems sparkle
- `BlastBoard.tsx` — Board glow based on intensity

**Feedback Hierarchy:**
| Trigger | Response |
|---------|----------|
| 3-letter word | Clean pop, small score fly |
| 4-letter word | "Good!" text, medium particles |
| 5-letter word | "Great!" text, board glow pulse |
| 6-letter word | "Amazing!" text, screen shake, burst |
| 7+ letter word | "INCREDIBLE!" text, full flash, massive particles |
| Chain 2 | "Nice!" + pitch up + 1.5x particles |
| Chain 3 | "Amazing!" + medium shake + 2x particles |
| Chain 4+ | "INCREDIBLE!" + strong shake + 3x particles |
| Combo detected | Tier-based flash (cyan/orange/rainbow) |
| Board 80%+ clear | Shatter effect + "BOARD CLEAR!" |

**Deliverable:** Every action feels rewarding. Long words feel powerful.

### Sprint 4: Sugar Crush, Transitions, Polish
> Complete the session arc — start to finish feels polished.

**New files:**
- `BlastReadyScreen.tsx` — Clean ready screen with objectives preview
- `BlastWaveTransition.tsx` — Wave complete → star fill → next wave
- `BlastSugarCrush.tsx` — End sequence: specials fire sequentially
- `BlastResults.tsx` — Results screen with breakdown

**Enhancements:**
- `BlastStage.tsx` — Wave intro animation (wave number slams in, objectives slide)
- `hooks/useBlastEngine.ts` — Sugar crush trigger on moves exhausted

**Deliverable:** Complete game loop from ready screen through multiple waves to results.

### Sprint 5: Multiplayer + Accessibility + Tests
> Wire MP, respect reduced-motion, comprehensive tests.

**Preserved/rewritten:**
- `hooks/useBlastMultiplayerBridge.ts` — Same interface, clean implementation
- `BlastGame.tsx` — MP props wiring (leaderboard, timer, combo sync)

**New:**
- Reduced-motion: all animations skip gracefully, game still functional
- Tests for: engine state machine, sequencer timing, tile animations, score calculations, MP determinism
- i18n: all new text uses `t('key')` pattern

**Deliverable:** Full feature parity with current Blast Mode, but feeling 10x better.

---

## File Inventory: Old → New

### Deleted (73 old component files replaced by ~15 new ones)
All current files in `components/blast/*.tsx` and `components/blast/hooks/*.ts` will be archived to `components/blast/_old/` during rebuild, then deleted after Sprint 5 verification.

### New Files (~15 total)
```
components/blast/
├── BlastGame.tsx           # Orchestrator (preserves props contract)
├── BlastStage.tsx          # Layout: HUD + Board + Effects
├── BlastBoard.tsx          # CSS Grid of tiles + cascade animations
├── BlastTile.tsx           # Self-animating tile component
├── BlastHUD.tsx            # Score, moves, combo, objectives
├── BlastEffectsLayer.tsx   # Particles, score fly, chain text, flash
├── BlastScoreFly.tsx       # Score → counter arc animation
├── BlastChainText.tsx      # "Nice!" → "INCREDIBLE!" escalation
├── BlastComboFlash.tsx     # Tier-based screen flash
├── BlastReadyScreen.tsx    # Pre-game screen
├── BlastWaveTransition.tsx # Between-wave screen
├── BlastSugarCrush.tsx     # End-of-wave special detonation sequence
├── BlastResults.tsx        # Post-game results
├── BlastView.tsx           # Phase router (ready→playing→results)
├── hooks/
│   ├── useBlastEngine.ts           # Pure game state machine
│   ├── useBlastSequencer.ts        # Animation timeline queue
│   ├── useBlastMultiplayerBridge.ts # MP sync (preserved interface)
│   └── useBlastComboStreak.ts      # RAF combo countdown (preserved)
├── utils/                          # KEPT AS-IS (pure functions)
│   ├── blastCombos.ts
│   ├── blastGravity.ts
│   ├── blastWaveConfig.ts
│   ├── blastTileGeneration.ts
│   ├── blastLetterGenerator.ts
│   ├── blastTileEffects.ts
│   ├── blastComboEffects.ts
│   ├── blastStarCalculator.ts
│   ├── blastDeadEndDetector.ts
│   ├── blastDDA.ts
│   ├── blastColorTokens.ts
│   └── ... (other pure utils)
└── types.ts                # Local types + re-exports
```

**73 old files → 15 new files + kept utils**. Massive simplification.

---

## Implementation Rules

1. **TDD**: Write tests first for each new component/hook
2. **Animation-first**: Design the animation timeline, then write the code to produce it
3. **Accessibility**: Every animation respects `useReducedMotion()`
4. **i18n**: All text via `t('key')`, add to all 5 translation files
5. **< 300 lines per file**: Split if approaching limit
6. **Preserve contracts**: BlastGameProps, BlastResultsData, useBlastMultiplayerBridge interface unchanged
7. **One commit per sprint**: After each sprint passes lint + test + build
