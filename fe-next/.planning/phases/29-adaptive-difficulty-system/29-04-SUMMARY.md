---
phase: 29
plan: 04
subsystem: adaptive-difficulty
tags: [config-adjustment, tier-modifiers, difficulty-tuning, boss-exclusion]
requires: [29-01, 29-02, lib/adventure/levelConfig.ts]
provides:
  - Config adjuster with tier-based level modifications
  - Boss level exclusion logic
  - Barrel exports for adaptiveDifficulty module
affects: [29-05, components that apply difficulty adjustments]
tech-stack:
  added: []
  patterns:
    - Pure function config transformation
    - Immutable config objects
    - Boss level special handling
key-files:
  created:
    - lib/adaptiveDifficulty/configAdjuster.ts
    - lib/adaptiveDifficulty/__tests__/configAdjuster.test.ts
  modified:
    - types/difficulty.ts (added TierAdjustments interface)
    - lib/adaptiveDifficulty/index.ts (already had exports)
decisions:
  - decision: "Boss levels excluded from tier adjustments"
    rationale: "Boss patterns should be consistent for learning, not adaptive"
    impact: "isBossLevel=true always returns unmodified config"
  - decision: "Floor division for timer/score calculations"
    rationale: "Avoid fractional seconds/points in UI"
    impact: "Math.floor applied to all multiplied values"
  - decision: "Only primary scoreTarget objectives modified"
    rationale: "Secondary objectives are optional bonus challenges"
    impact: "Non-primary objectives and wordCount always unchanged"
metrics:
  tests: 61 total (16 configAdjuster + 45 other module tests)
  coverage: 100% (configAdjuster.ts)
  duration: "5m 6s"
  completed: 2026-01-31
---

# Phase 29 Plan 04: Config Adjuster with Tier Modifiers Summary

**One-liner:** Config adjuster applies tier-based level modifications (+20% timer easy, -15% timer hard, -20% score targets easy) with boss level exclusion verified via levelConfig dependency.

## What Was Built

Implemented config adjuster that transforms base level configuration based on player's difficulty tier:

**Tier Adjustment System:**
- Easy tier: +20% timer (1.2x), -20% score targets (0.8x), normal cooldowns
- Normal tier: No modifications (1.0x all multipliers)
- Hard tier: -15% timer (0.85x), normal score targets, +50% cooldowns (reserved for future power-up integration)
- Boss levels (isBossLevel=true): Always return unmodified config regardless of tier

**Implementation Details:**
- `getTierAdjustments(tier)`: Returns tier multipliers from constants
- `applyTierAdjustments(baseConfig, tier)`: Pure function that returns new LevelConfig
- Immutability: Never mutates original config, always returns new object
- Selective modification: Only primary scoreTarget objectives adjusted, wordCount and secondary objectives unchanged

**Boss Level Exclusion Verification:**
- Added tests validating boss level identification from lib/adventure/levelConfig.ts
- Confirmed level 7 in all worlds returns isBossLevel=true
- Confirmed non-boss levels return isBossLevel=false
- Verified adjustments never applied to boss levels (consistent patterns for learning)

**Module Barrel Exports:**
- lib/adaptiveDifficulty/index.ts already had all exports
- Single import path for entire adaptiveDifficulty module
- Clean API: `import { applyTierAdjustments, determineTier, calculateCombinedScore } from '@/lib/adaptiveDifficulty'`

## Tests Written (TDD RED-GREEN-REFACTOR)

**16 configAdjuster tests (100% coverage):**

1. **getTierAdjustments (3 tests):**
   - Returns correct multipliers for easy/normal/hard tiers
   - Validates all three TierAdjustments properties

2. **applyTierAdjustments - Normal tier (1 test):**
   - Returns unmodified config (1.0x multipliers)

3. **applyTierAdjustments - Easy tier (4 tests):**
   - Timer increased by 20% (120s → 144s)
   - Score targets decreased by 20% for primary objectives
   - WordCount objectives unchanged
   - Non-primary objectives unchanged

4. **applyTierAdjustments - Hard tier (2 tests):**
   - Timer decreased by 15% (120s → 102s)
   - Score targets unchanged (1.0x multiplier)

5. **Boss level exclusion (2 tests):**
   - Boss levels return unmodified config for easy tier
   - Boss levels return unmodified config for hard tier

6. **Boss level identification verification (3 tests):**
   - Level 7 in world 1 has isBossLevel=true
   - Level 7 in world 2 has isBossLevel=true
   - Level 7 in world 3 has isBossLevel=true
   - Level 1 in world 1 has isBossLevel=false

7. **Immutability (1 test):**
   - Original config not mutated after adjustment

**Module Test Suite:**
- 61 total tests passing (16 configAdjuster + 45 other module tests)
- 100% coverage on configAdjuster.ts
- All imports resolve correctly via barrel exports

## How It Works

**Tier Assignment Flow (from previous plans):**
```
Performance Tracker → Tier Assigner → Config Adjuster → Modified Level Config
```

**Config Adjuster Logic:**
1. Check if level is boss level (isBossLevel flag)
   - If yes: Return unmodified config immediately
   - If no: Continue to step 2

2. Get tier adjustment multipliers
   - Easy: { timer: 1.2, scoreTarget: 0.8, cooldown: 1.0 }
   - Normal: { timer: 1.0, scoreTarget: 1.0, cooldown: 1.0 }
   - Hard: { timer: 0.85, scoreTarget: 1.0, cooldown: 1.5 }

3. Clone base config (immutability)
   - Shallow copy with spread operator
   - Map objectives to new array

4. Apply timer adjustment
   - `Math.floor(timerSeconds * timerMultiplier)`
   - Example: 120s × 1.2 = 144s (easy), 120s × 0.85 = 102s (hard)

5. Apply score target adjustment (primary objectives only)
   - Filter for `obj.isPrimary && obj.type === 'scoreTarget'`
   - `Math.floor(target * scoreTargetMultiplier)`
   - Example: 200 × 0.8 = 160 (easy)

6. Return adjusted config
   - New object with modified timer and objectives
   - All other properties unchanged

**Boss Level Special Handling:**
- Boss levels identified by `level === 7` in lib/adventure/levelConfig.ts
- isBossLevel flag set automatically by getLevelConfig()
- Config adjuster checks flag at entry, short-circuits if true
- Ensures boss attack patterns and timing remain consistent
- Players must learn boss mechanics, not receive easier/harder versions

**Integration Points:**
- Consumers call `applyTierAdjustments(getLevelConfig(world, level), determineTier(attempts))`
- Result passed to AdventureGame component for gameplay
- Future: Power-up cooldowns will use powerUpCooldownMultiplier (hard tier +50%)

## Deviations from Plan

None - plan executed exactly as written.

## Decisions Made

**1. Boss Level Exclusion Implementation:**
- **Decision:** Check isBossLevel flag at function entry, return immediately if true
- **Rationale:** Clearest logic flow, minimal overhead, explicit behavior
- **Alternative considered:** Filter boss levels before calling function (caller responsibility)
- **Impact:** Boss levels guaranteed to never be adjusted, single source of truth for exclusion

**2. Floor Division for Timer and Scores:**
- **Decision:** Use Math.floor() for all multiplied values
- **Rationale:** UI displays integers, fractional seconds/points confusing
- **Alternative considered:** Math.round() for rounding up/down
- **Impact:** Easy tier 120s × 1.2 = 144s (not 144.0s), consistent integer values

**3. Selective Objective Modification:**
- **Decision:** Only modify primary scoreTarget objectives, leave wordCount and secondary unchanged
- **Rationale:** WordCount already difficulty-adjusted in levelConfig, secondary objectives are optional
- **Alternative considered:** Modify all objectives uniformly
- **Impact:** Tier adjustments focused on time pressure and score requirements only

**4. Immutability Pattern:**
- **Decision:** Return new config object, never mutate input
- **Rationale:** Pure function benefits (testability, predictability, no side effects)
- **Alternative considered:** In-place mutation for performance
- **Impact:** Slightly higher memory usage, but safer and easier to reason about

## Files Changed

**Created:**
- `lib/adaptiveDifficulty/configAdjuster.ts` (100 lines)
  - getTierAdjustments() - Returns tier multipliers
  - applyTierAdjustments() - Transforms config based on tier
  - TIER_ADJUSTMENTS constant - Multiplier values for each tier

- `lib/adaptiveDifficulty/__tests__/configAdjuster.test.ts` (304 lines)
  - 16 tests covering all tier combinations
  - Boss level identification verification tests
  - Immutability and selective modification tests

**Modified:**
- `types/difficulty.ts` (+14 lines)
  - Added TierAdjustments interface (timerMultiplier, scoreTargetMultiplier, powerUpCooldownMultiplier)

- `lib/adaptiveDifficulty/index.ts` (no changes)
  - Already had applyTierAdjustments and getTierAdjustments exports
  - Barrel export structure complete

## Next Steps

**Immediate (Plan 05 - Tier Adjustment Utilities):**
- Create hooks/useDifficultyTier.ts for tier state management
- Integrate config adjuster with AdventureGame component
- Add visual indicators for current tier (subtle, non-intrusive)

**Future Enhancements:**
- Power-up cooldown adjustments (hard tier +50% cooldown)
- Analytics: Track tier distribution across player base
- A/B testing: Experiment with different tier multiplier values

**Testing Recommendations:**
- Manual test: Play same level on different tiers, verify timer/score differences
- Playtesting: Ensure tier adjustments feel fair, not punishing/trivial
- Boss level verification: Confirm boss timing consistent across all tiers

## Integration Examples

**Basic usage:**
```typescript
import { applyTierAdjustments } from '@/lib/adaptiveDifficulty';
import { getLevelConfig } from '@/lib/adventure/levelConfig';

// Get base config
const baseConfig = getLevelConfig(world, level);

// Apply tier adjustments
const adjustedConfig = applyTierAdjustments(baseConfig, 'easy');

// Use adjusted config in game
<AdventureGame levelConfig={adjustedConfig} />
```

**With tier determination:**
```typescript
import { determineTier, applyTierAdjustments } from '@/lib/adaptiveDifficulty';

// Determine tier from attempts
const { tier } = determineTier(recentAttempts);

// Apply tier to level config
const config = applyTierAdjustments(baseConfig, tier);
```

**Boss level safety:**
```typescript
// Boss levels automatically excluded
const bossConfig = getLevelConfig(1, 7); // isBossLevel=true
const adjusted = applyTierAdjustments(bossConfig, 'easy');
// adjusted === bossConfig (no changes)
```

## Success Metrics

- ✅ 16 tests passing with 100% coverage
- ✅ Boss level exclusion verified via dependency tests
- ✅ All tier multipliers correct (easy: +20% timer/-20% score, hard: -15% timer)
- ✅ Immutability guaranteed (original config never mutated)
- ✅ Barrel exports provide clean API
- ✅ TypeScript types fully integrated
- ✅ 61 total module tests passing (configAdjuster + existing tests)

---

**Phase 29 Progress:** 3/5 plans complete (performance tracker, tier assigner, config adjuster)
**Wave 2:** 1/3 plans complete (config adjuster)
**Next:** Plan 05 - Tier Adjustment Utilities (hooks, visual indicators, integration)
