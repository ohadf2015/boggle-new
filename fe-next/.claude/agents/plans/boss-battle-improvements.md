# Feature: Boss Battle Improvements

**IMPORTANT:** Before implementing, validate documentation and codebase patterns. Pay special attention to naming of existing utils, types, and models. Import from the right files.

## Feature Description

Comprehensive improvement to boss battles in adventure mode to make them feel distinct from regular levels. Currently boss battles feel identical to regular gameplay because:
1. **Generic objectives** - Boss levels have the same "find X words" objectives as regular levels instead of battle-focused objectives
2. Boss abilities are defined but their effects (lock_tiles, timer_penalty, scramble) never actually apply to the board/timer
3. There is no player health/life system - players can only lose by timer expiration
4. Speech bubbles can overflow off-screen on smaller devices
5. Visual feedback when boss attacks execute is minimal (just a log statement)

This feature will make boss battles feel epic and challenging by:
- **Battle-focused objectives** (defeat boss, mechanic challenges) instead of generic word count
- Real attack effects that impact gameplay
- Player health system with boss attacks causing damage
- Improved UI and dramatic visual feedback

## User Story

As a player in adventure mode
I want boss battles to feel challenging and distinct from regular levels
So that defeating a boss feels like a real accomplishment

## Problem Statement

Boss battles in adventure mode feel identical to regular levels because:
- **Generic objectives** - Boss levels use same "find X words" / "score Y points" objectives as regular levels (generated in `levelConfig.ts` lines 344-408), making the boss twist mechanic feel secondary
- Boss ability effects (defined in ability files) are never applied to game state
- No player health mechanic - boss attacks have no impact on player
- Speech bubbles can be cut off on mobile screens
- Attack execution has minimal visual feedback (console.log only)

## Solution Statement

1. **Replace generic objectives with battle-focused objectives** - Boss levels should have objectives like "Defeat the Boss", "Survive with X health", "Trigger mechanic N times" instead of "Find 15 words"
2. **Implement ability effect executor** - Connect ability effects to game state (lock tiles, reduce timer, scramble board)
3. **Add player health system** - Boss attacks damage player health, player loses if health reaches 0
4. **Fix speech bubble positioning** - Use responsive positioning with overflow detection
5. **Add dramatic attack feedback** - Screen shake, particles, sound effects when abilities execute

## Feature Metadata

**Feature Type:** Enhancement
**Estimated Complexity:** High
**Primary Systems Affected:**
- `lib/adventure/levelConfig.ts` - Objective generation for boss levels
- `types/adventure.ts` - Objective type definitions
- `components/adventure/boss/BossOverlay.tsx`
- `hooks/useBossAbilities.ts`
- `components/adventure/BossDialogue.tsx`
- `components/adventure/AdventureGame.tsx`
**Dependencies:** Existing boss ability system, Framer Motion, useScreenShake hook

---

## CONTEXT REFERENCES

### Prime Context (READ THIS FIRST!)

- `.claude/agents/context/prime-context.md` - COMPLETE codebase overview
  - **WHY:** Contains all project patterns, configurations, and architecture
  - **ACTION:** Read this file first to understand the codebase

### Relevant Codebase Files (MUST READ BEFORE IMPLEMENTING!)

**Objectives System (CRITICAL FOR BOSS FOCUS):**

- `fe-next/lib/adventure/levelConfig.ts` (lines 344-408)
  - **WHY:** Contains `generateObjectives()` function that generates same objectives for ALL levels including bosses
  - **PATTERN:** Boss levels (level 7) get wordCount objective like regular odd levels
  - **KEY ISSUE:** No special-casing for boss levels - they need battle-focused objectives
  - **FIX:** Add conditional logic for `isBossLevel` to generate boss-specific objectives

- `fe-next/types/adventure.ts` (lines 106-128)
  - **WHY:** Defines `ObjectiveType` union - currently only has generic types
  - **CURRENT TYPES:** `wordCount`, `scoreTarget`, `clearIce`, `longWords`, `timeBonus`, `collectGems`
  - **NEEDS:** New boss-specific types like `defeatBoss`, `surviveBattle`, `mechanicTrigger`

- `fe-next/lib/adventure/constants.ts` (lines 150-160)
  - **WHY:** Contains `OBJECTIVE_TYPES` constant enum and translation keys
  - **PATTERN:** Each objective type needs translation key mapping

- `fe-next/components/adventure/AdventureObjectives.tsx`
  - **WHY:** Renders the objectives sidebar - needs to display boss objectives properly
  - **PATTERN:** Shows progress bars for each objective

**Boss System Core:**

- `fe-next/components/adventure/boss/BossOverlay.tsx` (lines 209-214)
  - **WHY:** This is where ability effects are supposed to be applied but currently just log to console
  - **PATTERN:** Need to call back to AdventureGame with effects to apply
  - **KEY ISSUE:** Line 211-213: `console.log('Ability executed:', abilityId, 'Effects:', effects);`

- `fe-next/hooks/useBossAbilities.ts` (lines 217-241)
  - **WHY:** Contains `executeAbility` which returns effects but doesn't apply them
  - **PATTERN:** Returns `AbilityEffect[]` that should be consumed by game

- `fe-next/types/bossAbility.ts` (lines 50-72)
  - **WHY:** Defines all effect types that need to be implemented
  - **EFFECT TYPES:** `change_tiles`, `lock_tiles`, `scramble`, `timer_penalty`, `score_modifier`, `spawn_special`, `requirement`

**UI Components:**

- `fe-next/components/adventure/BossDialogue.tsx` (lines 64-70)
  - **WHY:** Speech bubble positioning uses fixed values that can overflow
  - **PATTERN:** Currently uses `top-28 sm:top-32` which doesn't account for content length or screen size
  - **FIX:** Need responsive positioning with boundary detection

- `fe-next/components/adventure/boss/SegmentedHPBar.tsx`
  - **WHY:** Boss HP bar pattern to reference for player health bar
  - **PATTERN:** Segmented progress bar with phase indicators and animations

**Game Integration:**

- `fe-next/components/adventure/AdventureGame.tsx` (lines 1282-1300)
  - **WHY:** Where BossOverlay is rendered, needs to receive ability effects
  - **PATTERN:** BossOverlay renders as overlay on game, needs callback props

- `fe-next/hooks/useAdventureGame.ts` (if exists)
  - **WHY:** May need to extend for ability effect application (lock tiles, etc.)

**Effects System:**

- `fe-next/components/adventure/effects/hooks/useAdventureEffects.ts`
  - **WHY:** Existing effects system for screen shake, particles
  - **PATTERN:** Use `effects.shake()` and particle system for attack feedback

- `fe-next/lib/adventure/abilities/msGrammarAbilities.ts`
  - **WHY:** Example of how abilities define effects
  - **PATTERN:** Shows `lock_tiles`, `timer_penalty`, `requirement` effect structures

### New Files to Create

**Phase 0 - Boss Objectives:**
1. `fe-next/lib/adventure/__tests__/levelConfig.bossObjectives.test.ts` - Tests for boss objective generation

**Phase 1-4 - Battle System:**
2. `fe-next/hooks/usePlayerHealth.ts` - Player health state management hook
3. `fe-next/components/adventure/boss/PlayerHealthBar.tsx` - Player health UI component
4. `fe-next/hooks/useBossEffectExecutor.ts` - Applies ability effects to game state
5. `fe-next/components/adventure/boss/__tests__/PlayerHealthBar.test.tsx` - Unit tests
6. `fe-next/hooks/__tests__/usePlayerHealth.test.ts` - Unit tests
7. `fe-next/hooks/__tests__/useBossEffectExecutor.test.ts` - Unit tests

### Existing Files to Modify

**Phase 0 - Boss Objectives:**
1. `fe-next/types/adventure.ts` - Add new boss objective types to ObjectiveType union
2. `fe-next/lib/adventure/constants.ts` - Add new OBJECTIVE_TYPES constants
3. `fe-next/lib/adventure/levelConfig.ts` - Modify `generateObjectives()` for boss levels
4. `fe-next/components/adventure/AdventureObjectives.tsx` - Handle boss objective display

**Phase 1-4 - Battle System:**
5. `fe-next/components/adventure/boss/BossOverlay.tsx` - Add effect execution callback
6. `fe-next/components/adventure/BossDialogue.tsx` - Fix positioning overflow
7. `fe-next/components/adventure/AdventureGame.tsx` - Integrate player health, effect callbacks, and boss objective tracking

**All Phases - Translations:**
8. `fe-next/translations/en.js` - Add boss objectives and player health strings
9. `fe-next/translations/he.js` - Add Hebrew translations
10. `fe-next/translations/sv.js` - Add Swedish translations
11. `fe-next/translations/ja.js` - Add Japanese translations

### Relevant Documentation (MUST READ!)

- [Framer Motion Documentation](https://www.framer.com/motion/)
  - **Section:** Animation variants, layout animations
  - **WHY:** For dramatic attack feedback animations

### Patterns to Follow

**Hook Pattern (from useBossHealth.ts):**

```typescript
// ✅ GOOD: State hook with actions
export function usePlayerHealth({ maxHealth, initialHealth }: UsePlayerHealthOptions) {
  const [health, setHealth] = useState(initialHealth);
  const [isInvulnerable, setIsInvulnerable] = useState(false);

  const takeDamage = useCallback((amount: number) => {
    if (isInvulnerable) return;
    setHealth(prev => Math.max(0, prev - amount));
    // Trigger invulnerability frames
    setIsInvulnerable(true);
    setTimeout(() => setIsInvulnerable(false), 500);
  }, [isInvulnerable]);

  const heal = useCallback((amount: number) => {
    setHealth(prev => Math.min(maxHealth, prev + amount));
  }, [maxHealth]);

  return { health, maxHealth, takeDamage, heal, isInvulnerable, isDead: health <= 0 };
}
```

**Effect Executor Pattern:**

```typescript
// ✅ GOOD: Effect executor that applies effects to game state
export function useBossEffectExecutor({
  onLockTiles,
  onTimerPenalty,
  onScramble,
  onScreenShake,
}: EffectExecutorOptions) {
  const executeEffects = useCallback((effects: AbilityEffect[]) => {
    for (const effect of effects) {
      switch (effect.type) {
        case 'lock_tiles':
          onLockTiles(effect.target, effect.duration);
          break;
        case 'timer_penalty':
          onTimerPenalty(effect.params.penaltySeconds);
          break;
        case 'scramble':
          onScramble();
          break;
      }
      // Always trigger feedback
      onScreenShake(getShakeIntensity(effect.type));
    }
  }, [onLockTiles, onTimerPenalty, onScramble, onScreenShake]);

  return { executeEffects };
}
```

**Component Pattern (from SegmentedHPBar.tsx):**

```typescript
// ✅ GOOD: Animated health bar with neo-brutalist styling
const PlayerHealthBar = memo<PlayerHealthBarProps>(({
  currentHealth,
  maxHealth,
  isInvulnerable,
}) => {
  const healthPercentage = (currentHealth / maxHealth) * 100;

  return (
    <div className="relative w-full h-6 border-3 border-neo-black rounded-neo shadow-hard">
      <motion.div
        className={cn(
          'absolute inset-y-0 left-0',
          isInvulnerable ? 'bg-neo-yellow' : 'bg-neo-cyan'
        )}
        animate={{ width: `${healthPercentage}%` }}
        transition={{ type: 'spring', stiffness: 200 }}
      />
      <span className="absolute inset-0 flex items-center justify-center text-sm font-bold">
        {currentHealth} / {maxHealth}
      </span>
    </div>
  );
});
```

**Responsive Positioning Pattern:**

```typescript
// ✅ GOOD: Speech bubble with overflow detection
const BossDialogue = ({ position = 'top' }) => {
  const bubbleRef = useRef<HTMLDivElement>(null);
  const [adjustedPosition, setAdjustedPosition] = useState(position);

  useEffect(() => {
    if (!bubbleRef.current) return;
    const rect = bubbleRef.current.getBoundingClientRect();
    // Check if overflowing viewport
    if (rect.top < 0) setAdjustedPosition('bottom');
    if (rect.bottom > window.innerHeight) setAdjustedPosition('top');
    if (rect.left < 0 || rect.right > window.innerWidth) {
      // Constrain to viewport
      bubbleRef.current.style.left = 'max(8px, min(50%, calc(100% - 8px)))';
    }
  }, [position]);

  return (
    <motion.div
      ref={bubbleRef}
      className={cn(
        'fixed z-40 max-w-[calc(100%-1rem)]',  // Never wider than viewport - padding
        adjustedPosition === 'top' ? 'top-24 sm:top-28' : 'bottom-20'
      )}
    >
      {/* Content */}
    </motion.div>
  );
};
```

---

## IMPLEMENTATION PLAN

### Phase 0: Boss-Focused Objectives (CRITICAL)

Replace generic "find X words" objectives with battle-focused objectives for boss levels.

**Tasks:**
1. Add new boss-specific objective types to `types/adventure.ts`
2. Update `OBJECTIVE_TYPES` constant in `constants.ts`
3. Modify `generateObjectives()` in `levelConfig.ts` to special-case boss levels
4. Add translations for new objective types
5. Update `AdventureObjectives.tsx` to properly display boss objectives
6. Write unit tests for boss objective generation

**Order:** Should be done first as it changes the fundamental focus of boss battles

**New Objective Types:**
- `defeatBoss` - Primary: Reduce boss HP to 0 (always present on boss levels)
- `surviveBattle` - Secondary: Finish with X% health remaining
- `mechanicTrigger` - Secondary: Trigger the boss twist mechanic N times
- `noDamage` - Bonus: Complete without taking any damage (3-star requirement)

### Phase 1: Foundation - Player Health System

Create the player health hook and UI component to enable boss attacks to have real impact.

**Tasks:**
1. Create `usePlayerHealth` hook with damage/heal/invulnerability logic
2. Create `PlayerHealthBar` component with neo-brutalist styling
3. Add translations for player health labels
4. Write unit tests for hook and component

**Order:** Must complete before Phase 2 (effect executor needs player health to damage)

### Phase 2: Effect Executor

Create the system that applies boss ability effects to actual game state.

**Tasks:**
1. Create `useBossEffectExecutor` hook
2. Implement handlers for each effect type:
   - `lock_tiles`: Set tile state to locked (isFrozen = true)
   - `timer_penalty`: Call `addTime(-seconds)` from useAdventureGame
   - `scramble`: Shuffle tile positions
   - `requirement`: Display forced word requirement
   - `score_modifier`: Apply temporary score multiplier
3. Add visual feedback (screen shake, particles) on effect execution
4. Write unit tests

**Order:** Depends on Phase 1 completion (needs player health for some effects)

### Phase 3: Integration & Speech Bubble Fix

Connect the effect executor to BossOverlay and fix speech bubble positioning.

**Tasks:**
1. Update BossOverlay to call effect executor callback
2. Update AdventureGame to provide effect handler callbacks
3. Fix BossDialogue positioning with overflow detection
4. Add player health bar to BossOverlay
5. Write integration tests

**Order:** Depends on Phases 1 & 2 completion

### Phase 4: Visual Feedback Polish

Add dramatic visual and audio feedback when boss abilities execute.

**Tasks:**
1. Add attack impact screen shake (intensity varies by effect severity)
2. Add particle effects for different attack types
3. Add sound effect triggers (using existing sound system if available)
4. Add red flash/vignette effect for player damage
5. Add tile visual feedback for locked/scrambled tiles

**Order:** Can partially overlap with Phase 3

### Phase 5: Testing & Validation

Comprehensive testing of the complete boss battle improvements.

**Tasks:**
1. Write integration tests for full ability → effect → feedback flow
2. Manual testing of all 10 boss battles
3. Test on mobile screen sizes for speech bubble overflow
4. Performance testing with effects enabled

---

## STEP-BY-STEP TASKS

**IMPORTANT:** Execute every task in order, top to bottom. Each task is atomic and independently testable.

### Phase 0: Boss-Focused Objectives

#### Task 0.1: UPDATE fe-next/types/adventure.ts

- **IMPLEMENT:** Add new boss-specific objective types to `ObjectiveType` union
- **CHANGES:**
  ```typescript
  // BEFORE:
  export type ObjectiveType =
    | 'wordCount' | 'scoreTarget' | 'clearIce' | 'longWords' | 'timeBonus' | 'collectGems';

  // AFTER:
  export type ObjectiveType =
    | 'wordCount' | 'scoreTarget' | 'clearIce' | 'longWords' | 'timeBonus' | 'collectGems'
    | 'defeatBoss'       // NEW: Primary objective for boss levels - reduce boss HP to 0
    | 'surviveBattle'    // NEW: Finish battle with X% player health remaining
    | 'mechanicTrigger'  // NEW: Trigger boss twist mechanic N times
    | 'noDamage';        // NEW: Bonus - complete without taking damage
  ```
- **GOTCHA:** Check all usages of ObjectiveType to ensure they handle new types
- **VALIDATE:** `npm run build` passes

#### Task 0.2: UPDATE fe-next/lib/adventure/constants.ts

- **IMPLEMENT:** Add new objective types to OBJECTIVE_TYPES constant
- **CHANGES:**
  ```typescript
  export const OBJECTIVE_TYPES = {
    // ... existing types ...
    DEFEAT_BOSS: 'defeatBoss',
    SURVIVE_BATTLE: 'surviveBattle',
    MECHANIC_TRIGGER: 'mechanicTrigger',
    NO_DAMAGE: 'noDamage',
  } as const;
  ```
- **VALIDATE:** `npm run build` passes

#### Task 0.3: UPDATE fe-next/lib/adventure/levelConfig.ts

- **IMPLEMENT:** Modify `generateObjectives()` to special-case boss levels
- **CHANGES:**
  ```typescript
  export function generateObjectives(world: number, level: number): LevelObjective[] {
    const objectives: LevelObjective[] = [];
    const isBossLevel = level === LEVELS_PER_WORLD; // Level 7 is boss

    // BOSS LEVELS: Battle-focused objectives
    if (isBossLevel) {
      // Primary: Defeat the boss (always required)
      objectives.push({
        type: OBJECTIVE_TYPES.DEFEAT_BOSS,
        target: 100, // Boss HP to deplete
        isPrimary: true,
      });

      // Secondary: Mechanic challenge based on world
      const mechanicTarget = Math.min(3 + Math.floor(world / 3), 8); // 3-8 triggers
      objectives.push({
        type: OBJECTIVE_TYPES.MECHANIC_TRIGGER,
        target: mechanicTarget,
        isPrimary: false,
      });

      // Bonus (for 3 stars): Survive with health
      objectives.push({
        type: OBJECTIVE_TYPES.SURVIVE_BATTLE,
        target: 50, // 50% health remaining
        isPrimary: false,
      });

      return objectives;
    }

    // REGULAR LEVELS: Keep existing logic below...
    // ... rest of existing function
  }
  ```
- **GOTCHA:** Keep existing logic for non-boss levels unchanged
- **VALIDATE:** `npm run test -- --testPathPattern=levelConfig`

#### Task 0.4: UPDATE translations (en.js, he.js, sv.js, ja.js)

- **IMPLEMENT:** Add translations for new boss objective types
- **KEYS:**
  ```javascript
  // English
  'adventure.objectives.defeatBoss': 'Defeat the Boss',
  'adventure.objectives.defeatBoss.progress': 'Boss HP: {{current}}/{{target}}',
  'adventure.objectives.surviveBattle': 'Survive with {{target}}% Health',
  'adventure.objectives.surviveBattle.progress': 'Health: {{current}}%',
  'adventure.objectives.mechanicTrigger': 'Trigger Mechanic {{target}} Times',
  'adventure.objectives.mechanicTrigger.progress': 'Triggered: {{current}}/{{target}}',
  'adventure.objectives.noDamage': 'Take No Damage',
  'adventure.objectives.noDamage.progress': 'Damage Taken: {{current}}',
  ```
- **VALIDATE:** Check all 4 translation files have the keys

#### Task 0.5: UPDATE fe-next/components/adventure/AdventureObjectives.tsx

- **IMPLEMENT:** Update objective display to handle new boss objective types
- **CHANGES:**
  - Add icon mapping for boss objectives (sword for defeatBoss, heart for surviveBattle, etc.)
  - Add special styling for boss objectives (gold border, larger text)
  - Handle progress display for boss objectives
  - For `defeatBoss`: Show inverted progress (boss HP remaining → 0)
- **PATTERN:** Reference existing objective icon/styling pattern
- **VALIDATE:** Manual test on boss level to see objectives display

#### Task 0.6: UPDATE fe-next/components/adventure/AdventureGame.tsx

- **IMPLEMENT:** Track boss objective progress during gameplay
- **CHANGES:**
  - Track `mechanicTriggerCount` when boss mechanic is satisfied
  - Pass player health to objectives for `surviveBattle` tracking
  - Pass boss HP for `defeatBoss` objective tracking
  - Update objective `current` values as gameplay progresses
- **GOTCHA:** Ensure objective completion triggers at right time (boss HP = 0, not when objectives filled)
- **VALIDATE:** `npm run build` passes

#### Task 0.7: CREATE fe-next/lib/adventure/__tests__/levelConfig.bossObjectives.test.ts

- **IMPLEMENT:** Unit tests for boss objective generation
- **TEST CASES:**
  - Boss level (level 7) generates `defeatBoss` as primary objective
  - Boss level does NOT generate `wordCount` or `scoreTarget`
  - Regular levels still generate normal objectives
  - `mechanicTrigger` target scales with world number
  - All objective targets are reasonable numbers
- **VALIDATE:** `npm run test -- --testPathPattern=levelConfig.bossObjectives`

### Phase 1: Player Health System

#### Task 1.1: CREATE fe-next/hooks/usePlayerHealth.ts

- **IMPLEMENT:** Player health state hook with damage, heal, invulnerability, and death detection
- **PATTERN:** Mirror `useBossHealth.ts` structure but for player side
- **INTERFACE:**
  ```typescript
  interface UsePlayerHealthOptions {
    maxHealth?: number;        // Default: 100
    initialHealth?: number;    // Default: maxHealth
    invulnerabilityMs?: number; // Default: 500ms
  }

  interface UsePlayerHealthReturn {
    health: number;
    maxHealth: number;
    healthPercentage: number;
    isInvulnerable: boolean;
    isDead: boolean;
    takeDamage: (amount: number) => void;
    heal: (amount: number) => void;
    reset: () => void;
  }
  ```
- **GOTCHA:** Must handle invulnerability frames to prevent rapid damage stacking
- **VALIDATE:** `npm run test -- --testPathPattern=usePlayerHealth`

#### Task 1.2: CREATE fe-next/hooks/__tests__/usePlayerHealth.test.ts

- **IMPLEMENT:** Unit tests for usePlayerHealth hook
- **TEST CASES:**
  - Initial health equals maxHealth
  - takeDamage reduces health
  - takeDamage respects invulnerability
  - heal increases health up to max
  - isDead is true when health <= 0
  - reset restores to initial state
- **PATTERN:** Use `@testing-library/react` renderHook pattern
- **VALIDATE:** `npm run test -- --testPathPattern=usePlayerHealth`

#### Task 1.3: CREATE fe-next/components/adventure/boss/PlayerHealthBar.tsx

- **IMPLEMENT:** Player health bar UI with neo-brutalist styling
- **PATTERN:** Reference `SegmentedHPBar.tsx` for styling patterns
- **FEATURES:**
  - Animated health fill with spring animation
  - Cyan color (differentiates from boss red/green)
  - Yellow flash when invulnerable
  - Heart icon label
  - Current/Max display
- **ACCESSIBILITY:** ARIA progressbar role
- **VALIDATE:** `npm run test -- --testPathPattern=PlayerHealthBar`

#### Task 1.4: CREATE fe-next/components/adventure/boss/__tests__/PlayerHealthBar.test.tsx

- **IMPLEMENT:** Unit tests for PlayerHealthBar component
- **TEST CASES:**
  - Renders with correct health percentage
  - Shows invulnerable state styling
  - Updates animation when health changes
  - Accessibility attributes present
- **PATTERN:** Use `@testing-library/react` render pattern
- **VALIDATE:** `npm run test -- --testPathPattern=PlayerHealthBar`

#### Task 1.5: UPDATE translations (en.js, he.js, sv.js, ja.js)

- **IMPLEMENT:** Add player health-related strings
- **KEYS:**
  ```javascript
  'adventure.player.health': 'Health',
  'adventure.player.healthLabel': '{{current}} / {{max}}',
  'adventure.player.damaged': 'Ouch!',
  'adventure.player.critical': 'Critical Health!',
  'adventure.player.defeated': 'Defeated!',
  'adventure.boss.attackIncoming': 'Incoming Attack!',
  ```
- **VALIDATE:** Check all 4 translation files have keys

### Phase 2: Effect Executor

#### Task 2.1: CREATE fe-next/hooks/useBossEffectExecutor.ts

- **IMPLEMENT:** Hook that applies ability effects to game state
- **INTERFACE:**
  ```typescript
  interface EffectExecutorCallbacks {
    onLockTiles: (target: AbilityTarget, durationMs: number) => void;
    onTimerPenalty: (seconds: number) => void;
    onScramble: () => void;
    onRequirement: (requirement: { type: string; value: unknown }, durationMs: number) => void;
    onPlayerDamage: (amount: number) => void;
    onScreenShake: (intensity: number) => void;
    onParticles: (type: 'warning' | 'damage' | 'scramble') => void;
  }

  interface UseBossEffectExecutorReturn {
    executeEffects: (effects: AbilityEffect[]) => void;
  }
  ```
- **EFFECT MAPPING:**
  - `lock_tiles` → Callback to lock specified tiles for duration
  - `timer_penalty` → Callback to reduce timer by N seconds
  - `scramble` → Callback to shuffle tile positions
  - `requirement` → Callback to display forced word requirement
  - All effects → Screen shake + particle feedback
- **GOTCHA:** Effects should be applied in sequence with slight delays for dramatic effect
- **VALIDATE:** `npm run test -- --testPathPattern=useBossEffectExecutor`

#### Task 2.2: CREATE fe-next/hooks/__tests__/useBossEffectExecutor.test.ts

- **IMPLEMENT:** Unit tests for effect executor
- **TEST CASES:**
  - Calls onLockTiles for lock_tiles effect
  - Calls onTimerPenalty for timer_penalty effect
  - Calls onScramble for scramble effect
  - Calls onScreenShake for all effects
  - Handles multiple effects in sequence
- **VALIDATE:** `npm run test -- --testPathPattern=useBossEffectExecutor`

### Phase 3: Integration

#### Task 3.1: UPDATE fe-next/components/adventure/boss/BossOverlay.tsx

- **IMPLEMENT:** Replace console.log with actual effect execution callback
- **CHANGES:**
  - Add `onExecuteEffects: (effects: AbilityEffect[]) => void` prop
  - Call `onExecuteEffects(effects)` instead of console.log in `handleTelegraphComplete`
  - Add `PlayerHealthBar` component rendering when `playerHealth` prop provided
- **PATTERN:** Lift effect execution to AdventureGame which has access to game state
- **GOTCHA:** Must maintain backwards compatibility with existing props
- **VALIDATE:** `npm run build` passes

#### Task 3.2: UPDATE fe-next/components/adventure/AdventureGame.tsx

- **IMPLEMENT:** Integrate player health and effect executor
- **CHANGES:**
  - Add `usePlayerHealth` hook call
  - Add `useBossEffectExecutor` hook call with callbacks
  - Implement `handleLockTiles` callback (set tile.isFrozen = true)
  - Implement `handleTimerPenalty` callback (call `addTime(-seconds)`)
  - Implement `handleScramble` callback (shuffle tile positions)
  - Pass callbacks to BossOverlay
  - Pass playerHealth to BossOverlay for health bar
  - Handle player death (defeat state)
- **GOTCHA:** Need to extend useAdventureGame or tile state to support locked tiles
- **VALIDATE:** `npm run build` passes

#### Task 3.3: UPDATE fe-next/components/adventure/BossDialogue.tsx

- **IMPLEMENT:** Fix speech bubble positioning and overflow
- **CHANGES:**
  - Add `useRef` for bubble element
  - Add `useEffect` to detect viewport overflow
  - Constrain width to `max-w-[calc(100vw-1rem)]`
  - Add padding from edges: `left-2 right-2 sm:left-auto sm:right-auto`
  - Use responsive top position: `top-20 sm:top-24 md:top-28`
  - Add text truncation for very long taunts: `line-clamp-3`
- **PATTERN:** Mobile-first responsive design
- **GOTCHA:** Test with RTL (Hebrew) layout
- **VALIDATE:** Manual test on mobile viewport sizes

### Phase 4: Visual Feedback

#### Task 4.1: UPDATE effect executor with visual feedback

- **IMPLEMENT:** Add screen shake and particles to effect execution
- **CHANGES:**
  - Import shake intensity mapping:
    ```typescript
    const SHAKE_INTENSITY: Record<string, number> = {
      timer_penalty: 8,  // Strong shake
      lock_tiles: 4,     // Medium shake
      scramble: 6,       // Strong shake
      requirement: 2,    // Light shake
    };
    ```
  - Add particle effect triggers
  - Add slight delay between visual feedback and effect application (200ms)
- **VALIDATE:** Manual test of ability execution

#### Task 4.2: ADD damage feedback effects

- **IMPLEMENT:** Red flash/vignette when player takes damage
- **CHANGES:**
  - Add `DamageFlash` component or use existing effects layer
  - Trigger red screen edge glow on player damage
  - Add hurt sound trigger (if sound system exists)
- **PATTERN:** Reference `AttackTelegraph.tsx` for screen-edge effects
- **VALIDATE:** Manual test of damage feedback

#### Task 4.3: UPDATE tile visual state for locked tiles

- **IMPLEMENT:** Visual indication when tiles are locked by boss ability
- **CHANGES:**
  - Add locked tile styling in AdventureGrid
  - Use red border or chain icon for locked tiles
  - Add pulse animation during lock duration
- **PATTERN:** Reference existing frozen tile styling
- **VALIDATE:** Manual test of lock_tiles ability

### Phase 5: Testing & Validation

#### Task 5.1: WRITE integration test for ability flow

- **IMPLEMENT:** Test complete ability → telegraph → execute → effect flow
- **TEST FILE:** `fe-next/components/adventure/boss/__tests__/BossOverlay.integration.test.tsx`
- **TEST CASES:**
  - Ability triggers after conditions met
  - Telegraph shows for 2 seconds
  - Effects apply after telegraph
  - Visual feedback occurs
  - Player health decreases for damage effects
- **VALIDATE:** `npm run test -- --testPathPattern=BossOverlay.integration`

#### Task 5.2: Manual testing checklist

- **TEST:** All 10 boss battles (one per world)
- **VERIFY:**
  - [ ] Ms. Grammar (World 1): Pop Quiz, Red Pen, Detention abilities work
  - [ ] Spelling Bee (World 2): Abilities trigger and execute
  - [ ] Professor Thesaurus (World 3): Abilities work
  - [ ] Captain Metaphor (World 4): Abilities work
  - [ ] Baron Buildaword (World 5): Abilities work
  - [ ] Puzzle Master (World 6): Scramble ability visually shuffles tiles
  - [ ] Reflection King (World 7): Abilities work
  - [ ] Cosmic Wordsmith (World 8): Abilities work
  - [ ] Linguist Sage (World 9): Abilities work
  - [ ] Lexicon Dragon (World 10): All abilities cycle properly
  - [ ] Speech bubbles don't overflow on mobile (320px width)
  - [ ] Player health bar appears and updates
  - [ ] Screen shake occurs on ability execution
  - [ ] Player defeat triggers when health = 0

---

## TESTING STRATEGY

### Unit Tests

**Scope and Requirements:**

- Test all public methods in hooks (usePlayerHealth, useBossEffectExecutor)
- Test PlayerHealthBar component rendering states
- Mock callbacks in effect executor tests
- Use Jest + React Testing Library

**Pattern:**

```typescript
// hooks/__tests__/usePlayerHealth.test.ts
describe('usePlayerHealth', () => {
  it('should reduce health when takeDamage called', () => {
    const { result } = renderHook(() => usePlayerHealth({ maxHealth: 100 }));

    act(() => {
      result.current.takeDamage(25);
    });

    expect(result.current.health).toBe(75);
    expect(result.current.healthPercentage).toBe(75);
  });

  it('should not reduce health during invulnerability', () => {
    const { result } = renderHook(() => usePlayerHealth({ maxHealth: 100 }));

    act(() => {
      result.current.takeDamage(25);
    });

    // Immediately try to damage again (should be blocked by invulnerability)
    act(() => {
      result.current.takeDamage(25);
    });

    expect(result.current.health).toBe(75); // Only first damage applied
  });
});
```

### Integration Tests

**Scope and Requirements:**

- Test BossOverlay with effect executor integration
- Test AdventureGame boss battle flow
- Use mock implementations for game state

**Pattern:**

```typescript
// BossOverlay.integration.test.tsx
describe('BossOverlay integration', () => {
  it('should execute effects when telegraph completes', async () => {
    const mockExecuteEffects = jest.fn();

    render(
      <BossOverlay
        boss={mockBossConfig}
        onExecuteEffects={mockExecuteEffects}
        // ... other props
      />
    );

    // Advance time to trigger ability
    act(() => {
      jest.advanceTimersByTime(25000); // Past cooldown
    });

    // Advance through telegraph
    act(() => {
      jest.advanceTimersByTime(2000);
    });

    expect(mockExecuteEffects).toHaveBeenCalledWith(
      expect.arrayContaining([
        expect.objectContaining({ type: 'requirement' })
      ])
    );
  });
});
```

### Edge Cases

- Player health at exactly 0 (should trigger defeat)
- Multiple abilities queued (should process in order)
- Rapid damage during invulnerability (should be blocked)
- Very long taunt text overflow
- RTL layout speech bubble positioning
- Mobile viewport (320px) layout

---

## VALIDATION COMMANDS

**Prerequisites:**

```bash
cd /Users/ohadfisher/git/boggle-new/fe-next
```

### Level 1: TypeScript Compilation

```bash
npm run build
```

**Expected:** Build succeeds with no TypeScript errors

### Level 2: Unit Tests

```bash
npm run test -- --testPathPattern="(usePlayerHealth|useBossEffectExecutor|PlayerHealthBar)"
```

**Expected:** All new tests pass

### Level 3: Existing Tests

```bash
npm run test
```

**Expected:** All tests pass, no regressions

### Level 4: Lint

```bash
npm run lint
```

**Expected:** No lint errors

### Level 5: Manual Validation

```bash
npm run dev
# Navigate to Adventure Mode → World 1 Boss (Level 10)
# Verify:
# 1. Player health bar visible below boss HP bar
# 2. Boss abilities trigger with telegraph warning
# 3. Effects actually apply (timer reduces, tiles lock)
# 4. Screen shake and particles on ability execution
# 5. Speech bubbles stay within viewport
# 6. Player loses if health reaches 0
```

---

## ACCEPTANCE CRITERIA

**Boss-Focused Objectives:**
- [ ] Boss levels have `defeatBoss` as primary objective (NOT wordCount)
- [ ] Boss levels have `mechanicTrigger` and `surviveBattle` as secondary objectives
- [ ] Regular levels still have normal objectives (no regression)
- [ ] Objectives display properly with appropriate icons and progress
- [ ] Victory triggers when boss HP reaches 0 (not when word count reached)

**Player Health System:**
- [ ] Player health system implemented with damage/heal/invulnerability
- [ ] Player health bar visible during boss battles
- [ ] Player defeat triggers when health reaches 0

**Boss Ability Effects:**
- [ ] All boss ability effects actually apply to game state:
  - [ ] `lock_tiles`: Tiles become unselectable for duration
  - [ ] `timer_penalty`: Timer decreases by penalty seconds
  - [ ] `scramble`: Tile positions shuffle visually
  - [ ] `requirement`: Forced word requirement displayed
- [ ] Visual feedback on ability execution (screen shake, particles)

**UI/UX:**
- [ ] Speech bubbles don't overflow viewport on any screen size
- [ ] Boss HP bar and player health bar both visible and distinguishable

**Quality:**
- [ ] All existing tests pass (no regressions)
- [ ] All new tests pass (≥80% coverage for new code)
- [ ] Build succeeds with no errors
- [ ] Lint passes with no errors

---

## COMPLETION CHECKLIST

- [ ] All Phase 0 tasks completed (Boss-Focused Objectives)
- [ ] All Phase 1 tasks completed (Player Health System)
- [ ] All Phase 2 tasks completed (Effect Executor)
- [ ] All Phase 3 tasks completed (Integration)
- [ ] All Phase 4 tasks completed (Visual Feedback)
- [ ] All Phase 5 tasks completed (Testing)
- [ ] All validation commands pass
- [ ] Manual testing checklist complete
- [ ] Code reviewed for quality

---

## NOTES

### Design Rationale

**Why Boss-Focused Objectives?**
The current system generates "find 15 words" for boss levels just like regular levels. This makes the boss feel like decoration rather than the main event. By making the primary objective "Defeat the Boss" and adding mechanic-based secondary objectives, the player's focus shifts to the battle itself. Words become the MEANS to defeat the boss, not the END goal.

**Why Player Health System?**
Boss attacks need consequences beyond just wasting time. A player health system creates tension and makes boss battles feel more like actual boss fights. Without it, boss abilities are just visual noise.

**Why Effect Executor Hook?**
Separating effect execution logic into its own hook:
1. Makes testing easier (can mock effect callbacks)
2. Keeps BossOverlay focused on UI
3. Allows reuse if other systems need to apply effects
4. Follows existing hook composition pattern in codebase

**Why Invulnerability Frames?**
Prevents frustrating damage stacking when multiple effects hit quickly. Standard game design pattern for fairness.

### Alternatives Considered

1. **Modify tiles directly in BossOverlay** - Rejected because BossOverlay doesn't have access to game state
2. **Use global state for effects** - Rejected to avoid adding Redux/Zustand dependency
3. **Remove player health, just use timer** - Rejected because that's the current broken state

### Future Considerations

- Add healing items/abilities for player
- Add boss attack patterns that can be dodged
- Add combo-based damage reduction (reward good play)
- Add difficulty scaling for player health per world
