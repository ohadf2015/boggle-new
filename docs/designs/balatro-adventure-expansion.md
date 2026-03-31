# LexiClash Adventure Mode — Balatro-Inspired Expansion

## Design Philosophy

**"Balatro meets Boggle in a roguelike word dungeon"**

The existing adventure mode (10 worlds, 70 levels, bosses, Word Forge upgrades) stays intact as the **Campaign**. We layer a new roguelike system ON TOP that transforms every level into a strategic modifier-driven scoring engine.

### Core Principles
1. **Multiplicative scoring creates the dopamine** — words alone are additive; modifiers make them exponential
2. **Decisions > Vocabulary** — a 4-letter word with the right modifiers should outscore a 9-letter word without them
3. **5-slot constraint breeds creativity** — like Balatro's 5 joker slots, limitation forces meaningful choices
4. **Every run feels different** — procedural modifier offerings + boss constraints = infinite variety
5. **Keep what works** — worlds, bosses, flash challenges, quests all stay; we ENHANCE, never replace

---

## System 1: Word Tier Scoring (replaces flat scoring)

### The "Hand Type" Equivalent

Words have a **Tier** based on length, mirroring poker hand rankings:

| Word Tier | Length | Base Chips | Base Mult | Flavor |
|-----------|--------|-----------|-----------|--------|
| Common | 3 letters | 10 | ×1 | "High Card" |
| Sturdy | 4 letters | 20 | ×1.5 | "Pair" |
| Strong | 5 letters | 35 | ×2 | "Three of Kind" |
| Mighty | 6 letters | 50 | ×3 | "Flush" |
| Epic | 7 letters | 80 | ×4 | "Full House" |
| Legendary | 8+ letters | 120 | ×6 | "Straight Flush" |
| Mythic | 10+ letters | 200 | ×10 | "Royal Flush" |

**Score = (Base Chips + Letter Chips) × (Base Mult + Modifier Bonuses)**

Each letter has a chip value (Scrabble-inspired but rebalanced):
- Common (E,A,I,O,N,R,S,T,L): 1 chip
- Uncommon (D,G,B,C,M,P): 2 chips
- Rare (F,H,V,W,Y): 3 chips
- Epic (K,J,X): 5 chips
- Legendary (Q,Z): 8 chips

### Tier Leveling ("Planet Cards")

**Lexicon Scrolls** — earned from bosses, shops, and flash challenges — permanently level up a word tier FOR THE CURRENT RUN:

- Level 1: +5 chips, +0.5 mult
- Level 2: +10 chips, +1 mult
- Level 3: +20 chips, +2 mult
- Level 4: +40 chips, +3 mult
- Level 5: +80 chips, +5 mult

Strategic choice: do you level up "Common" (you'll play many 3-letter words) or "Epic" (rare but massive when you hit one)?

---

## System 2: Rune Cards (The "Joker" System)

### Overview

**Rune Cards** are collectible modifiers that change HOW words score. Players hold up to **5 Rune Cards** (expandable to 7 via shop vouchers). Cards trigger LEFT-TO-RIGHT during scoring, just like Balatro jokers.

### Rune Categories (150+ planned, launch with 80)

#### Additive Chips (+Chips)
- **Vowel Miner**: +15 chips for each vowel in word
- **Double Down**: +30 chips if word has double letters (ee, ll, ss)
- **Rare Find**: +20 chips per rare/epic/legendary letter used
- **Long Haul**: +10 chips per letter beyond 4th
- **First Impression**: +40 chips on first word of each level

#### Additive Mult (+Mult)
- **Combo Artist**: +0.5 mult per combo count (stacks!)
- **Speed Demon**: +2 mult if word found within 3 seconds
- **Flash Master**: +3 mult during flash challenges
- **Boss Slayer**: +4 mult during boss battles
- **Streak Fire**: +1 mult per day of current streak

#### Multiplicative Mult (×Mult) — THE POWER CARDS
- **Word Alchemist**: ×2 mult if word is 6+ letters
- **Palindrome Prophet**: ×3 mult for palindromes
- **Alliteration Ace**: ×2 mult if last word started with same letter
- **Root Scholar**: ×2 mult for words with Latin/Greek roots (world 3 synergy)
- **Gold Rush**: ×1.5 mult for each gold tile used
- **The Linguist**: ×2.5 mult for words that are valid in 2+ languages (world 9 synergy)
- **Critical Hit**: 1 in 5 chance of ×4 mult on any word
- **Crescendo**: ×mult increases by 0.1 for each word played this level (starts at ×1)

#### Retrigger Cards — THE ENDGAME
- **Echo Chamber**: Letters that appeared in your last word retrigger (score again)
- **Double Vision**: First and last letter of each word retrigger
- **Chain Reaction**: If word shares a letter with previous word, that letter retriggers
- **Cascade King**: During cascade effects, all cleared tiles retrigger their letter bonus

#### Conditional/Trigger Cards
- **The Collector**: +5 chips per unique word found this run (permanent growth)
- **Ice Breaker**: +50 chips when clearing an ice tile (synergy with ice-heavy worlds)
- **Bomb Defuser**: ×2 mult when using a bomb tile in a word
- **Rainbow Bridge**: ×3 mult when word uses a rainbow tile
- **Tile Surfer**: +1 mult for each special tile type used in word (gold+ice+bomb = +3)
- **Underdog**: ×4 mult if your score is below the target at half-time

#### Economy Cards
- **Gold Digger**: +3 gold per level completed
- **Interest**: +1 gold per 10 gold held (max +5, like Balatro)
- **Treasure Hunter**: Loot chests give +50% rewards
- **Flash Flipper**: Flash challenge rewards doubled
- **The Merchant**: Shop prices -20%

#### World-Synergy Cards (unlock by completing worlds)
- **Meadow Bloom** (W1): Common words (3-4 letters) give +1 gold each
- **Synonym Sage** (W2): ×2 mult for synonym pairs found consecutively
- **Root Runner** (W3): +25 chips for words with common roots
- **Idiom Master** (W4): ×3 mult when completing an idiom challenge
- **Compound King** (W5): ×2 mult for compound words
- **Anagram Ace** (W6): ×2.5 mult for anagramming a previous word
- **Mirror Mage** (W7): ×3 mult for palindromes (stacks with Palindrome Prophet!)
- **Neologist** (W8): +50 chips for rare/unusual words
- **Polyglot** (W9): ×2 mult per additional language the word exists in
- **Lexicon Lord** (W10): All rune effects +50% power

### Rune Card Rarity
- **Common** (gray border): Basic effects, appear frequently
- **Uncommon** (blue border): Stronger effects, appear in 60% of shops
- **Rare** (purple border): Powerful effects, appear in 30% of shops
- **Legendary** (gold border, animated glow): Game-changing, appear in 10% of shops
- **Mythic** (prismatic shimmer): Run-defining, only from boss defeats or special events

### Rune Card Enhancements (like Balatro's foil/holographic/polychrome)
- **Gilded**: Card also generates +2 gold per trigger
- **Prismatic**: Card effect applies twice
- **Volatile**: Card effect is 3× power but destroys after 3 levels
- **Cursed**: Powerful effect + a drawback (e.g., ×4 mult but -10 seconds per level)

---

## System 3: The Forge Shop (Between-Level Shop)

### When It Appears
After every level completion (not just bosses), a shop screen appears. This is the strategic heart of the run.

### Shop Layout
```
┌─────────────────────────────────────────────┐
│  THE WORD FORGE          Gold: 💰 47        │
│                                              │
│  ┌─────────┐ ┌─────────┐ ┌─────────┐       │
│  │ RUNE    │ │ RUNE    │ │ LEXICON │       │
│  │ Vowel   │ │ Speed   │ │ SCROLL  │       │
│  │ Miner   │ │ Demon   │ │ Lvl Up  │       │
│  │ +15/vwl │ │ +2 mult │ │ Strong  │       │
│  │  💰 8   │ │  💰 12  │ │  💰 15  │       │
│  └─────────┘ └─────────┘ └─────────┘       │
│                                              │
│  ┌─────────┐ ┌─────────┐                   │
│  │ SIGIL   │ │ VOUCHER │                   │
│  │ Enhance │ │ Extra   │                   │
│  │ a tile  │ │ Rune    │                   │
│  │ in grid │ │ Slot    │                   │
│  │  💰 5   │ │  💰 20  │                   │
│  └─────────┘ └─────────┘                   │
│                                              │
│  🔄 Reroll (💰 3)     ⏭️ Skip (bank gold)  │
│                                              │
│  YOUR RUNES: [1] [2] [3] [4] [5]           │
│  Sell a rune: drag to 🗑️                   │
└─────────────────────────────────────────────┘
```

### Shop Items

**Rune Cards** (2-3 slots): Random selection from available pool
- Cost: 5-20 gold (scales with rarity)
- Pool expands as you complete worlds (world-synergy runes unlock)

**Lexicon Scrolls** (0-1 slot): Level up a random word tier
- Cost: 10-20 gold
- Shows which tier will be leveled before purchase

**Sigils** (0-1 slot): One-time tile modification effects
- **Fire Sigil**: Next gold tile gives ×2 score
- **Ice Sigil**: Freeze timer for 5 seconds at level start
- **Storm Sigil**: Cascade effects trigger an extra wave
- **Earth Sigil**: +1 grid row for next level
- Cost: 3-8 gold

**Vouchers** (1 per shop, expensive, powerful):
- **Extra Slot**: +1 rune card slot (max 7)
- **Overstock**: +1 shop item slot
- **Quick Hands**: +1 hint per level
- **Time Warp**: +15 seconds per level
- **Lucky Clover**: Rare+ rune cards appear 2× more often
- **Transmuter**: Can reroll individual shop items
- Cost: 15-30 gold

**Booster Packs** (occasional):
- **Rune Pack**: Choose 1 of 3 random runes
- **Scroll Pack**: Choose 1 of 3 random tier level-ups
- **Sigil Pack**: Choose 2 of 5 sigils
- Cost: 8-15 gold

### Economy Rules
- **Interest**: Earn +1 gold per 10 held, max +5 (rewards banking)
- **Reroll**: Costs 3 gold (increases by 1 each reroll within same shop)
- **Sell Rune**: Returns 50% of purchase price
- **Skip Bonus**: If you skip buying anything, get +3 gold next level

---

## System 4: Enhanced Boss Blinds

### Existing Boss Twists (KEEP ALL 10)
The current 10 boss twist types remain. We ADD a constraint system on top:

### Boss Constraints (like Balatro boss blinds)

**Letter Restrictions:**
- **The Censor**: Vowels score 0 chips (must rely on mult)
- **The Abbreviator**: Max 4-letter words (forces Common/Sturdy plays)
- **The Elongator**: Min 5-letter words (no quick plays)
- **The Silencer**: One random consonant is banned entirely
- **The Scrambler**: Grid shuffles every 15 seconds

**Rune Interference:**
- **The Nullifier**: First 2 rune slots are disabled this fight
- **The Inverter**: Additive bonuses become subtractive (must rely on ×Mult)
- **The Taxman**: Each word costs 1 gold (economy pressure)
- **The Thief**: Steals a random rune if you lose (high stakes!)

**Scoring Pressure:**
- **The Wall**: Score target is 2× normal
- **The Clock**: Timer is halved
- **The Escalator**: Target increases by 10% after each word
- **The Critic**: Only words with 3+ unique vowels score

**Grid Manipulation:**
- **The Fog**: Half the tiles are face-down (reveal on adjacent match)
- **The Rot**: 2 tiles decay to stone every 10 seconds
- **The Magnet**: Gold tiles are locked and can't be used
- **The Mirror**: Grid is mirrored — letters are backwards

### Boss Constraint Stacking
- Worlds 1-3: 1 constraint per boss
- Worlds 4-6: Boss twist + 1 constraint
- Worlds 7-9: Boss twist + 2 constraints
- World 10: Boss twist + 3 constraints (ultimate challenge)

---

## System 5: "The Abyss" — Roguelike Run Mode

### Overview
A separate adventure mode accessed from the hub. Infinite procedural dungeon with branching paths. Each run is 15-25 minutes. Death restarts, but you keep **Abyss Tokens** for permanent meta-upgrades.

### Run Structure

**Branching Path Map** (Slay the Spire style):
```
       [START]
      /   |   \
    ⚔️   🏪   ❓
    |   / | \   |
   ⚔️  ⚔️ 🏪  🎲
    \   |   /  /
     ⚔️  ❓  ⚔️
      \  |  /
      [BOSS]
       |
    [NEXT FLOOR]
```

**Node Types:**
- ⚔️ **Word Battle**: Standard level with score target
- 🏪 **Shop**: The Forge Shop (buy runes, scrolls, sigils)
- ❓ **Mystery Event**: Random encounter (could be great or terrible)
- 🎲 **Gamble**: Risk gold for chance at rare rewards
- 🏥 **Rest**: Restore hints, remove a curse, or level up a tier
- 💀 **Elite**: Hard battle with guaranteed rare+ rune drop
- 👑 **Boss**: Floor boss with constraint + twist

### Floor Structure
- **Floor 1-3**: Easy, 3-node paths, basic runes available
- **Floor 4-6**: Medium, 4-node paths, uncommon runes
- **Floor 7-9**: Hard, 5-node paths, rare runes, elite enemies
- **Floor 10+**: Endless escalation, legendary runes, stacked constraints

### Mystery Events (30+)
- **The Wandering Merchant**: Buy one rune at half price
- **The Cursed Chest**: Gain a Mythic rune + a permanent curse
- **The Font of Knowledge**: Level up all word tiers by 1 (jackpot!)
- **The Gambler's Den**: Bet gold on a word challenge (double or nothing)
- **The Mirror Pool**: Duplicate one of your runes (amazing!)
- **The Hungry Shadow**: Lose a random rune, gain 20 gold
- **The Word Spirit**: Preview the boss constraint for this floor
- **The Ancient Library**: Choose 1 of 3 Lexicon Scrolls (free)
- **The Corrupted Forge**: Enhance a rune to Prismatic but it becomes Volatile
- **The Sacrifice**: Destroy a rune to permanently add +10 chips to a letter

### Abyss Tokens (Meta-Currency)
Earned from:
- Completing floors (5 per floor)
- Boss kills (15 per boss)
- Achievements (first palindrome, first 7+ letter, etc.)
- Daily/weekly Abyss challenges

Spent at **The Lexicon** (permanent upgrade tree):
```
                    [THE LEXICON]
                   /      |      \
          [SCHOLAR]  [WARRIOR]  [MERCHANT]
          /    \      /    \      /    \
      [Deep]  [Wide] [Tough] [Fast] [Rich] [Lucky]
```

- **Scholar Path**: Start runs with +1 Lexicon Scroll, larger dictionary hints
- **Warrior Path**: Start with +10 seconds, boss damage reduced
- **Merchant Path**: Start with +5 gold, shop has +1 slot
- Each node: 10-100 Abyss Tokens, ~20 nodes total, weeks to fully unlock

---

## System 6: Animation & UI Design

### Design Direction: "Arcane Word Forge"

A dark, mystical aesthetic with glowing runes, particle effects, and satisfying number crunching. Think Balatro's retro-CRT filter meets a magical blacksmith's workshop.

### Color Palette
- **Background**: Deep indigo-black (#0A0A1A → #1A1A2E gradient)
- **Primary Accent**: Molten gold (#FFD700, #FF8C00) for scoring, gold, and power
- **Rune Colors by Rarity**:
  - Common: Silver-gray (#94A3B8) with subtle shimmer
  - Uncommon: Cool blue (#4285F4) with pulse glow
  - Rare: Royal purple (#8B5CF6) with particle trail
  - Legendary: Gold (#FFD700) with animated flame border
  - Mythic: Prismatic rainbow shift with chromatic aberration
- **Mult Color**: Deep crimson (#FF3366) — every ×Mult flash is RED (like Balatro!)
- **Chips Color**: Cool cyan (#00FFFF) — chip additions are BLUE
- **Negative/Curse**: Sickly green (#BFFF00)
- **Boss**: Dark red vignette with ember particles

### Key Animations

#### Score Crunching Sequence (THE money animation)
When a word is scored:
1. Word tiles glow and lift slightly (200ms spring, snappy)
2. Base chips count up in CYAN, left side (like Balatro's chip counter)
3. Base mult appears in RED, right side
4. Each rune card activates LEFT TO RIGHT:
   - Card lifts, glows its rarity color
   - Effect appears as floating text (+15 chips / ×2 mult)
   - Chips/mult counters UPDATE with escalating pitch sound
   - If ×Mult: SCREEN SHAKE + flash + number EXPLODES in size
5. Final score: chips × mult = TOTAL in GOLD, center, with satisfying SLAM
6. Total flies toward the score target bar
7. If score exceeds milestone: confetti burst + camera shake

#### Rune Card Animations
- **Idle**: Subtle floating bob (2s period), rarity-appropriate glow
- **Trigger**: Card lifts, rotates slightly, emits particles matching effect type
- **Retrigger**: Lightning bolt connects from card to triggered tile, tile pulses
- **Purchase**: Card flips from shop → flies to rune slot with trail
- **Sell**: Card burns with ember particles, gold coins scatter
- **Destroy**: Card cracks, shatters into fragments, fragments dissolve
- **Enhance**: Card absorbs energy orb, border upgrades with flash

#### Shop Animations
- Enter shop: cards deal from top of screen, fan out with stagger (100ms each)
- Reroll: existing cards flip face-down, spin away, new cards deal in
- Purchase: card lifts, flies to rune bar with golden trail
- Skip: cards fold back into deck, "banked" gold coin animation
- Voucher purchase: dramatic unfurl animation, permanent buff icon appears

#### Boss Constraint Reveal
- Screen dims, rune cards darken
- Constraint card rises from bottom with ominous glow
- Text carves itself letter-by-letter (typewriter + particle emission)
- Affected elements pulse red briefly (e.g., vowels flash if "The Censor")
- Camera returns to normal with vignette fade

#### The Abyss Map
- Branching paths drawn with glowing lines (animated stroke)
- Current node pulses with player indicator
- Upcoming nodes: subtle parallax depth effect
- Path choice: selected path illuminates brightly, others dim
- Node reveal: icon fades in with particle burst matching type
- Boss node: perpetual dark energy swirl

### UI Components

#### Rune Bar (Bottom of Game Screen)
```
┌──────────────────────────────────────────────┐
│  [💎1] [🔥2] [⚡3] [🌙4] [⭐5]  │ 💰 47 │
│  Hover for details    Drag to reorder        │
└──────────────────────────────────────────────┘
```
- 5 slots (expandable to 7)
- Cards show miniature icon + rarity border
- Hover: full card pops up with effect description
- Drag to reorder (ORDER MATTERS for scoring!)
- During scoring: active card highlights sequentially

#### Score Display (Balatro-Style)
```
┌──────────────────────────┐
│  CHIPS        MULT       │
│  ████ 247    ████ ×8.5   │
│                          │
│     = 2,099 points       │
│  ▓▓▓▓▓▓▓▓░░ 2099/3000   │
└──────────────────────────┘
```
- Chips in cyan, Mult in crimson
- Animated counting (like slot machine)
- Progress bar fills toward target
- When target exceeded: bar overflows with golden particles

#### Forge Shop Screen
- Dark workshop aesthetic with anvil/forge motif
- Cards displayed on wooden shelves
- Gold counter with coin pile visual (grows/shrinks with balance)
- Interest calculation shown as sparkle on coin pile
- Voucher displayed on special pedestal with premium treatment

---

## System 7: Integration with Existing Systems

### What Stays Unchanged
- ✅ 10 worlds with 7 levels each (Campaign structure)
- ✅ Boss twist mechanics (all 10 types)
- ✅ Flash challenge system (all 10 types)
- ✅ Quest system (chapter quests)
- ✅ World map, hub, cinematics
- ✅ Special tile types (gold, ice, bomb, rainbow, etc.)
- ✅ Adaptive difficulty
- ✅ Word album, achievements, streak

### What Gets Enhanced
- 🔄 **Scoring**: Old scoring runs in parallel for legacy/non-roguelike modes. Roguelike mode uses Chips×Mult
- 🔄 **Word Forge Upgrades**: Become PERMANENT bonuses (meta-progression), separate from per-run Rune Cards
- 🔄 **Boss Battles**: Keep twist + ADD constraint system
- 🔄 **Flash Challenges**: Can now reward Lexicon Scrolls and Rune Cards (not just gold)
- 🔄 **Shop FAB**: Becomes full Forge Shop between levels
- 🔄 **Gold Economy**: Interest system added, prices rebalanced for roguelike economy

### What's New
- 🆕 Rune Card system (150 cards, 5-slot bar, ordering matters)
- 🆕 Word Tier scoring (Chips × Mult)
- 🆕 Lexicon Scrolls (tier level-ups)
- 🆕 Forge Shop (between every level)
- 🆕 Boss Constraints (16+ constraint types)
- 🆕 The Abyss (roguelike run mode)
- 🆕 Abyss Tokens + The Lexicon (permanent meta-tree)
- 🆕 Mystery Events (30+ event types)
- 🆕 Score Crunching animation system
- 🆕 Rune Card UI (bar, animations, reordering)

### Toggle: Classic vs Roguelike
Players can choose:
- **Classic Adventure**: Original scoring, Word Forge upgrades, familiar experience
- **Roguelike Adventure**: Chips×Mult scoring, Rune Cards, Forge Shop, constraints
- **The Abyss**: Pure roguelike run mode (separate from campaign)

This respects existing players while offering the new depth.

---

## Implementation Phases

### Phase 1: Core Scoring Engine + Rune Cards (Foundation)
- Word Tier scoring system (Chips × Mult)
- Rune Card data model (150 cards, categories, rarities, enhancements)
- Rune Card evaluation engine (left-to-right trigger, additive vs multiplicative)
- Rune Bar UI component (5 slots, hover, reorder)
- Score Crunching animation (the money animation)
- Integration with existing word submission flow

### Phase 2: Forge Shop + Economy
- Shop screen (card display, purchase, sell, reroll)
- Shop item generation (weighted randomness by world/progress)
- Lexicon Scroll system (tier level-ups)
- Sigil system (one-time effects)
- Voucher system (permanent run upgrades)
- Gold interest system
- Shop animations (deal, purchase, reroll, skip)

### Phase 3: Boss Constraints + Enhanced Battles
- 16 boss constraint types
- Constraint stacking logic (by world)
- Constraint reveal animation
- Boss reward enhancement (guaranteed rune drops)
- Flash challenge rune/scroll rewards

### Phase 4: The Abyss (Roguelike Run Mode)
- Branching path map generator
- Node types (battle, shop, mystery, gamble, rest, elite, boss)
- Mystery event system (30+ events)
- Run state management (start, progress, death, restart)
- Abyss Token economy
- The Lexicon permanent upgrade tree
- Abyss-specific UI (map, run summary, death screen)

### Phase 5: Polish & Meta
- Sound design integration (escalating pitch on mult, satisfying SLAM)
- Particle systems (forge sparks, rune glow, boss embers)
- Daily/weekly Abyss challenges
- Seeded runs with leaderboards
- Achievement integration
- Tutorial/onboarding for new systems
