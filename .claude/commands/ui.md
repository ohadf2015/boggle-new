---
allowed-tools: Read, Write, Edit, Bash(npx *), Grep
description: Improve UI - simplify, modernize, align with project design
---

## Process

1. **Understand design system** - Read @src/styles, @tailwind.config, existing components
2. **Analyze component** - Check nesting depth, repeated styles, visual hierarchy, spacing
3. **Plan improvements** - Simplify structure, match design tokens, modernize patterns
4. **Wait for approval** - Present plan before making changes
5. **Implement** - Flatten structure, use Tailwind consistently, extract components
6. **Verify** - Visual check (looks cleaner, hierarchy clear), functionality, responsive

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