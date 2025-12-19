---
allowed-tools: Read, Write, Bash(npx *)
description: Improve UI - simplify, modernize, align with project design
---

## Phase 1: Understand Project Design System

First, find and read design patterns:
```
@src/styles/*
@src/components/ui/*
@tailwind.config.*
@*.css
```

Identify:
- Color palette and design tokens
- Typography (fonts, sizes, weights)
- Spacing system (padding, margins, gaps)
- Common components (buttons, inputs, cards)
- Animation/transition patterns
- Existing UI patterns in similar components

---

## Phase 2: Analyze Current Component

Read the component and identify issues:

### Complexity Checklist
- [ ] Too many nested divs? (flatten structure)
- [ ] Repeated styles? (extract to classes/components)
- [ ] Inline styles? (move to Tailwind/CSS)
- [ ] Too many props? (simplify API)
- [ ] Mixed responsibilities? (split components)

### UX Issues
- [ ] Visual clutter? (reduce, add whitespace)
- [ ] Poor hierarchy? (size, color, spacing)
- [ ] Inconsistent spacing? (use design system)
- [ ] Too many colors? (limit palette)
- [ ] Hard to scan? (group related items)

### Performance Issues
- [ ] Unnecessary re-renders?
- [ ] Heavy animations?
- [ ] Large component tree?

---

## Phase 3: Design Principles to Apply

### Simplicity
- Remove decorative elements that don't serve function
- One primary action per view
- Hide complexity (progressive disclosure)

### Hierarchy
- Clear visual order: what should user see first?
- Size contrast: important = larger
- Color contrast: actions = accent color
- Whitespace: breathing room between sections

### Consistency
- Same spacing values throughout
- Same border radius
- Same shadow styles
- Match existing project components

### Modern Patterns
- Clean sans-serif typography
- Generous whitespace
- Subtle shadows (avoid hard borders)
- Smooth micro-interactions
- Responsive by default

---

## Phase 4: Improvement Plan

Before any changes, present:

```markdown
## UI Improvement Plan: [Component]

### Current Issues
1. [issue] → [how to fix]
2. [issue] → [how to fix]

### Changes
- Simplify: [what to remove/flatten]
- Align: [what to match with design system]
- Modernize: [specific improvements]

### Preserved
- [functionality to keep]
- [design elements to keep]
```

**Wait for approval.**

---

## Phase 5: Implementation Guidelines

### Structure
```tsx
// ❌ Over-nested
<div><div><div><span>Text</span></div></div></div>

// ✅ Flat
<p>Text</p>
```

### Styling (Tailwind example)
```tsx
// ❌ Cluttered
<div className="mt-2 mb-2 ml-4 mr-4 pt-3 pb-3">

// ✅ Clean
<div className="my-2 mx-4 py-3">

// ❌ Too many colors
<div className="bg-blue-100 border-blue-300 text-blue-700">

// ✅ Use design tokens / consistent palette
<div className="bg-primary/10 border-primary/30 text-primary">
```

### Components
```tsx
// ❌ Monolithic
<div>
  {/* 200 lines of mixed UI */}
</div>

// ✅ Composed
<Card>
  <CardHeader />
  <CardContent />
  <CardFooter />
</Card>
```

### Whitespace
```tsx
// ❌ Cramped
<div className="p-1 gap-1">

// ✅ Breathing room
<div className="p-6 gap-4">
```

---

## Phase 6: Verify Improvements

After implementation:

1. Visual check:
   - Does it look cleaner?
   - Is hierarchy clear?
   - Does it match project style?

2. Functionality check:
   - All features still work?
   - Responsive on mobile?

3. Code check:
   - Simpler structure?
   - Less lines of code?
   - Reusable patterns?

---

## Output Format

```markdown
## UI Improved: [Component]

### Before → After
- Lines of code: [X] → [Y]
- Nesting depth: [X] → [Y]
- Extracted components: [list]

### Changes Made
- ✅ [change 1]
- ✅ [change 2]

### Design Alignment
- Colors: [matched to palette]
- Spacing: [using system values]
- Components: [reused existing]

### Screenshots/Preview
[describe key visual changes]
```

---

## RULES
- Read project design system first
- Simplify without losing functionality
- Match existing patterns exactly
- Less is more - when in doubt, remove
- Whitespace is your friend
- Ask if unsure about design direction