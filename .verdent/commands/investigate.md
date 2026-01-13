# Investigation Workflow

## Description
Deep investigation to find root cause - NO fixes until fully understood. This is for complex bugs, mysterious behavior, or architectural issues that require systematic analysis.

## Tools Needed
- `file_read`, `grep_content`, `grep_file`, `glob`
- `bash` (git commands)
- `spawn_subagent` (file-navigator for exploration)

## Project Context
- `AGENTS.md` - Architecture overview
- `fe-next/claude.md` - System design

## CRITICAL RULES

### 1. NO CODE CHANGES
- Investigation phase ONLY
- No fixes, no patches, no workarounds
- Only reading and analysis
- Report findings and WAIT for approval

### 2. NO ASSUMPTIONS
- Verify everything
- Trust evidence over theory
- Follow the data
- Challenge existing beliefs

### 3. SYSTEMATIC APPROACH
- Map full execution flow
- Document every finding
- Build evidence-based hypothesis
- Test hypothesis before concluding

### 4. WAIT FOR CONFIRMATION
- Present investigation report
- Get user approval before any fixes
- Discuss recommended solution
- Only then proceed to implementation

## Process

### 1. Define the Problem

**Document symptoms:**
- What is the observed behavior?
- What is the expected behavior?
- When does it occur? (always, sometimes, specific conditions)
- What error messages appear?
- What was the last known working state?

**Gather context:**
```bash
# Recent changes that might correlate
git log --oneline -20

# Check if problem is in specific files
git log --oneline -10 -- [suspect-file]

# See what changed in last commit
git show HEAD
```

### 2. Map Execution Flow

**Identify entry point:**
- Where does the problematic flow start?
- User action? API call? Background job?

**Trace the path:**
```
Entry → Service → Module → Function → Problem
```

**Use file-navigator to explore:**
```
spawn_subagent(
  subagent_type="file-navigator",
  description="Map execution flow for [issue]",
  instructions="Find all files involved in [problematic flow].
  Starting from [entry point] (e.g., API route, component event handler).
  Trace through service calls, module functions, utilities.
  Return execution path with file locations."
)
```

**Document the flow:**
```
1. User clicks button in [Component]
   → fe-next/components/game/GameBoard.tsx:handleSubmit()
   
2. Socket event emitted
   → fe-next/hooks/useSocket.ts:emit('submitWord')
   
3. Backend handler receives event
   → fe-next/backend/handlers/wordHandler.ts:handleWordSubmit()
   
4. Validation occurs
   → fe-next/backend/modules/wordValidator.ts:validateWord()
   
5. ⚠️ PROBLEM OCCURS HERE ⚠️
   → Expected: Return validation result
   → Actual: Throws undefined error
```

### 3. Analyze Each Step Deeply

**For each function in the flow:**

**Read the code:**
```
file_read([file-path])
```

**Check inputs:**
- What data is expected?
- What data is actually received?
- Are types correct?
- Are nulls/undefined handled?

**Check outputs:**
- What should be returned?
- What is actually returned?
- Are errors properly thrown/caught?

**Check state:**
- What global/context state is used?
- Could state be stale or incorrect?
- Are there race conditions?

**Check dependencies:**
```
grep_content(regex="import.*[dependency]", glob="**/*.ts")
```

### 4. Examine Data Flow

**Track data transformation:**
```
Input data:  { word: "test", length: 4 }
  ↓ (passes through validation)
Processing:  validateLength(word)
  ↓ (called with)
Check:       word.length === expectedLength
  ↓ (but word might be)
PROBLEM:     undefined (if data shape changed)
```

**Check for data mutations:**
```typescript
// Is data being modified unexpectedly?
function processData(data) {
  data.field = newValue;  // ⚠️ Mutation
  return data;
}
```

**Verify API responses:**
```bash
# Check what API actually returns
curl http://localhost:3000/api/endpoint
```

### 5. Investigate Timing & State

**Check for race conditions:**
```typescript
// Example race condition
async function loadAndProcess() {
  loadData();  // ⚠️ Not awaited
  processData(data);  // ⚠️ Data might not be loaded
}
```

**Check state updates:**
```typescript
// React state might be stale
const [count, setCount] = useState(0);

function increment() {
  setCount(count + 1);  // ⚠️ Uses stale count
  setCount(count + 1);  // ⚠️ Both read same value
}

// Should be:
setCount(prev => prev + 1);
```

**Check async handling:**
```
grep_content(regex="async.*await", glob="[suspect-file]")
```

### 6. Check Configuration & Environment

**Environment variables:**
```bash
# Are required env vars set?
cat .env.example
cat .env  # If accessible
```

**Configuration files:**
```
file_read(fe-next/next.config.js)
file_read(fe-next/tsconfig.json)
```

**Dependencies:**
```bash
# Check if dependencies are correct
npm ls [package-name]

# Check for version conflicts
npm ls
```

### 7. Examine Recent Changes

**Git blame on problematic lines:**
```bash
git blame [file] | grep -A 5 -B 5 [line-number]
```

**Recent commits affecting area:**
```bash
git log --oneline --all --graph -- [directory/]
```

**Compare with last working version:**
```bash
# If bug started in commit ABC123
git show ABC123:[file]
git diff ABC123 HEAD -- [file]
```

### 8. Look for Patterns

**Is this happening elsewhere?**
```
grep_content(regex="[problematic-pattern]")
```

**Similar issues in git history:**
```bash
git log --all --grep="[error-keyword]"
```

**Related bug fixes:**
```
grep_content(regex="fix.*[related-issue]", glob="**/*.md")
```

### 9. Form Hypothesis

**Based on evidence, hypothesize:**

**WHAT is broken:**
- Specific function/line causing issue
- Exact nature of the problem

**WHERE does it break:**
- File, function, line number
- Under what conditions

**WHY does it break:**
- Root cause explanation
- What assumption is violated
- What changed to cause this

**PROOF:**
- Evidence supporting hypothesis
- Steps that demonstrate the problem
- Data/logs confirming analysis

### 10. Create Investigation Report

**Template:**

```markdown
## Investigation Report: [Issue Title]

### Problem Summary
[Brief description of the issue]

### Symptoms
- [Observable behavior 1]
- [Observable behavior 2]
- [Error messages if any]

### Execution Flow
1. [Entry point] → [file:function]
2. [Next step] → [file:function]
3. ⚠️ [Problem occurs] → [file:function:line]

### Root Cause Analysis

**Location:** `[file]:[line]`

**What's Wrong:**
[Detailed explanation of the problem]

**Why It's Wrong:**
[Explanation of violated assumption or incorrect logic]

**Evidence:**
- [Finding 1: e.g., "Variable is undefined at this point"]
- [Finding 2: e.g., "Function called before data loaded"]
- [Finding 3: e.g., "Type mismatch between expected and actual"]

**Git History:**
- Last working commit: [hash]
- Breaking change in: [hash]
- Changed by: [commit message]

### Hypothesis
[Your theory about why this is happening]

### Recommended Fix
**DESCRIPTION ONLY - NO CODE:**
[Explain what needs to be changed and why]

**Approach:**
1. [Step 1 of fix]
2. [Step 2 of fix]
3. [Verification step]

**Potential Side Effects:**
[Any concerns or related areas that might be affected]

### Next Steps
- [ ] Get confirmation of root cause analysis
- [ ] Discuss fix approach
- [ ] Implement fix (in separate workflow)
- [ ] Add tests to prevent regression
```

### 11. STOP AND WAIT

**Present the report to the user.**

**DO NOT:**
- Implement any fixes
- Make any code changes
- Apply any patches

**DO:**
- Wait for user confirmation
- Discuss findings
- Answer questions
- Refine hypothesis if needed

## Investigation Techniques

### Binary Search Isolation
```
1. Comment out half the code
2. Does error still occur?
3. If yes, problem is in the other half
4. If no, problem is in commented half
5. Repeat until isolated to single line
```

### Strategic Logging
```typescript
// Add logging at key points
console.log('[INVESTIGATION] Entry point:', { input });
console.log('[INVESTIGATION] After validation:', { result });
console.log('[INVESTIGATION] Before problem:', { state });
```

### Data Inspection
```typescript
// Log full object shapes
console.log('[INVESTIGATION] Full object:', JSON.stringify(obj, null, 2));

// Log types
console.log('[INVESTIGATION] Type:', typeof value, Array.isArray(value));

// Log call stack
console.trace('[INVESTIGATION] Call stack at this point:');
```

### Network Analysis
```bash
# Check API calls in browser DevTools → Network tab
# Or use curl to test endpoints directly
curl -X POST http://localhost:3000/api/test \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

### Database State
```bash
# If using Supabase, check data directly
# Or use database client to inspect state
```

## Complex Scenarios

### Intermittent Failures
- Document when it fails vs when it succeeds
- Look for timing dependencies
- Check for external factors (network, API limits)
- Test under different loads
- Check for memory leaks or resource exhaustion

### Multi-System Issues
- Map dependencies between systems
- Check each integration point
- Verify data contracts between services
- Test each system in isolation

### Performance Problems
- Profile with browser DevTools
- Check bundle sizes: `npm run build:analyze`
- Look for memory leaks
- Identify slow queries or API calls
- Check for unnecessary re-renders

### Security Issues
- Never expose sensitive data in logs
- Check for injection vulnerabilities
- Verify authentication/authorization
- Review error messages for information leakage

## When to Use This Workflow

**Use investigation when:**
- Bug is complex or mysterious
- Multiple possible causes
- Unclear where problem originates
- Architectural concerns
- Security implications
- Performance issues
- Integration problems
- Intermittent/hard-to-reproduce bugs

**Skip investigation for:**
- Simple, obvious bugs (use `fix.md`)
- Typos or clear syntax errors
- Well-understood issues

## Integration with Other Workflows

**After investigation:**
1. Present report to user
2. Get confirmation of root cause
3. Switch to `fix.md` workflow for implementation
4. Reference investigation findings in fix

**If investigation reveals architectural issues:**
1. Consult `.verdent/agents/next-js-architect.md`
2. Consider refactoring approach
3. Discuss with user before major changes

**If investigation is inconclusive:**
1. Document what you know
2. Document what you don't know
3. Ask user for:
   - More context
   - Access to logs/tools
   - Specific scenarios to test

## Success Criteria

- [ ] Problem symptoms documented
- [ ] Execution flow mapped completely
- [ ] Each step analyzed for issues
- [ ] Data flow tracked
- [ ] Root cause identified with evidence
- [ ] Git history examined
- [ ] Hypothesis formed and tested
- [ ] Investigation report created
- [ ] Recommended fix described (NO code)
- [ ] User approval awaited before any changes

## Output Example

```
🔍 Investigation: Socket Disconnection in Multiplayer Games

📋 Symptoms:
  - Players randomly disconnected mid-game
  - No error messages in console
  - Happens more often with 5+ players
  - Started after commit abc123

🗺️ Execution Flow:
  1. Client → useSocket.ts → socket.emit('gameAction')
  2. Server → socketHandlers.ts → receives event
  3. Server → gameStateManager.ts → updates state
  4. Server → socket.to(room).emit('stateUpdate')
  5. ⚠️ PROBLEM: Some clients don't receive update

🎯 Root Cause:
  Location: backend/handlers/connectionHandler.ts:45
  Issue: Room join happens async, but state updates sent immediately
  Why: Race condition between join and first state update
  
📊 Evidence:
  - Logs show state update emitted before join confirmed
  - More players = higher chance of race condition
  - Commit abc123 changed join to async without await
  
💡 Hypothesis:
  async/await missing in handleJoinRoom()
  State update fires before socket fully joined room
  socket.to(room) doesn't include newly joined socket
  
🔧 Recommended Fix:
  Add await to socket.join(room) in handleJoinRoom()
  Ensure join completes before emitting state updates
  Add test for rapid join + state update sequence

⏸️  Awaiting confirmation before implementing fix...
```

---

**Remember**: Investigation is about understanding, not fixing. Thorough investigation leads to correct fixes. Rushed fixes lead to more bugs.
