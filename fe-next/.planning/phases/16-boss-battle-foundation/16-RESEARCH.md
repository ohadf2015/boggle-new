# Phase 16 Research: Boss Battle Foundation

## Summary

Boss infrastructure is approximately 80% complete. The main gaps are:
1. HP tracking system and phase transitions
2. BossHPBar UI component
3. Integration of boss components into AdventureGame

## Existing Infrastructure

### Types (100% Complete)
- `types/boss.ts` - BossConfig, BossGameState, BossMechanicResult, BossTwistType
- `types/adventure.ts` - LevelConfig.isBossLevel, LevelConfig.bossTwist

### Configuration (100% Complete)
- `lib/adventure/bossConfig.ts` - All 10 boss configurations defined
- Boss mechanics: popQuiz, hiveMind, etymologyDig, idiomBattle, assemblyLine, scrambledReality, mirrorMatch, stellarForge, babelSummit, finalWord
- Taunts: onStart, onGoodWord, onBadWord, onMechanic, onLowTime, onVictory, onDefeat

### Hooks (80% Complete)
- `hooks/useBossMechanics.ts` - Word evaluation, taunt display, phase advancement
- Missing: HP tracking, damage calculation, phase transitions based on HP

### UI Components (100% Complete)
- `components/adventure/BossIntro.tsx` - Pre-battle cutscene
- `components/adventure/BossDialogue.tsx` - In-battle taunts
- `components/adventure/BossVictory.tsx` - Victory/defeat screen
- Missing: BossHPBar component

## Gap Analysis

### BOSS-01: Phase Transitions
**Status:** Types exist, state machine needed

Phases should be:
- `intro` - BossIntro component shows
- `active` - Normal gameplay, damage dealt
- `enraged` - Boss at <25% HP, mechanics intensify
- `victory` - Boss HP reaches 0
- `defeat` - Timer expires before boss defeated

**Implementation:**
- Add `BossPhase` type: `'intro' | 'active' | 'enraged' | 'victory' | 'defeat'`
- Create `useBossHealth` hook with phase state machine
- Connect to existing useBossMechanics

### BOSS-02: HP Bar with Phase Indicators
**Status:** Not implemented

Required:
- Boss HP percentage (0-100)
- Phase indicator (normal/enraged)
- Real-time updates during battle
- Animated damage feedback

**Implementation:**
- Create `BossHPBar.tsx` component
- Display world-themed HP bar
- Show phase indicators
- Animate damage dealt

### BOSS-03: popQuiz Mechanic
**Status:** COMPLETE

Already implemented in useBossMechanics:
- evaluatePopQuiz function
- Requirement types: doubleLetters, startsWith, exactLength, containsVowel
- Bonus/penalty multipliers

### BOSS-04: hiveMind (Sticky Tiles)
**Status:** Deferred to Phase 17

Complex tile persistence requires:
- Tile state persistence between turns
- New sticky tile type
- Grid state management changes

**Recommendation:** Defer to Phase 17 (Boss Mechanic Expansion)

### BOSS-05: synonymShift (Bonus for Synonyms)
**Status:** Deferred to Phase 17

Requires:
- Synonym dictionary/API
- Word relationship detection
- NLP integration

**Recommendation:** Defer to Phase 17 (Boss Mechanic Expansion)

### BOSS-13: Adaptive Difficulty
**Status:** Deferred to Phase 18

Requires:
- Player performance analytics
- Difficulty adjustment algorithm
- 80% completion target calibration

**Recommendation:** Defer to Phase 18 (Education XP System has analytics)

## Phase 16 MVP Scope

Based on analysis, Phase 16 should focus on:
1. **Core HP System** - useBossHealth hook with damage, HP tracking, phase transitions
2. **HP Bar UI** - BossHPBar component with real-time updates
3. **Integration** - Wire boss components into AdventureGame
4. **popQuiz mechanic** - Already complete, just needs integration

Deferred to Phase 17:
- BOSS-04 (sticky tiles)
- BOSS-05 (synonyms)
- BOSS-13 (adaptive difficulty) -> Phase 18

## File Size Constraints

**CRITICAL:** Must create new files to avoid exceeding 500-line limit:
- useAdventureGame.ts: 778 lines (already over limit)
- AdventureGame.tsx: 1099 lines (already over limit)

**Strategy:**
- Create `hooks/useBossHealth.ts` for HP logic (~150 lines)
- Create `components/adventure/BossHPBar.tsx` for UI (~100 lines)
- Minimal integration points in existing files

## Integration Architecture

```
AdventureGame.tsx
├── useBossMechanics (existing) - word evaluation, taunts
├── useBossHealth (NEW) - HP tracking, damage, phases
│   └── integrates with gameState.comboCount from Phase 15
├── BossHPBar (NEW) - HP display
├── BossIntro (existing) - shows during 'intro' phase
├── BossDialogue (existing) - shows during 'active' phase
└── BossVictory (existing) - shows during 'victory'/'defeat' phase
```

## Damage Formula

Proposal for Phase 15 combo integration:
```typescript
const baseDamage = score / 10; // Base damage from word score
const comboMultiplier = 1 + (comboCount * 0.1); // +10% per combo
const mechanicBonus = bossMechanicResult.scoreMultiplier;
const totalDamage = Math.round(baseDamage * comboMultiplier * mechanicBonus);
```

## HP Calculation

Boss HP should scale with world number:
```typescript
const baseHP = 500;
const worldMultiplier = 1 + (worldNumber - 1) * 0.2; // +20% per world
const bossHP = Math.round(baseHP * worldMultiplier);
// World 1: 500, World 3: 700, World 5: 900, World 10: 1400
```

## Implementation Waves

### Wave 1: Core HP System (useBossHealth.ts)
- Types: BossPhase, BossHealthState
- Hook: useBossHealth with HP tracking, damage, phase transitions
- TDD: Test HP changes, phase transitions, damage calculations

### Wave 2: HP Bar Component (BossHPBar.tsx)
- Component: BossHPBar with HP percentage, phase indicator
- Styling: Neo-brutalist, world-themed
- Animation: Damage feedback, phase transition effects

### Wave 3: Integration
- Wire useBossHealth into AdventureGame
- Connect boss phase to existing components
- Show/hide BossIntro, BossDialogue, BossVictory based on phase

### Wave 4: Verification
- Playtest boss battles
- Verify phase transitions
- Verify combo damage integration
