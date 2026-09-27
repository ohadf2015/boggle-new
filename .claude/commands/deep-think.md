---
allowed-tools: Read, Grep, Glob, mcp__sequential-thinking__*, mcp__memory__*
argument-hint: [problem/question]
description: Use Sequential Thinking MCP for structured analysis of complex problems
---

# Deep Think - Sequential Thinking Analysis

Use the Sequential Thinking MCP for structured, step-by-step analysis of complex problems, architectural decisions, and challenging debugging scenarios.

## When to Use

- Complex architectural decisions with trade-offs
- Multi-step problem solving
- Root cause analysis that requires hypothesis testing
- Design decisions with multiple valid approaches
- Debugging issues with unclear causes
- Planning complex features or refactors

## Process

1. **Define problem** - Clearly state what needs to be analyzed
2. **Recall context** - Search memory for related decisions and patterns
3. **Sequential analysis** - Use structured thinking to work through the problem
4. **Branch if needed** - Explore alternative approaches when discovered
5. **Synthesize conclusions** - Combine insights into recommendations
6. **Store insights** - Save important findings for future reference

## Sequential Thinking MCP

### Basic Usage
```
mcp__sequential-thinking__sequentialthinking(
  thought="[Your current thinking about the problem]",
  thoughtNumber=1,
  totalThoughts=5,
  nextThoughtNeeded=true
)
```

### Parameters

| Parameter | Type | Description |
|-----------|------|-------------|
| `thought` | string | Current thinking content |
| `thoughtNumber` | number | Current step (1-indexed) |
| `totalThoughts` | number | Estimated total steps (can adjust) |
| `nextThoughtNeeded` | boolean | Whether more thinking is needed |
| `branchFromThought` | number | (Optional) Branch from this thought number |
| `branchId` | string | (Optional) Identifier for this branch |

### Continue Sequence
```
mcp__sequential-thinking__sequentialthinking(
  thought="[Next step in analysis]",
  thoughtNumber=2,
  totalThoughts=5,
  nextThoughtNeeded=true
)
```

### Branch to Alternative
```
mcp__sequential-thinking__sequentialthinking(
  thought="Alternative approach: [description]",
  thoughtNumber=4,
  totalThoughts=6,
  branchFromThought=3,
  branchId="alt-approach",
  nextThoughtNeeded=true
)
```

### Conclude
```
mcp__sequential-thinking__sequentialthinking(
  thought="Conclusion: [final synthesis]",
  thoughtNumber=5,
  totalThoughts=5,
  nextThoughtNeeded=false
)
```

## Analysis Templates

### Problem Solving (5 thoughts)
1. **Problem Definition**: What exactly is the issue? What are the symptoms?
2. **Context Gathering**: What do we know? What constraints exist?
3. **Hypothesis Generation**: What could be causing this? List possibilities.
4. **Evidence Analysis**: What evidence supports/refutes each hypothesis?
5. **Conclusion**: Most likely cause and recommended action.

### Architectural Decision (6 thoughts)
1. **Requirements**: What must the solution accomplish?
2. **Option A Analysis**: First approach - pros, cons, trade-offs
3. **Option B Analysis**: Second approach - pros, cons, trade-offs
4. **Comparison**: Direct comparison on key criteria
5. **Risk Assessment**: What could go wrong with each option?
6. **Recommendation**: Best choice with justification

### Feature Planning (4 thoughts)
1. **Scope Definition**: What's included? What's explicitly excluded?
2. **Technical Approach**: How will it be implemented?
3. **Risk & Dependencies**: What could block or complicate this?
4. **Implementation Plan**: Ordered steps to deliver

### Debugging (5 thoughts)
1. **Symptom Description**: Exact error, when it occurs, reproducibility
2. **Flow Analysis**: What code path leads to this error?
3. **State Investigation**: What state is unexpected?
4. **Root Cause Hypothesis**: Why is the state wrong?
5. **Fix Strategy**: How to correct without side effects

## Example Session

```
# Thought 1
mcp__sequential-thinking__sequentialthinking(
  thought="Problem: Users report slow page load on /game. Symptoms: 3-5s load time, high TTFB. Need to identify bottleneck.",
  thoughtNumber=1,
  totalThoughts=5,
  nextThoughtNeeded=true
)

# Thought 2
mcp__sequential-thinking__sequentialthinking(
  thought="Context: Page makes 3 API calls, renders game board with 16 tiles, uses React Query for data fetching. Server is Node.js with Redis cache.",
  thoughtNumber=2,
  totalThoughts=5,
  nextThoughtNeeded=true
)

# Thought 3
mcp__sequential-thinking__sequentialthinking(
  thought="Hypotheses: 1) Slow API calls (uncached). 2) Heavy client-side rendering. 3) Large bundle size. 4) Database query N+1. Need to check network waterfall and server logs.",
  thoughtNumber=3,
  totalThoughts=5,
  nextThoughtNeeded=true
)

# Thought 4
mcp__sequential-thinking__sequentialthinking(
  thought="Evidence: Network shows /api/game takes 2.5s. Server logs show DB query for each player (N+1). Redis cache miss on game state. Client render is fast (<200ms).",
  thoughtNumber=4,
  totalThoughts=5,
  nextThoughtNeeded=true
)

# Thought 5
mcp__sequential-thinking__sequentialthinking(
  thought="Conclusion: Root cause is N+1 query in game loader + missing Redis cache. Fix: 1) Add JOIN for players in single query. 2) Cache game state with 5min TTL. Expected improvement: 3s → 300ms.",
  thoughtNumber=5,
  totalThoughts=5,
  nextThoughtNeeded=false
)
```

## Memory Integration

### Recall (Step 2)
```
mcp__memory__memory_recall(query="[problem domain] decisions patterns analysis")
```

### Store Insights (Step 6)
For important conclusions:
```
mcp__memory__memory_store(
  content="Deep think: [problem]. Analysis: [key insights]. Conclusion: [decision/recommendation]. Context: [relevant context].",
  type="fact",
  tags=["deep-think", "analysis", "[domain]"],
  importance=7
)
```

For architectural decisions:
```
mcp__memory__memory_store(
  content="Architecture decision: [topic]. Options considered: [options]. Chosen: [choice]. Rationale: [why].",
  type="fact",
  tags=["architecture", "decision", "[area]"],
  importance=8
)
```

## Output Format

```markdown
## Deep Think Analysis: [Topic]

### Problem Statement
[Clear description of what needs to be analyzed]

### Thinking Process

**Thought 1 - [Title]**
[Content]

**Thought 2 - [Title]**
[Content]

...

### Conclusion
[Synthesized recommendation]

### Next Steps
1. [Action 1]
2. [Action 2]
```

## Rules

1. Start with clear problem definition
2. Don't skip steps - each thought builds on previous
3. Use branching when discovering alternative approaches
4. Adjust `totalThoughts` if problem is more/less complex than expected
5. Always conclude with actionable recommendation
6. Store important insights in memory for future reference
