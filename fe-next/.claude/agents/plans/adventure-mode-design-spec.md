# LexiClash Single Player Progression System - Design Plan

## Executive Summary

Transform LexiClash's single player from a preset-based casual experience into an engaging, progression-driven adventure with levels, story elements, and visual evolution.

**Mode Strategy**: Adventure mode will COEXIST alongside Practice/Challenge/Bots
**Narrative Style**: LIGHT (themed worlds with flavor text, no cutscenes)

---

## UI MOCKUPS (Portrait Mode - 9:16)

### Screen 1: World Map (Floating Islands Style)

```
┌────────────────────────────────────┐
│  ⭐ 47          WORD REALMS    ⚙️  │
│  ════════════════════════════════  │
│    ☁️         ☁️         ☁️        │
│       📖✨         📚✨             │
│  ┌─────────────────────────────┐   │
│  │   ☁ GOLDEN THRONE ☁  🔒    │   │
│  │   ═══════════════════       │   │
│  └─────────────────────────────┘   │
│           ╲   ╱  (golden bridge)   │
│  ┌─────────────────────────────┐   │
│  │ 🏔️ CRYSTAL CAVES           │   │
│  │  A─B─C─D─E─F─G─H─I─J       │   │
│  │  ⭐⭐⭐ ⭐⭐☆ 🔒🔒🔒🔒     │   │
│  └─────────────────────────────┘   │
│     📜     ╲   ╱     ✨            │
│  ┌─────────────────────────────┐   │
│  │ 🌲 ROOT CAVERNS ⭐⭐⭐       │   │
│  │  A─B─C─D─E─F─G─H─I─J ✓     │   │
│  └─────────────────────────────┘   │
│          ╲   ╱                     │
│  ┌─────────────────────────────┐   │
│  │ 🌊 SYNONYM SPRINGS ⭐⭐⭐    │   │
│  │  A─B─C─D─E─F─G─H─I─J ✓     │   │
│  └─────────────────────────────┘   │
│     📚     ╲   ╱     🔤            │
│  ┌─────────────────────────────┐   │
│  │ 🌸 ALPHABET MEADOWS ⭐⭐⭐   │   │
│  │  A─B─C─D─E─F─G─H─I─J ✓     │   │
│  └─────────────────────────────┘   │
│                                    │
│  ┌──────────────────────────────┐  │
│  │ ▶ PLAY: Crystal Caves Lv.7  │  │
│  └──────────────────────────────┘  │
│         ⭐ 47/100 Stars            │
└────────────────────────────────────┘

VISUAL STYLE:
- Floating word-themed islands on cloudy/starry background
- Golden bridges connecting islands (made of letters)
- Parallax scrolling with floating books, pencils, scrolls
- Each island has unique world theme and color palette
- Letter blocks (A-J) scattered across each island
- Completed worlds show checkmark, locked show 🔒
```

### Screen 2: Gameplay (with Special Tiles)

```
┌────────────────────────────────────┐
│  WORLD 4: CRYSTAL CAVES - Level 7  │
│  ══════════════════════════════════│
│                                    │
│  ┌─────────┐  Find 12 words        │
│  │ ⏱ 1:24  │  ████████░░ 8/12     │
│  │ ⭐ 340  │                       │
│  └─────────┘  Clear 4 ice blocks   │
│               ████░░░░░░ 2/4       │
│                                    │
│  ┌─────────────────────────────┐   │
│  │                             │   │
│  │   S   U✨  N   🧊  L        │   │
│  │                             │   │
│  │   A   R💣  O   W   E        │   │
│  │                             │   │
│  │   M   🧊  T   R   N        │   │
│  │                             │   │
│  │   P   L   A   C   🧊        │   │
│  │                             │   │
│  │   D   O   G   H   Y        │   │
│  │                             │   │
│  └─────────────────────────────┘   │
│                              ┌───┐ │
│  Current: S-U-N-F-L-O-W-E-R  │🐱│ │
│  ═══════════════════════════ │   │ │
│                              │Lexi│
│  Words: SUN, FLOWER, DOG,    └───┘ │
│         PLACE, SAMPLE...           │
│                                    │
│  ┌────────────────────────────┐    │
│  │  🎯 ABILITY: Thread        │    │
│  │      Ready to use ✓        │    │
│  └────────────────────────────┘    │
└────────────────────────────────────┘

TILE LEGEND:
┌───┐
│ A │  = Standard tile (stone/cream)
└───┘
┌───┐
│U✨│  = GOLD 3X (metallic gold + sparkle)
└───┘
┌───┐
│R💣│  = BOMB (clears entire row)
└───┘
┌───┐
│🧊 │  = ICE (frozen, use adjacent to clear)
└───┘
┌───┐
│🌈 │  = RAINBOW (wildcard, any letter)
└───┘
```

### Screen 3: Cascade / Chain Reaction

```
┌────────────────────────────────────┐
│                                    │
│        ╔════════════════╗          │
│        ║  COMBO x3! ✨  ║          │
│        ╚════════════════╝          │
│                                    │
│              +150                  │
│           +300                     │
│        +450                        │
│                                    │
│  ┌─────────────────────────────┐   │
│  │   ░░░░░░░░░░░░░░░░░░░░░░   │   │
│  │   ░  CONFETTI PARTICLES  ░  │   │
│  │   ░░░░░░░░░░░░░░░░░░░░░░   │   │
│  │                             │   │
│  │   ?   ?   ?   ?   ?        │   │
│  │         ↓ ↓ ↓ ↓             │   │
│  │   S   U   N   F   L        │   │
│  │         ↓ ↓ ↓               │   │
│  │   A   R   O   W   E        │   │
│  │                             │   │
│  │   M   E   T   R   N        │   │
│  │                             │   │
│  └─────────────────────────────┘   │
│                              ┌───┐ │
│  Letters cascading down!     │😆│ │
│  Auto-chain found: "METRO"   │   │ │
│                              │Lexi│
│  ╔═════════════════════════╗ └───┘ │
│  ║   CHAIN x4! 🔥🔥🔥🔥    ║       │
│  ╚═════════════════════════╝       │
└────────────────────────────────────┘
```

### Screen 4: Boss Battle

```
┌────────────────────────────────────┐
│  🐉 CRYSTAL DRAGON - BOSS BATTLE   │
│  ══════════════════════════════════│
│                                    │
│  HP: ████████████░░░░░░ 1200/1800  │
│                                    │
│  ┌─────────────────────────────┐   │
│  │                             │   │
│  │      ╭━━━━━━━━━━━━━╮        │   │
│  │     ╱  L E X I C O N ╲       │   │
│  │    ╱   ~~~~~~~~~~~    ╲      │   │
│  │   │   🐉 DRAGON 🐉    │     │   │
│  │   │   S Y N T A X     │     │   │
│  │    ╲  VOCABULARY     ╱      │   │
│  │     ╲_______________╱       │   │
│  │                             │   │
│  └─────────────────────────────┘   │
│                                    │
│  ┌─────────────────────────────┐   │
│  │   S   U   N   F   L        │   │
│  │   A   R   O   W   E        │   │
│  │   M   E   T   R   N        │   │
│  │   P   L   A   C   E        │   │
│  │   D   O   G   H   Y        │   │
│  └─────────────────────────────┘   │
│                              ┌───┐ │
│  💥 "AQUARIUM" dealt 150 dmg │😤│ │
│     (Root word bonus!)       │   │ │
│                              │Lexi│
│  ⏱ 01:30 remaining           └───┘ │
└────────────────────────────────────┘
```

### Screen 5: Level Complete

```
┌────────────────────────────────────┐
│                                    │
│         ╔═══════════════╗          │
│         ║ LEVEL COMPLETE ║          │
│         ╚═══════════════╝          │
│                                    │
│              ⭐⭐⭐                 │
│           ✨✨✨✨✨✨               │
│                                    │
│         ┌─────────────┐            │
│         │    🏆       │            │
│         │   Lexi     │            │
│         │   🐱       │            │
│         └─────────────┘            │
│                                    │
│  ┌──────────────────────────────┐  │
│  │  Score:     420 pts          │  │
│  │  Words:     15 found         │  │
│  │  Best:      SUNFLOWER (9)    │  │
│  │  Chains:    3 combos         │  │
│  │  ─────────────────────────   │  │
│  │  XP Earned: +125 XP          │  │
│  │  ████████████░░░░ 78% to 24  │  │
│  └──────────────────────────────┘  │
│                                    │
│  ┌────────────────────────────┐    │
│  │       NEXT LEVEL →         │    │
│  └────────────────────────────┘    │
│                                    │
│  ┌──────────┐  ┌──────────┐        │
│  │  REPLAY  │  │   MAP    │        │
│  └──────────┘  └──────────┘        │
└────────────────────────────────────┘
```

---

## TECHNICAL ARCHITECTURE

### System Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────┐
│                         CLIENT (Next.js)                            │
│  ┌───────────────────────────────────────────────────────────────┐  │
│  │                        APP ROUTER                              │  │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐            │  │
│  │  │ /adventure  │  │ /adventure/ │  │ /adventure/ │            │  │
│  │  │   (map)     │  │  [world]/   │  │   results   │            │  │
│  │  │             │  │  [level]    │  │             │            │  │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘            │  │
│  └─────────┼────────────────┼────────────────┼───────────────────┘  │
│            │                │                │                      │
│  ┌─────────┴────────────────┴────────────────┴───────────────────┐  │
│  │                     COMPONENTS                                 │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │  │
│  │  │  WorldMap    │  │  GameBoard   │  │  BossBattle  │         │  │
│  │  │  Component   │  │  Component   │  │  Component   │         │  │
│  │  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘         │  │
│  │         │                 │                 │                  │  │
│  │  ┌──────┴───────┐  ┌──────┴───────┐  ┌──────┴───────┐         │  │
│  │  │ LevelNode    │  │ SpecialTile  │  │ BossHP       │         │  │
│  │  │ StarRating   │  │ CascadeAnim  │  │ DamagePopup  │         │  │
│  │  │ WorldPath    │  │ ComboOverlay │  │ Mascot       │         │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘         │  │
│  └───────────────────────────────────────────────────────────────┘  │
│                               │                                     │
│  ┌────────────────────────────┴──────────────────────────────────┐  │
│  │                      HOOKS & CONTEXT                           │  │
│  │  ┌────────────────┐  ┌────────────────┐  ┌────────────────┐   │  │
│  │  │useProgression  │  │useAdventure    │  │useSpecialTiles │   │  │
│  │  │ - XP tracking  │  │ - Level state  │  │ - Tile effects │   │  │
│  │  │ - Level calc   │  │ - Objectives   │  │ - Cascades     │   │  │
│  │  │ - Unlocks      │  │ - Stars        │  │ - Combos       │   │  │
│  │  └────────────────┘  └────────────────┘  └────────────────┘   │  │
│  │                                                                │  │
│  │  ┌─────────────────────────────────────────────────────────┐  │  │
│  │  │              ProgressionProvider (Context)               │  │  │
│  │  │  - Player level, XP, unlocks                            │  │  │
│  │  │  - World/level progress                                  │  │  │
│  │  │  - Feature flags (beta gating)                          │  │  │
│  │  └─────────────────────────────────────────────────────────┘  │  │
│  └───────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────┬─────────────────────────────┘
                                        │
                                        ▼
┌───────────────────────────────────────────────────────────────────┐
│                         API LAYER                                  │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                    /api/adventure/*                          │  │
│  │  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐       │  │
│  │  │ GET /progress│  │POST /complete│  │ GET /levels  │       │  │
│  │  │              │  │              │  │              │       │  │
│  │  │ Fetch user   │  │ Submit level │  │ Get level    │       │  │
│  │  │ progression  │  │ results      │  │ config       │       │  │
│  │  └──────────────┘  └──────────────┘  └──────────────┘       │  │
│  └─────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────┬───────────────────────────┘
                                        │
                                        ▼
┌───────────────────────────────────────────────────────────────────┐
│                         DATABASE (Supabase)                        │
│  ┌─────────────────────────────────────────────────────────────┐  │
│  │                      TABLES                                  │  │
│  │                                                              │  │
│  │  ┌──────────────────┐      ┌──────────────────┐             │  │
│  │  │ player_progression│      │ level_completions │             │  │
│  │  ├──────────────────┤      ├──────────────────┤             │  │
│  │  │ user_id (PK)     │      │ id (PK)          │             │  │
│  │  │ level            │◄────►│ user_id (FK)     │             │  │
│  │  │ xp               │      │ world            │             │  │
│  │  │ current_world    │      │ level            │             │  │
│  │  │ current_level    │      │ stars            │             │  │
│  │  │ prestige         │      │ best_score       │             │  │
│  │  └──────────────────┘      │ best_words       │             │  │
│  │           │                │ completed_at     │             │  │
│  │           │                └──────────────────┘             │  │
│  │           │                                                  │  │
│  │           ▼                                                  │  │
│  │  ┌──────────────────┐      ┌──────────────────┐             │  │
│  │  │ player_unlocks   │      │ beta_testers     │             │  │
│  │  ├──────────────────┤      ├──────────────────┤             │  │
│  │  │ id (PK)          │      │ user_id (PK)     │             │  │
│  │  │ user_id (FK)     │      │ email            │             │  │
│  │  │ unlock_type      │      │ joined_at        │             │  │
│  │  │ unlock_id        │      │ is_active        │             │  │
│  │  │ unlocked_at      │      └──────────────────┘             │  │
│  │  └──────────────────┘                                       │  │
│  └─────────────────────────────────────────────────────────────┘  │
└───────────────────────────────────────────────────────────────────┘
```

### Component Hierarchy

```
app/[locale]/adventure/
│
├── page.tsx (World Map)
│   └── <WorldMap>
│       ├── <WorldHeader>
│       │   ├── <StarCount>
│       │   └── <PlayerLevel>
│       ├── <WorldPath>
│       │   └── <LevelNode> (×100)
│       │       ├── <LetterBlock3D>
│       │       └── <StarRating>
│       ├── <WorldProgress>
│       └── <PlayButton>
│
├── [world]/[level]/page.tsx (Gameplay)
│   └── <AdventureGame>
│       ├── <LevelHeader>
│       │   ├── <Timer>
│       │   ├── <Score>
│       │   └── <ObjectiveTracker>
│       ├── <GameBoard>
│       │   ├── <Tile> (×25-49)
│       │   │   ├── <StandardTile>
│       │   │   ├── <GoldTile>
│       │   │   ├── <IceTile>
│       │   │   ├── <BombTile>
│       │   │   └── <RainbowTile>
│       │   └── <CascadeAnimation>
│       ├── <ComboOverlay>
│       │   ├── <ComboBanner>
│       │   ├── <ScorePopup>
│       │   └── <ConfettiParticles>
│       ├── <MascotCorner>
│       │   └── <Mascot variant={reaction}>
│       ├── <WordList>
│       └── <AbilityButton>
│
├── boss/[world]/page.tsx (Boss Battle)
│   └── <BossBattle>
│       ├── <BossHeader>
│       │   └── <BossHPBar>
│       ├── <BossCharacter>
│       │   └── <WordDragon>
│       ├── <GameBoard>
│       ├── <DamagePopups>
│       └── <MascotBattleMode>
│
└── results/page.tsx (Level Complete)
    └── <LevelResults>
        ├── <VictoryBanner>
        ├── <StarAnimation>
        ├── <ScoreSummary>
        ├── <XPProgress>
        └── <NavigationButtons>
```

---

## CORE GAMEPLAY MECHANICS

### 1. SPECIAL TILES

**3 Special Tile Types** (simple, memorable):

| Tile | Visual | What It Does | How to Earn |
|------|--------|--------------|-------------|
| **GOLD** ✨ | Shimmering gold | 3x score for this letter | Pre-placed / find 5-letter word |
| **BOMB** 💣 | Pulsing red | Clears entire row when used | Find 6-letter word |
| **RAINBOW** 🌈 | Color cycling | Wildcard (any letter) | Find 7-letter word |

### 2. OBSTACLES

**3 Obstacle Types**:

| Obstacle | Visual | Challenge | How to Clear |
|----------|--------|-----------|--------------|
| **ICE** 🧊 | Frosted overlay | Letter frozen, can't use | Use adjacent tile in a word |
| **CHAIN** ⛓️ | Metal chains | Letter chained to neighbor | Use BOTH chained letters in same word |
| **BLOCK** 🟫 | Solid brown | Empty space, no letter | Can't clear - plan around it |

### 3. CHAIN REACTIONS & CASCADES

**How Cascades Work:**
```
STEP 1: Player finds "STAR"
        ↓
STEP 2: S-T-A-R letters POP and disappear
        ↓
STEP 3: Letters above CASCADE down
        ↓
STEP 4: New random letters fill from top
        ↓
STEP 5: IF new arrangement has valid word...
        → AUTO-BONUS! Word highlights and clears
        → Chain continues until no auto-words
```

**Cascade Scoring:**

| Chain | Multiplier | Visual Effect |
|-------|------------|---------------|
| 1 word | 1x | Normal pop |
| 2 chain | 1.5x | "Nice!" banner |
| 3 chain | 2x | Screen pulse |
| 4 chain | 3x | Confetti burst |
| 5+ chain | 5x | LEGENDARY explosion |

### 4. LEVEL OBJECTIVES

**5 Objective Types**:

| Objective | Icon | Description |
|-----------|------|-------------|
| **Clear Ice** | 🧊 | Remove all ice blocks |
| **Score Target** | ⭐ | Reach X points |
| **Word Count** | 📝 | Find X words |
| **Collect Gems** | 💎 | Use tiles with gems |
| **Long Words** | 📏 | Find X words with 5+ letters |

### 5. BOSS BATTLES

**Every 10th level is a BOSS LEVEL**:

| World | Boss Name | Visual | Special Mechanic | HP |
|-------|-----------|--------|------------------|-----|
| 1 | **Ms. Grammar** | Grumpy teacher with red pen | -50 DMG on invalid words | 500 |
| 2 | **The Spelling Bee** | Grumpy bee with graduation cap | Long words (6+) deal 2x damage | 800 |
| 3 | **Professor Thesaurus** | Pompous owl with tiny glasses | Synonym pairs deal 3x damage | 1000 |
| 10 | **The Lexicon Dragon** | Epic crystal dragon | All mechanics combined | 5000 |

---

## WORLD DESIGN

### Complete World Structure

| # | World Name | Visual Theme | Mechanic | Board Background |
|---|------------|--------------|----------|------------------|
| 1 | **Alphabet Meadows** | Sunny pastoral | Standard play | Grass with letter flowers |
| 2 | **Synonym Springs** | Waterfalls | +25% for synonym pairs | Crystal water, reflections |
| 3 | **Root Caverns** | Underground crystals | Bonus for Latin/Greek roots | Glowing cave walls |
| 4 | **Idiom Archipelago** | Tropical islands | Hidden idiom challenges | Ocean with scattered islands |
| 5 | **Compound Canyon** | Desert cliffs | +30% for compound words | Red rock formations |
| 6 | **Anagram Labyrinth** | M.C. Escher-style maze | Solve anagrams for bonuses | Shifting geometry |
| 7 | **Mirror Palace** | Reflective surfaces | +50% for palindromes | Glass and chrome |
| 8 | **Neologism Nebula** | Space, stars | +40% for rare/new words | Starfield |
| 9 | **Polyglot Peaks** | Mountain summit | Multi-language word bonuses | Snow peaks, aurora |
| 10 | **The Lexicon Throne** | Golden library | All mechanics combined | Grand library interior |

### Level Structure Per World

```
World X (10 levels each)
├── Levels 1-3: Introduction (teach mechanic)
├── Levels 4-6: Challenge (apply mechanic)
├── Levels 7-9: Mastery (combine with previous)
└── Level 10: BOSS LEVEL (timed challenge)
```

### Star Requirements

| Stars | Requirement |
|-------|-------------|
| ⭐ Bronze | Complete level (find minimum words) |
| ⭐⭐ Silver | Find 70% of possible words |
| ⭐⭐⭐ Gold | Find 90%+ words within time bonus |

### Progression Gates

- Need 2 stars to unlock next level
- Need 15 stars to unlock next world
- Need 80 total stars to access World 10

---

## XP & PLAYER LEVELS

### XP Earning Formula

```
Base XP = (Words Found × 10) + (Longest Word × 25) + (Completion Bonus × 50)
Multipliers:
  × Difficulty (Easy: 1.0, Medium: 1.5, Hard: 2.0)
  × Daily First Game (+50%)
  × Prestige Level (+5% per prestige)
```

### Level Progression

| Level Range | XP Per Level | Title |
|-------------|--------------|-------|
| 1-10 | 500-1,500 | Apprentice |
| 11-20 | 2,000-4,000 | Journeyman |
| 21-30 | 5,000-8,000 | Adept |
| 31-40 | 10,000-15,000 | Expert |
| 41-50 | 20,000-30,000 | Master |

### Unlock Roadmap

| Level | Unlock |
|-------|--------|
| 1 | Basic Play |
| 5 | Hint System |
| 10 | Class Selection |
| 15 | First Ability |
| 20 | Custom Titles |
| 25 | Bot Personalities |
| 30 | Second Ability |
| 35 | Prestige Option |
| 40 | Third Ability |
| 45 | Guild Creation |
| 50 | Grand Master |

---

## VISUAL DESIGN

### Neo-Brutalist Theming Per World

- **World 1-3**: Warm, welcoming (yellows, soft greens)
- **World 4-6**: Mysterious depth (deep blues, purples)
- **World 7-9**: Cosmic energy (pinks, cyans, gradients)
- **World 10**: Golden triumph (golds, whites)

### Special Tile Styles

```css
/* Gold 3x tile */
.tile-gold {
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
  box-shadow: 0 0 10px rgba(255, 215, 0, 0.6);
  animation: goldShimmer 2s ease-in-out infinite;
}

/* Ice tile */
.tile-ice {
  background: linear-gradient(135deg, #B0E0E6 0%, #87CEEB 100%);
  border: 2px solid #4682B4;
}

/* Bomb tile */
.tile-bomb {
  background: linear-gradient(135deg, #FF6B35 0%, #CC4400 100%);
  animation: bombPulse 0.8s ease-in-out infinite;
}
```

---

## SPRINT BREAKDOWN

### Overview

| Sprint | Focus | Duration |
|--------|-------|----------|
| Sprint 1 | Foundation & Database | 1 week |
| Sprint 2 | World Map UI | 1 week |
| Sprint 3 | Adventure Gameplay | 2 weeks |
| Sprint 4 | Boss Battles | 1 week |
| Sprint 5 | Progression System | 1 week |
| Sprint 6 | Polish & Beta | 1 week |

**Total: ~7 weeks to MVP**

---

## DATABASE SCHEMA

```sql
-- player_progression
CREATE TABLE player_progression (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  level INT DEFAULT 1,
  xp INT DEFAULT 0,
  current_world INT DEFAULT 1,
  current_level INT DEFAULT 1,
  total_stars INT DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- level_completions
CREATE TABLE level_completions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES player_progression(user_id),
  world INT NOT NULL,
  level INT NOT NULL,
  stars INT DEFAULT 0 CHECK (stars >= 0 AND stars <= 3),
  best_score INT DEFAULT 0,
  best_words INT DEFAULT 0,
  completed_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, world, level)
);

-- beta_testers
CREATE TABLE beta_testers (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id),
  email VARCHAR(255),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  is_active BOOLEAN DEFAULT true
);
```

---

## SUCCESS METRICS

| Metric | Target |
|--------|--------|
| D1 Retention | +15% vs current |
| D7 Retention | +25% vs current |
| Session Length | +20% |
| Sessions/Day | +30% |
| Level 10 Completion | 40% of players |
| Level 30 Completion | 15% of players |
| Boss Battle Win Rate | 60-70% |
| Beta NPS | > 40 |

---

## DECISIONS MADE

| Question | Decision |
|----------|----------|
| Story depth | **Light** - Themed worlds with flavor text, no cutscenes |
| Mode strategy | **Coexist** - Adventure alongside Practice/Challenge/Bots |
| Visual style | **Floating islands map + flat grid + funny bosses** |
| World map style | **Floating islands** - Golden bridges, parallax scrolling |
| Boss theme | **Education/teacher themed** - Ms. Grammar, Spelling Bee, Professor Thesaurus |
| Final boss | **The Lexicon Dragon** 🐉 - Epic crystal dragon as World 10 boss |
| Grid layout | **Flat, straight, 70% of screen** - Not tilted |
| Mascot | **Lexi in corner** - Small, reactive, labeled |
| MVP scope | **Worlds 1-3 (30 levels) + 3 bosses** |
| Progression | **Hybrid A+B** - Levels + XP + Stars |
| Component strategy | **Extend existing** - Reuse BoggleBoard, LetterTile, hooks with new variants |
