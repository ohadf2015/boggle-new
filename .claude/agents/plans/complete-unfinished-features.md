# Feature: Complete Unfinished Features and Technical Debt

**IMPORTANT:** Before implementing, validate documentation and codebase patterns. Pay special attention to naming of existing utils, types, and models. Import from the right files.

## Feature Description

This plan addresses discovered incomplete features, placeholder implementations, and technical debt across the LexiClash codebase. The goal is to bring the project to a more complete state by fixing critical bugs, completing partially implemented features, and cleaning up technical debt.

## Problem Statement

The codebase contains:
1. **Critical bugs**: Word validation stub that always returns `true`
2. **Incomplete translations**: Spanish `multiplier` text contains "TODO"
3. **Placeholder features**: Tournament mode locked, Shop "coming soon", etc.
4. **Technical debt**: Backup files cluttering repository, refactoring TODOs
5. **Context refactoring needed**: Combo system using prop drilling instead of context

## Solution Statement

Prioritized fixes focusing on:
1. **P0 (Critical)**: Fix the word path validation stub - this affects game integrity
2. **P1 (High)**: Fix Spanish translation TODO
3. **P2 (Medium)**: Clean up backup files
4. **P3 (Low)**: Document/track remaining "coming soon" features for future work

## Feature Metadata

**Feature Type:** Bug Fix + Enhancement + Cleanup
**Estimated Complexity:** Medium
**Primary Systems Affected:** Word validation, translations, repository hygiene
**Dependencies:** None

---

## CONTEXT REFERENCES

### Prime Context (READ THIS FIRST!)

- `.claude/agents/context/prime-context.md` - COMPLETE codebase overview
  - **WHY:** Contains all project patterns, configurations, and architecture
  - **ACTION:** Read this file first to understand the codebase

### Critical Files to Fix

#### P0: Word Path Validation Bug
- `fe-next/utils/wordHuntFeedback.ts` (lines 196-200)
  - **WHY:** Contains stub that always returns `true` - CRITICAL BUG
  - **ISSUE:** `canFormWordOnBoard()` doesn't actually validate word paths

#### P1: Spanish Translation TODO
- `fe-next/translations/es.js` (line 222)
  - **WHY:** Contains `"multiplier": "2× TODO"` - visible to users
  - **PATTERN:** Other languages have proper translations

#### P2: Backup Files to Remove
- `fe-next/translations/es.js.bak`
- `fe-next/translations/ja.js.bak`
- `fe-next/translations/sv.js.bak`
- `fe-next/translations/es.js.backup`
- `fe-next/backend/__tests__/integration/gameHandlersSplit.test.js.bak`
  - **WHY:** Clutters repository, creates confusion

### Reference Files (for patterns)

- `fe-next/components/grid/GridComponentBase.tsx` - Contains path-finding logic
  - **WHY:** Has the actual board path validation we need to integrate
  - **PATTERN:** Uses DFS to validate word paths

- `fe-next/translations/en.js` (line 222 area)
  - **WHY:** Reference for correct earthquake.multiplier translation
  - **PATTERN:** `"multiplier": "2× Points"` or equivalent

---

## IMPLEMENTATION PLAN

### Phase 1: P0 Critical Bug Fix - Word Path Validation

**Problem:** The `canFormWordOnBoard()` function in `wordHuntFeedback.ts` is a stub that always returns `true`. This means Word Hunt mode doesn't actually validate that words can be formed on the board.

**Tasks:**

1. Find the existing path-finding logic in GridComponent
2. Extract/reuse the path validation algorithm
3. Implement proper word path validation in `canFormWordOnBoard()`
4. Add unit tests

### Phase 2: P1 Translation Fix

**Problem:** Spanish translation for earthquake multiplier shows "2× TODO" to users.

**Tasks:**

1. Fix the Spanish translation
2. Verify all other languages have proper translations

### Phase 3: P2 Repository Cleanup

**Problem:** Backup files cluttering the repository.

**Tasks:**

1. Remove all `.bak` and `.backup` translation files
2. Remove old test backup file

### Phase 4: Documentation - Track "Coming Soon" Features

**Problem:** Several features are marked "coming soon" but not tracked anywhere.

**Tasks:**

1. Document the "coming soon" features for future work
2. This is informational - no code changes needed

---

## STEP-BY-STEP TASKS

### Task 1: ANALYZE GridComponent Path-Finding Logic

- **IMPLEMENT:** Read and understand the existing word path validation
- **FILES TO READ:**
  - `fe-next/components/grid/GridComponentBase.tsx`
  - `fe-next/components/grid/useGridPath.ts` (if exists)
- **GOAL:** Understand the algorithm for validating word paths on the grid
- **VALIDATE:** `echo "Analysis complete"`

### Task 2: UPDATE `canFormWordOnBoard()` in wordHuntFeedback.ts

- **IMPLEMENT:** Replace the stub with actual path validation
- **PATTERN:** Use DFS/BFS to check if word can be traced on grid
- **ALGORITHM:**
  1. Find all cells containing the first letter
  2. For each starting cell, attempt DFS to trace the word
  3. Adjacent cells = up, down, left, right, and diagonals
  4. Each cell can only be used once per word
  5. Return true if any path completes the word
- **GOTCHA:** Hebrew letters may need normalization (use existing `normalizeHebrewLetter`)
- **VALIDATE:** `npm run test -- --testPathPattern=wordHuntFeedback`

### Task 3: CREATE Unit Tests for `canFormWordOnBoard()`

- **IMPLEMENT:** Add test cases in new or existing test file
- **PATTERN:** Follow existing test patterns in `__tests__/`
- **TEST CASES:**
  1. Valid word that can be formed → returns true
  2. Invalid word that cannot be formed → returns false
  3. Word using same cell twice → returns false
  4. Empty grid → returns false
  5. Word longer than grid allows → returns false
  6. Hebrew word with final letters → handles normalization
- **VALIDATE:** `npm run test -- --testPathPattern=wordHuntFeedback`

### Task 4: FIX Spanish Translation - multiplier

- **IMPLEMENT:** Change `"multiplier": "2× TODO"` to proper Spanish
- **FILE:** `fe-next/translations/es.js` line 222
- **NEW VALUE:** `"multiplier": "2× Puntos"` (matches English "2× Points")
- **VALIDATE:** `grep -n "multiplier" fe-next/translations/es.js`

### Task 5: VERIFY Other Language Translations

- **IMPLEMENT:** Check that all languages have proper multiplier text
- **FILES TO CHECK:**
  - `fe-next/translations/en.js`
  - `fe-next/translations/he.js`
  - `fe-next/translations/sv.js`
  - `fe-next/translations/ja.js`
- **VALIDATE:** `grep -r '"multiplier"' fe-next/translations/*.js | grep -v bak`

### Task 6: REMOVE Backup Translation Files

- **IMPLEMENT:** Delete backup files that clutter repository
- **FILES TO DELETE:**
  - `fe-next/translations/es.js.bak`
  - `fe-next/translations/es.js.backup`
  - `fe-next/translations/ja.js.bak`
  - `fe-next/translations/sv.js.bak`
- **VALIDATE:** `ls fe-next/translations/*.bak 2>/dev/null || echo "No .bak files"`

### Task 7: REMOVE Old Test Backup File

- **IMPLEMENT:** Delete old test backup
- **FILE:** `fe-next/backend/__tests__/integration/gameHandlersSplit.test.js.bak`
- **VALIDATE:** `ls fe-next/backend/__tests__/integration/*.bak 2>/dev/null || echo "No .bak files"`

---

## TESTING STRATEGY

### Unit Tests for Word Path Validation

```typescript
describe('canFormWordOnBoard', () => {
  it('should return true for valid word that can be traced', () => {
    const grid = [
      ['C', 'A', 'T'],
      ['D', 'O', 'G'],
      ['X', 'Y', 'Z']
    ];
    expect(canFormWordOnBoard('CAT', grid)).toBe(true);
    expect(canFormWordOnBoard('DOG', grid)).toBe(true);
  });

  it('should return false for word that cannot be traced', () => {
    const grid = [
      ['A', 'B', 'C'],
      ['D', 'E', 'F'],
      ['G', 'H', 'I']
    ];
    expect(canFormWordOnBoard('ACE', grid)).toBe(false); // A and C not adjacent
  });

  it('should not allow reusing the same cell', () => {
    const grid = [
      ['A', 'B', 'A'],
      ['X', 'X', 'X'],
      ['X', 'X', 'X']
    ];
    expect(canFormWordOnBoard('ABA', grid)).toBe(true); // Uses two different A cells
    expect(canFormWordOnBoard('AA', grid)).toBe(false); // Would need to reuse A
  });
});
```

---

## VALIDATION COMMANDS

### Level 1: Compilation Check

```bash
cd fe-next && npm run build
```

**Expected:** Build succeeds

### Level 2: Unit Tests

```bash
cd fe-next && npm run test -- --testPathPattern=wordHuntFeedback
```

**Expected:** All tests pass

### Level 3: Full Test Suite

```bash
cd fe-next && npm run test
```

**Expected:** All tests pass

### Level 4: Translation Verification

```bash
grep -r '"multiplier"' fe-next/translations/*.js | grep -v bak | grep -v backup
```

**Expected:** All languages show proper translation, no "TODO"

### Level 5: Backup Files Removed

```bash
ls fe-next/translations/*.bak fe-next/translations/*.backup 2>/dev/null && echo "FAIL: Backup files exist" || echo "PASS: No backup files"
```

**Expected:** "PASS: No backup files"

---

## ACCEPTANCE CRITERIA

- [ ] `canFormWordOnBoard()` properly validates word paths on grid
- [ ] Unit tests cover word path validation edge cases
- [ ] Spanish translation no longer shows "TODO"
- [ ] All backup files removed from repository
- [ ] All existing tests continue to pass
- [ ] Build succeeds

---

## COMPLETION CHECKLIST

- [ ] Task 1: Analyzed GridComponent path-finding
- [ ] Task 2: Implemented `canFormWordOnBoard()`
- [ ] Task 3: Created unit tests
- [ ] Task 4: Fixed Spanish translation
- [ ] Task 5: Verified other translations
- [ ] Task 6: Removed translation backups
- [ ] Task 7: Removed test backup
- [ ] All validation commands pass

---

## NOTES

### "Coming Soon" Features (NOT in scope - tracked for future)

These features are intentionally "coming soon" and should NOT be implemented in this plan:

1. **Tournament Mode** (`GameTypeSelector.tsx:47`)
   - Locked with `isTournamentLocked = true`
   - Requires significant backend work

2. **Shop/Collectibles** (`ProfileCollection.tsx:68`)
   - Shows "Shop coming soon"
   - Requires payment integration, inventory system

3. **New Year Event** (`NewYearCountdown.tsx:121`)
   - Placeholder for future seasonal content

4. **Leaderboard** (`leaderboard/page.tsx:73`)
   - Conditional on Supabase being enabled
   - Works when configured

### Technical Debt (NOT in scope - tracked for future)

1. **Combo System Context Refactoring**
   - Multiple TODOs to move from props to context
   - Larger refactoring effort

2. **Email Language Hardcoding**
   - `lib/email.ts:566` - hardcoded English links
   - Requires user preference storage

3. **Landscape Mode**
   - Disabled feature flag in `LandscapeIndicator.tsx`
   - Needs further testing before enabling

### Design Rationale

**Why prioritize word validation fix?**
- This is a functional bug that affects game integrity
- Players could submit invalid words and have them accepted
- Critical for Word Hunt daily challenge mode

**Why clean up backup files?**
- Repository hygiene
- Prevents confusion about authoritative files
- Reduces repository size
