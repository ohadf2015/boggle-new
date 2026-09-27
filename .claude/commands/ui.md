---
allowed-tools: Read, Write, Edit, Bash(npx *), Grep, mcp__memory__*
description: Improve UI - simplify, modernize, align with project design
---

## Process

1. **Recall UI patterns** - Search memory for related UI improvements and design decisions
2. **Understand design system** - Read @src/styles, @tailwind.config, existing components
3. **Analyze component** - Check nesting depth, repeated styles, visual hierarchy, spacing
4. **Plan improvements** - Simplify structure, match design tokens, modernize patterns
5. **Wait for approval** - Present plan before making changes
6. **Implement** - Flatten structure, use Tailwind consistently, extract components
7. **Verify** - Visual check (looks cleaner, hierarchy clear), functionality, responsive
8. **Store decision** - Record UI improvement pattern for future reference

## Design Principles
- Simplicity: Remove decorative elements, one primary action
- Hierarchy: Clear visual order, size/color contrast, whitespace
- Consistency: Same spacing, border radius, shadows, match existing components
- Modern: Clean typography, generous whitespace, subtle shadows, responsive

## Code Examples

```tsx
// ❌ Over-nested → ✅ Flat
<div><div><div><span>Text</span></div></div></div>
<p>Text</p>

// ❌ Cluttered → ✅ Clean
<div className="mt-2 mb-2 ml-4 mr-4">
<div className="my-2 mx-4">

// ❌ Cramped → ✅ Breathing room
<div className="p-1 gap-1">
<div className="p-6 gap-4">
```

## Key Rules
- Read design system first
- Simplify without losing functionality
- Match existing patterns exactly
- Less is more - remove when unsure
- Whitespace is friend
- Ask if unsure about design direction

## Memory Integration

### Recall (Step 1)
```
mcp__memory__memory_recall(query="UI improvement [component-type] design pattern")
```

### Store (Step 8)
```
mcp__memory__memory_store(
  content="UI improvement: [component] - [before] → [after]. Pattern: [pattern applied]. Key change: [main improvement].",
  type="fact",
  tags=["ui", "improvement", "[component-type]"],
  importance=5
)
```