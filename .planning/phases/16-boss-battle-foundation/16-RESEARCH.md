# Phase 16: Boss Battle Foundation - Research Findings

**Research Date:** 2026-01-25
**Researcher:** GSD Phase Researcher Agent
**Phase Goal:** Enable end-of-world boss battles with phase transitions

---

## Executive Summary

Phase 16 builds upon existing adventure mode infrastructure to create interactive boss battles at the end of each world (level 7). The codebase already has substantial boss infrastructure (types, configs, mechanics, UI components) that was built in anticipation of this phase. The main gap is the **boss HP system** and **phase transition mechanics** that turn static boss encounters into dynamic battles.

**Key Finding:** Most boss infrastructure exists, but is currently non-interactive. Boss battles need:
1. HP tracking system (boss health depletes as player scores)
2. Phase transition logic (intro → active → enraged → victory/defeat)
3. HP bar UI component with phase indicators
4. Integration with existing combo scoring (Phase 15) for damage calculations

---

## 1. Existing Infrastructure Analysis

### 1.1 Type Definitions (Complete)

**File:** `/Users/ohadfisher/git/boggle-new/fe-next/types/boss.ts` (231 lines)

**What Exists:**
- `BossTwistType` - 10 boss mechanic types (popQuiz, hiveMind, etc.)
- `BossConfig` - Complete boss configuration interface
- `BossGameState` - Runtime state for boss battles
- `BossMechanicResult` - Word evaluation results
- `BossTaunts` - Dialogue system types
- `UseBossMechanicsReturn` - Hook interface
- UI component props (BossIntroProps, BossDialogueProps, BossVictoryProps)

**What's Missing:**
- ❌ Boss HP tracking types (current HP, max HP, damage calculations)
- ❌ Phase transition types (intro → phase1 → phase2 → enraged → victory/defeat)
- ❌ HP bar display types (phase indicators, HP percentage)
- ❌ Damage calculation types (word score → boss damage mapping)

**Type Definitions Needed:**
```typescript
// NEW: Boss HP System Types
export interface BossHealthState {
  currentHP: number;
  maxHP: number;
  phase: BossBattlePhase;
  phaseThresholds: PhaseThreshold[];
}

export type BossBattlePhase = 'intro' | 'phase1' | 'phase2' | 'enraged' | 'victory' | 'defeat';

export interface PhaseThreshold {
  phase: BossBattlePhase;
  hpThreshold: number; // HP percentage (0-100)
  color: string; // Tailwind color class
}

export interface DamageCalculation {
  baseDamage: number; // From word score
  mechanicMultiplier: number; // From boss mechanic (1.0-3.0x)
  comboMultiplier: number; // From chain combos (1.0-1.5x)
  totalDamage: number; // Final damage to boss HP
}
```

### 1.2 Boss Configuration (Complete)

**File:** `/Users/ohadfisher/git/boggle-new/fe-next/lib/adventure/bossConfig.ts` (150+ lines)

**What Exists:**
- 10 fully-configured bosses (Ms. Grammar → Lexicon Dragon)
- Each boss has personality, visual theme, image path
- Twist mechanics with parameters (requirementTypes, bonusMultipliers, etc.)
- Taunt system (onStart, onGoodWord, onBadWord, onMechanic, onLowTime, onVictory, onDefeat)
- Helper functions: `buildTaunts()`, `defineBoss()`, `getBossConfig()`

**What's Missing:**
- ❌ Boss HP values (maxHP per world difficulty)
- ❌ Phase transition thresholds (e.g., enraged at 25% HP)
- ❌ Damage scaling factors (how word scores convert to damage)

**Configuration Additions Needed:**
```typescript
// ADD to BossConfig interface
export interface BossConfig {
  // ... existing fields
  maxHP: number; // Base HP (scales with world difficulty)
  phaseThresholds: PhaseThreshold[]; // When to trigger phase transitions
  damageScaling: number; // Multiplier for word score → damage conversion
}

// Example boss HP values by world:
World 1 (Ms. Grammar): 500 HP
World 2 (Spelling Bee): 750 HP
World 3 (Professor Thesaurus): 1000 HP
...
World 10 (Lexicon Dragon): 2500 HP
```

### 1.3 Boss Mechanics Hook (Partially Complete)

**File:** `/Users/ohadfisher/git/boggle-new/fe-next/hooks/useBossMechanics.ts` (479 lines)

**What Exists:**
- Word evaluation against 10 twist mechanics
- Taunt triggering with cooldown (3s display, 5s cooldown)
- Phase advancement for multi-phase bosses (finalWord)
- Mechanic state tracking (currentRequirementIndex, currentPhase)
- Helper functions for each mechanic (evaluatePopQuiz, evaluateHiveMind, etc.)

**What's Missing:**
- ❌ Boss HP state management
- ❌ Damage calculation from word scores
- ❌ Phase transition triggers based on HP thresholds
- ❌ Victory/defeat detection

**Hook Enhancements Needed:**
```typescript
// EXTEND UseBossMechanicsReturn interface
export interface UseBossMechanicsReturn {
  // ... existing fields
  healthState: BossHealthState;
  dealDamage: (wordScore: number, mechanicResult: BossMechanicResult) => void;
  getCurrentPhase: () => BossBattlePhase;
  isDefeated: boolean;
}

// ADD to useBossMechanics hook
const [healthState, setHealthState] = useState<BossHealthState>({
  currentHP: boss?.maxHP ?? 0,
  maxHP: boss?.maxHP ?? 0,
  phase: 'intro',
  phaseThresholds: boss?.phaseThresholds ?? [],
});

const dealDamage = useCallback((wordScore: number, mechanicResult: BossMechanicResult) => {
  // Calculate damage: wordScore * damageScaling * mechanicMultiplier * comboMultiplier
  // Update HP, check phase transitions, trigger victory/defeat
}, [boss, healthState]);
```

### 1.4 Boss UI Components (Partially Complete)

**Existing Components:**

1. **BossIntro** (`/fe-next/components/adventure/BossIntro.tsx`)
   - Shows boss intro cutscene before battle
   - Displays boss image, name, mechanic description, start taunt
   - Callbacks: onStart, onSkip
   - ✅ Complete - no changes needed

2. **BossDialogue** (`/fe-next/components/adventure/BossDialogue.tsx`)
   - Shows boss taunts during battle
   - Positioned at top or bottom of screen
   - ✅ Complete - no changes needed

3. **BossVictory** (`/fe-next/components/adventure/BossVictory.tsx`)
   - Shows victory/defeat screen after battle
   - Displays stars, score, boss taunt (onVictory/onDefeat)
   - Callbacks: onContinue, onRetry
   - ✅ Complete - no changes needed

**Missing Components:**

4. **BossHPBar** (NEW)
   - Shows boss current HP with phase indicators
   - Displays phase transitions (intro → phase1 → phase2 → enraged)
   - Updates in real-time as player deals damage
   - Positioned above grid or in fixed header

**BossHPBar Design Requirements:**
```typescript
interface BossHPBarProps {
  boss: BossConfig;
  healthState: BossHealthState;
  worldNumber: number;
}

// Visual Design:
// - Neo-brutalist style (chunky border, hard shadow)
// - Color changes by phase (green → yellow → orange → red)
// - Phase indicators (vertical markers at threshold percentages)
// - Boss portrait icon on left side
// - HP text: "450 / 1000 HP" (current / max)
// - Width: Full width container with max-w-4xl
// - Height: 60px (desktop), 40px (mobile)
```

### 1.5 Adventure Game Integration (Needs Extension)

**File:** `/Users/ohadfisher/git/boggle-new/fe-next/components/adventure/AdventureGame.tsx` (1099 lines)

**What Exists:**
- `useBossMechanics` hook integration (line 20)
- Boss intro rendering (BossIntro component)
- Boss dialogue rendering (BossDialogue component)
- Boss victory rendering (BossVictory component)
- Combo scoring system from Phase 15 (ComboTierBadge, ChainParticleBurst)

**What's Missing:**
- ❌ BossHPBar rendering
- ❌ Damage dealing on word submission
- ❌ Phase transition effects (screen shake, color shifts)
- ❌ Victory/defeat detection and transition

**Integration Points:**
```typescript
// 1. Add BossHPBar rendering (after timer, before grid)
{boss && healthState && (
  <BossHPBar
    boss={boss}
    healthState={healthState}
    worldNumber={levelConfig.world}
  />
)}

// 2. Extend submitWordWithPath to deal damage
const submitWordWithPath = useCallback((word, score, path) => {
  // ... existing logic

  // NEW: Deal damage to boss if boss level
  if (boss && bossMechanics.isActive) {
    const mechanicResult = bossMechanics.checkWord(word);
    bossMechanics.dealDamage(score, mechanicResult);
  }
}, [boss, bossMechanics]);

// 3. Listen for victory/defeat
useEffect(() => {
  if (bossMechanics.healthState.phase === 'victory') {
    completeLevel(); // Trigger victory screen
  } else if (bossMechanics.healthState.phase === 'defeat') {
    // Show defeat screen (time ran out or failed)
  }
}, [bossMechanics.healthState.phase]);
```

### 1.6 Adventure Game Hook (Needs Extension)

**File:** `/Users/ohadfisher/git/boggle-new/fe-next/hooks/useAdventureGame.ts` (778 lines)

**What Exists:**
- Game state management (tiles, objectives, timer, score)
- Word submission with special tile effects
- Combo tracking (comboCount)
- Level completion logic (calculateStars)

**What's Missing:**
- ❌ Boss HP integration
- ❌ Damage calculation from combo multiplier

**Hook Enhancements:**
```typescript
// 1. Add combo multiplier to submitWord return
interface SubmitWordResult {
  score: number;
  comboMultiplier: number; // NEW: for damage calculation
}

// 2. Expose combo multiplier for boss damage
const submitWordWithPath = useCallback((word, score, path) => {
  // ... existing logic

  return {
    score: finalScore,
    comboMultiplier: gameState.comboCount > 0 ? CHAIN_COMBO_MULTIPLIER : 1.0,
  };
}, [gameState.comboCount]);
```

---

## 2. Requirements Analysis

### BOSS-01: Phase Transitions ✅ (Mostly Ready)

**Requirement:** User can battle bosses with phase transitions (intro → phase1 → phase2 → enraged → victory/defeat)

**Current State:**
- ✅ Boss intro screen exists (BossIntro component)
- ✅ Boss victory/defeat screen exists (BossVictory component)
- ⚠️ Phase transitions (phase1 → phase2 → enraged) not implemented

**Implementation Needed:**
1. Define phase thresholds in BossConfig (e.g., enraged at 25% HP)
2. Add phase transition detection in useBossMechanics
3. Trigger visual effects on phase change (screen shake, color overlay)
4. Update boss taunts on phase change (triggerTaunt('onMechanic'))

**Complexity:** Medium (type extensions + state management + visual effects)

### BOSS-02: HP Bar with Phase Indicators ❌ (New Component)

**Requirement:** User sees boss HP bar with phase indicators during battle

**Current State:**
- ❌ No HP bar component exists
- ❌ No HP state tracking

**Implementation Needed:**
1. Create `BossHPBar.tsx` component (new file)
2. Design neo-brutalist HP bar with phase markers
3. Integrate real-time HP updates from useBossMechanics
4. Add phase indicator overlays (vertical lines at thresholds)

**Design Specifications:**
- Width: 100% with max-w-4xl centering
- Height: 60px (desktop), 40px (mobile)
- Border: 4px black (border-neo-thick)
- Shadow: shadow-hard-lg
- Fill: Gradient by phase (green → yellow → orange → red)
- Phase markers: Vertical white lines at threshold percentages
- Boss icon: 48x48px portrait on left
- HP text: "450 / 1000 HP" (right side)

**Complexity:** Medium (new component + real-time updates + responsive design)

### BOSS-03: popQuiz Mechanic ✅ (Complete)

**Requirement:** Boss mechanic popQuiz — random word requirements each turn

**Current State:**
- ✅ `evaluatePopQuiz()` implemented in useBossMechanics
- ✅ Requirement types: doubleLetters, startsWith, exactLength, containsVowel
- ✅ Bonus/penalty multipliers (1.5x / 0.8x)
- ✅ Requirement rotation on each word

**Implementation Status:** Complete - no changes needed

**Complexity:** None (already implemented)

### BOSS-04: hiveMind Mechanic ⚠️ (Partial)

**Requirement:** Boss mechanic hiveMind — sticky tiles that persist between turns

**Current State:**
- ✅ `evaluateHiveMind()` exists (length-based bonus)
- ⚠️ Sticky tiles mechanic not implemented
- ⚠️ Synonym pair detection not implemented

**Implementation Needed:**
1. Add stickyTiles array to BossGameState
2. Mark 3 random tiles as "sticky" (persist after word submission)
3. Prevent sticky tiles from clearing when used in words
4. Add synonym detection (requires synonym dictionary or API)

**Complexity:** High (tile persistence + synonym detection logic)

### BOSS-05: synonymShift Mechanic ⚠️ (Partial)

**Requirement:** Boss mechanic synonymShift — bonus damage for synonym pairs

**Current State:**
- ✅ `evaluateHiveMind()` has synonymBonusMultiplier (2.0x)
- ⚠️ Synonym pair detection not implemented

**Implementation Needed:**
1. Create synonym detection utility (lib/adventure/synonyms.ts)
2. Track last N words submitted
3. Check if current word is synonym of recent word
4. Apply 2.0x multiplier if synonym detected

**Complexity:** High (synonym dictionary + detection logic)

### BOSS-13: Adaptive Difficulty ❌ (New System)

**Requirement:** Boss difficulty adapts based on player's average performance (80% completion target)

**Current State:**
- ❌ No difficulty adaptation system
- ❌ No player performance tracking

**Implementation Needed:**
1. Track player performance metrics (average score, completion rate)
2. Calculate difficulty adjustment factor (0.8x - 1.2x)
3. Adjust boss maxHP based on performance
4. Store adjustment in player progression data

**Difficulty Adjustment Formula:**
```typescript
const avgCompletionRate = playerStats.completedLevels / playerStats.attemptedLevels;
const difficultyFactor = avgCompletionRate < 0.8
  ? 0.8  // Reduce HP if struggling
  : avgCompletionRate > 0.9
    ? 1.2  // Increase HP if too easy
    : 1.0; // Normal difficulty

const adjustedMaxHP = boss.maxHP * difficultyFactor;
```

**Complexity:** High (performance tracking + scaling algorithm + persistence)

---

## 3. Technical Architecture

### 3.1 Boss HP System Architecture

**Data Flow:**
```
Word Submitted (AdventureGame)
  ↓
Submit to useAdventureGame hook
  ↓
Calculate score + combo multiplier
  ↓
Pass to useBossMechanics.dealDamage()
  ↓
Evaluate mechanic → mechanicMultiplier
  ↓
Calculate total damage:
  damage = wordScore * damageScaling * mechanicMultiplier * comboMultiplier
  ↓
Update boss HP:
  newHP = currentHP - damage
  ↓
Check phase transitions:
  if (hpPercent <= 25%) → enraged
  if (hpPercent <= 50%) → phase2
  if (hpPercent <= 75%) → phase1
  ↓
Update BossHealthState
  ↓
Render BossHPBar (real-time update)
  ↓
Check victory/defeat:
  if (newHP <= 0) → victory
  if (timeRemaining <= 0 && HP > 0) → defeat
```

### 3.2 Phase Transition System

**Phase Definitions:**
```typescript
const PHASE_THRESHOLDS: PhaseThreshold[] = [
  { phase: 'intro', hpThreshold: 100, color: 'neo-cyan' },
  { phase: 'phase1', hpThreshold: 75, color: 'neo-lime' },
  { phase: 'phase2', hpThreshold: 50, color: 'neo-yellow' },
  { phase: 'enraged', hpThreshold: 25, color: 'neo-red' },
];

// Phase transition detection
function detectPhaseTransition(prevHP: number, newHP: number, maxHP: number): BossBattlePhase | null {
  const prevPercent = (prevHP / maxHP) * 100;
  const newPercent = (newHP / maxHP) * 100;

  for (const threshold of PHASE_THRESHOLDS) {
    if (prevPercent > threshold.hpThreshold && newPercent <= threshold.hpThreshold) {
      return threshold.phase; // Crossed threshold, trigger phase
    }
  }

  return null; // No phase change
}
```

**Phase Transition Effects:**
- Screen shake animation (animate-neo-shake)
- Color overlay flash (phase color)
- Boss taunt (onMechanic taunt)
- HP bar color change (smooth transition)

### 3.3 Damage Calculation System

**Damage Formula:**
```typescript
interface DamageFactors {
  wordScore: number;        // Base score from word (10-1000+)
  damageScaling: number;    // Boss-specific (0.5-2.0)
  mechanicMultiplier: number; // From twist mechanic (0.8-3.0x)
  comboMultiplier: number;  // From chain combos (1.0-1.5x)
}

function calculateDamage(factors: DamageFactors): number {
  const { wordScore, damageScaling, mechanicMultiplier, comboMultiplier } = factors;

  // Base damage from word score
  const baseDamage = wordScore * damageScaling;

  // Apply multipliers
  const totalDamage = baseDamage * mechanicMultiplier * comboMultiplier;

  // Round to integer
  return Math.round(totalDamage);
}

// Example:
// Word "EXCELLENT" scores 450 points
// Boss damageScaling = 1.0
// Mechanic bonus = 1.5x (met popQuiz requirement)
// Combo = 1.5x (chain tile combo)
// Total damage = 450 * 1.0 * 1.5 * 1.5 = 1012 HP damage
```

**Damage Scaling by World:**
```typescript
const DAMAGE_SCALING_BY_WORLD: Record<number, number> = {
  1: 1.5,  // Early game - more forgiving
  2: 1.3,
  3: 1.2,
  4: 1.1,
  5: 1.0,  // Mid game - standard
  6: 0.9,
  7: 0.85,
  8: 0.8,
  9: 0.75,
  10: 0.5, // Final boss - toughest
};
```

### 3.4 Integration with Phase 15 (Chain Combos)

**Phase 15 Outputs Used:**
- `gameState.comboCount` - Current combo multiplier (from useAdventureGame)
- Chain tile activation - Already triggers ChainParticleBurst
- Combo tier badge - Already displays combo encouragement

**Integration Points:**
```typescript
// 1. Get combo multiplier from Phase 15 logic
const comboMultiplier = gameState.comboCount >= 2
  ? CHAIN_COMBO_MULTIPLIER  // 1.5x from Phase 15
  : 1.0;

// 2. Pass to damage calculation
const damage = calculateDamage({
  wordScore: score,
  damageScaling: boss.damageScaling,
  mechanicMultiplier: mechanicResult.scoreMultiplier,
  comboMultiplier, // FROM PHASE 15
});

// 3. Show combo bonus feedback
if (comboMultiplier > 1.0) {
  showFeedback(`COMBO BONUS! +${Math.round((comboMultiplier - 1) * 100)}% damage`);
}
```

---

## 4. Codebase Patterns to Follow

### 4.1 Component Structure

**Pattern:** All adventure components follow strict organization:
```typescript
/**
 * ComponentName Component
 *
 * Clear description of purpose and behavior
 */

'use client';

import { ... }

// ==============================================
// TYPES
// ==============================================

interface ComponentNameProps { ... }

// ==============================================
// CONSTANTS
// ==============================================

const SOME_CONSTANT = 100;

// ==============================================
// HELPER COMPONENTS (if needed)
// ==============================================

const HelperComponent = memo<Props>(({ ... }) => { ... });

// ==============================================
// COMPONENT
// ==============================================

const ComponentName = memo<ComponentNameProps>(({ ... }) => {
  // Hooks
  // State
  // Callbacks
  // Effects
  // Render
});

ComponentName.displayName = 'ComponentName';

export default ComponentName;
```

**Example:** See `BossVictory.tsx` for perfect pattern adherence.

### 4.2 Hook Structure

**Pattern:** All hooks follow strict organization:
```typescript
/**
 * useHookName Hook
 *
 * Clear description of purpose and behavior
 */

'use client';

import { ... }

// ==============================================
// CONSTANTS
// ==============================================

const SOME_CONSTANT = 100;

// ==============================================
// TYPES
// ==============================================

interface UseHookNameProps { ... }
interface UseHookNameReturn { ... }

// ==============================================
// HELPER FUNCTIONS
// ==============================================

function helperFunction() { ... }

// ==============================================
// HOOK
// ==============================================

export function useHookName({ ... }: UseHookNameProps): UseHookNameReturn {
  // State
  // Refs
  // Callbacks
  // Effects
  // Return
}
```

**Example:** See `useBossMechanics.ts` for perfect pattern adherence.

### 4.3 Translation Keys

**Pattern:** ALL UI text must use translation keys:
```typescript
// ❌ WRONG - Hardcoded text
<h1>Boss Battle</h1>

// ✅ CORRECT - Translation key
<h1>{t('adventure.bosses.bossIntro')}</h1>

// Translation key structure:
// adventure.bosses.{bossId}.{property}
// adventure.bosses.common.{message}
```

**Boss Translation Keys Already Exist:**
- `adventure.bosses.{bossId}.name` - Boss name
- `adventure.bosses.{bossId}.mechanic` - Mechanic description
- `adventure.bosses.{bossId}.taunts.{event}{N}` - Taunt lines
- `adventure.bosses.common.{message}` - Shared messages

**New Translation Keys Needed:**
```typescript
// HP bar display
'adventure.bosses.common.hpLabel': 'HP',
'adventure.bosses.common.phaseIntro': 'INTRO',
'adventure.bosses.common.phaseActive': 'PHASE 1',
'adventure.bosses.common.phaseEnraged': 'ENRAGED!',

// Phase transition feedback
'adventure.bosses.common.phaseTransition': 'Boss phase changed!',
'adventure.bosses.common.enragedWarning': 'Boss is ENRAGED!',

// Damage feedback
'adventure.bosses.common.damageDealt': 'Damage: {damage}',
'adventure.bosses.common.comboBonus': 'COMBO BONUS! +{percent}%',
```

### 4.4 Neo-Brutalist Design System

**Pattern:** All boss UI must follow neo-brutalist design:

**Colors:**
- Phase 1 (75-100% HP): `neo-lime` (#00FF41)
- Phase 2 (50-75% HP): `neo-yellow` (#FFE135)
- Phase 3 (25-50% HP): `neo-orange` (#FF6B35)
- Enraged (0-25% HP): `neo-red` (#FF0000)

**Borders & Shadows:**
```typescript
// Standard boss UI border
className="border-neo-thick border-neo-black" // 4px black border

// Hard shadow (NO BLUR - critical)
className="shadow-hard-lg" // 8px 8px 0px black

// Pressed state
className="shadow-hard-pressed" // 2px 2px 0px black
```

**Typography:**
```typescript
// Boss name
className="font-neo-display text-2xl font-black text-neo-yellow"

// HP text
className="font-neo-body text-lg font-bold text-neo-white"
```

**Animations:**
```typescript
// Phase transition
className="animate-neo-shake" // Screen shake

// HP damage
className="animate-neo-pop" // Damage number pop

// Enraged warning
className="animate-neo-wobble" // Attention-grabbing wobble
```

### 4.5 File Size Constraints

**Pattern:** Files MUST stay under 500 lines per CLAUDE.md rules.

**Current Sizes:**
- `useAdventureGame.ts` - 778 lines ⚠️ (already over limit)
- `AdventureGame.tsx` - 1099 lines ⚠️ (already over limit)

**Implication:** These files should NOT be extended further. Instead:
- Create NEW files for boss HP logic (`useBossHealth.ts` hook)
- Create NEW component for HP bar (`BossHPBar.tsx`)
- Keep boss HP state SEPARATE from adventure game state

**Recommended Architecture:**
```
hooks/
  useBossMechanics.ts (479 lines) - Keep as-is
  useBossHealth.ts (NEW) - HP tracking, damage, phase transitions

components/adventure/
  AdventureGame.tsx (1099 lines) - Import useBossHealth, render BossHPBar
  BossHPBar.tsx (NEW) - HP bar UI component
```

---

## 5. Testing Strategy

### 5.1 Existing Test Patterns

**Pattern:** All adventure features have comprehensive test coverage:
```
components/adventure/__tests__/
  AdventureGame.chainCombo.test.tsx (9 tests, 880 lines)
  BossVictory.test.tsx
  BossIntro.test.tsx
  BossDialogue.test.tsx

hooks/__tests__/
  useBossMechanics.test.ts
  useAdventureGame.chainCombo.test.ts
```

**Test Structure:**
```typescript
describe('ComponentName', () => {
  describe('Feature Group', () => {
    it('should do specific thing', () => {
      // GIVEN - Setup
      // WHEN - Action
      // THEN - Assertion
    });
  });
});
```

### 5.2 Required Tests for Phase 16

**1. useBossHealth Hook Tests (NEW)**
```typescript
// hooks/__tests__/useBossHealth.test.ts
describe('useBossHealth', () => {
  describe('HP Tracking', () => {
    it('should initialize with boss maxHP');
    it('should reduce HP when damage dealt');
    it('should not go below 0 HP');
  });

  describe('Phase Transitions', () => {
    it('should transition to phase1 at 75% HP');
    it('should transition to phase2 at 50% HP');
    it('should transition to enraged at 25% HP');
    it('should trigger phase transition effects');
  });

  describe('Damage Calculation', () => {
    it('should calculate damage from word score');
    it('should apply mechanic multiplier');
    it('should apply combo multiplier');
    it('should apply damage scaling');
  });

  describe('Victory/Defeat', () => {
    it('should detect victory when HP reaches 0');
    it('should detect defeat when time expires');
  });
});
```

**2. BossHPBar Component Tests (NEW)**
```typescript
// components/adventure/__tests__/BossHPBar.test.tsx
describe('BossHPBar', () => {
  describe('Rendering', () => {
    it('should render HP bar with boss portrait');
    it('should display current/max HP text');
    it('should show phase indicators');
  });

  describe('HP Updates', () => {
    it('should update fill percentage when HP changes');
    it('should change color on phase transitions');
    it('should animate HP depletion');
  });

  describe('Accessibility', () => {
    it('should have aria-label for HP status');
    it('should announce phase transitions to screen readers');
  });
});
```

**3. Integration Tests**
```typescript
// components/adventure/__tests__/AdventureGame.bossBattle.test.tsx
describe('AdventureGame - Boss Battle Integration', () => {
  describe('Boss HP System', () => {
    it('should show HP bar on boss levels');
    it('should deal damage when word submitted');
    it('should update HP bar in real-time');
  });

  describe('Phase Transitions', () => {
    it('should transition phases as HP depletes');
    it('should trigger visual effects on phase change');
    it('should update boss taunts on phase change');
  });

  describe('Combo Integration', () => {
    it('should apply combo multiplier to boss damage');
    it('should show combo bonus feedback');
  });

  describe('Victory/Defeat', () => {
    it('should show victory screen when boss defeated');
    it('should show defeat screen when time expires');
  });
});
```

### 5.3 Test Coverage Goals

**Target:** 80%+ coverage (per CLAUDE.md requirements)

**Critical Paths:**
- HP tracking logic (100% coverage)
- Damage calculation (100% coverage)
- Phase transition detection (100% coverage)
- UI rendering (80% coverage)

---

## 6. Dependencies & Libraries

### 6.1 Existing Dependencies (Used)

**From package.json:**
- `framer-motion` - Phase transition animations
- `lucide-react` - HP bar icons (Heart icon)
- `tailwindcss` - Neo-brutalist styling
- `react` - Component framework
- `typescript` - Type safety

**No new dependencies needed** - all functionality can be built with existing stack.

### 6.2 Potential Dependency Additions (Optional)

**For BOSS-05 (synonymShift mechanic):**
- ❌ `wordnet` - Synonym dictionary (too large, 10MB+)
- ❌ `natural` - NLP library (too heavy for browser)
- ✅ Custom synonym list - Curated JSON file (~50KB)

**Recommendation:** Build lightweight synonym list for Phase 16, defer full NLP to Phase 17.

---

## 7. Risk Assessment

### 7.1 High-Risk Areas

**1. File Size Explosion (HIGH RISK)**
- **Issue:** `useAdventureGame.ts` (778 lines) and `AdventureGame.tsx` (1099 lines) already exceed 500-line limit
- **Impact:** Adding boss HP logic will push files further over limit
- **Mitigation:** Create separate `useBossHealth.ts` hook, keep logic isolated

**2. State Management Complexity (MEDIUM RISK)**
- **Issue:** Boss HP state must sync with game state, combo state, timer state
- **Impact:** State synchronization bugs could cause HP desyncs
- **Mitigation:** Use single source of truth (useBossHealth), subscribe to updates

**3. Performance on HP Updates (MEDIUM RISK)**
- **Issue:** HP bar updates on every word submission (potentially 100+ times per game)
- **Impact:** Frequent re-renders could cause lag
- **Mitigation:** Memoize HP bar component, debounce animations

**4. Synonym Detection Accuracy (HIGH RISK for BOSS-05)**
- **Issue:** Detecting synonym pairs requires NLP or large dictionary
- **Impact:** False positives/negatives could frustrate players
- **Mitigation:** Start with simple word list, improve in Phase 17

### 7.2 Medium-Risk Areas

**1. Phase Transition Timing (MEDIUM RISK)**
- **Issue:** Phase transitions mid-word could cause visual glitches
- **Impact:** HP bar color changes while animation in progress
- **Mitigation:** Queue phase transitions, apply after animation completes

**2. Difficulty Adaptation (MEDIUM RISK for BOSS-13)**
- **Issue:** Adaptive difficulty requires accurate player performance tracking
- **Impact:** Incorrect scaling could make bosses too easy/hard
- **Mitigation:** Conservative scaling (±20% max), test with real users

**3. Mobile Responsiveness (LOW RISK)**
- **Issue:** HP bar must fit on mobile screens (320px width)
- **Impact:** HP text could overflow or become unreadable
- **Mitigation:** Responsive design with container queries, test on small screens

### 7.3 Low-Risk Areas

**1. Boss Config Extensions (LOW RISK)**
- **Issue:** Adding maxHP, phaseThresholds to BossConfig
- **Impact:** Minimal - just data additions
- **Mitigation:** None needed, straightforward

**2. BossHPBar Component (LOW RISK)**
- **Issue:** New component follows established patterns
- **Impact:** Isolated component, no side effects
- **Mitigation:** Comprehensive unit tests

---

## 8. Open Questions

### 8.1 Design Decisions Needed

**Q1: HP Scaling Formula**
- How should boss HP scale with world difficulty?
- Proposal: Linear scaling (World 1 = 500 HP, World 10 = 2500 HP)
- Alternative: Exponential scaling (harder late game)

**Q2: Phase Transition Thresholds**
- Should all bosses use same thresholds (75%/50%/25%)?
- Or should some bosses have different phase counts (e.g., 2 phases vs 3)?
- Proposal: Uniform thresholds for Phase 16, custom thresholds in Phase 17

**Q3: Damage Scaling Balance**
- What should base damage scaling be?
- Proposal: 1.0x for mid-game (World 5), scale higher for early, lower for late
- Needs playtesting to validate

**Q4: Combo Multiplier Stacking**
- Should combo multiplier stack with mechanic multiplier multiplicatively or additively?
- Multiplicative: 1.5x combo * 2.0x mechanic = 3.0x total (HIGH damage)
- Additive: (1.5x - 1) + (2.0x - 1) = 1.5x total (balanced)
- Proposal: Multiplicative for Phase 16 (more exciting), balance in Phase 17 if needed

### 8.2 Technical Questions

**Q5: HP Update Frequency**
- Should HP update immediately on word submission or animate down?
- Proposal: Animate HP depletion over 500ms (smooth, satisfying)

**Q6: Phase Transition Effects**
- What visual effects should trigger on phase change?
- Proposal: Screen shake (200ms) + color flash (boss color, 300ms) + taunt

**Q7: Sticky Tiles Persistence (BOSS-04)**
- Should sticky tiles persist forever or expire after N turns?
- Proposal: Persist for 3 turns, then release (prevents board lock)

**Q8: Synonym Detection Scope (BOSS-05)**
- Should synonyms be detected from entire game history or just last N words?
- Proposal: Last 5 words only (reduces memory, encourages combos)

### 8.3 UX Questions

**Q9: HP Bar Position**
- Where should HP bar be positioned?
- Options: Above grid, below timer, fixed header
- Proposal: Below timer, above grid (visible but not intrusive)

**Q10: Phase Transition Feedback**
- How should player be notified of phase transitions?
- Proposal: Visual (color change + shake) + Audio (phase sound) + Boss taunt

**Q11: Defeat Screen Experience**
- Should defeat screen show "you were close" encouragement?
- Proposal: Yes - show % damage dealt, encourage retry

**Q12: Victory Celebration**
- Should victory trigger special effects beyond BossVictory component?
- Proposal: Confetti particles + victory sound + star animation

---

## 9. Implementation Roadmap

### Phase 16 Minimum Viable Product (MVP)

**Must-Haves:**
1. ✅ Boss HP tracking system (useBossHealth hook)
2. ✅ Damage calculation (word score → HP damage)
3. ✅ Phase transitions (intro → phase1 → phase2 → enraged)
4. ✅ BossHPBar component with phase indicators
5. ✅ Victory/defeat detection
6. ✅ popQuiz mechanic (already complete)
7. ❌ hiveMind sticky tiles (defer to Phase 17)
8. ❌ synonymShift detection (defer to Phase 17)
9. ❌ Adaptive difficulty (defer to Phase 18)

**Should-Haves:**
1. Phase transition visual effects (shake, flash)
2. Combo damage bonus feedback
3. Mobile-responsive HP bar
4. HP bar accessibility (ARIA labels)

**Could-Haves:**
1. Animated HP depletion
2. Boss portrait animation on damage
3. Phase-specific background color shifts
4. Victory confetti particles

**Won't-Haves (Phase 17):**
1. Sticky tiles mechanic (BOSS-04)
2. Synonym detection (BOSS-05)
3. Advanced boss mechanics (BOSS-06 to BOSS-12)
4. Adaptive difficulty (BOSS-13)

### Recommended Implementation Order

**Wave 1: Core HP System (Foundation)**
1. Extend types (BossHealthState, PhaseThreshold, DamageCalculation)
2. Create useBossHealth hook (HP tracking, damage calculation)
3. Add HP state to BossConfig (maxHP, phaseThresholds, damageScaling)
4. Write useBossHealth tests (HP tracking, damage, phases)

**Wave 2: UI Integration**
1. Create BossHPBar component (HP bar with phase indicators)
2. Integrate BossHPBar into AdventureGame
3. Connect useBossHealth to word submission
4. Write BossHPBar tests (rendering, updates, accessibility)

**Wave 3: Polish & Effects**
1. Add phase transition visual effects
2. Add combo damage feedback
3. Add victory/defeat detection
4. Write integration tests (boss battle flow)

**Wave 4: Validation & Tuning**
1. Playtest boss battles (all 10 worlds)
2. Tune HP scaling and damage formulas
3. Fix bugs and polish animations
4. Update documentation

**Estimated Effort:**
- Wave 1: 4 hours (types + hook + tests)
- Wave 2: 4 hours (component + integration + tests)
- Wave 3: 3 hours (effects + feedback + tests)
- Wave 4: 2 hours (tuning + polish)
- **Total: 13 hours** (2 work days)

---

## 10. Success Criteria Verification

### How to Verify Each Requirement

**BOSS-01: Phase Transitions**
- ✅ Load boss level (World 1, Level 7)
- ✅ Submit words until HP reaches 75% → Phase 1 should trigger
- ✅ Submit words until HP reaches 50% → Phase 2 should trigger
- ✅ Submit words until HP reaches 25% → Enraged should trigger
- ✅ Submit words until HP reaches 0 → Victory screen should show
- ✅ Let timer expire with HP > 0 → Defeat screen should show

**BOSS-02: HP Bar**
- ✅ HP bar is visible during boss battle
- ✅ HP bar shows current/max HP text
- ✅ HP bar has phase indicators (vertical lines at 75%, 50%, 25%)
- ✅ HP bar color changes on phase transitions
- ✅ HP bar updates in real-time when word submitted

**BOSS-03: popQuiz Mechanic**
- ✅ Boss displays current requirement (e.g., "Words with double letters")
- ✅ Submit word meeting requirement → Bonus damage (1.5x)
- ✅ Submit word NOT meeting requirement → Penalty damage (0.8x)
- ✅ Requirement changes after each word

**BOSS-04: hiveMind Mechanic (Deferred to Phase 17)**
- ⏸️ Sticky tiles mechanic not implemented in Phase 16

**BOSS-05: synonymShift Mechanic (Deferred to Phase 17)**
- ⏸️ Synonym detection not implemented in Phase 16

**BOSS-13: Adaptive Difficulty (Deferred to Phase 18)**
- ⏸️ Difficulty adaptation not implemented in Phase 16

---

## 11. Key Takeaways for Planning

### What You MUST Know Before Planning

**1. Boss Infrastructure is 80% Complete**
- Types, configs, mechanics, taunts, UI components all exist
- Main gap is HP tracking system and phase transitions
- Don't reinvent the wheel - extend existing patterns

**2. File Size is a CRITICAL Constraint**
- `useAdventureGame.ts` and `AdventureGame.tsx` already over 500-line limit
- MUST create new files (useBossHealth.ts, BossHPBar.tsx)
- Do NOT extend existing oversized files

**3. Phase 15 Integration is Key**
- Combo multiplier from chain combos MUST apply to boss damage
- Integration point: `gameState.comboCount` → damage calculation
- Test combo damage bonus thoroughly

**4. Not All Requirements Fit in Phase 16**
- BOSS-04 (sticky tiles) requires complex tile persistence logic → Phase 17
- BOSS-05 (synonyms) requires NLP or large dictionary → Phase 17
- BOSS-13 (adaptive difficulty) requires player analytics → Phase 18
- Focus on core HP system + phase transitions for Phase 16 MVP

**5. Neo-Brutalist Design is Non-Negotiable**
- Hard shadows (NO blur), chunky borders, bold colors
- All translation keys, no hardcoded text
- Mobile-responsive with container queries
- Accessibility (ARIA labels, screen reader support)

**6. Testing is Mandatory**
- 80%+ coverage required (per CLAUDE.md)
- Test HP tracking, damage calculation, phase transitions
- Integration tests for boss battle flow
- Accessibility tests for HP bar

**7. Balance Will Require Iteration**
- HP scaling formula needs playtesting
- Damage scaling needs tuning per world
- Phase thresholds might need adjustment
- Plan for tuning wave after implementation

---

## 12. Recommended Next Steps

### For Planning Phase

1. **Define HP Formulas**
   - Boss maxHP by world (500 → 2500)
   - Damage scaling by world (1.5 → 0.5)
   - Phase thresholds (75%, 50%, 25%)

2. **Design BossHPBar Component**
   - Sketch HP bar layout (boss portrait, fill bar, HP text, phase markers)
   - Define color palette by phase (green → yellow → orange → red)
   - Spec animations (HP depletion, phase transitions)

3. **Plan useBossHealth Hook**
   - Define state shape (BossHealthState)
   - Design damage calculation function
   - Plan phase transition detection logic

4. **Scope Phase 16 Boundaries**
   - Confirm BOSS-04, BOSS-05, BOSS-13 are deferred
   - Focus on core HP system + phase transitions + popQuiz
   - Plan for hiveMind/synonymShift in Phase 17

5. **Validate Integration Points**
   - Confirm combo multiplier from Phase 15
   - Confirm word submission flow in useAdventureGame
   - Confirm victory/defeat detection in AdventureGame

### For Implementation Phase

1. **Wave 1: Types & Hook** (4 hours)
   - Extend types in boss.ts
   - Create useBossHealth.ts
   - Write hook tests

2. **Wave 2: UI Component** (4 hours)
   - Create BossHPBar.tsx
   - Integrate into AdventureGame
   - Write component tests

3. **Wave 3: Effects & Polish** (3 hours)
   - Add phase transition effects
   - Add damage feedback
   - Write integration tests

4. **Wave 4: Tuning** (2 hours)
   - Playtest all boss levels
   - Adjust HP/damage formulas
   - Polish animations

---

## 13. Summary

**Phase 16 is 80% ready** - most infrastructure exists, just needs HP system and phase transitions.

**Core Gap:** Boss HP tracking, damage calculation, and phase transition logic.

**New Components Needed:**
- `useBossHealth.ts` hook (HP state, damage, phases)
- `BossHPBar.tsx` component (visual HP display)

**Deferred to Phase 17:**
- BOSS-04 (sticky tiles)
- BOSS-05 (synonym detection)
- BOSS-13 (adaptive difficulty)

**Critical Constraints:**
- File size limit (500 lines) → new files required
- Neo-brutalist design → hard shadows, no blur
- Translation-first → all text via t() keys
- Testing required → 80%+ coverage

**Integration Points:**
- Phase 15 combo multiplier → boss damage
- useAdventureGame word submission → damage dealing
- BossVictory/BossIntro components → already complete

**Success Criteria:**
1. HP bar visible during boss battle ✅
2. HP depletes on word submission ✅
3. Phase transitions at 75%/50%/25% ✅
4. Victory when HP = 0 ✅
5. Defeat when time expires ✅
6. popQuiz mechanic active ✅

**You are ready to plan Phase 16.** 🚀
