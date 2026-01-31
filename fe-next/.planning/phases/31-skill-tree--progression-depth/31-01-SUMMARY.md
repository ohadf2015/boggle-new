---
phase: 31-skill-tree--progression-depth
plan: 01
status: complete
---

# Plan 01 Summary: Skill Tree Types & Catalog

## What Was Built

### Types (fe-next/types/adventure.ts)
- `SkillPath` - Union type for power/strategy/utility paths
- `SkillEffectType` - horizontal (75%) or vertical (25%)
- `SkillNode` - Interface for skill definitions with id, name keys, path, tier, cost, prerequisites, effect
- `SkillTreeState` - Interface for player skill state (unlockedSkills Set, points)

### Skill Catalog (fe-next/utils/skillTreeUtils.ts)
- `SKILL_CATALOG` - 14 skills across 3 paths:
  - **Power Path** (4 skills): power_strike, critical_letters, combo_amplifier, boss_slayer
  - **Strategy Path** (5 skills): chain_mastery, ice_breaker, cascade_expert, tile_transmute
  - **Utility Path** (4 skills): quick_charge, power_slot_2, extended_hints, power_slot_3, advanced_multiplier

### Utility Functions
- `getSkillsByPath(path)` - Returns skills for a path, sorted by tier
- `getSkillById(id)` - Lookup skill by ID
- `canUnlockSkill(skillId, state)` - Validates unlock conditions (points, prerequisites)
- `getAvailableSkills(state)` - Returns all unlockable skills for current state

### Tests (fe-next/utils/skillTreeUtils.test.ts)
- 20 tests covering catalog structure, path filtering, skill lookup, unlock validation
- All tests passing

## Commits
- `522b1429` - feat(31): add skill tree translations for all 5 languages
- Wave 1 code committed in prior session

## Deviations
None - implemented as planned.

## Verification
- [x] 14 skills across 3 paths (Power, Strategy, Utility)
- [x] 75%+ horizontal skills (enables strategies)
- [x] Valid tier distribution (1-3)
- [x] Tier 1 skills have no prerequisites
- [x] Higher tier skills require lower tier prerequisites
- [x] Unique skill IDs
- [x] Translation keys follow adventure.skills.* pattern
- [x] All 20 tests passing
