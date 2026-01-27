# Bug Fix Workflow

## Description
Fix errors systematically - reproduce, test, fix root cause (not symptoms), verify.

## Tools Needed
- `file_read`, `file_edit`
- `bash` (npm, git)
- `grep_content`, `grep_file`, `glob`
- `spawn_subagent` (file-navigator, verifier)

## Project Context
- `AGENTS.md` - Architecture and patterns
- `fe-next/CLAUDE.md` - Code standards

## Process

### 1. Parse Error Information

**Extract from error logs:**
- File paths and line numbers
- Error types (syntax, import, type, runtime)
- Stack traces
- Error messages

**Categorize errors by priority:**
1. **Syntax errors** - Prevent compilation
2. **Import errors** - Missing/wrong dependencies
3. **Type errors** - TypeScript violations
4. **Runtime errors** - Execution failures
5. **Warnings** - Non-blocking issues

### 2. Reproduce the Bug

**Create a minimal reproduction:**
```bash
# Run the specific scenario that fails
npm run dev
# OR
npm run test -- [specific-test]
```

**Document:**
- Steps to reproduce
- Expected behavior
- Actual behavior
- Environment (dev/prod, browser, etc.)

### 3. Write a Failing Test

**Create test that reproduces the bug:**
```typescript
// __tests__/BugFix.test.tsx
describe('Bug: [description]', () => {
  it('should [expected behavior] but currently [actual behavior]', () => {
    // Test code that currently FAILS
    expect(buggyFunction()).toBe(expectedResult);
  });
});
```

**Run test to confirm it fails:**
```bash
npm run test -- __tests__/BugFix.test.tsx
```

**Expected output:** ❌ Test fails (this is correct - it proves the bug exists)

### 4. Investigate Root Cause

**Use file-navigator to understand context:**
```
spawn_subagent(
  subagent_type="file-navigator",
  description="Find related code for bug",
  instructions="Search for [function/component name] and related files.
  Find where [error occurs].
  Identify dependencies and data flow."
)
```

**Read surrounding code:**
```
file_read([buggy-file])
grep_content(regex="[related-function]")
```

**Trace execution flow:**
1. Where does the error occur?
2. What function called it?
3. What data was passed?
4. What assumptions were made?
5. What changed recently? (`git log --oneline -10 -- [file]`)

**Check git history:**
```bash
git log --oneline -10 -- [file]
git blame [file]
```

### 5. Identify Root Cause

**Ask critical questions:**
- Is this a symptom or the actual problem?
- What underlying assumption is wrong?
- Is this handling edge cases correctly?
- Are there race conditions or timing issues?
- Is error handling adequate?

**Common root causes:**
- Missing null/undefined checks
- Incorrect type assumptions
- Async/await issues
- State management problems
- Missing error boundaries
- Translation key typos
- Wrong event handler bindings

### 6. Apply Minimal Fix

**Fix principles:**
- Address root cause, NOT symptoms
- Minimal changes required
- No `any` types or `@ts-ignore` (unless critical emergency)
- No unrelated refactoring
- Match existing code style

**Example fixes:**

```typescript
// ❌ BAD: Masking the symptom
try {
  buggyCode();
} catch (e) {
  console.log('ignoring error'); // NO!
}

// ✅ GOOD: Fixing root cause
if (data && data.value !== undefined) {
  processData(data.value);
} else {
  handleMissingData();
}
```

**Apply the fix:**
```
file_edit(
  file_path="[buggy-file]",
  old_string="[buggy code]",
  new_string="[fixed code]"
)
```

### 7. Verify Test Now Passes

**Run the test again (WITHOUT modifying it):**
```bash
npm run test -- __tests__/BugFix.test.tsx
```

**Expected output:** ✅ Test passes

**If test still fails:**
- The fix is incorrect or incomplete
- Fix the code again (NOT the test)
- The test is the source of truth

### 8. Run Full Verification Suite

**Ensure no regressions:**
```bash
cd fe-next

# Linting
npm run lint

# Type checking
npx tsc --noEmit

# All tests (to catch regressions)
npm run test

# Build
npm run build
```

**Fix any issues that arise.**

### 9. Verify in Running Application

**Test the actual bug scenario:**
```bash
npm run dev
# Navigate to the bug scenario
# Verify it's fixed
```

**For E2E bugs:**
```bash
npm run test:e2e -- --grep="[scenario]"
```

### 10. Use Verifier Subagent

**Final verification:**
```
spawn_subagent(
  subagent_type="verifier",
  description="Verify bug fix",
  instructions="Run checks on modified files:
  Files changed: [list files]
  Run: npm run lint, npx tsc --noEmit, npm run test
  Scope: codediff
  Budget: 30s"
)
```

## Key Rules

### Fix Root Cause, Not Symptoms
```typescript
// ❌ WRONG: Hiding the problem
const value = data?.value || 0;  // What if value should be null?

// ✅ RIGHT: Handling the actual issue
if (!data || data.value === undefined) {
  throw new Error('Data is required');
}
const value = data.value;
```

### No Quick Hacks
- No `any` types to bypass TypeScript errors
- No `@ts-ignore` unless absolutely critical
- No empty catch blocks
- No disabling ESLint rules
- No commenting out problematic code

### Match Existing Patterns
- Follow project code style
- Use existing utilities
- Respect file organization
- Maintain consistency

### Test-First Verification
```
1. Write test that fails  → Proves bug exists
2. Fix the code           → Implement solution
3. Test passes            → Proves bug is fixed
4. All tests pass         → No regressions
```

### Never Modify the Test
- Tests define expected behavior
- If test fails after fix, fix is wrong
- Only modify test if requirements changed

## Common Bug Types

### Type Errors
```typescript
// Error: Property 'x' does not exist on type 'Y'
// Fix: Add proper type definition or null check

// ❌ WRONG
const value = (data as any).x;

// ✅ RIGHT
interface DataType {
  x: string;
}
const value = (data as DataType).x;
// OR
if ('x' in data) {
  const value = data.x;
}
```

### Translation Errors
```typescript
// Error: Translation key missing
// Fix: Add key to all 4 language files

// Check what's missing:
npm run check:translations

// Add to en.js, he.js, sv.js, ja.js:
export default {
  section: {
    key: 'Translation text'
  }
}
```

### Runtime Errors
```typescript
// Error: Cannot read property of undefined
// Fix: Add guards

// ❌ WRONG
const name = user.profile.name;

// ✅ RIGHT
const name = user?.profile?.name ?? 'Unknown';
// OR
if (!user || !user.profile) {
  handleMissingUser();
  return;
}
const name = user.profile.name;
```

### Async Errors
```typescript
// Error: Race condition or timing issue
// Fix: Proper async handling

// ❌ WRONG
function loadData() {
  fetchData();  // Not awaited
  return data;  // Undefined!
}

// ✅ RIGHT
async function loadData() {
  const data = await fetchData();
  return data;
}
```

### Event Handler Errors
```typescript
// Error: Handler not binding correctly
// Fix: Use arrow functions or bind

// ❌ WRONG
<button onClick={this.handleClick}>

// ✅ RIGHT (functional components)
const handleClick = () => { /* ... */ };
<button onClick={handleClick}>
```

## Output Format

```
🐛 Bug: [Brief description]

📍 Location: [file:line]
🔍 Root Cause: [Explanation]
✅ Fix Applied: [What was changed]

🧪 Test Status:
  - Written: [test-file]
  - Before fix: ❌ Failed (as expected)
  - After fix: ✅ Passed

✓ Verification:
  - Linting: Passed
  - Type check: Passed
  - All tests: Passed
  - Build: Passed
```

## Debugging Techniques

### Add Strategic Logging
```typescript
console.log('DEBUG: Value at this point:', value);
console.log('DEBUG: Function called with:', { arg1, arg2 });
```

### Check Component State
```typescript
// In React components
useEffect(() => {
  console.log('State changed:', { state1, state2 });
}, [state1, state2]);
```

### Verify API Responses
```typescript
const response = await fetch('/api/endpoint');
console.log('API response:', await response.json());
```

### Check Event Flow
```typescript
function handleEvent(e) {
  console.log('Event triggered:', e.type, e.target);
  // Handler logic
}
```

### Isolate the Problem
```typescript
// Comment out code sections to isolate issue
// Binary search: remove half, see if error persists
// Narrow down to exact line causing problem
```

## Investigation Checklist

- [ ] Error message understood
- [ ] Can reproduce reliably
- [ ] Failing test written
- [ ] Root cause identified (not just symptom)
- [ ] Related code examined
- [ ] Git history checked for recent changes
- [ ] Edge cases considered
- [ ] Fix addresses root cause
- [ ] Test passes without modification
- [ ] No regressions introduced
- [ ] All quality checks pass

## Example Complete Workflow

```bash
# 1. Reproduce bug
npm run dev  # See error occur

# 2. Write failing test
# Create __tests__/FixBug.test.tsx
npm run test -- FixBug.test.tsx  # ❌ Fails

# 3. Investigate
grep_content(regex="problematic-function")
file_read(buggy-file.ts)
git log --oneline -5 -- buggy-file.ts

# 4. Identify root cause
# Missing null check in processData()

# 5. Apply fix
file_edit(
  file_path="buggy-file.ts",
  old_string="const result = data.value;",
  new_string="const result = data?.value ?? defaultValue;"
)

# 6. Verify test passes
npm run test -- FixBug.test.tsx  # ✅ Passes

# 7. Run full checks
npm run lint
npx tsc --noEmit
npm run test
npm run build

# 8. Verify in app
npm run dev  # Bug should be fixed

# 9. Done!
```

## When to Seek Help

**Investigate deeply first, but ask for help if:**
- Can't reproduce the bug consistently
- Root cause is in unfamiliar code area
- Multiple interdependent issues
- Potential architectural problem
- Security implications
- Database/infrastructure issue

**Use investigate command for deep analysis:**
- `.verdent/commands/investigate.md`
- `.verdent/agents/ultrathink-debugger.md`

## Success Criteria

- [ ] Bug reproduced reliably
- [ ] Failing test written before fix
- [ ] Root cause identified and documented
- [ ] Fix applied addressing root cause (not symptom)
- [ ] Test now passes without modification
- [ ] No regressions (all tests pass)
- [ ] Linting passes
- [ ] Type checking passes
- [ ] Build succeeds
- [ ] Bug verified fixed in running application

---

**Remember**: Fix the disease, not the symptoms. A proper fix should make the bug impossible to occur again.
