# LexiClash Spacing System

This document defines the standardized spacing system for LexiClash. The system uses a **hybrid approach**: Tailwind utilities for gaps/margins, and container queries for component internal padding.

## Philosophy

- **Gaps** scale linearly and predictably using Tailwind's spacing scale
- **Padding** scales fluidly based on container size using CSS container queries
- **Semantic naming** makes spacing decisions clearer (`gap-tight` vs `gap-2`)

## Gaps (Tailwind - for margins and gaps between elements)

Use these semantic utilities for flex/grid gaps and margins:

| Utility | Value | Use Case | Example |
|---------|-------|----------|---------|
| `gap-tight` | 0.5rem (8px) | Compact layouts, tight spacing | Button groups, inline badges |
| `gap-normal` | 0.75rem (12px) | Standard spacing | Form fields, card content |
| `gap-relaxed` | 1rem (16px) | Generous spacing | Section spacing, page layouts |

### When to Use Gaps

- **Flex/Grid gaps**: `flex gap-tight` or `grid gap-normal`
- **Margins between elements**: `mb-gap-tight` or `mt-gap-relaxed`
- **Button groups**: `gap-tight` for compact, `gap-normal` for standard

### Examples

```tsx
// Compact button group
<div className="flex gap-tight">
  <Button>Cancel</Button>
  <Button>Confirm</Button>
</div>

// Standard form layout
<div className="flex flex-col gap-normal">
  <FormField label="Name" />
  <FormField label="Email" />
</div>

// Page section spacing
<div className="space-y-gap-relaxed">
  <Section />
  <Section />
</div>
```

## Padding (Container Queries - for component internal padding)

Use these container query utilities for component padding that scales with container width:

| Utility | Min → Max | Use Case | Example |
|---------|-----------|----------|---------|
| `cq-p-tight` | 0.5rem → 1rem | Compact cards/modals | Notification cards, small badges |
| `cq-p-responsive` | 0.75rem → 2rem | **Default padding** | Dialog, Card, most components |
| `cq-p-responsive-lg` | 1rem → 2.5rem | Large components | Hero sections, feature cards |
| `cq-p-generous` | 1.5rem → 3rem | Page wrappers | Main content areas, page containers |

### Directional Padding

| Utility | Min → Max | Use Case |
|---------|-----------|----------|
| `cq-px-responsive` | 0.75rem → 2rem | Horizontal padding only |
| `cq-py-responsive` | 0.75rem → 2rem | Vertical padding only |

### When to Use Container Query Padding

- **Component internal padding**: Cards, Dialogs, Modals
- **Responsive scaling**: Elements that should grow/shrink with container
- **Nested components**: Padding that adapts to parent container size

### Examples

```tsx
// Dialog with default responsive padding
<DialogBody className="cq-p-responsive">
  <p>Content scales with dialog size</p>
</DialogBody>

// Compact notification card
<Card className="cq-p-tight">
  <p>Tight padding for small cards</p>
</Card>

// Hero section with generous padding
<div className="cq-p-generous">
  <h1>Welcome to LexiClash</h1>
</div>

// Horizontal-only responsive padding
<div className="cq-px-responsive py-4">
  <p>Scales horizontally, fixed vertical</p>
</div>
```

## Exceptions (When NOT to Use This System)

### 1. Buttons and Badges
**Use fixed Tailwind padding** - buttons/badges should NOT scale with container:

```tsx
// ✅ Correct - fixed padding
<Button className="px-5 py-3">Click Me</Button>

// ❌ Incorrect - don't use container queries
<Button className="cq-p-responsive">Click Me</Button>
```

### 2. Page-Level Layouts
**Use viewport breakpoints** for full-page layouts:

```tsx
// ✅ Correct - viewport-based padding
<main className="p-4 lg:p-8 xl:p-12">
  {children}
</main>

// ❌ Incorrect - container queries not ideal for page wrapper
<main className="cq-p-generous">
  {children}
</main>
```

### 3. Performance-Critical Components
Avoid container queries for:
- Real-time game boards
- High-frequency animations
- Performance-sensitive lists

Use fixed Tailwind values instead.

## Migration Guide

### Replacing Old Patterns

| Old Pattern | New Pattern | Reason |
|-------------|-------------|--------|
| `gap-2` | `gap-tight` | Semantic naming |
| `gap-3` | `gap-normal` | Semantic naming |
| `gap-4` | `gap-relaxed` | Semantic naming |
| `p-4 sm:p-6 lg:p-8` | `cq-p-responsive` | Simpler, auto-scaling |
| `px-4 py-3` (in cards) | `cq-p-tight` | Responsive padding |

### Decision Tree

```
Is it spacing BETWEEN elements (gap/margin)?
  YES → Use Tailwind gap utilities (gap-tight/normal/relaxed)
  NO → Continue...

Is it padding INSIDE a component?
  YES → Is it a button/badge?
    YES → Use fixed Tailwind padding (px-5 py-3)
    NO → Use container query padding (cq-p-responsive)
  NO → Continue...

Is it a page-level layout?
  YES → Use viewport breakpoints (p-4 lg:p-8)
  NO → Revisit above questions
```

## Browser Support

Container queries are supported in all modern browsers (97%+ as of 2025):
- Chrome/Edge 105+
- Safari 16+
- Firefox 110+

## Additional Resources

- [Tailwind Spacing Scale](https://tailwindcss.com/docs/customizing-spacing)
- [CSS Container Queries](https://developer.mozilla.org/en-US/docs/Web/CSS/CSS_Container_Queries)
- [Container Query Units](https://developer.mozilla.org/en-US/docs/Web/CSS/length#container_query_length_units)

---

**Last Updated**: 2026-01-11
**Maintained By**: Engineering Team
