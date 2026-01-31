---
phase: 30
plan: 05
subsystem: boss-battle
tags: [abilities, boss-mechanics, translations, registry-pattern]
depends_on:
  requires: [30-04]
  provides: [24-boss-abilities, ability-translations]
  affects: [30-06, 30-07, 30-08]
tech-stack:
  added: []
  patterns: [boss-ability-definitions, personality-driven-design]
files:
  created:
    - lib/adventure/abilities/msGrammarAbilities.ts
    - lib/adventure/abilities/spellingBeeAbilities.ts
    - lib/adventure/abilities/professorThesaurusAbilities.ts
    - lib/adventure/abilities/captainMetaphorAbilities.ts
    - lib/adventure/abilities/baronBuildawordAbilities.ts
    - lib/adventure/abilities/puzzleMasterAbilities.ts
    - lib/adventure/abilities/reflectionKingAbilities.ts
    - lib/adventure/abilities/cosmicWordsmithAbilities.ts
    - lib/adventure/abilities/linguistSageAbilities.ts
    - lib/adventure/abilities/lexiconDragonAbilities.ts
    - lib/adventure/abilities/index.ts
    - lib/adventure/abilities/index.test.ts
  modified:
    - translations/en.js
    - translations/he.js
    - translations/sv.js
    - translations/ja.js
decisions:
  - id: personality-driven-abilities
    choice: Each ability matches boss personality and twist mechanic
    reason: Creates cohesive boss identity and memorable encounters
  - id: ability-distribution
    choice: 2-3 abilities per boss (24 total)
    reason: Provides variety without overwhelming players
  - id: phase-gated-activation
    choice: Basic abilities in phase1, strong in phase2, ultimate in enraged
    reason: Creates escalating difficulty within each boss fight
metrics:
  duration: 25 minutes
  completed: 2026-01-31
---

# Phase 30 Plan 05: Boss Ability Definitions Summary

24 unique abilities defined across 10 bosses, each matching their personality and twist mechanic.

## What Was Built

### Worlds 1-3 Bosses (8 abilities)

**Ms. Grammar (World 1) - 3 abilities:**
- **Pop Quiz**: Force 5+ letter word requirement (phase1+)
- **Red Pen**: Lock 4 random tiles (phase2+)
- **Detention**: 5 second timer penalty (enraged)

**Spelling Bee (World 2) - 2 abilities:**
- **Bee Swarm**: Spawn 4 sticky tiles (phase1+)
- **Spelling Sting**: Change 3 random letters (HP < 50%)

**Professor Thesaurus (World 3) - 3 abilities:**
- **Synonym Shuffle**: Scramble 1 row (phase1+)
- **Verbose Curse**: Force 6+ letter requirement (phase2+)
- **Etymology Lock**: Lock entire column (enraged)

### Worlds 4-7 Bosses (9 abilities)

**Captain Metaphor (World 4) - 2 abilities:**
- **Island Lock**: Lock 5 random tiles (phase1+)
- **Figurative Storm**: Scramble entire board (enraged)

**Baron Buildaword (World 5) - 2 abilities:**
- **Assembly Line**: Change letters in 1 row (phase1+)
- **Construction Zone**: Lock diagonal tiles (HP < 40%)

**Puzzle Master (World 6) - 3 abilities:**
- **Puzzle Scramble**: Scramble 9 random tiles (phase1+)
- **Anagram Curse**: Force anagram requirement (phase2+)
- **Puzzle Chaos**: Full scramble + 3s penalty (enraged)

**Reflection King (World 7) - 2 abilities:**
- **Mirror Flip**: Scramble 2 rows (phase1+)
- **Palindrome Power**: Force palindrome requirement (enraged)

### Worlds 8-10 Bosses (7 abilities)

**Cosmic Wordsmith (World 8) - 2 abilities:**
- **Star Scatter**: Replace 5 tiles with rare letters (phase1+)
- **Nova Burst**: Full scramble + spawn 3 multiplier tiles (enraged)

**Linguist Sage (World 9) - 2 abilities:**
- **Babel Curse**: Change 6 random letters (phase1+)
- **Polyglot Lock**: Lock 6 random tiles (phase2+)

**Lexicon Dragon (World 10 - Final Boss) - 3 abilities:**
- **Word Flame**: Change 4 random letters (phase1+)
- **Lexicon Storm**: Scramble entire board (phase2+)
- **Ultimate Word**: Scramble + lock 4 tiles + 5s penalty (enraged)

### Index and Registration

Created `index.ts` barrel export with:
- `ALL_BOSS_ABILITIES`: Array of all 24 abilities
- `registerAllAbilities()`: Registers all abilities with global registry
- `getAbilityCount()`: Returns 24 (for verification)
- Individual exports for testing/inspection

### Translations

Added translations for all 24 abilities in 4 languages:
- English (en.js)
- Hebrew (he.js)
- Swedish (sv.js)
- Japanese (ja.js)

Translation key pattern: `adventure.bosses.abilities.{abilityName}.{name|desc}`

## Ability Design Patterns

### Effect Types Used
- `requirement`: Force word length/type requirements (Pop Quiz, Verbose Curse, etc.)
- `lock_tiles`: Prevent tile selection (Red Pen, Island Lock, etc.)
- `scramble`: Shuffle tile positions (Synonym Shuffle, Figurative Storm, etc.)
- `change_tiles`: Replace letters (Spelling Sting, Star Scatter, etc.)
- `timer_penalty`: Reduce remaining time (Detention, Puzzle Chaos, etc.)
- `spawn_special`: Add special tiles (Bee Swarm, Nova Burst)

### Activation Condition Patterns
- Phase-based: `phase1`, `phase2`, `enraged`
- HP threshold: `HP < 50%`, `HP < 40%`
- Combined conditions possible for complex abilities

### Priority System
- Basic abilities: Priority 10
- Advanced abilities: Priority 15
- Ultimate abilities: Priority 20-25
- Higher priority checked first for activation

## Tests Added

41 tests in `index.test.ts`:
- Ability count verification (24 total)
- Unique ID validation
- Boss ability distribution (2-3 per boss)
- Registry integration
- Translation key format validation
- Cooldown, telegraph, effect validation
- Priority validation

## Files Created

| File | Lines | Purpose |
|------|-------|---------|
| `msGrammarAbilities.ts` | 86 | Ms. Grammar's 3 abilities |
| `spellingBeeAbilities.ts` | 71 | Spelling Bee's 2 abilities |
| `professorThesaurusAbilities.ts` | 85 | Professor Thesaurus's 3 abilities |
| `captainMetaphorAbilities.ts` | 59 | Captain Metaphor's 2 abilities |
| `baronBuildawordAbilities.ts` | 58 | Baron Buildaword's 2 abilities |
| `puzzleMasterAbilities.ts` | 85 | Puzzle Master's 3 abilities |
| `reflectionKingAbilities.ts` | 58 | Reflection King's 2 abilities |
| `cosmicWordsmithAbilities.ts` | 65 | Cosmic Wordsmith's 2 abilities |
| `linguistSageAbilities.ts` | 59 | Linguist Sage's 2 abilities |
| `lexiconDragonAbilities.ts` | 92 | Lexicon Dragon's 3 abilities |
| `index.ts` | 97 | Barrel export + registration |
| `index.test.ts` | 165 | 41 tests |

## Commits

| Hash | Message |
|------|---------|
| 1496ecf3 | feat(30-05): define 24 boss abilities across 10 bosses |

## Verification Results

- [x] All 10 ability files compile without errors
- [x] Index file exports all abilities
- [x] registerAllAbilities() registers 24 abilities
- [x] Each boss has 2-3 abilities
- [x] Translations added to all 4 languages (en, he, sv, ja)
- [x] npm run lint passes
- [x] npm run build succeeds
- [x] 41 tests passing

## Deviations from Plan

None - plan executed exactly as written.

## Next Phase Readiness

Ready for 30-06 (Boss Graphics) and 30-07 (Cinematic Sequences). The ability system is complete and can be integrated with:
- Visual effects (telegraph particle effects)
- UI components (ability icons, cooldown displays)
- Boss state machine (ability activation during phases)
