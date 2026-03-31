# Word Forge — Rune Catalog & Balance Reference

> Complete rune definitions, boss constraints, unlock tiers, rarity tables, and balance scenarios.
> Intended as the authoritative source for TypeScript implementation in `lib/wordForge/runeCards.ts` and `lib/wordForge/bossConstraints.ts`.

---

## Scoring Reference (self-contained)

```
Word Score = (Letter Points + Chip Bonuses) × Length Bonus × (all Mult values multiplied together)
```

| Word Length | Length Bonus |
|-------------|-------------|
| 3           | ×1.0        |
| 4           | ×1.5        |
| 5           | ×2.0        |
| 6           | ×3.0        |
| 7           | ×5.0        |
| 8+          | ×8.0        |

Letter point values (Scrabble standard):
- 1 pt: A E I O U L N S T R
- 2 pt: D G
- 3 pt: B C M P
- 4 pt: F H V W Y
- 5 pt: K
- 8 pt: J X
- 10 pt: Q Z

**Evaluation order per word:**
1. Sum raw letter points
2. Apply all Chip rune bonuses (flat additions)
3. Apply Length Bonus as a multiplier
4. Apply all Mult rune values (multiply together in sequence)
5. Floor to integer

---

## Balance Scenarios

### Scenario A: Round 1, 0 runes — target 50

- Player finds 10 words in 60 seconds (achievable pace for casual player)
- Average word: 4 letters, average letter points 6 (mix of common letters)
- Score per word: 6 × 1.5 = 9 pts
- Total: 10 × 9 = **90 pts**
- Verdict: Target 50 is comfortable. A bad run (6 slow words) still hits ~54. Good.

### Scenario B: Round 5, 3 runes — target 220

Example rune loadout: Vowel Miner (common chip), Word Smith (rare mult), Combo Fire (rare mult)

- Player finding 5-letter words with 2 vowels
- Raw letter pts: 8. Chip: +6 (2 vowels × 3). Sub-total: 14. Length: ×2.0 = 28 base.
- Mults: ×1.5 (Word Smith) × ×1.4 (Combo Fire, 3rd consecutive word) = ×2.1
- Score per qualifying word: 28 × 2.1 = **59 pts**
- Four such words + three smaller words (~8 pts each) = 236 + 24 = **260 pts**
- Verdict: Reachable with a focused approach. Fails if player ignores 5-letter words.

### Scenario C: Round 9, 5 runes — target 750, only with good synergy

Example build (Long Word build): Tunnel Vision (cursed), Word Smith (rare mult), Critical Hit (rare mult), Vowel Miner (common chip), Long Haul (common chip)

- 7-letter word with 3 vowels: raw pts 16. Chips: +9 (3 vowels) + +6 (3 extra letters beyond 4th) = +15. Sub-total: 31. Length: ×5.0 = 155.
- No crit: ×1.5 (Word Smith) = 232.5. With crit (20% chance): ×1.5 × ×3 = ×4.5 = 697.
- Non-crit 7-letter run: ~3 qualifying words at ~230 each = 690 pts. Marginal. Needs crit or alliteration.
- Crit proc on two words: 232 + 697 + ~200 (other words) = **~1130 pts**. Hits 750 easily.
- Without good synergy (3 mismatched runes): ~3 × 100 = 300 pts. Fails.
- Verdict: Good synergy enables 750+, bad synergy falls short. Design intent achieved.

### Scenario D: Theoretical maximum from one word (perfect rune loadout)

Word: QUIZZICAL (9 letters) — Q(10)+U(1)+I(1)+Z(10)+Z(10)+I(1)+C(3)+A(1)+L(1) = 38 pts × 8.0 = 304 base

Rune loadout: Tunnel Vision (×4 for 7+ letters), Critical Hit (×3 proc), Grand Master (×2.5 legendary mult), Combo Fire (×1.5 at 5-chain), Long Haul (+2 per letter beyond 4th = +10 chip)

- Letter pts + Long Haul chip: 38 + 10 = 48. Length ×8 = 384.
- Mults: ×4 × ×3 × ×2.5 × ×1.5 = ×45
- Max single word: 384 × 45 = **17,280 pts**

This requires a 5-rune stack including two legendary mults and a crit proc. Achievable once in perhaps 1-in-50 runs with perfect play. The game can display this as the "dream" score.

**Grid reality note**: QUIZZICAL requires two Z tiles on the same grid. Standard weighted Boggle grids assign Z a weight of ~1-2%, meaning two Z tiles coexist in roughly 1-in-400 grids. The theoretical ceiling is real but rare by design — it is an aspirational number, not an expected ceiling. A more achievable high-score word would be QUIXOTE (Q+X = 18 high-value pts), scoring 18 × 8 × 45 = ~6,480 pts in the same rune setup.

---

## Complete Rune Catalog — 60 Cards

```typescript
export type RuneCategory = 'chip' | 'mult' | 'special' | 'cursed';
export type RuneRarity = 'common' | 'rare' | 'legendary';

export interface RuneCard {
  id: string;
  name: string;
  category: RuneCategory;
  rarity: RuneRarity;
  description: string;         // one sentence, player-facing
  mechanic: string;            // exact formula for implementation
  unlockTier: 0 | 1 | 2 | 3 | 4 | 5;  // 0=starting pool, 1=100xp, 2=300xp, 3=600xp, 4=1000xp, 5=1500xp
  icon: string;                // emoji suggestion
  synergyNotes: string;        // what combos well with this
}
```

---

### CHIP RUNES — 20 cards

Chip runes add flat points to a word's score before the length multiplier and mult runes are applied. This means chips are amplified by everything that follows.

```typescript
const chipRunes: RuneCard[] = [

  // ─── COMMON CHIPS (10) ───────────────────────────────────────────────────

  {
    id: 'vowelMiner',
    name: 'Vowel Miner',
    category: 'chip',
    rarity: 'common',
    description: 'Earn +3 points for each vowel in the word.',
    mechanic: '+3 per vowel (A, E, I, O, U) in the submitted word, before length multiplier',
    unlockTier: 0,
    icon: '🔷',
    synergyNotes: 'Pairs with Echo (if last letter is a vowel, you get 6+ from it). Scales well under Word Smith since chip is applied before the ×1.5. Strong in vowel-heavy languages like English average (38% vowels). Synergizes with Long Haul on 6-7 letter words with multiple vowels.'
  },

  {
    id: 'longHaul',
    name: 'Long Haul',
    category: 'chip',
    rarity: 'common',
    description: 'Earn +3 points for each letter in the word beyond the 4th.',
    mechanic: '+3 × max(0, wordLength - 4) added to chip total',
    unlockTier: 0,
    icon: '📏',
    synergyNotes: 'Essential in Long Word builds. Stacks with Vowel Miner (long words tend to have more vowels). Becomes very strong under Tunnel Vision (which already rewards long words) since both bonuses amplify together before mults apply.'
  },

  {
    id: 'firstBlood',
    name: 'First Blood',
    category: 'chip',
    rarity: 'common',
    description: 'Your first word each round earns +15 bonus points.',
    mechanic: '+15 flat to chip total for the first word submitted per round; resets at round start',
    unlockTier: 0,
    icon: '⚡',
    synergyNotes: 'Makes the opening word disproportionately important. Pairs well with Speed Demon (go fast on word 1 for both bonuses). Anti-synergy with Combo Fire (you want consecutive words, but First Blood only fires once).'
  },

  {
    id: 'doubleDown',
    name: 'Double Down',
    category: 'chip',
    rarity: 'common',
    description: 'Earn +8 points if the word contains any doubled letter (ee, ll, oo, ss, etc.).',
    mechanic: '+8 flat if any two adjacent identical characters exist in the word string',
    unlockTier: 0,
    icon: '🎲',
    synergyNotes: 'Situational but reliable in English (BATTLE, LETTER, MELLOW). Good opener rune because it fires often enough to feel consistent. Pairs nicely with Rare Finder when rare letters are doubled (not common, but memorable when it happens).'
  },

  {
    id: 'rareFinder',
    name: 'Rare Finder',
    category: 'chip',
    rarity: 'common',
    description: 'Earn +5 points for each rare letter (J, K, Q, X, Z) used in the word.',
    mechanic: '+5 per occurrence of [J, K, Q, X, Z] in the submitted word',
    unlockTier: 0,
    icon: '💎',
    synergyNotes: 'Synergizes with Tunnel Vision (long words with rare letters score massively). Watch for grids with two or more rare tiles — a word containing QUA- or -XED gets +10 from this alone. Pairs with Grand Master mult for explosive results.'
  },

  {
    id: 'consonantClub',
    name: 'Consonant Club',
    category: 'chip',
    rarity: 'common',
    description: 'Earn +2 points for each consonant in the word.',
    mechanic: '+2 per consonant (non-vowel letter) in the submitted word',
    unlockTier: 1,
    icon: '🏛️',
    synergyNotes: 'Natural complement to Vowel Miner — together they give +2 per consonant and +3 per vowel, effectively +2 per letter plus +1 per vowel. Strong against The Censor boss (vowels worth 0, consonants still get the chip). Direct counter to The Censor.'
  },

  {
    id: 'shortSprint',
    name: 'Short Sprint',
    category: 'chip',
    rarity: 'common',
    description: 'Earn +6 points for 3-letter words.',
    mechanic: '+6 flat if wordLength === 3',
    unlockTier: 1,
    icon: '🏃',
    synergyNotes: 'Enables fast-spam strategy: find as many 3-letter words as possible. Anti-synergy with Tunnel Vision (which blocks 3-4 letter words). Good pairing with Speed Demon for a sub-3-second, 3-letter burst strategy. Counters The Abbreviator boss nicely.'
  },

  {
    id: 'sweetSpot',
    name: 'Sweet Spot',
    category: 'chip',
    rarity: 'common',
    description: 'Earn +10 points for exactly 4-letter words.',
    mechanic: '+10 flat if wordLength === 4',
    unlockTier: 1,
    icon: '🎯',
    synergyNotes: 'The Abbreviator boss (only 3-4 letter words count) becomes very manageable with this. Pairs with Short Sprint for a 3-4 letter word speed build. Anti-synergy with Tunnel Vision and The Purist.'
  },

  {
    id: 'cleanSlate',
    name: 'Clean Slate',
    category: 'chip',
    rarity: 'common',
    description: 'Earn +4 points for each word that uses no repeated letters.',
    mechanic: '+4 flat if all characters in the word are unique (no duplicate letters)',
    unlockTier: 1,
    icon: '✨',
    synergyNotes: 'Favors searching for words like BRIGHT, CLAMP, FROST. Works well on any round and requires no specific grid state. Pairs with Long Haul since longer words with no repeats earn both bonuses. Anti-synergy with Double Down by definition.'
  },

  {
    id: 'perfectFive',
    name: 'Perfect Five',
    category: 'chip',
    rarity: 'common',
    description: 'Earn +12 points for exactly 5-letter words.',
    mechanic: '+12 flat if wordLength === 5',
    unlockTier: 2,
    icon: '⭐',
    synergyNotes: 'Stacks with Word Smith (which mults 5+ letter words). Together: +12 chip before ×2.0 length ×1.5 mult = a 5-letter word with 7 letter pts becomes (7+12)×2×1.5 = 57 from a very ordinary word. Strong synergy. Core of the mid-length build.'
  },

  // ─── RARE CHIPS (8) ──────────────────────────────────────────────────────

  {
    id: 'palindromePrize',
    name: 'Palindrome Prize',
    category: 'chip',
    rarity: 'rare',
    description: 'Earn +25 points for any palindrome (reads the same forwards and backwards).',
    mechanic: '+25 flat if word === word.split("").reverse().join("") (case-insensitive)',
    unlockTier: 2,
    icon: '🔄',
    synergyNotes: 'Rare trigger but the chip stacks under all your mults. On a 5-letter palindrome like LEVEL or CIVIC: (12 + 25) × 2.0 × mult chain. Combine with Palindrome Power mult for a dedicated palindrome build that delivers 200+ pts from one word. Works well with Echo too since first and last letters are the same.'
  },

  {
    id: 'edgeWalker',
    name: 'Edge Walker',
    category: 'chip',
    rarity: 'rare',
    description: 'Earn +4 points for each letter tile on the edge of the grid used in the word.',
    mechanic: '+4 per tile in the word\'s path that occupies a grid edge (row 0, row 4, col 0, or col 4 on a 5×5 grid; row 0, row 5, col 0, col 5 on 6×6)',
    unlockTier: 2,
    icon: '🗺️',
    synergyNotes: 'Rewards words that span the board perimeter. Works well with Long Haul (long path = more edge tiles). If Big Grid special rune is active, the 6×6 has more edge tiles proportionally — this combo is strong. Pairs with any length-focused build.'
  },

  {
    id: 'centerStage',
    name: 'Center Stage',
    category: 'chip',
    rarity: 'rare',
    description: 'Earn +15 points if the word\'s path passes through the center tile.',
    mechanic: '+15 flat if tile at position [2][2] (center of 5×5) is used in the word\'s path',
    unlockTier: 2,
    icon: '🎭',
    synergyNotes: 'Center tile is adjacent to 8 tiles, making long path words through it common. Synergizes with Long Haul. On a 6×6 grid (Big Grid rune), there is no single center — this rune becomes worth +15 for either of the 4 center tiles, making it fire more often.'
  },

  {
    id: 'streakBonus',
    name: 'Streak Bonus',
    category: 'chip',
    rarity: 'rare',
    description: 'Earn +5 points for each word in your current consecutive-word streak (resets if you pause for 5+ seconds).',
    mechanic: '+5 × currentConsecutiveStreak (streak increments on each valid word, resets if gap between words > 5 seconds)',
    unlockTier: 3,
    icon: '🔥',
    synergyNotes: 'Snowballs: word 5 in a row gives +25 chip. The bonus is amplified by all mults. Synergizes extremely well with Combo Fire (also rewards consecutive words). Together they create the "never stop typing" build. Strong in late rounds where 60 seconds of continuous play is feasible.'
  },

  {
    id: 'wordHoarder',
    name: 'Word Hoarder',
    category: 'chip',
    rarity: 'rare',
    description: 'Earn +2 points for every unique word you have submitted this run (across all rounds).',
    mechanic: '+2 × totalUniqueWordsThisRun (at time of each word submission)',
    unlockTier: 3,
    icon: '📚',
    synergyNotes: 'Scales passively across the run — by round 7, you might have 60+ unique words, giving +120 chip per word. Makes picking this rune early (round 1 or 2) far stronger than late. Synergizes with any mult rune since the chip is applied before mults. Creates a "volume" build archetype.'
  },

  {
    id: 'precisionShot',
    name: 'Precision Shot',
    category: 'chip',
    rarity: 'rare',
    description: 'Earn +20 points if the word scores exactly at the current per-word average needed to hit the target.',
    mechanic: '+20 flat if Math.floor(wordScore_before_this_chip) is within ±2 of (remainingTarget / remainingSeconds × 5) — a "right on pace" trigger',
    unlockTier: 3,
    icon: '🎖️',
    synergyNotes: 'Situational and skill-testing. Rewards players who mentally track their pacing. Synergizes with any consistent-scoring build (not random/crit-based). Anti-synergy with Gambler (random scores make pacing unpredictable).'
  },

  // ─── LEGENDARY CHIPS (3) ─────────────────────────────────────────────────

  {
    id: 'goldRush',
    name: 'Gold Rush',
    category: 'chip',
    rarity: 'legendary',
    description: 'Two gold tiles appear on the grid each round; using them in a word adds +30 points each.',
    mechanic: 'On round start, randomly mark 2 grid tiles as "gold". +30 chip per gold tile used in any word path. Gold tile persists until used.',
    unlockTier: 2,
    icon: '💰',
    synergyNotes: 'The +30 per gold tile is amplified by all mults. With Word Smith + Combo Fire, one gold tile in a 5-letter word = +30 × 2.0 × 1.5 × 1.4 = +126 from the tile alone. Pairs with Center Stage if gold tiles are in center area. Synergizes with Long Haul builds.'
  },

  {
    id: 'letterFeast',
    name: 'Letter Feast',
    category: 'chip',
    rarity: 'legendary',
    description: 'At run start, choose one letter — every word containing that letter earns +8 points per occurrence.',
    mechanic: 'Player selects one letter at run start (before round 1). +8 per occurrence of that letter in any subsequently submitted word.',
    unlockTier: 4,
    icon: '🍽️',
    synergyNotes: 'Choose E or S for consistent +8 to +16 per word (they appear most). Choose Q or Z for high-variance +8 per rare letter (combo with Rare Finder). Early-run pick creates a "chosen letter" identity for the run. Synergizes with everything by adding a base chip to most words.'
  },

  {
    id: 'avalanche',
    name: 'Avalanche',
    category: 'chip',
    rarity: 'legendary',
    description: 'Earn +1 point for every point you scored in the previous word (doubles your last score as a flat chip bonus).',
    mechanic: '+lastWordTotalScore flat chip added to current word\'s chip total. lastWordTotalScore resets to 0 at round start.',
    unlockTier: 5,
    icon: '🌊',
    synergyNotes: 'Snowball mechanic. If your last word scored 150, your next word gets +150 chip before mults fire. Devastating with any mult stack. Anti-synergy with The Escalator boss (each word increases target, so you want quick high scores, but Avalanche rewards playing one big word first). The "calculated gambler" rune.'
  },

  {
    id: 'sharpEdge',
    name: 'Sharp Edge',
    category: 'chip',
    rarity: 'rare',
    description: 'Earn +5 points for each letter in the word that scores higher than the word\'s own average letter point value.',
    mechanic: 'avgLetterPts = totalLetterPts / wordLength. +5 for each letter whose individual point value > avgLetterPts.',
    unlockTier: 2,
    icon: '🔪',
    synergyNotes: 'Rewards words with high-variance letter distributions — a word like QUIZ has Q=10 and Z=10 both well above average. Pairs with Rare Finder (rare letters are always above average). In a vowel-heavy word, consonants often qualify. Subtle but consistent, especially in mid-to-late rounds.'
  },

];
```

---

### MULT RUNES — 15 cards

Mult runes multiply the word score after chips and the length bonus have been applied. All mults multiply together. Order of acquisition does not matter — the result is the same.

```typescript
const multRunes: RuneCard[] = [

  // ─── COMMON MULTS (5) ────────────────────────────────────────────────────

  {
    id: 'wordSmith',
    name: 'Word Smith',
    category: 'mult',
    rarity: 'common',
    description: 'Words of 5 or more letters are multiplied by ×1.5.',
    mechanic: 'if wordLength >= 5: totalScore × 1.5 (applied after chips and length bonus)',
    unlockTier: 0,
    icon: '🔨',
    synergyNotes: 'Core rune of the Long Word build. Pairs with Long Haul (chip) and Tunnel Vision (cursed) for maximum 5-7 letter word scoring. Synergizes with Perfect Five chip and Rare Finder chip. Anti-synergy with Short Sprint and Sweet Spot (those are 3-4 letter builds).'
  },

  {
    id: 'comboFire',
    name: 'Combo Fire',
    category: 'mult',
    rarity: 'common',
    description: 'Each consecutive word (no pause over 5 seconds) increases this mult by ×0.1, starting at ×1.1.',
    mechanic: 'consecutiveMult = 1.0 + (0.1 × min(consecutiveStreak, 10)). Applied to word score. Streak resets if gap > 5 seconds.',
    unlockTier: 0,
    icon: '🔥',
    synergyNotes: 'Cap of ×2.0 at 10-chain prevents infinite scaling but feels incredible to maintain. Rewards non-stop play. Synergizes with Speed Demon (go fast = maintain streak). Streak Bonus chip amplifies the same mechanic from both sides. Anti-synergy with Hint Whisper (you will pause to use the hint).'
  },

  {
    id: 'alliteration',
    name: 'Alliteration',
    category: 'mult',
    rarity: 'common',
    description: 'If a word starts with the same letter as your previous word, multiply by ×2.',
    mechanic: 'if word[0].toLowerCase() === lastWord[0].toLowerCase(): totalScore × 2',
    unlockTier: 0,
    icon: '🅰️',
    synergyNotes: 'Requires planning — look for letter clusters on the grid. Pairs with Speed Demon (find two alliterative words fast). If Combo Fire is also active, an alliterative chain multiplies both effects. Strong on grids where one letter appears 3-4 times.'
  },

  {
    id: 'chainLink',
    name: 'Chain Link',
    category: 'mult',
    rarity: 'rare',
    description: 'If a word starts with the last letter of the previous word, multiply by ×2.',
    mechanic: 'if word[0].toLowerCase() === lastWord[lastWord.length - 1].toLowerCase(): totalScore × 2',
    unlockTier: 0,
    icon: '🔗',
    synergyNotes: 'Creates a "letter chain" reading style. Combines with Alliteration for words that start AND end with the same letter (palindrome-shaped words). Building a chain of 3+ words gives effective ×2 on each. Synergizes with Echo (last letter scores double, rewarding you to find it twice).'
  },

  {
    id: 'speedDemon',
    name: 'Speed Demon',
    category: 'mult',
    rarity: 'common',
    description: 'Multiply by ×2 if the word is submitted within 3 seconds of the previous word.',
    mechanic: 'if (currentSubmitTime - lastSubmitTime) <= 3000ms: totalScore × 2',
    unlockTier: 0,
    icon: '⚡',
    synergyNotes: 'Rewards fast twitchy play over deliberate searching. Pairs with Short Sprint (fast 3-letter words every 2 seconds). Synergizes with Combo Fire since both require constant rapid submission. Anti-synergy with any rune that rewards pausing to plan (Palindrome Power, Precision Shot).'
  },

  // ─── RARE MULTS (9) ──────────────────────────────────────────────────────

  {
    id: 'criticalHit',
    name: 'Critical Hit',
    category: 'mult',
    rarity: 'rare',
    description: 'Each word has a 20% chance to score ×3 (displayed in bright red when triggered).',
    mechanic: 'if Math.random() < 0.2: totalScore × 3 (random seed per word, not per rune pickup)',
    unlockTier: 1,
    icon: '💥',
    synergyNotes: 'The luck layer of the game. On a crit, the entire mult chain triples, not just the base — if you already have ×2 stacked, a crit effectively gives ×6 total. Pairs with any mult-heavy build. Feels incredible when it fires on a large word. Anti-synergy with Gambler (too much variance combined).'
  },

  {
    id: 'palindromePower',
    name: 'Palindrome Power',
    category: 'mult',
    rarity: 'rare',
    description: 'Palindromes (words that read the same forwards and backwards) are multiplied by ×4.',
    mechanic: 'if word === word.split("").reverse().join(""): totalScore × 4',
    unlockTier: 2,
    icon: '🔁',
    synergyNotes: 'Dedicated rune for the palindrome build. Combine with Palindrome Prize chip — a 5-letter palindrome like LEVEL gets (+10 length pts + 25 chip) × 2.0 × 4.0 = 280 pts base. Add Critical Hit for a 20% chance at 840 pts from one word. English palindromes are rare but worth hunting.'
  },

  {
    id: 'crescendo',
    name: 'Crescendo',
    category: 'mult',
    rarity: 'rare',
    description: 'Each word you submit this round increases this mult by ×0.15, starting at ×1.0.',
    mechanic: 'crescendoMult = 1.0 + (0.15 × wordsSubmittedThisRound). Resets at round start.',
    unlockTier: 2,
    icon: '📈',
    synergyNotes: 'Opposite arc to Front Load — saves your best words for last. By word 8, you are at ×2.2. Pairs beautifully with Avalanche chip (your best word triggers the next word\'s big chip bonus, which then gets amplified by the higher crescendo mult). Strong late-round finisher.'
  },

  {
    id: 'frontLoad',
    name: 'Front Load',
    category: 'mult',
    rarity: 'rare',
    description: 'Your first 3 words each round are multiplied by ×3; words 4+ are unaffected.',
    mechanic: 'if wordsSubmittedThisRound <= 3: totalScore × 3',
    unlockTier: 3,
    icon: '🚀',
    synergyNotes: 'Extreme front-loading strategy. Find your 3 best words immediately and play them. Pairs with First Blood chip (word 1 = chip AND triple mult). Anti-synergy with Crescendo (opposite pacing). Very strong against The Clock boss (30s) — you only need 3 great words.'
  },

  {
    id: 'vowelPower',
    name: 'Vowel Power',
    category: 'mult',
    rarity: 'rare',
    description: 'Words with 50% or more vowels are multiplied by ×2.5.',
    mechanic: 'if (vowelCount / wordLength) >= 0.5: totalScore × 2.5',
    unlockTier: 3,
    icon: '🅾️',
    synergyNotes: 'Words like OUIJA, AUDIO, AERIE qualify. Pairs devastatingly with Vowel Miner chip — a vowel-heavy word first gets +3 per vowel chip, then ×2.5 on the total. Against The Censor boss (vowels worth 0 letter pts), this rune is weakened since the base score drops, but the mult still fires if vowel count qualifies.'
  },

  {
    id: 'loneSurvivor',
    name: 'Lone Survivor',
    category: 'mult',
    rarity: 'rare',
    description: 'If you have 3 or fewer runes equipped, all your words score ×2.',
    mechanic: 'if runesEquipped.length <= 3: totalScore × 2',
    unlockTier: 3,
    icon: '🛡️',
    synergyNotes: 'Rewards intentionally skipping rune offerings to stay lean. A 3-rune build with Lone Survivor effectively has 4 mults worth of power. Use with two high-quality mults rather than a sprawling 5-rune collection. Very strong early game before the rune pool gets unwieldy.'
  },

  {
    id: 'grandMaster',
    name: 'Grand Master',
    category: 'mult',
    rarity: 'legendary',
    description: 'All words are permanently multiplied by ×2.5.',
    mechanic: 'totalScore × 2.5 unconditionally on every word',
    unlockTier: 4,
    icon: '👑',
    synergyNotes: 'The floor-raiser. No trigger required — every word benefits. This is the strongest unconditional rune in the game. Pairs with any other mult. The reason legendary mults only appear from round 6+ is that stacking this with two ×2 mults early would break targets trivially.'
  },

  {
    id: 'neverDie',
    name: 'Immortal Flame',
    category: 'mult',
    rarity: 'legendary',
    description: 'Multiply by ×1.5 for every boss you have defeated this run.',
    mechanic: 'totalScore × (1.5 ^ bossesDefeatedThisRun)',
    unlockTier: 5,
    icon: '🏆',
    synergyNotes: 'Scales exponentially across the run. After 3 bosses: ×3.375. After final boss (round 9): ×3.375 — and the reward comes just as the targets peak. Best picked up early (after boss 1 if possible). Pairs with any build; the scaling is universal. Anti-synergy with Glass Cannon (if you die early, you never see the payoff).'
  },

  {
    id: 'weightedWords',
    name: 'Weighted Words',
    category: 'mult',
    rarity: 'rare',
    description: 'Words whose total letter points exceed 15 are multiplied by ×2.',
    mechanic: 'if baseLetterPoints > 15: totalScore × 2 (evaluated before chips or length bonus, using raw Scrabble letter sum)',
    unlockTier: 2,
    icon: '⚖️',
    synergyNotes: 'Rewards high-value letters: a word using K(5), two Bs(3 each), and common letters easily crosses 15 raw pts. Synergizes with Rare Finder (rare letters push the total over the threshold). In practice, any 6+ letter word with normal letter distribution clears 15 pts. Strong, consistent, and readable.'
  },

  {
    id: 'lastWord',
    name: 'Last Word',
    category: 'mult',
    rarity: 'rare',
    description: 'The final word you submit each round (when the timer hits 0) scores ×3.',
    mechanic: 'The word being submitted as the timer reaches 0 (last word of the round) has its score × 3. If no word is submitted when timer expires, no bonus fires.',
    unlockTier: 3,
    icon: '🏁',
    synergyNotes: 'Incentivizes a clutch last-second word. Pairs perfectly with Forge Frenzy (the slow-motion final 10 seconds gives time to find a quality last word). Synergizes with Crescendo (your final word already has the highest crescendo mult — multiply that by ×3 for a massive finale). High-drama, high-skill rune.'
  },

];
```

---

### SPECIAL RUNES — 15 cards

Special runes change the rules of the game rather than just adding numbers. They may add new mechanics, alter the grid, or change timing.

```typescript
const specialRunes: RuneCard[] = [

  // ─── COMMON SPECIALS (5) ─────────────────────────────────────────────────

  {
    id: 'echo',
    name: 'Echo',
    category: 'special',
    rarity: 'common',
    description: 'The last letter of each word scores double its Scrabble point value as a chip bonus.',
    mechanic: '+letterPoints[word[word.length-1]] added as chip (the last letter\'s point value is counted twice in the chip total)',
    unlockTier: 0,
    icon: '🔊',
    synergyNotes: 'Pairs with Chain Link — if you are chaining first-letter to last-letter, Echo rewards the transition letter doubly. If the last letter is a high-value consonant (Z=10, Q=10, X=8), this is a massive chip. Pairs with Vowel Miner if you deliberately end on vowels.'
  },

  {
    id: 'timeWarp',
    name: 'Time Warp',
    category: 'special',
    rarity: 'common',
    description: 'Every round lasts 10 seconds longer.',
    mechanic: 'roundDuration += 10 (applied at round start, stacks with additional copies or other duration effects)',
    unlockTier: 0,
    icon: '⏱️',
    synergyNotes: 'Purely additive benefit. More time = more words = more score. Essential when combining with slow deliberate strategies (Palindrome Power, Tunnel Vision). Counters The Clock boss partially (+10s means 40s not 30s). Can be doubled: two Time Warps give +20s (70 total).'
  },

  {
    id: 'hintWhisper',
    name: 'Hint Whisper',
    category: 'special',
    rarity: 'common',
    description: 'One valid word is highlighted on the grid at the start of each round.',
    mechanic: 'At round start, randomly select a valid word from the grid and highlight its tiles with a subtle glow. The hint is a 5-7 letter word when possible.',
    unlockTier: 0,
    icon: '💡',
    synergyNotes: 'Reduces search overhead by guaranteeing one strong word. Best in high-pressure rounds (boss rounds, Round 8-9). The hint biases toward long words which synergizes with Long Word builds. Anti-synergy with Speed Demon (you pause to read the hint = lose the 3s window).'
  },

  {
    id: 'wordMirror',
    name: 'Word Mirror',
    category: 'special',
    rarity: 'common',
    description: 'The first word each round is automatically replayed as a bonus score at round end (scored again with all current runes).',
    mechanic: 'Store the fully-scored value of the first word of the round. At round end (timer expires), add that stored value to final score one additional time.',
    unlockTier: 0,
    icon: '🪞',
    synergyNotes: 'Incentivizes opening with your best word (pair with First Blood chip for double benefit). The replay happens after all runes are applied, so if crit fired on word 1, you get the crit again. Synergizes with Front Load (your 3 best words get even more weight when the best one replays).'
  },

  {
    id: 'letterLock',
    name: 'Letter Lock',
    category: 'special',
    rarity: 'common',
    description: 'Once per round, your highest-scoring word cannot be displaced — its score locks in even if a later word would normally reset a streak or counter.',
    mechanic: 'Track highWordScore this round. Combo Fire streak, Chain Link last-letter, etc. are not reset when the high-scoring word is submitted — effectively, one word per round is played "for free" without breaking any consecutive chains.',
    unlockTier: 0,
    icon: '🔒',
    synergyNotes: 'Enables a very deliberate play style: find your best long word, play it at any time without worrying about breaking a Chain Link or Combo Fire streak. Synergizes with any streak-dependent mult rune. Mild but consistent utility.'
  },

  // ─── RARE SPECIALS (7) ───────────────────────────────────────────────────

  {
    id: 'bigGrid',
    name: 'Big Grid',
    category: 'special',
    rarity: 'rare',
    description: 'The grid becomes 6×6 instead of 5×5, giving more letters and longer possible paths.',
    mechanic: 'gridSize = 6×6 for all subsequent rounds. Edge Walker chip uses 6×6 edge definition. Hint Whisper and other tile-referencing runes adapt to the larger grid.',
    unlockTier: 1,
    icon: '📐',
    synergyNotes: 'More tiles means more word possibilities and more long words. Strong with any Long Word build. Pairs with Edge Walker chip (more edge tiles on a 6×6). The larger grid also means The Shrink boss is less punishing (4×4 vs 6×6 is still a significant grid). Key enabler for 7+ letter word hunts.'
  },

  {
    id: 'doubleOrNothing',
    name: 'Double Or Nothing',
    category: 'special',
    rarity: 'rare',
    description: 'After each word, you may hold the submit button for 2 seconds to wager the score: win doubles it, lose scores 0. 50/50 odds.',
    mechanic: 'After word score is calculated, player has a 2-second window to trigger the wager by holding the submit button. If wagered: Math.random() < 0.5 ? score × 2 : 0.',
    unlockTier: 2,
    icon: '🎰',
    synergyNotes: 'High-variance high-skill expression. Skilled players wager on words that contribute little to their target (if they miss, no big loss) and bank safe words. Pairs thematically with Gambler. Anti-synergy with Glass Cannon (a wager loss near the target boundary could end the run).'
  },

  {
    id: 'richochet',
    name: 'Ricochet',
    category: 'special',
    rarity: 'rare',
    description: 'After each word, one random adjacent tile to the last tile used is briefly highlighted — if your next word starts there, earn a ×1.5 bonus.',
    mechanic: 'After word submission, choose a random valid neighbor of word\'s last tile. If next word starts at that highlighted tile: totalScore × 1.5. Highlight lasts 3 seconds.',
    unlockTier: 2,
    icon: '🎾',
    synergyNotes: 'Rewards spatial awareness of the grid. The hint is subtle enough to miss if you are moving fast. Pairs with Speed Demon if you can spot the hint quickly. Strong with Chain Link (you are already looking at the last letter\'s neighbors to chain). Creates a fun "the grid is talking to me" moment.'
  },

  {
    id: 'catalystTile',
    name: 'Catalyst Tile',
    category: 'special',
    rarity: 'rare',
    description: 'One random tile each round is a Catalyst — any word using it fires all Chip rune bonuses at double value for that word only.',
    mechanic: 'At round start, randomly mark 1 tile as Catalyst. If word path includes Catalyst tile: all chip bonuses for that word × 2. Does not affect mult runes.',
    unlockTier: 3,
    icon: '⚗️',
    synergyNotes: 'With Word Hoarder chip at run word 60 (+120 chip), a Catalyst word gives +240 chip. Devastating in high-chip builds. Pairs with any chip-heavy loadout. Best combined with Gold Rush (the Catalyst could be a gold tile — if grid placement aligns, expect 200+ chips on one word).'
  },

  {
    id: 'forgeFrenzy',
    name: 'Forge Frenzy',
    category: 'special',
    rarity: 'rare',
    description: 'Once per round, the last 10 seconds of the timer fire in slow motion at 50% speed, giving you effectively 5 extra seconds of reaction time.',
    mechanic: 'When timer reaches 10 seconds remaining, set timerSpeed = 0.5 until timer expires. Visually indicate with a pulsing gold border. This is a UI/UX trick — actual round duration increases by 5 seconds effectively.',
    unlockTier: 3,
    icon: '🕰️',
    synergyNotes: 'Enables last-second heroics. Pairs with any strategy that front-loads score then uses the slow-motion window for bonus words. Especially strong when combined with Crescendo (your highest-mult words are at the end of the round). Strong counter to The Clock boss.'
  },

  {
    id: 'wordDynamite',
    name: 'Word Dynamite',
    category: 'special',
    rarity: 'rare',
    description: 'Once per round, after submitting a word, shuffle the 6 tiles nearest to the last tile used into new random letters.',
    mechanic: 'After word submission, player can activate Dynamite (single-use per round). The 6 adjacent tiles to word\'s final tile are re-randomized from the weighted letter distribution. Useful for refreshing a used area of the grid.',
    unlockTier: 3,
    icon: '💣',
    synergyNotes: 'Strategic depth tool. Use it when the center of the grid is depleted (Boggle paths branch from the center). On a 5×5 grid, a center-focused shuffle can open 10+ new word possibilities. Synergizes with any long-word build since long paths consume many tiles. Best in rounds 6-9 where grids feel exhausted.'
  },

  // ─── LEGENDARY SPECIALS (3) ──────────────────────────────────────────────

  {
    id: 'wordAlchemy',
    name: 'Word Alchemy',
    category: 'special',
    rarity: 'legendary',
    description: 'Once per run, transform any rune you own into a random Legendary rune.',
    mechanic: 'One-time use. Player can select any rune from their current loadout. That rune is removed and replaced with a random Legendary rune (from the currently unlocked Legendary pool).',
    unlockTier: 4,
    icon: '🧪',
    synergyNotes: 'Meta-rune. Use it to upgrade a weak Common rune you picked early when options were limited. Best used in round 5-6 when you have seen enough of your build to know its weakest link. Do not use before round 4 — you may need the specific rune you have. High-skill-expression rune.'
  },

  {
    id: 'infiniteGrid',
    name: 'Infinite Grid',
    category: 'special',
    rarity: 'legendary',
    description: 'Letters never deplete — every tile recharges 3 seconds after being used.',
    mechanic: 'Used tiles show a 3-second cooldown indicator and become selectable again after it expires. This allows reusing the same tile in the same round for different words. A tile already in the current word path cannot be reused within that word.',
    unlockTier: 4,
    icon: '♾️',
    synergyNotes: 'Game-breaking in volume builds. High-value letters (Q, Z, X) can be reused multiple times per round. Pairs with Rare Finder chip (reuse Q tile 5 times = +25 chip per word). Enables patterns otherwise impossible on a Boggle grid. This is a run-defining rune — the entire strategy shifts around it.'
  },

  {
    id: 'timeFreezeSpecial',
    name: 'Time Freeze',
    category: 'special',
    rarity: 'legendary',
    description: 'Once per round, freeze the timer for 8 seconds when you submit a word scoring 30+ points.',
    mechanic: 'First word per round that scores >= 30 points (after all runes) triggers: timerPaused = true for 8000ms. Timer freezes, shows visual effect. Only fires once per round.',
    unlockTier: 5,
    icon: '❄️',
    synergyNotes: 'Effectively gives +8 seconds per round for free if you can trigger the 30-point threshold (easy in mid-run with any scoring runes). Pairs with Time Warp for a total of +18s per round. Strong counter to The Clock boss (30s + 8s freeze = 38s effectively). Best late run when 30 pts per word is trivial.'
  },

  {
    id: 'runeResonance',
    name: 'Rune Resonance',
    category: 'special',
    rarity: 'legendary',
    description: 'Once per round, the first time two or more mult runes trigger on the same word, add a bonus ×1.5 on top.',
    mechanic: 'Track how many mult runes fire on each word. If multRunesTriggeredThisWord >= 2 and resonanceUsedThisRound === false: totalScore × 1.5 additionally, set resonanceUsedThisRound = true.',
    unlockTier: 4,
    icon: '🎶',
    synergyNotes: 'Rewards building a mult-dense loadout. In a 3-mult build, most words trigger 2-3 mults and this fires automatically once per round. Pairs with Critical Hit (if crit fires alongside another mult, the resonance also fires). Scales with the number of conditional mults you hold — the more mults, the more often resonance qualifies.'
  },

];
```

---

### CURSED RUNES — 10 cards

Cursed runes provide powerful scoring bonuses at a real cost. The power-to-drawback ratio is intentionally steep — these should feel like calculated bets.

**Unlock note**: Cursed runes are spread across tiers 3-5 to avoid all flooding in at once.

```typescript
const cursedRunes: RuneCard[] = [

  // ─── TIER 3 CURSED (3) — simple drawbacks ────────────────────────────────

  {
    id: 'tunnelVision',
    name: 'Tunnel Vision',
    category: 'cursed',
    rarity: 'rare',
    description: 'Words of 7+ letters score ×4, but 3-4 letter words score 0.',
    mechanic: 'if wordLength >= 7: totalScore × 4 | if wordLength <= 4: totalScore = 0',
    unlockTier: 3,
    icon: '🔭',
    synergyNotes: 'Defines the Long Word build. Pair with Long Haul, Word Smith, and Hint Whisper (the hint guarantees one long word per round). Against The Abbreviator boss (only 3-4 letter words count), this rune is literally unplayable — discard it before that boss. On Big Grid, more 7+ letter words exist. Devastating payoff when comboed properly.'
  },

  {
    id: 'berserker',
    name: 'Berserker',
    category: 'cursed',
    rarity: 'rare',
    description: 'All words score ×3, but the timer is 40 seconds instead of 60.',
    mechanic: 'roundDuration = 40 (overrides base 60; if Time Warp also held, 40 + 10 = 50). All word scores × 3 unconditionally.',
    unlockTier: 3,
    icon: '⚔️',
    synergyNotes: 'Raw math: 40s × ×3 vs 60s × ×1 — breakeven at 2/3rds the words. If you can find 7 words in 40s instead of 10 in 60s, you come out ahead (7 × 3 = 21 unit vs 10 × 1 = 10 unit). Works brilliantly with Speed Demon and Short Sprint (fast 3-letter words under timer pressure). Time Warp partially offsets the cost (40 → 50s).'
  },

  {
    id: 'gamblerRune',
    name: 'Gambler',
    category: 'cursed',
    rarity: 'rare',
    description: 'Every word has a 50% chance to score ×5 or ×0 (a coin flip per word).',
    mechanic: 'Math.random() < 0.5 ? totalScore × 5 : totalScore = 0',
    unlockTier: 3,
    icon: '🎲',
    synergyNotes: 'High-variance run-shaper. Over 10 words, expected value is 2.5× — strictly positive. The danger is the distribution: 5 zero-scores in a row ends your run. Manage risk by submitting many small words (a ×0 on a 5-point word loses less than a ×0 on a 100-point word). Anti-synergy with Avalanche chip (a ×0 word sets Avalanche chip to 0 next word). Pairs with Glass Cannon at your own peril.'
  },

  // ─── TIER 4 CURSED (4) — steep drawbacks ─────────────────────────────────

  {
    id: 'glassCannon',
    name: 'Glass Cannon',
    category: 'cursed',
    rarity: 'rare',
    description: 'All words score ×2, but missing any round target ends the run instantly (no grace).',
    mechanic: 'totalScore × 2 unconditionally. If finalRoundScore < roundTarget: runOver = true immediately (instead of the normal continue flow).',
    unlockTier: 4,
    icon: '💠',
    synergyNotes: 'The highest-stakes rune in the game. Doubles everything but removes all safety net. Strong when you are confident in your build. Combine with reliable scoring runes (Grand Master, Word Smith) not with variance runes (Critical Hit, Gambler). Against The Wall boss (2× target), the glass cannon pressure is almost unsurvivable without a full mult stack.'
  },

  {
    id: 'debtCollector',
    name: 'Debt Collector',
    category: 'cursed',
    rarity: 'rare',
    description: 'Your score starts each round at -30, but all words score ×1.8.',
    mechanic: 'roundScore starts at -30 (player must first overcome the deficit). All word scores × 1.8.',
    unlockTier: 4,
    icon: '💸',
    synergyNotes: 'The -30 debt means you need 2-3 words just to break even. After that, ×1.8 on every word is strong. Pairs with First Blood chip (+15 chip on word 1 = faster debt recovery). Against The Escalator boss (target grows per word), the debt makes early words even more costly — not recommended together.'
  },

  {
    id: 'noRepeat',
    name: 'No Repeat Policy',
    category: 'cursed',
    rarity: 'legendary',
    description: 'Words score ×2.5, but you cannot submit any word you have submitted before in this run.',
    mechanic: 'Maintain a set of all words submitted this run. If currentWord is in that set: reject submission (display "Already Used"). Otherwise: totalScore × 2.5.',
    unlockTier: 4,
    icon: '🚫',
    synergyNotes: 'Pressures vocabulary breadth. By round 7, you will have used 50+ words, and the grid may feel barren. Big Grid rune dramatically extends the viable word pool. Word Hoarder chip actually loses some value here (you are incentivized to branch out, not repeat). Requires genuine vocabulary knowledge to survive to round 9.'
  },

  {
    id: 'timeStarved',
    name: 'Time Starved',
    category: 'cursed',
    rarity: 'legendary',
    description: 'Each word you submit reduces the timer by 3 seconds, but you score an extra ×1.5 multiplier.',
    mechanic: 'On each word submission: timeRemaining -= 3000ms. totalScore × 1.5. If timeRemaining <= 0: round ends immediately.',
    unlockTier: 4,
    icon: '⏳',
    synergyNotes: 'Caps effective word count at ~13 words (40s / 3s each on 60s timer — Time Warp helps). Rewards maximum efficiency: every word must count. Pairs perfectly with Front Load (get your 3 big words in fast, then let the remaining time drain safely). Strong with any high-chip build since fewer words means each must carry more weight.'
  },

  // ─── TIER 5 CURSED (3) — extreme drawbacks ───────────────────────────────

  {
    id: 'oathOfSilence',
    name: 'Oath of Silence',
    category: 'cursed',
    rarity: 'legendary',
    description: 'All words score ×4, but you cannot use any letter that appeared in your previous word.',
    mechanic: 'After each word submission, store the set of letters used. Next word must not contain any letter from that set. If it does: reject submission. The restriction applies to the previous word only (not cumulative).',
    unlockTier: 5,
    icon: '🤫',
    synergyNotes: 'Forces radical grid navigation. After BRAVE (B,R,A,V,E banned), you must find words using only the remaining letters. On a 5×5 grid with 25 tiles, this is hard but achievable. Pairs with Big Grid (more tiles = easier to find valid words after restriction). The ×4 payoff is the highest unconditional mult in the game. The ultimate skill-expression rune.'
  },

  {
    id: 'overload',
    name: 'Overload',
    category: 'cursed',
    rarity: 'legendary',
    description: 'Scores ×3, but this rune\'s multiplier decreases by ×0.1 each round (×3 → ×2.9 → ×2.8 ...) down to a floor of ×1.5.',
    mechanic: 'multValue = max(1.5, 3.0 - (0.1 × roundNumber - roundPickedUp)). Applied each word.',
    unlockTier: 5,
    icon: '🔋',
    synergyNotes: 'Incentivizes picking this rune as early as possible. Round 1 pickup: ×3.0 → ×2.5 by round 6 → ×2.0 by round 11. Still worth it throughout. Round 5 pickup: ×3.0 → ×2.5 by round 9. Time-sensitive — unlike most runes, earlier is always better. Pairs with Word Alchemy (if Overload decays too much, alchemize it into a new legendary).'
  },

  {
    id: 'lastStand',
    name: 'Last Stand',
    category: 'cursed',
    rarity: 'legendary',
    description: 'Every word scores ×5, but if you score below the target, you lose 2 rune slots permanently for the rest of the run.',
    mechanic: 'totalScore × 5. On round failure: permanently reduce maxRuneSlots by 2 (minimum 1 slot). Run does not end, but the punishment is severe.',
    unlockTier: 5,
    icon: '⚰️',
    synergyNotes: 'Nuclear option. The ×5 is the highest single rune mult in the game. The punishment is the most severe (losing rune slots means losing all runes that no longer fit — the player chooses which to discard). Only viable in a very confident, consistent build. Anti-synergy with any high-variance rune. The "confident expert" rune.'
  },

];
```

---

## Boss Constraint Catalog — 15 Constraints

```typescript
export interface BossConstraint {
  id: string;
  name: string;
  description: string;        // one sentence, shown to player
  mechanic: string;           // exact implementation logic
  targetModifier: number;     // 1.0 = normal target, 1.5 = 50% harder, etc.
  roundAppearances: number[]; // which boss round(s) this can appear on (1=R3, 2=R6, 3=R9)
  difficulty: 'moderate' | 'hard' | 'brutal';
  counterRunes: string[];     // rune IDs that directly counter this
  fairnessNote: string;       // designer note on whether this is beatable
}

const bossConstraints: BossConstraint[] = [

  // ─── LETTER CONSTRAINTS ─────────────────────────────────────────────────

  {
    id: 'theCensor',
    name: 'The Censor',
    description: 'All vowels (A, E, I, O, U) are worth 0 letter points this round.',
    mechanic: 'letterPoints[v] = 0 for v in [A, E, I, O, U] during this round. Chip bonuses that reference vowels (Vowel Miner, Vowel Power) still fire based on vowel presence, but the base letter value is 0.',
    targetModifier: 1.0,
    roundAppearances: [1, 2],
    difficulty: 'moderate',
    counterRunes: ['consonantClub', 'rareFinder', 'wordSmith', 'criticalHit'],
    fairnessNote: 'Beatable with any mult-heavy build. Consonants alone can score 6-8 pts on a 5-letter word. Mult runes are unaffected. Vowel Miner chip still fires (+3 per vowel chip bonus) so vowel-chip builds adapt. Unfair only if player has zero mults — which is rare by round 3.'
  },

  {
    id: 'theAbbreviator',
    name: 'The Abbreviator',
    description: 'Only 3-letter and 4-letter words count this round — longer words score 0.',
    mechanic: 'if wordLength > 4: totalScore = 0',
    targetModifier: 1.0,
    roundAppearances: [1, 2],
    difficulty: 'moderate',
    counterRunes: ['shortSprint', 'sweetSpot', 'speedDemon', 'comboFire'],
    fairnessNote: 'Beatable for all players — 3-4 letter words are the most common and fastest to find. Punishes Long Word builds (Tunnel Vision becomes dead weight — recommend discarding before this boss). Short Sprint + Sweet Spot make this round very strong. Not brutal.'
  },

  {
    id: 'thePurist',
    name: 'The Purist',
    description: 'Only 6-letter words or longer count this round — shorter words score 0.',
    mechanic: 'if wordLength < 6: totalScore = 0',
    targetModifier: 1.0,
    roundAppearances: [1, 2, 3],
    difficulty: 'hard',
    counterRunes: ['bigGrid', 'hintWhisper', 'wordSmith', 'longHaul', 'timeWarp'],
    fairnessNote: 'Hard but fair. A skilled player can find 4-6 words of 6+ letters in 60 seconds on a 5×5 grid. Big Grid (6×6) dramatically increases the pool. Hint Whisper is essential here as a safety net. Tunnel Vision builds thrive. Unwinnable only if player has fewer than 2 total mults AND no length-support runes — very rare.'
  },

  {
    id: 'theBanisher',
    name: 'The Banisher',
    description: 'One common letter (E, S, T, or A — chosen randomly) is removed from the grid this round.',
    mechanic: 'At round start, randomly select one of [E, S, T, A]. Replace all tiles with that letter with X (a rare letter). The replacement letter is shown on the boss card.',
    targetModifier: 1.0,
    roundAppearances: [1, 2, 3],
    difficulty: 'moderate',
    counterRunes: ['bigGrid', 'hintWhisper', 'wordDynamite'],
    fairnessNote: 'The severity depends on which letter is banned. Banning E is the hardest (most common letter). Banning A is moderate. The grid still has 20-23 unique letters — words without one common letter exist in abundance. The replacement X tiles can be useful for Rare Finder builds.'
  },

  // ─── GRID CONSTRAINTS ────────────────────────────────────────────────────

  {
    id: 'theFog',
    name: 'The Fog',
    description: 'Half the grid tiles are face-down; they reveal when an adjacent tile is used in a word.',
    mechanic: 'At round start, randomly flip 12-13 of 25 tiles face-down (letter hidden, shown as "?"). A tile reveals permanently when any orthogonally or diagonally adjacent tile is used in a submitted word.',
    targetModifier: 1.0,
    roundAppearances: [1, 2, 3],
    difficulty: 'moderate',
    counterRunes: ['hintWhisper', 'shortSprint', 'comboFire'],
    fairnessNote: 'Starts hard and gets easier as tiles reveal. The hint from Hint Whisper is calculated on fully-revealed grid state (implementation should pre-reveal the hint path). Speed Demon and Short Sprint work well since 3-letter words on visible tiles can chain rapidly. By mid-round, most tiles are revealed. Not unwinnable.'
  },

  {
    id: 'theRot',
    name: 'The Rot',
    description: 'Three random tiles turn to stone (unusable) every 15 seconds.',
    mechanic: 'Every 15 seconds: randomly select 3 non-stone tiles and set them to stone (visually crumbled, unselectable). Stone tiles do NOT come back. A grid can be reduced to 16 usable tiles by end of round.',
    targetModifier: 1.0,
    roundAppearances: [2, 3],
    difficulty: 'hard',
    counterRunes: ['frontLoad', 'berserker', 'forgeFrenzy'],
    fairnessNote: 'Hard in round 9 where hitting 750 on a depleting grid is brutal. Front Load is the correct counter — score hard in the first 15 seconds before the rot begins. Berserker (40s timer) means you only lose 1-2 rounds of stone tiles. Beatable but punishing if player is slow.'
  },

  {
    id: 'theShuffle',
    name: 'The Shuffle',
    description: 'The grid rearranges into a new random layout every 20 seconds.',
    mechanic: 'Every 20 seconds: all tiles keep their letters but are repositioned to a new random valid Boggle grid layout. Any word currently being traced is cancelled.',
    targetModifier: 1.0,
    roundAppearances: [1, 2, 3],
    difficulty: 'hard',
    counterRunes: ['shortSprint', 'speedDemon', 'comboFire', 'hintWhisper'],
    fairnessNote: 'Frustrating but fair. The key insight: find and play a word in under 20 seconds, then the shuffle resets your mental map. Short Sprint (fast 3-letter words) is the ideal counter. Hint Whisper updates after each shuffle (show the hint on the new layout). Unwinnable? No — but high-stress.'
  },

  {
    id: 'theShrink',
    name: 'The Shrink',
    description: 'The grid is 4×4 instead of 5×5, giving fewer letters and shorter possible paths.',
    mechanic: 'gridSize = 4×4 this round only. If Big Grid rune is held: gridSize = max(4, bigGridActive ? 5 : 4) = 5×5 (Big Grid partially absorbs the penalty, reducing it from 4×4 to the standard 5×5). The Shrink is never a no-op for Big Grid players — they go from 6×6 down to 5×5, losing 11 tiles.',
    targetModifier: 0.8,
    roundAppearances: [1, 2],
    difficulty: 'moderate',
    counterRunes: ['shortSprint', 'sweetSpot', 'comboFire'],
    fairnessNote: 'Target is reduced to 80% to compensate for fewer possible words. A 4×4 grid supports 16 tiles — adequate for 3-5 letter words but nearly impossible for 7+. Tunnel Vision builds should discard Tunnel Vision before this boss or accept lower scoring. Big Grid holders go to 5×5, not 6×6 — a meaningful penalty. Moderate difficulty overall.'
  },

  // ─── SCORING CONSTRAINTS ────────────────────────────────────────────────

  {
    id: 'theWall',
    name: 'The Wall',
    description: 'The target score for this round is doubled.',
    mechanic: 'roundTarget × 2',
    targetModifier: 2.0,
    roundAppearances: [2, 3],
    difficulty: 'brutal',
    counterRunes: ['grandMaster', 'glassCannon', 'frontLoad', 'neverDie'],
    fairnessNote: 'Brutal on final boss (R9 target 750 → 1500). Only survivable with a strong mult stack. At R6 (target 300 → 600), manageable with 2-3 runes. Restricted to rounds 2 and 3 boss slots (R6 and R9 max). Players should not see this on R3 (R3 target 120 → 240 is hard with 1 rune). Designer note: if this appears on R9, expect only skilled 5-rune players to beat it.'
  },

  {
    id: 'theClock',
    name: 'The Clock',
    description: 'The timer is 30 seconds instead of 60 this round.',
    mechanic: 'roundDuration = 30 (overrides base; Time Warp adds +10 → 40s; Berserker conflict: both reduce timer, use 30s floor)',
    targetModifier: 1.0,
    roundAppearances: [1, 2, 3],
    difficulty: 'hard',
    counterRunes: ['timeWarp', 'frontLoad', 'speedDemon', 'forgeFrenzy'],
    fairnessNote: 'Hard but one of the most skill-testable constraints. Speed Demon becomes extremely powerful here (rapid 3-second words under 30s = 10 words if perfect). Time Warp reduces the penalty (30 → 40s). Front Load (first 3 words × 3) means you only need 3 great words in 30s. Beatable.'
  },

  {
    id: 'theThief',
    name: 'The Thief',
    description: 'Each word costs 5 points — your score decreases by 5 before the word\'s score is added.',
    mechanic: 'On each word submission: roundScore -= 5, then add wordScore normally. Net effect: every word must score > 5 to be worth playing.',
    targetModifier: 1.0,
    roundAppearances: [1, 2, 3],
    difficulty: 'moderate',
    counterRunes: ['firstBlood', 'wordSmith', 'rareFinder'],
    fairnessNote: 'Eliminates junk 3-letter words scoring 3-4 pts (net negative). Forces quality over quantity. Players learn to only submit words they are confident will score 10+. First Blood (+15 chip on word 1) cleanly offsets 3 thefts. Moderate difficulty; teaches good habits.'
  },

  {
    id: 'theEscalator',
    name: 'The Escalator',
    description: 'The target increases by 5% after each word you submit this round.',
    mechanic: 'After each word submission: roundTarget × 1.05. The displayed target updates in real-time.',
    targetModifier: 1.0,
    roundAppearances: [1, 2, 3],
    difficulty: 'hard',
    counterRunes: ['frontLoad', 'crescendo', 'wordHoarder'],
    fairnessNote: 'Counterintuitive — submit too many words and the target spirals. Optimal play: find 3-4 high-scoring words, not 10 small ones. By word 10, the target has grown by 63% (1.05^10 ≈ 1.63). Front Load is the perfect counter: 3 words × 3 mult, then stop. Beatable with correct strategy, brutal with spam strategy.'
  },

  // ─── RUNE CONSTRAINTS ────────────────────────────────────────────────────

  {
    id: 'theNullifier',
    name: 'The Nullifier',
    description: 'Your two most recently acquired runes are disabled this round.',
    mechanic: 'Sort equippedRunes by acquisitionOrder descending. Disable runes[0] and runes[1] for this round. Disabled runes display as grayed out in the rune bar. Effect is reversed after the round.',
    targetModifier: 1.0,
    roundAppearances: [1, 2, 3],
    difficulty: 'hard',
    counterRunes: ['loneSurvivor'],
    fairnessNote: 'Punishes "rune hoarding" — if you stack mults in rounds 4 and 5 and then face this in round 6, you lose your two best runes. Lone Survivor (bonus for having <=3 runes) counter is intentional. Players who diversify their collection early are less impacted. Disabled runes are the two newest — not the two strongest. This is important: an experienced player can plan around it by staggering pickup order.'
  },

  {
    id: 'theInverter',
    name: 'The Inverter',
    description: 'Chip runes are disabled this round — only Mult and Special runes contribute.',
    mechanic: 'All chip rune bonuses = 0 this round. Mult and Special runes apply normally.',
    targetModifier: 1.0,
    roundAppearances: [1, 2, 3],
    difficulty: 'moderate',
    counterRunes: ['grandMaster', 'criticalHit', 'comboFire', 'wordSmith'],
    fairnessNote: 'Moderate. Players with strong mult builds barely feel this (Gold Rush chip is gone but the mults carry them). Players with chip-heavy builds (Vowel Miner, Word Hoarder, Long Haul) take a significant hit. Mult-only players find this constraint irrelevant. Rewards diverse rune selection. Beatable by all but chip-only players.'
  },

  {
    id: 'theMirror',
    name: 'The Mirror',
    description: 'Your rune effects are reversed this round — Chip runes become negative, Mult runes invert to divide instead of multiply.',
    mechanic: 'chipBonus × -1 (chips subtract instead of add). multValue becomes 1/multValue (×1.5 becomes ÷1.5 = ×0.667). Special runes are unaffected.',
    targetModifier: 0.6,
    roundAppearances: [3],
    difficulty: 'brutal',
    counterRunes: ['timeFreezeSpecial', 'wordDynamite', 'hintWhisper'],
    fairnessNote: 'Brutal and only appears on the final boss (R9). Target reduced to 60% to compensate. Players must abandon all their carefully built rune synergies and play as if they have zero runes — raw word scoring only. Special runes (Echo, Time Warp, Hint Whisper) remain active. This is the final boss challenge: can you hit a reduced target with your special runes alone? Beatable with good raw word skill. Not unwinnable — the 60% target reduction is intentional and calibrated.'
  },

];
```

---

## Unlock Tier Summary

| Tier | XP Required | Runes Added | Rarity Unlock | Running Total |
|------|------------|-------------|---------------|---------------|
| 0 | 0 (starting) | 15 starter runes | Common only | 15 |
| 1 | 100 XP | 6 new runes | Common only | 21 |
| 2 | 300 XP | 11 new runes | Rare runes now available | 32 |
| 3 | 600 XP | 13 new runes (first 3 Cursed) | Rare available | 45 |
| 4 | 1000 XP | 9 new runes (4 more Cursed) | Legendary runes now available | 54 |
| 5 | 1500 XP | 6 new runes (final 3 Cursed) | Full pool | 60 |

### Starting Pool (Tier 0 — 15 runes)

These runes are in the pool from run 1. They are all common rarity, simple mechanics, and cover each category to introduce the system:

| ID | Name | Category |
|----|------|----------|
| vowelMiner | Vowel Miner | chip |
| longHaul | Long Haul | chip |
| firstBlood | First Blood | chip |
| doubleDown | Double Down | chip |
| rareFinder | Rare Finder | chip |
| wordSmith | Word Smith | mult |
| comboFire | Combo Fire | mult |
| alliteration | Alliteration | mult |
| echo | Echo | special |
| timeWarp | Time Warp | special |
| hintWhisper | Hint Whisper | special |
| wordMirror | Word Mirror | special |
| letterLock | Letter Lock | special |
| chainLink | Chain Link | mult |
| speedDemon | Speed Demon | mult |

**Design rationale**: The starter pool deliberately includes 5 chips, 5 mults, and 5 specials. No cursed runes until tier 3. The pool is learnable in 3-5 runs. Players should be able to identify 2-3 synergies (Long Haul + Word Smith + Echo is discoverable from day 1) before the pool expands.

---

## Rarity Offering Percentages by Round

These percentages determine what rarity each of the 3 rune card offerings can be.

```typescript
export interface OfferingRarityWeights {
  common: number;   // percentage (0-100)
  rare: number;
  legendary: number;
}

export const offeringRarityByRound: Record<number, OfferingRarityWeights> = {
  1:  { common: 100, rare: 0,  legendary: 0  },
  2:  { common: 90,  rare: 10, legendary: 0  },  // Rare can appear if XP >= 300
  3:  { common: 75,  rare: 25, legendary: 0  },
  4:  { common: 65,  rare: 35, legendary: 0  },
  5:  { common: 55,  rare: 40, legendary: 5  },  // Legendary can appear if XP >= 1000
  6:  { common: 40,  rare: 45, legendary: 15 },
  7:  { common: 30,  rare: 50, legendary: 20 },
  8:  { common: 20,  rare: 50, legendary: 30 },
  9:  { common: 10,  rare: 45, legendary: 45 },  // Final boss run: near-equal rare/legendary
};
// For rounds 10+ (endless): { common: 5, rare: 40, legendary: 55 }
```

**XP gate override**: If the player has not yet unlocked Rare runes (< 300 XP), all rare slots fall back to common. If Legendary not unlocked (< 1000 XP), legendary slots fall back to rare (or common if rare also not unlocked). This prevents early players from seeing rarity types they have not unlocked, while giving experienced players increasingly powerful offerings as the run progresses.

**Boss reward offerings** (after defeating a boss): guaranteed minimum 1 Rare and 1 Legendary card in the 3 offerings, regardless of round number. This is the boss payoff.

---

## Build Archetypes — Design Reference

These four archetypes represent the main strategies a player can discover. Each uses runes from the starting pool and expands with unlocks, giving both new and experienced players a coherent path.

### Archetype 1: Long Word

Core runes: Long Haul (chip) + Word Smith (mult) + Tunnel Vision (cursed)
Enhancers: Hint Whisper, Big Grid, Perfect Five, Palindrome Power
Counter: The Abbreviator boss (must discard Tunnel Vision), The Shrink
Target round: Viable from round 3, dominant by round 7

### Archetype 2: Speed Chain

Core runes: Speed Demon (mult) + Combo Fire (mult) + Short Sprint (chip)
Enhancers: Streak Bonus, alliteration, Berserker (cursed tradeoff)
Counter: The Fog, The Shuffle (disrupts flow)
Target round: Strong from round 1, plateaus around round 6 without additional mults

### Archetype 3: Vowel Cascade

Core runes: Vowel Miner (chip) + Vowel Power (mult) + Echo (special)
Enhancers: Word Smith, Crescendo, Letter Feast (choose E)
Counter: The Censor (vowels worth 0 — chips still fire, but base letter pts tank)
Target round: Consistent throughout; not explosive but reliable

### Archetype 4: Glass Gambler

Core runes: Gambler (cursed) + Glass Cannon (cursed) + Critical Hit (mult)
Enhancers: Double Or Nothing, Avalanche, Grand Master
Counter: Any variance boss (The Escalator especially)
Target round: High-variance; either reaches round 9 easily or dies on round 4. The "no guts no glory" build.

---

## Implementation Notes for TypeScript

```typescript
// Recommended type augmentations based on mechanic requirements

// State each rune engine needs per-word:
export interface WordContext {
  word: string;
  wordLength: number;
  letterPoints: number;       // base Scrabble points
  vowelCount: number;
  consonantCount: number;
  hasDoubledLetters: boolean;
  hasRareLetters: boolean;
  rareLetterCount: number;
  isFirstWordThisRound: boolean;
  isFirstWordThisRun: boolean; // for Word Mirror replay tracking
  wordsSubmittedThisRound: number;
  wordsSubmittedThisRun: number;
  uniqueWordsThisRun: Set<string>;
  consecutiveStreak: number;  // for Combo Fire, Streak Bonus
  timeSinceLastWord: number;  // ms, for Speed Demon
  lastWordFirstLetter: string;
  lastWordLastLetter: string;
  tilesUsed: GridPosition[];  // for Edge Walker, Center Stage, Catalyst
  isPalindrome: boolean;
  lastWordTotalScore: number; // for Avalanche chip
  bossesDefeated: number;     // for Immortal Flame
  runesEquipped: RuneCard[];  // for Lone Survivor
  roundNumber: number;        // for Overload decay
  roundPickedUpByRuneId: Record<string, number>; // for Overload rune-specific round
}

// Rune application order (chips before mults, all mults multiply together):
export function applyRunes(baseLetterPoints: number, ctx: WordContext, runes: RuneCard[]): number {
  const chips = runes.filter(r => r.category === 'chip');
  const mults = runes.filter(r => r.category === 'mult' || r.category === 'cursed');
  const specials = runes.filter(r => r.category === 'special');

  let score = baseLetterPoints;
  for (const chip of chips) score += evaluateChip(chip, ctx);
  score *= getLengthBonus(ctx.wordLength);
  for (const mult of mults) score *= evaluateMult(mult, ctx);
  score = Math.floor(score);
  return score;
}
```

---

*End of catalog. 60 rune cards + 15 boss constraints. Ready for `lib/wordForge/runeCards.ts` and `lib/wordForge/bossConstraints.ts`.*
