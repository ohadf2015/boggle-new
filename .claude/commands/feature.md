---
allowed-tools: Read, Write, Bash(npm *), Bash(npx *), Bash(git *)
description: Implement new feature thoroughly - understand first, ask questions, write tests
---

## Phase 1: Context Loading

First, read project context:
```
@CLAUDE.md
@README.md
@package.json
```

Understand:
- Tech stack and patterns used
- Code style conventions
- Testing framework and patterns
- Project structure

---

## Phase 2: Clarifying Questions

**STOP AND ASK** before any implementation:

1. **Scope:** What exactly should this feature do? What should it NOT do?
2. **Location:** Where should this live in the codebase?
3. **Integration:** How does this interact with existing features?
4. **Edge cases:** What happens with invalid input / errors / empty states?
5. **UI/UX:** (if applicable) Any specific design requirements?

Wait for answers before proceeding.

---

## Phase 3: Find Similar Patterns

Search for existing patterns to follow:
```bash
# Find similar implementations
grep -rn "[similar_feature]" --include="*.ts" --include="*.tsx"

# Find existing tests as reference
find . -name "*.test.ts" -o -name "*.spec.ts" | head -10
```

Read 2-3 similar files to match the project's style.

---

## Phase 4: Implementation Plan

Present plan before coding:

```markdown
## Feature: [name]

### Files to Create
- [ ] src/[path]/[feature].ts - [purpose]
- [ ] src/[path]/[feature].test.ts - [tests]

### Files to Modify
- [ ] src/[path]/index.ts - [add export]

### Implementation Steps
1. [step]
2. [step]
3. [step]

### Test Cases
- [ ] [test case 1]
- [ ] [test case 2]
- [ ] [edge case]
```

**Wait for approval before coding.**

---

## Phase 5: Test-First Implementation

### 5.1 Write Tests First
```typescript
describe('[Feature]', () => {
  it('should [expected behavior]', () => {
    // Test implementation
  });

  it('should handle [edge case]', () => {
    // Edge case test
  });

  it('should throw when [error condition]', () => {
    // Error handling test
  });
});
```

### 5.2 Run Tests (Confirm They Fail)
```bash
npm test -- [test-file]
```

### 5.3 Implement Feature
Write minimal code to pass tests.

### 5.4 Run Tests (Confirm They Pass)
```bash
npm test -- [test-file]
```

### 5.5 Refactor if Needed
Clean up while keeping tests green.

---

## Phase 6: Integration & Verification

1. Check TypeScript compilation:
   ```bash
   npx tsc --noEmit
   ```

2. Run linting:
   ```bash
   npx eslint [new-files]
   ```

3. Run full test suite:
   ```bash
   npm test
   ```

4. Show summary of changes:
   ```bash
   git diff --stat
   ```

---

## Output Format

After implementation:

```markdown
## Feature Implemented: [name]

### Files Created
- `src/[path]/[file].ts` - [description]
- `src/[path]/[file].test.ts` - [X tests]

### Files Modified
- `src/[path]/[file].ts` - [what changed]

### Test Coverage
- ✅ [test 1]
- ✅ [test 2]
- ✅ [edge case test]

### Usage Example
[code example of how to use the feature]

### Verification
- TypeScript: ✅ No errors
- Lint: ✅ No errors
- Tests: ✅ All passing
```

---

## RULES
- Always read CLAUDE.md first
- Ask questions if requirements unclear
- Match existing code patterns
- Write tests BEFORE implementation
- No implementation without approved plan