# Blast Mode: Candy Crush Mechanics Adaptation

> Design document for adapting Candy Crush Saga's core satisfaction and progression mechanics into LexiClash Blast Mode (word-game variant on a 6x6 grid).

---

## Table of Contents

1. [Current State](#current-state)
2. [Level Objective System](#1-level-objective-system)
3. [Special Tile Combinations](#2-special-tile-combinations)
4. [Move Economy & Pressure](#3-move-economy--pressure)
5. [Level-Clear Celebration ("Word Crush")](#4-level-clear-celebration-word-crush)
6. [Progression & Map](#5-progression--map)
7. [Satisfaction & Juice](#6-satisfaction--juice)
8. [Implementation Priorities](#implementation-priorities)

---

## Current State

Blast Mode already has:
- 6x6 grid, 11 tile types (standard + 10 special), wave progression (1-6+)
- Cascade chains (max depth 2-4), combo tracker with milestone text
- Gravity physics (Candy Crush-style fall + elastic bounce)
- Star ratings (1-3 based on clear percentage: 50%/80%)
- Phaser-rendered canvas with idle breathing, selection glow, trail effects
- Score popups, particle explosions, hit-stop, time dilation on combos

**What's missing**: objective variety, tile combination effects, move pressure, end-of-level celebration, and a progression map that makes players want to keep playing.

---

## 1. Level Objective System

### Candy Crush Reference

Candy Crush uses 4 active level types (2 removed):
- **Jelly**: Clear all jelly squares by matching on them (requires coverage strategy)
- **Ingredients**: Drop items to exit points at bottom (requires gravity awareness)
- **Candy Order**: Collect N of specific candy types (requires targeted creation)
- **Mixed**: Combine 2+ objectives (37% of all levels, most common)
- ~~Moves (removed 2021)~~, ~~Timed (removed 2018)~~

Key insight: variety keeps players engaged. The same grid feels different with different objectives.

### Blast Mode Adaptation

Map each Candy Crush objective to a word-game equivalent:

| Candy Crush | Blast Mode Equivalent | Description | Priority |
|---|---|---|---|
| Jelly | **Clear Zones** | Highlighted cells must be used in words to clear. Clear all marked cells to win. | P0 |
| Ingredients | **Letter Drop** | Special "ingredient letters" must reach the bottom row via gravity. Form words above them to drop. | P1 |
| Candy Order | **Tile Hunt** | Collect N of specific special tiles (e.g., "Clear 3 bombs, 2 gems"). Forces strategic tile activation. | P0 |
| Mixed | **Mixed Objective** | Combine any two objectives (e.g., clear zones + collect 2 bombs). Available from wave 4+. | P1 |
| Score Target | **Score Target** | Reach a score threshold with limited moves. Simplest objective, good for tutorials. | P0 |

### Clear Zones Mechanic (P0)

```
Objective: "Clear all highlighted zones"

Grid visualization:
  A B C D E F
1 . . [H] . . .      [X] = zone cell (highlighted)
2 . [E] . [L] . .     .  = normal cell
3 . . . . . .
4 [W] . . . [O] .
5 . . [R] . . .
6 . . . [D] . .

- Zone cells have a colored underlay (like Candy Crush jelly)
- Using a zone cell in a word removes the zone marker
- Zone requires 1 hit (single jelly) or 2 hits (double jelly) on harder waves
- Win condition: all zone markers cleared
```

**Data model addition to `BlastTileState`**:
```typescript
interface BlastTileState {
  // ... existing fields
  zoneHitsRemaining: number; // 0 = no zone, 1 = single, 2 = double
}
```

### Tile Hunt Mechanic (P0)

```
Objective: "Collect: 3x Bomb, 2x Gem, 1x Lightning"

- Progress bar shows collected vs required for each type
- Tiles are "collected" when cleared via word formation
- Order tiles glow with a pulsing border to draw attention
- Completing an order item triggers a satisfying check animation
```

### Letter Drop Mechanic (P1)

```
Objective: "Drop all ingredient letters to the bottom"

- 2-3 special "ingredient" tiles spawn at top rows
- They look distinct (e.g., cherry/hazelnut equivalent - maybe a star or key icon)
- They follow gravity but cannot be used in words
- Player must clear tiles below them to make them fall
- When ingredient reaches row 6, it slides off with a celebration
```

### Level Objective Config

```typescript
interface BlastLevelObjective {
  type: 'score' | 'clearZones' | 'tileHunt' | 'letterDrop' | 'mixed';

  // Score target
  targetScore?: number;

  // Clear zones
  zoneCells?: Array<{ row: number; col: number; hits: 1 | 2 }>;

  // Tile hunt
  tileOrders?: Array<{ tileType: BlastTileType; count: number }>;

  // Letter drop
  ingredientCount?: number;

  // Mixed: array of sub-objectives
  subObjectives?: BlastLevelObjective[];
}
```

---

## 2. Special Tile Combinations

### Candy Crush Reference

The combination system is Candy Crush's secret weapon for spectacle. When two special candies are swapped together, the result is MORE powerful than either alone:

| Combo | Effect | Spectacle Level |
|---|---|---|
| Striped + Striped | Clears 1 row + 1 column (cross) | Medium |
| Striped + Wrapped | Clears 3 rows + 3 columns (giant cross) | High |
| Wrapped + Wrapped | 5x5 explosion from each candy | High |
| Color Bomb + Striped | All candies of that color become striped, then ALL fire | Extreme |
| Color Bomb + Wrapped | All candies of that color become wrapped, then ALL explode | Extreme |
| Color Bomb + Color Bomb | Clears ENTIRE board | Maximum |

Key insight: combinations are multiplicative, not additive. Each combo feels like discovering a secret weapon.

### Blast Mode Adaptation

In Candy Crush, you swap adjacent candies. In Blast Mode, you form words. The combination trigger needs rethinking:

**Trigger mechanism**: When a word path passes through two or more special tiles, their effects COMBINE instead of firing independently.

| Combo | Blast Effect | Visual | Priority |
|---|---|---|---|
| Bomb + Bomb | Each bomb's 3x3 radius doubles to 5x5 | Double shockwave rings | P0 |
| Bomb + Lightning | Lightning hits entire column AND bomb explodes; each lightning-cleared cell also does 1-cell radius blast | Electric explosion cascade | P0 |
| Lightning + Lightning | Clears TWO full columns (both tiles' columns) | Twin lightning bolts | P0 |
| Gold + Any Special | Special effect fires with 3x score multiplier applied to ALL cleared tiles | Gold shimmer on all particles | P1 |
| Rainbow + Bomb | Bomb radius becomes entire board — clears ALL tiles of one random type + bomb area | Rainbow shockwave | P1 |
| Rainbow + Lightning | Lightning strikes ALL columns (full board clear of random letter) | Rainbow lightning storm | P1 |
| Prism + Prism | Cross-clear from BOTH positions, then chain detonation | Prismatic X-pattern | P1 |
| Gem + Gem | Both gems immediately collected, +16 bonus each, plus 3x3 around each | Emerald twin nova | P2 |
| Magnet + Bomb | Magnet pulls ALL special tiles in 5x5 range, THEN bomb detonates clearing all pulled tiles | Implosion then explosion | P2 |
| Wildcard + Any | Wildcard matches optimally AND special fires with +50% intensity | Adaptive glow | P2 |

### Combination Detection Logic

```typescript
interface TileCombination {
  tiles: BlastTileState[];  // The special tiles in the word path
  comboType: string;        // e.g., 'bomb+lightning', 'rainbow+bomb'
  effectMultiplier: number; // How much stronger than individual effects
}

function detectCombination(wordPath: BlastTileState[]): TileCombination | null {
  const specials = wordPath.filter(t => t.type !== 'standard');
  if (specials.length < 2) return null;

  // Sort by priority to determine dominant combo
  // Return the highest-priority pairing
}
```

### Combo Discovery UI

- First time a player triggers a new combo: pause briefly, show "NEW COMBO DISCOVERED!" banner
- Combo catalog in pause menu showing discovered vs undiscovered combinations
- Undiscovered combos shown as "???" silhouettes to create curiosity

---

## 3. Move Economy & Pressure

### Candy Crush Reference

- Every level has a fixed move count (typically 15-40 moves)
- Running out of moves = level failed (can buy 5 extra moves)
- Remaining moves convert to bonus points during Sugar Crush (end celebration)
- ~4 striped candies generated per 5 remaining moves
- Each remaining move = 6,000 base points + special candy effects
- Moves create URGENCY without time pressure (strategic, not frantic)

Key insight: moves create the "one more try" loop. Players think "if I had just 2 more moves..." which drives replays and engagement.

### Blast Mode Adaptation

Currently Blast Mode has NO move limit — players can keep forming words until a dead end. This removes urgency.

**Proposed: Move Counter System**

| Parameter | Value | Notes |
|---|---|---|
| Base moves (wave 1) | 20 | Generous to teach mechanics |
| Base moves (wave 2-3) | 15 | Standard pressure |
| Base moves (wave 4+) | 12 | High pressure |
| Bonus moves (bomb clear) | +1 | Reward for explosive plays |
| Bonus moves (combo 3+) | +1 | Reward combos |
| Bonus moves (6+ letter word) | +1 | Reward vocabulary |
| Bonus moves (cascade chain) | +1 per chain level | Reward cascades |

```typescript
interface MoveEconomy {
  movesRemaining: number;
  movesUsed: number;
  totalMoves: number;
  bonusMovesEarned: number;
}
```

**Move counter UX:**
- Large, prominent counter at top of screen (like Candy Crush)
- Counter pulses when moves <= 5 (amber) or <= 3 (red)
- "+1 MOVE!" popup when bonus move earned
- Screen edge vignettes red when moves critically low
- Last-move special effect: screen dims slightly, dramatic music sting

**Important**: Moves should NOT feel punishing. The move count should be calibrated so that average players complete most levels with 2-4 moves to spare. The pressure is psychological, not mechanical.

### Move Calibration Strategy

Follow Candy Crush's difficulty curve:
- **Waves 1-2**: Player should succeed 85-90% of the time (confidence building)
- **Waves 3-4**: Success rate ~60-70% (challenge begins)
- **Wave 5+**: Success rate ~40-50% (mastery required)
- **Every 5th wave**: "breather" level with generous moves (peak-valley pacing)

---

## 4. Level-Clear Celebration ("Word Crush")

### Candy Crush Reference: Sugar Crush

When a level is completed:
1. Voice announces "Sugar Crush!" with text overlay
2. All remaining special candies activate sequentially (top-left to bottom-right)
3. Activation order: coconut wheel, UFO, wrapped, striped, color bombs
4. Remaining moves convert to striped candies (~4 per 5 moves), which then fire
5. Each remaining move = 6,000 base points + cascading effects
6. "Super Sugar Crush" triggers if you complete on your LAST move
7. Score counter rapidly ticks up during the sequence
8. Total celebration lasts 3-8 seconds depending on remaining specials

Key insight: Sugar Crush turns leftover moves into a BONUS SPECTACLE. It rewards efficiency and creates "I want to see what happens with 10 spare moves" motivation.

### Blast Mode Adaptation: "Word Crush"

**Sequence (P0)**:

```
1. OBJECTIVE COMPLETE
   - "WORD CRUSH!" announcement (voice + text + screen flash)
   - 0.5s dramatic pause with gold vignette

2. SPECIAL TILE FIREWORKS (2-4 seconds)
   - All remaining special tiles on board activate automatically
   - Activation order: bombs first (explosions), then lightning (bolts),
     then prisms (cross-clears), then gems (collection sparkle)
   - Each activation staggers 200ms apart for visual rhythm
   - Cascading chain reactions allowed (bombs trigger adjacent specials)

3. REMAINING MOVES BONUS (1-3 seconds)
   - Each unused move converts 1 random standard tile into a special tile
   - Converted tiles then activate (same sequence as step 2)
   - Score popup per conversion: "BONUS +[score]"
   - Conversion rate: 1 special tile per remaining move

4. SCORE TALLY (1-2 seconds)
   - Final score counter rapidly ticks up (satisfying counting sound)
   - Star rating reveals with pop animation (1, 2, or 3 stars)
   - If 3 stars: extra confetti + "PERFECT!" overlay

5. RESULTS PANEL (slides up)
   - Words found, tiles cleared, best word, combo stats
   - "Next Wave" button with gentle pulse
```

**Super Word Crush (P1)**: If player completes objective on their LAST MOVE:
- Extra dramatic pause (0.8s)
- Screen shake + golden explosion
- ALL standard tiles convert to random specials and fire
- 2x score bonus on entire Word Crush sequence
- Achievement: "By the Skin of Your Teeth"

### Word Crush Config

```typescript
interface WordCrushConfig {
  /** Delay between each special tile activation (ms) */
  activationStagger: number;     // 200ms
  /** Delay before moves-to-specials conversion starts (ms) */
  conversionDelay: number;       // 500ms
  /** Score per remaining move during conversion */
  moveConversionScore: number;   // 500 base
  /** Whether to enable Super Word Crush (last move completion) */
  superWordCrush: boolean;       // true
  /** Score multiplier during Super Word Crush */
  superMultiplier: number;       // 2.0
}
```

---

## 5. Progression & Map

### Candy Crush Reference

- **Saga Map**: Linear path of levels, visually themed in episodes (15 levels each)
- **Episodes**: Visual themes change every 15 levels (candy kingdom, chocolate mountains, etc.)
- **Star display**: Each completed level shows 1-3 stars on the map
- **Social**: Friends' avatars visible on the map (competitive motivation)
- **Difficulty curve**: Peak-valley pacing — hard "pinch" levels followed by 5-6 easier ones
- **Replay motivation**: Incomplete stars create "I can do better" pull
- **Gates**: Originally had friend-gates (removed); episodes still have visual transitions

Key insight: The map creates a sense of JOURNEY. Players aren't just playing levels — they're traveling through a world. Stars on completed levels provide satisfaction and replay motivation.

### Blast Mode Adaptation

**Wave Map (P1)**:

Instead of the current plain wave counter, create a visual path/map:

```
Wave Map Layout (horizontal scroll):

  [1]---[2]---[3]---[4]---[5]---[6]---[7]-->
  ***    **    *     ???   ???   ???   ???

  [1] = Completed, 3 stars (gold node)
  [2] = Completed, 2 stars (silver node)
  [3] = Completed, 1 star (bronze node)
  [4] = Current wave (pulsing, highlighted)
  [5+] = Locked (dark, silhouette)
```

**Visual Themes per Episode (P2)**:

| Waves | Theme | Visual Motifs |
|---|---|---|
| 1-5 | Alphabet Academy | Books, pencils, chalkboard |
| 6-10 | Word Volcano | Lava, volcanic rocks, fire |
| 11-15 | Crystal Caverns | Ice crystals, gems, stalactites |
| 16-20 | Lightning Library | Electric, neon, Tesla coils |
| 21+ | Infinite Lexicon | Cosmic, infinite, stars |

**Star-Based Unlocks (P1)**:

Stars from completed waves accumulate and unlock rewards:

| Stars | Unlock |
|---|---|
| 5 | New tile skin: "Neon" |
| 15 | Hint system upgrade: +1 free hint per wave |
| 30 | New grid background: "Volcanic" |
| 50 | Special starting bonus: begin wave with 1 random special tile |
| 75 | New tile skin: "Crystal" |
| 100 | Title: "Wordsmith" |

**Replay Motivation (P0)**:

- Show best score + star count for each completed wave
- "Improve" button on waves with < 3 stars
- Weekly challenge: "3-star waves 1-5 for bonus coins"
- Leaderboard per wave (friends + global)

---

## 6. Satisfaction & Juice

### Candy Crush Reference

What makes Candy Crush FEEL good:
- **Excessive output for minimal input**: One swap triggers cascading explosions
- **Sound design**: Ascending pitch for chains, distinct sounds per candy type
- **Screen shake**: Board shakes on big combos, scaled to explosion size
- **Particle density**: Hundreds of particles on color bomb combos
- **Timing**: 200-300ms pause before big explosions (anticipation builds)
- **Sequential activation**: Specials fire one after another (not all at once) for rhythm
- **Color saturation**: Bright, saturated candy colors pop against neutral board
- **Voice reactions**: "Sweet!", "Tasty!", "Divine!" for escalating combos

### Blast Mode Gaps & Recommendations

We already have many juice elements (hit-stop, time dilation, idle breathing, trail effects). The gaps:

**P0: Sequential Activation Rhythm**
- Currently, multiple tile effects fire simultaneously. Should stagger 150-250ms.
- Each activation should have a distinct "beat" — boom... boom... BOOM (escalating).
- Camera should follow the action (subtle pan toward active effects).

**P0: Anticipation Pause**
- Add 200ms "freeze frame" before big combo effects trigger.
- During freeze: dim surroundings, highlight the combo tiles, play a charging sound.
- Release with explosive effect + screen shake scaled to combo power.

**P0: Ascending Feedback Scale**
- Current combo milestones: "NICE!" through "GODLIKE!".
- Add escalating screen effects per level:
  - Combo 2-3: Subtle screen pulse
  - Combo 4-5: Edge glow intensifies
  - Combo 6-7: Background color shifts
  - Combo 8+: Full screen distortion + confetti

**P1: Voice/Sound Reactions**
- Add word-themed voice lines for combo milestones:
  - 3-combo: "Nice word!"
  - 5-combo: "Incredible!"
  - 7-combo: "Unstoppable!"
  - 10-combo: "LEGENDARY!"
- Ascending musical pitch for consecutive word submissions.
- Distinct sound per special tile activation (bomb = deep boom, lightning = electric crack, gem = crystalline chime).

**P1: Board Clear Satisfaction**
- When >80% of board is cleared: board "shatters" into fragments that fall offscreen.
- Confetti burst scales with clear percentage (50% = light, 80% = heavy, 100% = insane).
- Score counter "slot machine" effect on results screen.

**P2: Near-Miss Feedback**
- When player is 1 zone cell away from completing objective: pulsing arrow pointing to remaining cell.
- When 1 move left: dramatic music shift + time-slow on word selection.
- "So close!" animation if failing with >90% progress.

---

## Implementation Priorities

### P0 — Must Have (Core Loop Enhancement)

| Feature | Effort | Impact | Files |
|---|---|---|---|
| Level Objectives: Score Target | S | High | `types.ts`, `useBlastGame.ts` |
| Level Objectives: Clear Zones | M | Very High | `types.ts`, `useBlastGame.ts`, `BlastTile.ts` |
| Level Objectives: Tile Hunt | M | High | `types.ts`, `useBlastGame.ts`, new UI component |
| Move Counter | M | Very High | `types.ts`, `useBlastGame.ts`, new UI component |
| Word Crush Celebration | L | Very High | New `WordCrushSequence.ts`, `BlastScene.ts` |
| Tile Combo: Bomb+Bomb | S | High | `useBlastGame.ts`, `BlastTileRules.ts` |
| Tile Combo: Bomb+Lightning | S | High | `useBlastGame.ts`, `BlastTileRules.ts` |
| Tile Combo: Lightning+Lightning | S | Medium | `useBlastGame.ts`, `BlastTileRules.ts` |
| Sequential Activation Rhythm | S | High | `CascadeSequencer.ts`, `BlastScene.ts` |
| Anticipation Pause | S | High | `BlastScene.ts`, `LetterTile.ts` |
| Replay / Star Improvement | S | High | Results UI, `blastStarCalculator.ts` |

### P1 — Should Have (Depth & Polish)

| Feature | Effort | Impact | Files |
|---|---|---|---|
| Level Objectives: Letter Drop | L | Medium | `types.ts`, `useBlastGame.ts`, gravity system |
| Level Objectives: Mixed | M | Medium | `types.ts`, `useBlastGame.ts` |
| Gold + Special combos | S | Medium | `useBlastGame.ts` |
| Rainbow + Bomb/Lightning combos | M | High | `useBlastGame.ts`, `BlastTileRules.ts` |
| Prism + Prism combo | S | Medium | `useBlastGame.ts` |
| Super Word Crush (last move) | M | High | `WordCrushSequence.ts` |
| Wave Map visualization | L | High | New component |
| Star-Based Unlocks | M | Medium | New system |
| Voice/Sound Reactions | M | High | Audio assets + integration |
| Board Clear Satisfaction | S | Medium | `BlastScene.ts` |
| Ascending Feedback Scale | S | Medium | `BlastScene.ts`, `ComboTracker.ts` |

### P2 — Nice to Have (Delight)

| Feature | Effort | Impact | Files |
|---|---|---|---|
| Gem + Gem combo | S | Low | `useBlastGame.ts` |
| Magnet + Bomb combo | M | Low | `useBlastGame.ts` |
| Wildcard + Special combo | S | Low | `useBlastGame.ts` |
| Visual Theme Episodes | L | Medium | Art assets + theming system |
| Combo Discovery Catalog | M | Medium | New UI component |
| Near-Miss Feedback | S | Medium | `BlastScene.ts`, `useBlastGame.ts` |
| Weekly Star Challenges | M | Medium | Backend + UI |
| Per-Wave Leaderboards | M | Medium | Backend + UI |

### Effort Key
- **S** = Small (1-2 days)
- **M** = Medium (3-5 days)
- **L** = Large (1-2 weeks)

---

## Recommended Implementation Order

### Sprint 1: Core Pressure Loop
1. Move counter system (creates urgency)
2. Score target objective (simplest objective)
3. Clear Zones objective (most impactful new mechanic)
4. Basic tile combos (bomb+bomb, bomb+lightning, lightning+lightning)

### Sprint 2: Celebration & Reward
5. Word Crush celebration sequence
6. Tile Hunt objective
7. Sequential activation rhythm + anticipation pause
8. Star improvement / replay motivation

### Sprint 3: Depth & Spectacle
9. Mixed objectives
10. Rainbow/Gold combos
11. Wave map visualization
12. Voice/sound reactions

### Sprint 4: Polish & Delight
13. Letter Drop objective
14. Super Word Crush
15. Star-based unlocks
16. Combo discovery catalog

---

## Key Design Principles (from Candy Crush analysis)

1. **Excessive reward for minimal input** — One good word should trigger cascading spectacle
2. **Peak-valley difficulty** — Hard waves followed by easy ones prevents burnout
3. **Objective variety prevents staleness** — Same grid, different goals = different game
4. **Moves create strategic tension** — Not time pressure (frantic), but move pressure (thoughtful)
5. **End-of-level celebration rewards efficiency** — More spare moves = bigger fireworks
6. **Sequential effects, not simultaneous** — Rhythm and pacing make spectacle readable
7. **Anticipation before impact** — A brief pause before big effects doubles the satisfaction
8. **Stars create replay loops** — "I got 2 stars, I can get 3" is powerful motivation
9. **Combinations are multiplicative** — Two specials together should feel like discovering a cheat code
10. **Near-miss motivation** — Losing by 1 cell / 1 move drives "one more try" better than losing badly

---

## Research Sources

- [Special Candy Combinations Guide](https://www.withoutthesarcasm.com/posts/candy-crush-saga-special-candy-combos/)
- [Level Types - Candy Crush Wiki](https://candycrush.fandom.com/wiki/Level_Types)
- [Sugar Crush - Candy Crush Wiki](https://candycrush.fandom.com/wiki/Sugar_Crush)
- [Special Candies - Official Help](https://candycrush.zendesk.com/hc/en-us/articles/360000754697-Learn-all-about-Special-Candies)
- [Candy Crush Game Breakdown](https://fayejstover.medium.com/game-breakdown-candy-crush-1d89f4f930f1)
- [Game Juice Design Analysis](https://www.gameanalytics.com/blog/squeezing-more-juice-out-of-your-game-design)
- [Candy Crush Formula of Addiction](https://medium.com/@gameproducer/candy-crush-saga-formula-of-addiction-2b35f49261d0)
- [Rethinking Progression in Mobile Puzzle Games](https://www.gamedeveloper.com/design/rethinking-progression-in-mobile-puzzle-games)
- [Mixed Mode Levels - Candy Crush Wiki](https://candycrush.fandom.com/wiki/Mixed_Mode_levels)
- [Extra Moves - Candy Crush Wiki](https://candycrush.fandom.com/wiki/Extra_Moves)
- [Moves - Candy Crush Wiki](https://candycrush.fandom.com/wiki/Moves)
- [Difficulty - Candy Crush Wiki](https://candycrush.fandom.com/wiki/Difficulty)
