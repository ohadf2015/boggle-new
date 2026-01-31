---
phase: 31-skill-tree--progression-depth
plan: 03
status: complete
---

# Plan 03 Summary: Skill Points Hook

## What Was Built

### Hook (fe-next/hooks/useSkillPoints.ts)
- Wires adventure level-up events to skill point awards
- Awards 1 skill point per level gained
- Tracks level via useRef to detect increases

### Interface
```typescript
interface UseSkillPointsOptions {
  currentLevel: number;
  onLevelUp?: (data: LevelUpData) => void;
}

interface LevelUpData {
  previousLevel: number;
  newLevel: number;
  pointsAwarded: number;
}

interface UseSkillPointsReturn {
  trackedLevel: number;
  availablePoints: number;
  totalPointsEarned: number;
}
```

### Behavior
- Uses `useEffect` to detect level changes
- Awards `currentLevel - previousLevel` points (handles multi-level jumps)
- Does not award points on initial render
- Does not award points when level decreases
- Calls optional `onLevelUp` callback with level change data

### Tests (fe-next/hooks/useSkillPoints.test.ts)
- 12 tests covering:
  - Initial state (tracks level, no points on init)
  - Level up detection (+1 point per level)
  - Multi-level jump (awards multiple points)
  - Level staying same (no points)
  - Level decreasing (no points)
  - Callback integration (receives correct data)
  - Return values (trackedLevel, availablePoints, totalPointsEarned)

## Commits
- Code committed in prior session

## Deviations
None - implemented as planned.

## Verification
- [x] User earns 1 skill point per level up
- [x] Skill points awarded exactly once per level
- [x] Works with useAdventureXp hook output (currentLevel)
- [x] Optional callback for UI celebrations
- [x] All 12 tests passing
