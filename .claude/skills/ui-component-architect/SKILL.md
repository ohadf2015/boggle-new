---
name: ui-component-architect
description: UI implementation specialist for decomposing designs into reusable components. This skill should be used when implementing new UI features, screens, or components. It ensures maximum reuse of existing components, handles all UI states (loading, error, empty, no-data), and creates pixel-perfect implementations following the project's design system. Use when building new UI, refactoring existing UI, or ensuring consistent component usage across the app.
allowed-tools: Read, Write, Edit, Grep, Glob, Bash(npm *), Bash(playwriter *), Bash(npx playwriter*), mcp__memory__*
---

# UI Component Architect

Specialist skill for implementing UI with maximum component reuse, comprehensive state handling, and pixel-perfect design adherence.

## Memory Integration

### Before Starting
Recall existing component patterns and past UI decisions:
```
mcp__memory__memory_recall(query="UI component [component-type] pattern reuse")
```

### After Completing
Store new component patterns for future reuse:
```
mcp__memory__memory_store(
  content="UI pattern: [component-name] - [description]. Location: [path]. Props: [key-props]. Reuse for: [use-cases].",
  type="fact",
  tags=["ui", "component", "[component-type]"],
  importance=6
)
```

## Core Principles

1. **Reuse over recreation** - Always search for existing components before creating new ones
2. **State completeness** - Every UI must handle all possible states
3. **Pixel-perfect execution** - Match designs exactly, no approximations
4. **Atomic decomposition** - Break complex UI into smallest reusable pieces
5. **Consistency enforcement** - Use established patterns throughout the codebase

## Implementation Workflow

### Phase 1: Codebase Discovery

Before writing any code, thoroughly explore the existing codebase.

#### 1.1 Identify Component Library

Search for the UI library/framework in use:

```bash
# Check package.json for UI dependencies
grep -E "(shadcn|radix|chakra|material|antd|mantine|headless)" package.json

# Find component directories
find . -type d -name "components" -o -name "ui" -o -name "common" | head -20

# Look for component index/barrel files
find . -name "index.ts" -path "*/components/*" | head -20
```

#### 1.2 Catalog Existing Components

Create a mental inventory by searching for:

**Basic UI Elements:**
```bash
# Buttons, inputs, form elements
grep -rl "Button\|Input\|Select\|Checkbox\|Radio\|Switch\|Textarea" --include="*.tsx" --include="*.jsx" src/ | head -30

# Cards, containers, layouts
grep -rl "Card\|Container\|Box\|Stack\|Grid\|Flex" --include="*.tsx" --include="*.jsx" src/ | head -30

# Modals, dialogs, sheets
grep -rl "Modal\|Dialog\|Sheet\|Drawer\|Popover\|Tooltip" --include="*.tsx" --include="*.jsx" src/ | head -30
```

**State Components (Critical):**
```bash
# Loading states
grep -rl "Loading\|Spinner\|Skeleton\|Shimmer\|Loader" --include="*.tsx" --include="*.jsx" src/

# Empty/no-data states
grep -rl "Empty\|NoData\|NoResults\|Placeholder" --include="*.tsx" --include="*.jsx" src/

# Error states
grep -rl "Error\|ErrorBoundary\|ErrorMessage\|ErrorState" --include="*.tsx" --include="*.jsx" src/

# Fallback states
grep -rl "Fallback\|NotFound\|Offline" --include="*.tsx" --include="*.jsx" src/
```

#### 1.3 Identify Design Tokens

Search for design system constants:

```bash
# Colors, spacing, typography
grep -rl "colors\|spacing\|fontSize\|fontWeight" --include="*.ts" --include="*.js" --include="*.css" src/ | head -20

# Tailwind config if used
cat tailwind.config.* 2>/dev/null | head -100

# CSS variables
grep -r "--" --include="*.css" src/ | head -30
```

### Phase 2: UI Decomposition

Break down the target UI into atomic components.

#### 2.1 Component Hierarchy Analysis

For any UI requirement, decompose into:

1. **Layout Components** - Page structure, grids, containers
2. **Composite Components** - Cards, forms, lists, tables
3. **Atomic Components** - Buttons, inputs, icons, badges
4. **State Wrappers** - Loading, error, empty state handlers

#### 2.2 Reuse Decision Matrix

For each identified component, determine:

| Component Need | Action |
|----------------|--------|
| Exact match exists | Import and use directly |
| Similar exists, minor diff | Extend via props/variants |
| Pattern exists, new content | Create using same structure |
| Nothing similar | Create new, following conventions |

### Phase 3: State Handling

Every UI component must handle these states:

#### 3.1 Required States Checklist

- [ ] **Loading** - Initial data fetch, action in progress
- [ ] **Success** - Normal display with data
- [ ] **Empty** - No data available (but successful fetch)
- [ ] **Error** - Fetch/action failed
- [ ] **Partial** - Some data, some errors
- [ ] **Offline** - No network (if applicable)
- [ ] **Disabled** - User cannot interact
- [ ] **Skeleton** - Content placeholder during load

#### 3.2 State Component Patterns

Search for and reuse existing state patterns:

```tsx
// Pattern: Wrapper component with state handling
<DataDisplay
  isLoading={isLoading}
  error={error}
  data={data}
  loadingComponent={<LoadingSkeleton />}
  errorComponent={<ErrorMessage error={error} />}
  emptyComponent={<EmptyState message="No items found" />}
>
  {(data) => <ActualContent data={data} />}
</DataDisplay>

// Pattern: Conditional rendering with consistent components
{isLoading && <LoadingSpinner />}
{error && <ErrorBanner error={error} />}
{!isLoading && !error && data.length === 0 && <EmptyState />}
{!isLoading && !error && data.length > 0 && <Content data={data} />}
```

#### 3.3 Create Missing State Components

If state components don't exist, create reusable ones:

```tsx
// Loading skeleton - generic and configurable
interface SkeletonProps {
  variant: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
  count?: number;
}

// Empty state - reusable across app
interface EmptyStateProps {
  icon?: React.ReactNode;
  title: string;
  description?: string;
  action?: {
    label: string;
    onClick: () => void;
  };
}

// Error state - consistent error display
interface ErrorStateProps {
  error: Error | string;
  retry?: () => void;
  variant?: 'inline' | 'fullPage' | 'toast';
}
```

### Phase 4: Pixel-Perfect Implementation

#### 4.1 Design Fidelity Checklist

- [ ] **Spacing** - Exact margins, padding, gaps
- [ ] **Typography** - Font size, weight, line-height, letter-spacing
- [ ] **Colors** - Exact hex/rgb values, opacity
- [ ] **Borders** - Width, radius, style, color
- [ ] **Shadows** - Offset, blur, spread, color
- [ ] **Sizing** - Exact widths, heights, aspect ratios
- [ ] **Alignment** - Precise positioning and alignment
- [ ] **Responsive** - Breakpoint-specific styles

#### 4.2 Design Token Usage

Always use design tokens instead of hardcoded values:

```tsx
// Bad - hardcoded values
<div style={{ padding: '16px', color: '#333' }}>

// Good - design tokens (Tailwind)
<div className="p-4 text-gray-800">

// Good - CSS variables
<div style={{ padding: 'var(--spacing-4)', color: 'var(--color-text-primary)' }}>
```

#### 4.3 Responsive Implementation

Consider all viewport sizes:

```tsx
// Mobile-first responsive design
<div className="
  p-2 md:p-4 lg:p-6
  grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3
  gap-2 md:gap-4
">
```

### Phase 5: Component Creation Guidelines

When creating new components:

#### 5.1 File Structure

Follow existing project conventions. Common patterns:

```
components/
├── ui/                    # Atomic UI components
│   ├── Button/
│   │   ├── Button.tsx
│   │   ├── Button.test.tsx
│   │   └── index.ts
│   └── ...
├── features/              # Feature-specific composites
│   ├── UserCard/
│   └── ...
└── layouts/               # Page layouts
    └── ...
```

#### 5.2 Component Interface Design

Design props for maximum reusability:

```tsx
interface ComponentProps {
  // Core functionality
  variant?: 'primary' | 'secondary' | 'ghost';
  size?: 'sm' | 'md' | 'lg';

  // State control
  isLoading?: boolean;
  isDisabled?: boolean;

  // Composition
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  children?: React.ReactNode;

  // Accessibility
  'aria-label'?: string;

  // Extension
  className?: string;
  style?: React.CSSProperties;
}
```

#### 5.3 Accessibility Requirements

Every component must include:

- [ ] Semantic HTML elements
- [ ] ARIA attributes where needed
- [ ] Keyboard navigation support
- [ ] Focus management
- [ ] Color contrast compliance
- [ ] Screen reader compatibility

## Quick Reference: Search Patterns

### Find Components by Type

```bash
# Interactive elements
grep -rl "onClick\|onPress\|onSubmit" --include="*.tsx" src/components/

# Form components
grep -rl "useState\|useForm\|register\|handleSubmit" --include="*.tsx" src/components/

# Data display components
grep -rl "map(\|\.map\|forEach" --include="*.tsx" src/components/

# Modal/overlay components
grep -rl "Portal\|createPortal\|fixed\|z-50" --include="*.tsx" src/components/
```

### Find Styling Patterns

```bash
# Tailwind classes usage
grep -roh "className=\"[^\"]*\"" --include="*.tsx" src/ | sort | uniq -c | sort -rn | head -20

# CSS modules
find . -name "*.module.css" -o -name "*.module.scss"

# Styled components
grep -rl "styled\." --include="*.tsx" src/
```

### Find State Handling Patterns

```bash
# React Query / SWR usage
grep -rl "useQuery\|useSWR\|useMutation" --include="*.tsx" src/

# Loading state patterns
grep -rn "isLoading\|loading\|pending" --include="*.tsx" src/components/ | head -20

# Error handling patterns
grep -rn "isError\|error\|catch" --include="*.tsx" src/components/ | head -20
```

## Playwriter Visual Testing

After implementing UI components, use Playwriter CLI to verify visual correctness.

### Start Session and Navigate
```bash
playwriter session new
playwriter -s 1 -e "state.page = await context.newPage(); await state.page.goto('http://localhost:3001/[page]', { waitUntil: 'domcontentloaded' })"
```

### Take Screenshots at Different Viewports
```bash
# Mobile
playwriter -s 1 -e "await state.page.setViewportSize({ width: 375, height: 667 }); await state.page.screenshot({ path: 'mobile.png', scale: 'css' })"

# Desktop
playwriter -s 1 -e "await state.page.setViewportSize({ width: 1920, height: 1080 }); await state.page.screenshot({ path: 'desktop.png', scale: 'css' })"
```

### Get Accessibility Snapshot
```bash
playwriter -s 1 -e "console.log(await accessibilitySnapshot({ page: state.page }))"
```

### Test Interactive States
```bash
# Hover state
playwriter -s 1 -e "await state.page.hover('[data-testid=\"button\"]'); await state.page.screenshot({ path: 'hover.png', scale: 'css' })"

# Focus state
playwriter -s 1 -e "await state.page.click('input[name=\"field\"]'); await state.page.screenshot({ path: 'focus.png', scale: 'css' })"

# Active/pressed state
playwriter -s 1 -e "await state.page.click('[data-testid=\"button\"]')"
```

### Visual Verification Checklist
- [ ] Component renders correctly on mobile (375px)
- [ ] Component renders correctly on desktop (1920px)
- [ ] All states visible and correct (loading, error, empty, success)
- [ ] Interactive states work (hover, focus, active)
- [ ] Accessibility tree is correct (proper roles, labels)
- [ ] No visual regressions from existing components

## Output Expectations

When implementing UI with this skill:

1. **Component Inventory** - List of existing components to reuse
2. **Decomposition Plan** - Hierarchy of components needed
3. **State Matrix** - All states each component must handle
4. **Implementation** - Pixel-perfect code following conventions
5. **Visual Verification** - Screenshots from Playwriter testing
6. **Reusability Report** - New components created for future reuse
