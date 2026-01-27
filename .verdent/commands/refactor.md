# Refactor Workflow

## Description
Intelligently refactor and improve code quality while preserving external behavior and keeping tests green.

## Tools Needed
- `file_read`, `file_edit`
- `bash` (npm, git)
- `grep_content`, `grep_file`
- `spawn_subagent` (verifier, file-navigator)
- `todo_update`

## Project Context
- `AGENTS.md` - Architecture patterns
- `fe-next/CLAUDE.md` - Code quality standards
- `.verdent/agents/code-quality-pragmatist.md` - Anti-slop methodology

## CRITICAL PRINCIPLES

### 1. Preserve External Behavior
- Refactoring changes HOW code works, not WHAT it does
- All existing functionality must remain intact
- No observable changes to users or API contracts

### 2. Keep Tests Green Throughout
- Run tests before starting
- Run tests after each change
- Never break tests during refactoring
- If tests break, refactoring is wrong

### 3. No Performance Degradation
- Benchmark before refactoring if performance-critical
- Measure after refactoring
- No acceptable slowdowns

### 4. Incremental Changes
- Small, focused refactorings
- Verify after each step
- Commit frequently (if approved)
- Easy to reverse if needed

## Process

### 1. Analyze Current Code

**Read the target code:**
```
file_read([target-file])
```

**Identify code smells:**
- Duplicated code (DRY violations)
- Long functions (>50 lines)
- Large files (>500 lines)
- Magic numbers/strings
- Complex conditionals
- Deep nesting (>3 levels)
- Many parameters (>4)
- `any` types
- Commented-out code
- Poor naming

**Check related files:**
```
spawn_subagent(
  subagent_type="file-navigator",
  description="Find related code",
  instructions="Search for files using [function/component name].
  Find all usages and dependencies.
  Identify impact of changes."
)
```

### 2. Establish Baseline Tests

**Run existing tests:**
```bash
cd fe-next

# Run tests for this module
npm run test -- [target-test-file]

# Or run all tests if wide impact
npm run test
```

**Expected:** ✅ All tests pass

**If tests fail:**
- Fix tests first before refactoring
- Or document known failures

**If no tests exist:**
- STOP - Write tests first
- Use `feature.md` workflow to add tests
- Then return to refactoring

### 3. Create Refactoring Plan

**Document what will change:**
- [ ] Extract [function X] from [component Y]
- [ ] Rename [confusing-name] to [clear-name]
- [ ] Split [large-file] into [file1, file2]
- [ ] Remove duplicated code in [file1, file2]
- [ ] Extract magic numbers to constants
- [ ] Improve types (remove `any`)

**Estimate impact:**
- Files to modify
- Components affected
- Potential breaking changes
- Test updates needed (should be none for pure refactoring)

**Set up task tracking:**
```
todo_update({
  todos: [
    { content: "Run baseline tests", status: "pending", note: "" },
    { content: "Extract helper function", status: "pending", note: "" },
    { content: "Remove code duplication", status: "pending", note: "" },
    { content: "Improve type definitions", status: "pending", note: "" },
    { content: "Verify tests still pass", status: "pending", note: "" },
    { content: "Run full verification", status: "pending", note: "" }
  ]
})
```

### 4. Refactor Incrementally

**Make ONE change at a time:**

#### Extract Function
```typescript
// Before: Long function with complex logic
function processGameState(state) {
  // 100 lines of code
  const validated = /* 20 lines validation */
  const updated = /* 30 lines update logic */
  const formatted = /* 20 lines formatting */
  return formatted;
}

// After: Extracted to smaller functions
function processGameState(state) {
  const validated = validateGameState(state);
  const updated = updateGameLogic(validated);
  return formatGameState(updated);
}

function validateGameState(state) {
  // 20 lines validation
}

function updateGameLogic(state) {
  // 30 lines update logic
}

function formatGameState(state) {
  // 20 lines formatting
}
```

**Run tests after extraction:**
```bash
npm run test -- [test-file]
```

**Expected:** ✅ Still passing

#### Extract Constants
```typescript
// Before: Magic numbers
if (score > 100 && combo >= 5) {
  awardBonus(50);
}

// After: Named constants
const BONUS_SCORE_THRESHOLD = 100;
const BONUS_COMBO_MINIMUM = 5;
const BONUS_POINTS = 50;

if (score > BONUS_SCORE_THRESHOLD && combo >= BONUS_COMBO_MINIMUM) {
  awardBonus(BONUS_POINTS);
}
```

**Create constants file if needed:**
```
file_write(
  file_path="fe-next/constants/gameScoring.ts",
  content="export const BONUS_SCORE_THRESHOLD = 100; ..."
)
```

#### Improve Types
```typescript
// Before: any types
function processData(data: any): any {
  return data.value;
}

// After: Proper types
interface GameData {
  value: number;
  timestamp: number;
}

function processData(data: GameData): number {
  return data.value;
}
```

#### Rename for Clarity
```typescript
// Before: Unclear names
function proc(d) {
  const r = d.map(x => x * 2);
  return r;
}

// After: Clear names
function doubleScores(scores: number[]): number[] {
  const doubledScores = scores.map(score => score * 2);
  return doubledScores;
}
```

#### Remove Duplication
```
grep_content(regex="[duplicated-code-pattern]")
```

Find duplicated code:
```typescript
// Before: Duplicated in multiple files
// File1.tsx
function formatPlayerName(name) {
  return name.trim().toLowerCase();
}

// File2.tsx
function formatPlayerName(name) {
  return name.trim().toLowerCase();
}

// After: Extract to utility
// utils/playerUtils.ts
export function formatPlayerName(name: string): string {
  return name.trim().toLowerCase();
}

// File1.tsx & File2.tsx
import { formatPlayerName } from '@/utils/playerUtils';
```

### 5. Verify After Each Change

**After EVERY refactoring step:**

```bash
# Type check
npx tsc --noEmit

# Lint
npm run lint

# Tests
npm run test -- [affected-test]

# If UI component, quick manual check
npm run dev
```

**If anything fails:**
- Revert the change
- Analyze what broke
- Fix or try different approach

### 6. Split Large Files

**If file > 500 lines:**

```typescript
// Before: components/GameBoard.tsx (700 lines)
export function GameBoard() {
  // Component logic
  // Many helper functions
  // Complex state management
}

// After: Split into focused modules
// components/game/GameBoard.tsx (200 lines)
import { useGameLogic } from './hooks/useGameLogic';
import { GameGrid } from './GameGrid';
import { GameControls } from './GameControls';

export function GameBoard() {
  const { state, actions } = useGameLogic();
  return (
    <>
      <GameGrid state={state} />
      <GameControls actions={actions} />
    </>
  );
}

// components/game/GameGrid.tsx (150 lines)
// components/game/GameControls.tsx (100 lines)
// components/game/hooks/useGameLogic.ts (200 lines)
```

### 7. Improve Architecture

**Follow SOLID principles:**

**Single Responsibility:**
```typescript
// Before: Component does too much
function UserProfile() {
  // Fetches data
  // Validates data
  // Formats data
  // Renders UI
  // Handles all events
}

// After: Separated concerns
function UserProfile() {
  const user = useUserData();  // Data fetching
  const formatted = useUserFormatter(user);  // Formatting
  return <UserProfileView user={formatted} />;  // Rendering
}
```

**Dependency Inversion:**
```typescript
// Before: Tight coupling
function GameController() {
  const api = new GameAPI();  // Direct dependency
}

// After: Dependency injection
function GameController({ api }: { api: GameAPI }) {
  // Injected dependency
}
```

### 8. Run Full Verification Suite

**After all refactoring complete:**

```bash
cd fe-next

# Linting
npm run lint

# Type checking
npx tsc --noEmit

# All tests
npm run test

# Translation check
npm run check:translations

# Production build
npm run build
```

**All must pass with zero errors.**

### 9. Use Verifier Subagent

**Final verification:**
```
spawn_subagent(
  subagent_type="verifier",
  description="Verify refactoring",
  instructions="Run all checks on refactored files:
  Files changed: [list files]
  Commands: npm run lint, npx tsc --noEmit, npm run test, npm run build
  Scope: codediff
  Budget: 60s
  Ensure zero errors, no regressions"
)
```

### 10. Document Refactoring Decisions

**If significant refactoring:**

Create a note in `.verdent/memory/refactoring-[date].md`:
```markdown
# Refactoring: [Component/Module Name]

**Date:** 2026-01-13
**Reason:** [Why refactoring was needed]

## Changes Made
- Extracted [X] into separate module
- Removed duplication between [A] and [B]
- Improved types by removing `any`

## Impact
- Files modified: [list]
- Performance: [neutral/improved]
- Bundle size: [change]

## Lessons Learned
- [Pattern that works well]
- [Approach to avoid]
```

## Refactoring Patterns

### Extract Hook (React)
```typescript
// Before: Component with complex logic
function GameBoard() {
  const [state, setState] = useState(initialState);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    // Complex side effect logic (50 lines)
  }, [dependencies]);
  
  const handleAction = () => {
    // Complex event handler (30 lines)
  };
  
  return <div>{/* UI */}</div>;
}

// After: Logic extracted to hook
function GameBoard() {
  const { state, loading, handleAction } = useGameBoardLogic();
  return <div>{/* UI */}</div>;
}

// hooks/useGameBoardLogic.ts
function useGameBoardLogic() {
  const [state, setState] = useState(initialState);
  const [loading, setLoading] = useState(false);
  
  useEffect(() => {
    // Complex side effect logic
  }, [dependencies]);
  
  const handleAction = useCallback(() => {
    // Complex event handler
  }, [dependencies]);
  
  return { state, loading, handleAction };
}
```

### Extract Utility
```typescript
// Before: Same logic in multiple files
// File1.tsx
const score = Math.floor(baseScore * (1 + combo * 0.1));

// File2.tsx
const bonusScore = Math.floor(points * (1 + comboLevel * 0.1));

// After: Extract to utility
// utils/scoring.ts
export function calculateBonusScore(
  baseScore: number,
  comboLevel: number
): number {
  return Math.floor(baseScore * (1 + comboLevel * 0.1));
}

// File1.tsx & File2.tsx
import { calculateBonusScore } from '@/utils/scoring';
const score = calculateBonusScore(baseScore, combo);
```

### Replace Magic Numbers
```typescript
// Before
if (timer <= 30) {
  showWarning();
}
if (score >= 1000) {
  unlockAchievement();
}

// After
// constants/game.ts
export const WARNING_TIME_THRESHOLD = 30;
export const ACHIEVEMENT_SCORE_THRESHOLD = 1000;

// Component
import { WARNING_TIME_THRESHOLD, ACHIEVEMENT_SCORE_THRESHOLD } from '@/constants/game';

if (timer <= WARNING_TIME_THRESHOLD) {
  showWarning();
}
if (score >= ACHIEVEMENT_SCORE_THRESHOLD) {
  unlockAchievement();
}
```

### Simplify Conditionals
```typescript
// Before: Complex nested conditions
if (user) {
  if (user.isActive) {
    if (user.score > 100) {
      if (!user.banned) {
        return true;
      }
    }
  }
}
return false;

// After: Early returns
if (!user) return false;
if (!user.isActive) return false;
if (user.score <= 100) return false;
if (user.banned) return false;
return true;

// Even better: Named function
function canUserPlay(user: User): boolean {
  if (!user?.isActive) return false;
  if (user.score <= 100) return false;
  if (user.banned) return false;
  return true;
}
```

## Code Quality Checklist

**Before considering refactoring done:**

- [ ] No duplicated code (DRY principle)
- [ ] Functions under 50 lines
- [ ] Files under 500 lines
- [ ] No magic numbers/strings
- [ ] Clear, descriptive names
- [ ] Proper type definitions (no `any`)
- [ ] Single responsibility per function/component
- [ ] No deep nesting (>3 levels)
- [ ] No commented-out code
- [ ] Proper error handling
- [ ] Tests still pass
- [ ] Linting passes
- [ ] Type checking passes
- [ ] Build succeeds
- [ ] No performance regressions

## Common Refactoring Mistakes

### ❌ Changing Behavior
```typescript
// WRONG: Refactoring changed what the code does
// Before
function calculateScore(points) {
  return points * 2;
}

// After (WRONG - changed behavior)
function calculateScore(points) {
  return points * 2 + 10;  // Added bonus - this is not refactoring!
}
```

### ❌ Breaking Tests
```typescript
// WRONG: Tests break after refactoring
// This means refactoring changed behavior
// Fix the refactoring, not the tests
```

### ❌ Big Bang Refactoring
```typescript
// WRONG: Changing everything at once
// Right: Small, incremental changes with verification
```

### ❌ Premature Optimization
```typescript
// WRONG: Refactoring for performance without measurement
// Right: Measure first, optimize if needed, measure after
```

## Success Criteria

- [ ] Code smell identified and documented
- [ ] Baseline tests run and pass
- [ ] Refactoring plan created
- [ ] Changes made incrementally
- [ ] Tests verified green after each step
- [ ] No external behavior changes
- [ ] All quality checks pass
- [ ] No performance degradation
- [ ] Code is more maintainable
- [ ] Refactoring decisions documented

---

**Remember**: Refactoring is about improving the internal structure while keeping external behavior unchanged. If you're changing functionality, that's not refactoring - that's a feature or bug fix.
