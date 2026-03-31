# Word Forge — A New Game Mode

> **"Spell words. Collect runes. Break the score."**

A standalone roguelike mode in LexiClash. Not an adventure expansion — a separate mode on the main menu alongside Classic, Multiplayer, Adventure, etc.

---

## The Core Formula (one sentence)

**Word Score = Letter Points × Word Length Bonus × Rune Multipliers**

That's it. Everything in the mode modifies this formula.

---

## The Loop (30 seconds to learn)

```
1. SPELL    →  Find words on a Boggle grid to hit a target score
2. PICK     →  Choose 1 of 3 Rune Cards (modifiers that change scoring rules)
3. REPEAT   →  Target goes up. Your runes stack. You get more powerful.
4. BOSS     →  Every 3 rounds, a boss imposes a constraint
5. DIE      →  Miss the target = run over. Unlock new runes for next run.
```

**A run is 8-12 rounds. ~10-15 minutes on mobile.**

---

## Round Structure

Each round:
- You get a **5×5 Boggle grid** (letters randomized, weighted by frequency)
- You have **60 seconds** to find words
- Each word scores: `letter points × length bonus`
- Your **Rune Cards** modify every word's score automatically
- Hit the **target score** → advance. Miss → run over.

### Scoring Basics

| Word Length | Length Bonus |
|-------------|-------------|
| 3 letters   | ×1          |
| 4 letters   | ×1.5        |
| 5 letters   | ×2          |
| 6 letters   | ×3          |
| 7 letters   | ×5          |
| 8+ letters  | ×8          |

Letter points use Scrabble-like values (E=1, Q=10, etc.)

Example: "QUEST" = (10+1+1+1+1) × 2 = **28 points**

### Target Scaling

| Round | Target | Feeling |
|-------|--------|---------|
| 1     | 50     | Easy, learn the grid |
| 2     | 80     | Still easy |
| 3     | 120    | **BOSS ROUND** |
| 4     | 160    | Need runes now |
| 5     | 220    | Getting harder |
| 6     | 300    | **BOSS ROUND** |
| 7     | 400    | Rune synergies critical |
| 8     | 550    | Sweating |
| 9     | 750    | **FINAL BOSS** |
| 10+   | +40%   | Endless (optional) |

By round 7-8, you CANNOT hit the target with raw words alone. Your runes must carry you. This is the Balatro moment — the math breaks open.

---

## Rune Cards — The Heart of the Mode

After each non-boss round, you see **3 random Rune Cards**. Pick 1. That's your reward.

Runes are passive — they automatically modify scoring for every word you play. You can hold **up to 5 runes** (no more). If you're full, picking a new one means discarding an old one.

### Rune Types (4 categories, ~60 at launch)

#### 📊 Chip Runes (+Points)
Add flat points to your score.
- **Vowel Miner**: +3 points per vowel in word
- **Rare Finder**: +5 points per rare letter (J,K,Q,X,Z)
- **Double Down**: +8 points if word has double letters (ee, ll, ss)
- **First Blood**: +15 points on first word of each round
- **Ice Breaker**: +10 points when using a frozen tile
- **Long Haul**: +2 points per letter beyond the 4th

#### 🔥 Mult Runes (×Multiplier)
Multiply your word score. **This is where runs get broken.**
- **Word Smith**: ×1.5 for 5+ letter words
- **Speed Demon**: ×2 if word found within 3 seconds
- **Combo Fire**: ×1.2 per consecutive word (resets on pause) — stacks!
- **Critical Hit**: 20% chance of ×3 on any word
- **Palindrome Power**: ×4 for palindromes
- **Alliteration**: ×2 if word starts with same letter as previous word

#### 🌀 Special Runes (change the rules)
- **Echo**: Last letter of each word scores twice
- **Chain Link**: If word starts with the last letter of previous word, ×2
- **Gold Rush**: Gold tiles appear on grid. Using them gives +20 points
- **Time Warp**: +10 seconds per round
- **Hint Whisper**: One word is highlighted on the grid at round start
- **Big Grid**: Grid becomes 6×6 (more letters = more possibilities)

#### 💀 Cursed Runes (powerful + drawback)
- **Berserker**: ×3 mult but timer is 40 seconds instead of 60
- **Tunnel Vision**: ×4 for 7+ letter words, but 3-4 letter words score 0
- **Gambler**: Every word has 50% chance of ×5 or ×0
- **Glass Cannon**: ×2 to everything, but miss one round target = instant death

### Rune Rarity

| Rarity | Border Color | How Common | Power Level |
|--------|-------------|------------|-------------|
| Common | Gray | 60% of offerings | Small bonuses |
| Rare | Purple (#8B5CF6) | 30% | Strong effects |
| Legendary | Gold (#FFD700) | 10% | Run-defining |

On round 1, you only see Common runes. Rare appear from round 3+. Legendary from round 6+.

### How Runes Stack (the "aha" moment)

Round 1: You pick "Vowel Miner" (+3 per vowel). Nice.
Round 2: You pick "Word Smith" (×1.5 for 5+ letters). Good combo.
Round 4: You pick "Combo Fire" (×1.2 per consecutive word). NOW you're cooking.
Round 5: You pick "Echo" (last letter scores twice). Combined with Vowel Miner, if the last letter is a vowel, you get +6 from it.
Round 7: You pick "Critical Hit" (20% ×3). On a lucky crit with all your other runes active, a 6-letter word that'd normally score 30 now scores 30 × 3 × 1.5 × 1.2 × 1.2 = **194 points** from one word.

That escalation from 30 → 194 IS the game. That's the power fantasy.

---

## Boss Rounds (every 3 rounds)

Boss rounds have the same "hit the target" goal, but the boss adds a **constraint** that changes how you play.

### Boss Constraints (~15 at launch)

**Letter Constraints:**
- **The Censor**: All vowels are worth 0 points (rely on your mult runes!)
- **The Abbreviator**: Only 3-4 letter words count
- **The Purist**: Only 6+ letter words count
- **The Banisher**: One common letter (E, S, T, or A) is removed from the grid

**Grid Constraints:**
- **The Fog**: Half the tiles are face-down, reveal when adjacent tile is used
- **The Rot**: 3 random tiles turn to stone every 15 seconds
- **The Shuffle**: Grid rearranges every 20 seconds
- **The Shrink**: Grid is 4×4 instead of 5×5

**Scoring Constraints:**
- **The Wall**: Target is 2× normal
- **The Clock**: Timer is 30 seconds instead of 60
- **The Thief**: Each word costs 5 points (net scoring)
- **The Escalator**: Target increases by 5% after each word you play

**Rune Constraints:**
- **The Nullifier**: Your first 2 rune slots are disabled this round
- **The Inverter**: Chip runes are disabled, only mult runes work

After beating a boss, you get to pick from **3 Rare+ runes** (better than normal offerings). Boss rewards feel special.

---

## Meta-Progression (between runs)

### Unlocks

Every run earns **Forge XP** (win or lose, based on highest round reached + words found). XP unlocks:

| XP Threshold | Unlock |
|--------------|--------|
| 100 | 5 new Common runes added to the pool |
| 300 | Rare runes can now appear |
| 600 | 5 new Rare runes added |
| 1000 | Legendary runes can now appear |
| 1500 | Cursed runes can now appear |
| 2000 | 6th rune slot unlocked |
| 3000 | Boss Rush mode (bosses every round) |
| 5000 | Endless mode (no run limit) |
| 8000 | 7th rune slot unlocked |

**First 3-5 runs**: You see maybe 15 of the 60 runes. The pool is small and learnable.
**After 20+ runs**: Full pool unlocked. Now you're hunting for specific synergies.

### Daily Forge

One seeded run per day. Same grid, same rune offerings for everyone. Global leaderboard. Rewards bonus XP.

### Streak Bonus

Consecutive daily plays increase XP multiplier: Day 1 = ×1, Day 3 = ×1.5, Day 7 = ×2.

---

## UI Design

### In-Round Screen (where you spend 90% of your time)

```
┌──────────────────────────────────┐
│  ROUND 5        ⏱️ 47s   💰 220 │  ← Round, timer, current score
│  ▓▓▓▓▓▓▓░░░░  220/300           │  ← Progress bar toward target
│                                  │
│  ┌────────────────────────┐      │
│  │  B  R  A  V  E        │      │
│  │  L  I  N  E  S        │      │  ← 5×5 Boggle grid
│  │  T  O  W  E  R        │      │     (drag to form words)
│  │  H  A  M  P  S        │      │
│  │  G  U  I  L  D        │      │
│  └────────────────────────┘      │
│                                  │
│  BRAVE → 28 pts (×1.5) = 42 ✨  │  ← Last word scored + rune effects
│                                  │
│  [🔷][🔥][🌀][💎][  ]           │  ← Rune bar (5 slots, tap to inspect)
└──────────────────────────────────┘
```

Key principles:
- Grid dominates the screen (this is a word game first)
- Score feedback is immediate — see the math after each word
- Rune bar is small but tappable for details
- Timer is prominent but not stressful (60s is generous)

### Pick-a-Rune Screen (after each round)

```
┌──────────────────────────────────┐
│        CHOOSE YOUR RUNE         │
│                                  │
│  ┌────────┐ ┌────────┐ ┌──────┐│
│  │  🔷    │ │  🔥    │ │ 🌀   ││
│  │ VOWEL  │ │ COMBO  │ │ ECHO ││
│  │ MINER  │ │ FIRE   │ │      ││
│  │        │ │        │ │      ││
│  │+3/vowel│ │×1.2/   │ │Last  ││
│  │        │ │combo   │ │letter ││
│  │ Common │ │ Rare   │ │scores ││
│  │        │ │        │ │twice  ││
│  └────────┘ └────────┘ └──────┘│
│                                  │
│  YOUR RUNES: [🔷][🔥][ ][ ][ ] │
│              Tap a card to pick  │
│                                  │
│  ──── or ────                    │
│  [ SKIP (+5 bonus pts next rnd) ]│
└──────────────────────────────────┘
```

Key principles:
- **3 cards, pick 1**. Simplest possible decision.
- Each card shows: icon, name, effect, rarity. That's all.
- If rune slots are full, picking shows "replace which rune?" overlay
- Skip option gives a small consolation bonus (like Balatro's skip-blind tag)

### Boss Constraint Screen (before boss rounds)

```
┌──────────────────────────────────┐
│                                  │
│         ⚠️ BOSS ROUND ⚠️        │
│                                  │
│     ┌──────────────────────┐     │
│     │    💀 THE CENSOR 💀   │     │
│     │                      │     │
│     │  "All vowels are     │     │
│     │   worth 0 points"    │     │
│     │                      │     │
│     │  Target: 300         │     │
│     └──────────────────────┘     │
│                                  │
│  💡 Tip: Your mult runes still   │
│     work! Focus on consonant-    │
│     heavy words.                 │
│                                  │
│       [ READY ]                  │
└──────────────────────────────────┘
```

Key principles:
- Constraint is CLEAR — one sentence, no ambiguity
- Tip helps new players without patronizing experienced ones
- Single "READY" button — no choices, just mental preparation

### Run Over Screen

```
┌──────────────────────────────────┐
│                                  │
│         RUN COMPLETE             │
│                                  │
│    Reached: Round 7 / 9          │
│    Best Word: QUILTERS (86 pts)  │
│    Words Found: 34               │
│    Total Score: 1,847            │
│                                  │
│    Forge XP: +127 ⭐             │
│    Progress: ▓▓▓▓▓▓░░ 1240/1500 │
│    Next Unlock: Cursed Runes!    │
│                                  │
│    YOUR RUNES THIS RUN:          │
│    [🔷 Vowel Miner]             │
│    [🔥 Combo Fire]              │
│    [🌀 Echo]                    │
│    [💎 Critical Hit]            │
│    [💀 Glass Cannon]            │
│                                  │
│    [ TRY AGAIN ]  [ MAIN MENU ] │
└──────────────────────────────────┘
```

---

## Visual Design Direction

### Aesthetic: "Neon Forge"

The existing LexiClash neo-brutalist style with a darker, more intense sub-theme for this mode:

- **Background**: Deeper than normal — #0A0A1A instead of #1a1a2e
- **Accent**: Molten gold (#FFD700) and ember orange (#FF6B35) — forge/fire theme
- **Rune cards**: Cream background, 4px black border, hard shadow — standard neo-brutalist cards
- **Rarity glow**: Rarity color as inner border glow (gray/purple/gold) — NOT blurred, use solid colored inset border
- **Grid**: Standard LexiClash game board frame — cream, thick black border, hard shadow
- **Score popups**: Gold numbers with impact lines — like existing `animate-score-pop`
- **Boss screen**: Red/pink vignette (using existing neo-red), constraint card rises from bottom

### Animations (using existing system)

| Moment | Animation | Existing? |
|--------|-----------|-----------|
| Word found | Score pop + fly to progress bar | ✅ `animate-score-pop`, `animate-coin-fall` |
| Rune triggers | Card lifts briefly, glow pulse | 🆕 Simple spring (framer-motion) |
| Pick a rune | 3 cards fan in from top | 🆕 Staggered `animate-neo-slide-in` |
| Boss reveal | Card rises from bottom, screen dims | 🆕 `animate-neo-pop` + overlay |
| Hit target | Progress bar overflows, confetti | ✅ Existing victory effects |
| Run over | Fade + summary slide in | ✅ `animate-fade-in-up` |
| Rune discard | Card burns (shrink + fade + orange glow) | 🆕 Simple CSS animation |

**Principle**: Use existing animation system. Only add new ones where absolutely needed. Mark Brown's lesson: "cut art before cutting mechanics."

### Score Feedback (the satisfying bit)

When a word scores, show the math briefly:

```
"BRAVE" → 11 pts × 2.0 × 1.5 = 33 ✨
           base    length  Combo Fire
```

This teaches players HOW their runes work without a tutorial. They see the multiplication chain in real-time.

For ×Mult triggers specifically: the number should **flash red (#FF3366)** and scale up briefly, matching Balatro's red mult flash. This color-coding (blue/cyan for chips, red for mult, gold for total) becomes instinctive.

---

## What This Mode Does NOT Have

Keeping scope tight. These are explicitly cut:

- ❌ No shop / currency / gold economy (pick-1-of-3 is simpler and works)
- ❌ No branching map / path choices (just: round → pick → round → pick)
- ❌ No tile enhancements / deck manipulation (grid is fresh each round)
- ❌ No character classes / companions (one mode, one loop)
- ❌ No rune ordering (all runes apply simultaneously — ordering is a v2 feature)
- ❌ No vouchers / consumables (runes are the only system)
- ❌ No story / narrative / cinematics (pure gameplay)
- ❌ No multiplayer (solo only at launch)

Each of these could be a v2/v3 addition. But v1 ships with the tightest possible loop.

---

## Implementation Scope

### New Files Needed (~15-20)

**Types:**
- `types/wordForge.ts` — RunState, RuneCard, RuneEffect, BossConstraint, RunResult

**Game Logic:**
- `lib/wordForge/scoring.ts` — Word tier scoring with rune evaluation
- `lib/wordForge/runeCards.ts` — Rune card definitions (60 cards)
- `lib/wordForge/runeEngine.ts` — Apply runes to a word score
- `lib/wordForge/bossConstraints.ts` — 15 constraint definitions + application
- `lib/wordForge/runManager.ts` — Run state machine (round progression, rune offerings, boss scheduling)
- `lib/wordForge/metaProgression.ts` — XP calculation, unlock thresholds

**Hooks:**
- `hooks/useWordForgeRun.ts` — Main run state hook
- `hooks/useWordForgeScoring.ts` — Per-word scoring with rune application
- `hooks/useRuneSelection.ts` — Pick-1-of-3 flow

**Components:**
- `components/wordForge/WordForgeGame.tsx` — Main game screen (grid + HUD)
- `components/wordForge/RuneBar.tsx` — 5-slot rune display (bottom of game screen)
- `components/wordForge/RuneCard.tsx` — Single rune card (used in bar + picker)
- `components/wordForge/RunePicker.tsx` — Pick-1-of-3 screen
- `components/wordForge/BossReveal.tsx` — Boss constraint screen
- `components/wordForge/RunSummary.tsx` — End-of-run results
- `components/wordForge/ScoreFeedback.tsx` — Per-word score breakdown popup

**API:**
- `app/api/word-forge/complete/route.ts` — Save run results + XP

**Reuses from existing codebase:**
- Grid component (AdventureGrid / LevelGrid)
- Timer (AdventureTimer)
- Word validation (useAdventureWordValidation)
- Letter generation (existing grid generation utils)
- Tile components (AdventureTile)
- Progress bar (Progress component)
- Victory/defeat effects
- Translation system (t())
- Supabase persistence

---

## v2 Ideas (after v1 ships and we have player data)

- Shop with gold economy (replace pick-1-of-3)
- Rune ordering matters (left-to-right evaluation)
- Tile enhancements (gold tiles, cursed tiles on the grid)
- Branching map (Slay the Spire paths)
- Character classes (different starting runes)
- Weekly challenges (fixed seed + specific rune pool)
- Rune collection gallery (gotta catch 'em all)
- Multiplayer forge (same seed, race to highest round)
- Ascension mode (20 difficulty tiers like Slay the Spire)
