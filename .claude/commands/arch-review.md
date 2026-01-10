---
allowed-tools: Read, Glob, Grep, Bash, mcp__sequential-thinking__*, mcp__memory__*, mcp__github__*
argument-hint: [scope] | --modules | --patterns | --dependencies | --security
description: Comprehensive architecture review with design patterns analysis and improvement recommendations
---

# Architecture Review

Perform comprehensive system architecture analysis and improvement planning: **$ARGUMENTS**

## Current Architecture Context

- Project structure: !find . -name "*.js" -o -name "*.ts" -o -name "*.py" -o -name "*.go" | head -5 && echo "..."
- Package dependencies: ![ -f package.json ] && echo "Node.js project" || [ -f requirements.txt ] && echo "Python project" || [ -f go.mod ] && echo "Go project" || echo "Multiple languages"
- Testing framework: !find . -name "*.test.*" -o -name "*spec.*" | head -3 && echo "..." || echo "No test files found"
- Documentation: !find . -name "README*" -o -name "*.md" | wc -l documentation files

## Task

Execute comprehensive architectural analysis with actionable improvement recommendations:

**Review Scope**: Use $ARGUMENTS to focus on specific modules, design patterns, dependency analysis, or security architecture

**Architecture Analysis Framework**:
1. **System Structure Assessment** - Map component hierarchy, identify architectural patterns, analyze module boundaries, assess layered design
2. **Design Pattern Evaluation** - Identify implemented patterns, assess pattern consistency, detect anti-patterns, evaluate pattern effectiveness
3. **Dependency Architecture** - Analyze coupling levels, detect circular dependencies, evaluate dependency injection, assess architectural boundaries
4. **Data Flow Analysis** - Trace information flow, evaluate state management, assess data persistence strategies, validate transformation patterns
5. **Scalability & Performance** - Analyze scaling capabilities, evaluate caching strategies, assess bottlenecks, review resource management
6. **Security Architecture** - Review trust boundaries, assess authentication patterns, analyze authorization flows, evaluate data protection

**Advanced Analysis**: Component testability, configuration management, error handling patterns, monitoring integration, extensibility assessment.

**Quality Assessment**: Code organization, documentation adequacy, team communication patterns, technical debt evaluation.

**Output**: Detailed architecture assessment with specific improvement recommendations, refactoring strategies, and implementation roadmap.

## Sequential Thinking Integration

Use Sequential Thinking MCP for structured architectural analysis:

### Phase 1: Problem Space Analysis
```
mcp__sequential-thinking__sequentialthinking(
  thought="Architecture scope: $ARGUMENTS. Current structure observed: [observations].",
  thoughtNumber=1,
  totalThoughts=6,
  nextThoughtNeeded=true
)
```

### Structured Analysis Sequence
- **Thought 1**: Current architecture overview and scope definition
- **Thought 2**: Component boundaries and coupling analysis
- **Thought 3**: Design pattern identification and assessment
- **Thought 4**: Pain points and anti-patterns discovered
- **Thought 5**: Improvement hypotheses with trade-offs
- **Thought 6**: Prioritized recommendations and implementation approach

### When to Branch Thinking
Use `branchFromThought` when discovering alternative architectural approaches:
```
mcp__sequential-thinking__sequentialthinking(
  thought="Alternative approach: [description]",
  branchFromThought=3,
  thoughtNumber=4,
  totalThoughts=6,
  nextThoughtNeeded=true
)
```

## Memory Integration

### Recall Past Reviews
```
mcp__memory__memory_recall(query="architecture review [area] patterns decisions")
```

### Store Architectural Decisions
```
mcp__memory__memory_store(
  content="Architecture review: [scope]. Key findings: [findings]. Recommendations: [recs].",
  type="fact",
  tags=["architecture", "review", "[area]"],
  importance=8
)
```

## GitHub Integration

### Create Issues for Improvements
After review, create GitHub issues for tracked improvements:
```
mcp__github__create_issue(
  title="arch: [improvement area]",
  body="## Current State\n[description]\n\n## Proposed Improvement\n[recommendation]\n\n## Impact\n[expected benefits]",
  labels=["architecture", "tech-debt"]
)
```

Implement a structured approach to deliver a thorough architecture review tailored to the project's needs and verify improvements align with best practices, verify build is passing, and run tests to ensure no regressions.